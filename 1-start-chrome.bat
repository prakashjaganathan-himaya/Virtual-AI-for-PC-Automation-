@echo off
echo ============================================
echo   Starting Chrome with Your Profile
echo ============================================
echo.
echo Closing any existing Chrome instances...
taskkill /F /IM chrome.exe /T 2>nul
timeout /t 2 /nobreak >nul
echo.
echo Starting Chrome with remote debugging...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%LOCALAPPDATA%\Google\Chrome\User Data" --profile-directory=Default
echo.
echo ✅ Chrome started with your profile!
echo    You can now run: node run-with-local-llm.js "your task"
echo.
pause
