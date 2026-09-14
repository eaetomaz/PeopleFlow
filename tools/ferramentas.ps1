$script:PastaFerramentas = Join-Path (Split-Path $PSScriptRoot -Parent) ".tools"
$script:VersaoNodeMinima = 22

function Add-CaminhoPath([string]$pasta) {
    if (-not (($env:PATH -split ";") -contains $pasta)) {
        $env:PATH = "$pasta;$env:PATH"
    }
}

function Save-Download([string]$url, [string]$destino) {
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
    $anterior = $ProgressPreference
    $ProgressPreference = "SilentlyContinue"
    try {
        Invoke-WebRequest -Uri $url -OutFile $destino -UseBasicParsing
    }
    finally {
        $ProgressPreference = $anterior
    }
}

function Test-DotnetSdk {
    if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) { return $false }
    try {
        $sdks = & dotnet --list-sdks 2>$null
        return [bool]($sdks | Where-Object { $_ -match "^10\." })
    }
    catch {
        return $false
    }
}

function Install-DotnetSdk {
    $destino = Join-Path $script:PastaFerramentas "dotnet"
    $exe = Join-Path $destino "dotnet.exe"

    if (-not (Test-Path $exe)) {
        Write-Host ".NET SDK 10 nao encontrado. Baixando para $destino (uma vez so)..." -ForegroundColor Yellow
        New-Item -ItemType Directory -Force $script:PastaFerramentas | Out-Null
        $instalador = Join-Path $script:PastaFerramentas "dotnet-install.ps1"
        Save-Download "https://dot.net/v1/dotnet-install.ps1" $instalador
        & $instalador -Channel 10.0 -InstallDir $destino -NoPath
        if (-not (Test-Path $exe)) {
            throw "Nao foi possivel instalar o .NET SDK 10. Instale manualmente em https://dotnet.microsoft.com/download/dotnet/10.0 e rode de novo."
        }
    }

    $env:DOTNET_ROOT = $destino
    $env:DOTNET_MULTILEVEL_LOOKUP = "0"
    Add-CaminhoPath $destino
}

function Test-Node {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { return $false }
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { return $false }
    try {
        $versao = ((& node --version) -replace "^v", "").Trim()
        return ([version]$versao).Major -ge $script:VersaoNodeMinima
    }
    catch {
        return $false
    }
}

function Install-Node {
    $destino = Join-Path $script:PastaFerramentas "node"

    if (-not (Test-Path (Join-Path $destino "node.exe"))) {
        Write-Host "Node.js $($script:VersaoNodeMinima)+ nao encontrado. Baixando para $destino (uma vez so)..." -ForegroundColor Yellow
        New-Item -ItemType Directory -Force $script:PastaFerramentas | Out-Null

        $base = "https://nodejs.org/dist/latest-v$($script:VersaoNodeMinima).x"
        $sumas = Join-Path $script:PastaFerramentas "node-SHASUMS256.txt"
        Save-Download "$base/SHASUMS256.txt" $sumas

        $arquivo = $null
        $hashEsperado = $null
        foreach ($linha in (Get-Content $sumas)) {
            if ($linha -match "^([0-9a-fA-F]{64})\s+(node-v\d+\.\d+\.\d+-win-x64\.zip)\s*$") {
                $hashEsperado = $Matches[1]
                $arquivo = $Matches[2]
                break
            }
        }
        Remove-Item -LiteralPath $sumas -Force
        if (-not $arquivo) {
            throw "Nao foi possivel localizar o Node.js para Windows x64 em $base. Instale manualmente em https://nodejs.org e rode de novo."
        }

        $zip = Join-Path $script:PastaFerramentas $arquivo
        Save-Download "$base/$arquivo" $zip
        if ((Get-FileHash $zip -Algorithm SHA256).Hash -ne $hashEsperado.ToUpper()) {
            Remove-Item -LiteralPath $zip -Force
            throw "O download do Node.js veio corrompido (hash SHA-256 diferente). Rode de novo."
        }

        $temporario = Join-Path $script:PastaFerramentas "node-extraindo"
        if (Test-Path $temporario) { Remove-Item -LiteralPath $temporario -Recurse -Force }
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::ExtractToDirectory($zip, $temporario)
        Move-Item -LiteralPath (Join-Path $temporario ($arquivo -replace "\.zip$", "")) -Destination $destino
        Remove-Item -LiteralPath $temporario -Recurse -Force
        Remove-Item -LiteralPath $zip -Force
    }

    Add-CaminhoPath $destino
}

function Initialize-Ferramentas([bool]$Frontend = $true) {
    if (Test-DotnetSdk) {
        Write-Host ".NET SDK: $(& dotnet --version) (do sistema)"
    }
    else {
        Install-DotnetSdk
        Write-Host ".NET SDK: $(& dotnet --version) (local, em .tools)"
    }

    if ($Frontend) {
        if (Test-Node) {
            Write-Host "Node.js: $(& node --version) (do sistema)"
        }
        else {
            Install-Node
            Write-Host "Node.js: $(& node --version) (local, em .tools)"
        }
    }
}
