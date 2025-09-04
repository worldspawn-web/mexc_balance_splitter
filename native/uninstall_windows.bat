@echo off
setlocal
set HOST_NAME=mexc.balance.calculator
reg delete "HKCU\Software\Mozilla\NativeMessagingHosts\%HOST_NAME%" /f
reg delete "HKCU\Software\Google\Chrome\NativeMessagingHosts\%HOST_NAME%" /f
reg delete "HKCU\Software\Opera Software\Opera Stable\NativeMessagingHosts\%HOST_NAME%" /f
echo Removed native host registrations for Firefox/Chrome/Opera (HKCU).
pause
