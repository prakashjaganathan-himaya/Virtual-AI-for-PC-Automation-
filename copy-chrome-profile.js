
const fs = require('fs');
const path = require('path');

const sourceProfile = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data', 'Default');
const destProfile = path.join(process.env.LOCALAPPDATA, 'HyperAgent', 'ChromeProfile', 'Default');

console.log('\n📋 Copying Chrome Profile...\n');
console.log('From:', sourceProfile);
console.log('To:', destProfile);

fs.mkdirSync(destProfile, { recursive: true });
fs.mkdirSync(path.join(destProfile, 'Network'), { recursive: true });

const itemsToCopy = [
  'Network/Cookies',   // moved here in Chrome 96 (Dec 2021) - this is the actual fix
  'Login Data',
  'Web Data',
  'Preferences',
  'Bookmarks',
  'History',
  'Favicons',
];

let copiedCount = 0;

itemsToCopy.forEach(item => {
  const parts = item.split('/');
  const src = path.join(sourceProfile, ...parts);
  const dest = path.join(destProfile, ...parts);

  try {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`✅ Copied: ${item}`);
      copiedCount++;
    } else {
      console.log(`⚠️  Skipped: ${item} (not found)`);
    }
  } catch (error) {
    console.log(`❌ Failed: ${item} - ${error.message}`);
  }
});

console.log(`\n✨ Done! Copied ${copiedCount} items.`);