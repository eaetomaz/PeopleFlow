# Domínio e banco

## Entidades (Marco 1)

Base `Entidade` (Id Guid v7, CriadoEm, AtualizadoEm preenchidos pelo interceptor). As marcadas com `IAuditavel` geram `EventoAuditoria`.

| Entidade | Tabela | Pontos-chave |
|---|---|---|
| `Empresa` | Empresas | CNPJ único, UF/município (para feriados), fuso, cor, `UltimoNsr` |
| `PoliticaEmpresa` | Politicas | **Versionada**: nunca editada no lugar; nova versão com `VigenteDesde` posterior à última. Campos em `04-MOTOR-DE-APURACAO.md` |
| `Jornada` / `JornadaDia` / `JornadaPeriodo` | Jornadas... | Semanal (índice = dia da semana 0..6) ou Cíclica (índice 0..n-1). `HoraVirada` define a que dia uma marcação pertence. `FeriadosCompensados` para 12x36 |
| `Funcionario` | Funcionarios | Matrícula única por empresa, CPF, PIS, cargo, centro de custo, `GestorId` (auto-relacionamento) |
| `FuncionarioJornada` | FuncionarioJornadas | Vínculo com vigência, sem sobreposição; `DataReferenciaCiclo` alterna equipes A/B da mesma escala |
| `Feriado` | Feriados | Nacional, Estadual, Municipal ou da Empresa; ponto facultativo conta como dia normal |
| `Marcacao` | Marcacoes | **Nunca editada nem apagada**. `Origem` Registro ou AjusteManual (Inclusão/Desconsideração) com justificativa, status, quem pediu, quem decidiu e motivo. `DataHora` é hora local de parede (sem fuso) |
| `ApuracaoDiaRegistro` | Apuracoes | Saída do motor, uma linha por funcionário e dia, com regras/segmentos/previsto em JSON e `VersaoMotor` |
| `BancoHorasLancamento` | BancoHorasLancamentos | Apuracao (upsert por dia), AjusteManual, Compensacao, Pagamento, Expiracao; créditos com `VenceEm`; `FechamentoId` reservado para o M3 |
| `Usuario` | Usuarios | Login único (NOCASE), hash PBKDF2, perfil, funcionário (único), carimbo de segurança, bloqueio |
| `EventoAuditoria` | EventosAuditoria | Quem, quando, entidade, ação, detalhes (antes/depois) e CorrelationId |

## Convenções do EF

- Enums salvos como texto (`Properties<Enum>().HaveConversion<string>()`).
- `DateTime` em UTC por convenção, **exceto** `Marcacao.DataHora` (hora local, `Kind` Unspecified).
- `DateOnly`/`TimeOnly` nativos do EF 10 no SQLite; minutos e percentuais são `int` (nada de decimal no SQLite).
- Exclusões restritas por padrão; cascata só em JornadaDia/JornadaPeriodo e Apuracoes.

## Migrations

| Migration | Data | Conteúdo |
|---|---|---|
| `20260910231500_Inicial` | 2026-09-10 | Todas as tabelas do Marco 1 |

Criar nova: `dotnet ef migrations add Nome --project backend\PeopleFlow.Infrastructure --startup-project backend\PeopleFlow.API --output-dir Persistence\Migrations` (o `dotnet-ef` está fixado em `.config\dotnet-tools.json`; rode `dotnet tool restore` antes). As migrations são aplicadas sozinhas no start, com backup antes quando o banco já existe.

## Seed de demonstração

Só em banco novo (`PEOPLEFLOW_SEED=vazio` desliga os dados de exemplo):

- Feriados nacionais do ano anterior, atual e seguinte (Páscoa pelo algoritmo de Meeus; 20/11 pela Lei 14.759/2023; Carnaval e Corpus Christi como ponto facultativo) e regionais de SP (09/07), São Paulo (25/01, Corpus Christi) e Campinas (Corpus Christi, 08/12).
- **Aurora Tecnologia (São Paulo)**: política CLT padrão; jornadas Comercial 44h e Administrativo 8h30; gestor Carlos Mendes e equipe (Ana Souza, Bruno, Juliana, Rafael) e Patrícia Nunes (RH).
- **Vale Verde Logística (Campinas)**: política de convenção coletiva (pagamento, HE 60/100, noturno 25%, tolerância por marcação); jornadas 6x1 Operacional, 2º turno e 12x36 Noturno (Diego e Luana em equipes alternadas).
- Usuários `admin`, `rh` (Patrícia), `gestor` (Carlos), `funcionario` (Ana); senhas de demonstração em `ContasDemo` (`DemoSeeder.cs`), mostradas como atalhos na tela de login enquanto não forem trocadas.
- Marcações do mês anterior até agora, com `Random(20260901)`: variações dentro da tolerância, atrasos, extras, saídas antecipadas, faltas e esquecimentos. Roteiro fixo da Ana: o dia de exemplo 07:58/12:00/13:30/18:47, um ajuste aprovado, um rejeitado e um pendente (na fila do Carlos). Bruno trabalha um sábado.
- No fim, recalcula a apuração de todos.
