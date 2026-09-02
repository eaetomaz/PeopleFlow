using PeopleFlow.Domain.Comum;
using PeopleFlow.Domain.Empresas;

namespace PeopleFlow.Domain.Feriados;

public enum AbrangenciaFeriado
{
    Nacional,
    Estadual,
    Municipal,
    Empresa
}

public enum TipoFeriado
{
    Feriado,
    PontoFacultativo
}

public sealed class Feriado : Entidade, IAuditavel
{
    public DateOnly Data { get; set; }

    public string Nome { get; set; } = string.Empty;

    public AbrangenciaFeriado Abrangencia { get; set; }

    public string? Uf { get; set; }

    public string? Municipio { get; set; }

    public Guid? EmpresaId { get; set; }

    public TipoFeriado Tipo { get; set; } = TipoFeriado.Feriado;

    public bool ValeParaEmpresa(Empresa empresa) => Tipo == TipoFeriado.Feriado && Abrangencia switch
    {
        AbrangenciaFeriado.Nacional => true,
        AbrangenciaFeriado.Estadual => string.Equals(Uf, empresa.Uf, StringComparison.OrdinalIgnoreCase),
        AbrangenciaFeriado.Municipal => string.Equals(Uf, empresa.Uf, StringComparison.OrdinalIgnoreCase)
            && string.Equals(Municipio, empresa.Municipio, StringComparison.OrdinalIgnoreCase),
        AbrangenciaFeriado.Empresa => EmpresaId == empresa.Id,
        _ => false
    };
}
