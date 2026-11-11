param(
    [Parameter(Mandatory = $true)] [string] $InputDirectory,
    [Parameter(Mandatory = $true)] [string] $OutputDirectory,
    [int] $CellSize = 384,
    [double] $SafeFraction = 0.74,
    [switch] $FailOnSourceEdge
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$source = @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class EquipmentAtlasNormalizer
{
    private sealed class Component
    {
        public readonly List<int> Pixels = new List<int>();
        public int MinX = int.MaxValue, MinY = int.MaxValue, MaxX = -1, MaxY = -1;
        public int Area { get { return Pixels.Count; } }
    }

    public static string Normalize(string inputPath, string outputPath, int cellSize, double safeFraction)
    {
        using (var source = new Bitmap(inputPath))
        using (var output = new Bitmap(cellSize * 5, cellSize * 2, PixelFormat.Format32bppArgb))
        using (var graphics = Graphics.FromImage(output))
        {
            graphics.Clear(Color.Transparent);
            graphics.CompositingMode = CompositingMode.SourceCopy;
            graphics.CompositingQuality = CompositingQuality.HighQuality;
            graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
            graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
            graphics.SmoothingMode = SmoothingMode.HighQuality;

            var warnings = new List<string>();
            for (var row = 0; row < 2; row++)
            for (var col = 0; col < 5; col++)
            {
                var x0 = (int)Math.Round(col * source.Width / 5.0);
                var x1 = (int)Math.Round((col + 1) * source.Width / 5.0);
                var y0 = (int)Math.Round(row * source.Height / 2.0);
                var y1 = (int)Math.Round((row + 1) * source.Height / 2.0);
                var crop = new Rectangle(x0, y0, x1 - x0, y1 - y0);

                using (var isolated = Isolate(source, crop, warnings, row * 5 + col))
                {
                    var bounds = AlphaBounds(isolated);
                    if (bounds.Width == 0 || bounds.Height == 0)
                    {
                        warnings.Add("cell " + (row * 5 + col) + " is empty");
                        continue;
                    }

                    var safe = (int)Math.Floor(cellSize * safeFraction);
                    var scale = Math.Min(safe / (double)bounds.Width, safe / (double)bounds.Height);
                    var width = Math.Max(1, (int)Math.Round(bounds.Width * scale));
                    var height = Math.Max(1, (int)Math.Round(bounds.Height * scale));
                    var dx = col * cellSize + (cellSize - width) / 2;
                    var dy = row * cellSize + (cellSize - height) / 2;
                    graphics.DrawImage(isolated, new Rectangle(dx, dy, width, height), bounds, GraphicsUnit.Pixel);
                }
            }

            Directory.CreateDirectory(Path.GetDirectoryName(outputPath));
            output.Save(outputPath, ImageFormat.Png);
            return String.Join("; ", warnings.ToArray());
        }
    }

    private static Bitmap Isolate(Bitmap source, Rectangle crop, List<string> warnings, int cellIndex)
    {
        var cell = new Bitmap(crop.Width, crop.Height, PixelFormat.Format32bppArgb);
        using (var g = Graphics.FromImage(cell))
        {
            g.CompositingMode = CompositingMode.SourceCopy;
            g.DrawImage(source, new Rectangle(0, 0, crop.Width, crop.Height), crop, GraphicsUnit.Pixel);
        }

        var rect = new Rectangle(0, 0, cell.Width, cell.Height);
        var data = cell.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        var bytes = Math.Abs(data.Stride) * cell.Height;
        var pixels = new byte[bytes];
        Marshal.Copy(data.Scan0, pixels, 0, bytes);

        var present = new bool[cell.Width * cell.Height];
        for (var y = 0; y < cell.Height; y++)
        for (var x = 0; x < cell.Width; x++)
            present[y * cell.Width + x] = pixels[y * data.Stride + x * 4 + 3] >= 24;

        var seen = new bool[present.Length];
        var components = new List<Component>();
        var queue = new Queue<int>();
        for (var i = 0; i < present.Length; i++)
        {
            if (!present[i] || seen[i]) continue;
            var component = new Component();
            seen[i] = true;
            queue.Enqueue(i);
            while (queue.Count > 0)
            {
                var p = queue.Dequeue();
                component.Pixels.Add(p);
                var x = p % cell.Width;
                var y = p / cell.Width;
                component.MinX = Math.Min(component.MinX, x); component.MaxX = Math.Max(component.MaxX, x);
                component.MinY = Math.Min(component.MinY, y); component.MaxY = Math.Max(component.MaxY, y);
                if (x > 0) Visit(p - 1, present, seen, queue);
                if (x + 1 < cell.Width) Visit(p + 1, present, seen, queue);
                if (y > 0) Visit(p - cell.Width, present, seen, queue);
                if (y + 1 < cell.Height) Visit(p + cell.Width, present, seen, queue);
            }
            components.Add(component);
        }

        components.Sort((a, b) => b.Area.CompareTo(a.Area));
        var largest = components.Count == 0 ? 0 : components[0].Area;
        var keep = new bool[present.Length];
        var kept = 0;
        foreach (var component in components)
        {
            if (kept >= 4 || component.Area < Math.Max(32, largest * 0.08)) continue;
            foreach (var p in component.Pixels) keep[p] = true;
            kept++;
            if (component.MinX == 0 || component.MinY == 0 || component.MaxX == cell.Width - 1 || component.MaxY == cell.Height - 1)
                warnings.Add("cell " + cellIndex + " source artwork touches a source-cell edge");
        }

        for (var y = 0; y < cell.Height; y++)
        for (var x = 0; x < cell.Width; x++)
        {
            var offset = y * data.Stride + x * 4;
            if (!keep[y * cell.Width + x])
            {
                pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = pixels[offset + 3] = 0;
            }
        }
        Marshal.Copy(pixels, 0, data.Scan0, bytes);
        cell.UnlockBits(data);
        return cell;
    }

    private static void Visit(int index, bool[] present, bool[] seen, Queue<int> queue)
    {
        if (!present[index] || seen[index]) return;
        seen[index] = true;
        queue.Enqueue(index);
    }

    private static Rectangle AlphaBounds(Bitmap bitmap)
    {
        var minX = bitmap.Width;
        var minY = bitmap.Height;
        var maxX = -1;
        var maxY = -1;
        var rect = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
        var data = bitmap.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        var bytes = Math.Abs(data.Stride) * bitmap.Height;
        var pixels = new byte[bytes];
        Marshal.Copy(data.Scan0, pixels, 0, bytes);
        bitmap.UnlockBits(data);
        for (var y = 0; y < bitmap.Height; y++)
        for (var x = 0; x < bitmap.Width; x++)
        {
            if (pixels[y * data.Stride + x * 4 + 3] < 24) continue;
            minX = Math.Min(minX, x); maxX = Math.Max(maxX, x);
            minY = Math.Min(minY, y); maxY = Math.Max(maxY, y);
        }
        return maxX < minX ? Rectangle.Empty : Rectangle.FromLTRB(minX, minY, maxX + 1, maxY + 1);
    }
}
'@

$references = [AppDomain]::CurrentDomain.GetAssemblies() |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_.Location) } |
    Select-Object -ExpandProperty Location -Unique
Add-Type -TypeDefinition $source -ReferencedAssemblies $references
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null

$files = Get-ChildItem -LiteralPath $InputDirectory -Filter '*.png' |
    Where-Object { $_.Name -notmatch 'reject' }

$rejected = 0
foreach ($file in $files) {
    $output = Join-Path $OutputDirectory $file.Name
    $warnings = [EquipmentAtlasNormalizer]::Normalize($file.FullName, $output, $CellSize, $SafeFraction)
    if ($FailOnSourceEdge -and $warnings -match 'source artwork touches a source-cell edge') {
        Remove-Item -LiteralPath $output -Force
        $rejected++
        Write-Warning "REJECTED $($file.Name): $warnings"
    }
    elseif ($warnings) { Write-Warning "$($file.Name): $warnings" }
    else { Write-Host "OK $($file.Name)" }
}

if ($rejected -gt 0) {
    throw "$rejected atlas sheet(s) were rejected because source artwork touched a source-cell edge. Regenerate them before review."
}
