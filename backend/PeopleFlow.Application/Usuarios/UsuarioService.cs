using FluentValidation;
using Microsoft.EntityFrameworkCore;
using PeopleFlow.Application.Abstractions;
using PeopleFlow.Domain.Comum;
using PeopleFlow.Domain.Usuarios;
using ValidationException = PeopleFlow.Domain.Comum.ValidationException;

namespace PeopleFlow.Application.Usuarios;

public sealed record UsuarioDto(Guid Id, string Login, string Nome, Perfil Perfil, Guid? FuncionarioId, string? Funcionario, bool Ativo, bool SenhaPadrao, DateTime? UltimoAcessoEm, bool Bloqueado);

public sealed record CriarUsuarioRequest(string Login, string Nome, Perfil Perfil, Guid? FuncionarioId, string Senha);

public sealed record AtualizarUsuarioRequest(string Nome, Perfil Perfil, Guid? FuncionarioId, bool Ativo);

public sealed record RedefinirSenhaRequest(string NovaSenha);

public sealed class CriarUsuarioValidator : AbstractValidator<CriarUsuarioRequest>
{
    public CriarUsuarioValidator()
    {
        RuleFor(x => x.Login).NotEmpty().WithMessage("Informe o login.").Matches("^[a-zA-Z0-9._-]{3,40}$").WithMessage("Use de 3 a 40 letras, números, ponto, hífen ou sublinhado.");
        RuleFor(x => x.Nome).NotEmpty().WithMessage("Informe o nome.").MaximumLength(120);
        RuleFor(x => x.Senha).NotEmpty().MinimumLength(8).WithMessage("A senha precisa ter ao menos 8 caracteres.").MaximumLength(128);
        RuleFor(x => x.FuncionarioId).NotNull().When(x => x.Perfil is Perfil.Gestor or Perfil.Funcionario).WithMessage("Gestor e Funcionário precisam estar ligados a um funcionário.");
    }
}

public sealed class AtualizarUsuarioValidator : AbstractValidator<AtualizarUsuarioRequest>
{
    public AtualizarUsuarioValidator()
    {
        RuleFor(x => x.Nome).NotEmpty().WithMessage("Informe o nome.").MaximumLength(120);
        RuleFor(x => x.FuncionarioId).NotNull().When(x => x.Perfil is Perfil.Gestor or Perfil.Funcionario).WithMessage("Gestor e Funcionário precisam estar ligados a um funcionário.");
    }
}

public sealed class RedefinirSenhaValidator : AbstractValidator<RedefinirSenhaRequest>
{
    public RedefinirSenhaValidator()
    {
        RuleFor(x => x.NovaSenha).NotEmpty().MinimumLength(8).WithMessage("A senha precisa ter ao menos 8 caracteres.").MaximumLength(128);
    }
}

public sealed class UsuarioService(IPeopleFlowDbContext db, ISenhaHasher hasher, IUsuarioAtual atual, TimeProvider tempo)
{
    public async Task<IReadOnlyList<UsuarioDto>> ListarAsync(CancellationToken ct)
    {
        var usuarios = await db.Usuarios.AsNoTracking().Include(u => u.Funcionario).OrderBy(u => u.Nome).ToListAsync(ct);
        return usuarios.Select(Mapear).ToList();
    }

    public async Task<UsuarioDto> CriarAsync(CriarUsuarioRequest request, CancellationToken ct)
    {
        var login = request.Login.Trim().ToLowerInvariant();
        if (await db.Usuarios.AnyAsync(u => u.Login == login, ct))
        {
            throw new ConflictException("Já existe um usuário com este login.");
        }

        await ValidarFuncionarioAsync(request.FuncionarioId, null, ct);
        var usuario = new Usuario { Login = login, Nome = request.Nome.Trim(), Perfil = request.Perfil, FuncionarioId = request.FuncionarioId, SenhaPadrao = true };
        usuario.SenhaHash = hasher.Gerar(usuario, request.Senha);
        db.Usuarios.Add(usuario);
        await db.SaveChangesAsync(ct);
        return Mapear(usuario);
    }

    public async Task<UsuarioDto> AtualizarAsync(Guid id, AtualizarUsuarioRequest request, CancellationToken ct)
    {
        var usuario = await db.Usuarios.Include(u => u.Funcionario).FirstOrDefaultAsync(u => u.Id == id, ct) ?? throw new NotFoundException("Usuário não encontrado.");
        if (id == atual.Id && (request.Perfil != Perfil.Admin || !request.Ativo))
        {
            throw new BusinessRuleException("Você não pode tirar o próprio acesso de administrador.");
        }

        await ValidarFuncionarioAsync(request.FuncionarioId, id, ct);
        var mudouAcesso = usuario.Perfil != request.Perfil || usuario.Ativo != request.Ativo || usuario.FuncionarioId != request.FuncionarioId;
        usuario.Nome = request.Nome.Trim();
        usuario.Perfil = request.Perfil;
        usuario.FuncionarioId = request.FuncionarioId;
        usuario.Ativo = request.Ativo;
        if (mudouAcesso)
        {
            usuario.CarimboSeguranca = Guid.NewGuid();
        }

        await db.SaveChangesAsync(ct);
        return Mapear(await db.Usuarios.AsNoTracking().Include(u => u.Funcionario).FirstAsync(u => u.Id == id, ct));
    }

    public async Task RedefinirSenhaAsync(Guid id, RedefinirSenhaRequest request, CancellationToken ct)
    {
        var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == id, ct) ?? throw new NotFoundException("Usuário não encontrado.");
        usuario.SenhaHash = hasher.Gerar(usuario, request.NovaSenha);
        usuario.SenhaPadrao = true;
        usuario.TentativasFalhas = 0;
        usuario.BloqueadoAte = null;
        usuario.CarimboSeguranca = Guid.NewGuid();
        await db.SaveChangesAsync(ct);
    }

    private async Task ValidarFuncionarioAsync(Guid? funcionarioId, Guid? usuarioId, CancellationToken ct)
    {
        if (funcionarioId is null)
        {
            return;
        }

        if (!await db.Funcionarios.AnyAsync(f => f.Id == funcionarioId, ct))
        {
            throw new ValidationException("funcionarioId", "Funcionário não encontrado.");
        }

        if (await db.Usuarios.AnyAsync(u => u.FuncionarioId == funcionarioId && u.Id != usuarioId, ct))
        {
            throw new ConflictException("Este funcionário já tem um usuário.");
        }
    }

    private UsuarioDto Mapear(Usuario u) => new(
        u.Id, u.Login, u.Nome, u.Perfil, u.FuncionarioId, u.Funcionario?.Nome, u.Ativo, u.SenhaPadrao, u.UltimoAcessoEm,
        u.BloqueadoAte is { } b && b > tempo.GetUtcNow().UtcDateTime);
}
