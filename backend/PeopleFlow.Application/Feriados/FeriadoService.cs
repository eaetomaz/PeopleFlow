using FluentValidation;
using Microsoft.EntityFrameworkCore;
using PeopleFlow.Application.Abstractions;
using PeopleFlow.Application.Acesso;
using PeopleFlow.Application.Apuracao;
using PeopleFlow.Domain.Comum;
using PeopleFlow.Domain.Feriados;
using ValidationException = PeopleFlow.Domain.Comum.ValidationException;

namespace PeopleFlow.Application.Feriados;

public sealed record FeriadoDto(Guid Id, DateOnly Data, string Nome, AbrangenciaFeriado Abrangencia, string? Uf, string? Municipio, Guid? EmpresaId, TipoFeriado Tipo, bool ValeParaEmpresa);

public sealed record SalvarFeriadoRequest(DateOnly Data, string Nome, AbrangenciaFeriado Abrangencia, string? Uf, string? Municipio, Guid? EmpresaId, TipoFeriado Tipo = TipoFeriado.Feriado);

public sealed class SalvarFeriadoValidator : AbstractValidator<SalvarFeriadoRequest>
{
    public SalvarFeriadoValidator()
    {
        RuleFor(x => x.Nome).NotEmpty().WithMessage("Informe o nome do feriado.").MaximumLength(100);
        RuleFor(x => x.Uf).NotEmpty().Length(2).When(x => x.Abrangencia is AbrangenciaFeriado.Estadual or AbrangenciaFeriado.Municipal).WithMessage("Informe a UF.");
        RuleFor(x => x.Municipio).NotEmpty().When(x => x.Abrangencia == AbrangenciaFeriado.Municipal).WithMessage("Informe o município.");
        RuleFor(x => x.EmpresaId).NotNull().When(x => x.Abrangencia == AbrangenciaFeriado.Empresa).WithMessage("Escolha a empresa.");
    }
}

public sealed class FeriadoService(IPeopleFlowDbContext db, AcessoService acesso, ApuracaoService apuracao)
{
    public async Task<IReadOnlyList<FeriadoDto>> ListarAsync(int ano, Guid? empresaId, CancellationToken ct)
    {
        var inicio = new DateOnly(ano, 1, 1);
        var fim = new DateOnly(ano, 12, 31);
        var feriados = await db.Feriados.AsNoTracking().Where(f => f.Data >= inicio && f.Data <= fim).OrderBy(f => f.Data).ToListAsync(ct);
        if (empresaId is null)
        {
            return feriados.Select(f => Mapear(f, true)).ToList();
        }

        var empresa = await acesso.ExigirEmpresaAsync(empresaId.Value, ct);
        return feriados
            .Where(f => f.Abrangencia != AbrangenciaFeriado.Empresa || f.EmpresaId == empresa.Id)
            .Select(f => Mapear(f, f.ValeParaEmpresa(empresa)))
            .ToList();
    }

    public async Task<FeriadoDto> CriarAsync(SalvarFeriadoRequest request, CancellationToken ct)
    {
        acesso.ExigirGestaoDeCadastros();
        var feriado = new Feriado();
        Aplicar(feriado, request);
        db.Feriados.Add(feriado);
        await db.SaveChangesAsync(ct);
        await RecalcularAsync(feriado.Data, ct);
        return Mapear(feriado, true);
    }

    public async Task<FeriadoDto> AtualizarAsync(Guid id, SalvarFeriadoRequest request, CancellationToken ct)
    {
        acesso.ExigirGestaoDeCadastros();
        var feriado = await db.Feriados.FirstOrDefaultAsync(f => f.Id == id, ct) ?? throw new NotFoundException("Feriado não encontrado.");
        var dataAnterior = feriado.Data;
        Aplicar(feriado, request);
        await db.SaveChangesAsync(ct);
        await RecalcularAsync(dataAnterior, ct);
        if (dataAnterior != feriado.Data)
        {
            await RecalcularAsync(feriado.Data, ct);
        }

        return Mapear(feriado, true);
    }

    public async Task ExcluirAsync(Guid id, CancellationToken ct)
    {
        acesso.ExigirGestaoDeCadastros();
        var feriado = await db.Feriados.FirstOrDefaultAsync(f => f.Id == id, ct) ?? throw new NotFoundException("Feriado não encontrado.");
        db.Feriados.Remove(feriado);
        await db.SaveChangesAsync(ct);
        await RecalcularAsync(feriado.Data, ct);
    }

    private async Task RecalcularAsync(DateOnly data, CancellationToken ct)
    {
        var ids = await db.Funcionarios.Where(f => f.DataAdmissao <= data).Select(f => f.Id).ToListAsync(ct);
        await apuracao.RecalcularAsync(ids, data, data.AddDays(1), ct);
    }

    private static void Aplicar(Feriado feriado, SalvarFeriadoRequest request)
    {
        feriado.Data = request.Data;
        feriado.Nome = request.Nome.Trim();
        feriado.Abrangencia = request.Abrangencia;
        feriado.Uf = request.Abrangencia is AbrangenciaFeriado.Estadual or AbrangenciaFeriado.Municipal ? request.Uf?.Trim().ToUpperInvariant() : null;
        feriado.Municipio = request.Abrangencia == AbrangenciaFeriado.Municipal ? request.Municipio?.Trim() : null;
        feriado.EmpresaId = request.Abrangencia == AbrangenciaFeriado.Empresa ? request.EmpresaId : null;
        feriado.Tipo = request.Tipo;
    }

    private static FeriadoDto Mapear(Feriado f, bool vale) =>
        new(f.Id, f.Data, f.Nome, f.Abrangencia, f.Uf, f.Municipio, f.EmpresaId, f.Tipo, vale);
}
