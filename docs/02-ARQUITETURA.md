# Arquitetura

## Projetos (`backend\PeopleFlow.slnx`)

| Projeto | Papel |
|---|---|
| `PeopleFlow.Domain` | Entidades, enums, exceções e o **motor de apuração** (`Apuracao/`). Não depende de nada |
| `PeopleFlow.Application` | Serviços de caso de uso, DTOs (records), validação FluentValidation, escopo de acesso. Depende de EF Core (Relational) só pela interface `IPeopleFlowDbContext` |
| `PeopleFlow.Infrastructure` | `PeopleFlowDbContext` (SQLite), migrations, interceptor de auditoria, hash de senha, inicialização com backup, seed de demonstração, `PeopleFlowPaths` |
| `PeopleFlow.API` | Controllers, autenticação por cookie, pipeline HTTP (`AddPeopleFlowApi`/`UsePeopleFlowApi`), `Program.cs` só para dev |
| `PeopleFlow.Desktop` | `PeopleFlow.exe` (WinForms): sobe o Kestrel no mesmo processo e mostra o front num WebView2 |
| `PeopleFlow.Tests` | xUnit, referencia só o Domain: testes do motor |

Regra central: **o domínio não depende da tela**. O motor (`MotorApuracao.Apurar`) é uma função pura; a Application só monta a entrada (marcações do dia, previsto da jornada, política vigente, feriado) e grava a saída.

## Esqueleto herdado do OfiTools

Copiado e adaptado de `C:\Dev\Private\OfiTools`: janela desktop (instância única por mutex `Local\PeopleFlow.{porta}`, guarda de navegação, downloads com "Salvar como", instalação automática do WebView2 Runtime), pipeline HTTP (ProblemDetails, CorrelationId, OriginGuard anti-CSRF, cabeçalhos de segurança, Serilog em arquivo), `ferramentas.ps1` (baixa .NET SDK 10 e Node 22 para `.tools\` se faltarem). O que mudou: autenticação por cookie com login (no OfiTools era perfil local único) e o initializer do banco vem do Nexora (backup `VACUUM INTO` antes de migration, seed só em banco novo).

## Hospedagem

- `PeopleFlow.exe` escuta em `127.0.0.1:5340` (`PEOPLEFLOW_PORT` troca).
- Front estático em `wwwroot\` ao lado do exe; `/assets` com cache imutável, o resto `no-cache`; rotas do SPA caem em `index.html`; `/api/**` desconhecido dá 404 ProblemDetails.
- Dev: API em `http://localhost:5341`, Vite em `5195` com proxy de `/api` e `/health`.

## Pastas de dados

`%LocalAppData%\PeopleFlow` (dev: `PeopleFlow-dev`; `PEOPLEFLOW_DATA_DIR` troca):

| Item | Conteúdo |
|---|---|
| `peopleflow.db` | Banco SQLite |
| `logs\` | Serilog diário (14 dias) e log de falha na inicialização |
| `backups\` | `peopleflow-pre-migracao-*.db` antes de aplicar migrations |
| `chaves\` | Chaves do DataProtection (cookie), protegidas com DPAPI |
| `webview\` | Perfil do WebView2 |

## Variáveis de ambiente

`PEOPLEFLOW_PORT`, `PEOPLEFLOW_DATA_DIR`, `PEOPLEFLOW_URL_DEV` (janela abre o Vite), `PEOPLEFLOW_DEV=1` (DevTools), `PEOPLEFLOW_EXTRA_ORIGINS`, `PEOPLEFLOW_SEED=vazio` (só feriados e o admin, sem dados de demonstração).
