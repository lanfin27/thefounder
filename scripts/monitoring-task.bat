@echo off
:: The Founder - Hourly Monitoring Task
:: This script runs the incremental monitoring scan

echo [%date% %time%] Starting The Founder monitoring task >> "%~dp0..\logs\monitoring.log"

:: Change to project directory
cd /d "C:\Users\KIMJAEHEON\the-founder"

:: Run the monitoring script
node scripts\automated-monitoring.js >> "%~dp0..\logs\monitoring.log" 2>&1

echo [%date% %time%] Monitoring task completed >> "%~dp0..\logs\monitoring.log"
echo. >> "%~dp0..\logs\monitoring.log"