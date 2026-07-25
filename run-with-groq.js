require('dotenv/config');
const readline = require('readline');
const { HyperAgent } = require('./dist/index.js');
const { PlayYouTubeAction, playYouTube, OpenWebsiteAction, openWebsite } = require('./dist/custom-actions/index.js');

// --- sentence-level typo correction (no LLM, runs in microseconds) ---
// Only corrects words that are close typos of words your command parser
// actually listens for (verbs + known site names, below). Anything else —
// song names, search terms, people's names — is left completely alone,
// so this can't accidentally rewrite content it has no business touching.

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

const COMMAND_VOCABULARY = [
  'open', 'play', 'search', 'close', 'pause', 'stop', 'resume', 'skip',
  'mute', 'unmute', 'volume', 'minimize', 'maximize', 'fullscreen',
  'youtube', 'google', 'whatsapp', 'gmail', 'chrome', 'spotify', 'netflix',
  'please', 'and', 'the', 'for', 'me', 'on', 'in', 'from', 'go', 'to', 'visit', 'launch',
];

// Tolerance depends on BOTH words being compared — a short vocab word like
// "on" or "to" needs a much closer (or exact) match before anything gets
// corrected into it. Without this, a word like "song" (2 edits from "on")
// would get silently rewritten to "on" and vanish as a stripped filler word.
function toleranceFor(len) {
  if (len <= 2) return 0;  // never fuzzy-correct into/from 2-letter words — too ambiguous
  if (len <= 4) return 1;
  return 2;
}

function correctSentence(rawTask) {
  const parts = rawTask.split(/(\s+)/); // keep whitespace chunks so rejoining is exact

  const corrected = parts.map((part) => {
    if (part.length === 0 || /^\s+$/.test(part)) return part;

    const lower = part.toLowerCase();
    if (COMMAND_VOCABULARY.includes(lower)) return part; // already correct, skip the search

    let best = null;
    let bestDist = Infinity;
    for (const word of COMMAND_VOCABULARY) {
      if (Math.abs(word.length - lower.length) > 2) continue; // cheap early-out
      const dist = levenshtein(lower, word);
      const tol = Math.min(toleranceFor(lower.length), toleranceFor(word.length));
      if (dist > 0 && dist <= tol && dist < bestDist) { bestDist = dist; best = word; }
    }

    return best ? best : part; // no close-enough match — leave it alone (probably a name/query)
  });

  return corrected.join('');
}

function extractYouTubeQuery(rawTask) {
  const padded = ` ${rawTask.toLowerCase().trim()} `;
  const mentionsYouTube = /\byoutube\b/.test(padded);
  const mentionsPlay = /\bplay\b/.test(padded);
  if (!mentionsYouTube || !mentionsPlay) return null;

  const fillers = [
    /\bopen youtube\b/g, /\bgo to youtube\b/g, /\bsearch(?: for)?\b/g,
    /\bplease\b/g, /\bcan you\b/g, /\bcould you\b/g, /\bfor me\b/g,
    /\band\b/g, /\bon\b/g, /\bin\b/g, /\bfrom\b/g, /\byoutube\b/g, /\bplay\b/g,
  ];
  let cleaned = padded;
  for (const re of fillers) cleaned = cleaned.replace(re, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : null;
}

// Generic "open a site" fast path — deliberately conservative. Bails
// (returns null) on anything that smells like more than plain navigation,
// so real multi-step tasks still reach the LLM instead of getting half-done.
function extractOpenTarget(rawTask) {
  const padded = ` ${rawTask.toLowerCase().trim()} `;
  const opensAt = /\b(?:open|go to|visit|launch)\b/.test(padded);
  if (!opensAt) return null;

  if (/\b(and|then|search for|click|type|find|log ?in|check|tab|window|menu|settings)\b|,/.test(padded)) return null;

  const fillers = [
    /\bplease\b/g, /\bcan you\b/g, /\bcould you\b/g, /\bfor me\b/g,
    /\bthe\b/g, /\bwebsite\b/g, /\bsite\b/g, /\bpage\b/g,
    /\bgo to\b/g, /\bvisit\b/g, /\blaunch\b/g, /\bopen\b/g,
  ];
  let cleaned = padded;
  for (const re of fillers) cleaned = cleaned.replace(re, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  if (!cleaned || cleaned.split(' ').length > 3) return null;
  return cleaned;
}

async function main() {
  console.log('\n🚀 HyperAgent (Groq) — persistent session, Ctrl+C to exit\n');

  const agent = new HyperAgent({
    llm: {
      provider: "openai",
      model: "llama-3.3-70b-versatile",
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY,
    },
    browserProvider: "Local",
    localConfig: {
      headless: false,
      viewport: null,            // stop Playwright from locking page content to a fixed
                                  // size (its default is 1280x720) independent of the
                                  // real window — this is the actual cause of the white
                                  // gap: window resized, content didn't follow.
      args: ['--start-maximized'],
      ignoreDefaultArgs: ['--no-sandbox'], // explicitly strip this — the sandbox should
                                            // stay ON. --no-sandbox exists for root-user
                                            // Linux/Docker containers; it has no reason to
                                            // be here on a normal Windows machine, and it's
                                            // a genuine security downgrade if it is.
    },
    customActions: [PlayYouTubeAction(), OpenWebsiteAction()],
    debug: true,
  });

  const cacheStore = new Map();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.setPrompt('> ');
  rl.prompt();

  rl.on('line', async (line) => {
    const rawTask = line.trim();
    if (!rawTask) return rl.prompt();

    const task = correctSentence(rawTask);
    if (task !== rawTask) {
      console.log(`✏️  autocorrected: "${rawTask}" → "${task}"`);
    }

    const start = Date.now();

    try {
      const page = await agent.getCurrentPage();
      const query = extractYouTubeQuery(task);

      if (query) {
        console.log(`⚡ direct match ("${query}"), no LLM call...`);
        const result = await playYouTube(page, query);
        console.log(`✅ ${result.success ? 'done' : 'failed'} in ${Date.now() - start}ms: ${result.message}`);
        return rl.prompt();
      }

      const openTarget = extractOpenTarget(task);

      if (openTarget) {
        console.log(`⚡ direct match ("${openTarget}"), no LLM call...`);
        const result = await openWebsite(page, openTarget);
        console.log(`✅ ${result.success ? 'done' : 'failed'} in ${Date.now() - start}ms: ${result.message}`);
        return rl.prompt();
      }

      const key = task.toLowerCase();
      if (cacheStore.has(key)) {
        console.log('⚡ replaying cached actions, no LLM call...');
        const replay = await agent.runFromActionCache(cacheStore.get(key), page);
        console.log(`✅ replay ${replay.status} in ${Date.now() - start}ms`);
      } else {
        console.log('🤖 no fast-path match — asking the LLM (Groq/Llama-3.3-70B) to plan this...');
        const result = await agent.executeTask(task);
        cacheStore.set(key, result.actionCache);
        console.log(`✅ done in ${Date.now() - start}ms:`, result.output);
      }
    } catch (err) {
      console.error('❌', err.message);
    }
    rl.prompt();
  });

  process.on('SIGINT', async () => {
    console.log('\nClosing...');
    await agent.closeAgent();
    process.exit(0);
  });
}

main().catch(console.error);