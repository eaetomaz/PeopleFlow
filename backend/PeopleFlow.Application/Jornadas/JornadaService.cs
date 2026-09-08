using FluentValidation;
using Microsoft.EntityFrameworkCore;
using PeopleFlow.Application.Abstractions;
using PeopleFlow.Application.Acesso;
using PeopleFlow.Application.Apuracao;
using PeopleFlow.Application.Comum;
using PeopleFlow.Domain.Apuracao;
using PeopleFlow.Domain.Comum;
using PeopleFlow.Domain.Jornadas;
using ValidationException = PeopleFlow.Domain.Comum.ValidationException;

namespace PeopleFlow.Application.Jornadas;

public sealed record PeriodoDto(string Entrada, string Saida);

public sealed record JornadaDiaDto(int Indice, bool Folga, IReadOnlyList<PeriodoDto> Periodos, int CargaMinutos);

public sealed record JornadaDto(
    Guid Id,
    Guid EmpresaId,
    string Nome,
    TipoJornada Tipo,
    string HoraVirada,
    bool FeriadosCompensados,
    bool Ativa,
    int CargaCicloMinutos,
    IReadOnlyList<JornadaDiaDto> Dias,
    int FuncionariosVinculados);

public sealed record SalvarJornadaRequest(Guid EmpresaId, string Nome, TipoJornada Tipo, string HoraVirada, bool FeriadosCompensados, bool Ativa, IReadOnlyList<SalvarJornadaDiaRequest> Dias);

public sealed record SalvarJornadaDiaRequest(int Indice, bool Folga, IReadOnlyList<PeriodoDto> Periodos);

public sealed record PrevisaoDiaDto(DateOnly Data, bool Folga, IReadOnlyList<IntervaloDto> Periodos, int CargaMinutos);

public sealed class SalvarJornadaValidator : AbstractValidator<SalvarJornadaRequest>
{
    public SalvarJornadaValidator()
    {
        RuleFor(x => x.EmpresaId).NotEmpty().WithMessage("Escolha a empresa.");
        RuleFor(x => x.Nome).NotEmpty().WithMessage("Dê um nome para a jornada.").MaximumLength(80);
        RuleFor(x => x.HoraVirada).Must(Horario.Valido).WithMessage("Hora inválida (use HH:mm).");
        RuleFor(x => x.Dias).NotEmpty().WithMessage("Informe os dias da jornada.");
        RuleFor(x => x.Dias.Count).LessThanOrEqualTo(28).WithMessage("O ciclo pode ter no máximo 28 dias.");
        RuleForEach(x => x.Dias).ChildRules(dia =>
        {
            dia.RuleForEach(d => d.Periodos).ChildRules(periodo =>
            {
                periodo.RuleFor(p => p.Entrada).Must(Horario.Valido).WithMessage("Hora inválida (use HH:mm).");
                periodo.RuleFor(p => p.Saida).Must(Horario.Valido).WithMessage("Hora inválida (use HH:mm).");
            });
            dia.RuleFor(d => d.Periodos.Count).LessThanOrEqualTo(4).WithMessage("Use no máximo 4 períodos por dia.");
        });
    }
}

public sealed class JornadaService(IPeopleFlowDbContext db, AcessoService acesso, ApuracaoService apuracao, Relogio relogio)
{
    public async Task<IReadOnlyList<JornadaDto>> ListarAsync(Guid? empresaId, CancellationToken ct)
    {
        var empresas = acesso.EmpresasVisiveis().Select(e => e.Id);
        var consulta = db.Jornadas.AsNoTracking().Include(j => j.Dias).ThenInclude(d => d.Periodos).Where(j => empresas.Contains(j.EmpresaId));
        if (empresaId is not null)
        {
            consulta = consulta.Where(j => j.EmpresaId == empresaId);
        }

        var jornadas = await consulta.OrderBy(j => j.Nome).AsSplitQuery().ToListAsync(ct);
        var ids = jornadas.Select(j => j.Id).ToList();
        var hoje = relogio.HojePadrao;
        var vinculados = await db.FuncionarioJornadas
            .Where(v => ids.Contains(v.JornadaId) && v.VigenteDesde <= hoje && (v.VigenteAte == null || v.VigenteAte >= hoje))
            .GroupBy(v => v.JornadaId).Select(g => new { g.Key, Total = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Total, ct);
        return jornadas.Select(j => Mapear(j, vinculados.GetValueOrDefault(j.Id))).ToList();
    }

    public async Task<JornadaDto> ObterAsync(Guid id, CancellationToken ct)
    {
        var jornada = await CarregarAsync(id, ct);
        var hoje = relogio.HojePadrao;
        var total = await db.FuncionarioJornadas.CountAsync(v => v.JornadaId == id && v.VigenteDesde <= hoje && (v.VigenteAte == null || v.VigenteAte >= hoje), ct);
        return Mapear(jornada, total);
    }

    public async Task<JornadaDto> CriarAsync(SalvarJornadaRequest request, CancellationToken ct)
    {
        acesso.ExigirGestaoDeCadastros();
        await acesso.ExigirEmpresaAsync(request.EmpresaId, ct);
        var jornada = new Jornada { EmpresaId = request.EmpresaId };
        Aplicar(jornada, request);
        Validar(jornada);
        db.Jornadas.Add(jornada);
        await db.SaveChangesAsync(ct);
        return Mapear(jornada, 0);
    }

    public async Task<JornadaDto> AtualizarAsync(Guid id, SalvarJornadaRequest request, CancellationToken ct)
    {
        acesso.ExigirGestaoDeCadastros();
        var jornada = await db.Jornadas.Include(j => j.Dias).ThenInclude(d => d.Periodos).AsSplitQuery().FirstOrDefaultAsync(j => j.Id == id, ct)
            ?? throw new NotFoundException("Jornada não encontrada.");
        if (request.EmpresaId != jornada.EmpresaId)
        {
            throw new BusinessRuleException("A jornada não pode mudar de empresa.");
        }

        foreach (var dia in jornada.Dias)
        {
            db.JornadaPeriodos.RemoveRange(dia.Periodos);
        }

        db.JornadaDias.RemoveRange(jornada.Dias);
        jornada.Dias = [];
        Aplicar(jornada, request);
        Validar(jornada);
        foreach (var dia in jornada.Dias)
        {
            db.JornadaDias.Add(dia);
            db.JornadaPeriodos.AddRange(dia.Periodos);
        }

        await db.SaveChangesAsync(ct);

        var funcionarios = await db.FuncionarioJornadas.Where(v => v.JornadaId == id).Select(v => v.FuncionarioId).Distinct().ToListAsync(ct);
        var hoje = relogio.HojePadrao;
        await apuracao.RecalcularAsync(funcionarios, hoje.AddDays(-ApuracaoService.JanelaMaximaDias), hoje, ct);
        return await ObterAsync(id, ct);
    }

    public async Task<IReadOnlyList<PrevisaoDiaDto>> PrevisaoAsync(Guid id, DateOnly de, DateOnly ate, DateOnly? referenciaCiclo, CancellationToken ct)
    {
        var jornada = await CarregarAsync(id, ct);
        if (ate < de || ate.DayNumber - de.DayNumber > 62)
        {
            throw new ValidationException("ate", "Escolha um intervalo de até 62 dias.");
        }

        var resultado = new List<PrevisaoDiaDto>();
        for (var dia = de; dia <= ate; dia = dia.AddDays(1))
        {
            var previsto = ResolvedorJornada.Prever(jornada, referenciaCiclo ?? de, dia);
            resultado.Add(new PrevisaoDiaDto(dia, previsto.Count == 0, previsto.Select(i => new IntervaloDto(i.Inicio, i.Fim)).ToList(), Intervalos.Total(previsto)));
        }

        return resultado;
    }

    private async Task<Jornada> CarregarAsync(Guid id, CancellationToken ct)
    {
        var empresas = acesso.EmpresasVisiveis().Select(e => e.Id);
        return await db.Jornadas.AsNoTracking().Include(j => j.Dias).ThenInclude(d => d.Periodos).AsSplitQuery()
            .FirstOrDefaultAsync(j => j.Id == id && empresas.Contains(j.EmpresaId), ct)
            ?? throw new NotFoundException("Jornada não encontrada.");
    }

    private static void Validar(Jornada jornada)
    {
        var erros = ResolvedorJornada.Validar(jornada);
        if (erros.Count > 0)
        {
            throw new ValidationException(new Dictionary<string, string[]> { ["dias"] = erros.ToArray() });
        }
    }

    private static void Aplicar(Jornada jornada, SalvarJornadaRequest request)
    {
        jornada.Nome = request.Nome.Trim();
        jornada.Tipo = request.Tipo;
        jornada.HoraVirada = Horario.Ler(request.HoraVirada);
        jornada.FeriadosCompensados = request.FeriadosCompensados;
        jornada.Ativa = request.Ativa;
        jornada.Dias = request.Dias
            .OrderBy(d => d.Indice)
            .Select(d =>
            {
                var dia = new JornadaDia { JornadaId = jornada.Id, Indice = d.Indice, Folga = d.Folga || d.Periodos.Count == 0 };
                dia.Periodos = dia.Folga
                    ? []
                    : d.Periodos.Select((p, i) => new JornadaPeriodo { JornadaDiaId = dia.Id, Ordem = i, Entrada = Horario.Ler(p.Entrada), Saida = Horario.Ler(p.Saida) }).ToList();
                return dia;
            })
            .ToList();
    }

    public static JornadaDto Mapear(Jornada j, int vinculados) => new(
        j.Id,
        j.EmpresaId,
        j.Nome,
        j.Tipo,
        Horario.Formatar(j.HoraVirada),
        j.FeriadosCompensados,
        j.Ativa,
        j.CargaCicloMinutos,
        j.Dias.OrderBy(d => d.Indice)
            .Select(d => new JornadaDiaDto(d.Indice, d.Folga, d.Periodos.OrderBy(p => p.Ordem).Select(p => new PeriodoDto(Horario.Formatar(p.Entrada), Horario.Formatar(p.Saida))).ToList(), d.CargaMinutos))
            .ToList(),
        vinculados);
}
