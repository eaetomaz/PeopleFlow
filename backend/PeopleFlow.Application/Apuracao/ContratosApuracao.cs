using PeopleFlow.Domain.Apuracao;

namespace PeopleFlow.Application.Apuracao;

public sealed record IntervaloDto(DateTime Inicio, DateTime Fim);

public sealed record SegmentoDto(DateTime Inicio, DateTime Fim, string Classe);

public sealed record MarcacaoDto(
    Guid Id,
    DateTime DataHora,
    int Nsr,
    string Origem,
    string? TipoAjuste,
    string? Status,
    string? Justificativa,
    Guid? MarcacaoAlvoId,
    string? SolicitadoPor,
    DateTime? SolicitadoEm,
    string? DecididoPor,
    DateTime? DecididoEm,
    string? MotivoDecisao,
    bool Desconsiderada);

public sealed record ApuracaoDiaDto(
    DateOnly Data,
    bool Calculado,
    string TipoDia,
    string Situacao,
    bool Provisorio,
    bool Hoje,
    int PrevistoMinutos,
    int TrabalhadoMinutos,
    int ExtrasMinutos,
    int ExtrasPercentual,
    int ExtrasNoturnasMinutos,
    int AtrasoMinutos,
    int SaidaAntecipadaMinutos,
    int AusenciaParcialMinutos,
    int FaltaMinutos,
    int NoturnoRealMinutos,
    int NoturnoFictoMinutos,
    int IntervaloRealMinutos,
    int IntervaloSuprimidoMinutos,
    int ToleranciaDesconsideradaMinutos,
    int SaldoMinutos,
    int CreditoBancoMinutos,
    int DebitoBancoMinutos,
    int ExtrasAPagarMinutos,
    int DescontoMinutos,
    IReadOnlyList<string> Inconsistencias,
    IReadOnlyList<MarcacaoDto> Marcacoes,
    IReadOnlyList<IntervaloDto> Previsto,
    bool Feriado,
    string? FeriadoNome);

public sealed record DetalheDiaDto(
    ApuracaoDiaDto Dia,
    IReadOnlyList<SegmentoDto> Segmentos,
    IReadOnlyList<RegraDto> Regras,
    string? Jornada,
    int? PoliticaVersao,
    int VersaoMotor,
    DateTime? CalculadoEm);

public sealed record FuncionarioResumoDto(Guid Id, string Nome, string Matricula, string Cargo, Guid EmpresaId, string Empresa);

public sealed record EspelhoDto(
    FuncionarioResumoDto Funcionario,
    string Competencia,
    IReadOnlyList<ApuracaoDiaDto> Dias,
    TotaisPeriodo Totais,
    int SaldoBancoMinutos,
    int AjustesPendentes);

public sealed record ResumoEmpresaLinhaDto(
    Guid FuncionarioId,
    string Nome,
    string Matricula,
    string Cargo,
    TotaisPeriodo Totais,
    int SaldoBancoMinutos,
    int AjustesPendentes);

public sealed record ResumoEmpresaDto(Guid EmpresaId, string Empresa, string Competencia, IReadOnlyList<ResumoEmpresaLinhaDto> Linhas, TotaisPeriodo Totais);

public sealed record ReprocessarRequest(Guid EmpresaId, DateOnly De, DateOnly Ate);

public sealed record ReprocessamentoDto(int Funcionarios, int Dias);
