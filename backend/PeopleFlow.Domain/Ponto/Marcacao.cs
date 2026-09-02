using PeopleFlow.Domain.Comum;
using PeopleFlow.Domain.Funcionarios;

namespace PeopleFlow.Domain.Ponto;

public enum OrigemMarcacao
{
    Registro,
    AjusteManual
}

public enum TipoAjuste
{
    Inclusao,
    Desconsideracao
}

public enum StatusAjuste
{
    Pendente,
    Aprovado,
    Rejeitado
}

public sealed class Marcacao : Entidade, IAuditavel
{
    public const int JustificativaMinima = 10;
    public const int JustificativaMaxima = 500;

    public Guid FuncionarioId { get; set; }

    public Funcionario? Funcionario { get; set; }

    public DateTime DataHora { get; set; }

    public int Nsr { get; set; }

    public OrigemMarcacao Origem { get; set; }

    public DateTime RegistradoEm { get; set; }

    public TipoAjuste? TipoAjuste { get; set; }

    public Guid? MarcacaoAlvoId { get; set; }

    public string? Justificativa { get; set; }

    public StatusAjuste? StatusAjuste { get; set; }

    public Guid? SolicitadoPorId { get; set; }

    public DateTime? SolicitadoEm { get; set; }

    public Guid? DecididoPorId { get; set; }

    public DateTime? DecididoEm { get; set; }

    public string? MotivoDecisao { get; set; }

    public bool EhAjuste => Origem == OrigemMarcacao.AjusteManual;
}
