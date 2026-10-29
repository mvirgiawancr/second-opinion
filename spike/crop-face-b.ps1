Add-Type -AssemblyName System.Drawing

# Tighter head-and-shoulders crop. The first attempt (0.42 of width) was still
# too wide for skin-tone-analysis, which wants the face to dominate the frame.
$src = "D:\Contra\15-youcam-hackathon\spike\out\person-b.jpg"
$out = "D:\Contra\15-youcam-hackathon\spike\out\selfie-b.jpg"

$img = [System.Drawing.Image]::FromFile($src)
$side = [int]($img.Width * 0.26)
$x = [int]($img.Width * 0.5 - $side / 2)
$y = [int]($img.Height * 0.045)

# Upscale to a comfortable analysis size. The crop is ~287px and the API
# rejects anything under 512 on the long side.
$target = 1024
$bmp = New-Object System.Drawing.Bitmap($target, $target)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $target, $target)), (New-Object System.Drawing.Rectangle($x, $y, $side, $side)), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ps = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ps.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]95)
$bmp.Save($out, $enc, $ps)
$ps.Dispose(); $bmp.Dispose(); $img.Dispose()
"wrote $out ${side}x${side}"
