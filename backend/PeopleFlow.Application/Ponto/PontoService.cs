using FluentValidation;
using Microsoft.EntityFrameworkCore;
using PeopleFlow.Application.Abstractions;
using PeopleFlow.Application.Acesso;
using PeopleFlow.Application.Apuracao;
using PeopleFlow.Application.Comum;
using PeopleFlow.Domain.Apuracao;
using PeopleFlow.Domain.Comum;
using PeopleFlow.Domain.Ponto;
using PeopleFlow.Domain.Usuarios;
using ValidationException = PeopleFlow.Domain.Comum.ValidationException;

namespace PeopleFlow.Application.Ponto;

public sealed record PontoHojeDto(
    FuncionarioResumoDto Funcionario,
    DateTime Agora,
    DateOnly DiaReferencia,
    ApuracaoDiaDto Dia,
    DateTime? ProximoPrevisto,
    string? Jornada);

public sealed record RegistroPontoDto(Guid Id, DateTime DataHora, int Nsr, DateOnly DiaReferencia);

public sealed record SolicitarAjusteRequest(Guid FuncionarioId, TipoAjuste Tipo, DateTime? DataHora, Guid? MarcacaoAlvoId, string Justificativa);

public sealed record DecisaoAjusteRequest(string? Motivo);

public sealed record AjusteDto(
    Guid Id,
    FuncionarioResumoDto Funcionario,
    string Tipo,
    string Status,
    DateTime DataHora,
    DateOnly DiaReferencia,
    string Justificativa,
    string? SolicitadoPor,
    DateTime? SolicitadoEm,
    string? DecididoPor,
    DateTime? DecididoEm,
    string? MotivoDecisao,
    IReadOnlyList<DateTime> MarcacoesAntes,
    IReadOnlyList<DateTime> MarcacoesDepois,
    bool PodeDecidir,
    string? MotivoBloqueio);

public sealed class SolicitarAjusteValidator : AbstractValidator<SolicitarAjusteRequest>
{
    public SolicitarAjusteValidator()
    {
        RuleFor(x => x.FuncionarioId).NotEmpty().WithMessage("Informe o funcionário.");
        RuleFor(x => x.Justificativa)
            .NotEmpty().WithMessage("Escreva a justificativa do ajuste.")
            .MinimumLength(Marcacao.JustificativaMinima).WithMessage($"A justificativa precisa ter ao menos {Marcacao.JustificativaMinima} caracteres.")
            .MaximumLength(Marcacao.JustificativaMaxima).WithMessage($"A justificativa pode ter até {Marcacao.JustificativaMaxima} caracteres.");
        RuleFor(x => x.DataHora).NotNull().When(x => x.Tipo == TipoAjuste.Inclusao).WithMessage("Informe a data e a hora da marcação.");
        RuleFor(x => x.MarcacaoAlvoId).NotNull().When(x => x.Tipo == TipoAjuste.Desconsideracao).WithMessage("Escolha a marcação a desconsiderar.");
    }
}

public sealed class PontoService(IPeopleFlowDbContext db, AcessoService acesso, IUsuarioAtual usuario, ApuracaoService apuracao, Relogio relogio)
{
    public async Task<RegistroPontoDto> RegistrarAsync(CancellationToken ct)
    {
        var funcionarioId = usuario.FuncionarioId ?? throw new BusinessRuleException("Seu usuário não está ligado a um funcionário, então não registra ponto.");
        var funcionario = await db.Funcionarios.Include(f => f.Empresa).FirstOrDefaultAsync(f => f.Id == funcionarioId, ct)
            ?? throw new NotFoundException("Funcionário não encontrado.");
        if (!funcionario.Ativo)
        {
            throw new BusinessRuleException("Funcionário inativo não registra ponto.");
        }

        var empresa = funcionario.Empresa!;
        var agora = relogio.AgoraLocal(empresa);
        var politica = await db.Politicas.Where(p => p.EmpresaId == empresa.Id && p.VigenteDesde <= DateOnly.FromDateTime(agora))
            .OrderByDescending(p => p.VigenteDesde).ThenByDescending(p => p.Versao).FirstOrDefaultAsync(ct);
        var janela = Math.Max(1, politica?.JanelaDuplicidadeMinutos ?? 1);

        var ultima = await db.Marcacoes.Where(m => m.FuncionarioId == funcionarioId && m.Origem == OrigemMarcacao.Registro)
            .OrderByDescending(m => m.DataHora).FirstOrDefaultAsync(ct);
        if (ultima is not null && Math.Abs((agora - ultima.DataHora).TotalMinutes) < janela)
        {
            throw new ConflictException($"Você já registrou o ponto às {ultima.DataHora:HH:mm}. Aguarde {janela} minuto(s) para registrar de novo.");
        }

        empresa.UltimoNsr++;
        var marcacao = new Marcacao
        {
            FuncionarioId = funcionarioId,
            DataHora = agora,
            Nsr = empresa.UltimoNsr,
            Origem = OrigemMarcacao.Registro,
            RegistradoEm = relogio.AgoraUtc
        };
        db.Marcacoes.Add(marcacao);
        await db.SaveChangesAsync(ct);

        var contexto = await apuracao.CarregarContextoAsync(funcionarioId, DateOnly.FromDateTime(agora).AddDays(-1), DateOnly.FromDateTime(agora), ct);
        var dia = DistribuidorMarcacoes.DiaDeReferencia(agora, contexto!.Virada);
        await apuracao.RecalcularAsync([funcionarioId], dia.AddDays(-1), dia, ct);

        return new RegistroPontoDto(marcacao.Id, marcacao.DataHora, marcacao.Nsr, dia);
    }

    public async Task<PontoHojeDto> HojeAsync(CancellationToken ct)
    {
        var funcionarioId = usuario.FuncionarioId ?? throw new BusinessRuleException("Seu usuário não está ligado a um funcionário.");
        var funcionario = await acesso.ExigirFuncionarioAsync(funcionarioId, ct);
        var agora = relogio.AgoraLocal(funcionario.Empresa!);
        var hoje = DateOnly.FromDateTime(agora);

        var contexto = await apuracao.CarregarContextoAsync(funcionarioId, hoje.AddDays(-2), hoje.AddDays(1), ct)
            ?? throw new NotFoundException("Funcionário não encontrado.");
        var dia = DistribuidorMarcacoes.DiaDeReferencia(agora, contexto.Virada);
        var registro = await db.Apuracoes.AsNoTracking().FirstOrDefaultAsync(a => a.FuncionarioId == funcionarioId && a.Data == dia, ct);
        var nomes = await apuracao.NomesUsuariosAsync(contexto.Marcacoes, ct);
        var diaDto = apuracao.MontarDia(dia, registro, contexto, nomes, hoje);

        var proximo = contexto.PrevistoEm(dia).Concat(contexto.PrevistoEm(dia.AddDays(1)))
            .SelectMany(i => new[] { i.Inicio, i.Fim })
            .Where(h => h > agora)
            .Order()
            .Cast<DateTime?>()
            .FirstOrDefault();

        return new PontoHojeDto(ApuracaoService.Resumo(funcionario), agora, dia, diaDto, proximo, contexto.VinculoEm(dia)?.Jornada?.Nome);
    }

    public async Task<IReadOnlyList<MarcacaoDto>> MarcacoesAsync(Guid funcionarioId, DateOnly de, DateOnly ate, CancellationToken ct)
    {
        await acesso.ExigirFuncionarioAsync(funcionarioId, ct);
        var inicio = de.ToDateTime(TimeOnly.MinValue);
        var fim = ate.AddDays(1).ToDateTime(TimeOnly.MinValue);
        var marcacoes = await db.Marcacoes.AsNoTracking()
            .Where(m => m.FuncionarioId == funcionarioId && m.DataHora >= inicio && m.DataHora < fim)
            .OrderBy(m => m.DataHora)
            .ToListAsync(ct);
        var nomes = await apuracao.NomesUsuariosAsync(marcacoes, ct);
        var desconsideradas = marcacoes.Where(m => m is { TipoAjuste: TipoAjuste.Desconsideracao, StatusAjuste: StatusAjuste.Aprovado }).Select(m => m.MarcacaoAlvoId).ToHashSet();
        return marcacoes.Select(m => ApuracaoService.ParaDto(m, nomes, desconsideradas.Contains(m.Id))).ToList();
    }
}

public sealed class AjusteService(IPeopleFlowDbContext db, AcessoService acesso, IUsuarioAtual usuario, ApuracaoService apuracao, Relogio relogio)
{
    public async Task<AjusteDto> SolicitarAsync(SolicitarAjusteRequest request, CancellationToken ct)
    {
        var funcionario = await acesso.ExigirFuncionarioAsync(request.FuncionarioId, ct);
        var empresa = funcionario.Empresa!;
        var agora = relogio.AgoraLocal(empresa);

        DateTime dataHora;
        if (request.Tipo == TipoAjuste.Inclusao)
        {
            var informada = request.DataHora!.Value;
            dataHora = new DateTime(informada.Year, informada.Month, informada.Day, informada.Hour, informada.Minute, 0, DateTimeKind.Unspecified);
            if (dataHora > agora)
            {
                throw new ValidationException("dataHora", "Não dá para incluir uma marcação no futuro.");
            }

            if (DateOnly.FromDateTime(dataHora) < funcionario.DataAdmissao)
            {
                throw new ValidationException("dataHora", "A data é anterior à admissão do funcionário.");
            }

            var repetida = await db.Marcacoes.AnyAsync(m => m.FuncionarioId == funcionario.Id && m.DataHora == dataHora
                && (m.Origem == OrigemMarcacao.Registro || (m.TipoAjuste == TipoAjuste.Inclusao && m.StatusAjuste != StatusAjuste.Rejeitado)), ct);
            if (repetida)
            {
                throw new ConflictException($"Já existe uma marcação em {dataHora:dd/MM/yyyy HH:mm}.");
            }
        }
        else
        {
            var alvo = await db.Marcacoes.FirstOrDefaultAsync(m => m.Id == request.MarcacaoAlvoId && m.FuncionarioId == funcionario.Id, ct)
                ?? throw new NotFoundException("Marcação não encontrada.");
            var alvoValido = alvo.Origem == OrigemMarcacao.Registro || alvo is { TipoAjuste: TipoAjuste.Inclusao, StatusAjuste: StatusAjuste.Aprovado };
            if (!alvoValido)
            {
                throw new BusinessRuleException("Só dá para desconsiderar uma marcação registrada ou uma inclusão já aprovada.");
            }

            var jaExiste = await db.Marcacoes.AnyAsync(m => m.MarcacaoAlvoId == alvo.Id && m.StatusAjuste != StatusAjuste.Rejeitado, ct);
            if (jaExiste)
            {
                throw new ConflictException("Já existe um pedido para desconsiderar esta marcação.");
            }

            dataHora = alvo.DataHora;
        }

        var ajuste = new Marcacao
        {
            FuncionarioId = funcionario.Id,
            DataHora = dataHora,
            Origem = OrigemMarcacao.AjusteManual,
            RegistradoEm = relogio.AgoraUtc,
            TipoAjuste = request.Tipo,
            MarcacaoAlvoId = request.Tipo == TipoAjuste.Desconsideracao ? request.MarcacaoAlvoId : null,
            Justificativa = request.Justificativa.Trim(),
            StatusAjuste = StatusAjuste.Pendente,
            SolicitadoPorId = usuario.Id,
            SolicitadoEm = relogio.AgoraUtc
        };
        db.Marcacoes.Add(ajuste);
        await db.SaveChangesAsync(ct);

        var dia = await RecalcularEmTornoAsync(funcionario.Id, dataHora, ct);
        return await MontarAsync(ajuste, dia, ct);
    }

    public async Task<IReadOnlyList<AjusteDto>> ListarAsync(StatusAjuste? status, Guid? empresaId, Guid? funcionarioId, CancellationToken ct)
    {
        var visiveis = acesso.FuncionariosVisiveis().Select(f => f.Id);
        var consulta = db.Marcacoes.AsNoTracking()
            .Include(m => m.Funcionario).ThenInclude(f => f!.Empresa)
            .Where(m => m.Origem == OrigemMarcacao.AjusteManual && visiveis.Contains(m.FuncionarioId));
        if (status is not null)
        {
            consulta = consulta.Where(m => m.StatusAjuste == status);
        }

        if (empresaId is not null)
        {
            consulta = consulta.Where(m => m.Funcionario!.EmpresaId == empresaId);
        }

        if (funcionarioId is not null)
        {
            consulta = consulta.Where(m => m.FuncionarioId == funcionarioId);
        }

        var ajustes = await consulta.OrderByDescending(m => m.SolicitadoEm).Take(300).ToListAsync(ct);
        var resultado = new List<AjusteDto>();
        foreach (var ajuste in ajustes)
        {
            resultado.Add(await MontarAsync(ajuste, null, ct));
        }

        return resultado;
    }

    public async Task<AjusteDto> AprovarAsync(Guid id, DecisaoAjusteRequest request, CancellationToken ct) =>
        await DecidirAsync(id, StatusAjuste.Aprovado, request.Motivo, ct);

    public async Task<AjusteDto> RejeitarAsync(Guid id, DecisaoAjusteRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Motivo))
        {
            throw new ValidationException("motivo", "Informe o motivo da rejeição.");
        }

        return await DecidirAsync(id, StatusAjuste.Rejeitado, request.Motivo, ct);
    }

    private async Task<AjusteDto> DecidirAsync(Guid id, StatusAjuste decisao, string? motivo, CancellationToken ct)
    {
        var ajuste = await db.Marcacoes.Include(m => m.Funcionario).FirstOrDefaultAsync(m => m.Id == id && m.Origem == OrigemMarcacao.AjusteManual, ct)
            ?? throw new NotFoundException("Ajuste não encontrado.");
        await acesso.ExigirFuncionarioAsync(ajuste.FuncionarioId, ct);

        var bloqueio = MotivoBloqueio(ajuste);
        if (bloqueio is not null)
        {
            throw new BusinessRuleException(bloqueio);
        }

        ajuste.StatusAjuste = decisao;
        ajuste.DecididoPorId = usuario.Id;
        ajuste.DecididoEm = relogio.AgoraUtc;
        ajuste.MotivoDecisao = string.IsNullOrWhiteSpace(motivo) ? null : motivo.Trim();
        await db.SaveChangesAsync(ct);

        var dia = await RecalcularEmTornoAsync(ajuste.FuncionarioId, ajuste.DataHora, ct);
        return await MontarAsync(ajuste, dia, ct);
    }

    private string? MotivoBloqueio(Marcacao ajuste)
    {
        if (ajuste.StatusAjuste != StatusAjuste.Pendente)
        {
            return "Este ajuste já foi decidido.";
        }

        if (!acesso.PodeAprovar)
        {
            return "Seu perfil não aprova ajustes.";
        }

        if (ajuste.SolicitadoPorId == usuario.Id)
        {
            return "Quem pediu o ajuste não pode aprová-lo. Outra pessoa precisa decidir.";
        }

        if (usuario.Perfil == Perfil.Gestor && ajuste.FuncionarioId == usuario.FuncionarioId)
        {
            return "Um gestor não aprova ajustes do próprio ponto.";
        }

        return null;
    }

    private async Task<DateOnly> RecalcularEmTornoAsync(Guid funcionarioId, DateTime dataHora, CancellationToken ct)
    {
        var data = DateOnly.FromDateTime(dataHora);
        var contexto = await apuracao.CarregarContextoAsync(funcionarioId, data.AddDays(-1), data.AddDays(1), ct);
        var dia = DistribuidorMarcacoes.DiaDeReferencia(dataHora, contexto!.Virada);
        await apuracao.RecalcularAsync([funcionarioId], dia.AddDays(-1), dia.AddDays(1), ct);
        return dia;
    }

    private async Task<AjusteDto> MontarAsync(Marcacao ajuste, DateOnly? diaReferencia, CancellationToken ct)
    {
        var funcionario = ajuste.Funcionario ?? await db.Funcionarios.Include(f => f.Empresa).FirstAsync(f => f.Id == ajuste.FuncionarioId, ct);
        if (funcionario.Empresa is null)
        {
            funcionario.Empresa = await db.Empresas.FirstAsync(e => e.Id == funcionario.EmpresaId, ct);
        }

        var data = DateOnly.FromDateTime(ajuste.DataHora);
        var contexto = await apuracao.CarregarContextoAsync(ajuste.FuncionarioId, data.AddDays(-1), data.AddDays(1), ct);
        var dia = diaReferencia ?? DistribuidorMarcacoes.DiaDeReferencia(ajuste.DataHora, contexto!.Virada);
        var doDia = contexto!.MarcacoesDe(dia);
        var antes = Validas(doDia.Where(m => m.Id != ajuste.Id), null);
        var depois = Validas(doDia.Where(m => m.Id != ajuste.Id), ajuste);
        var nomes = await apuracao.NomesUsuariosAsync([ajuste], ct);

        return new AjusteDto(
            ajuste.Id,
            ApuracaoService.Resumo(funcionario),
            ajuste.TipoAjuste?.ToString() ?? string.Empty,
            ajuste.StatusAjuste?.ToString() ?? string.Empty,
            ajuste.DataHora,
            dia,
            ajuste.Justificativa ?? string.Empty,
            ajuste.SolicitadoPorId is { } s ? nomes.GetValueOrDefault(s) : null,
            ajuste.SolicitadoEm,
            ajuste.DecididoPorId is { } d ? nomes.GetValueOrDefault(d) : null,
            ajuste.DecididoEm,
            ajuste.MotivoDecisao,
            antes,
            depois,
            MotivoBloqueio(ajuste) is null,
            ajuste.StatusAjuste == StatusAjuste.Pendente ? MotivoBloqueio(ajuste) : null);
    }

    private static List<DateTime> Validas(IEnumerable<Marcacao> marcacoes, Marcacao? aplicar)
    {
        var lista = marcacoes.ToList();
        var desconsideradas = lista
            .Where(m => m is { TipoAjuste: TipoAjuste.Desconsideracao, StatusAjuste: StatusAjuste.Aprovado })
            .Select(m => m.MarcacaoAlvoId)
            .ToHashSet();
        if (aplicar is { TipoAjuste: TipoAjuste.Desconsideracao })
        {
            desconsideradas.Add(aplicar.MarcacaoAlvoId);
        }

        var validas = lista
            .Where(m => m.Origem == OrigemMarcacao.Registro || m is { TipoAjuste: TipoAjuste.Inclusao, StatusAjuste: StatusAjuste.Aprovado })
            .Where(m => !desconsideradas.Contains(m.Id))
            .Select(m => m.DataHora)
            .ToList();
        if (aplicar is { TipoAjuste: TipoAjuste.Inclusao })
        {
            validas.Add(aplicar.DataHora);
        }

        return validas.Order().ToList();
    }
}
