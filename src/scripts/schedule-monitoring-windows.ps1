# PowerShell script to schedule Flippa monitoring on Windows
# This script creates a Windows Task Scheduler task that runs the monitoring system

$taskName = "FlippaMonitoring"
$description = "Automated Flippa marketplace monitoring - checks for new listings and changes"
$scriptPath = Join-Path $PSScriptRoot "run-monitoring.bat"
$workingDir = Split-Path $PSScriptRoot -Parent | Split-Path -Parent

# Create the batch file that will run the monitoring
$batchContent = @"
@echo off
cd /d "$workingDir"
echo [%date% %time%] Starting Flippa monitoring... >> logs\monitoring.log
npm run monitoring >> logs\monitoring.log 2>&1
echo [%date% %time%] Monitoring completed >> logs\monitoring.log
"@

# Ensure logs directory exists
New-Item -ItemType Directory -Force -Path (Join-Path $workingDir "logs") | Out-Null

# Write the batch file
Set-Content -Path $scriptPath -Value $batchContent -Encoding ASCII

Write-Host "Creating scheduled task: $taskName" -ForegroundColor Green

# Remove existing task if it exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "Removing existing task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create the scheduled task
$action = New-ScheduledTaskAction -Execute $scriptPath -WorkingDirectory $workingDir
$trigger = New-ScheduledTaskTrigger -Daily -At "9:00AM" -DaysInterval 1
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable -MultipleInstances Parallel

# Register the task
Register-ScheduledTask -TaskName $taskName -Description $description -Action $action -Trigger $trigger -Settings $settings -RunLevel Limited

Write-Host "✅ Task created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Task Details:" -ForegroundColor Cyan
Write-Host "  Name: $taskName"
Write-Host "  Schedule: Daily at 9:00 AM"
Write-Host "  Script: $scriptPath"
Write-Host "  Logs: $workingDir\logs\monitoring.log"
Write-Host ""
Write-Host "To run the task immediately:" -ForegroundColor Yellow
Write-Host "  Start-ScheduledTask -TaskName $taskName"
Write-Host ""
Write-Host "To view task status:" -ForegroundColor Yellow
Write-Host "  Get-ScheduledTask -TaskName $taskName | Get-ScheduledTaskInfo"
Write-Host ""
Write-Host "To modify schedule to run every hour:" -ForegroundColor Yellow
Write-Host "  $task = Get-ScheduledTask -TaskName $taskName"
Write-Host "  $task.Triggers[0].Repetition.Interval = 'PT1H'"
Write-Host "  $task.Triggers[0].Repetition.Duration = 'P1D'"
Write-Host "  Set-ScheduledTask -InputObject $task"