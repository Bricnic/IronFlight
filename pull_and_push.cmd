@echo off
setlocal
cd /d "%~dp0"

where git >nul 2>nul
if errorlevel 1 (
    echo Git is required. Install Git and try again.
    goto error
)

echo Pulling latest changes from remote main...
git pull --no-rebase --no-edit origin main
if errorlevel 1 (
    echo Pull failed. Review the Git output above before trying again.
    goto error
)

git ls-files --unmerged | findstr /r /c:"." >nul 2>nul
if not errorlevel 1 (
    echo Merge conflicts detected. Resolve them and commit before pushing. Aborting.
    goto error
)

echo Latest changes from remote main pulled successfully.

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
    echo Push failed. Review the Git output above.
    goto error
)

echo All changes pulled from and pushed to remote main successfully.
pause
exit /b 0

:error
pause
exit /b 1
