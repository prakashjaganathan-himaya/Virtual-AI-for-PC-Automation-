require('dotenv/config');
const { exec } = require('child_process');
const readline = require('readline');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { HyperAgent } = require('./dist/index.js');
const {
  PlayYouTubeAction, playYouTube,
  OpenWebsiteAction, openWebsite,
  FullscreenAction, fullscreenWindow, unfullscreenWindow,
  ScrollAction, scrollPage,
  NewTabAction, openNewTab,
  CloseTabAction, closeTab
} = require('./dist/custom-actions/index.js');

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
  'mute', 'unmute', 'volume', 'minimize', 'maximize', 'fullscreen', 'scroll', 'tab', 'new',
  'youtube', 'google', 'whatsapp', 'gmail', 'chrome', 'spotify', 'netflix',
  'please', 'and', 'the', 'for', 'me', 'on', 'in', 'from', 'go', 'to', 'visit', 'launch',
  'message', 'send', 'saying'
];

function toleranceFor(len) {
  if (len <= 2) return 0;
  if (len <= 4) return 1;
  return 2;
}

function correctSentence(rawTask) {
  const parts = rawTask.split(/(\s+)/);
  const corrected = parts.map((part) => {
    if (part.length === 0 || /^\s+$/.test(part)) return part;
    const lower = part.toLowerCase();
    if (COMMAND_VOCABULARY.includes(lower)) return part;
    let best = null;
    let bestDist = Infinity;
    for (const word of COMMAND_VOCABULARY) {
      if (Math.abs(word.length - lower.length) > 2) continue;
      const dist = levenshtein(lower, word);
      const tol = Math.min(toleranceFor(lower.length), toleranceFor(word.length));
      if (dist > 0 && dist <= tol && dist < bestDist) { bestDist = dist; best = word; }
    }
    return best ? best : part;
  });
  return corrected.join('');
}
      // 6. YouTube

      
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

function extractFullscreenCommand(rawTask) {
  const padded = ` ${rawTask.toLowerCase().trim()} `;
  if (!/\bfullscreen\b|\bmaximize\b/.test(padded)) return null;
  if (/\b(and|then)\b/.test(padded)) return null;
  const exit = /\b(exit|leave|minimize)\b/.test(padded);
  return { exit };
}

function extractScrollCommand(rawTask) {
  const padded = ` ${rawTask.toLowerCase().trim()} `;
  const down = /\bscroll(?:s|ing)? down\b/.test(padded);
  const up = /\bscroll(?:s|ing)? up\b/.test(padded);
  if (!down && !up) return null;
  if (/\b(and|then|click|type|search|open|play)\b/.test(padded)) return null;
  return down ? "down" : "up";
}

function extractNewTabCommand(rawTask) {
  const padded = ` ${rawTask.toLowerCase().trim()} `;
  if (!/\bnew tab\b|\bopen (?:a )?(?:new )?tab\b/.test(padded)) return null;
  const stripped = padded
    .replace(/\bopen\b/g, ' ')
    .replace(/\ba\b/g, ' ')
    .replace(/\bnew\b/g, ' ')
    .replace(/\btab\b/g, ' ')
    .replace(/\bplease\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped.length > 0) return null;
  return true;
}

function extractCloseCommand(rawTask) {
  const padded = ` ${rawTask.toLowerCase().trim()} `;
  if (!/\bclose\b/.test(padded)) return null;
  if (/\b(and|then)\b/.test(padded)) return null;
  if (!/\b(tab|website|site|page|window|this)\b/.test(padded) && padded.trim() !== 'close') return null;
  return true;
}

function extractOpenInNewTabTarget(rawTask) {
  const padded = ` ${rawTask.toLowerCase().trim()} `;
  const match1 = padded.match(/\bopen\s+(.+?)\s+in\s+(?:a\s+)?new\s+tab\b/);
  if (match1) return match1[1].trim();

  const match2 = padded.match(/\bopen\s+new\s+tab\s+(.+?)\b(?=\s+in\s+|$)/);
  if (match2) return match2[1].trim();

  return null;
}

function extractWhatsAppMessage(rawTask) {
  let padded = rawTask.toLowerCase().trim();
  
  // "open whatsapp in new tab" was being swallowed here (it starts with
  // "whatsapp" after "open " is stripped below) and turned into a message
  // to contact "in" saying "new tab". Bail out early and let
  // extractOpenInNewTabTarget (checked right after this) own it instead.
  if (/\bnew\s+tab\b/.test(padded)) return null;

  padded = padded.replace(/\s+(in|on)\s+whatsapp$/g, '');
  
  if (padded.startsWith('open ')) {
    padded = padded.replace(/^open\s+/, '');
  }
  
  padded = padded.replace(/^whatsapp\s+(?=message\s+)/, '');

  if (padded.startsWith('message') || padded.startsWith('whatsapp') || padded.startsWith('wa ')) {
    let cleaned = padded.replace(/^(message|whatsapp|wa)\s+/, '');
    cleaned = cleaned.replace(/^(saying|that says)\s+/, '');
    const words = cleaned.split(/\s+/);
    if (words.length >= 2) {
      return { contact: words[0], message: words.slice(1).join(' ') };
    }
  }
  
  const match2 = padded.match(/\bsend\s+(?:a\s+)?(?:message\s+)?(.+?)\s+to\s+(.+)$/);
  if (match2) {
    const message = match2[1].trim();
    const contact = match2[2].trim();
    if (contact && message && message !== 'a' && message !== 'a message') {
      return { contact, message };
    }
  }
  return null;
}

function extractOpenWhatsAppChat(rawTask) {
  const padded = ` ${rawTask.toLowerCase().trim()} `;
  
  // Must mention opening/going to a profile or chat
  if (!/\b(open|go to|check|view)\b/.test(padded)) return null;
  if (!/\b(profile|chat)\b/.test(padded)) return null;
  
  // Don't trigger if they are trying to read or send a message
  if (/\b(read|send|message|saying|summarize)\b/.test(padded)) return null;

  // Extract the name between the action word and the word "profile" or "chat"
  const match = padded.match(/\b(?:open|go to|check|view)\s+(?:the\s+)?(.+?)(?:\s+profile|\s+chat)\b/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

function extractReadScreenCommand(rawTask) {
  const padded = ` ${rawTask.toLowerCase().trim()} `;
  
  // Must have an action word (read, summarize, summaries, what's)
  const hasAction = /\b(read|summarize|summarise|summaries|summary|what(?:'s| is|s))\b/.test(padded);
  // Must have a target word (screen, page, this)
  const hasTarget = /\b(screen|page|this)\b/.test(padded);
  
  if (hasAction && hasTarget) {
    return true;
  }
  return null;
}

function extractWhatsAppScroll(rawTask) {
  const padded = ` ${rawTask.toLowerCase().trim()} `;
  if ((/\bwhatsapp\b/.test(padded) || /\bcontacts\b/.test(padded)) && /\bscroll\b/.test(padded)) {
    if (/\bdown\b/.test(padded)) return "down";
    if (/\bup\b/.test(padded)) return "up";
  }
  return null;
}

async function scrollWhatsAppContacts(page, direction) {
  try {
    const sidePanel = page.locator('div#side');
    await sidePanel.waitFor({ state: "visible", timeout: 5000 });
    
    await sidePanel.evaluate((el, dir) => {
      el.scrollBy(0, dir === 'down' ? 600 : -600);
    }, direction);

    return { success: true, message: `Scrolled WhatsApp contacts ${direction}.` };
  } catch (err) {
    return { success: false, message: `Couldn't scroll WhatsApp contacts: ${err.message}` };
  }
}
async function openWhatsAppChat(page, contactName) {
  try {
    if (!page.url().includes("web.whatsapp.com")) {
      await page.goto("https://web.whatsapp.com/", { waitUntil: "domcontentloaded" });
    }

    console.log('⏳ Waiting for WhatsApp side panel to load...');
    await page.waitForSelector('div#side', { visible: true, timeout: 60000 });
    
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    let searchBox = page.locator('div[role="textbox"][contenteditable="true"]').first();
    if (!await searchBox.isVisible({ timeout: 2000 }).catch(() => false)) {
      searchBox = page.getByPlaceholder('Search').first();
    }

    console.log(`🔍 Clicking search box...`);
    await searchBox.click({ force: true });
    
    console.log(`🔍 Typing ${contactName}...`);
    await page.keyboard.type(contactName, { delay: 50 });
    await page.waitForTimeout(1500); 
    
    await page.keyboard.press("Enter");
    console.log('💬 Opening chat...');

    return { success: true, message: `Opened chat with ${contactName}.` };
  } catch (err) {
    return { success: false, message: `Couldn't open chat: ${err.message}` };
  }
}

async function sendWhatsAppMessage(page, contact, message) {
  try {
    if (!page.url().includes("web.whatsapp.com")) {
      await page.goto("https://web.whatsapp.com/", { waitUntil: "domcontentloaded" });
    }

    console.log('⏳ Waiting for WhatsApp side panel to load...');
    await page.waitForSelector('div#side', { visible: true, timeout: 60000 });
    
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape");

    let searchBox = page.locator('div[role="textbox"][contenteditable="true"]').first();
    if (!await searchBox.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('⚠️ Standard search box not found, trying fallback...');
      searchBox = page.getByPlaceholder('Search').first();
    }

    console.log(`🔍 Clicking search box...`);
    await searchBox.click({ force: true });
    
    console.log(`🔍 Typing ${contact}...`);
    await page.keyboard.type(contact, { delay: 50 });
    await page.waitForTimeout(2000); 
    
    await page.keyboard.press("Enter");
    console.log('💬 Opening chat...');
    
    await page.waitForSelector('footer', { visible: true, timeout: 10000 });
    
    const chatBox = page.locator('footer div[role="textbox"]').first();
    await chatBox.click({ force: true });
    
    console.log('✉️ Typing message...');
    await page.keyboard.type(message, { delay: 30 });
    await page.keyboard.press("Enter"); 

    return { success: true, message: `Sent WhatsApp message to ${contact}: "${message}"` };
  } catch (err) {
    try {
      await page.screenshot({ path: 'whatsapp-error.png' });
      console.log('📸 Screenshot saved to whatsapp-error.png');
    } catch(e) {}
    return { success: false, message: `Couldn't send WhatsApp message: ${err.message}` };
  }
}


// ─── Downloaded-file handling ───────────────────────────────────────
// Grabs the real path of anything downloaded (WhatsApp attachments
// included) via Playwright's 'download' event, then hands it to the OS
// with exec() — same trick openOSApp() already uses below, just applied
// to files instead of named apps. No sandbox to fight here; see chat
// for why the "Chrome sandbox" error was a red herring.

const DOWNLOAD_DIR = path.join(os.homedir(), 'Downloads');
try { fs.mkdirSync(DOWNLOAD_DIR, { recursive: true }); } catch (e) {} // no-op if it exists
let lastDownloadedFile = null;

// Extensions we're comfortable auto-opening on a voice command. Add or
// remove freely — this only exists so a stray .exe/.bat someone sends
// you in a WhatsApp chat doesn't get silently launched.
const SAFE_OPEN_EXTENSIONS = [
  '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
  '.mp4', '.mov', '.mp3', '.wav', '.m4a',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.csv',
];

function attachDownloadListener(page) {
  page.on('download', async (download) => {
    try {
      const suggested = download.suggestedFilename();
      const destPath = path.join(DOWNLOAD_DIR, suggested);
      await download.saveAs(destPath);
      lastDownloadedFile = destPath;
      console.log(`\n📥 Download saved: ${destPath}`);
    } catch (err) {
      console.error(`❌ Failed to save download: ${err.message}`);
    }
  });
}

function openDownloadedFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!SAFE_OPEN_EXTENSIONS.includes(ext)) {
    return Promise.resolve({
      success: false,
      message: `Not auto-opening "${ext}" files for safety — open "${path.basename(filePath)}" manually if you trust it.`,
    });
  }
  return new Promise((resolve) => {
    // The empty "" after start is required — without it, `start` reads the
    // first quoted chunk as a window title and chokes on paths with spaces
    // (every WhatsApp filename has spaces in it).
    exec(`start "" "${filePath}"`, (error) => {
      if (error) {
        resolve({ success: false, message: `Couldn't open file: ${error.message}` });
      } else {
        resolve({ success: true, message: `Opened ${path.basename(filePath)}.` });
      }
    });
  });
}

function extractOpenDownloadCommand(rawTask) {
  const padded = ` ${rawTask.toLowerCase().trim()} `;
  if (!/\bopen\b/.test(padded)) return null;
  if (!/\b(file|download|downloaded|attachment|pdf|image|photo|picture)\b/.test(padded)) return null;
  return true;
}
// ─────────────────────────────────────────────────────────────────────

function extractOSApp(rawTask) {
  const padded = ` ${rawTask.toLowerCase().trim()} `;
  if (!/\b(?:open|launch)\b/.test(padded)) return null;
  
  // If it mentions browser-specific words or web apps, skip this
  if (/\b(website|web|url|google|youtube|tab|whatsapp|gmail|netflix|spotify|chrome)\b/.test(padded)) return null;

  const fillers = [
    /\bplease\b/g, /\bcan you\b/g, /\bcould you\b/g, /\bfor me\b/g,
    /\bthe\b/g, /\bapp\b/g, /\bapplication\b/g, /\bprogram\b/g,
    /\bopen\b/g, /\blaunch\b/g, /\bstart\b/g,
  ];
  let cleaned = padded;
  for (const re of fillers) cleaned = cleaned.replace(re, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  if (!cleaned || cleaned.split(' ').length > 3) return null;
  return cleaned;
}


function extractTypeCommand(rawTask) {
  const padded = ` ${rawTask.toLowerCase().trim()} `;
  // Matches "type hello world" or "enter hello world"
  const match = padded.match(/\b(?:type|enter)\s+(.+)$/);
  if (match) {
    // Return the text exactly as it was typed (without the word "type")
    return match[1];
  }
  return null;
}

function extractKeyPress(rawTask) {
  const padded = ` ${rawTask.toLowerCase().trim()} `;
  // Matches "press enter", "press escape", "press tab", "press backspace"
  const match = padded.match(/\bpress\s+(enter|escape|esc|tab|backspace|space)\b/);
  if (match) {
    let key = match[1];
    // Playwright requires specific capitalization for keys
    if (key === 'esc') return 'Escape';
    if (key === 'space') return 'Space';
    return key.charAt(0).toUpperCase() + key.slice(1); // Capitalize (Enter, Tab, etc)
  }
  return null;
}

// These two used to be declared *inside* the rl.on('line', ...) handler
// further down — meaning they were redefined on every single command and,
// worse, never actually called from anywhere. Hoisted up here and wired
// into the fast-path chain in main() below.
function extractSearchCommand(rawTask) {
  const padded = ` ${rawTask.toLowerCase().trim()} `;
  // Matches "search funny cats" or "search for funny cats"
  const match = padded.match(/\bsearch(?: for)?\s+(.+)$/);
  if (match) return match[1];
  return null;
}

function extractShortcut(rawTask) {
  const padded = ` ${rawTask.toLowerCase().trim()} `;
  if (/\bcopy\b/.test(padded)) return 'Control+C';
  if (/\bpaste\b/.test(padded)) return 'Control+V';
  if (/\bselect all\b/.test(padded)) return 'Control+A';
  if (/\bundo\b/.test(padded)) return 'Control+Z';
  if (/\brefresh\b/.test(padded) || /\breload\b/.test(padded)) return 'F5';
  return null;
}

async function typeTextOnPage(page, text) {
  try {
    // Types into whatever element is currently focused/active
    await page.keyboard.type(text, { delay: 20 });
    return { success: true, message: `Typed "${text}" on the page.` };
  } catch (err) {
    return { success: false, message: `Couldn't type: ${err.message}` };
  }
}

async function searchOnPage(page, query) {
  try {
    // Try to find common search boxes on the page
    const searchBox = page.locator('input[type="search"], input[role="searchbox"], input[name="q"], input[name="search"], input[placeholder*="search" i]').first();
    
    if (await searchBox.isVisible({ timeout: 1000 }).catch(() => false)) {
      await searchBox.click();
      await searchBox.fill(query);
    } else {
      // If no search box is found, just type into whatever you are currently clicked on
      console.log('⚠️ No specific search box found, typing in active element...');
      await page.keyboard.type(query, { delay: 20 });
    }
    
    await page.keyboard.press("Enter");
    return { success: true, message: `Searched for "${query}".` };
  } catch (err) {
    return { success: false, message: `Couldn't search: ${err.message}` };
  }
}

async function readScreenWithAI(page) {
  try {
    console.log('📄 Extracting structured screen data...');
    let contextText = "";
    const isWhatsApp = page.url().includes('web.whatsapp.com');

    if (isWhatsApp) {
      // Structured extraction for WhatsApp
      const waData = await page.evaluate(() => {
        let activeChat = "";
        const header = document.querySelector('header[data-testid="conversation-info-header"] span[title]');
        if (header) activeChat = header.getAttribute('title') || header.textContent.trim();

        let messages = [];
        const msgElements = document.querySelectorAll('div.message-in, div.message-out');
        for (let el of msgElements) {
          const rect = el.getBoundingClientRect();
          if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
            const senderEl = el.querySelector('span[role="button"]'); 
            const sender = senderEl ? senderEl.textContent.trim() : (el.classList.contains('message-out') ? "You" : "Someone");
            const textEl = el.querySelector('span.selectable-text');
            const text = textEl ? textEl.textContent.trim() : el.textContent.trim();
            if (text) messages.push(`${sender} said: ${text}`);
          }
        }

        let chatList = [];
        const chatItems = document.querySelectorAll('div[role="listitem"]');
        for (let el of chatItems) {
          const rect = el.getBoundingClientRect();
          if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
            const titleEl = el.querySelector('span[title]');
            if (titleEl && titleEl.getAttribute('title') !== activeChat) {
              chatList.push(titleEl.getAttribute('title'));
            }
          }
        }
        return { activeChat, messages: messages.slice(-6), chatList: chatList.slice(0, 5) };
      });

      if (waData.activeChat || waData.messages.length > 0 || waData.chatList.length > 0) {
        contextText = `Active Chat: ${waData.activeChat || "None selected"}\n`;
        contextText += `Recent Messages:\n${waData.messages.join('\n') || "None"}\n`;
        contextText += `Other Chats in Sidebar: ${waData.chatList.join(', ')}`;
      }
    }

    // Fallback for non-WhatsApp pages
    if (!contextText) {
      contextText = await page.evaluate(() => {
        const elements = document.querySelectorAll('body *:not(script):not(style):not(svg):not(button):not([role="button"])');
        let texts = [];
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        for (let el of elements) {
          if (el.children.length === 0 && el.textContent.trim().length > 0) {
            const rect = el.getBoundingClientRect();
            if (rect.top >= 0 && rect.left >= 0 && rect.bottom <= viewportHeight && rect.right <= viewportWidth) {
              if (!el.className || typeof el.className !== 'string' || !el.className.includes('ic-')) {
                texts.push(el.textContent.trim());
              }
            }
          }
        }
        return texts.join('\n');
      });
    }

    if (!contextText || contextText.trim().length === 0) {
      return { success: false, message: "The screen is blank or has no readable text." };
    }

    console.log('🧠 Asking AI to summarize the screen...');

    const isGroq = !!process.env.GROQ_API_KEY;
    const llmUrl = isGroq ? 'https://api.groq.com/openai/v1/chat/completions' : 'http://localhost:11434/v1/chat/completions';
    const llmKey = isGroq ? process.env.GROQ_API_KEY : 'ollama';
    const llmModel = isGroq ? 'llama-3.1-8b-instant' : 'llama3.1';

    const response = await fetch(llmUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${llmKey}` },
      body: JSON.stringify({
        model: llmModel,
        messages: [
          { 
            role: 'system', 
            content: 'You are a factual assistant. The user asks what is on their screen. Based ONLY on the text provided, state exactly what is visible. If it is a chat, state who the active chat is with and briefly summarize exactly what the last 2-3 messages were, mentioning who said what. Mention 1 or 2 other chats in the sidebar if visible. Do NOT invent information. Keep it under 4 sentences.' 
          },
          { 
            role: 'user', 
            content: `Here is the screen data:\n${contextText}\n\nWhat is on my screen?` 
          }
        ],
        temperature: 0.2
      })
    });
    
    if (!response.ok) return { success: false, message: `AI request failed: ${response.statusText}` };
    
    const data = await response.json();
    return { success: true, message: data.choices[0].message.content };
  } catch (err) {
    return { success: false, message: `Couldn't read screen: ${err.message}` };
  }
}
async function readSpecificChat(page, contactName) {
  try {
    console.log(`🔍 Opening chat with ${contactName} to read it...`);
    await page.waitForSelector('div#side', { visible: true, timeout: 10000 });
    await page.keyboard.press("Escape");
    
    let searchBox = page.locator('div[role="textbox"][contenteditable="true"]').first();
    if (!await searchBox.isVisible({ timeout: 2000 }).catch(() => false)) {
      searchBox = page.getByPlaceholder('Search').first();
    }
    
    await searchBox.click({ force: true });
    await page.keyboard.type(contactName, { delay: 50 });
    await page.waitForTimeout(1500); 
    await page.keyboard.press("Enter");
    
    console.log('📄 Reading recent messages...');
    await page.waitForTimeout(1000); 

    // Grab ONLY structured sender + message text
    const chatText = await page.evaluate(() => {
      let messages = [];
      const msgElements = document.querySelectorAll('div.message-in, div.message-out');
      for (let el of msgElements) {
        const senderEl = el.querySelector('span[role="button"]'); 
        const sender = senderEl ? senderEl.textContent.trim() : (el.classList.contains('message-out') ? "You" : "Them");
        const textEl = el.querySelector('span.selectable-text');
        const text = textEl ? textEl.textContent.trim() : el.textContent.trim();
        if (text) messages.push(`${sender} said: ${text}`);
      }
      return messages.join('\n');
    });

    if (!chatText || chatText.trim().length === 0) {
      return { success: false, message: `Couldn't find any messages with ${contactName}.` };
    }

    const recentMessages = chatText.split('\n').slice(-15).join('\n'); // Get last 15 messages
    console.log('🧠 Asking AI to summarize the chat...');

    const isGroq = !!process.env.GROQ_API_KEY;
    const llmUrl = isGroq ? 'https://api.groq.com/openai/v1/chat/completions' : 'http://localhost:11434/v1/chat/completions';
    const llmKey = isGroq ? process.env.GROQ_API_KEY : 'ollama';
    const llmModel = isGroq ? 'llama-3.1-8b-instant' : 'llama3.1';

    const response = await fetch(llmUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${llmKey}` },
      body: JSON.stringify({
        model: llmModel,
        messages: [
          { 
            role: 'system', 
            content: 'You are a factual assistant. The user asks what someone said in a chat. Based ONLY on the messages provided, explain exactly what the last few messages were, explicitly stating who said what. Do NOT invent information. Keep it under 4 sentences.' 
          },
          { 
            role: 'user', 
            content: `Here are the recent messages:\n${recentMessages}\n\nWhat were the last few messages?` 
          }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) return { success: false, message: `AI request failed: ${response.statusText}` };
    
    const data = await response.json();
    return { success: true, message: data.choices[0].message.content };
  } catch (err) {
    return { success: false, message: `Couldn't read chat: ${err.message}` };
  }
}
function extractReadChatCommand(rawTask) {
  const padded = ` ${rawTask.toLowerCase().trim()} `;
  
  // Match 1: "read chat with X", "check messages from X"
  const match1 = padded.match(/\b(?:read|check|tell me) (?:the )?(?:last )?(?:few )?(?:messages?|chats?) (?:in|from|with)\s+(.+)$/);
  
  // Match 2: "what did X say", "whats in X chat"
  const match2 = padded.match(/\b(?:what did|whats in|what's in)\s+(.+?)\s+(?:say|chat|messages?)?\b/);
  
  // Match 3: "what is the last chat with X", "what was the last message from X"
  const match3 = padded.match(/\bwhat(?:'s| is|s| was)? (?:the )?(?:last )?(?:chat|messages?|conversation) (?:with|from|in)\s+(.+)$/);
  
  // Match 4: "read my chat with X", "check chat and X"
  const match4 = padded.match(/\b(?:read|check) (?:my )?chat (?:with|from|for|and)\s+(.+)$/);

  const match = match1 || match2 || match3 || match4;
  
  if (match && match[1]) {
    // Clean up the captured name (remove trailing words like "chat" or "say")
    let name = match[1].replace(/\b(chat|messages?|say|with|from)\b/g, '').trim();
    if (name.length > 0) return name;
  }
  return null;
}

async function useShortcut(page, keys) {
  try {
    await page.keyboard.press(keys);
    return { success: true, message: `Pressed ${keys} shortcut.` };
  } catch (err) {
    return { success: false, message: `Couldn't press keys: ${err.message}` };
  }
}

async function pressKeyOnPage(page, key) {
  try {
    await page.keyboard.press(key);
    return { success: true, message: `Pressed ${key} key.` };
  } catch (err) {
    return { success: false, message: `Couldn't press key: ${err.message}` };
  }
}


async function openOSApp(appName) {
  const homeDir = os.homedir();
  const appMap = {
    'notepad': 'notepad.exe',
    'calculator': 'calc.exe',
    'calc': 'calc.exe',
    'paint': 'mspaint.exe',
    'cmd': 'cmd.exe',
    'command prompt': 'cmd.exe',
    'terminal': 'wt.exe',
    'windows terminal': 'wt.exe',
    'task manager': 'taskmgr.exe',
    'file explorer': 'explorer.exe',
    'explorer': 'explorer.exe',
    'documents': `explorer.exe "${path.join(homeDir, 'Documents')}"`,
    'downloads': `explorer.exe "${path.join(homeDir, 'Downloads')}"`,
    'pictures': `explorer.exe "${path.join(homeDir, 'Pictures')}"`,
    'settings': 'start ms-settings:',
    'spotify': 'start spotify:',
    'vs code': 'code',
    'visual studio code': 'code',
  };

  const command = appMap[appName];
  
  if (command) {
    return new Promise((resolve) => {
      exec(command, (error) => {
        if (error) {
          resolve({ success: false, message: `Couldn't open ${appName}: ${error.message}` });
        } else {
          resolve({ success: true, message: `Opened ${appName}.` });
        }
      });
    });
  } else {
    return new Promise((resolve) => {
      exec(`start ${appName}`, (error) => {
        if (error) {
          resolve({ success: false, message: `Couldn't find or open ${appName}.` });
        } else {
          resolve({ success: true, message: `Attempted to open ${appName}.` });
        }
      });
    });
  }
}

// Chrome opens to a blank tab if it isn't told otherwise — change this to
// whatever you want it to load first (e.g. 'https://web.whatsapp.com/').
 const START_URL = 'https://www.google.com';

async function main() {
  console.log('\n🚀 HyperAgent (Groq) — persistent session, Ctrl+C to exit\n');

  let agent = null;
  let initialPage = null;
  const cacheStore = new Map();

  // This function ensures Chrome only opens when you give the first command
  const ensureAgent = async () => {
    if (agent) return;
    console.log('🌐 Starting your real Chrome...');
    
    const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const userDataDir = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
    const debugPort = 9222;

    // 1. Launch Chrome manually with remote debugging enabled on your main profile
    exec(`"${chromeExe}" --remote-debugging-port=${debugPort} --user-data-dir="${userDataDir}" --start-maximized`, (err) => {
      if (err) console.error('Chrome launch error:', err.message);
    });

    // 2. Wait for Chrome to open and the debugging port to become active
    console.log('⏳ Waiting for Chrome to start...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. Connect Playwright to your running Chrome
    const { chromium } = require('playwright');
    const browser = await chromium.connectOverCDP(`http://localhost:${debugPort}`);
    
    agent = new HyperAgent({
      llm: {
        provider: "openai",
        model: "llama3.1",
        baseURL: "http://localhost:11434/v1",
        apiKey: "ollama",
      },
      browserProvider: "Local",
      localConfig: {
        // Pass the connected browser directly to HyperAgent
        browserInstance: browser,
      },
      customActions: [
        PlayYouTubeAction(), OpenWebsiteAction(), FullscreenAction(),
        ScrollAction(), NewTabAction(), CloseTabAction()
      ],
      debug: true,
    });

    initialPage = await agent.getCurrentPage();
    attachDownloadListener(initialPage);
    initialPage.context().on('page', attachDownloadListener);
  };
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
    const done = (result) => {
      console.log(`✅ ${result.success ? 'done' : 'failed'} in ${Date.now() - start}ms: ${result.message}`);
      rl.prompt();
    };

    try {
      // Wait for Chrome to open on the first command
      await ensureAgent();
      const page = await agent.getCurrentPage();

      // 1. WhatsApp Message
      const waMsg = extractWhatsAppMessage(task);
      if (waMsg) { 
        console.log(`⚡ direct match (whatsapp message to ${waMsg.contact}), no LLM call...`); 
        return done(await sendWhatsAppMessage(page, waMsg.contact, waMsg.message)); 
      }

      // 2. WhatsApp Scroll
      const waScroll = extractWhatsAppScroll(task);
      if (waScroll) { 
        console.log(`⚡ direct match (scroll whatsapp ${waScroll}), no LLM call...`); 
        return done(await scrollWhatsAppContacts(page, waScroll)); 
      }

      // 2.5. Open WhatsApp Chat/Profile
      const waChatTarget = extractOpenWhatsAppChat(task);
      if (waChatTarget) {
        console.log(`⚡ direct match (open chat with ${waChatTarget}), no LLM call...`);
        return done(await openWhatsAppChat(page, waChatTarget));
      }

      // 3. Open in New Tab (with optional YouTube play)
      const newTabTarget = extractOpenInNewTabTarget(task);
      if (newTabTarget) {
        if (newTabTarget.includes('youtube')) {
          const playMatch = task.toLowerCase().match(/\bplay\s+(.+)$/);
          if (playMatch && playMatch[1]) {
            let songQuery = playMatch[1].replace(/\b(song|video|music|track)\b/g, '').trim();
            if (!songQuery) songQuery = playMatch[1].trim();
            
            console.log(`⚡ direct match (open YouTube in new tab & play "${songQuery}"), no LLM call...`);
            const newPage = await page.context().newPage();
            await openWebsite(newPage, 'youtube');
            return done(await playYouTube(newPage, songQuery));
          }
        }
        console.log(`⚡ direct match (open "${newTabTarget}" in new tab), no LLM call...`);
        const newPage = await page.context().newPage();
        return done(await openWebsite(newPage, newTabTarget));
      }

      // 4. Open Downloaded File
      if (extractOpenDownloadCommand(task)) {
        console.log('⚡ direct match (open downloaded file), no LLM call...');
        if (lastDownloadedFile && fs.existsSync(lastDownloadedFile)) {
          return done(await openDownloadedFile(lastDownloadedFile));
        }
        return done({ success: false, message: 'No downloaded file found yet — download something first.' });
      }

      // 5. OS App
      const osApp = extractOSApp(task);
      if (osApp) {
        console.log(`⚡ direct match (OS App: ${osApp}), no LLM call...`);
        return done(await openOSApp(osApp));
      }

      // --- TYPE / PRESS / SHORTCUT / SEARCH FAST PATHS ---
      const typeText = extractTypeCommand(task);
      if (typeText) {
        console.log(`⚡ direct match (type "${typeText}"), no LLM call...`);
        return done(await typeTextOnPage(page, typeText));
      }

      const pressKey = extractKeyPress(task);
      if (pressKey) {
        console.log(`⚡ direct match (press ${pressKey}), no LLM call...`);
        return done(await pressKeyOnPage(page, pressKey));
      }

      const shortcut = extractShortcut(task);
      if (shortcut) {
        console.log(`⚡ direct match (shortcut ${shortcut}), no LLM call...`);
        return done(await useShortcut(page, shortcut));
      }

      const searchQuery = extractSearchCommand(task);
      if (searchQuery) {
        console.log(`⚡ direct match (search "${searchQuery}"), no LLM call...`);
        return done(await searchOnPage(page, searchQuery));
      }

      // 5.5. Read Specific Chat
      const readChatTarget = extractReadChatCommand(task);
      if (readChatTarget) {
        console.log(`⚡ direct match (read chat with ${readChatTarget}), no LLM agent...`);
        return done(await readSpecificChat(page, readChatTarget));
      }

      // 5.6. Read Screen Summary
      if (extractReadScreenCommand(task)) {
        console.log('⚡ direct match (read screen), no agent planning...');
        return done(await readScreenWithAI(page));
      }

      // 6. YouTube
      let query = extractYouTubeQuery(task);
      if (!query && page.url().includes('youtube.com')) {
        const playMatch = task.toLowerCase().match(/\bplay\s+(.+)$/);
        if (playMatch && playMatch[1]) {
          query = playMatch[1].replace(/\b(song|video|music|track)\b/g, '').trim();
          console.log(`⚡ context match (already on YouTube), playing "${query}"...`);
        }
      }
      if (query) { 
        console.log(`⚡ direct match ("${query}"), no LLM call...`); 
        return done(await playYouTube(page, query)); 
      }

      // 7. Open Website (Browser)
      const openTarget = extractOpenTarget(task);
      if (openTarget) { console.log(`⚡ direct match ("${openTarget}"), no LLM call...`); return done(await openWebsite(page, openTarget)); }

      // 8. Fullscreen
      const fsCmd = extractFullscreenCommand(task);
      if (fsCmd) { console.log('⚡ direct match (fullscreen), no LLM call...'); return done(fsCmd.exit ? await unfullscreenWindow(page) : await fullscreenWindow(page)); }

      // 9. Scroll
      const scrollDir = extractScrollCommand(task);
      if (scrollDir) { console.log('⚡ direct match (scroll), no LLM call...'); return done(await scrollPage(page, scrollDir)); }

      // 10. New Tab
      if (extractNewTabCommand(task)) { console.log('⚡ direct match (new tab), no LLM call...'); return done(await openNewTab(page)); }

      // 11. Close
      if (extractCloseCommand(task)) { console.log('⚡ direct match (close), no LLM call...'); return done(await closeTab(page)); }

      // 12. Fallback to LLM
      const key = task.toLowerCase();
      if (cacheStore.has(key)) {
        console.log('⚡ replaying cached actions, no LLM call...');
        const replay = await agent.runFromActionCache(cacheStore.get(key), page);
        console.log(`✅ replay ${replay.status} in ${Date.now() - start}ms`);
      } else {
        console.log('🤖 no fast-path match — asking the LLM to plan this...');
        try {
          const result = await agent.executeTask(task);
          cacheStore.set(key, result.actionCache);
          console.log(`✅ done in ${Date.now() - start}ms:`, result.output);
        } catch (llmError) {
          console.log(`❌ LLM Agent failed: ${llmError.message}`);
        }
      }
    } catch (err) {
      console.error('❌', err.message);
    }
    rl.prompt();
  });

  process.on('SIGINT', async () => {
    console.log('\nClosing...');
    if (agent) await agent.closeAgent();
    process.exit(0);
  });
}

main().catch(console.error);