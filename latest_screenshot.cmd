@echo off
setlocal
cd /d "%~dp0"

set "SHOTDIR="
if exist "%USERPROFILE%\Pictures\Screenshots" (
    set "SHOTDIR=%USERPROFILE%\Pictures\Screenshots"
)
if not defined SHOTDIR (
    if exist "%USERPROFILE%\OneDrive\Pictures\Screenshots" (
        set "SHOTDIR=%USERPROFILE%\OneDrive\Pictures\Screenshots"
    )
)
if not defined SHOTDIR (
    for /d %%D in ("%USERPROFILE%\OneDrive -*\Pictures\Screenshots") do (
        set "SHOTDIR=%%D"
    )
)
if not defined SHOTDIR (
    echo Screenshots directory not found under Pictures or OneDrive Pictures.
    goto error
)

set "LATEST="
for /f "delims=" %%F in ('dir "%SHOTDIR%" /b /a-d /o-d 2^>nul') do (
    if not defined LATEST set "LATEST=%%F"
)
if not defined LATEST (
    echo No files found in %SHOTDIR%.
    goto error
)

echo Screenshots directory: %SHOTDIR%
echo Most recent file: %SHOTDIR%\%LATEST%
pause
exit /b 0

:error
pause
exit /b 1
