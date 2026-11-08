@echo off
setlocal
cd /d "%~dp0"

set "DRYRUN="
if not "%~1"=="" (
    if /i "%~1"=="--dry-run" (
        set "DRYRUN=1"
    ) else (
        echo Unknown argument: %~1
        echo Usage: %~nx0 [--dry-run]
        goto error
    )
)

where git >nul 2>nul
if errorlevel 1 (
    echo Git is required. Install Git and try again.
    goto error
)

if defined DRYRUN goto muse_merge

echo Attempting a normal pull first...
git pull --no-rebase --no-edit origin main
if errorlevel 1 goto pull_failed

git ls-files --unmerged | findstr /r /c:"." >nul 2>nul
if not errorlevel 1 (
    echo Pull left conflicts behind. Falling through to Muse for a semantic merge.
    goto muse_merge
)

echo Normal pull succeeded with no conflicts. Muse is not needed.
goto plain_push

:pull_failed
git ls-files --unmerged | findstr /r /c:"." >nul 2>nul
if errorlevel 1 (
    echo Pull failed with no merge conflicts. Review the Git output above before trying again.
    goto error
)
echo Normal pull hit merge conflicts. Falling through to Muse for a semantic merge.

:muse_merge
where muse >nul 2>nul
if errorlevel 1 (
    echo Muse CLI is required for conflict resolution. Install Muse and try again.
    goto error
)

set "STATUS_FILE=%TEMP%\muse-pull-push.status"
if exist "%STATUS_FILE%" del "%STATUS_FILE%"

set "DRYRUN_FILE=%TEMP%\muse-pull-push.dryrun"
if defined DRYRUN (
    echo Dry-run mode: the agent will analyse only and make no writes.
    echo.>"%DRYRUN_FILE%"
) else (
    if exist "%DRYRUN_FILE%" del "%DRYRUN_FILE%"
)

echo Invoking Muse for a semantic merge and push...
echo This can take several minutes while Muse analyses and verifies; lines starting with MUSE-PROGRESS show each stage.
call muse exec --yolo --prompt-file "%~dp0muse_pull_push.prompt.md" --disable-request-user-input
if errorlevel 1 (
    echo Muse run failed. Review the output above before trying again.
    goto error
)
echo Muse finished. Checking the reported result...

if not exist "%STATUS_FILE%" (
    echo Muse finished without writing a status file. Treating as failure.
    goto error
)

set "RESULT="
for /f "usebackq delims=" %%R in ("%STATUS_FILE%") do (
    if not defined RESULT set "RESULT=%%R"
)
if /i "%RESULT%"=="OK" (
    if defined DRYRUN (
        echo Dry-run complete. No changes were made.
    ) else (
        echo All changes pulled, merged and pushed to remote main successfully.
    )
    pause
    exit /b 0
)

echo Muse reported failure:
type "%STATUS_FILE%"
goto error

:plain_push
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
