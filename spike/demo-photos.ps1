Add-Type -AssemblyName System.Drawing

# Demo subject for the "use the demo person" button. Same generated man, two
# crops, downscaled so the browser does not upload 1.9MB per try-on demo.
$jobs = @(
  @{ src = "D:\Contra\15-youcam-hackathon\spike\out\person-b.jpg"; out = "D:\Contra\15-youcam-hackathon\public\demo\body.jpg"; max = 1024 },
  @{ src = "D:\Contra\15-youcam-hackathon\spike\out\selfie-b.jpg"; out = "D:\Contra\15-youcam-hackathon\public\demo\selfie.jpg"; max = 768 }
)

New-Item -ItemType Directory -Force -Path "D:\Contra\15-youcam-hackathon\public\demo" | Out-Null
$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }

foreach ($j in $jobs) {
  $img = [System.Drawing.Image]::FromFile($j.src)
  $scale = [Math]::Min(1.0, $j.max / [Math]::Max($img.Width, $img.Height))
  $w = [int]($img.Width * $scale); $h = [int]($img.Height * $scale)

  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img, 0, 0, $w, $h)
  $g.Dispose()

  $ps = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $ps.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]90)
  $bmp.Save($j.out, $enc, $ps)
  $ps.Dispose(); $bmp.Dispose(); $img.Dispose()
  "{0} {1}x{2} {3}KB" -f (Split-Path $j.out -Leaf), $w, $h, [int]((Get-Item $j.out).Length / 1KB)
}
