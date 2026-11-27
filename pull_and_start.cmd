@echo off
setlocal
cd /d "%~dp0"

call "%~dp0pull.cmd" --no-pause
if errorlevel 1 exit /b %errorlevel%

call "%~dp0start.cmd"
exit /b %errorlevel%
