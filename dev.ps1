param(
    [int]$Porta = 5341,
    [int]$PortaFront = 5195,
    [switch]$ComJanela
)

$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$frontend = Join-Path $root "frontend"
$api = Join-Path $root "backend\PeopleFlow.API\PeopleFlow.API.csproj"
$desktop = Join-Path $root "backend\PeopleFlow.Desktop\PeopleFlow.Desktop.csproj"
$dados = Join-Path $env:LOCALAPPDATA "PeopleFlow-dev"

function Test-Porta([int]$porta) {
    try {
        $cliente = New-Object System.Net.Sockets.TcpClient
        $cliente.Connect("127.0.0.1", $porta)
        $cliente.Close()
        return $true
    }
    catch {
        return $false
    }
}

function Wait-Porta([int]$porta, [int]$segundos) {
    for ($i = 0; $i -lt $segundos; $i++) {
        if (Test-Porta $porta) { return $true }
        Start-Sleep -Seconds 1
    }
    return $false
}

. (Join-Path $root "tools\ferramentas.ps1")
Initialize-Ferramentas

if (-not (Test-Path (Join-Path $frontend "node_modules"))) {
    Write-Host "Instalando dependencias do front-end..." -ForegroundColor Cyan
    Push-Location $frontend
    try { npm install --no-audit --no-fund } finally { Pop-Location }
}

$env:PEOPLEFLOW_DATA_DIR = $dados
$env:PEOPLEFLOW_EXTRA_ORIGINS = "http://localhost:$PortaFront,http://127.0.0.1:$PortaFront"

if (Test-Porta $Porta) {
    Write-Host "Servidor ja esta na porta $Porta." -ForegroundColor Yellow
}
elseif ($ComJanela) {
    $env:PEOPLEFLOW_PORT = "$Porta"
    $env:PEOPLEFLOW_URL_DEV = "http://localhost:$PortaFront"
    $env:PEOPLEFLOW_DEV = "1"
    Write-Host "Iniciando o PeopleFlow com janela (dados em $dados)..." -ForegroundColor Cyan
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k dotnet run --project `"$desktop`"" -WindowStyle Minimized | Out-Null
}
else {
    Write-Host "Iniciando a API na porta $Porta (dados em $dados)..." -ForegroundColor Cyan
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k dotnet run --project `"$api`" --launch-profile http --urls http://localhost:$Porta" -WindowStyle Minimized | Out-Null
}

if (Test-Porta $PortaFront) {
    Write-Host "Front-end ja esta na porta $PortaFront." -ForegroundColor Yellow
}
else {
    Write-Host "Iniciando o front-end..." -ForegroundColor Cyan
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd /d `"$frontend`" && npm run dev" -WindowStyle Minimized | Out-Null
}

if (-not (Wait-Porta $Porta 120)) { Write-Host "O servidor nao respondeu em 120 s. Veja a janela minimizada." -ForegroundColor Red }
if (-not (Wait-Porta $PortaFront 45)) { Write-Host "O front-end nao respondeu em 45 s. Veja a janela minimizada." -ForegroundColor Red }

if (-not $ComJanela) {
    Start-Process "http://localhost:$PortaFront"
}

Write-Host ""
Write-Host "PeopleFlow (dev): http://localhost:$PortaFront  |  API: http://localhost:$Porta" -ForegroundColor Green
