Add-Type -AssemblyName System.Drawing

# Crop a close-up out of a full-body persona so colour analysis has a face big
# enough to read. Same person, no regeneration, so the demo stays consistent.
$jobs = @(
  @{ src = "D:\Contra\15-youcam-hackathon\spike\out\person-b.jpg"; out = "D:\Contra\15-youcam-hackathon\spike\out\selfie-b.jpg" },
  @{ src = "D:\Contra\15-youcam-hackathon\spike\out\person-a.jpg"; out = "D:\Contra\15-youcam-hackathon\spike\out\selfie-a-crop.jpg" }
)

foreach ($j in $jobs) {
  $img = [System.Drawing.Image]::FromFile($j.src)
  # Head sits in the top third, horizontally centred. Take a square slightly
  # wider than tall so the face fills the frame without clipping the chin.
  $side = [int]($img.Width * 0.42)
  $x = [int](($img.Width - $side) / 2)
  $y = [int]($img.Height * 0.055)
  if ($y + $side -gt $img.Height) { $side = $img.Height - $y }

  $bmp = New-Object System.Drawing.Bitmap($side, $side)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $side, $side)), (New-Object System.Drawing.Rectangle($x, $y, $side, $side)), [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()

  $enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $ps = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $ps.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]94)
  $bmp.Save($j.out, $enc, $ps)
  $ps.Dispose(); $bmp.Dispose(); $img.Dispose()
  "wrote {0}  {1}x{1}" -f (Split-Path $j.out -Leaf), $side
}
