using PeopleFlow.Domain.Comum;

namespace PeopleFlow.Domain.Empresas;

public sealed class Empresa : Entidade, IAuditavel
{
    public const string FusoPadrao = "America/Sao_Paulo";

    public string RazaoSocial { get; set; } = string.Empty;

    public string NomeFantasia { get; set; } = string.Empty;

    public string Cnpj { get; set; } = string.Empty;

    public string Uf { get; set; } = string.Empty;

    public string Municipio { get; set; } = string.Empty;

    public string FusoHorario { get; set; } = FusoPadrao;

    public string Cor { get; set; } = "#0d9488";

    public bool Ativa { get; set; } = true;

    public int UltimoNsr { get; set; }

    public List<PoliticaEmpresa> Politicas { get; set; } = [];
}
