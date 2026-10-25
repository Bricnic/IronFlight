@echo off
setlocal
cd /d "%~dp0"

where git >nul 2>nul
if errorlevel 1 (
    echo Git is required. Install Git and try again.
    goto error
)

git pull --no-rebase --no-edit origin main
if errorlevel 1 (
    echo Pull failed. Review the Git output above before trying again.
    goto error
)

echo Latest changes from remote main pulled successfully.
pause
exit /b 0

:error
pause
exit /b 1
