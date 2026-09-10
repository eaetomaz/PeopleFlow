using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using PeopleFlow.Application.Abstractions;
using PeopleFlow.Domain.Apuracao;
using PeopleFlow.Domain.Auditoria;
using PeopleFlow.Domain.BancoHoras;
using PeopleFlow.Domain.Empresas;
using PeopleFlow.Domain.Feriados;
using PeopleFlow.Domain.Funcionarios;
using PeopleFlow.Domain.Jornadas;
using PeopleFlow.Domain.Ponto;
using PeopleFlow.Domain.Usuarios;

namespace PeopleFlow.Infrastructure.Persistence;

public sealed class PeopleFlowDbContext(DbContextOptions<PeopleFlowDbContext> options) : DbContext(options), IPeopleFlowDbContext
{
    public DbSet<Empresa> Empresas => Set<Empresa>();
    public DbSet<PoliticaEmpresa> Politicas => Set<PoliticaEmpresa>();
    public DbSet<Jornada> Jornadas => Set<Jornada>();
    public DbSet<JornadaDia> JornadaDias => Set<JornadaDia>();
    public DbSet<JornadaPeriodo> JornadaPeriodos => Set<JornadaPeriodo>();
    public DbSet<Funcionario> Funcionarios => Set<Funcionario>();
    public DbSet<FuncionarioJornada> FuncionarioJornadas => Set<FuncionarioJornada>();
    public DbSet<Feriado> Feriados => Set<Feriado>();
    public DbSet<Marcacao> Marcacoes => Set<Marcacao>();
    public DbSet<ApuracaoDiaRegistro> Apuracoes => Set<ApuracaoDiaRegistro>();
    public DbSet<BancoHorasLancamento> LancamentosBanco => Set<BancoHorasLancamento>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<EventoAuditoria> EventosAuditoria => Set<EventoAuditoria>();

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
        configurationBuilder.Properties<DateTime?>().HaveConversion<NullableUtcDateTimeConverter>();
        configurationBuilder.Properties<Enum>().HaveConversion<string>().HaveMaxLength(30);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Empresa>(e =>
        {
            e.ToTable("Empresas");
            e.Property(x => x.RazaoSocial).HasMaxLength(160).IsRequired();
            e.Property(x => x.NomeFantasia).HasMaxLength(100).IsRequired();
            e.Property(x => x.Cnpj).HasMaxLength(14).IsRequired();
            e.Property(x => x.Uf).HasMaxLength(2).IsRequired();
            e.Property(x => x.Municipio).HasMaxLength(100).IsRequired();
            e.Property(x => x.FusoHorario).HasMaxLength(60).IsRequired();
            e.Property(x => x.Cor).HasMaxLength(7).IsRequired();
            e.HasIndex(x => x.Cnpj).IsUnique();
            e.HasMany(x => x.Politicas).WithOne().HasForeignKey(p => p.EmpresaId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PoliticaEmpresa>(e =>
        {
            e.ToTable("Politicas");
            e.Property(x => x.Observacao).HasMaxLength(500);
            e.HasIndex(x => new { x.EmpresaId, x.Versao }).IsUnique();
        });

        modelBuilder.Entity<Jornada>(e =>
        {
            e.ToTable("Jornadas");
            e.Property(x => x.Nome).HasMaxLength(80).IsRequired();
            e.HasOne<Empresa>().WithMany().HasForeignKey(x => x.EmpresaId).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(x => x.Dias).WithOne().HasForeignKey(d => d.JornadaId).OnDelete(DeleteBehavior.Cascade);
            e.Ignore(x => x.CargaCicloMinutos);
        });

        modelBuilder.Entity<JornadaDia>(e =>
        {
            e.ToTable("JornadaDias");
            e.HasMany(x => x.Periodos).WithOne().HasForeignKey(p => p.JornadaDiaId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.JornadaId, x.Indice }).IsUnique();
            e.Ignore(x => x.CargaMinutos);
        });

        modelBuilder.Entity<JornadaPeriodo>(e =>
        {
            e.ToTable("JornadaPeriodos");
            e.Ignore(x => x.DuracaoMinutos);
        });

        modelBuilder.Entity<Funcionario>(e =>
        {
            e.ToTable("Funcionarios");
            e.Property(x => x.Matricula).HasMaxLength(20).IsRequired();
            e.Property(x => x.Nome).HasMaxLength(120).IsRequired();
            e.Property(x => x.Cpf).HasMaxLength(11).IsRequired();
            e.Property(x => x.Pis).HasMaxLength(11);
            e.Property(x => x.Cargo).HasMaxLength(80).IsRequired();
            e.Property(x => x.Departamento).HasMaxLength(80);
            e.Property(x => x.CentroCusto).HasMaxLength(40);
            e.Property(x => x.Email).HasMaxLength(160);
            e.HasOne(x => x.Empresa).WithMany().HasForeignKey(x => x.EmpresaId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Gestor).WithMany().HasForeignKey(x => x.GestorId).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(x => x.Jornadas).WithOne().HasForeignKey(v => v.FuncionarioId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.EmpresaId, x.Matricula }).IsUnique();
        });

        modelBuilder.Entity<FuncionarioJornada>(e =>
        {
            e.ToTable("FuncionarioJornadas");
            e.HasOne(x => x.Jornada).WithMany().HasForeignKey(x => x.JornadaId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.FuncionarioId, x.VigenteDesde }).IsUnique();
        });

        modelBuilder.Entity<Feriado>(e =>
        {
            e.ToTable("Feriados");
            e.Property(x => x.Nome).HasMaxLength(100).IsRequired();
            e.Property(x => x.Uf).HasMaxLength(2);
            e.Property(x => x.Municipio).HasMaxLength(100);
            e.HasOne<Empresa>().WithMany().HasForeignKey(x => x.EmpresaId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.Data);
        });

        modelBuilder.Entity<Marcacao>(e =>
        {
            e.ToTable("Marcacoes");
            e.Property(x => x.DataHora).HasConversion(new ValueConverter<DateTime, DateTime>(
                v => DateTime.SpecifyKind(v, DateTimeKind.Unspecified),
                v => DateTime.SpecifyKind(v, DateTimeKind.Unspecified)));
            e.Property(x => x.Justificativa).HasMaxLength(Marcacao.JustificativaMaxima);
            e.Property(x => x.MotivoDecisao).HasMaxLength(500);
            e.HasOne(x => x.Funcionario).WithMany().HasForeignKey(x => x.FuncionarioId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.SolicitadoPorId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.DecididoPorId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Marcacao>().WithMany().HasForeignKey(x => x.MarcacaoAlvoId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.FuncionarioId, x.DataHora });
            e.HasIndex(x => x.StatusAjuste);
        });

        modelBuilder.Entity<ApuracaoDiaRegistro>(e =>
        {
            e.ToTable("Apuracoes");
            e.HasOne<Funcionario>().WithMany().HasForeignKey(x => x.FuncionarioId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.FuncionarioId, x.Data }).IsUnique();
            e.HasIndex(x => x.Data);
        });

        modelBuilder.Entity<BancoHorasLancamento>(e =>
        {
            e.ToTable("BancoHorasLancamentos");
            e.Property(x => x.Descricao).HasMaxLength(300).IsRequired();
            e.HasOne<Funcionario>().WithMany().HasForeignKey(x => x.FuncionarioId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.FuncionarioId, x.Data });
        });

        modelBuilder.Entity<Usuario>(e =>
        {
            e.ToTable("Usuarios");
            e.Property(x => x.Login).HasMaxLength(40).IsRequired().UseCollation("NOCASE");
            e.Property(x => x.Nome).HasMaxLength(120).IsRequired();
            e.Property(x => x.SenhaHash).HasMaxLength(200).IsRequired();
            e.HasOne(x => x.Funcionario).WithMany().HasForeignKey(x => x.FuncionarioId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.Login).IsUnique();
            e.HasIndex(x => x.FuncionarioId).IsUnique();
        });

        modelBuilder.Entity<EventoAuditoria>(e =>
        {
            e.ToTable("EventosAuditoria");
            e.Property(x => x.UsuarioNome).HasMaxLength(120).IsRequired();
            e.Property(x => x.Entidade).HasMaxLength(60).IsRequired();
            e.Property(x => x.Acao).HasMaxLength(20).IsRequired();
            e.Property(x => x.CorrelationId).HasMaxLength(64);
            e.HasIndex(x => x.Quando);
            e.HasIndex(x => new { x.Entidade, x.EntidadeId });
        });
    }
}

public sealed class UtcDateTimeConverter() : ValueConverter<DateTime, DateTime>(
    value => value.Kind == DateTimeKind.Utc ? value : value.ToUniversalTime(),
    value => DateTime.SpecifyKind(value, DateTimeKind.Utc));

public sealed class NullableUtcDateTimeConverter() : ValueConverter<DateTime?, DateTime?>(
    value => value.HasValue ? (value.Value.Kind == DateTimeKind.Utc ? value.Value : value.Value.ToUniversalTime()) : value,
    value => value.HasValue ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc) : value);
