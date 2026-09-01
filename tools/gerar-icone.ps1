$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$raiz = Split-Path -Parent $PSScriptRoot
$destino = Join-Path $raiz "assets\peopleflow.ico"
New-Item -ItemType Directory -Force (Split-Path -Parent $destino) | Out-Null

$tamanhos = @(16, 24, 32, 48, 64, 128, 256)

function New-Arredondado([single]$x, [single]$y, [single]$lado, [single]$raio) {
    $caminho = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = [single]([Math]::Min($raio * 2, $lado))
    $caminho.AddArc($x, $y, $d, $d, 180, 90)
    $caminho.AddArc($x + $lado - $d, $y, $d, $d, 270, 90)
    $caminho.AddArc($x + $lado - $d, $y + $lado - $d, $d, $d, 0, 90)
    $caminho.AddArc($x, $y + $lado - $d, $d, $d, 90, 90)
    $caminho.CloseFigure()
    return $caminho
}

function New-Pessoa([single]$cx, [single]$topo, [single]$escala) {
    $caminho = New-Object System.Drawing.Drawing2D.GraphicsPath
    $raioCabeca = 5.5 * $escala
    $caminho.AddEllipse($cx - $raioCabeca, $topo, $raioCabeca * 2, $raioCabeca * 2)
    $larguraCorpo = 22 * $escala
    $alturaCorpo = 22 * $escala
    $yCorpo = $topo + $raioCabeca * 2 + 2 * $escala
    $caminho.AddPie($cx - $larguraCorpo / 2, $yCorpo, $larguraCorpo, $alturaCorpo, 180, 180)
    return $caminho
}

function New-Quadro([int]$tam) {
    $bmp = New-Object System.Drawing.Bitmap($tam, $tam, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $u = [single]($tam / 64.0)
    $fundo = New-Arredondado 0 0 ([single]$tam) ([single](16 * $u))
    $area = New-Object System.Drawing.RectangleF(0, 0, $tam, $tam)
    $pincel = New-Object System.Drawing.Drawing2D.LinearGradientBrush($area, [System.Drawing.Color]::Black, [System.Drawing.Color]::White, 45.0)
    $mistura = New-Object System.Drawing.Drawing2D.ColorBlend(3)
    $mistura.Colors = @(
        [System.Drawing.Color]::FromArgb(255, 15, 118, 110),
        [System.Drawing.Color]::FromArgb(255, 13, 148, 136),
        [System.Drawing.Color]::FromArgb(255, 45, 212, 191)
    )
    $mistura.Positions = @([single]0.0, [single]0.55, [single]1.0)
    $pincel.InterpolationColors = $mistura
    $g.FillPath($pincel, $fundo)

    $branco = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $translucido = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(130, 255, 255, 255))

    $atras = New-Pessoa ([single](41 * $u)) ([single](15 * $u)) ([single](0.85 * $u))
    $g.FillPath($translucido, $atras)
    $frente = New-Pessoa ([single](26 * $u)) ([single](13 * $u)) ([single]($u))
    $g.FillPath($branco, $frente)

    $g.Dispose()
    $pincel.Dispose()
    $branco.Dispose()
    $translucido.Dispose()
    $fundo.Dispose()
    $atras.Dispose()
    $frente.Dispose()
    return $bmp
}

$imagens = @()
foreach ($t in $tamanhos) {
    $bmp = New-Quadro $t
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $imagens += , @{ Tamanho = $t; Bytes = $ms.ToArray() }
    $ms.Dispose()
    $bmp.Dispose()
}

$saida = New-Object System.IO.MemoryStream
$escritor = New-Object System.IO.BinaryWriter($saida)
$escritor.Write([uint16]0)
$escritor.Write([uint16]1)
$escritor.Write([uint16]$imagens.Count)

$deslocamento = 6 + 16 * $imagens.Count
foreach ($img in $imagens) {
    $lado = if ($img.Tamanho -ge 256) { 0 } else { $img.Tamanho }
    $escritor.Write([byte]$lado)
    $escritor.Write([byte]$lado)
    $escritor.Write([byte]0)
    $escritor.Write([byte]0)
    $escritor.Write([uint16]1)
    $escritor.Write([uint16]32)
    $escritor.Write([uint32]$img.Bytes.Length)
    $escritor.Write([uint32]$deslocamento)
    $deslocamento += $img.Bytes.Length
}
foreach ($img in $imagens) {
    $escritor.Write($img.Bytes)
}
$escritor.Flush()

[System.IO.File]::WriteAllBytes($destino, $saida.ToArray())
$escritor.Dispose()
$saida.Dispose()

Write-Host ("Icone gerado: {0} ({1} bytes)" -f $destino, (Get-Item $destino).Length)
