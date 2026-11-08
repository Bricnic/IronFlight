@echo off
setlocal
cd /d "%~dp0"

where muse >nul 2>nul
if errorlevel 1 (
    echo Muse CLI is required. Install Muse and try again.
    goto error
)

where git >nul 2>nul
if errorlevel 1 (
    echo Git is required. Install Git and try again.
    goto error
)

set "STATUS_FILE=%TEMP%\muse-pull-push.status"
if exist "%STATUS_FILE%" del "%STATUS_FILE%"

echo Invoking Muse to pull, resolve conflicts and push...
call muse exec --yolo --prompt-file "%~dp0muse_pull_push.prompt.md" --disable-request-user-input
if errorlevel 1 (
    echo Muse run failed. Review the output above before trying again.
    goto error
)

if not exist "%STATUS_FILE%" (
    echo Muse finished without writing a status file. Treating as failure.
    goto error
)

set "RESULT="
for /f "usebackq delims=" %%R in ("%STATUS_FILE%") do (
    if not defined RESULT set "RESULT=%%R"
)
if /i "%RESULT%"=="OK" (
    echo All changes pulled, merged and pushed to remote main successfully.
    pause
    exit /b 0
)

echo Muse reported failure:
type "%STATUS_FILE%"
goto error

:error
pause
exit /b 1
