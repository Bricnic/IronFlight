@echo off
setlocal
cd /d "%~dp0"
REM Host the game on the LAN over HTTPS so a Quest headset can join.
REM Usage: host_local_network_server.cmd [port]  (default 5173, falls back to 5174)

where npm >nul 2>nul
if errorlevel 1 (
    echo Node.js and npm are required. Install Node.js and try again.
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

set PORT=%~1
if "%PORT%"=="" set PORT=5173
netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul 2>nul
if not errorlevel 1 (
    if "%~1"=="" (
        echo Port 5173 is busy (your HTTP dev server?). Falling back to 5174.
        set PORT=5174
        netstat -ano | findstr ":5174 " | findstr "LISTENING" >nul 2>nul
        if not errorlevel 1 (
            echo Port 5174 is busy too. Stop the other server or pass a free port.
            pause
            exit /b 1
        )
    ) else (
        echo Port %PORT% is already in use. Pick another port or stop that server.
        pause
        exit /b 1
    )
)

REM Firewall rule needs admin: re-launch elevated on first run.
net session >nul 2>nul
if errorlevel 1 (
    echo Requesting administrator rights to open the firewall port...
    powershell -NoProfile -Command "Start-Process '%~f0' -ArgumentList '%PORT%' -Verb RunAs"
    exit /b 0
)

netsh advfirewall firewall show rule name="IronFlight Quest %PORT%" >nul 2>nul
if errorlevel 1 (
    netsh advfirewall firewall add rule name="IronFlight Quest %PORT%" dir=in action=allow protocol=TCP localport=%PORT% profile=private >nul
    if errorlevel 1 (
        echo Could not add the firewall rule. Check the rule manually and re-run.
        pause
        exit /b 1
    )
    echo Firewall opened for TCP %PORT% on private networks.
) else (
    echo Firewall rule already present for TCP %PORT%.
)

echo.
echo This PC on your LAN:
ipconfig | findstr "IPv4" | findstr "192.168."
ipconfig | findstr "IPv4" | findstr " 10."
echo.
echo On the Quest (same Wi-Fi): open https://YOUR-LAN-IP:%PORT%/
echo in the Quest Browser, accept the certificate warning, start any
echo level, and press ENTER VR.
echo.
call npm run dev:https -- --port %PORT%
if errorlevel 1 (
    pause
    exit /b 1
)
