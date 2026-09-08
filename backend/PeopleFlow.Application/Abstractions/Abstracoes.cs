using Microsoft.EntityFrameworkCore;
using PeopleFlow.Domain.Apuracao;
using PeopleFlow.Domain.Auditoria;
using PeopleFlow.Domain.BancoHoras;
using PeopleFlow.Domain.Empresas;
using PeopleFlow.Domain.Feriados;
using PeopleFlow.Domain.Funcionarios;
using PeopleFlow.Domain.Jornadas;
using PeopleFlow.Domain.Ponto;
using PeopleFlow.Domain.Usuarios;

namespace PeopleFlow.Application.Abstractions;

public interface IPeopleFlowDbContext
{
    DbSet<Empresa> Empresas { get; }
    DbSet<PoliticaEmpresa> Politicas { get; }
    DbSet<Jornada> Jornadas { get; }
    DbSet<JornadaDia> JornadaDias { get; }
    DbSet<JornadaPeriodo> JornadaPeriodos { get; }
    DbSet<Funcionario> Funcionarios { get; }
    DbSet<FuncionarioJornada> FuncionarioJornadas { get; }
    DbSet<Feriado> Feriados { get; }
    DbSet<Marcacao> Marcacoes { get; }
    DbSet<ApuracaoDiaRegistro> Apuracoes { get; }
    DbSet<BancoHorasLancamento> LancamentosBanco { get; }
    DbSet<Usuario> Usuarios { get; }
    DbSet<EventoAuditoria> EventosAuditoria { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

public interface IUsuarioAtual
{
    bool Autenticado { get; }
    Guid Id { get; }
    string Nome { get; }
    Perfil Perfil { get; }
    Guid? FuncionarioId { get; }
}

public interface ISenhaHasher
{
    string Gerar(Usuario usuario, string senha);

    ResultadoSenha Verificar(Usuario usuario, string senha);
}

public enum ResultadoSenha
{
    Invalida,
    Valida,
    ValidaPrecisaAtualizar
}
