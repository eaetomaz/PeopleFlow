param(
    [switch]$NoShortcut,
    [switch]$SkipFrontend
)

$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$frontend = Join-Path $root "frontend"
$projeto = Join-Path $root "backend\PeopleFlow.Desktop\PeopleFlow.Desktop.csproj"
$release = Join-Path $root "release\PeopleFlow"
$exe = Join-Path $release "PeopleFlow.exe"

function Write-Etapa([string]$texto) {
    Write-Host ""
    Write-Host "==> $texto" -ForegroundColor Cyan
}

. (Join-Path $root "tools\ferramentas.ps1")

function Invoke-Passo([string]$descricao, [scriptblock]$bloco) {
    & $bloco
    if ($LASTEXITCODE -ne 0) {
        throw "Falhou: $descricao (codigo $LASTEXITCODE)"
    }
}

Write-Etapa "Preparando as ferramentas (instala sozinho o que faltar)"
Initialize-Ferramentas (-not $SkipFrontend)

Write-Etapa "Fechando o PeopleFlow se estiver aberto"
$abertos = Get-Process -Name "PeopleFlow" -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path.StartsWith($release, [System.StringComparison]::OrdinalIgnoreCase) }
if ($abertos) {
    $abertos | ForEach-Object { $_.CloseMainWindow() | Out-Null }
    Start-Sleep -Seconds 3
    Get-Process -Name "PeopleFlow" -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path.StartsWith($release, [System.StringComparison]::OrdinalIgnoreCase) } | Stop-Process -Force
    Start-Sleep -Seconds 1
    Write-Host "PeopleFlow encerrado."
}
else {
    Write-Host "Nenhuma instancia aberta."
}

if (-not $SkipFrontend) {
    Write-Etapa "Compilando o front-end"
    Push-Location $frontend
    try {
        if (Test-Path (Join-Path $frontend "node_modules")) {
            try {
                Invoke-Passo "npm install" { npm install --no-audit --no-fund }
            }
            catch {
                Write-Host "Se o servidor de desenvolvimento (dev.ps1) estiver aberto, feche-o e rode de novo." -ForegroundColor Yellow
                throw
            }
        }
        else {
            Invoke-Passo "npm ci" { npm ci --no-audit --no-fund }
        }
        Invoke-Passo "npm run build" { npm run build }
    }
    finally {
        Pop-Location
    }
}

if (-not (Test-Path (Join-Path $frontend "dist\index.html"))) {
    throw "frontend\dist\index.html nao existe. Rode sem -SkipFrontend para compilar o front-end."
}

Write-Etapa "Publicando o aplicativo (Release, win-x64, self-contained)"
if (Test-Path $release) {
    Get-ChildItem $release -Force | Remove-Item -Recurse -Force
}
Invoke-Passo "dotnet publish" {
    dotnet publish $projeto -c Release -r win-x64 --self-contained true -o $release --nologo -v q
}

Write-Etapa "Copiando o front-end para wwwroot"
$wwwroot = Join-Path $release "wwwroot"
New-Item -ItemType Directory -Force $wwwroot | Out-Null
Copy-Item -Path (Join-Path $frontend "dist\*") -Destination $wwwroot -Recurse -Force

if (-not (Test-Path $exe)) {
    throw "PeopleFlow.exe nao foi gerado em $release."
}

if (-not $NoShortcut) {
    Write-Etapa "Criando o atalho na area de trabalho"
    $desktop = [Environment]::GetFolderPath("Desktop")
    $atalho = Join-Path $desktop "PeopleFlow.lnk"
    $shell = New-Object -ComObject WScript.Shell
    $lnk = $shell.CreateShortcut($atalho)
    $lnk.TargetPath = $exe
    $lnk.WorkingDirectory = $release
    $lnk.IconLocation = "$exe,0"
    $lnk.Description = "PeopleFlow - ponto, jornada e banco de horas"
    $lnk.Save()
    Write-Host "Atalho criado: $atalho"
}

$tamanho = (Get-ChildItem $release -Recurse -File | Measure-Object Length -Sum).Sum / 1MB

Write-Host ""
Write-Host ("Release pronta em {0} ({1:N0} MB)." -f $release, $tamanho) -ForegroundColor Green
Write-Host "Os dados ficam em %LocalAppData%\PeopleFlow e nao sao apagados ao republicar."
