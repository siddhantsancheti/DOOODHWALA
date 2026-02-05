@echo off
REM Simple batch file to start development servers
cd /d "%~dp0"
set PATH=C:\Program Files\nodejs;%PATH%
set NODE_ENV=development

echo Killing any existing node processes...
taskkill /IM node.exe /F 2>nul
timeout /t 1 /nobreak

echo.
echo ========================================
echo Starting DOOODHWALA Development Servers
echo ========================================
echo.

echo Backend on http://localhost:5001
echo Frontend on http://localhost:5174
echo.

node start-dev.js

pause
