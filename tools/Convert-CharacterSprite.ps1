param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath,
  [int]$Width = 128,
  [int]$Height = 160,
  [int]$Padding = 4
)

Add-Type -AssemblyName System.Drawing
if (-not ('Veldryn.CharacterSprite' -as [type])) {
  $runtimeAssemblies = ([AppContext]::GetData('TRUSTED_PLATFORM_ASSEMBLIES') -split [IO.Path]::PathSeparator)
  Add-Type -ReferencedAssemblies $runtimeAssemblies -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

namespace Veldryn {
  public static class CharacterSprite {
    public static void Convert(string input, string output, int width, int height, int padding) {
      using (var source = new Bitmap(input)) {
        var rect = new Rectangle(0, 0, source.Width, source.Height);
        var data = source.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        int length = Math.Abs(data.Stride) * source.Height;
        var pixels = new byte[length];
        Marshal.Copy(data.Scan0, pixels, 0, length);
        source.UnlockBits(data);

        int minX = source.Width, minY = source.Height, maxX = -1, maxY = -1;
        for (int y = 0; y < source.Height; y++) for (int x = 0; x < source.Width; x++) {
          if (pixels[y * data.Stride + x * 4 + 3] == 0) continue;
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
        if (maxX < minX || maxY < minY) throw new InvalidOperationException("Sprite contains no opaque pixels.");

        int sourceWidth = maxX - minX + 1, sourceHeight = maxY - minY + 1;
        double scale = Math.Min((width - padding * 2.0) / sourceWidth, (height - padding * 2.0) / sourceHeight);
        int targetWidth = Math.Max(1, (int)Math.Round(sourceWidth * scale));
        int targetHeight = Math.Max(1, (int)Math.Round(sourceHeight * scale));
        int targetX = (width - targetWidth) / 2;
        int targetY = height - padding - targetHeight;

        using (var target = new Bitmap(width, height, PixelFormat.Format32bppArgb))
        using (var graphics = Graphics.FromImage(target)) {
          graphics.CompositingMode = CompositingMode.SourceCopy;
          graphics.CompositingQuality = CompositingQuality.HighSpeed;
          graphics.InterpolationMode = InterpolationMode.NearestNeighbor;
          graphics.PixelOffsetMode = PixelOffsetMode.Half;
          graphics.SmoothingMode = SmoothingMode.None;
          graphics.Clear(Color.Transparent);
          graphics.DrawImage(source, new Rectangle(targetX, targetY, targetWidth, targetHeight), new Rectangle(minX, minY, sourceWidth, sourceHeight), GraphicsUnit.Pixel);
          target.Save(output, ImageFormat.Png);
        }
      }
    }
  }
}
'@
}

$inputResolved = (Resolve-Path -LiteralPath $InputPath).Path
$outputDirectory = Split-Path -Parent $OutputPath
if (-not (Test-Path -LiteralPath $outputDirectory)) {
  New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}
[Veldryn.CharacterSprite]::Convert($inputResolved, $OutputPath, $Width, $Height, $Padding)

$result = [System.Drawing.Bitmap]::FromFile($OutputPath)
try {
  Write-Output ("Wrote {0}x{1} sprite; corner alpha={2}: {3}" -f $result.Width, $result.Height, $result.GetPixel(0, 0).A, $OutputPath)
} finally {
  $result.Dispose()
}
