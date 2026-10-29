Add-Type -AssemblyName System.Drawing
$src = "D:\Contra\15-youcam-hackathon\spike\photo.JPG"
$img = [System.Drawing.Image]::FromFile($src)

function Resize-To($img, $maxSide, $outPath, $quality) {
  $scale = [Math]::Min(1.0, $maxSide / [Math]::Max($img.Width, $img.Height))
  $w = [int]($img.Width * $scale)
  $h = [int]($img.Height * $scale)
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.DrawImage($img, 0, 0, $w, $h)
  $g.Dispose()
  $enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $ps = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $ps.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$quality)
  $bmp.Save($outPath, $enc, $ps)
  $ps.Dispose(); $bmp.Dispose()
  "wrote $outPath  ${w}x${h}  $([Math]::Round((Get-Item $outPath).Length / 1MB, 2)) MB"
}

Resize-To $img 4096 "D:\Contra\15-youcam-hackathon\spike\photo-4096.jpg" 92
Resize-To $img 1000 "D:\Contra\15-youcam-hackathon\spike\photo-preview.jpg" 80
$img.Dispose()
