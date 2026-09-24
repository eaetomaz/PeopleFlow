# Roadmap

## Marco 1 — núcleo de jornada e ponto (pronto)

| Etapa | Estado |
|---|---|
| S0 esqueleto + scripts | pronto |
| S1 domínio + motor + testes | pronto (49 testes) |
| S2 persistência, initializer com backup, seed | pronto |
| S3 autenticação + login | pronto |
| S4 cadastros | pronto |
| S5 ponto, ajustes e aprovações | pronto |
| S6 apuração, espelho, banco de horas, painel | pronto |
| S7 verificação completa, documentação e release | pronto (ver `08-RELEASE-E-SETUP.md`) |

Pendências pequenas do M1: as lacunas de contrato listadas em `06-FRONTEND.md` (todas contornadas no front).

## Marcos seguintes

- **M2 Ocorrências**: atestado, falta (justificada/injustificada), férias, afastamento, licenças, advertência, alteração contratual e salarial. Ciclo Rascunho → Solicitada → Aprovada/Rejeitada → Cancelada, anexos, histórico. Reflexo no ponto por um `ProvedorAbonos` que alimenta a entrada `Abonos` do motor (assinatura não muda). Alteração salarial cria `HistoricoSalarial` com vigência.
- **M3 Fechamento mensal**: Aberto → Apuração → Conferência de ocorrências → Cálculo → Revisão → Aprovação → Fechado, com bloqueios (inconsistências, ajustes pendentes, ocorrências abertas). Vencimento FIFO do banco, DSR sobre HE e perda de DSR por falta injustificada. Snapshot imutável com hash; escrita bloqueada em competência fechada; reabertura controlada (Admin, motivo, revisão n+1, auditoria). Testes do cálculo.
- **M4 Folha simplificada**: rubricas (salário, HE por percentual, adicional noturno sobre a hora ficta, DSR, descontos, intervalo suprimido), INSS progressivo e IRRF com tabelas vigentes, FGTS informativo, holerite. Testes do calculador.
- **M5 Documentos**: modelos com `{{FUNCIONARIO_NOME}}`, `{{CARGO}}`, `{{DATA_ADMISSAO}}`... gerando PDF (MigraDoc, reaproveitando o renderer do OfiTools): espelho de ponto, declarações, recibos, holerite.
- **M6 Integração contábil simulada**: outbox gravada na mesma transação da aprovação do fechamento; dispatcher em BackgroundService envia a uma API contábil fake (latência e falha configuráveis); `Idempotency-Key`, backoff com jitter, protocolo, log de tentativas, estados Pendente → Enviado → Processando → Processado ou Falhou → Reprocessamento.
- **M7 Auditoria**: tela sobre `EventoAuditoria` (gravado desde o M1) com filtros e diff.
- **M8 Extras**: importação de AFD (Portaria 671), backup/restore pela tela, relatórios.

## O que o M1 já deixa pronto para eles

Entrada `Abonos` no motor, política versionada por vigência, `VersaoMotor` em cada resultado, `FechamentoId` nos lançamentos do banco, centro de custo no funcionário, auditoria desde o primeiro dia e aprovações ligadas a usuários reais.
