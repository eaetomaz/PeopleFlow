using FluentValidation;
using Microsoft.EntityFrameworkCore;
using PeopleFlow.Application.Abstractions;
using PeopleFlow.Application.Comum;
using PeopleFlow.Domain.Comum;
using PeopleFlow.Domain.Usuarios;
using ValidationException = PeopleFlow.Domain.Comum.ValidationException;

namespace PeopleFlow.Application.Autenticacao;

public sealed record LoginRequest(string Login, string Senha);

public sealed record AlterarSenhaRequest(string SenhaAtual, string NovaSenha);

public sealed record UsuarioLogadoDto(Guid Id, string Login, string Nome, Perfil Perfil, Guid? FuncionarioId, string? Funcionario, Guid? EmpresaId, string? Empresa, bool SenhaPadrao);

public sealed record ContaDemoDto(string Login, string Senha, Perfil Perfil, string Nome, string Descricao);

public interface IContasDemo
{
    IReadOnlyList<(string Login, string Senha, string Descricao)> Contas { get; }
}

public sealed class LoginValidator : AbstractValidator<LoginRequest>
{
    public LoginValidator()
    {
        RuleFor(x => x.Login).NotEmpty().WithMessage("Informe o usuário.");
        RuleFor(x => x.Senha).NotEmpty().WithMessage("Informe a senha.");
    }
}

public sealed class AlterarSenhaValidator : AbstractValidator<AlterarSenhaRequest>
{
    public AlterarSenhaValidator()
    {
        RuleFor(x => x.SenhaAtual).NotEmpty().WithMessage("Informe a senha atual.");
        RuleFor(x => x.NovaSenha)
            .NotEmpty().WithMessage("Informe a nova senha.")
            .MinimumLength(8).WithMessage("A nova senha precisa ter ao menos 8 caracteres.")
            .MaximumLength(128)
            .Matches("[A-Za-z]").WithMessage("Use ao menos uma letra.")
            .Matches("[0-9]").WithMessage("Use ao menos um número.");
    }
}

public sealed class AutenticacaoService(IPeopleFlowDbContext db, ISenhaHasher hasher, Relogio relogio, IContasDemo contasDemo)
{
    public async Task<Usuario> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        var login = request.Login.Trim().ToLowerInvariant();
        var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Login == login, ct);
        const string invalido = "Usuário ou senha incorretos.";
        if (usuario is null)
        {
            throw new BusinessRuleException(invalido);
        }

        var agora = relogio.AgoraUtc;
        if (usuario.BloqueadoAte is { } bloqueio && bloqueio > agora)
        {
            var minutos = (int)Math.Ceiling((bloqueio - agora).TotalMinutes);
            throw new BusinessRuleException($"Muitas tentativas erradas. Tente de novo em {minutos} minuto(s).");
        }

        if (!usuario.Ativo)
        {
            throw new BusinessRuleException("Este usuário está desativado.");
        }

        var resultado = hasher.Verificar(usuario, request.Senha);
        if (resultado == ResultadoSenha.Invalida)
        {
            usuario.TentativasFalhas++;
            if (usuario.TentativasFalhas >= Usuario.TentativasAntesDoBloqueio)
            {
                usuario.TentativasFalhas = 0;
                usuario.BloqueadoAte = agora.Add(Usuario.DuracaoBloqueio);
            }

            await db.SaveChangesAsync(ct);
            throw new BusinessRuleException(invalido);
        }

        if (resultado == ResultadoSenha.ValidaPrecisaAtualizar)
        {
            usuario.SenhaHash = hasher.Gerar(usuario, request.Senha);
        }

        usuario.TentativasFalhas = 0;
        usuario.BloqueadoAte = null;
        usuario.UltimoAcessoEm = agora;
        await db.SaveChangesAsync(ct);
        return usuario;
    }

    public async Task<UsuarioLogadoDto> MeAsync(Guid usuarioId, CancellationToken ct)
    {
        var usuario = await db.Usuarios.AsNoTracking().Include(u => u.Funcionario).ThenInclude(f => f!.Empresa).FirstOrDefaultAsync(u => u.Id == usuarioId, ct)
            ?? throw new NotFoundException("Usuário não encontrado.");
        return Mapear(usuario);
    }

    public async Task AlterarSenhaAsync(Guid usuarioId, AlterarSenhaRequest request, CancellationToken ct)
    {
        var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == usuarioId, ct) ?? throw new NotFoundException("Usuário não encontrado.");
        if (hasher.Verificar(usuario, request.SenhaAtual) == ResultadoSenha.Invalida)
        {
            throw new ValidationException("senhaAtual", "A senha atual está incorreta.");
        }

        if (request.SenhaAtual == request.NovaSenha)
        {
            throw new ValidationException("novaSenha", "A nova senha precisa ser diferente da atual.");
        }

        usuario.SenhaHash = hasher.Gerar(usuario, request.NovaSenha);
        usuario.SenhaPadrao = false;
        usuario.CarimboSeguranca = Guid.NewGuid();
        await db.SaveChangesAsync(ct);
    }

    public async Task<bool> SessaoValidaAsync(Guid usuarioId, Guid carimbo, CancellationToken ct) =>
        await db.Usuarios.AnyAsync(u => u.Id == usuarioId && u.Ativo && u.CarimboSeguranca == carimbo, ct);

    public async Task<IReadOnlyList<ContaDemoDto>> ContasDemoAsync(CancellationToken ct)
    {
        var logins = contasDemo.Contas.Select(c => c.Login).ToList();
        var usuarios = await db.Usuarios.AsNoTracking().Where(u => logins.Contains(u.Login) && u.Ativo && u.SenhaPadrao).ToListAsync(ct);
        var resultado = new List<ContaDemoDto>();
        foreach (var (login, senha, descricao) in contasDemo.Contas)
        {
            var usuario = usuarios.FirstOrDefault(u => u.Login == login);
            if (usuario is not null && hasher.Verificar(usuario, senha) != ResultadoSenha.Invalida)
            {
                resultado.Add(new ContaDemoDto(login, senha, usuario.Perfil, usuario.Nome, descricao));
            }
        }

        return resultado;
    }

    public static UsuarioLogadoDto Mapear(Usuario u) => new(
        u.Id, u.Login, u.Nome, u.Perfil, u.FuncionarioId, u.Funcionario?.Nome, u.Funcionario?.EmpresaId, u.Funcionario?.Empresa?.NomeFantasia, u.SenhaPadrao);
}
