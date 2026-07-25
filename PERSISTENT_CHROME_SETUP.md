# Persistent Chrome Session Setup

This guide explains how to use HyperAgent with your Chrome browser's persistent profile, allowing you to:
- Execute tasks on websites where you're already logged in
- Keep the browser open after task completion
- Maintain cookies, sessions, and browser history

## Changes Made

### 1. Modified LocalBrowserProvider ([src/browser-providers/local.ts](src/browser-providers/local.ts))

**Key Changes:**
- Added automatic detection of your Chrome user data directory (works on Windows, macOS, and Linux)
- Added `autoClose` option to control whether the browser closes after task completion
- Browser now uses your actual Chrome profile with all your logged-in accounts

**New Constructor Option:**
```typescript
localConfig: {
  autoClose: false, // Set to true to auto-close browser after tasks
}
```

### 2. Chrome User Data Directory

The browser provider automatically detects your Chrome profile location based on your OS:

- **Windows**: `%USERPROFILE%\AppData\Local\Google\Chrome\User Data`
- **macOS**: `~/Library/Application Support/Google/Chrome`
- **Linux**: `~/.config/google-chrome`

## Usage

### Basic Example

```typescript
import { HyperAgent } from "@hyperbrowser/agent";

const agent = new HyperAgent({
  llm: {
    provider: "openai",
    model: "gpt-4o",
  },
  localConfig: {
    autoClose: false, // Browser stays open after task completion
  },
});

// Execute your task - browser will use your Chrome profile
await agent.executeTask("Navigate to Twitter and create a new tweet");

// Browser remains open - close manually when done
// Or call agent.closeAgent() if you want to close it programmatically
```

### Running the Example

A complete example is available in [examples/persistent-chrome-session.ts](examples/persistent-chrome-session.ts):

```bash
yarn ts-node -r tsconfig-paths/register examples/persistent-chrome-session.ts
```

## Important Notes

### ⚠️ Close Chrome Before Running

**You MUST close Chrome completely before running the script.** Chrome cannot open the same profile in multiple instances. If Chrome is already running, you'll get an error.

**Windows:** Make sure Chrome is fully closed (check Task Manager)
**macOS:** Quit Chrome (⌘+Q)
**Linux:** `killall chrome` or close from the system tray

### 🔒 Profile Safety

The script uses your **Default** Chrome profile (`--profile-directory=Default`). If you want to use a different profile:

1. Open Chrome and go to `chrome://version`
2. Look for "Profile Path" - it will show something like `...Chrome/User Data/Profile 1`
3. Modify the profile directory in the code:

```typescript
args: [
  "--profile-directory=Profile 1", // Change this to your profile
]
```

### 🔐 Security Considerations

- The automation uses your real Chrome profile with saved passwords and cookies
- Be careful when running tasks on sensitive accounts
- Consider creating a separate Chrome profile for automation if needed

## Advanced Configuration

### Using a Custom Profile Directory

If you want to use a different Chrome installation or profile:

```typescript
const agent = new HyperAgent({
  llm: { provider: "openai", model: "gpt-4o" },
  localConfig: {
    autoClose: false,
    args: [
      "--user-data-dir=/path/to/custom/profile",
      "--profile-directory=YourProfile",
    ],
  },
});
```

### Controlling Browser Closure

**Keep browser open (default):**
```typescript
localConfig: {
  autoClose: false, // or omit this option
}
```

**Auto-close browser after tasks:**
```typescript
localConfig: {
  autoClose: true,
}
```

## Troubleshooting

### Error: "Chrome is already running"
- **Solution:** Close all Chrome windows and try again
- **Check:** Task Manager (Windows), Activity Monitor (macOS), or `ps aux | grep chrome` (Linux)

### Error: "Failed to launch browser"
- **Solution:** Ensure Chrome is installed in the default location
- **Check:** Run `chrome --version` in terminal to verify installation

### Browser opens but not logged in
- **Solution:** Make sure you're using the correct profile directory
- **Check:** Look at Chrome's profile path in `chrome://version`

### Pages require login despite using Chrome profile
- **Solution:** You might need to close and reopen Chrome, then log in again before running the script

## Next Steps

Now that you have persistent Chrome sessions working, you can:

1. ✅ Run tasks on websites where you're already logged in
2. ✅ Keep the browser open to inspect results
3. ✅ Build a desktop frontend application (next phase)
4. ✅ Add voice control with LiveKit (next phase)

See the main [README.md](README.md) for more information about HyperAgent capabilities.
