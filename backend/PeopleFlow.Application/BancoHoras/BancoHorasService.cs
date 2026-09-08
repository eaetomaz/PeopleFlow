using FluentValidation;
using Microsoft.EntityFrameworkCore;
using PeopleFlow.Application.Abstractions;
using PeopleFlow.Application.Acesso;
using PeopleFlow.Application.Apuracao;
using PeopleFlow.Application.Comum;
using PeopleFlow.Application.Empresas;
using PeopleFlow.Domain.Apuracao;
using PeopleFlow.Domain.BancoHoras;
using PeopleFlow.Domain.Comum;
using ValidationException = PeopleFlow.Domain.Comum.ValidationException;

namespace PeopleFlow.Application.BancoHoras;

public sealed record LancamentoDto(Guid Id, DateOnly Data, int Minutos, string Tipo, string Descricao, DateOnly? VenceEm, string? CriadoPor, int SaldoApos);

public sealed record CreditoAVencerDto(DateOnly Data, int Minutos, DateOnly? VenceEm, bool Vencido);

public sealed record BancoHorasDto(
    FuncionarioResumoDto Funcionario,
    int SaldoMinutos,
    int CreditosMinutos,
    int DebitosMinutos,
    int VencidoMinutos,
    int ValidadeMeses,
    IReadOnlyList<CreditoAVencerDto> CreditosEmAberto,
    IReadOnlyList<LancamentoDto> Extrato);

public sealed record SaldoFuncionarioDto(FuncionarioResumoDto Funcionario, int SaldoMinutos, int VencidoMinutos, DateOnly? ProximoVencimento);

public sealed record LancarAjusteBancoRequest(Guid FuncionarioId, DateOnly Data, int Minutos, string Descricao);

public sealed class LancarAjusteBancoValidator : AbstractValidator<LancarAjusteBancoRequest>
{
    public LancarAjusteBancoValidator()
    {
        RuleFor(x => x.FuncionarioId).NotEmpty();
        RuleFor(x => x.Minutos).NotEqual(0).WithMessage("Informe os minutos (positivo para crédito, negativo para débito).")
            .InclusiveBetween(-6000, 6000).WithMessage("Use no máximo 100 horas por lançamento.");
        RuleFor(x => x.Descricao).NotEmpty().WithMessage("Descreva o motivo do lançamento.").MinimumLength(10).WithMessage("Descreva com ao menos 10 caracteres.").MaximumLength(300);
    }
}

public sealed class BancoHorasService(IPeopleFlowDbContext db, AcessoService acesso, IUsuarioAtual usuario, Relogio relogio)
{
    public async Task<BancoHorasDto> SituacaoAsync(Guid funcionarioId, CancellationToken ct)
    {
        var funcionario = await acesso.ExigirFuncionarioAsync(funcionarioId, ct);
        var hoje = relogio.Hoje(funcionario.Empresa!);
        var lancamentos = await db.LancamentosBanco.AsNoTracking().Where(l => l.FuncionarioId == funcionarioId).OrderBy(l => l.Data).ThenBy(l => l.CriadoEm).ToListAsync(ct);
        var situacao = SaldoBancoHoras.Calcular(lancamentos.Select(l => new MovimentoBanco(l.Data, l.Minutos, l.VenceEm)), hoje);
        var politicas = await db.Politicas.AsNoTracking().Where(p => p.EmpresaId == funcionario.EmpresaId).ToListAsync(ct);
        var validade = EmpresaService.Vigente(politicas, hoje)?.ValidadeBancoMeses ?? 6;

        var criadores = lancamentos.Where(l => l.CriadoPorId is not null).Select(l => l.CriadoPorId!.Value).Distinct().ToList();
        var nomes = await db.Usuarios.Where(u => criadores.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.Nome, ct);

        var saldo = 0;
        var extrato = new List<LancamentoDto>();
        foreach (var l in lancamentos)
        {
            saldo += l.Minutos;
            extrato.Add(new LancamentoDto(l.Id, l.Data, l.Minutos, l.Tipo.ToString(), l.Descricao, l.VenceEm,
                l.CriadoPorId is { } c ? nomes.GetValueOrDefault(c) : null, saldo));
        }

        extrato.Reverse();
        return new BancoHorasDto(
            ApuracaoService.Resumo(funcionario),
            situacao.SaldoMinutos,
            situacao.CreditosMinutos,
            situacao.DebitosMinutos,
            situacao.VencidoMinutos,
            validade,
            situacao.CreditosEmAberto.Select(c => new CreditoAVencerDto(c.Data, c.Minutos, c.VenceEm, c.VenceEm is not null && c.VenceEm < hoje)).ToList(),
            extrato.Take(200).ToList());
    }

    public async Task<IReadOnlyList<SaldoFuncionarioDto>> SaldosAsync(Guid? empresaId, CancellationToken ct)
    {
        var consulta = acesso.FuncionariosVisiveis().AsNoTracking().Include(f => f.Empresa).Where(f => f.Ativo);
        if (empresaId is not null)
        {
            consulta = consulta.Where(f => f.EmpresaId == empresaId);
        }

        var funcionarios = await consulta.OrderBy(f => f.Nome).ToListAsync(ct);
        var ids = funcionarios.Select(f => f.Id).ToList();
        var lancamentos = await db.LancamentosBanco.AsNoTracking().Where(l => ids.Contains(l.FuncionarioId)).ToListAsync(ct);
        var porFuncionario = lancamentos.GroupBy(l => l.FuncionarioId).ToDictionary(g => g.Key, g => g.ToList());
        var hoje = relogio.HojePadrao;

        return funcionarios.Select(f =>
        {
            var situacao = SaldoBancoHoras.Calcular(
                (porFuncionario.GetValueOrDefault(f.Id) ?? []).Select(l => new MovimentoBanco(l.Data, l.Minutos, l.VenceEm)), hoje);
            var proximo = situacao.CreditosEmAberto.Where(c => c.VenceEm is not null && c.VenceEm >= hoje).Select(c => c.VenceEm).Min();
            return new SaldoFuncionarioDto(ApuracaoService.Resumo(f), situacao.SaldoMinutos, situacao.VencidoMinutos, proximo);
        }).ToList();
    }

    public async Task<BancoHorasDto> LancarAjusteAsync(LancarAjusteBancoRequest request, CancellationToken ct)
    {
        acesso.ExigirGestaoDeCadastros();
        var funcionario = await acesso.ExigirFuncionarioAsync(request.FuncionarioId, ct);
        var hoje = relogio.Hoje(funcionario.Empresa!);
        if (request.Data > hoje)
        {
            throw new ValidationException("data", "A data do lançamento não pode ser no futuro.");
        }

        var politicas = await db.Politicas.AsNoTracking().Where(p => p.EmpresaId == funcionario.EmpresaId).ToListAsync(ct);
        var validade = EmpresaService.Vigente(politicas, request.Data)?.ValidadeBancoMeses ?? 6;
        db.LancamentosBanco.Add(new BancoHorasLancamento
        {
            FuncionarioId = funcionario.Id,
            Data = request.Data,
            Minutos = request.Minutos,
            Tipo = TipoLancamentoBanco.AjusteManual,
            Descricao = request.Descricao.Trim(),
            VenceEm = request.Minutos > 0 ? request.Data.AddMonths(validade) : null,
            CriadoPorId = usuario.Id
        });
        await db.SaveChangesAsync(ct);
        return await SituacaoAsync(funcionario.Id, ct);
    }
}
