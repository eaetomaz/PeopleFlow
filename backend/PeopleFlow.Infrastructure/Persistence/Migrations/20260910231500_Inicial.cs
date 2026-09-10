using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PeopleFlow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Inicial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Empresas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    RazaoSocial = table.Column<string>(type: "TEXT", maxLength: 160, nullable: false),
                    NomeFantasia = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Cnpj = table.Column<string>(type: "TEXT", maxLength: 14, nullable: false),
                    Uf = table.Column<string>(type: "TEXT", maxLength: 2, nullable: false),
                    Municipio = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    FusoHorario = table.Column<string>(type: "TEXT", maxLength: 60, nullable: false),
                    Cor = table.Column<string>(type: "TEXT", maxLength: 7, nullable: false),
                    Ativa = table.Column<bool>(type: "INTEGER", nullable: false),
                    UltimoNsr = table.Column<int>(type: "INTEGER", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "TEXT", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Empresas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EventosAuditoria",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Quando = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "TEXT", nullable: true),
                    UsuarioNome = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    Entidade = table.Column<string>(type: "TEXT", maxLength: 60, nullable: false),
                    EntidadeId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Acao = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    DetalhesJson = table.Column<string>(type: "TEXT", nullable: true),
                    CorrelationId = table.Column<string>(type: "TEXT", maxLength: 64, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EventosAuditoria", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Feriados",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Data = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    Nome = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Abrangencia = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    Uf = table.Column<string>(type: "TEXT", maxLength: 2, nullable: true),
                    Municipio = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    EmpresaId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Tipo = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "TEXT", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Feriados", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Feriados_Empresas_EmpresaId",
                        column: x => x.EmpresaId,
                        principalTable: "Empresas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Funcionarios",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    EmpresaId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Matricula = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    Nome = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    Cpf = table.Column<string>(type: "TEXT", maxLength: 11, nullable: false),
                    Pis = table.Column<string>(type: "TEXT", maxLength: 11, nullable: true),
                    Cargo = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    Departamento = table.Column<string>(type: "TEXT", maxLength: 80, nullable: true),
                    CentroCusto = table.Column<string>(type: "TEXT", maxLength: 40, nullable: true),
                    Email = table.Column<string>(type: "TEXT", maxLength: 160, nullable: true),
                    DataAdmissao = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    DataDemissao = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    GestorId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Ativo = table.Column<bool>(type: "INTEGER", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "TEXT", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Funcionarios", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Funcionarios_Empresas_EmpresaId",
                        column: x => x.EmpresaId,
                        principalTable: "Empresas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Funcionarios_Funcionarios_GestorId",
                        column: x => x.GestorId,
                        principalTable: "Funcionarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Jornadas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    EmpresaId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Nome = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    Tipo = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    HoraVirada = table.Column<TimeOnly>(type: "TEXT", nullable: false),
                    FeriadosCompensados = table.Column<bool>(type: "INTEGER", nullable: false),
                    Ativa = table.Column<bool>(type: "INTEGER", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "TEXT", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Jornadas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Jornadas_Empresas_EmpresaId",
                        column: x => x.EmpresaId,
                        principalTable: "Empresas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Politicas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    EmpresaId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Versao = table.Column<int>(type: "INTEGER", nullable: false),
                    VigenteDesde = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    ToleranciaPorMarcacaoMinutos = table.Column<int>(type: "INTEGER", nullable: false),
                    ToleranciaDiariaMinutos = table.Column<int>(type: "INTEGER", nullable: false),
                    ModoTolerancia = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    DestinoHoraExtra = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    DestinoHeDescansoFeriado = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    PercentualHeDiaUtil = table.Column<int>(type: "INTEGER", nullable: false),
                    PercentualHeDescansoFeriado = table.Column<int>(type: "INTEGER", nullable: false),
                    LimiteDiarioHeMinutos = table.Column<int>(type: "INTEGER", nullable: false),
                    AdicionalNoturnoPercentual = table.Column<int>(type: "INTEGER", nullable: false),
                    InicioNoturno = table.Column<TimeOnly>(type: "TEXT", nullable: false),
                    FimNoturno = table.Column<TimeOnly>(type: "TEXT", nullable: false),
                    HoraNoturnaReduzida = table.Column<bool>(type: "INTEGER", nullable: false),
                    ProrrogacaoNoturna = table.Column<bool>(type: "INTEGER", nullable: false),
                    IntervaloMinimoAcima6hMinutos = table.Column<int>(type: "INTEGER", nullable: false),
                    IntervaloMinimo4a6hMinutos = table.Column<int>(type: "INTEGER", nullable: false),
                    InterjornadaMinimaMinutos = table.Column<int>(type: "INTEGER", nullable: false),
                    ValidadeBancoMeses = table.Column<int>(type: "INTEGER", nullable: false),
                    JanelaDuplicidadeMinutos = table.Column<int>(type: "INTEGER", nullable: false),
                    Observacao = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    CriadoPorId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CriadoEm = table.Column<DateTime>(type: "TEXT", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Politicas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Politicas_Empresas_EmpresaId",
                        column: x => x.EmpresaId,
                        principalTable: "Empresas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Apuracoes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    FuncionarioId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Data = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    TipoDia = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    Situacao = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    Provisorio = table.Column<bool>(type: "INTEGER", nullable: false),
                    PrevistoMinutos = table.Column<int>(type: "INTEGER", nullable: false),
                    TrabalhadoMinutos = table.Column<int>(type: "INTEGER", nullable: false),
                    ExtrasMinutos = table.Column<int>(type: "INTEGER", nullable: false),
                    ExtrasPercentual = table.Column<int>(type: "INTEGER", nullable: false),
                    ExtrasNoturnasMinutos = table.Column<int>(type: "INTEGER", nullable: false),
                    AtrasoMinutos = table.Column<int>(type: "INTEGER", nullable: false),
                    SaidaAntecipadaMinutos = table.Column<int>(type: "INTEGER", nullable: false),
                    AusenciaParcialMinutos = table.Column<int>(type: "INTEGER", nullable: false),
                    FaltaMinutos = table.Column<int>(type: "INTEGER", nullable: false),
                    NoturnoRealMinutos = table.Column<int>(type: "INTEGER", nullable: false),
                    NoturnoFictoMinutos = table.Column<int>(type: "INTEGER", nullable: false),
                    IntervaloRealMinutos = table.Column<int>(type: "INTEGER", nullable: false),
                    IntervaloSuprimidoMinutos = table.Column<int>(type: "INTEGER", nullable: false),
                    ToleranciaDesconsideradaMinutos = table.Column<int>(type: "INTEGER", nullable: false),
                    SaldoMinutos = table.Column<int>(type: "INTEGER", nullable: false),
                    CreditoBancoMinutos = table.Column<int>(type: "INTEGER", nullable: false),
                    DebitoBancoMinutos = table.Column<int>(type: "INTEGER", nullable: false),
                    ExtrasAPagarMinutos = table.Column<int>(type: "INTEGER", nullable: false),
                    DescontoMinutos = table.Column<int>(type: "INTEGER", nullable: false),
                    InconsistenciasJson = table.Column<string>(type: "TEXT", nullable: false),
                    RegrasJson = table.Column<string>(type: "TEXT", nullable: false),
                    SegmentosJson = table.Column<string>(type: "TEXT", nullable: false),
                    PrevistoJson = table.Column<string>(type: "TEXT", nullable: false),
                    PoliticaId = table.Column<Guid>(type: "TEXT", nullable: true),
                    JornadaId = table.Column<Guid>(type: "TEXT", nullable: true),
                    VersaoMotor = table.Column<int>(type: "INTEGER", nullable: false),
                    CalculadoEm = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "TEXT", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Apuracoes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Apuracoes_Funcionarios_FuncionarioId",
                        column: x => x.FuncionarioId,
                        principalTable: "Funcionarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BancoHorasLancamentos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    FuncionarioId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Data = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    Minutos = table.Column<int>(type: "INTEGER", nullable: false),
                    Tipo = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    Descricao = table.Column<string>(type: "TEXT", maxLength: 300, nullable: false),
                    VenceEm = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    CriadoPorId = table.Column<Guid>(type: "TEXT", nullable: true),
                    FechamentoId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CriadoEm = table.Column<DateTime>(type: "TEXT", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BancoHorasLancamentos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BancoHorasLancamentos_Funcionarios_FuncionarioId",
                        column: x => x.FuncionarioId,
                        principalTable: "Funcionarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Usuarios",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Login = table.Column<string>(type: "TEXT", maxLength: 40, nullable: false, collation: "NOCASE"),
                    Nome = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    SenhaHash = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Perfil = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    FuncionarioId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Ativo = table.Column<bool>(type: "INTEGER", nullable: false),
                    CarimboSeguranca = table.Column<Guid>(type: "TEXT", nullable: false),
                    SenhaPadrao = table.Column<bool>(type: "INTEGER", nullable: false),
                    TentativasFalhas = table.Column<int>(type: "INTEGER", nullable: false),
                    BloqueadoAte = table.Column<DateTime>(type: "TEXT", nullable: true),
                    UltimoAcessoEm = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CriadoEm = table.Column<DateTime>(type: "TEXT", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Usuarios", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Usuarios_Funcionarios_FuncionarioId",
                        column: x => x.FuncionarioId,
                        principalTable: "Funcionarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "FuncionarioJornadas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    FuncionarioId = table.Column<Guid>(type: "TEXT", nullable: false),
                    JornadaId = table.Column<Guid>(type: "TEXT", nullable: false),
                    VigenteDesde = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    VigenteAte = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    DataReferenciaCiclo = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    CriadoEm = table.Column<DateTime>(type: "TEXT", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FuncionarioJornadas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FuncionarioJornadas_Funcionarios_FuncionarioId",
                        column: x => x.FuncionarioId,
                        principalTable: "Funcionarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FuncionarioJornadas_Jornadas_JornadaId",
                        column: x => x.JornadaId,
                        principalTable: "Jornadas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "JornadaDias",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    JornadaId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Indice = table.Column<int>(type: "INTEGER", nullable: false),
                    Folga = table.Column<bool>(type: "INTEGER", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "TEXT", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JornadaDias", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JornadaDias_Jornadas_JornadaId",
                        column: x => x.JornadaId,
                        principalTable: "Jornadas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Marcacoes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    FuncionarioId = table.Column<Guid>(type: "TEXT", nullable: false),
                    DataHora = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Nsr = table.Column<int>(type: "INTEGER", nullable: false),
                    Origem = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    RegistradoEm = table.Column<DateTime>(type: "TEXT", nullable: false),
                    TipoAjuste = table.Column<string>(type: "TEXT", maxLength: 30, nullable: true),
                    MarcacaoAlvoId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Justificativa = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    StatusAjuste = table.Column<string>(type: "TEXT", maxLength: 30, nullable: true),
                    SolicitadoPorId = table.Column<Guid>(type: "TEXT", nullable: true),
                    SolicitadoEm = table.Column<DateTime>(type: "TEXT", nullable: true),
                    DecididoPorId = table.Column<Guid>(type: "TEXT", nullable: true),
                    DecididoEm = table.Column<DateTime>(type: "TEXT", nullable: true),
                    MotivoDecisao = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    CriadoEm = table.Column<DateTime>(type: "TEXT", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Marcacoes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Marcacoes_Funcionarios_FuncionarioId",
                        column: x => x.FuncionarioId,
                        principalTable: "Funcionarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Marcacoes_Marcacoes_MarcacaoAlvoId",
                        column: x => x.MarcacaoAlvoId,
                        principalTable: "Marcacoes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Marcacoes_Usuarios_DecididoPorId",
                        column: x => x.DecididoPorId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Marcacoes_Usuarios_SolicitadoPorId",
                        column: x => x.SolicitadoPorId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "JornadaPeriodos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    JornadaDiaId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Ordem = table.Column<int>(type: "INTEGER", nullable: false),
                    Entrada = table.Column<TimeOnly>(type: "TEXT", nullable: false),
                    Saida = table.Column<TimeOnly>(type: "TEXT", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "TEXT", nullable: false),
                    AtualizadoEm = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JornadaPeriodos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JornadaPeriodos_JornadaDias_JornadaDiaId",
                        column: x => x.JornadaDiaId,
                        principalTable: "JornadaDias",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Apuracoes_Data",
                table: "Apuracoes",
                column: "Data");

            migrationBuilder.CreateIndex(
                name: "IX_Apuracoes_FuncionarioId_Data",
                table: "Apuracoes",
                columns: new[] { "FuncionarioId", "Data" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BancoHorasLancamentos_FuncionarioId_Data",
                table: "BancoHorasLancamentos",
                columns: new[] { "FuncionarioId", "Data" });

            migrationBuilder.CreateIndex(
                name: "IX_Empresas_Cnpj",
                table: "Empresas",
                column: "Cnpj",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EventosAuditoria_Entidade_EntidadeId",
                table: "EventosAuditoria",
                columns: new[] { "Entidade", "EntidadeId" });

            migrationBuilder.CreateIndex(
                name: "IX_EventosAuditoria_Quando",
                table: "EventosAuditoria",
                column: "Quando");

            migrationBuilder.CreateIndex(
                name: "IX_Feriados_Data",
                table: "Feriados",
                column: "Data");

            migrationBuilder.CreateIndex(
                name: "IX_Feriados_EmpresaId",
                table: "Feriados",
                column: "EmpresaId");

            migrationBuilder.CreateIndex(
                name: "IX_FuncionarioJornadas_FuncionarioId_VigenteDesde",
                table: "FuncionarioJornadas",
                columns: new[] { "FuncionarioId", "VigenteDesde" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FuncionarioJornadas_JornadaId",
                table: "FuncionarioJornadas",
                column: "JornadaId");

            migrationBuilder.CreateIndex(
                name: "IX_Funcionarios_EmpresaId_Matricula",
                table: "Funcionarios",
                columns: new[] { "EmpresaId", "Matricula" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Funcionarios_GestorId",
                table: "Funcionarios",
                column: "GestorId");

            migrationBuilder.CreateIndex(
                name: "IX_JornadaDias_JornadaId_Indice",
                table: "JornadaDias",
                columns: new[] { "JornadaId", "Indice" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JornadaPeriodos_JornadaDiaId",
                table: "JornadaPeriodos",
                column: "JornadaDiaId");

            migrationBuilder.CreateIndex(
                name: "IX_Jornadas_EmpresaId",
                table: "Jornadas",
                column: "EmpresaId");

            migrationBuilder.CreateIndex(
                name: "IX_Marcacoes_DecididoPorId",
                table: "Marcacoes",
                column: "DecididoPorId");

            migrationBuilder.CreateIndex(
                name: "IX_Marcacoes_FuncionarioId_DataHora",
                table: "Marcacoes",
                columns: new[] { "FuncionarioId", "DataHora" });

            migrationBuilder.CreateIndex(
                name: "IX_Marcacoes_MarcacaoAlvoId",
                table: "Marcacoes",
                column: "MarcacaoAlvoId");

            migrationBuilder.CreateIndex(
                name: "IX_Marcacoes_SolicitadoPorId",
                table: "Marcacoes",
                column: "SolicitadoPorId");

            migrationBuilder.CreateIndex(
                name: "IX_Marcacoes_StatusAjuste",
                table: "Marcacoes",
                column: "StatusAjuste");

            migrationBuilder.CreateIndex(
                name: "IX_Politicas_EmpresaId_Versao",
                table: "Politicas",
                columns: new[] { "EmpresaId", "Versao" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_FuncionarioId",
                table: "Usuarios",
                column: "FuncionarioId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_Login",
                table: "Usuarios",
                column: "Login",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Apuracoes");

            migrationBuilder.DropTable(
                name: "BancoHorasLancamentos");

            migrationBuilder.DropTable(
                name: "EventosAuditoria");

            migrationBuilder.DropTable(
                name: "Feriados");

            migrationBuilder.DropTable(
                name: "FuncionarioJornadas");

            migrationBuilder.DropTable(
                name: "JornadaPeriodos");

            migrationBuilder.DropTable(
                name: "Marcacoes");

            migrationBuilder.DropTable(
                name: "Politicas");

            migrationBuilder.DropTable(
                name: "JornadaDias");

            migrationBuilder.DropTable(
                name: "Usuarios");

            migrationBuilder.DropTable(
                name: "Jornadas");

            migrationBuilder.DropTable(
                name: "Funcionarios");

            migrationBuilder.DropTable(
                name: "Empresas");
        }
    }
}
