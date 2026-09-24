# Frontend

`frontend\` — React 19, TypeScript, Vite 8, Tailwind CSS 4 (`@tailwindcss/vite`, sem arquivo de config), Motion, react-router 7, TanStack Query 5, react-hook-form + zod, lucide-react, oxlint. Base copiada do OfiTools (configs, kit de UI, tema, cliente da API) com paleta teal/esmeralda.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `src/lib` | `api.ts` (ApiError a partir do ProblemDetails, `auth:expirou` no 401), `auth.tsx`/`authContext.ts` (sessão e permissões por perfil), `empresa.tsx` (empresa selecionada, `peopleflow.empresa`), `theme.tsx` (`peopleflow.theme`), `duracao.ts` (`8:30`, `+0:49`), `format.ts` (datas pt-BR sem conversão de fuso), `labels.ts`, `masks.ts`, `marcacoes.ts` (chips do dia) |
| `src/components/ui` | Kit: Button, Field, Modal (inclui drawer e ConfirmDialog), Toast, Table, States, Switch, Checkbox, Combobox, Display (Card, Stat, Badge, Alert, Skeleton), Navigation |
| `src/components/layout` | `AppLayout` (sidebar recolhível 252/76 px com seções por perfil, seletor de empresa para Admin/RH, menu do usuário), `Guards.tsx` (splash, "servidor não respondeu", redirecionamento para o login, bloqueio por perfil), `PageHeader`, `ThemeToggle` |
| `src/components/ponto` | `DiaDrawer` (detalhe do dia), `TimelineDia` (previsto × realizado, atravessa a meia-noite), `AjusteModal`, `MarcacaoChip`, `SituacaoBadge`, `CompetenciaNav`, `FuncionarioPicker` |
| `src/features/*` | Uma pasta por área; páginas carregadas sob demanda (`router.tsx`) |
| `src/types/api.ts` | Tipos espelhando os DTOs do backend |

## Rotas

| Rota | Tela | Perfis |
|---|---|---|
| `/login` | Login com contas de demonstração | pública |
| `/` | Painel (presença de hoje, KPIs do mês, gráfico extras × débitos, destaques) | todos |
| `/ponto` | Registrar ponto (relógio, marcações e apuração parcial do dia, solicitar ajuste) | quem tem funcionário |
| `/ponto/espelho/:funcionarioId?` | Espelho do mês + drawer do dia (linha do tempo, regras aplicadas, marcações, ações de ajuste) | escopo |
| `/aprovacoes` | Fila de ajustes (antes → depois, aprovar, rejeitar com motivo, em lote) | Gestor, RH, Admin |
| `/apuracao` | Resumo da empresa por funcionário, reprocessar período | Gestor (leitura), RH, Admin |
| `/banco-horas`, `/banco-horas/:funcionarioId` | Saldos; extrato, créditos em aberto (FIFO), lançamento manual | escopo |
| `/empresas`, `/empresas/:id` | Dados, Política (vigente, nova versão com avisos de CLT, histórico), Feriados | RH, Admin |
| `/jornadas`, `/jornadas/nova`, `/jornadas/:id` | Lista e editor semanal/cíclico (presets 12x36), prévia do mês | RH, Admin (outros leitura) |
| `/funcionarios`, `/funcionarios/:id` | Lista com busca; ficha, vínculos de jornada, equipe | RH, Admin; Gestor leitura |
| `/usuarios` | Usuários, redefinir senha | Admin |
| `/perfil` | Trocar senha, tema | todos |

## Convenções

- Chamadas sempre relativas (`/api/...`), `credentials: 'same-origin'`; em dev o Vite (5195) faz proxy para a API (5341).
- Horas locais (`2026-09-25T07:56:00`) são formatadas cortando a string, nunca com `Date` (evita deslocamento de fuso).
- Sem comentários no código; textos em pt-BR; `npm run lint` e `npm run build` limpos.

## Lacunas do contrato (contornadas no front, candidatas a ajuste)

1. `FuncionarioListaDto` não traz `gestorId` (o seletor de gestor usa o detalhe + a lista).
2. Não há endpoint de contagem de ajustes pendentes: o selo do menu baixa a lista `status=Pendente` e conta os que `podeDecidir`.
3. `marcacoesAntes`/`marcacoesDepois` do `AjusteDto` são só horários (a marcação alterada é achada por diferença).
4. `provisorio` não diz o motivo (hoje × pendência); a tela usa `hoje` para separar a mensagem.
5. `GET /api/auth/me` sem sessão devolve 401, que o navegador registra no console no primeiro carregamento (esperado).
6. `ResumoEmpresaDto.totais` não tem o saldo total do banco (o rodapé soma as linhas).
7. A prévia de jornada cíclica pede uma data de referência (não há funcionário associado).

## Detalhes de layout

- O editor de jornada mostra a empresa dona da jornada, não a selecionada no topo.
- No espelho, a coluna Saldo vem logo depois de Trabalhado, para ficar visível mesmo em janelas de 1360 px.
