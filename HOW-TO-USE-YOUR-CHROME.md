# How to Use Your Signed-In Chrome Browser

This setup allows HyperAgent to control **YOUR actual Chrome browser** with all your logged-in accounts.

## 🚀 Quick Start

### Step 1: Close Chrome
Close ALL Chrome windows completely.

### Step 2: Start Chrome with Remote Debugging
Double-click: `start-chrome-debug.bat`

This will:
- Start YOUR Chrome with all your logins
- Enable remote debugging on port 9222
- Allow HyperAgent to connect and control it

### Step 3: Run HyperAgent
```bash
node run-with-local-llm.js "your task here"
```

That's it! HyperAgent will now control your Chrome browser with all your accounts logged in.

## ✅ What You'll See

When you run the script:
```
🔗 Connecting to Chrome on port 9222...
✅ Connected to your Chrome browser!
```

## ⚠️ Important Notes

1. **Chrome MUST be started with remote debugging** using `start-chrome-debug.bat`
2. If you close Chrome, you need to restart it with the batch file
3. Your Chrome will stay open after tasks complete - close it manually when done
4. All your logins, cookies, and extensions work normally

## 🔧 Troubleshooting

### Error: "Could not connect to Chrome"
**Solution:** Run `start-chrome-debug.bat` first, THEN run the HyperAgent script

### Chrome won't start with the batch file
**Solution:** Make sure ALL Chrome windows are closed first (check Task Manager)

### Already have Chrome open
**Solution:** Close it completely, then use `start-chrome-debug.bat` to reopen it

## 📝 Example

```bash
# 1. Close Chrome
# 2. Double-click start-chrome-debug.bat
# 3. Run your task:
node run-with-local-llm.js "Go to Twitter and check my notifications"
```

Chrome will open with all your accounts logged in, and HyperAgent will complete the task!
