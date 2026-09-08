using FluentValidation;
using Microsoft.EntityFrameworkCore;
using PeopleFlow.Application.Abstractions;
using PeopleFlow.Application.Acesso;
using PeopleFlow.Application.Apuracao;
using PeopleFlow.Application.Comum;
using PeopleFlow.Domain.Comum;
using PeopleFlow.Domain.Funcionarios;
using PeopleFlow.Domain.Jornadas;
using ValidationException = PeopleFlow.Domain.Comum.ValidationException;

namespace PeopleFlow.Application.Funcionarios;

public sealed record FuncionarioListaDto(
    Guid Id,
    Guid EmpresaId,
    string Empresa,
    string Matricula,
    string Nome,
    string Cargo,
    string? Departamento,
    string? Gestor,
    string? JornadaAtual,
    DateOnly DataAdmissao,
    DateOnly? DataDemissao,
    bool Ativo);

public sealed record VinculoDto(Guid Id, Guid JornadaId, string Jornada, TipoJornada Tipo, DateOnly VigenteDesde, DateOnly? VigenteAte, DateOnly? DataReferenciaCiclo, bool Atual);

public sealed record FuncionarioDetalheDto(
    Guid Id,
    Guid EmpresaId,
    string Empresa,
    string Matricula,
    string Nome,
    string Cpf,
    string? Pis,
    string Cargo,
    string? Departamento,
    string? CentroCusto,
    string? Email,
    DateOnly DataAdmissao,
    DateOnly? DataDemissao,
    Guid? GestorId,
    string? Gestor,
    bool Ativo,
    string? Usuario,
    IReadOnlyList<VinculoDto> Vinculos,
    IReadOnlyList<FuncionarioResumoDto> Equipe);

public sealed record SalvarFuncionarioRequest(
    Guid EmpresaId,
    string Matricula,
    string Nome,
    string Cpf,
    string? Pis,
    string Cargo,
    string? Departamento,
    string? CentroCusto,
    string? Email,
    DateOnly DataAdmissao,
    DateOnly? DataDemissao,
    Guid? GestorId,
    bool Ativo = true);

public sealed record NovoVinculoRequest(Guid JornadaId, DateOnly VigenteDesde, DateOnly? DataReferenciaCiclo);

public sealed record AtualizarVinculoRequest(DateOnly? VigenteAte, DateOnly? DataReferenciaCiclo);

public sealed class SalvarFuncionarioValidator : AbstractValidator<SalvarFuncionarioRequest>
{
    public SalvarFuncionarioValidator()
    {
        RuleFor(x => x.EmpresaId).NotEmpty().WithMessage("Escolha a empresa.");
        RuleFor(x => x.Matricula).NotEmpty().WithMessage("Informe a matrícula.").MaximumLength(20);
        RuleFor(x => x.Nome).NotEmpty().WithMessage("Informe o nome.").MaximumLength(120);
        RuleFor(x => x.Cpf).Must(Documentos.CpfValido).WithMessage("CPF inválido.");
        RuleFor(x => x.Cargo).NotEmpty().WithMessage("Informe o cargo.").MaximumLength(80);
        RuleFor(x => x.Email).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email)).WithMessage("E-mail inválido.");
        RuleFor(x => x.DataDemissao).GreaterThanOrEqualTo(x => x.DataAdmissao).When(x => x.DataDemissao is not null).WithMessage("A demissão não pode ser antes da admissão.");
    }
}

public sealed class FuncionarioService(IPeopleFlowDbContext db, AcessoService acesso, ApuracaoService apuracao, Relogio relogio)
{
    public async Task<IReadOnlyList<FuncionarioListaDto>> ListarAsync(Guid? empresaId, string? busca, bool? ativo, CancellationToken ct)
    {
        var consulta = acesso.FuncionariosVisiveis().AsNoTracking()
            .Include(f => f.Empresa)
            .Include(f => f.Gestor)
            .Include(f => f.Jornadas).ThenInclude(v => v.Jornada)
            .AsSplitQuery();
        if (empresaId is not null)
        {
            consulta = consulta.Where(f => f.EmpresaId == empresaId);
        }

        if (ativo is not null)
        {
            consulta = consulta.Where(f => f.Ativo == ativo);
        }

        var funcionarios = await consulta.ToListAsync(ct);
        if (!string.IsNullOrWhiteSpace(busca))
        {
            var termo = Texto.Normalizar(busca);
            funcionarios = funcionarios.Where(f =>
                Texto.Normalizar(f.Nome).Contains(termo)
                || f.Matricula.Contains(termo, StringComparison.OrdinalIgnoreCase)
                || Texto.Normalizar(f.Cargo).Contains(termo)
                || Documentos.SoDigitos(busca).Length >= 3 && f.Cpf.Contains(Documentos.SoDigitos(busca))).ToList();
        }

        var hoje = relogio.HojePadrao;
        return funcionarios
            .OrderBy(f => f.Nome, StringComparer.Create(new System.Globalization.CultureInfo("pt-BR"), true))
            .Select(f => new FuncionarioListaDto(
                f.Id, f.EmpresaId, f.Empresa?.NomeFantasia ?? string.Empty, f.Matricula, f.Nome, f.Cargo, f.Departamento,
                f.Gestor?.Nome, f.Jornadas.FirstOrDefault(v => v.VigenteEm(hoje))?.Jornada?.Nome, f.DataAdmissao, f.DataDemissao, f.Ativo))
            .ToList();
    }

    public async Task<FuncionarioDetalheDto> ObterAsync(Guid id, CancellationToken ct)
    {
        await acesso.ExigirFuncionarioAsync(id, ct);
        var f = await db.Funcionarios.AsNoTracking()
            .Include(x => x.Empresa)
            .Include(x => x.Gestor)
            .Include(x => x.Jornadas).ThenInclude(v => v.Jornada)
            .AsSplitQuery()
            .FirstAsync(x => x.Id == id, ct);
        var usuario = await db.Usuarios.Where(u => u.FuncionarioId == id).Select(u => u.Login).FirstOrDefaultAsync(ct);
        var equipe = await db.Funcionarios.AsNoTracking().Include(x => x.Empresa).Where(x => x.GestorId == id).OrderBy(x => x.Nome).ToListAsync(ct);
        var hoje = relogio.Hoje(f.Empresa!);

        return new FuncionarioDetalheDto(
            f.Id, f.EmpresaId, f.Empresa!.NomeFantasia, f.Matricula, f.Nome, f.Cpf, f.Pis, f.Cargo, f.Departamento, f.CentroCusto,
            f.Email, f.DataAdmissao, f.DataDemissao, f.GestorId, f.Gestor?.Nome, f.Ativo, usuario,
            f.Jornadas.OrderByDescending(v => v.VigenteDesde)
                .Select(v => new VinculoDto(v.Id, v.JornadaId, v.Jornada?.Nome ?? string.Empty, v.Jornada?.Tipo ?? TipoJornada.Semanal, v.VigenteDesde, v.VigenteAte, v.DataReferenciaCiclo, v.VigenteEm(hoje)))
                .ToList(),
            equipe.Select(ApuracaoService.Resumo).ToList());
    }

    public async Task<FuncionarioDetalheDto> CriarAsync(SalvarFuncionarioRequest request, CancellationToken ct)
    {
        acesso.ExigirGestaoDeCadastros();
        await acesso.ExigirEmpresaAsync(request.EmpresaId, ct);
        await ValidarUnicidadeAsync(request, null, ct);
        await ValidarGestorAsync(request, null, ct);

        var funcionario = new Funcionario();
        Aplicar(funcionario, request);
        db.Funcionarios.Add(funcionario);
        await db.SaveChangesAsync(ct);
        return await ObterAsync(funcionario.Id, ct);
    }

    public async Task<FuncionarioDetalheDto> AtualizarAsync(Guid id, SalvarFuncionarioRequest request, CancellationToken ct)
    {
        acesso.ExigirGestaoDeCadastros();
        var funcionario = await db.Funcionarios.FirstOrDefaultAsync(f => f.Id == id, ct) ?? throw new NotFoundException("Funcionário não encontrado.");
        if (funcionario.EmpresaId != request.EmpresaId)
        {
            throw new BusinessRuleException("A troca de empresa é uma transferência e ainda não é suportada. Faça a demissão e uma nova admissão.");
        }

        await ValidarUnicidadeAsync(request, id, ct);
        await ValidarGestorAsync(request, id, ct);

        var antes = (funcionario.DataAdmissao, funcionario.DataDemissao);
        Aplicar(funcionario, request);
        await db.SaveChangesAsync(ct);

        if (antes != (funcionario.DataAdmissao, funcionario.DataDemissao))
        {
            var inicio = antes.DataAdmissao < funcionario.DataAdmissao ? antes.DataAdmissao : funcionario.DataAdmissao;
            var hoje = relogio.HojePadrao;
            await apuracao.RecalcularAsync([id], Maior(inicio, hoje.AddDays(-ApuracaoService.JanelaMaximaDias)), hoje, ct);
        }

        return await ObterAsync(id, ct);
    }

    public async Task<FuncionarioDetalheDto> AdicionarVinculoAsync(Guid id, NovoVinculoRequest request, CancellationToken ct)
    {
        acesso.ExigirGestaoDeCadastros();
        var funcionario = await db.Funcionarios.Include(f => f.Jornadas).FirstOrDefaultAsync(f => f.Id == id, ct)
            ?? throw new NotFoundException("Funcionário não encontrado.");
        var jornada = await db.Jornadas.FirstOrDefaultAsync(j => j.Id == request.JornadaId && j.EmpresaId == funcionario.EmpresaId, ct)
            ?? throw new NotFoundException("Jornada não encontrada nesta empresa.");
        if (!jornada.Ativa)
        {
            throw new BusinessRuleException("A jornada está inativa.");
        }

        if (request.VigenteDesde < funcionario.DataAdmissao)
        {
            throw new ValidationException("vigenteDesde", "A vigência não pode começar antes da admissão.");
        }

        var posteriores = funcionario.Jornadas.Where(v => v.VigenteDesde >= request.VigenteDesde).ToList();
        if (posteriores.Count > 0)
        {
            throw new BusinessRuleException($"Já existe jornada a partir de {posteriores.Min(v => v.VigenteDesde):dd/MM/yyyy}. A nova vigência precisa começar depois dela.");
        }

        foreach (var aberto in funcionario.Jornadas.Where(v => v.VigenteAte is null || v.VigenteAte >= request.VigenteDesde))
        {
            aberto.VigenteAte = request.VigenteDesde.AddDays(-1);
        }

        db.FuncionarioJornadas.Add(new FuncionarioJornada
        {
            FuncionarioId = id,
            JornadaId = jornada.Id,
            VigenteDesde = request.VigenteDesde,
            DataReferenciaCiclo = jornada.Tipo == TipoJornada.Ciclica ? request.DataReferenciaCiclo ?? request.VigenteDesde : null
        });
        await db.SaveChangesAsync(ct);

        var hoje = relogio.HojePadrao;
        await apuracao.RecalcularAsync([id], Maior(request.VigenteDesde, hoje.AddDays(-ApuracaoService.JanelaMaximaDias)), hoje, ct);
        return await ObterAsync(id, ct);
    }

    public async Task<FuncionarioDetalheDto> AtualizarVinculoAsync(Guid id, Guid vinculoId, AtualizarVinculoRequest request, CancellationToken ct)
    {
        acesso.ExigirGestaoDeCadastros();
        var funcionario = await db.Funcionarios.Include(f => f.Jornadas).ThenInclude(v => v.Jornada).FirstOrDefaultAsync(f => f.Id == id, ct)
            ?? throw new NotFoundException("Funcionário não encontrado.");
        var vinculo = funcionario.Jornadas.FirstOrDefault(v => v.Id == vinculoId) ?? throw new NotFoundException("Vínculo não encontrado.");

        if (request.VigenteAte is not null && request.VigenteAte < vinculo.VigenteDesde)
        {
            throw new ValidationException("vigenteAte", "O fim não pode ser antes do início da vigência.");
        }

        var seguinte = funcionario.Jornadas.Where(v => v.VigenteDesde > vinculo.VigenteDesde).OrderBy(v => v.VigenteDesde).FirstOrDefault();
        if (seguinte is not null && (request.VigenteAte is null || request.VigenteAte >= seguinte.VigenteDesde))
        {
            throw new BusinessRuleException($"Existe outra jornada a partir de {seguinte.VigenteDesde:dd/MM/yyyy}; o fim precisa ser antes disso.");
        }

        vinculo.VigenteAte = request.VigenteAte;
        if (vinculo.Jornada?.Tipo == TipoJornada.Ciclica && request.DataReferenciaCiclo is not null)
        {
            vinculo.DataReferenciaCiclo = request.DataReferenciaCiclo;
        }

        await db.SaveChangesAsync(ct);
        var hoje = relogio.HojePadrao;
        await apuracao.RecalcularAsync([id], Maior(vinculo.VigenteDesde, hoje.AddDays(-ApuracaoService.JanelaMaximaDias)), hoje, ct);
        return await ObterAsync(id, ct);
    }

    private async Task ValidarUnicidadeAsync(SalvarFuncionarioRequest request, Guid? id, CancellationToken ct)
    {
        var cpf = Documentos.SoDigitos(request.Cpf);
        if (await db.Funcionarios.AnyAsync(f => f.EmpresaId == request.EmpresaId && f.Matricula == request.Matricula.Trim() && f.Id != id, ct))
        {
            throw new ConflictException("Já existe um funcionário com esta matrícula na empresa.");
        }

        if (await db.Funcionarios.AnyAsync(f => f.EmpresaId == request.EmpresaId && f.Cpf == cpf && f.Id != id && f.DataDemissao == null, ct))
        {
            throw new ConflictException("Já existe um funcionário ativo com este CPF na empresa.");
        }
    }

    private async Task ValidarGestorAsync(SalvarFuncionarioRequest request, Guid? id, CancellationToken ct)
    {
        if (request.GestorId is null)
        {
            return;
        }

        if (request.GestorId == id)
        {
            throw new ValidationException("gestorId", "O funcionário não pode ser gestor dele mesmo.");
        }

        var gestor = await db.Funcionarios.FirstOrDefaultAsync(f => f.Id == request.GestorId, ct);
        if (gestor is null || gestor.EmpresaId != request.EmpresaId)
        {
            throw new ValidationException("gestorId", "Escolha um gestor da mesma empresa.");
        }
    }

    private static void Aplicar(Funcionario f, SalvarFuncionarioRequest request)
    {
        f.EmpresaId = request.EmpresaId;
        f.Matricula = request.Matricula.Trim();
        f.Nome = request.Nome.Trim();
        f.Cpf = Documentos.SoDigitos(request.Cpf);
        f.Pis = string.IsNullOrWhiteSpace(request.Pis) ? null : Documentos.SoDigitos(request.Pis);
        f.Cargo = request.Cargo.Trim();
        f.Departamento = Vazio(request.Departamento);
        f.CentroCusto = Vazio(request.CentroCusto);
        f.Email = Vazio(request.Email);
        f.DataAdmissao = request.DataAdmissao;
        f.DataDemissao = request.DataDemissao;
        f.GestorId = request.GestorId;
        f.Ativo = request.Ativo && request.DataDemissao is null;
    }

    private static string? Vazio(string? valor) => string.IsNullOrWhiteSpace(valor) ? null : valor.Trim();

    private static DateOnly Maior(DateOnly a, DateOnly b) => a > b ? a : b;
}
