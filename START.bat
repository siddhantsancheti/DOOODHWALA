@echo off
REM Simple Windows batch launcher for DOOODHWALA Development Servers

cd /d "c:\Users\siddh\OneDrive\Desktop\DOOODHWALA - Copy"

REM Set up environment
set NODE_ENV=development
set JWT_SECRET=dev-secret-key
set RAZORPAY_KEY_ID=rzp_test_dev
set STRIPE_SECRET_KEY=sk_test_dev
set PATH=C:\Program Files\nodejs;%PATH%

REM Kill any existing node processes
taskkill /IM node.exe /F 2>nul

echo.
echo ========================================
echo DOOODHWALA Development Server Launcher
echo ========================================
echo.
echo Starting Backend Server (port 5001)...

REM Start backend server
start "DOOODHWALA Backend" cmd /k "node node_modules\tsx\dist\cli.mjs server\index.ts"

REM Wait for backend
timeout /t 5 /nobreak

echo.
echo Starting Frontend Dev Server (port 5174)...
echo.

REM Start frontend server
start "DOOODHWALA Frontend" cmd /k "node node_modules\vite\bin\vite.js"

echo.
echo ========================================
echo Both servers are starting...
echo Backend:  http://localhost:5001
echo Frontend: http://localhost:5174
echo ========================================
echo.

pause
