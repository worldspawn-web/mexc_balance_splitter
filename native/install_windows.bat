@echo off
setlocal enabledelayedexpansion

REM Installation script for Windows (HKCU) for the native messaging host
REM Requires Python 3.x available on PATH.

set DIR=%~dp0
set HOST_NAME=mexc.balance.calculator
set HOST_BAT=%DIR%host.bat
set MANIFEST=%DIR%%HOST_NAME%.json

REM Create host.bat wrapper to invoke python host.py unbuffered
> "%HOST_BAT%" echo @echo off
>> "%HOST_BAT%" echo setlocal
>> "%HOST_BAT%" echo set DIR=%%~dp0
>> "%HOST_BAT%" echo python -u "%%DIR%%host.py"

REM Write manifest with absolute path
powershell -Command "(Get-Content '%DIR%mexc.balance.calculator.json.template') -replace '__HOST_PATH__', '%HOST_BAT%' | Set-Content -Encoding UTF8 '%MANIFEST%'"

REM Register manifest in HKCU for Mozilla Firefox
reg add "HKCU\Software\Mozilla\NativeMessagingHosts\%HOST_NAME%" /ve /t REG_SZ /d "%MANIFEST%" /f

echo.
echo Installed native host '%HOST_NAME%' for current user.
echo Manifest: %MANIFEST%
echo Wrapper:  %HOST_BAT%
echo.

pause
