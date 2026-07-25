@echo off
echo Starting Chrome with Remote Debugging...
echo.
echo IMPORTANT: Close ALL Chrome windows first!
echo.
echo Chrome will start on port 9222 for remote debugging
echo Press Ctrl+C to cancel, or
pause

"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%LOCALAPPDATA%\Google\Chrome\User Data"
