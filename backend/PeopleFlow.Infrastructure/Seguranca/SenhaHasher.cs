using Microsoft.AspNetCore.Identity;
using PeopleFlow.Application.Abstractions;
using PeopleFlow.Domain.Usuarios;

namespace PeopleFlow.Infrastructure.Seguranca;

public sealed class SenhaHasher : ISenhaHasher
{
    private readonly PasswordHasher<Usuario> _hasher = new();

    public string Gerar(Usuario usuario, string senha) => _hasher.HashPassword(usuario, senha);

    public ResultadoSenha Verificar(Usuario usuario, string senha)
    {
        if (string.IsNullOrEmpty(usuario.SenhaHash))
        {
            return ResultadoSenha.Invalida;
        }

        try
        {
            return _hasher.VerifyHashedPassword(usuario, usuario.SenhaHash, senha) switch
            {
                PasswordVerificationResult.Success => ResultadoSenha.Valida,
                PasswordVerificationResult.SuccessRehashNeeded => ResultadoSenha.ValidaPrecisaAtualizar,
                _ => ResultadoSenha.Invalida
            };
        }
        catch (FormatException)
        {
            return ResultadoSenha.Invalida;
        }
    }
}
