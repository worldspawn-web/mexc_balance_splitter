@echo off
setlocal enabledelayedexpansion

REM ---- Settings you may edit after store publish ----
set FIREFOX_GECKO_ID=mexc-balance-splitter@example.com
set CHROME_EXT_ID=yourchromeextidabcdefghijklmno
set OPERA_EXT_ID=youroperaextidabcdefghijklmno
REM ---------------------------------------------------

set DIR=%~dp0
set HOST_NAME=mexc.balance.calculator
set HOST_BAT=%DIR%host.bat

REM host wrapper
> "%HOST_BAT%" echo @echo off
>> "%HOST_BAT%" echo setlocal
>> "%HOST_BAT%" echo set DIR=%%~dp0
>> "%HOST_BAT%" echo python -u "%%DIR%%host.py"

REM --- Firefox manifest ---
set FF_MANIFEST=%DIR%%HOST_NAME%.firefox.json
powershell -Command "(Get-Content '%DIR%mexc.balance.calculator.firefox.json.template') -replace '__HOST_PATH__','%HOST_BAT%' -replace '__FIREFOX_GECKO_ID__','%FIREFOX_GECKO_ID%' | Set-Content -Encoding UTF8 '%FF_MANIFEST%'"
reg add "HKCU\Software\Mozilla\NativeMessagingHosts\%HOST_NAME%" /ve /t REG_SZ /d "%FF_MANIFEST%" /f

REM --- Chrome manifest ---
set CH_MANIFEST=%DIR%%HOST_NAME%.chrome.json
powershell -Command "(Get-Content '%DIR%mexc.balance.calculator.chrome.json.template') -replace '__HOST_PATH__','%HOST_BAT%' -replace '__CHROME_EXT_ID__','%CHROME_EXT_ID%' | Set-Content -Encoding UTF8 '%CH_MANIFEST%'"
reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\%HOST_NAME%" /ve /t REG_SZ /d "%CH_MANIFEST%" /f

REM --- Opera manifest ---
set OP_MANIFEST=%DIR%%HOST_NAME%.opera.json
powershell -Command "(Get-Content '%DIR%mexc.balance.calculator.opera.json.template') -replace '__HOST_PATH__','%HOST_BAT%' -replace '__OPERA_EXT_ID__','%OPERA_EXT_ID%' | Set-Content -Encoding UTF8 '%OP_MANIFEST%'"
reg add "HKCU\Software\Opera Software\Opera Stable\NativeMessagingHosts\%HOST_NAME%" /ve /t REG_SZ /d "%OP_MANIFEST%" /f

echo.
echo Installed Native Host for Firefox, Chrome, and Opera.
echo.
pause
