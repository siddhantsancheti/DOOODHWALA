@echo off
cd /d "c:\Users\siddh\OneDrive\Desktop\DOOODHWALA - Copy"
set PATH=C:\Program Files\nodejs;%PATH%
set NODE_ENV=development
set JWT_SECRET=dev-secret

REM Kill existing processes
taskkill /IM node.exe /F >nul 2>&1

REM Wait a moment
timeout /t 1 /nobreak >nul

REM Start backend server
echo Starting Backend Server (port 5001)...
start "Backend" cmd /k "node node_modules\tsx\dist\cli.mjs server\index.ts"

REM Wait for backend to start
timeout /t 5 /nobreak >nul

REM Start frontend server
echo Starting Frontend Dev Server (port 5174)...
start "Frontend" cmd /k "node node_modules\vite\bin\vite.js"

echo.
echo Servers starting! Check the opened windows.
echo.
timeout /t 3 /nobreak >nul
