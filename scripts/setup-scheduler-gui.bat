@echo off
:: GUI setup for Windows Task Scheduler
echo ===================================
echo The Founder - Task Scheduler Setup
echo ===================================
echo.
echo This will set up hourly monitoring for The Founder.
echo.
echo Press any key to open Task Scheduler...
pause > nul

:: Open Task Scheduler
start taskschd.msc

echo.
echo ===================================
echo Manual Setup Instructions:
echo ===================================
echo.
echo 1. In Task Scheduler, click "Create Basic Task..." on the right
echo 2. Name: TheFounderMonitoring
echo 3. Description: Hourly monitoring for Flippa listings
echo 4. Trigger: Daily (then modify to repeat every hour)
echo 5. Action: Start a program
echo 6. Program: %~dp0monitoring-task.bat
echo 7. Finish and then edit the task:
echo    - Triggers tab: Edit trigger, set "Repeat task every: 1 hour"
echo    - Settings tab: Check "Run task as soon as possible after a scheduled start is missed"
echo.
echo Task script location: %~dp0monitoring-task.bat
echo.
pause