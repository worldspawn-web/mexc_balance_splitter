@echo off
setlocal
set HOST_NAME=mexc.balance.calculator
reg delete "HKCU\Software\Mozilla\NativeMessagingHosts\%HOST_NAME%" /f
echo Removed registry key for %HOST_NAME% (HKCU).
echo You may delete the native directory manually if desired.
pause
