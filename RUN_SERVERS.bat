@echo off
setlocal enabledelayedexpansion

REM Navigate to app directory
cd /d "c:\Users\siddh\OneDrive\Desktop\DOOODHWALA - Copy"

REM Set Node.js in PATH
set PATH=C:\Program Files\nodejs;%PATH%

REM Set environment variables
set NODE_ENV=development
set JWT_SECRET=dev-secret-key
set RAZORPAY_KEY_ID=rzp_test_dev
set STRIPE_SECRET_KEY=sk_test_dev

REM Start backend server
echo Starting DOOODHWALA Backend Server (port 5001)...
echo.
start "Backend Server" cmd /k "node .\node_modules\tsx\dist\cli.js server/index.ts"

REM Wait for backend to start
timeout /t 4 /nobreak

REM Start frontend dev server  
echo.
echo Starting Vite Frontend Dev Server (port 5174)...
echo.
start "Frontend Dev Server" cmd /k "node .\node_modules\vite\bin\vite.js"

REM Wait for frontend to start
timeout /t 3 /nobreak

echo.
echo ========================================
echo Both servers started!
echo Backend:  http://localhost:5001
echo Frontend: http://localhost:5174
echo ========================================
echo.

pause
