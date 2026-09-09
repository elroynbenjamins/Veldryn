param(
  [Parameter(Mandatory = $true)][string]$BaseMasterPath,
  [Parameter(Mandatory = $true)][string]$OverlayMattePath,
  [Parameter(Mandatory = $true)][string]$ReviewDirectory,
  [Parameter(Mandatory = $true)][string]$OutputDirectory,
  [ValidateSet('green', 'magenta', 'checker')][string]$MatteMode = 'magenta',
  [int]$Width = 128,
  [int]$Height = 160,
  [int]$Padding = 4
)

$removeMatte = Join-Path $PSScriptRoot 'Remove-EquipmentMatte.ps1'
New-Item -ItemType Directory -Force -Path $ReviewDirectory,$OutputDirectory | Out-Null
$cleanOverlay = Join-Path $ReviewDirectory 'weapon-overlay-master-clean.png'
& $removeMatte -InputPath $OverlayMattePath -OutputPath $cleanOverlay -Mode $MatteMode

Add-Type -AssemblyName System.Drawing
$base = [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $BaseMasterPath).Path)
$overlay = [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $cleanOverlay).Path)
try {
  if ($base.Width -ne $overlay.Width -or $base.Height -ne $overlay.Height) {
    throw 'Base and overlay masters must have identical dimensions.'
  }
  $panelWidth = [int][Math]::Floor($base.Width / 4)
  $views = @('male-front','male-back','female-front','female-back')
  for ($index = 0; $index -lt $views.Count; $index++) {
    $left = $index * $panelWidth
    $thisWidth = if ($index -eq 3) { $base.Width - $left } else { $panelWidth }
    $minX = $thisWidth; $minY = $base.Height; $maxX = -1; $maxY = -1
    for ($y = 0; $y -lt $base.Height; $y++) {
      for ($x = 0; $x -lt $thisWidth; $x++) {
        if ($base.GetPixel($left + $x,$y).A -eq 0) { continue }
        if ($x -lt $minX) { $minX = $x }; if ($x -gt $maxX) { $maxX = $x }
        if ($y -lt $minY) { $minY = $y }; if ($y -gt $maxY) { $maxY = $y }
      }
    }
    if ($maxX -lt $minX) { throw "Base panel $($views[$index]) is empty." }
    $baseWidth = $maxX - $minX + 1; $baseHeight = $maxY - $minY + 1
    $scale = [Math]::Min(($Width - $Padding * 2.0) / $baseWidth,($Height - $Padding * 2.0) / $baseHeight)
    $targetBaseWidth = [int][Math]::Round($baseWidth * $scale)
    $targetBaseHeight = [int][Math]::Round($baseHeight * $scale)
    $targetBaseX = [int](($Width - $targetBaseWidth) / 2)
    $targetBaseY = $Height - $Padding - $targetBaseHeight
    $drawX = [int][Math]::Round($targetBaseX - $minX * $scale)
    $drawY = [int][Math]::Round($targetBaseY - $minY * $scale)
    $drawWidth = [int][Math]::Round($thisWidth * $scale)
    $drawHeight = [int][Math]::Round($base.Height * $scale)

    $parts = $views[$index].Split('-')
    $bodyDirectory = Join-Path $OutputDirectory $parts[0]
    New-Item -ItemType Directory -Force -Path $bodyDirectory | Out-Null
    $outputPath = Join-Path $bodyDirectory ($parts[1] + '.png')
    $target = New-Object System.Drawing.Bitmap($Width,$Height,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($target)
      try {
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $destination = New-Object System.Drawing.Rectangle($drawX,$drawY,$drawWidth,$drawHeight)
        $source = New-Object System.Drawing.Rectangle($left,0,$thisWidth,$overlay.Height)
        $graphics.DrawImage($overlay,$destination,$source,[System.Drawing.GraphicsUnit]::Pixel)
      } finally { $graphics.Dispose() }
      $target.Save($outputPath,[System.Drawing.Imaging.ImageFormat]::Png)
      Write-Output "Wrote aligned weapon overlay: $outputPath"
    } finally { $target.Dispose() }
  }
} finally {
  $base.Dispose()
  $overlay.Dispose()
}
