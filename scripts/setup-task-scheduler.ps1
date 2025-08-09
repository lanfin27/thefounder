# PowerShell script to set up Windows Task Scheduler for The Founder monitoring
# Run as Administrator

$taskName = "TheFounderMonitoring"
$taskDescription = "Hourly monitoring task for The Founder - Flippa listings tracker"
$scriptPath = "C:\Users\KIMJAEHEON\the-founder\scripts\monitoring-task.bat"
$logPath = "C:\Users\KIMJAEHEON\the-founder\logs"

# Create logs directory if it doesn't exist
if (!(Test-Path $logPath)) {
    New-Item -ItemType Directory -Path $logPath -Force
    Write-Host "Created logs directory: $logPath" -ForegroundColor Green
}

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "Task '$taskName' already exists. Removing old task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create the action (what to run)
$action = New-ScheduledTaskAction -Execute $scriptPath

# Create the trigger (when to run - every hour)
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration ([System.TimeSpan]::MaxValue)

# Create the principal (who runs it)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest

# Create the settings
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

# Register the task
try {
    Register-ScheduledTask -TaskName $taskName -Description $taskDescription -Action $action -Trigger $trigger -Principal $principal -Settings $settings
    Write-Host "Successfully created scheduled task: $taskName" -ForegroundColor Green
    Write-Host ""
    Write-Host "Task Details:" -ForegroundColor Cyan
    Write-Host "  Name: $taskName"
    Write-Host "  Schedule: Every hour"
    Write-Host "  Script: $scriptPath"
    Write-Host "  Logs: $logPath"
    Write-Host ""
    Write-Host "The task will run automatically every hour." -ForegroundColor Green
    Write-Host "To run it manually, use: Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor Yellow
    
} catch {
    Write-Host "Failed to create scheduled task: $_" -ForegroundColor Red
}

# Optional: Run the task immediately for testing
$runNow = Read-Host "Do you want to run the task now for testing? (Y/N)"
if ($runNow -eq 'Y' -or $runNow -eq 'y') {
    Write-Host "Running task..." -ForegroundColor Yellow
    Start-ScheduledTask -TaskName $taskName
    Write-Host "Task started. Check logs at: $logPath\monitoring.log" -ForegroundColor Green
}