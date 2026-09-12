using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PeopleFlow.API.Hosting;
using PeopleFlow.Application.Apuracao;
using PeopleFlow.Application.BancoHoras;
using PeopleFlow.Application.Empresas;
using PeopleFlow.Application.Feriados;
using PeopleFlow.Application.Funcionarios;
using PeopleFlow.Application.Jornadas;
using PeopleFlow.Application.Ponto;
using PeopleFlow.Application.Usuarios;

namespace PeopleFlow.API.Controllers;

[Route("api/usuarios")]
[Authorize(Policy = Politicas.Administrar)]
public sealed class UsuariosController(UsuarioService servico) : ApiControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<UsuarioDto>> Listar(CancellationToken ct) => servico.ListarAsync(ct);

    [HttpPost]
    public Task<UsuarioDto> Criar(CriarUsuarioRequest request, CancellationToken ct) => servico.CriarAsync(request, ct);

    [HttpPut("{id:guid}")]
    public Task<UsuarioDto> Atualizar(Guid id, AtualizarUsuarioRequest request, CancellationToken ct) => servico.AtualizarAsync(id, request, ct);

    [HttpPost("{id:guid}/redefinir-senha")]
    public async Task<IActionResult> RedefinirSenha(Guid id, RedefinirSenhaRequest request, CancellationToken ct)
    {
        await servico.RedefinirSenhaAsync(id, request, ct);
        return NoContent();
    }
}

[Route("api/empresas")]
public sealed class EmpresasController(EmpresaService servico, ApuracaoService apuracao) : ApiControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<EmpresaDto>> Listar(CancellationToken ct) => servico.ListarAsync(ct);

    [HttpGet("{id:guid}")]
    public Task<EmpresaDto> Obter(Guid id, CancellationToken ct) => servico.ObterAsync(id, ct);

    [HttpPost]
    [Authorize(Policy = Politicas.GerirCadastros)]
    public Task<EmpresaDto> Criar(SalvarEmpresaRequest request, CancellationToken ct) => servico.CriarAsync(request, ct);

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Politicas.GerirCadastros)]
    public Task<EmpresaDto> Atualizar(Guid id, SalvarEmpresaRequest request, CancellationToken ct) => servico.AtualizarAsync(id, request, ct);

    [HttpGet("{id:guid}/politicas")]
    [Authorize(Policy = Politicas.VerEquipe)]
    public Task<IReadOnlyList<PoliticaDto>> ListarPoliticas(Guid id, CancellationToken ct) => servico.PoliticasAsync(id, ct);

    [HttpGet("{id:guid}/politicas/vigente")]
    public Task<PoliticaDto> PoliticaVigente(Guid id, CancellationToken ct) => servico.PoliticaVigenteAsync(id, ct);

    [HttpPost("{id:guid}/politicas")]
    [Authorize(Policy = Politicas.GerirCadastros)]
    public Task<NovaPoliticaDto> NovaPolitica(Guid id, SalvarPoliticaRequest request, CancellationToken ct) => servico.NovaPoliticaAsync(id, request, ct);

    [HttpGet("{id:guid}/apuracao")]
    [Authorize(Policy = Politicas.VerEquipe)]
    public Task<ResumoEmpresaDto> Apuracao(Guid id, [FromQuery] string? competencia, CancellationToken ct) => apuracao.ResumoEmpresaAsync(id, competencia, ct);
}

[Route("api/feriados")]
public sealed class FeriadosController(FeriadoService servico) : ApiControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<FeriadoDto>> Listar([FromQuery] int? ano, [FromQuery] Guid? empresaId, CancellationToken ct) =>
        servico.ListarAsync(ano ?? DateTime.Today.Year, empresaId, ct);

    [HttpPost]
    [Authorize(Policy = Politicas.GerirCadastros)]
    public Task<FeriadoDto> Criar(SalvarFeriadoRequest request, CancellationToken ct) => servico.CriarAsync(request, ct);

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Politicas.GerirCadastros)]
    public Task<FeriadoDto> Atualizar(Guid id, SalvarFeriadoRequest request, CancellationToken ct) => servico.AtualizarAsync(id, request, ct);

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Politicas.GerirCadastros)]
    public async Task<IActionResult> Excluir(Guid id, CancellationToken ct)
    {
        await servico.ExcluirAsync(id, ct);
        return NoContent();
    }
}

[Route("api/jornadas")]
public sealed class JornadasController(JornadaService servico) : ApiControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<JornadaDto>> Listar([FromQuery] Guid? empresaId, CancellationToken ct) => servico.ListarAsync(empresaId, ct);

    [HttpGet("{id:guid}")]
    public Task<JornadaDto> Obter(Guid id, CancellationToken ct) => servico.ObterAsync(id, ct);

    [HttpPost]
    [Authorize(Policy = Politicas.GerirCadastros)]
    public Task<JornadaDto> Criar(SalvarJornadaRequest request, CancellationToken ct) => servico.CriarAsync(request, ct);

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Politicas.GerirCadastros)]
    public Task<JornadaDto> Atualizar(Guid id, SalvarJornadaRequest request, CancellationToken ct) => servico.AtualizarAsync(id, request, ct);

    [HttpGet("{id:guid}/previsao")]
    public Task<IReadOnlyList<PrevisaoDiaDto>> Previsao(Guid id, [FromQuery] DateOnly de, [FromQuery] DateOnly ate, [FromQuery] DateOnly? referenciaCiclo, CancellationToken ct) =>
        servico.PrevisaoAsync(id, de, ate, referenciaCiclo, ct);
}

[Route("api/funcionarios")]
public sealed class FuncionariosController(
    FuncionarioService servico,
    ApuracaoService apuracao,
    PontoService ponto,
    BancoHorasService banco) : ApiControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<FuncionarioListaDto>> Listar([FromQuery] Guid? empresaId, [FromQuery] string? busca, [FromQuery] bool? ativo, CancellationToken ct) =>
        servico.ListarAsync(empresaId, busca, ativo, ct);

    [HttpGet("{id:guid}")]
    public Task<FuncionarioDetalheDto> Obter(Guid id, CancellationToken ct) => servico.ObterAsync(id, ct);

    [HttpPost]
    [Authorize(Policy = Politicas.GerirCadastros)]
    public Task<FuncionarioDetalheDto> Criar(SalvarFuncionarioRequest request, CancellationToken ct) => servico.CriarAsync(request, ct);

    [HttpPut("{id:guid}")]
    [Authorize(Policy = Politicas.GerirCadastros)]
    public Task<FuncionarioDetalheDto> Atualizar(Guid id, SalvarFuncionarioRequest request, CancellationToken ct) => servico.AtualizarAsync(id, request, ct);

    [HttpPost("{id:guid}/jornadas")]
    [Authorize(Policy = Politicas.GerirCadastros)]
    public Task<FuncionarioDetalheDto> AdicionarVinculo(Guid id, NovoVinculoRequest request, CancellationToken ct) => servico.AdicionarVinculoAsync(id, request, ct);

    [HttpPut("{id:guid}/jornadas/{vinculoId:guid}")]
    [Authorize(Policy = Politicas.GerirCadastros)]
    public Task<FuncionarioDetalheDto> AtualizarVinculo(Guid id, Guid vinculoId, AtualizarVinculoRequest request, CancellationToken ct) =>
        servico.AtualizarVinculoAsync(id, vinculoId, request, ct);

    [HttpGet("{id:guid}/marcacoes")]
    public Task<IReadOnlyList<MarcacaoDto>> Marcacoes(Guid id, [FromQuery] DateOnly de, [FromQuery] DateOnly ate, CancellationToken ct) =>
        ponto.MarcacoesAsync(id, de, ate, ct);

    [HttpGet("{id:guid}/apuracao")]
    public Task<EspelhoDto> Espelho(Guid id, [FromQuery] string? competencia, CancellationToken ct) => apuracao.EspelhoAsync(id, competencia, ct);

    [HttpGet("{id:guid}/apuracao/{data}")]
    public Task<DetalheDiaDto> Dia(Guid id, DateOnly data, CancellationToken ct) => apuracao.DetalheDiaAsync(id, data, ct);

    [HttpGet("{id:guid}/banco-horas")]
    public Task<BancoHorasDto> BancoHoras(Guid id, CancellationToken ct) => banco.SituacaoAsync(id, ct);
}
