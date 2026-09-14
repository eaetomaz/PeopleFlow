param(
    [string]$Pasta = [Environment]::GetFolderPath("Desktop"),
    [switch]$Abrir
)

$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$release = Join-Path $root "release\PeopleFlow"
$exe = Join-Path $release "PeopleFlow.exe"

if (-not (Test-Path $exe)) {
    Write-Host "A release ainda nao existe. Gerando agora (leva alguns minutos na primeira vez)..." -ForegroundColor Cyan
    & (Join-Path $root "publish.ps1") -NoShortcut
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $exe)) {
        Write-Host "Nao foi possivel gerar a release. Confira as mensagens acima." -ForegroundColor Red
        exit 1
    }
}

if (-not (Test-Path $Pasta)) {
    New-Item -ItemType Directory -Force -Path $Pasta | Out-Null
}

$atalho = Join-Path $Pasta "PeopleFlow.lnk"
$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut($atalho)
$lnk.TargetPath = $exe
$lnk.WorkingDirectory = $release
$lnk.IconLocation = "$exe,0"
$lnk.Description = "PeopleFlow - ponto, jornada e banco de horas"
$lnk.Save()

Write-Host ""
Write-Host "Atalho criado: $atalho" -ForegroundColor Green
Write-Host "Clique duas vezes em PeopleFlow na area de trabalho para abrir."

if ($Abrir) {
    Start-Process -FilePath $exe -WorkingDirectory $release
}
