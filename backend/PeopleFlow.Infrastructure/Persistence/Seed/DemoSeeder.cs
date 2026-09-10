using Microsoft.EntityFrameworkCore;
using PeopleFlow.Application.Abstractions;
using PeopleFlow.Application.Autenticacao;
using PeopleFlow.Application.Comum;
using PeopleFlow.Application.Empresas;
using PeopleFlow.Domain.Apuracao;
using PeopleFlow.Domain.Empresas;
using PeopleFlow.Domain.Feriados;
using PeopleFlow.Domain.Funcionarios;
using PeopleFlow.Domain.Jornadas;
using PeopleFlow.Domain.Ponto;
using PeopleFlow.Domain.Usuarios;

namespace PeopleFlow.Infrastructure.Persistence.Seed;

public sealed class ContasDemo : IContasDemo
{
    public const string AdminLogin = "admin";
    public const string RhLogin = "rh";
    public const string GestorLogin = "gestor";
    public const string FuncionarioLogin = "funcionario";

    public const string AdminSenha = "Admin@2026";
    public const string RhSenha = "Rh@2026pf";
    public const string GestorSenha = "Gestor@2026";
    public const string FuncionarioSenha = "Func@2026pf";

    public IReadOnlyList<(string Login, string Senha, string Descricao)> Contas { get; } =
    [
        (AdminLogin, AdminSenha, "Acesso total, usuários e políticas"),
        (RhLogin, RhSenha, "Cadastros, apuração e banco de horas"),
        (GestorLogin, GestorSenha, "Equipe e aprovação de ajustes"),
        (FuncionarioLogin, FuncionarioSenha, "Registra ponto e vê o espelho")
    ];
}

public sealed class DemoSeeder(PeopleFlowDbContext db, ISenhaHasher hasher, Relogio relogio)
{
    private readonly Random _aleatorio = new(20260901);
    private readonly List<Marcacao> _marcacoes = [];
    private DateOnly _hoje;
    private DateTime _agora;

    public (DateOnly De, DateOnly Ate) PeriodoDemo
    {
        get
        {
            var hoje = relogio.HojePadrao;
            return (new DateOnly(hoje.Year, hoje.Month, 1).AddMonths(-1), hoje);
        }
    }

    public async Task SemearAsync(bool demo, CancellationToken ct)
    {
        _agora = relogio.AgoraLocal(Empresa.FusoPadrao);
        _hoje = DateOnly.FromDateTime(_agora);

        for (var ano = _hoje.Year - 1; ano <= _hoje.Year + 1; ano++)
        {
            db.Feriados.AddRange(FeriadosCatalogo.Nacionais(ano));
            if (demo)
            {
                db.Feriados.AddRange(FeriadosCatalogo.RegionaisDemo(ano));
            }
        }

        var admin = Usuario(ContasDemo.AdminLogin, "Administrador", Perfil.Admin, null, ContasDemo.AdminSenha);
        if (!demo)
        {
            await db.SaveChangesAsync(ct);
            return;
        }

        var aurora = new Empresa
        {
            RazaoSocial = "Aurora Tecnologia Ltda",
            NomeFantasia = "Aurora Tecnologia",
            Cnpj = Cnpj("12345678", "0001"),
            Uf = "SP",
            Municipio = "São Paulo",
            Cor = "#0d9488"
        };
        var valeVerde = new Empresa
        {
            RazaoSocial = "Vale Verde Logística S.A.",
            NomeFantasia = "Vale Verde Logística",
            Cnpj = Cnpj("87654321", "0001"),
            Uf = "SP",
            Municipio = "Campinas",
            Cor = "#7c3aed"
        };
        db.Empresas.AddRange(aurora, valeVerde);

        db.Politicas.Add(new PoliticaEmpresa
        {
            EmpresaId = aurora.Id,
            Versao = 1,
            VigenteDesde = EmpresaService.InicioDaHistoria,
            Observacao = "Padrão da CLT: tolerância de 5 min por marcação e 10 min por dia, horas extras no banco.",
            CriadoPorId = admin.Id
        });
        db.Politicas.Add(new PoliticaEmpresa
        {
            EmpresaId = valeVerde.Id,
            Versao = 1,
            VigenteDesde = EmpresaService.InicioDaHistoria,
            ModoTolerancia = ModoTolerancia.DescontarPorMarcacao,
            DestinoHoraExtra = DestinoHoraExtra.Pagamento,
            DestinoHeDescansoFeriado = DestinoHoraExtra.Pagamento,
            PercentualHeDiaUtil = 60,
            PercentualHeDescansoFeriado = 100,
            AdicionalNoturnoPercentual = 25,
            Observacao = "Convenção coletiva: horas extras pagas com 60%, adicional noturno de 25%.",
            CriadoPorId = admin.Id
        });

        var comercial = Semanal(aurora, "Comercial 44h", new TimeOnly(4, 0), dia => dia switch
        {
            DayOfWeek.Saturday or DayOfWeek.Sunday => [],
            DayOfWeek.Friday => [("08:00", "12:00"), ("13:00", "17:00")],
            _ => [("08:00", "12:00"), ("13:00", "18:00")]
        });
        var administrativo = Semanal(aurora, "Administrativo 8h30", new TimeOnly(4, 0), dia => dia switch
        {
            DayOfWeek.Saturday or DayOfWeek.Sunday => [],
            _ => [("08:00", "12:00"), ("13:30", "18:00")]
        });
        var operacional = Semanal(valeVerde, "6x1 Operacional", new TimeOnly(4, 0), dia => dia switch
        {
            DayOfWeek.Sunday => [],
            _ => [("07:00", "11:00"), ("12:00", "15:20")]
        });
        var segundoTurno = Semanal(valeVerde, "2º turno", new TimeOnly(4, 0), dia => dia switch
        {
            DayOfWeek.Saturday or DayOfWeek.Sunday => [],
            _ => [("14:00", "18:00"), ("18:30", "22:20")]
        });
        var noturna = new Jornada
        {
            EmpresaId = valeVerde.Id,
            Nome = "12x36 Noturno",
            Tipo = TipoJornada.Ciclica,
            HoraVirada = new TimeOnly(12, 0),
            FeriadosCompensados = true
        };
        noturna.Dias = [Dia(noturna, 0, [("19:00", "01:00"), ("02:00", "07:00")]), Dia(noturna, 1, [])];
        db.Jornadas.AddRange(comercial, administrativo, operacional, segundoTurno, noturna);

        var admissao = new DateOnly(_hoje.Year - 1, 3, 2);
        var carlos = Funcionario(aurora, "A001", "Carlos Mendes", "Gerente de Operações", "Operações", null, admissao.AddMonths(-10), administrativo);
        var ana = Funcionario(aurora, "A002", "Ana Souza", "Analista de Processos", "Operações", carlos, admissao, administrativo);
        var bruno = Funcionario(aurora, "A003", "Bruno Lima", "Desenvolvedor", "Tecnologia", carlos, admissao.AddMonths(2), comercial);
        var juliana = Funcionario(aurora, "A004", "Juliana Castro", "Designer", "Produto", carlos, admissao.AddMonths(4), comercial);
        var rafael = Funcionario(aurora, "A005", "Rafael Oliveira", "Analista de Suporte", "Tecnologia", carlos, admissao.AddMonths(1), administrativo);
        var patricia = Funcionario(aurora, "A006", "Patrícia Nunes", "Analista de RH", "Recursos Humanos", null, admissao.AddMonths(-6), administrativo);

        var marcos = Funcionario(valeVerde, "V001", "Marcos Pereira", "Supervisor de Operações", "Operações", null, admissao.AddMonths(-8), operacional);
        var diego = Funcionario(valeVerde, "V002", "Diego Santos", "Vigilante", "Segurança", marcos, admissao.AddMonths(1), noturna, new DateOnly(_hoje.Year, 1, 1));
        var luana = Funcionario(valeVerde, "V003", "Luana Ribeiro", "Vigilante", "Segurança", marcos, admissao.AddMonths(3), noturna, new DateOnly(_hoje.Year, 1, 2));
        var fernanda = Funcionario(valeVerde, "V004", "Fernanda Costa", "Conferente", "Expedição", marcos, admissao.AddMonths(2), segundoTurno);
        var tiago = Funcionario(valeVerde, "V005", "Tiago Almeida", "Auxiliar de Logística", "Expedição", marcos, admissao.AddMonths(5), operacional);
        var sergio = Funcionario(valeVerde, "V006", "Sérgio Batista", "Motorista", "Transporte", marcos, admissao.AddMonths(6), operacional);

        Usuario(ContasDemo.RhLogin, "Patrícia Nunes", Perfil.RH, patricia, ContasDemo.RhSenha);
        var gestor = Usuario(ContasDemo.GestorLogin, "Carlos Mendes", Perfil.Gestor, carlos, ContasDemo.GestorSenha);
        var funcionarioUsuario = Usuario(ContasDemo.FuncionarioLogin, "Ana Souza", Perfil.Funcionario, ana, ContasDemo.FuncionarioSenha);

        var (inicio, _) = PeriodoDemo;
        var feriados = db.ChangeTracker.Entries<Feriado>().Select(e => e.Entity).ToList();
        var todos = new[] { carlos, ana, bruno, juliana, rafael, patricia, marcos, diego, luana, fernanda, tiago, sergio };
        foreach (var funcionario in todos)
        {
            var empresa = funcionario.EmpresaId == aurora.Id ? aurora : valeVerde;
            Gerar(funcionario, empresa, feriados.Where(f => f.ValeParaEmpresa(empresa)).Select(f => f.Data).ToHashSet(), inicio);
        }

        Roteiro(ana, bruno, funcionarioUsuario, gestor, feriados.Where(f => f.ValeParaEmpresa(aurora)).Select(f => f.Data).ToHashSet(), inicio);

        foreach (var empresa in new[] { aurora, valeVerde })
        {
            var ids = todos.Where(f => f.EmpresaId == empresa.Id).Select(f => f.Id).ToHashSet();
            var nsr = 0;
            foreach (var marcacao in _marcacoes.Where(m => ids.Contains(m.FuncionarioId) && m.Origem == OrigemMarcacao.Registro).OrderBy(m => m.DataHora))
            {
                marcacao.Nsr = ++nsr;
            }

            empresa.UltimoNsr = nsr;
        }

        db.Marcacoes.AddRange(_marcacoes);
        await db.SaveChangesAsync(ct);
    }

    private void Gerar(Funcionario funcionario, Empresa empresa, HashSet<DateOnly> feriados, DateOnly inicio)
    {
        var vinculo = funcionario.Jornadas[0];
        var jornada = vinculo.Jornada!;
        for (var dia = inicio; dia <= _hoje; dia = dia.AddDays(1))
        {
            if (dia < funcionario.DataAdmissao)
            {
                continue;
            }

            var previsto = ResolvedorJornada.Prever(jornada, vinculo.DataReferenciaCiclo, dia);
            if (previsto.Count == 0 || (feriados.Contains(dia) && !jornada.FeriadosCompensados))
            {
                continue;
            }

            var sorteio = _aleatorio.NextDouble();
            if (sorteio < 0.015 && dia < _hoje)
            {
                continue;
            }

            var horarios = new List<DateTime>();
            for (var i = 0; i < previsto.Count; i++)
            {
                var periodo = previsto[i];
                var primeiro = i == 0;
                var ultimo = i == previsto.Count - 1;
                var entrada = periodo.Inicio.AddMinutes(primeiro ? _aleatorio.Next(-9, 4) : _aleatorio.Next(-3, 3));
                var saida = periodo.Fim.AddMinutes(ultimo ? _aleatorio.Next(-2, 9) : _aleatorio.Next(-2, 3));

                if (primeiro && sorteio is >= 0.015 and < 0.06)
                {
                    entrada = periodo.Inicio.AddMinutes(_aleatorio.Next(8, 36));
                }

                if (ultimo && sorteio is >= 0.06 and < 0.14)
                {
                    saida = periodo.Fim.AddMinutes(_aleatorio.Next(18, 80));
                }

                if (ultimo && sorteio is >= 0.14 and < 0.165)
                {
                    saida = periodo.Fim.AddMinutes(-_aleatorio.Next(20, 70));
                }

                horarios.Add(entrada);
                horarios.Add(saida);
            }

            if (sorteio is >= 0.165 and < 0.18 && dia < _hoje)
            {
                horarios.RemoveAt(_aleatorio.Next(1, horarios.Count));
            }

            foreach (var horario in horarios.Where(h => h <= _agora))
            {
                Registrar(funcionario, horario);
            }
        }
    }

    private void Roteiro(Funcionario ana, Funcionario bruno, Usuario anaUsuario, Usuario gestor, HashSet<DateOnly> feriados, DateOnly inicio)
    {
        var diasUteis = new List<DateOnly>();
        for (var dia = inicio; dia < _hoje; dia = dia.AddDays(1))
        {
            if (dia.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday) && !feriados.Contains(dia))
            {
                diasUteis.Add(dia);
            }
        }

        if (diasUteis.Count < 6)
        {
            return;
        }

        var exemplo = diasUteis[Math.Min(8, diasUteis.Count - 5)];
        Substituir(ana, exemplo, ["07:58", "12:00", "13:30", "18:47"]);

        var aprovado = diasUteis[^4];
        Substituir(ana, aprovado, ["12:01", "13:29", "18:04"]);
        Ajuste(ana, aprovado.ToDateTime(new TimeOnly(8, 0)), "Esqueci de registrar a entrada, cheguei às 8h e fui direto para a reunião.", anaUsuario, gestor, StatusAjuste.Aprovado, null);

        var rejeitado = diasUteis[^3];
        Ajuste(ana, rejeitado.ToDateTime(new TimeOnly(19, 30)), "Fiquei até mais tarde fechando o relatório mensal.", anaUsuario, gestor, StatusAjuste.Rejeitado,
            "Não há registro de acesso ao prédio depois das 18h nesse dia.");

        var pendente = diasUteis[^1];
        Substituir(ana, pendente, ["07:56", "12:02", "13:31"]);
        Ajuste(ana, pendente.ToDateTime(new TimeOnly(18, 0)), "Saí às 18h, mas o relógio estava sem conexão na hora da saída.", anaUsuario, null, StatusAjuste.Pendente, null);

        var sabado = Enumerable.Range(0, 40).Select(i => inicio.AddDays(i)).FirstOrDefault(d => d.DayOfWeek == DayOfWeek.Saturday && d < _hoje && !feriados.Contains(d));
        if (sabado != default)
        {
            Substituir(bruno, sabado, ["08:02", "12:05"]);
        }
    }

    private void Substituir(Funcionario funcionario, DateOnly dia, string[] horarios)
    {
        var inicioDia = dia.ToDateTime(new TimeOnly(4, 0));
        _marcacoes.RemoveAll(m => m.FuncionarioId == funcionario.Id && m.DataHora >= inicioDia && m.DataHora < inicioDia.AddDays(1));
        foreach (var horario in horarios)
        {
            Registrar(funcionario, dia.ToDateTime(Horario.Ler(horario)));
        }
    }

    private void Registrar(Funcionario funcionario, DateTime horario)
    {
        var minuto = new DateTime(horario.Year, horario.Month, horario.Day, horario.Hour, horario.Minute, 0, DateTimeKind.Unspecified);
        _marcacoes.Add(new Marcacao
        {
            FuncionarioId = funcionario.Id,
            DataHora = minuto,
            Origem = OrigemMarcacao.Registro,
            RegistradoEm = DateTime.SpecifyKind(minuto.AddHours(3), DateTimeKind.Utc)
        });
    }

    private void Ajuste(Funcionario funcionario, DateTime horario, string justificativa, Usuario solicitante, Usuario? decisor, StatusAjuste status, string? motivo)
    {
        var solicitadoEm = DateTime.SpecifyKind(horario.AddHours(15), DateTimeKind.Utc);
        _marcacoes.Add(new Marcacao
        {
            FuncionarioId = funcionario.Id,
            DataHora = horario,
            Origem = OrigemMarcacao.AjusteManual,
            RegistradoEm = solicitadoEm,
            TipoAjuste = TipoAjuste.Inclusao,
            Justificativa = justificativa,
            StatusAjuste = status,
            SolicitadoPorId = solicitante.Id,
            SolicitadoEm = solicitadoEm,
            DecididoPorId = decisor?.Id,
            DecididoEm = decisor is null ? null : solicitadoEm.AddHours(2),
            MotivoDecisao = motivo
        });
    }

    private Jornada Semanal(Empresa empresa, string nome, TimeOnly virada, Func<DayOfWeek, (string, string)[]> periodos)
    {
        var jornada = new Jornada { EmpresaId = empresa.Id, Nome = nome, Tipo = TipoJornada.Semanal, HoraVirada = virada };
        jornada.Dias = Enumerable.Range(0, 7).Select(i => Dia(jornada, i, periodos((DayOfWeek)i))).ToList();
        return jornada;
    }

    private static JornadaDia Dia(Jornada jornada, int indice, (string Entrada, string Saida)[] periodos)
    {
        var dia = new JornadaDia { JornadaId = jornada.Id, Indice = indice, Folga = periodos.Length == 0 };
        dia.Periodos = periodos.Select((p, i) => new JornadaPeriodo { JornadaDiaId = dia.Id, Ordem = i, Entrada = Horario.Ler(p.Entrada), Saida = Horario.Ler(p.Saida) }).ToList();
        return dia;
    }

    private Funcionario Funcionario(Empresa empresa, string matricula, string nome, string cargo, string departamento, Funcionario? gestor, DateOnly admissao, Jornada jornada, DateOnly? referenciaCiclo = null)
    {
        var funcionario = new Funcionario
        {
            EmpresaId = empresa.Id,
            Matricula = matricula,
            Nome = nome,
            Cpf = Cpf(),
            Pis = Pis(),
            Cargo = cargo,
            Departamento = departamento,
            CentroCusto = $"{departamento[..3].ToUpperInvariant()}-{_aleatorio.Next(10, 99)}",
            Email = $"{Texto.Normalizar(nome).Split(' ')[0]}.{Texto.Normalizar(nome).Split(' ')[^1]}@{(empresa.Municipio == "Campinas" ? "valeverde" : "aurora")}.example",
            DataAdmissao = admissao,
            GestorId = gestor?.Id
        };
        funcionario.Jornadas.Add(new FuncionarioJornada
        {
            FuncionarioId = funcionario.Id,
            JornadaId = jornada.Id,
            Jornada = jornada,
            VigenteDesde = admissao,
            DataReferenciaCiclo = jornada.Tipo == TipoJornada.Ciclica ? referenciaCiclo ?? admissao : null
        });
        db.Funcionarios.Add(funcionario);
        return funcionario;
    }

    private Usuario Usuario(string login, string nome, Perfil perfil, Funcionario? funcionario, string senha)
    {
        var usuario = new Usuario { Login = login, Nome = nome, Perfil = perfil, FuncionarioId = funcionario?.Id, SenhaPadrao = true };
        usuario.SenhaHash = hasher.Gerar(usuario, senha);
        db.Usuarios.Add(usuario);
        return usuario;
    }

    private string Cpf()
    {
        var baseCpf = string.Concat(Enumerable.Range(0, 9).Select(_ => _aleatorio.Next(0, 10)));
        var primeiro = DigitoMod11(baseCpf, 10);
        var segundo = DigitoMod11(baseCpf + primeiro, 11);
        return $"{baseCpf}{primeiro}{segundo}";
    }

    private string Pis()
    {
        var basePis = string.Concat(Enumerable.Range(0, 10).Select(_ => _aleatorio.Next(0, 10)));
        int[] pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        var soma = basePis.Select((c, i) => (c - '0') * pesos[i]).Sum();
        var resto = 11 - soma % 11;
        return $"{basePis}{(resto >= 10 ? 0 : resto)}";
    }

    private static int DigitoMod11(string numero, int pesoInicial)
    {
        var soma = numero.Select((c, i) => (c - '0') * (pesoInicial - i)).Sum();
        var resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    }

    private static string Cnpj(string raiz, string filial)
    {
        var baseCnpj = raiz + filial;
        int[] pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        int[] pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        var d1 = Digito(baseCnpj, pesos1);
        var d2 = Digito(baseCnpj + d1, pesos2);
        return $"{baseCnpj}{d1}{d2}";
    }

    private static int Digito(string numero, int[] pesos)
    {
        var soma = numero.Select((c, i) => (c - '0') * pesos[i]).Sum();
        var resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    }
}
