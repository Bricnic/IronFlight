@echo off
setlocal
cd /d "%~dp0"

where git >nul 2>nul
if errorlevel 1 (
    echo Git is required. Install Git and try again.
    goto error
)

git add --all
if errorlevel 1 goto error

git diff --cached --quiet
if errorlevel 2 goto error
if errorlevel 1 (
    git commit -m "Update game files"
    if errorlevel 1 goto error
)

git push origin HEAD:main
if errorlevel 1 (
    echo Push failed. Review the Git output above. Remote changes may need to be pulled first.
    goto error
)

echo All changes pushed to remote main successfully.
pause
exit /b 0

:error
pause
exit /b 1
