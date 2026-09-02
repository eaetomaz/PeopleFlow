using PeopleFlow.Domain.Comum;
using PeopleFlow.Domain.Funcionarios;

namespace PeopleFlow.Domain.Usuarios;

public enum Perfil
{
    Admin,
    RH,
    Gestor,
    Funcionario
}

public sealed class Usuario : Entidade, IAuditavel
{
    public const int TentativasAntesDoBloqueio = 5;
    public static readonly TimeSpan DuracaoBloqueio = TimeSpan.FromMinutes(5);

    public string Login { get; set; } = string.Empty;

    public string Nome { get; set; } = string.Empty;

    public string SenhaHash { get; set; } = string.Empty;

    public Perfil Perfil { get; set; }

    public Guid? FuncionarioId { get; set; }

    public Funcionario? Funcionario { get; set; }

    public bool Ativo { get; set; } = true;

    public Guid CarimboSeguranca { get; set; } = Guid.NewGuid();

    public bool SenhaPadrao { get; set; }

    public int TentativasFalhas { get; set; }

    public DateTime? BloqueadoAte { get; set; }

    public DateTime? UltimoAcessoEm { get; set; }
}
