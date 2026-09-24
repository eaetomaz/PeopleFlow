# Visão geral

## Problema

Controle de ponto de verdade não é "entrada menos saída". O resultado de um dia depende das regras da empresa (tolerância, destino da hora extra, adicional noturno, intervalos), da jornada contratual (semanal ou escala), de feriados e de ajustes aprovados. O PeopleFlow separa essas regras da tela: um **motor de apuração** puro recebe marcações + jornada + política e devolve o resultado explicado.

## Perfis

| Perfil | O que faz |
|---|---|
| Admin | Tudo, inclusive usuários e políticas |
| RH | Cadastros (empresas, políticas, feriados, jornadas, funcionários), apuração, banco de horas, aprova ajustes |
| Gestor | Vê a própria equipe (funcionários com `GestorId` = ele), aprova ajustes da equipe (nunca o próprio) |
| Funcionário | Registra ponto, vê o próprio espelho e banco, solicita ajustes |

## Fluxo do Marco 1

1. RH cadastra a empresa e a **política** (versionada por vigência).
2. RH cadastra **jornadas** (semanal ou cíclica, ex.: 12x36) e **feriados**.
3. RH cadastra **funcionários** e vincula a jornada com vigência.
4. O funcionário **registra o ponto** (relógio do servidor, fuso da empresa, NSR sequencial).
5. Esqueceu ou errou? **Solicita ajuste** (inclusão ou desconsideração) com justificativa.
6. O gestor (ou RH) **aprova ou rejeita**; quem pediu nunca aprova.
7. A cada escrita que afeta o resultado, a **apuração** do dia é recalculada e o **banco de horas** atualizado.

## Exemplo que guia o projeto

Jornada 08:00–12:00 / 13:30–18:00, marcações 07:58, 12:00, 13:30, 18:47, política padrão (tolerância 5/10, banco de horas): **0:49 de extra a 50%**, crédito de 49 min no banco. A tela explica: "Tolerância não aplicada: uma variação de 47 min passa dos 5 min permitidos por marcação, então todo o tempo conta (CLT art. 58 §1º; Súmula 366 do TST)". Ver `04-MOTOR-DE-APURACAO.md`.

## Escopo por marco

Ver `10-ROADMAP.md`. Resumo: M1 núcleo de jornada/ponto; M2 ocorrências; M3 fechamento mensal; M4 folha simplificada; M5 documentos; M6 integração contábil simulada; M7 tela de auditoria; M8 extras.
