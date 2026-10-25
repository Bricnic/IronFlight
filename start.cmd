@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
    echo Node.js and npm are required to start the game. Install Node.js and try again.
    pause
    exit /b 1
)

if not exist "node_modules\vite\bin\vite.js" (
    call npm ci
    if errorlevel 1 (
        pause
        exit /b 1
    )
)

call npm run dev -- --open
if errorlevel 1 (
    pause
    exit /b 1
)
