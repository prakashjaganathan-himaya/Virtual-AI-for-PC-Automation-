const { exec } = require('child_process');
const readline = require('readline');
const path = require('path');
const os = require('os');

// Map of friendly names to actual Windows commands
const APP_MAP = {
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
  'documents': `explorer.exe "${path.join(os.homedir(), 'Documents')}"`,
  'downloads': `explorer.exe "${path.join(os.homedir(), 'Downloads')}"`,
  'pictures': `explorer.exe "${path.join(os.homedir(), 'Pictures')}"`,
  'settings': 'start ms-settings:',
  'spotify': 'start spotify:',
  'vs code': 'code',
  'visual studio code': 'code',
  'word': 'start winword',
  'excel': 'start excel',
  'powerpoint': 'start powerpnt',
  'chrome': 'start chrome',
  'edge': 'start msedge',
  'whatsapp': 'start whatsapp:'
};

function extractAppCommand(rawTask) {
  const padded = ` ${rawTask.toLowerCase().trim()} `;
  // Must mention opening/launching
  if (!/\b(?:open|launch|start|go to)\b/.test(padded)) return null;

  // Strip out filler words to find the app name
  const fillers = [
    /\bplease\b/g, /\bcan you\b/g, /\bcould you\b/g, /\bfor me\b/g,
    /\bthe\b/g, /\bapp\b/g, /\bapplication\b/g, /\bprogram\b/g,
    /\bopen\b/g, /\blaunch\b/g, /\bstart\b/g, /\bgo to\b/g
  ];
  
  let cleaned = padded;
  for (const re of fillers) cleaned = cleaned.replace(re, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  if (!cleaned || cleaned.split(' ').length > 3) return null;
  
  return cleaned;
}

function openApp(appName) {
  const command = APP_MAP[appName];
  
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
    // Fallback: try to open it as a generic Windows command
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

// --- Main CLI Loop ---
async function main() {
  console.log('\n🚀 OS Assistant — Local App Control');
  console.log('Type "open notepad", "open downloads", or "open spotify". Ctrl+C to exit.\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.setPrompt('> ');
  rl.prompt();

  rl.on('line', async (line) => {
    const rawTask = line.trim();
    if (!rawTask) return rl.prompt();

    const start = Date.now();
    const done = (result) => {
      console.log(`✅ ${result.success ? 'done' : 'failed'} in ${Date.now() - start}ms: ${result.message}`);
      rl.prompt();
    };

    const appTarget = extractAppCommand(rawTask);
    if (appTarget) {
      console.log(`⚡ Opening OS App: ${appTarget}...`);
      return done(await openApp(appTarget));
    } else {
      console.log(`❌ I don't recognize that OS command. Try "open calculator".`);
    }
    rl.prompt();
  });

  process.on('SIGINT', () => {
    console.log('\nClosing OS Assistant...');
    process.exit(0);
  });
}

main();