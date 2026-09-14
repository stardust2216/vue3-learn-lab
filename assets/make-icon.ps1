# 生成学习站快捷方式图标：圆角方块（青绿→蓝渐变）+ 白色 </> 符号
# 输出：assets\learning-lab.ico
#
# 实现要点（踩过坑后的写法）：
#   - 每个尺寸**直接按尺寸绘制**，不做「大图缩放 + 手工取像素」，少两道易错工序
#   - ICO 条目用 PNG 压缩格式（Windows Vista 起原生支持），无需手写 BITMAPINFOHEADER 与 AND 掩码
# 需要时重跑：pwsh -File assets\make-icon.ps1
Add-Type -AssemblyName System.Drawing

$out = Join-Path $PSScriptRoot 'learning-lab.ico'
$sizes = @(16, 24, 32, 48, 64, 128, 256)

<#
  注意：Graphics.DrawLines 的重载只接受**强类型** PointF[]。
  PowerShell 的 @(...) 会生成 Object[]，直接传会报
  「无法将参数 points 转换为类型 System.Object[]」而静默失败（这正是本脚本最初画不出 </> 的原因）。
  所以这里统一用 New-Object 'System.Drawing.PointF[]' 建强类型数组。
#>
function New-PointArray {
  param([object[]]$Pairs)
  $arr = New-Object 'System.Drawing.PointF[]' ($Pairs.Count / 2)
  for ($i = 0; $i -lt $Pairs.Count; $i += 2) {
    $arr[$i / 2] = New-Object System.Drawing.PointF([single]$Pairs[$i], [single]$Pairs[$i + 1])
  }
  return , $arr
}

function New-IconPng {
  param([int]$Size)

  $bmp = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)

  $pad = [single]($Size * 0.055)
  $r = [single]($Size * 0.22)
  $rect = New-Object System.Drawing.RectangleF($pad, $pad, ($Size - 2 * $pad), ($Size - 2 * $pad))

  # 圆角矩形
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
  $path.AddArc(($rect.Right - $d), $rect.Y, $d, $d, 270, 90)
  $path.AddArc(($rect.Right - $d), ($rect.Bottom - $d), $d, $d, 0, 90)
  $path.AddArc($rect.X, ($rect.Bottom - $d), $d, $d, 90, 90)
  $path.CloseFigure()

  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [System.Drawing.Color]::FromArgb(255, 66, 184, 131),
    [System.Drawing.Color]::FromArgb(255, 59, 130, 246),
    [single]45.0)
  $g.FillPath($brush, $path)

  # 白色「毕业帽」（学习站意象）。用实心填充而不是细线条 ——
  # 实测细线条在小尺寸下会糊成一坨，实心几何形状在 16px 依然清楚。
  $cx = [single]($Size / 2.0)
  $cy = [single]($Size * 0.47)
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

  # 帽顶：菱形（四点）
  $board = New-PointArray @(
    $cx, ($cy - $Size * 0.200),
    ($cx + $Size * 0.265), $cy,
    $cx, ($cy + $Size * 0.200),
    ($cx - $Size * 0.265), $cy
  )
  $g.FillPolygon($white, $board)

  # 帽身：从帽顶下方收窄的梯形
  $bodyTop = [single]($cy - $Size * 0.005)
  $bodyBottom = [single]($cy + $Size * 0.205)
  $body = New-PointArray @(
    ($cx - $Size * 0.140), $bodyTop,
    ($cx + $Size * 0.140), $bodyTop,
    ($cx + $Size * 0.115), $bodyBottom,
    ($cx - $Size * 0.115), $bodyBottom
  )
  $g.FillPolygon($white, $body)

  # 流苏：从帽顶右侧垂下的细线 + 末端小圆
  $penW = [single]($Size * 0.030)
  $tassel = New-Object System.Drawing.Pen([System.Drawing.Color]::White, $penW)
  $tassel.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $tassel.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $tx = [single]($cx + $Size * 0.195)
  $ty = [single]($cy + $Size * 0.085)
  $g.DrawLine($tassel, $tx, $ty, $tx, [single]($cy + $Size * 0.295))
  $g.FillEllipse($white,
    [single]($tx - $Size * 0.044), [single]($cy + $Size * 0.295 - $Size * 0.044),
    [single]($Size * 0.088), [single]($Size * 0.088))
  $tassel.Dispose()
  $white.Dispose()

  $brush.Dispose(); $path.Dispose(); $g.Dispose()

  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $bytes = $ms.ToArray()
  $ms.Dispose(); $bmp.Dispose()
  return , $bytes
}

$entries = @()
foreach ($size in $sizes) {
  $png = New-IconPng -Size $size
  $entries += [pscustomobject]@{ Size = $size; Bytes = $png }
}

$fs = [System.IO.File]::Create($out)
$bw = New-Object System.IO.BinaryWriter($fs)
$bw.Write([uint16]0)                     # reserved
$bw.Write([uint16]1)                     # type = icon
$bw.Write([uint16]$entries.Count)
$offset = 6 + 16 * $entries.Count
foreach ($e in $entries) {
  $dim = if ($e.Size -ge 256) { 0 } else { $e.Size }
  $bw.Write([byte]$dim); $bw.Write([byte]$dim)
  $bw.Write([byte]0); $bw.Write([byte]0) # 调色板数 / reserved
  $bw.Write([uint16]1); $bw.Write([uint16]32)
  $bw.Write([uint32]$e.Bytes.Length)
  $bw.Write([uint32]$offset)
  $offset += $e.Bytes.Length
}
foreach ($e in $entries) { $bw.Write($e.Bytes) }
$bw.Flush(); $bw.Dispose(); $fs.Dispose()

$fi = Get-Item $out
Write-Host ("icon written: {0} ({1} bytes, {2} sizes, PNG entries)" -f $fi.FullName, $fi.Length, $entries.Count)
foreach ($e in $entries) { Write-Host ("  {0,3}px -> {1,6} bytes" -f $e.Size, $e.Bytes.Length) }
