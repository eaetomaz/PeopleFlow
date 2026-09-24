# Motor de apuração

Código: `backend\PeopleFlow.Domain\Apuracao\`. Função pura, sem EF: `MotorApuracao.Apurar(EntradaApuracaoDia) → ApuracaoDia`. `MotorApuracao.Versao` fica gravada em cada resultado.

## Entrada

`EntradaApuracaoDia(Data, Previsto, Marcacoes, Parametros, Feriado, FeriadosCompensados, Abonos, UltimaSaidaAnterior)`

- `Previsto`: intervalos da jornada no dia (vem de `ResolvedorJornada.Prever`).
- `Marcacoes`: todas do dia de referência, inclusive ajustes pendentes/rejeitados (o motor filtra).
- `Parametros`: foto da `PoliticaEmpresa` vigente (`ParaApuracao()`).
- `Abonos`: vazio no M1; é o gancho das ocorrências do M2 (atestado/férias abonam trechos do previsto sem mudar a assinatura).

## Política (padrões)

| Campo | Padrão | Base |
|---|---|---|
| Tolerância por marcação / diária | 5 / 10 min | CLT art. 58 §1º |
| Modo | Integral ao exceder | Súmula 366 do TST (passou do limite, conta tudo) |
| Destino HE dia útil / descanso-feriado | Banco de horas / Pagamento | CLT art. 59 §2º e §5º |
| HE dia útil / descanso-feriado | 50% / 100% | CF art. 7º XVI; Súmula 146 |
| Limite diário de HE | 120 min | CLT art. 59 |
| Adicional noturno | 20%, 22h–5h | CLT art. 73 |
| Hora noturna reduzida | ligada (52m30s) | CLT art. 73 §1º |
| Prorrogação noturna | ligada | Súmula 60 II do TST |
| Intervalo mínimo | 60 min acima de 6h; 15 min de 4h a 6h | CLT art. 71 |
| Interjornada | 660 min | CLT art. 66 |
| Validade do banco | 6 meses | CLT art. 59 §5º |
| Janela de duplicidade | 1 min | — |

## Algoritmo (minutos inteiros)

1. **Filtra**: vale Registro e inclusão aprovada, menos os alvos de desconsideração aprovada. Ajuste pendente fica de fora e marca `AjustePendente`.
2. **Deduplica** marcações dentro da janela (`MarcacaoDuplicada`).
3. **Pareia** (entrada, saída); ímpar marca `MarcacoesImpares`; par acima de 16h marca `ParSuspeito`.
4. **Tipo do dia**: feriado sem compensação → Feriado (previsto abonado); sem previsto → Descanso; senão Útil.
5. **Conjuntos**: E = trabalhado − previsto (extras brutos); D = previsto − trabalhado (faltas brutas).
6. **Tolerância** (só dia útil), cada segmento de E ∪ D é uma variação:
   - Integral: todas ≤ 5 **e** soma ≤ 10 → tudo tolerado; senão conta a totalidade.
   - Por marcação: descarta em ordem cronológica enquanto couber no limite diário.
7. **Débitos**: segmento de D no início do período = atraso; no fim = saída antecipada; outros = ausência parcial. Nenhuma marcação no dia útil = falta.
8. **Noturno**: janelas de D−1, D e D+1 (cobre a virada da meia-noite). Prorrogação: se um bloco de trabalho (pausas ≤ 120 min) começa antes e termina depois da janela, ela se estende até o fim do bloco. Ficto = real × 60/52,5, arredondado no total do dia.
9. **Extras** = diurnas + noturnas em hora ficta. Percentual pelo tipo do dia. Todo minuto trabalhado em descanso/feriado é extra a 100%, sem tolerância. Acima do limite diário gera alerta (e conta).
10. **Intervalo**: maior pausa entre pares; abaixo do mínimo gera intervalo suprimido.
11. **Interjornada**: descanso desde a última saída do dia anterior abaixo de 11h gera alerta.
12. **Destino**: banco (crédito e débito se compensam no saldo) ou pagamento (extras a pagar e desconto, sem compensar). Dia com marcações ímpares ou ajuste pendente é **provisório**: nada vai para o banco.

Decisões registradas: o dia inteiro assume o tipo do dia em que a jornada começa (horas depois da meia-noite não trocam de data); débitos são em minutos de relógio (sem conversão noturna).

## Saída

Minutos por categoria, `Segmentos` classificados (Normal, Extra, Tolerado, Atraso, SaidaAntecipada, AusenciaParcial, Falta, Noturno) para a linha do tempo da tela, `Inconsistencias` e `Regras` (código + valores). A tradução em pt-BR com base legal fica em `Application\Apuracao\ExplicadorRegras.cs`, feita na consulta, então dá para melhorar o texto sem recalcular.

## Exemplo

Jornada 08:00–12:00 / 13:30–18:00; marcações 07:58, 12:00, 13:30, 18:47; política padrão → variações de 2 e 47 min; 47 > 5, então conta tudo: **extras 0:49 a 50%**, crédito de 49 min. Com pagamento: 49 min a pagar. Descontando por marcação: 47 min.

## Serviços puros ao redor

- `ResolvedorJornada.Prever(jornada, referenciaCiclo, data)`: semanal pelo dia da semana; cíclica por `mod(data − âncora, n)`; período que termina antes de começar vai para D+1, e períodos seguintes que começam antes do fim do anterior também. `Validar` recusa hora de virada dentro de um período.
- `DistribuidorMarcacoes`: marcação antes da hora de virada do dia conta para o dia anterior (12x36 noturno usa virada 12:00).
- `ConsolidadorPeriodo`: soma o período e conta faltas e dias inconsistentes.
- `SaldoBancoHoras`: saldo em FIFO (débito consome o crédito mais antigo), créditos vencidos à parte.

## Testes (`backend\PeopleFlow.Tests\Apuracao\`, 49 cenários)

Tolerância (exemplo da ideia nas 3 variantes; 9 min tolerados; 5+4+4 = 13; atrasos; banco × pagamento; saída antecipada; almoço encurtado; ausência parcial), tipos de dia (falta, descanso trabalhado, feriado, escala que compensa feriado), consistência (ímpares, ajuste pendente/aprovado/rejeitado, duplicadas, desconsideração, intervalo irregular, jornada de 5h, interjornada, limite de HE, par suspeito), noturno (22–05 = 480 fictos; prorrogação 22–06 = 69 min de extra ficto; 12x36 19–07 com pausa = 480 real/549 ficto; 2º turno até 22:30; hora reduzida e prorrogação desligadas), jornadas (semanal, ciclo com duas âncoras, virada da meia-noite, validação) e banco (FIFO, vencimento, saldo negativo, consolidador).
