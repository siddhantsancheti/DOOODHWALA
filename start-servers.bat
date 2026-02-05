@echo off
cd /d "c:\Users\siddh\OneDrive\Desktop\DOOODHWALA - Copy"
set NODE_ENV=development
set PATH=C:\Program Files\nodejs;%PATH%

echo Starting backend server on port 5001...
start "Backend Server" /min node .\node_modules\tsx\dist\cli.js server/index.ts

timeout /t 3

echo Starting frontend dev server on port 5174...
start "Frontend Dev Server" /min node .\node_modules\vite\bin\vite.js

echo Servers started!
timeout /t 2
