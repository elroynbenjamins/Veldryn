param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath,
  [ValidateSet('green', 'magenta', 'checker')][string]$Mode = 'green',
  [switch]$PreserveGreenEquipment
)

Add-Type -AssemblyName System.Drawing

if (-not ('Veldryn.ImageMatte' -as [type])) {
  $runtimeAssemblies = ([AppContext]::GetData('TRUSTED_PLATFORM_ASSEMBLIES') -split [IO.Path]::PathSeparator)
  Add-Type -ReferencedAssemblies $runtimeAssemblies -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

namespace Veldryn {
  public static class ImageMatte {
    private static bool Matches(byte b, byte g, byte r, int mode) {
      if (mode == 1) return g > 40 && g > r * 1.25 && g > b * 1.25;
      if (mode == 2) return r > 40 && b > 40 && r > g * 1.25 && b > g * 1.25;
      int max = Math.Max(r, Math.Max(g, b));
      int min = Math.Min(r, Math.Min(g, b));
      // Image generators use several pale neutral values for baked checkerboards.
      // Keep this as an edge-connected flood fill so pale equipment highlights
      // remain intact while both checker tones and their soft joins are removed.
      // Some exports bake a medium-gray checker instead of a pale one. The
      // flood fill still starts only at the canvas edge, so accepting neutral
      // grays here does not clear enclosed steel highlights inside equipment.
      return min > 100 && max - min < 22;
    }

    public static void Remove(string input, string output, int mode, bool preserveGreenEquipment) {
      using (var source = new Bitmap(input))
      using (var bitmap = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb)) {
        using (var graphics = Graphics.FromImage(bitmap)) {
          graphics.DrawImageUnscaled(source, 0, 0);
        }

        var rect = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
        var data = bitmap.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        int length = Math.Abs(data.Stride) * bitmap.Height;
        var pixels = new byte[length];
        Marshal.Copy(data.Scan0, pixels, 0, length);

        int count = bitmap.Width * bitmap.Height;
        var clear = new bool[count];
        var queue = new int[count];
        int head = 0, tail = 0;

        Action<int, int> seed = (x, y) => {
          int logical = y * bitmap.Width + x;
          if (clear[logical]) return;
          int offset = y * data.Stride + x * 4;
          if (!Matches(pixels[offset], pixels[offset + 1], pixels[offset + 2], mode)) return;
          clear[logical] = true;
          queue[tail++] = logical;
        };

        for (int x = 0; x < bitmap.Width; x++) { seed(x, 0); seed(x, bitmap.Height - 1); }
        for (int y = 1; y < bitmap.Height - 1; y++) { seed(0, y); seed(bitmap.Width - 1, y); }

        while (head < tail) {
          int logical = queue[head++];
          int x = logical % bitmap.Width, y = logical / bitmap.Width;
          if (x > 0) seed(x - 1, y);
          if (x + 1 < bitmap.Width) seed(x + 1, y);
          if (y > 0) seed(x, y - 1);
          if (y + 1 < bitmap.Height) seed(x, y + 1);
        }

        // Arm gaps and ring centers can enclose checkerboard regions that do
        // not connect to the canvas edge. Remove only large neutral connected
        // components; small steel highlights remain untouched.
        if (mode == 0) {
          var visited = new bool[count];
          var component = new int[count];
          for (int start = 0; start < count; start++) {
            if (clear[start] || visited[start]) continue;
            int sx = start % bitmap.Width, sy = start / bitmap.Width;
            int so = sy * data.Stride + sx * 4;
            if (!Matches(pixels[so], pixels[so + 1], pixels[so + 2], mode)) continue;

            int componentCount = 0;
            head = 0; tail = 0;
            visited[start] = true;
            queue[tail++] = start;
            while (head < tail) {
              int logical = queue[head++];
              component[componentCount++] = logical;
              int x = logical % bitmap.Width, y = logical / bitmap.Width;
              Action<int> enqueue = candidate => {
                if (candidate < 0 || candidate >= count || clear[candidate] || visited[candidate]) return;
                int cx = candidate % bitmap.Width, cy = candidate / bitmap.Width;
                int offset = cy * data.Stride + cx * 4;
                if (!Matches(pixels[offset], pixels[offset + 1], pixels[offset + 2], mode)) return;
                visited[candidate] = true;
                queue[tail++] = candidate;
              };
              if (x > 0) enqueue(logical - 1);
              if (x + 1 < bitmap.Width) enqueue(logical + 1);
              if (y > 0) enqueue(logical - bitmap.Width);
              if (y + 1 < bitmap.Height) enqueue(logical + bitmap.Width);
            }
            if (componentCount >= 64) {
              for (int i = 0; i < componentCount; i++) clear[component[i]] = true;
            }
          }
        }

        // Green-themed sets need their leaf/earth palette preserved. Seed the
        // two enclosed accessory holes instead of globally keying green hues.
        if (mode == 1 && preserveGreenEquipment) {
          seed((int)(bitmap.Width * 0.70), (int)(bitmap.Height * 0.65));
          seed((int)(bitmap.Width * 0.90), (int)(bitmap.Height * 0.70));
          while (head < tail) {
            int logical = queue[head++];
            int x = logical % bitmap.Width, y = logical / bitmap.Width;
            if (x > 0) seed(x - 1, y);
            if (x + 1 < bitmap.Width) seed(x + 1, y);
            if (y > 0) seed(x, y - 1);
            if (y + 1 < bitmap.Height) seed(x, y + 1);
          }
        }

        for (int logical = 0; logical < count; logical++) {
          int x = logical % bitmap.Width, y = logical / bitmap.Width;
          int offset = y * data.Stride + x * 4;
          byte b = pixels[offset], g = pixels[offset + 1], r = pixels[offset + 2];
          bool enclosedGreen = mode > 0 && !preserveGreenEquipment && Matches(b, g, r, mode);
          if (!clear[logical] && !enclosedGreen) continue;
          pixels[offset] = 0;
          pixels[offset + 1] = 0;
          pixels[offset + 2] = 0;
          pixels[offset + 3] = 0;
        }

        Marshal.Copy(pixels, 0, data.Scan0, length);
        bitmap.UnlockBits(data);
        bitmap.Save(output, ImageFormat.Png);
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
$modeValue = if ($Mode -eq 'green') { 1 } elseif ($Mode -eq 'magenta') { 2 } else { 0 }
[Veldryn.ImageMatte]::Remove($inputResolved, $OutputPath, $modeValue, $PreserveGreenEquipment.IsPresent)

$result = [System.Drawing.Bitmap]::FromFile($OutputPath)
try {
  $cornerAlpha = $result.GetPixel(0, 0).A
  Write-Output ("Wrote {0}x{1} RGBA PNG; corner alpha={2}: {3}" -f $result.Width, $result.Height, $cornerAlpha, $OutputPath)
} finally {
  $result.Dispose()
}
