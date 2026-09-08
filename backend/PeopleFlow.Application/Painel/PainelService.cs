using Microsoft.EntityFrameworkCore;
using PeopleFlow.Application.Abstractions;
using PeopleFlow.Application.Acesso;
using PeopleFlow.Application.Apuracao;
using PeopleFlow.Application.Comum;
using PeopleFlow.Domain.Apuracao;
using PeopleFlow.Domain.Ponto;

namespace PeopleFlow.Application.Painel;

public sealed record PresencaDto(FuncionarioResumoDto Funcionario, string Status, DateTime? PrimeiraMarcacao, DateTime? PrevistoInicio, bool Atrasado);

public sealed record SerieDiaDto(DateOnly Data, int ExtrasMinutos, int DebitosMinutos);

public sealed record DestaqueDto(FuncionarioResumoDto Funcionario, int Minutos);

public sealed record PainelDto(
    string Perfil,
    DateTime Agora,
    string Competencia,
    int FuncionariosAtivos,
    int PresentesHoje,
    int AusentesHoje,
    int AtrasadosHoje,
    int PrevistosHoje,
    IReadOnlyList<PresencaDto> Presencas,
    int AjustesPendentes,
    int InconsistenciasMes,
    int ExtrasMesMinutos,
    int DebitosMesMinutos,
    int FaltasMes,
    int SaldoBancoMinutos,
    IReadOnlyList<SerieDiaDto> Serie,
    IReadOnlyList<DestaqueDto> MaisExtras,
    IReadOnlyList<DestaqueDto> MaisDebitos);

public sealed class PainelService(IPeopleFlowDbContext db, AcessoService acesso, IUsuarioAtual usuario, Relogio relogio)
{
    private const int AusenteAposMinutos = 10;
    private const int AtrasadoAposMinutos = 5;

    public async Task<PainelDto> ObterAsync(Guid? empresaId, CancellationToken ct)
    {
        var consulta = acesso.FuncionariosVisiveis().AsNoTracking()
            .Include(f => f.Empresa)
            .Include(f => f.Jornadas).ThenInclude(v => v.Jornada).ThenInclude(j => j!.Dias).ThenInclude(d => d.Periodos)
            .Where(f => f.Ativo)
            .AsSplitQuery();
        if (empresaId is not null)
        {
            consulta = consulta.Where(f => f.EmpresaId == empresaId);
        }

        var funcionarios = await consulta.ToListAsync(ct);
        var ids = funcionarios.Select(f => f.Id).ToList();
        var agora = relogio.AgoraLocal(funcionarios.FirstOrDefault()?.Empresa?.FusoHorario ?? Domain.Empresas.Empresa.FusoPadrao);
        var hoje = DateOnly.FromDateTime(agora);
        var (inicioMes, fimMes) = Competencia.Intervalo(null, hoje);

        var inicioHoje = hoje.ToDateTime(TimeOnly.MinValue);
        var fimHoje = hoje.AddDays(1).ToDateTime(new TimeOnly(12, 0));
        var marcacoesHoje = (await db.Marcacoes.AsNoTracking()
                .Where(m => ids.Contains(m.FuncionarioId) && m.DataHora >= inicioHoje && m.DataHora < fimHoje
                    && (m.Origem == OrigemMarcacao.Registro || (m.TipoAjuste == TipoAjuste.Inclusao && m.StatusAjuste == StatusAjuste.Aprovado)))
                .ToListAsync(ct))
            .GroupBy(m => m.FuncionarioId)
            .ToDictionary(g => g.Key, g => g.OrderBy(m => m.DataHora).ToList());

        var presencas = new List<PresencaDto>();
        foreach (var f in funcionarios.OrderBy(f => f.Nome))
        {
            var vinculo = f.Jornadas.Where(v => v.VigenteEm(hoje)).OrderByDescending(v => v.VigenteDesde).FirstOrDefault();
            var previsto = vinculo?.Jornada is null || !f.AtivoEm(hoje) ? [] : ResolvedorJornada.Prever(vinculo.Jornada, vinculo.DataReferenciaCiclo, hoje);
            var virada = hoje.ToDateTime(vinculo?.Jornada?.HoraVirada ?? new TimeOnly(4, 0));
            var marcacoes = (marcacoesHoje.GetValueOrDefault(f.Id) ?? [])
                .Where(m => m.DataHora >= virada && m.DataHora < virada.AddDays(1))
                .ToList();
            var inicioPrevisto = previsto.Count > 0 ? previsto[0].Inicio : (DateTime?)null;

            string status;
            if (marcacoes.Count > 0)
            {
                status = marcacoes.Count % 2 == 1 ? "Trabalhando" : "Fora";
            }
            else if (inicioPrevisto is null)
            {
                status = "Folga";
            }
            else
            {
                status = agora > inicioPrevisto.Value.AddMinutes(AusenteAposMinutos) ? "Ausente" : "Aguardando";
            }

            var primeira = marcacoes.FirstOrDefault()?.DataHora;
            var atrasado = inicioPrevisto is not null && ((primeira is not null && primeira > inicioPrevisto.Value.AddMinutes(AtrasadoAposMinutos)) || status == "Ausente");
            presencas.Add(new PresencaDto(ApuracaoService.Resumo(f), status, primeira, inicioPrevisto, atrasado));
        }

        var registros = await db.Apuracoes.AsNoTracking()
            .Where(a => ids.Contains(a.FuncionarioId) && a.Data >= inicioMes && a.Data <= fimMes && a.Data < hoje)
            .ToListAsync(ct);
        var serie = new List<SerieDiaDto>();
        for (var dia = inicioMes; dia < hoje && dia <= fimMes; dia = dia.AddDays(1))
        {
            var doDia = registros.Where(r => r.Data == dia).ToList();
            serie.Add(new SerieDiaDto(dia, doDia.Sum(r => r.ExtrasMinutos), doDia.Sum(r => r.AtrasoMinutos + r.SaidaAntecipadaMinutos + r.AusenciaParcialMinutos + r.FaltaMinutos)));
        }

        var porFuncionario = registros.GroupBy(r => r.FuncionarioId).ToDictionary(g => g.Key, g => g.ToList());
        var resumo = funcionarios.ToDictionary(f => f.Id, ApuracaoService.Resumo);
        var maisExtras = porFuncionario
            .Select(p => new DestaqueDto(resumo[p.Key], p.Value.Sum(r => r.ExtrasMinutos)))
            .Where(d => d.Minutos > 0).OrderByDescending(d => d.Minutos).Take(5).ToList();
        var maisDebitos = porFuncionario
            .Select(p => new DestaqueDto(resumo[p.Key], p.Value.Sum(r => r.AtrasoMinutos + r.SaidaAntecipadaMinutos + r.AusenciaParcialMinutos + r.FaltaMinutos)))
            .Where(d => d.Minutos > 0).OrderByDescending(d => d.Minutos).Take(5).ToList();

        var pendentes = await db.Marcacoes.CountAsync(m => ids.Contains(m.FuncionarioId) && m.StatusAjuste == StatusAjuste.Pendente, ct);
        var saldo = await db.LancamentosBanco.Where(l => ids.Contains(l.FuncionarioId)).SumAsync(l => (int?)l.Minutos, ct) ?? 0;

        return new PainelDto(
            usuario.Perfil.ToString(),
            agora,
            Competencia.Formatar(inicioMes),
            funcionarios.Count,
            presencas.Count(p => p.Status is "Trabalhando" or "Fora"),
            presencas.Count(p => p.Status == "Ausente"),
            presencas.Count(p => p.Atrasado),
            presencas.Count(p => p.Status != "Folga"),
            presencas,
            pendentes,
            registros.Count(r => r.Situacao == SituacaoDia.Inconsistente),
            registros.Sum(r => r.ExtrasMinutos),
            registros.Sum(r => r.AtrasoMinutos + r.SaidaAntecipadaMinutos + r.AusenciaParcialMinutos + r.FaltaMinutos),
            registros.Count(r => r.Situacao == SituacaoDia.Falta),
            saldo,
            serie,
            maisExtras,
            maisDebitos);
    }
}
