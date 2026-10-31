param(
    [ValidateSet('Start','Capture')]
    [string]$Phase = 'Start',
    [ValidatePattern('^[A-Za-z0-9_.]+$')]
    [string]$Package = 'com.elroybenjamins.veldryn',
    [ValidatePattern('^[A-Za-z0-9_-]+$')]
    [string]$Scenario = 'inventory',
    [ValidateRange(24,240)]
    [int]$RefreshHz = 60,
    [ValidateSet('Cold','Warm')]
    [string]$LaunchMode = 'Cold',
    [ValidatePattern('^[A-Za-z0-9_.-]{1,64}$')]
    [string]$DeviceProfile = 'test_device',
    [ValidatePattern('^[A-Za-z0-9_.-]{1,64}$')]
    [string]$BuildLabel = 'local',
    [string]$Serial = '',
    [string]$OutputDirectory = (Join-Path $env:TEMP 'VeldrynPerformance')
)
$ErrorActionPreference = 'Stop'
$adb = (Get-Command adb -ErrorAction Stop).Source
$devices = @(& $adb devices)
if ($LASTEXITCODE -ne 0) { throw 'adb devices failed.' }
$authorized = @($devices | Where-Object { $_ -match "`tdevice$" })
if ($authorized.Count -eq 0) {
    throw 'Connect and authorize an Android device. Run adb devices and enable USB debugging.'
}
if ($Serial) {
    if (-not @($authorized | Where-Object { $_ -eq "$Serial`tdevice" }).Count) {
        throw 'The selected -Serial is not an authorized connected device.'
    }
    $target = $Serial
} else {
    if ($authorized.Count -ne 1) { throw 'Multiple authorized Android devices. Pass -Serial to select the intended test device.' }
    $target = ($authorized[0] -split "`t")[0]
}
if ($Phase -eq 'Start') {
    Write-Host "Resetting app frame statistics and launching $Package on the selected test device."
    if ($LaunchMode -eq 'Cold') {
        & $adb -s $target shell am force-stop $Package
        if ($LASTEXITCODE -ne 0) { throw 'Failed to stop the package. Is Veldryn installed?' }
    }
    & $adb -s $target shell dumpsys gfxinfo $Package reset
    if ($LASTEXITCODE -ne 0) { throw 'Could not reset graphics statistics.' }
    & $adb -s $target shell monkey -p $Package -c android.intent.category.LAUNCHER 1
    if ($LASTEXITCODE -ne 0) { throw 'Failed to launch Veldryn.' }
    Write-Host "Exercise $Scenario for 30-60 seconds, then run -Phase Capture with the same -Scenario, -DeviceProfile, -BuildLabel, -LaunchMode and -RefreshHz."
    return
}
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$prefix = Join-Path $OutputDirectory "$Scenario-$stamp"
& $adb -s $target shell dumpsys gfxinfo $Package framestats | Set-Content -Encoding utf8 "$prefix-frames.txt"
if ($LASTEXITCODE -ne 0) { throw 'Failed to collect frame statistics.' }
& $adb -s $target shell dumpsys meminfo $Package | Set-Content -Encoding utf8 "$prefix-memory.txt"
if ($LASTEXITCODE -ne 0) { throw 'Failed to collect app memory statistics.' }
& $adb -s $target shell dumpsys cpuinfo | Set-Content -Encoding utf8 "$prefix-cpu.txt"
if ($LASTEXITCODE -ne 0) { throw 'Failed to collect CPU statistics.' }

$reporter = Join-Path $PSScriptRoot 'android-perf-report.mjs'
$mode = $LaunchMode.ToLowerInvariant()
$summaryPath = "$prefix-summary.json"
& node $reporter capture --frames "$prefix-frames.txt" --memory "$prefix-memory.txt" --scenario $Scenario --device-profile $DeviceProfile --build $BuildLabel --capture-mode $LaunchMode.ToLowerInvariant() --hz $RefreshHz --out $summaryPath
if ($LASTEXITCODE -ne 0) { throw 'Android capture summary failed: inspect the raw diagnostics, then repeat with a longer sample.' }
Write-Host "Privacy-minimal summary saved to $summaryPath"
Write-Host "Raw frame/memory/CPU dumps remain local in $OutputDirectory. Do not commit or share raw device diagnostics."
