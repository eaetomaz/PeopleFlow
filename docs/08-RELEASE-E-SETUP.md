# Release e setup

## Autossuficiência

Clonar e rodar `publish.cmd` basta, em qualquer máquina Windows x64:

- `tools\ferramentas.ps1` instala sozinho o que faltar, sem admin, em `.tools\`: .NET SDK 10 (script oficial `dotnet-install.ps1`) e Node 22 (zip conferido por SHA-256).
- A release é self-contained (não precisa de .NET instalado para abrir).
- O `PeopleFlow.exe` detecta se falta o WebView2 Runtime e oferece instalar (baixa da Microsoft, pede UAC).
- `publish.cmd`/`criar-atalho.cmd` contornam a ExecutionPolicy.

## Scripts

| Script | O que faz |
|---|---|
| `publish.ps1` / `publish.cmd` | Fecha o PeopleFlow da release se aberto, compila o front, `dotnet publish` (Release, win-x64, self-contained) em `release\PeopleFlow`, copia o front para `wwwroot` e **cria o atalho na área de trabalho**. `-NoShortcut` pula o atalho; `-SkipFrontend` reaproveita o `frontend\dist` |
| `criar-atalho.ps1` / `.cmd` | Cria só o atalho (gera a release antes se não existir). `-Pasta` escolhe outra pasta, `-Abrir` abre depois |
| `dev.ps1` | Dev: API na 5341 + Vite na 5195 (abre o navegador). `-ComJanela` abre a janela desktop apontando para o Vite, com DevTools. Dados em `%LocalAppData%\PeopleFlow-dev` |
| `tools\gerar-icone.ps1` | Regenera `assets\peopleflow.ico` (System.Drawing) |

O atalho abre o `PeopleFlow.exe`, que sobe a API no mesmo processo e mostra a janela: não há nada mais para iniciar.

Republicar não apaga dados (ficam em `%LocalAppData%\PeopleFlow`). Migrations novas são aplicadas no próximo start, com backup automático em `backups\`.

## Verificação (sem mexer nos dados reais)

- `dotnet test backend\PeopleFlow.Tests` (motor).
- API isolada: `PEOPLEFLOW_DATA_DIR=<pasta temporária>` + `dotnet run --project backend\PeopleFlow.API --launch-profile http`.
- Janela real: `PEOPLEFLOW_DATA_DIR=<pasta temporária>`, `PEOPLEFLOW_PORT=5349`, `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9335` e Playwright `connectOverCDP('http://127.0.0.1:9335')`.
- `publish.ps1 -NoShortcut` para gerar a release sem criar atalho.

## Roteiro de verificação do Marco 1

- API e regras: build da solução sem erros; 49 testes do motor verdes; API de dev com banco novo em pasta temporária: migration aplicada, seed com 12 funcionários; login das 4 contas; espelho da Ana mostra o dia de exemplo com 0:49 a 50% e as regras explicadas; 401 sem login, 403 do funcionário em `usuarios`, 422 ao aprovar o próprio pedido, 409 ao registrar ponto duas vezes no mesmo minuto, 403 com `Origin` estranho; aprovar o ajuste pendente recalculou o dia de "Inconsistente" para "Normal".
- Release e janela: `publish.ps1 -NoShortcut` gerou `release\PeopleFlow` (147 MB). `PeopleFlow.exe` com banco novo em pasta temporária respondeu em ~10 s (migration + seed); segundo start instantâneo e sem repetir o seed. `index.html` com `no-cache`, rota do SPA devolve o `index.html`, `/api` desconhecida 404. Playwright via CDP na janela real: menu de cada perfil correto; espelho da Ana com +0:49 e drawer com a Súmula 366; registrar ponto mostra o NSR; gestor aprovou o ajuste pendente (fila zerou, dia virou Normal); RH recebe 403 em `usuarios`; nova versão de política recalculou 168 dias. Segunda instância sai com código 0 e traz a janela para a frente; fechar a janela libera a porta e não deixa `-wal`/`-shm`.
