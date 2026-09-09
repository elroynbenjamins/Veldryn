param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$ReviewDirectory,
  [Parameter(Mandatory = $true)][string]$OutputDirectory,
  [ValidateSet('green', 'magenta', 'checker')][string]$MatteMode = 'magenta'
)

$removeMatte = Join-Path $PSScriptRoot 'Remove-EquipmentMatte.ps1'
$convertSprite = Join-Path $PSScriptRoot 'Convert-CharacterSprite.ps1'
$resolvedInput = (Resolve-Path -LiteralPath $InputPath).Path
New-Item -ItemType Directory -Force -Path $ReviewDirectory,$OutputDirectory | Out-Null

$cleanMaster = Join-Path $ReviewDirectory 'character-master-clean.png'
& $removeMatte -InputPath $resolvedInput -OutputPath $cleanMaster -Mode $MatteMode

Add-Type -AssemblyName System.Drawing
$source = [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $cleanMaster).Path)
try {
  $panelWidth = [int][Math]::Floor($source.Width / 4)
  $views = @('male-front','male-back','female-front','female-back')
  for ($index = 0; $index -lt $views.Count; $index++) {
    $panelPath = Join-Path $ReviewDirectory ($views[$index] + '-clean.png')
    $left = $index * $panelWidth
    $thisWidth = if ($index -eq 3) { $source.Width - $left } else { $panelWidth }
    $panel = New-Object System.Drawing.Bitmap($thisWidth,$source.Height,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($panel)
      try {
        $sourceRect = New-Object System.Drawing.Rectangle($left,0,$thisWidth,$source.Height)
        $destinationRect = New-Object System.Drawing.Rectangle(0,0,$thisWidth,$source.Height)
        $graphics.DrawImage($source,$destinationRect,$sourceRect,[System.Drawing.GraphicsUnit]::Pixel)
      } finally { $graphics.Dispose() }
      $panel.Save($panelPath,[System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $panel.Dispose() }

    $parts = $views[$index].Split('-')
    $bodyDirectory = Join-Path $OutputDirectory $parts[0]
    New-Item -ItemType Directory -Force -Path $bodyDirectory | Out-Null
    & $convertSprite -InputPath $panelPath -OutputPath (Join-Path $bodyDirectory ($parts[1] + '.png'))
  }
} finally { $source.Dispose() }
