@echo off
setlocal
cd /d "%~dp0"

set "ARGS="

:parse
if "%~1"=="" goto run
if /i "%~1"=="/?" goto usage
if /i "%~1"=="-h" goto usage
if /i "%~1"=="--help" goto usage
if /i "%~1"=="help" goto usage
if /i "%~1"=="--dry-run" (
    set ARGS=%ARGS% --dry-run
    shift
    goto parse
)
if /i "%~1"=="--no-push" (
    set ARGS=%ARGS% --no-push
    shift
    goto parse
)
if /i "%~1"=="--count" (
    if "%~2"=="" (
        echo Missing value for --count. Expected an integer 1..50.
        echo.
        call :show_usage
        goto error_nopause
    )
    set ARGS=%ARGS% --count %~2
    shift
    shift
    goto parse
)
if /i "%~1"=="--only" (
    if "%~2"=="" (
        echo Missing value for --only. Expected a vehicle id.
        echo.
        call :show_usage
        goto error_nopause
    )
    set ARGS=%ARGS% --only %~2
    shift
    shift
    goto parse
)
if /i "%~1"=="--config" (
    if "%~2"=="" (
        echo Missing value for --config. Expected a config file path.
        echo.
        call :show_usage
        goto error_nopause
    )
    set ARGS=%ARGS% --config "%~2"
    shift
    shift
    goto parse
)
echo %~1| findstr /r "^[0-9][0-9]*$" >nul 2>nul
if not errorlevel 1 (
    set ARGS=%ARGS% --count %~1
    shift
    goto parse
)
echo Unknown argument: %~1
echo.
call :show_usage
goto error_nopause

:run
where node >nul 2>nul
if errorlevel 1 (
    echo Node.js is required. Install Node.js and try again.
    goto error
)

node scripts\generate-vehicles.mjs%ARGS%
if errorlevel 1 (
    echo Vehicle generation failed. Review the output above before trying again.
    goto error
)

echo Vehicle generation completed successfully.
pause
exit /b 0

:usage
call :show_usage
pause
exit /b 0

:show_usage
echo Usage: %~nx0 [options] [count]
echo.
echo Generate new vehicles with Gemini concept art, implement them on the
echo standard chassis, validate, and push.
echo.
echo Options:
echo   --count N      How many NEW vehicles to create this run, 1-50.
echo                  Existing vehicles are kept; a rerun adds nothing
echo                  until every tracked idea is complete.
echo                  A bare number means the same: "%~nx0 3".
echo   --dry-run      Show what would run without side effects.
echo   --only ^<id^>     Build only one vehicle idea ^(kebab-case id^).
echo   --config PATH  Config file ^(default config\vehicle-gen.json^).
echo   --no-push      Skip the final commit + push.
echo   --help, -h, /? Show this help.
echo.
echo Examples:
echo   %~nx0 --help
echo   %~nx0 --dry-run
echo   %~nx0 --count 3
echo   %~nx0 3 --dry-run
echo   %~nx0 --only jet-sled --no-push
exit /b 0

:error
pause
exit /b 1

:error_nopause
pause
exit /b 1
