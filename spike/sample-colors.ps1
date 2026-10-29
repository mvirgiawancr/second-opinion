Add-Type -AssemblyName System.Drawing

# Dominant garment colour, sampled from the centre of the frame. The studio
# backdrop has a vignette, so "everything that isn't light grey" pulled the
# mid-grey background into the average (a black coat sampled as #656c6e).
# The garment is always centred, so a centre box is the reliable sample.
Get-ChildItem "D:\Contra\15-youcam-hackathon\public\catalog\*.jpg" | ForEach-Object {
  $img = [System.Drawing.Image]::FromFile($_.FullName)
  $w = 200; $h = 200
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($img, 0, 0, $w, $h)
  $g.Dispose(); $img.Dispose()

  $x0 = [int]($w * 0.38); $x1 = [int]($w * 0.62)
  $y0 = [int]($h * 0.38); $y1 = [int]($h * 0.62)

  $rs = 0.0; $gs = 0.0; $bs = 0.0; $n = 0
  for ($y = $y0; $y -lt $y1; $y++) {
    for ($x = $x0; $x -lt $x1; $x++) {
      $p = $bmp.GetPixel($x, $y)
      $rs += $p.R; $gs += $p.G; $bs += $p.B; $n++
    }
  }
  $bmp.Dispose()
  $r = [int]($rs / $n); $gg = [int]($gs / $n); $b = [int]($bs / $n)
  "{0,-18} #{1:x2}{2:x2}{3:x2}" -f $_.BaseName, $r, $gg, $b
}
