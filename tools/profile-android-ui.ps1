param(
    [ValidateSet('Start','Capture')]
    [string]$Phase = 'Start',
    [ValidatePattern('^[A-Za-z0-9_.]+$')]
    [string]$Package = 'com.elroybenjamins.veldryn',
    [ValidatePattern('^[A-Za-z0-9_-]+$')]
    [string]$Scenario = 'inventory',
    [ValidateRange(24,240)]
    [int]$RefreshHz = 60,
    [string]$OutputDirectory = (Join-Path $env:TEMP 'VeldrynPerformance')
)
$ErrorActionPreference = 'Stop'
$adb = (Get-Command adb -ErrorAction Stop).Source
$devices = @(& $adb devices)
if ($LASTEXITCODE -ne 0 -or -not ($devices -match "\tdevice$")) {
    throw 'Connect and authorize an Android device. Run adb devices and enable USB debugging.'
}
if ($Phase -eq 'Start') {
    Write-Host "Resetting app frame statistics and launching $Package."
    & $adb shell am force-stop $Package
    if ($LASTEXITCODE -ne 0) { throw 'Failed to stop the package. Is Veldryn installed?' }
    & $adb shell dumpsys gfxinfo $Package reset
    if ($LASTEXITCODE -ne 0) { throw 'Could not reset graphics statistics.' }
    & $adb shell monkey -p $Package -c android.intent.category.LAUNCHER 1
    if ($LASTEXITCODE -ne 0) { throw 'Failed to launch Veldryn.' }
    Write-Host "Now navigate to $Scenario and exercise it for 30-60 seconds, then call this script again with -Phase Capture -Scenario $Scenario."
    return
}
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$prefix = Join-Path $OutputDirectory "$Scenario-$stamp"
& $adb shell dumpsys gfxinfo $Package framestats | Set-Content -Encoding utf8 "$prefix-frames.txt"
if ($LASTEXITCODE -ne 0) { throw 'Failed to collect frame statistics.' }
& $adb shell dumpsys meminfo $Package | Set-Content -Encoding utf8 "$prefix-memory.txt"
if ($LASTEXITCODE -ne 0) { throw 'Failed to collect app memory statistics.' }
& $adb shell dumpsys cpuinfo | Set-Content -Encoding utf8 "$prefix-cpu.txt"
if ($LASTEXITCODE -ne 0) { throw 'Failed to collect CPU statistics.' }
Write-Host "Saved local-only diagnostics to $OutputDirectory"
$analyzer = Join-Path $PSScriptRoot 'summarize-android-frames.mjs'
& node $analyzer "$prefix-frames.txt" --hz $RefreshHz
if ($LASTEXITCODE -ne 0) { Write-Warning 'No parseable frame timings; raw dumps remain saved.' }
Write-Host 'Do not publish raw device diagnostics without checking them for private information.'
