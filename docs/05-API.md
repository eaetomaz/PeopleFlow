# API

Tudo em `/api`, JSON camelCase, enums como texto, `DateOnly` como `yyyy-MM-dd`. Horários de marcação/previsto/segmento são **hora local sem fuso** (`2026-09-25T07:56:00`); carimbos de sistema (`solicitadoEm`, `criadoEm`, `calculadoEm`) são UTC com `Z`. Erros sempre em ProblemDetails: 400 com `errors` por campo, 401, 403, 404, 409, 422 com `detail` em pt-BR.

Toda rota exige login (política fallback), exceto as marcadas como anônimas.

| Área | Rotas | Acesso |
|---|---|---|
| Auth | `POST auth/login` (anônima), `POST auth/logout` (anônima), `GET auth/me`, `PUT auth/senha`, `GET auth/demo` (anônima) | — |
| Saúde | `GET /health` (anônima) | — |
| Usuários | `GET/POST usuarios`, `PUT usuarios/{id}`, `POST usuarios/{id}/redefinir-senha` | Admin |
| Empresas | `GET empresas`, `GET empresas/{id}` | escopo |
| | `POST empresas`, `PUT empresas/{id}` | Admin, RH |
| Políticas | `GET empresas/{id}/politicas` | Admin, RH, Gestor |
| | `GET empresas/{id}/politicas/vigente` | escopo |
| | `POST empresas/{id}/politicas` (nova versão + recálculo desde a vigência) | Admin, RH |
| Feriados | `GET feriados?ano=&empresaId=`; `POST`, `PUT {id}`, `DELETE {id}` | leitura todos; escrita Admin, RH |
| Jornadas | `GET jornadas?empresaId=`, `GET jornadas/{id}`, `GET jornadas/{id}/previsao?de=&ate=&referenciaCiclo=` | escopo |
| | `POST jornadas`, `PUT jornadas/{id}` (recalcula quem usa) | Admin, RH |
| Funcionários | `GET funcionarios?empresaId=&busca=&ativo=`, `GET funcionarios/{id}` | escopo |
| | `POST funcionarios`, `PUT {id}`, `POST {id}/jornadas`, `PUT {id}/jornadas/{vinculoId}` | Admin, RH |
| | `GET {id}/marcacoes?de=&ate=`, `GET {id}/apuracao?competencia=yyyy-MM` (espelho), `GET {id}/apuracao/{data}` (detalhe do dia), `GET {id}/banco-horas` | escopo |
| Ponto | `POST ponto/registrar`, `GET ponto/hoje` | quem tem funcionário |
| Ajustes | `POST ajustes`, `GET ajustes?status=&empresaId=&funcionarioId=` | escopo |
| | `POST ajustes/{id}/aprovar`, `POST ajustes/{id}/rejeitar` {motivo} | Admin, RH, Gestor |
| Apuração | `GET empresas/{id}/apuracao?competencia=` (resumo por funcionário) | Admin, RH, Gestor |
| | `POST apuracao/reprocessar` {empresaId, de, ate} (até 400 dias) | Admin, RH |
| Banco de horas | `GET banco-horas?empresaId=` (saldos) | Admin, RH, Gestor |
| | `POST banco-horas/lancamentos` {funcionarioId, data, minutos, descricao} | Admin, RH |
| Painel | `GET painel?empresaId=` | todos (escopo) |

"Escopo" = `AcessoService`: Admin e RH veem tudo; Gestor vê a equipe e a si; Funcionário só a si. Fora do escopo responde 404.

## Recálculo

`ApuracaoService.RecalcularAsync` roda de forma síncrona depois de toda escrita que muda o resultado: registro de ponto (D−1..D), solicitação e decisão de ajuste (D−1..D+1), vínculo de jornada, mudança de admissão/demissão, feriado, jornada editada e nova política (desde a vigência). O dia de hoje é sempre provisório e sem lançamento no banco; hoje sem marcação não gera linha.

## Códigos que a tela trata

- 409 ao registrar ponto dentro da janela de duplicidade ("Você já registrou o ponto às HH:mm...").
- 422 ao aprovar o próprio pedido, gestor aprovando o próprio ponto ou ajuste já decidido.
- 403 do OriginGuard para POST com `Origin` estranho ou `Sec-Fetch-Site: cross-site`; 415 para corpo que não é JSON.
