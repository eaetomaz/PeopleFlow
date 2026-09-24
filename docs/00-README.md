# PeopleFlow — documentação do projeto

Visão técnica e funcional do PeopleFlow: arquitetura, domínio, regras de apuração, API, front-end, segurança, release e decisões.

## O que é

Sistema local de gestão de pessoas no contexto da CLT: a empresa cadastra funcionários e o sistema acompanha o ciclo **admissão → jornada → ponto → ocorrências → fechamento → folha → contabilidade → documentos**. Projeto de portfólio, sem cliente real. Roda como app de Windows com janela própria (WebView2), sem navegador, sem Docker, com banco SQLite local.

## Estado atual

**Marco 1 pronto**: esqueleto, motor de apuração, cadastros, ponto, ajustes com aprovação, apuração, espelho, banco de horas e painel. Ver `10-ROADMAP.md`.

- Backend (domínio, motor, Application, API, auth por cookie, seed de demonstração) com 49 testes do motor.
- Front-end com todas as telas do Marco 1 (`06-FRONTEND.md`).
- Release self-contained de ~150 MB gerada por `publish.cmd`, que também cria o atalho na área de trabalho.
- Screenshots em `docs/screenshots/`.
- Próximo: Marco 2 (ocorrências).

## Notas

| Arquivo | Conteúdo |
|---|---|
| `01-VISAO-GERAL.md` | Produto, perfis, fluxo e escopo por marco |
| `02-ARQUITETURA.md` | Camadas, projetos, hospedagem na janela, portas e pastas |
| `03-DOMINIO-E-BANCO.md` | Entidades, tabelas, migrations e seed |
| `04-MOTOR-DE-APURACAO.md` | Regras, algoritmo, exemplos e testes do motor |
| `05-API.md` | Rotas, políticas de acesso e contratos |
| `06-FRONTEND.md` | Telas, rotas e convenções do React |
| `07-SEGURANCA-E-PERFIS.md` | Login, cookie, perfis, escopo e auditoria |
| `08-RELEASE-E-SETUP.md` | Como rodar, publicar, criar o atalho e verificar |
| `09-DECISOES.md` | Decisões de arquitetura e de produto, com o motivo |
| `10-ROADMAP.md` | Marcos, o que está pronto e o que falta |

## Convenções do projeto

- Código sem comentários: nomes claros e esta documentação explicam o porquê. Migrations geradas pelo EF ficam de fora.
- Textos da interface e mensagens em pt-BR.
- Testes automatizados concentrados nos motores de cálculo (xUnit em `PeopleFlow.Tests`); o resto é verificado rodando o sistema.
- Scripts `.ps1` só com ASCII, para rodar no Windows PowerShell 5.1.
- A documentação acompanha cada mudança relevante.
