using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PeopleFlow.API.Hosting;
using PeopleFlow.Application.Apuracao;
using PeopleFlow.Application.BancoHoras;
using PeopleFlow.Application.Painel;
using PeopleFlow.Application.Ponto;
using PeopleFlow.Domain.Ponto;

namespace PeopleFlow.API.Controllers;

[Route("api/ponto")]
public sealed class PontoController(PontoService servico) : ApiControllerBase
{
    [HttpPost("registrar")]
    public Task<RegistroPontoDto> Registrar(CancellationToken ct) => servico.RegistrarAsync(ct);

    [HttpGet("hoje")]
    public Task<PontoHojeDto> Hoje(CancellationToken ct) => servico.HojeAsync(ct);
}

[Route("api/ajustes")]
public sealed class AjustesController(AjusteService servico) : ApiControllerBase
{
    [HttpPost]
    public Task<AjusteDto> Solicitar(SolicitarAjusteRequest request, CancellationToken ct) => servico.SolicitarAsync(request, ct);

    [HttpGet]
    public Task<IReadOnlyList<AjusteDto>> Listar([FromQuery] StatusAjuste? status, [FromQuery] Guid? empresaId, [FromQuery] Guid? funcionarioId, CancellationToken ct) =>
        servico.ListarAsync(status, empresaId, funcionarioId, ct);

    [HttpPost("{id:guid}/aprovar")]
    [Authorize(Policy = Politicas.AprovarAjustes)]
    public Task<AjusteDto> Aprovar(Guid id, [FromBody(EmptyBodyBehavior = Microsoft.AspNetCore.Mvc.ModelBinding.EmptyBodyBehavior.Allow)] DecisaoAjusteRequest? request, CancellationToken ct) =>
        servico.AprovarAsync(id, request ?? new DecisaoAjusteRequest(null), ct);

    [HttpPost("{id:guid}/rejeitar")]
    [Authorize(Policy = Politicas.AprovarAjustes)]
    public Task<AjusteDto> Rejeitar(Guid id, DecisaoAjusteRequest request, CancellationToken ct) => servico.RejeitarAsync(id, request, ct);
}

[Route("api/apuracao")]
public sealed class ApuracaoController(ApuracaoService servico) : ApiControllerBase
{
    [HttpPost("reprocessar")]
    [Authorize(Policy = Politicas.GerirCadastros)]
    public Task<ReprocessamentoDto> Reprocessar(ReprocessarRequest request, CancellationToken ct) => servico.ReprocessarAsync(request, ct);
}

[Route("api/banco-horas")]
public sealed class BancoHorasController(BancoHorasService servico) : ApiControllerBase
{
    [HttpGet]
    [Authorize(Policy = Politicas.VerEquipe)]
    public Task<IReadOnlyList<SaldoFuncionarioDto>> Saldos([FromQuery] Guid? empresaId, CancellationToken ct) => servico.SaldosAsync(empresaId, ct);

    [HttpPost("lancamentos")]
    [Authorize(Policy = Politicas.GerirCadastros)]
    public Task<BancoHorasDto> Lancar(LancarAjusteBancoRequest request, CancellationToken ct) => servico.LancarAjusteAsync(request, ct);
}

[Route("api/painel")]
public sealed class PainelController(PainelService servico) : ApiControllerBase
{
    [HttpGet]
    public Task<PainelDto> Obter([FromQuery] Guid? empresaId, CancellationToken ct) => servico.ObterAsync(empresaId, ct);
}
