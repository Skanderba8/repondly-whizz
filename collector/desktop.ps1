param(
    [ValidateSet('Setup', 'Run', 'Scheduled', 'Status', 'Disable', 'Repair')]
    [string]$Mode = 'Run'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$privateDirectory = Join-Path $projectRoot '.secrets'
$credentialsPath = Join-Path $privateDirectory 'collector-credentials.xml'
$statusPath = Join-Path $privateDirectory 'collector-status.json'
$launchErrorPath = Join-Path $privateDirectory 'collector-launch-error.txt'
$logsDirectory = Join-Path $privateDirectory 'collector-logs'
$pythonPath = Join-Path $projectRoot '.venv\Scripts\python.exe'
$taskName = 'Whizz Repondly daily collector'
$requiredVariables = @('TELEGRAM_API_ID', 'TELEGRAM_API_HASH', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY')
$status = $null
$slotPath = $null

function Read-PrivateSettings {
    if (-not (Test-Path -LiteralPath $credentialsPath)) {
        throw 'Run Setup automatic scraping.cmd once to save your private collector settings.'
    }
    $saved = Import-Clixml -LiteralPath $credentialsPath
    foreach ($name in ($requiredVariables + 'TELEGRAM_SESSION_PATH')) {
        if ($saved.ContainsKey($name)) {
            $credential = [System.Management.Automation.PSCredential]::new($name, $saved[$name])
            [Environment]::SetEnvironmentVariable($name, $credential.GetNetworkCredential().Password, 'Process')
        }
    }
    foreach ($name in $requiredVariables) {
        if (-not [Environment]::GetEnvironmentVariable($name, 'Process')) {
            throw 'Saved settings are incomplete. Run Setup automatic scraping.cmd again.'
        }
    }
}

function Assert-CollectorFiles {
    if (-not (Test-Path -LiteralPath $pythonPath)) {
        throw 'The project Python environment is missing. Follow collector/README.md setup first.'
    }
    if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'config.local.json'))) {
        throw 'Store configuration is missing. Follow collector/README.md source setup first.'
    }
}

function Save-Status($value) {
    $temporaryPath = "$statusPath.tmp"
    $value | ConvertTo-Json | Set-Content -LiteralPath $temporaryPath -Encoding UTF8
    Move-Item -LiteralPath $temporaryPath -Destination $statusPath -Force
}

function New-HiddenCollectorAction {
    $windowlessPython = Join-Path $projectRoot '.venv\Scripts\pythonw.exe'
    if (-not (Test-Path -LiteralPath $windowlessPython)) {
        throw 'The project Python windowless launcher is missing. Restore the project Python environment.'
    }
    $launcherArguments = '"{0}"' -f (Join-Path $PSScriptRoot 'hidden_dispatch.py')
    return New-ScheduledTaskAction -Execute $windowlessPython -Argument $launcherArguments -WorkingDirectory $projectRoot
}

try {
    if ($Mode -eq 'Repair') {
        $action = New-HiddenCollectorAction
        Set-ScheduledTask -TaskName $taskName -Action $action | Out-Null
        Write-Host 'Updated the existing task to a windowless launcher. Credentials and schedule are unchanged.'
        exit 0
    }
    if ($Mode -eq 'Disable') {
        Disable-ScheduledTask -TaskName $taskName | Out-Null
        Write-Host 'Automatic scraping disabled. Saved data and credentials are preserved.'
        exit 0
    }

    if ($Mode -eq 'Status') {
        if (Test-Path -LiteralPath $launchErrorPath) {
            Write-Host 'Latest launcher error:'
            Get-Content -LiteralPath $launchErrorPath
        }
        $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        if ($task) {
            Write-Host "Automatic schedule: $($task.State). Target times: 13:00 and 18:00 America/New_York."
            $info = Get-ScheduledTaskInfo -TaskName $taskName
            Write-Host "Last scheduler check: $($info.LastRunTime). Next check: $($info.NextRunTime)."
            Write-Host "Scheduler exit code: $($info.LastTaskResult) (0 means the dispatcher completed)."
        } else {
            Write-Host 'Automatic schedule is not installed for this Windows account.'
        }
        if (Test-Path -LiteralPath $statusPath) {
            $status = Get-Content -LiteralPath $statusPath -Raw | ConvertFrom-Json
            Write-Host "Last scrape: $($status.startedAt) UTC. State: $($status.state). Exit code: $($status.exitCode)."
            Write-Host "Log: $($status.log)"
            if (Test-Path -LiteralPath $status.log) {
                Write-Host 'Last 35 log lines:'
                Get-Content -LiteralPath $status.log -Tail 35
            }
        } else {
            Write-Host 'No scrape has been recorded by these launchers yet.'
        }
        Write-Host 'A Running state after a restart can mean the last scrape was interrupted. Use Run scraper now.cmd.'
        Write-Host 'PC must be awake and this Windows user signed in. A locked screen is fine.'
        exit 0
    }

    Assert-CollectorFiles
    New-Item -ItemType Directory -Path $privateDirectory -Force | Out-Null

    if ($Mode -eq 'Setup') {
        Write-Host 'Save collector credentials encrypted for this Windows account and this PC.'
        Write-Host 'Press Enter to keep an existing saved value or a value from this terminal.'
        $saved = @{}
        if (Test-Path -LiteralPath $credentialsPath) {
            $saved = Import-Clixml -LiteralPath $credentialsPath
        }
        foreach ($name in $requiredVariables) {
            $value = Read-Host "$name (hidden)" -AsSecureString
            if ($value.Length -gt 0) {
                $saved[$name] = $value
            } elseif (-not $saved.ContainsKey($name)) {
                $existingValue = [Environment]::GetEnvironmentVariable($name, 'Process')
                if (-not $existingValue) { throw "A value is required for $name. Setup stopped." }
                $saved[$name] = ConvertTo-SecureString $existingValue -AsPlainText -Force
            }
        }
        # Preserve a custom session path without exposing it in the task action.
        if ($env:TELEGRAM_SESSION_PATH) {
            $saved['TELEGRAM_SESSION_PATH'] = ConvertTo-SecureString $env:TELEGRAM_SESSION_PATH -AsPlainText -Force
        }
        $saved | Export-Clixml -LiteralPath $credentialsPath

        $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
        $action = New-HiddenCollectorAction
        # A lightweight local clock check avoids fixed UTC offsets when New York changes DST.
        # Only the two daily due slots can launch Python. Other checks make no network calls.
        $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1)
        $principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
        $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 3)
        Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Collect reports at 13:00 and 18:00 New York time. Local minute checks handle DST; no continuous Telegram polling.' -Force | Out-Null
        Write-Host 'Installed: 13:00 and 18:00 New York time, including daylight saving changes.'
        Write-Host 'Now open Run scraper now.cmd once to confirm Telegram sign-in and inspect results.'
        Write-Host 'Keep this PC awake and your Windows account signed in. No terminal needs to stay open.'
        Write-Host 'If a slot is missed, the latest due slot runs when the PC is available later that New York day.'
        exit 0
    }

    # Serialize desktop dispatchers before claiming a slot or updating the shared status file.
    # collect.py also locks all Python entry points, including existing manual/watch commands.
    $dispatcherLock = $null
    try {
        $dispatcherLock = [System.IO.File]::Open((Join-Path $privateDirectory 'collector-desktop.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
    } catch [System.IO.IOException] {
        if ($Mode -eq 'Scheduled') { exit 0 }
        throw 'Another desktop scrape is running. Check status and wait for it to finish.'
    }
    try {
        $slotPath = $null
        if ($Mode -eq 'Scheduled') {
            $zone = [TimeZoneInfo]::FindSystemTimeZoneById('Eastern Standard Time')
            $newYorkNow = [TimeZoneInfo]::ConvertTimeFromUtc([DateTime]::UtcNow, $zone)
            $hour = if ($newYorkNow.Hour -ge 18) { 18 } elseif ($newYorkNow.Hour -ge 13) { 13 } else { $null }
            if ($null -eq $hour) { exit 0 }
            $slotsDirectory = Join-Path $privateDirectory 'collector-slots'
            New-Item -ItemType Directory -Path $slotsDirectory -Force | Out-Null
            $slotPath = Join-Path $slotsDirectory ('{0}-{1}.json' -f $newYorkNow.ToString('yyyy-MM-dd'), $hour)
            if (Test-Path -LiteralPath $slotPath) { exit 0 }
        }

        Read-PrivateSettings
        if (Test-Path -LiteralPath $launchErrorPath) {
            Remove-Item -LiteralPath $launchErrorPath
        }
        New-Item -ItemType Directory -Path $logsDirectory -Force | Out-Null
        $startedAt = [DateTime]::UtcNow.ToString('o')
        $logPath = Join-Path $logsDirectory ('scrape-{0}-{1}.log' -f [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss'), [Guid]::NewGuid().ToString('N').Substring(0, 8))
        $status = @{ startedAt = $startedAt; state = 'Running'; exitCode = $null; log = $logPath; mode = $Mode }
        Save-Status $status
        # Claim before launching. A failure/interruption stays visible and requires manual retry,
        # rather than scraping again every minute or silently claiming success.
        if ($slotPath) { $status | ConvertTo-Json | Set-Content -LiteralPath $slotPath -Encoding UTF8 }
        $collectorArguments = @((Join-Path $PSScriptRoot 'collect.py'), '--config', 'collector/config.local.json', '--since', '2026-07-01', '--mapped-team')
        if ($Mode -eq 'Scheduled') { $collectorArguments += '--non-interactive' }
        Write-Host "Scraping once. Log: $logPath"
        # Keep manual Python attached to the console so Telegram sign-in prompts are visible.
        # Scheduled Python is headless; merge stderr into its private log.
        $previousErrorPreference = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        try {
            if ($Mode -eq 'Run') {
                Start-Transcript -Path $logPath -Force -ErrorAction Stop | Out-Null
                try {
                    & $pythonPath -u @collectorArguments
                    $scrapeExitCode = $LASTEXITCODE
                } finally {
                    Stop-Transcript | Out-Null
                }
            } else {
                & $pythonPath -u @collectorArguments 2>&1 | ForEach-Object {
                    Add-Content -LiteralPath $logPath -Value $_.ToString() -Encoding UTF8 -ErrorAction Stop
                }
                $scrapeExitCode = $LASTEXITCODE
            }
        } finally {
            $ErrorActionPreference = $previousErrorPreference
        }
        $status.exitCode = $scrapeExitCode
        $status.state = if ($scrapeExitCode -eq 0) { 'Completed' } else { 'Needs attention' }
        $status['finishedAt'] = [DateTime]::UtcNow.ToString('o')
        Save-Status $status
        if ($slotPath) { $status | ConvertTo-Json | Set-Content -LiteralPath $slotPath -Encoding UTF8 }
        Write-Host "Result: $($status.state). Open Check scraper status.cmd to review."
        exit $scrapeExitCode
    } finally {
        if ($dispatcherLock) { $dispatcherLock.Dispose() }
    }
} catch {
    # Do not print exception details that could contain private settings.
    $safeMessage = 'Scraper setup or launch failed. Check Python/config files, saved credentials, and Windows Task Scheduler permissions.'
    if ($_.Exception.Message -match '^(Run Setup|Saved settings|The project Python|Store configuration|A value is required|Another desktop)') {
        $safeMessage = $_.Exception.Message
    }
    [Console]::Error.WriteLine($safeMessage)
    if ($status -and $status.state -eq 'Running') {
        $status.state = 'Needs attention'
        $status.exitCode = 1
        $status['finishedAt'] = [DateTime]::UtcNow.ToString('o')
        Save-Status $status
        if ($slotPath) { $status | ConvertTo-Json | Set-Content -LiteralPath $slotPath -Encoding UTF8 }
    }
    if ($Mode -eq 'Scheduled') {
        New-Item -ItemType Directory -Path $privateDirectory -Force | Out-Null
        ('{0} UTC: {1}' -f [DateTime]::UtcNow.ToString('o'), $safeMessage) | Set-Content -LiteralPath $launchErrorPath -Encoding UTF8
    }
    exit 1
}
