using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using PeopleFlow.Application.Abstractions;
using PeopleFlow.Application.Acesso;
using PeopleFlow.Application.Comum;
using PeopleFlow.Domain.Apuracao;
using PeopleFlow.Domain.BancoHoras;
using PeopleFlow.Domain.Comum;
using PeopleFlow.Domain.Empresas;
using PeopleFlow.Domain.Feriados;
using PeopleFlow.Domain.Funcionarios;
using PeopleFlow.Domain.Ponto;

namespace PeopleFlow.Application.Apuracao;

public sealed class ApuracaoService(IPeopleFlowDbContext db, AcessoService acesso, Relogio relogio)
{
    public const int JanelaMaximaDias = 400;

    private static readonly TimeOnly ViradaPadrao = new(4, 0);

    internal static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    public async Task<int> RecalcularAsync(IEnumerable<Guid> funcionarioIds, DateOnly de, DateOnly ate, CancellationToken ct)
    {
        var dias = 0;
        foreach (var funcionarioId in funcionarioIds.Distinct().ToList())
        {
            dias += await RecalcularFuncionarioAsync(funcionarioId, de, ate, ct);
        }

        return dias;
    }

    public async Task<int> RecalcularEmpresaAsync(Guid empresaId, DateOnly de, DateOnly ate, CancellationToken ct)
    {
        var ids = await db.Funcionarios.Where(f => f.EmpresaId == empresaId).Select(f => f.Id).ToListAsync(ct);
        return await RecalcularAsync(ids, de, ate, ct);
    }

    public async Task<ReprocessamentoDto> ReprocessarAsync(ReprocessarRequest request, CancellationToken ct)
    {
        acesso.ExigirGestaoDeCadastros();
        await acesso.ExigirEmpresaAsync(request.EmpresaId, ct);
        if (request.Ate < request.De)
        {
            throw new ValidationException("ate", "A data final precisa ser igual ou posterior à inicial.");
        }

        if (request.Ate.DayNumber - request.De.DayNumber > JanelaMaximaDias)
        {
            throw new ValidationException("de", $"Reprocesse no máximo {JanelaMaximaDias} dias por vez.");
        }

        var ids = await db.Funcionarios.Where(f => f.EmpresaId == request.EmpresaId).Select(f => f.Id).ToListAsync(ct);
        var dias = await RecalcularAsync(ids, request.De, request.Ate, ct);
        return new ReprocessamentoDto(ids.Count, dias);
    }

    private async Task<int> RecalcularFuncionarioAsync(Guid funcionarioId, DateOnly de, DateOnly ate, CancellationToken ct)
    {
        var contexto = await CarregarContextoAsync(funcionarioId, de.AddDays(-1), ate.AddDays(1), ct);
        if (contexto is null)
        {
            return 0;
        }

        var funcionario = contexto.Funcionario;
        var hoje = relogio.Hoje(funcionario.Empresa!);
        var fim = ate < hoje ? ate : hoje;

        var registros = await db.Apuracoes.Where(a => a.FuncionarioId == funcionarioId && a.Data >= de && a.Data <= ate).ToDictionaryAsync(a => a.Data, ct);
        var lancamentos = await db.LancamentosBanco
            .Where(l => l.FuncionarioId == funcionarioId && l.Tipo == TipoLancamentoBanco.Apuracao && l.Data >= de && l.Data <= ate)
            .ToDictionaryAsync(l => l.Data, ct);

        var calculados = 0;
        for (var dia = de; dia <= ate; dia = dia.AddDays(1))
        {
            var entrada = dia <= fim ? contexto.Entrada(dia) : null;
            var marcacoesDoDia = contexto.MarcacoesDe(dia);
            if (entrada is null || (dia == hoje && marcacoesDoDia.Count == 0))
            {
                Remover(registros, lancamentos, dia);
                continue;
            }

            var resultado = MotorApuracao.Apurar(entrada.Value.Entrada);
            if (dia == hoje)
            {
                resultado.Provisorio = true;
            }

            Gravar(registros, funcionarioId, resultado, entrada.Value);
            GravarBanco(lancamentos, funcionarioId, resultado, entrada.Value.Politica);
            calculados++;
        }

        await db.SaveChangesAsync(ct);
        return calculados;
    }

    private void Remover(Dictionary<DateOnly, ApuracaoDiaRegistro> registros, Dictionary<DateOnly, BancoHorasLancamento> lancamentos, DateOnly dia)
    {
        if (registros.Remove(dia, out var registro))
        {
            db.Apuracoes.Remove(registro);
        }

        if (lancamentos.Remove(dia, out var lancamento))
        {
            db.LancamentosBanco.Remove(lancamento);
        }
    }

    private void Gravar(Dictionary<DateOnly, ApuracaoDiaRegistro> registros, Guid funcionarioId, ApuracaoDia r, EntradaCalculada entrada)
    {
        if (!registros.TryGetValue(r.Data, out var registro))
        {
            registro = new ApuracaoDiaRegistro { FuncionarioId = funcionarioId, Data = r.Data };
            db.Apuracoes.Add(registro);
            registros[r.Data] = registro;
        }

        registro.TipoDia = r.TipoDia;
        registro.Situacao = r.Situacao;
        registro.Provisorio = r.Provisorio;
        registro.PrevistoMinutos = r.PrevistoMinutos;
        registro.TrabalhadoMinutos = r.TrabalhadoMinutos;
        registro.ExtrasMinutos = r.ExtrasMinutos;
        registro.ExtrasPercentual = r.ExtrasPercentual;
        registro.ExtrasNoturnasMinutos = r.ExtrasNoturnasMinutos;
        registro.AtrasoMinutos = r.AtrasoMinutos;
        registro.SaidaAntecipadaMinutos = r.SaidaAntecipadaMinutos;
        registro.AusenciaParcialMinutos = r.AusenciaParcialMinutos;
        registro.FaltaMinutos = r.FaltaMinutos;
        registro.NoturnoRealMinutos = r.NoturnoRealMinutos;
        registro.NoturnoFictoMinutos = r.NoturnoFictoMinutos;
        registro.IntervaloRealMinutos = r.IntervaloRealMinutos;
        registro.IntervaloSuprimidoMinutos = r.IntervaloSuprimidoMinutos;
        registro.ToleranciaDesconsideradaMinutos = r.ToleranciaDesconsideradaMinutos;
        registro.SaldoMinutos = r.SaldoMinutos;
        registro.CreditoBancoMinutos = r.CreditoBancoMinutos;
        registro.DebitoBancoMinutos = r.DebitoBancoMinutos;
        registro.ExtrasAPagarMinutos = r.ExtrasAPagarMinutos;
        registro.DescontoMinutos = r.DescontoMinutos;
        registro.InconsistenciasJson = JsonSerializer.Serialize(r.Inconsistencias, Json);
        registro.RegrasJson = JsonSerializer.Serialize(r.Regras, Json);
        registro.SegmentosJson = JsonSerializer.Serialize(r.Segmentos.Select(s => new SegmentoDto(s.Inicio, s.Fim, s.Classe.ToString())), Json);
        registro.PrevistoJson = JsonSerializer.Serialize(r.PrevistoIntervalos.Select(i => new IntervaloDto(i.Inicio, i.Fim)), Json);
        registro.PoliticaId = entrada.Politica.Id;
        registro.JornadaId = entrada.JornadaId;
        registro.VersaoMotor = MotorApuracao.Versao;
        registro.CalculadoEm = relogio.AgoraUtc;
    }

    private void GravarBanco(Dictionary<DateOnly, BancoHorasLancamento> lancamentos, Guid funcionarioId, ApuracaoDia r, PoliticaEmpresa politica)
    {
        var minutos = r.Provisorio ? 0 : r.CreditoBancoMinutos - r.DebitoBancoMinutos;
        if (minutos == 0)
        {
            if (lancamentos.Remove(r.Data, out var existente))
            {
                db.LancamentosBanco.Remove(existente);
            }

            return;
        }

        if (!lancamentos.TryGetValue(r.Data, out var lancamento))
        {
            lancamento = new BancoHorasLancamento { FuncionarioId = funcionarioId, Data = r.Data, Tipo = TipoLancamentoBanco.Apuracao };
            db.LancamentosBanco.Add(lancamento);
            lancamentos[r.Data] = lancamento;
        }

        lancamento.Minutos = minutos;
        lancamento.Descricao = $"Apuração de {r.Data:dd/MM/yyyy}";
        lancamento.VenceEm = minutos > 0 ? r.Data.AddMonths(politica.ValidadeBancoMeses) : null;
    }

    public async Task<EspelhoDto> EspelhoAsync(Guid funcionarioId, string? competencia, CancellationToken ct)
    {
        var funcionario = await acesso.ExigirFuncionarioAsync(funcionarioId, ct);
        var hoje = relogio.Hoje(funcionario.Empresa!);
        var (inicio, fim) = Competencia.Intervalo(competencia, hoje);

        var contexto = await CarregarContextoAsync(funcionarioId, inicio.AddDays(-1), fim.AddDays(1), ct)
            ?? throw new NotFoundException("Funcionário não encontrado.");
        var registros = await db.Apuracoes.AsNoTracking().Where(a => a.FuncionarioId == funcionarioId && a.Data >= inicio && a.Data <= fim).ToDictionaryAsync(a => a.Data, ct);
        var nomes = await NomesUsuariosAsync(contexto.Marcacoes, ct);

        var dias = new List<ApuracaoDiaDto>();
        for (var dia = inicio; dia <= fim; dia = dia.AddDays(1))
        {
            registros.TryGetValue(dia, out var registro);
            dias.Add(MontarDia(dia, registro, contexto, nomes, hoje));
        }

        var totais = ConsolidadorPeriodo.Consolidar(registros.Values.Where(r => r.Data != hoje).Select(ParaDominio).ToList());
        var saldo = await db.LancamentosBanco.Where(l => l.FuncionarioId == funcionarioId).SumAsync(l => (int?)l.Minutos, ct) ?? 0;
        var pendentes = await db.Marcacoes.CountAsync(m => m.FuncionarioId == funcionarioId && m.StatusAjuste == StatusAjuste.Pendente, ct);

        return new EspelhoDto(Resumo(funcionario), Competencia.Formatar(inicio), dias, totais, saldo, pendentes);
    }

    public async Task<DetalheDiaDto> DetalheDiaAsync(Guid funcionarioId, DateOnly data, CancellationToken ct)
    {
        var funcionario = await acesso.ExigirFuncionarioAsync(funcionarioId, ct);
        var hoje = relogio.Hoje(funcionario.Empresa!);
        var contexto = await CarregarContextoAsync(funcionarioId, data.AddDays(-1), data.AddDays(1), ct)
            ?? throw new NotFoundException("Funcionário não encontrado.");
        var registro = await db.Apuracoes.AsNoTracking().FirstOrDefaultAsync(a => a.FuncionarioId == funcionarioId && a.Data == data, ct);
        var nomes = await NomesUsuariosAsync(contexto.Marcacoes, ct);
        var dia = MontarDia(data, registro, contexto, nomes, hoje);

        var segmentos = registro is null ? [] : JsonSerializer.Deserialize<List<SegmentoDto>>(registro.SegmentosJson, Json) ?? [];
        var regras = registro is null
            ? []
            : (JsonSerializer.Deserialize<List<RegraAplicada>>(registro.RegrasJson, Json) ?? []).Select(ExplicadorRegras.Explicar).ToList();
        var vinculo = contexto.VinculoEm(data);
        int? politicaVersao = registro?.PoliticaId is { } politicaId
            ? contexto.Politicas.FirstOrDefault(p => p.Id == politicaId)?.Versao
            : contexto.PoliticaEm(data)?.Versao;

        return new DetalheDiaDto(dia, segmentos, regras, vinculo?.Jornada?.Nome, politicaVersao, registro?.VersaoMotor ?? MotorApuracao.Versao, registro?.CalculadoEm);
    }

    public async Task<ResumoEmpresaDto> ResumoEmpresaAsync(Guid empresaId, string? competencia, CancellationToken ct)
    {
        var empresa = await acesso.ExigirEmpresaAsync(empresaId, ct);
        var hoje = relogio.Hoje(empresa);
        var (inicio, fim) = Competencia.Intervalo(competencia, hoje);

        var funcionarios = await acesso.FuncionariosVisiveis()
            .Where(f => f.EmpresaId == empresaId && f.DataAdmissao <= fim && (f.DataDemissao == null || f.DataDemissao >= inicio))
            .OrderBy(f => f.Nome)
            .ToListAsync(ct);
        var ids = funcionarios.Select(f => f.Id).ToList();

        var registros = await db.Apuracoes.AsNoTracking()
            .Where(a => ids.Contains(a.FuncionarioId) && a.Data >= inicio && a.Data <= fim && a.Data != hoje)
            .ToListAsync(ct);
        var saldos = await db.LancamentosBanco.Where(l => ids.Contains(l.FuncionarioId))
            .GroupBy(l => l.FuncionarioId)
            .Select(g => new { g.Key, Saldo = g.Sum(l => l.Minutos) })
            .ToDictionaryAsync(x => x.Key, x => x.Saldo, ct);
        var pendentes = await db.Marcacoes.Where(m => ids.Contains(m.FuncionarioId) && m.StatusAjuste == StatusAjuste.Pendente)
            .GroupBy(m => m.FuncionarioId)
            .Select(g => new { g.Key, Total = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Total, ct);

        var porFuncionario = registros.GroupBy(r => r.FuncionarioId).ToDictionary(g => g.Key, g => g.Select(ParaDominio).ToList());
        var linhas = funcionarios.Select(f => new ResumoEmpresaLinhaDto(
            f.Id,
            f.Nome,
            f.Matricula,
            f.Cargo,
            ConsolidadorPeriodo.Consolidar(porFuncionario.GetValueOrDefault(f.Id) ?? []),
            saldos.GetValueOrDefault(f.Id),
            pendentes.GetValueOrDefault(f.Id))).ToList();

        return new ResumoEmpresaDto(empresa.Id, empresa.NomeFantasia, Competencia.Formatar(inicio), linhas, ConsolidadorPeriodo.Consolidar(registros.Select(ParaDominio).ToList()));
    }

    public static FuncionarioResumoDto Resumo(Funcionario f) =>
        new(f.Id, f.Nome, f.Matricula, f.Cargo, f.EmpresaId, f.Empresa?.NomeFantasia ?? string.Empty);

    internal ApuracaoDiaDto MontarDia(DateOnly dia, ApuracaoDiaRegistro? registro, ContextoApuracao contexto, IReadOnlyDictionary<Guid, string> nomes, DateOnly hoje)
    {
        var marcacoes = contexto.MarcacoesDe(dia);
        var desconsideradas = marcacoes
            .Where(m => m is { TipoAjuste: TipoAjuste.Desconsideracao, StatusAjuste: StatusAjuste.Aprovado, MarcacaoAlvoId: not null })
            .Select(m => m.MarcacaoAlvoId!.Value)
            .ToHashSet();
        var marcacoesDto = marcacoes.OrderBy(m => m.DataHora).ThenBy(m => m.RegistradoEm)
            .Select(m => ParaDto(m, nomes, desconsideradas.Contains(m.Id)))
            .ToList();

        var feriado = contexto.FeriadoEm(dia);
        var previsto = registro is not null
            ? JsonSerializer.Deserialize<List<IntervaloDto>>(registro.PrevistoJson, Json) ?? []
            : contexto.PrevistoEm(dia).Select(i => new IntervaloDto(i.Inicio, i.Fim)).ToList();

        if (registro is null)
        {
            var tipo = previsto.Count == 0 ? TipoDia.Descanso : feriado is not null ? TipoDia.Feriado : TipoDia.Util;
            var previstoMinutos = tipo == TipoDia.Util ? previsto.Sum(i => (int)(i.Fim - i.Inicio).TotalMinutes) : 0;
            return new ApuracaoDiaDto(dia, false, tipo.ToString(), string.Empty, false, dia == hoje,
                previstoMinutos, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                [], marcacoesDto, previsto, feriado is not null, feriado?.Nome);
        }

        var inconsistencias = (JsonSerializer.Deserialize<List<Inconsistencia>>(registro.InconsistenciasJson, Json) ?? [])
            .Select(ExplicadorRegras.Inconsistencia)
            .ToList();

        return new ApuracaoDiaDto(
            dia, true, registro.TipoDia.ToString(), registro.Situacao.ToString(), registro.Provisorio, dia == hoje,
            registro.PrevistoMinutos, registro.TrabalhadoMinutos, registro.ExtrasMinutos, registro.ExtrasPercentual,
            registro.ExtrasNoturnasMinutos, registro.AtrasoMinutos, registro.SaidaAntecipadaMinutos, registro.AusenciaParcialMinutos,
            registro.FaltaMinutos, registro.NoturnoRealMinutos, registro.NoturnoFictoMinutos, registro.IntervaloRealMinutos,
            registro.IntervaloSuprimidoMinutos, registro.ToleranciaDesconsideradaMinutos, registro.SaldoMinutos,
            registro.CreditoBancoMinutos, registro.DebitoBancoMinutos, registro.ExtrasAPagarMinutos, registro.DescontoMinutos,
            inconsistencias, marcacoesDto, previsto, feriado is not null, feriado?.Nome);
    }

    internal static MarcacaoDto ParaDto(Marcacao m, IReadOnlyDictionary<Guid, string> nomes, bool desconsiderada) => new(
        m.Id,
        m.DataHora,
        m.Nsr,
        m.Origem.ToString(),
        m.TipoAjuste?.ToString(),
        m.StatusAjuste?.ToString(),
        m.Justificativa,
        m.MarcacaoAlvoId,
        m.SolicitadoPorId is { } solicitante ? nomes.GetValueOrDefault(solicitante) : null,
        m.SolicitadoEm,
        m.DecididoPorId is { } decisor ? nomes.GetValueOrDefault(decisor) : null,
        m.DecididoEm,
        m.MotivoDecisao,
        desconsiderada);

    internal async Task<IReadOnlyDictionary<Guid, string>> NomesUsuariosAsync(IEnumerable<Marcacao> marcacoes, CancellationToken ct)
    {
        var ids = marcacoes.SelectMany(m => new[] { m.SolicitadoPorId, m.DecididoPorId }).Where(id => id is not null).Select(id => id!.Value).Distinct().ToList();
        if (ids.Count == 0)
        {
            return new Dictionary<Guid, string>();
        }

        return await db.Usuarios.Where(u => ids.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.Nome, ct);
    }

    private static ApuracaoDia ParaDominio(ApuracaoDiaRegistro r) => new()
    {
        Data = r.Data,
        TipoDia = r.TipoDia,
        Situacao = r.Situacao,
        Provisorio = r.Provisorio,
        PrevistoMinutos = r.PrevistoMinutos,
        TrabalhadoMinutos = r.TrabalhadoMinutos,
        ExtrasMinutos = r.ExtrasMinutos,
        ExtrasPercentual = r.ExtrasPercentual,
        ExtrasNoturnasMinutos = r.ExtrasNoturnasMinutos,
        AtrasoMinutos = r.AtrasoMinutos,
        SaidaAntecipadaMinutos = r.SaidaAntecipadaMinutos,
        AusenciaParcialMinutos = r.AusenciaParcialMinutos,
        FaltaMinutos = r.FaltaMinutos,
        NoturnoRealMinutos = r.NoturnoRealMinutos,
        NoturnoFictoMinutos = r.NoturnoFictoMinutos,
        IntervaloRealMinutos = r.IntervaloRealMinutos,
        IntervaloSuprimidoMinutos = r.IntervaloSuprimidoMinutos,
        ToleranciaDesconsideradaMinutos = r.ToleranciaDesconsideradaMinutos,
        SaldoMinutos = r.SaldoMinutos,
        CreditoBancoMinutos = r.CreditoBancoMinutos,
        DebitoBancoMinutos = r.DebitoBancoMinutos,
        ExtrasAPagarMinutos = r.ExtrasAPagarMinutos,
        DescontoMinutos = r.DescontoMinutos
    };

    internal async Task<ContextoApuracao?> CarregarContextoAsync(Guid funcionarioId, DateOnly de, DateOnly ate, CancellationToken ct)
    {
        var funcionario = await db.Funcionarios
            .Include(f => f.Empresa)
            .Include(f => f.Jornadas).ThenInclude(v => v.Jornada).ThenInclude(j => j!.Dias).ThenInclude(d => d.Periodos)
            .AsSplitQuery()
            .FirstOrDefaultAsync(f => f.Id == funcionarioId, ct);
        if (funcionario?.Empresa is null)
        {
            return null;
        }

        var politicas = await db.Politicas.AsNoTracking().Where(p => p.EmpresaId == funcionario.EmpresaId).OrderBy(p => p.VigenteDesde).ThenBy(p => p.Versao).ToListAsync(ct);
        var feriados = (await db.Feriados.AsNoTracking().Where(f => f.Data >= de.AddDays(-1) && f.Data <= ate.AddDays(1)).ToListAsync(ct))
            .Where(f => f.ValeParaEmpresa(funcionario.Empresa))
            .ToList();
        var inicio = de.AddDays(-1).ToDateTime(TimeOnly.MinValue);
        var termino = ate.AddDays(2).ToDateTime(TimeOnly.MinValue);
        var marcacoes = await db.Marcacoes.AsNoTracking()
            .Where(m => m.FuncionarioId == funcionarioId && m.DataHora >= inicio && m.DataHora < termino)
            .ToListAsync(ct);

        return new ContextoApuracao(funcionario, politicas, feriados, marcacoes);
    }

    internal readonly record struct EntradaCalculada(EntradaApuracaoDia Entrada, PoliticaEmpresa Politica, Guid JornadaId);

    internal sealed class ContextoApuracao
    {
        private readonly Dictionary<DateOnly, List<Marcacao>> _porDia;

        public ContextoApuracao(Funcionario funcionario, List<PoliticaEmpresa> politicas, List<Feriado> feriados, List<Marcacao> marcacoes)
        {
            Funcionario = funcionario;
            Politicas = politicas;
            Feriados = feriados;
            Marcacoes = marcacoes;
            _porDia = DistribuidorMarcacoes.Distribuir(marcacoes, m => m.DataHora, Virada);
        }

        public Funcionario Funcionario { get; }

        public List<PoliticaEmpresa> Politicas { get; }

        public List<Feriado> Feriados { get; }

        public List<Marcacao> Marcacoes { get; }

        public FuncionarioJornada? VinculoEm(DateOnly dia) =>
            Funcionario.Jornadas.Where(v => v.VigenteEm(dia)).OrderByDescending(v => v.VigenteDesde).FirstOrDefault();

        public PoliticaEmpresa? PoliticaEm(DateOnly dia) =>
            Politicas.LastOrDefault(p => p.VigenteDesde <= dia) ?? Politicas.FirstOrDefault();

        public Feriado? FeriadoEm(DateOnly dia) => Feriados.FirstOrDefault(f => f.Data == dia);

        public TimeOnly Virada(DateOnly dia) => VinculoEm(dia)?.Jornada?.HoraVirada ?? ViradaPadrao;

        public List<Marcacao> MarcacoesDe(DateOnly dia) => _porDia.GetValueOrDefault(dia) ?? [];

        public List<Intervalo> PrevistoEm(DateOnly dia)
        {
            var vinculo = VinculoEm(dia);
            return vinculo?.Jornada is null || !Funcionario.AtivoEm(dia)
                ? []
                : ResolvedorJornada.Prever(vinculo.Jornada, vinculo.DataReferenciaCiclo, dia);
        }

        public EntradaCalculada? Entrada(DateOnly dia)
        {
            if (!Funcionario.AtivoEm(dia))
            {
                return null;
            }

            var vinculo = VinculoEm(dia);
            var politica = PoliticaEm(dia);
            if (vinculo?.Jornada is null || politica is null)
            {
                return null;
            }

            var previsto = ResolvedorJornada.Prever(vinculo.Jornada, vinculo.DataReferenciaCiclo, dia);
            var entrada = new EntradaApuracaoDia(
                dia,
                previsto,
                MarcacoesDe(dia).Select(ParaApuracao).ToList(),
                politica.ParaApuracao(),
                FeriadoEm(dia) is not null,
                vinculo.Jornada.FeriadosCompensados,
                null,
                UltimaSaida(dia.AddDays(-1)));

            return new EntradaCalculada(entrada, politica, vinculo.JornadaId);
        }

        private DateTime? UltimaSaida(DateOnly dia)
        {
            var marcacoes = MarcacoesDe(dia);
            var desconsideradas = marcacoes
                .Where(m => m is { TipoAjuste: TipoAjuste.Desconsideracao, StatusAjuste: StatusAjuste.Aprovado, MarcacaoAlvoId: not null })
                .Select(m => m.MarcacaoAlvoId!.Value)
                .ToHashSet();
            var validas = marcacoes
                .Where(m => m.Origem == OrigemMarcacao.Registro || m is { StatusAjuste: StatusAjuste.Aprovado, TipoAjuste: TipoAjuste.Inclusao })
                .Where(m => !desconsideradas.Contains(m.Id))
                .OrderBy(m => m.DataHora)
                .ToList();
            return validas.Count >= 2 && validas.Count % 2 == 0 ? validas[^1].DataHora : null;
        }

        private static MarcacaoApurada ParaApuracao(Marcacao m) =>
            new(m.Id, m.DataHora, m.Origem, m.TipoAjuste, m.StatusAjuste, m.MarcacaoAlvoId);
    }
}
