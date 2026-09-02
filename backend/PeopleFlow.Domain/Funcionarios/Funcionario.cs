using PeopleFlow.Domain.Comum;
using PeopleFlow.Domain.Empresas;
using PeopleFlow.Domain.Jornadas;

namespace PeopleFlow.Domain.Funcionarios;

public sealed class Funcionario : Entidade, IAuditavel
{
    public Guid EmpresaId { get; set; }

    public Empresa? Empresa { get; set; }

    public string Matricula { get; set; } = string.Empty;

    public string Nome { get; set; } = string.Empty;

    public string Cpf { get; set; } = string.Empty;

    public string? Pis { get; set; }

    public string Cargo { get; set; } = string.Empty;

    public string? Departamento { get; set; }

    public string? CentroCusto { get; set; }

    public string? Email { get; set; }

    public DateOnly DataAdmissao { get; set; }

    public DateOnly? DataDemissao { get; set; }

    public Guid? GestorId { get; set; }

    public Funcionario? Gestor { get; set; }

    public bool Ativo { get; set; } = true;

    public List<FuncionarioJornada> Jornadas { get; set; } = [];

    public bool AtivoEm(DateOnly data) => data >= DataAdmissao && (DataDemissao is null || data <= DataDemissao);
}

public sealed class FuncionarioJornada : Entidade, IAuditavel
{
    public Guid FuncionarioId { get; set; }

    public Guid JornadaId { get; set; }

    public Jornada? Jornada { get; set; }

    public DateOnly VigenteDesde { get; set; }

    public DateOnly? VigenteAte { get; set; }

    public DateOnly? DataReferenciaCiclo { get; set; }

    public bool VigenteEm(DateOnly data) => data >= VigenteDesde && (VigenteAte is null || data <= VigenteAte);
}
