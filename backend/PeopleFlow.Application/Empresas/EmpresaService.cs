using FluentValidation;
using Microsoft.EntityFrameworkCore;
using PeopleFlow.Application.Abstractions;
using PeopleFlow.Application.Acesso;
using PeopleFlow.Application.Apuracao;
using PeopleFlow.Application.Comum;
using PeopleFlow.Domain.Apuracao;
using PeopleFlow.Domain.Comum;
using PeopleFlow.Domain.Empresas;
using ValidationException = PeopleFlow.Domain.Comum.ValidationException;

namespace PeopleFlow.Application.Empresas;

public sealed record EmpresaDto(
    Guid Id,
    string RazaoSocial,
    string NomeFantasia,
    string Cnpj,
    string Uf,
    string Municipio,
    string FusoHorario,
    string Cor,
    bool Ativa,
    int Funcionarios,
    int? PoliticaVersao);

public sealed record SalvarEmpresaRequest(string RazaoSocial, string NomeFantasia, string Cnpj, string Uf, string Municipio, string? Cor, bool Ativa = true);

public sealed record PoliticaDto(
    Guid Id,
    Guid EmpresaId,
    int Versao,
    DateOnly VigenteDesde,
    int ToleranciaPorMarcacaoMinutos,
    int ToleranciaDiariaMinutos,
    ModoTolerancia ModoTolerancia,
    DestinoHoraExtra DestinoHoraExtra,
    DestinoHoraExtra DestinoHeDescansoFeriado,
    int PercentualHeDiaUtil,
    int PercentualHeDescansoFeriado,
    int LimiteDiarioHeMinutos,
    int AdicionalNoturnoPercentual,
    string InicioNoturno,
    string FimNoturno,
    bool HoraNoturnaReduzida,
    bool ProrrogacaoNoturna,
    int IntervaloMinimoAcima6hMinutos,
    int IntervaloMinimo4a6hMinutos,
    int InterjornadaMinimaMinutos,
    int ValidadeBancoMeses,
    int JanelaDuplicidadeMinutos,
    string? Observacao,
    DateTime CriadoEm,
    string? CriadoPor,
    bool Vigente);

public sealed record SalvarPoliticaRequest(
    DateOnly VigenteDesde,
    int ToleranciaPorMarcacaoMinutos,
    int ToleranciaDiariaMinutos,
    ModoTolerancia ModoTolerancia,
    DestinoHoraExtra DestinoHoraExtra,
    DestinoHoraExtra DestinoHeDescansoFeriado,
    int PercentualHeDiaUtil,
    int PercentualHeDescansoFeriado,
    int LimiteDiarioHeMinutos,
    int AdicionalNoturnoPercentual,
    string InicioNoturno,
    string FimNoturno,
    bool HoraNoturnaReduzida,
    bool ProrrogacaoNoturna,
    int IntervaloMinimoAcima6hMinutos,
    int IntervaloMinimo4a6hMinutos,
    int InterjornadaMinimaMinutos,
    int ValidadeBancoMeses,
    int JanelaDuplicidadeMinutos,
    string? Observacao);

public sealed record NovaPoliticaDto(PoliticaDto Politica, int DiasRecalculados);

public sealed class SalvarEmpresaValidator : AbstractValidator<SalvarEmpresaRequest>
{
    public SalvarEmpresaValidator()
    {
        RuleFor(x => x.RazaoSocial).NotEmpty().WithMessage("Informe a razão social.").MaximumLength(160);
        RuleFor(x => x.NomeFantasia).NotEmpty().WithMessage("Informe o nome fantasia.").MaximumLength(100);
        RuleFor(x => x.Cnpj).Must(Documentos.CnpjValido).WithMessage("CNPJ inválido.");
        RuleFor(x => x.Uf).NotEmpty().Length(2).WithMessage("Informe a UF com 2 letras.");
        RuleFor(x => x.Municipio).NotEmpty().WithMessage("Informe o município.").MaximumLength(100);
        RuleFor(x => x.Cor).Matches("^#[0-9a-fA-F]{6}$").When(x => !string.IsNullOrEmpty(x.Cor)).WithMessage("Cor inválida.");
    }
}

public sealed class SalvarPoliticaValidator : AbstractValidator<SalvarPoliticaRequest>
{
    public SalvarPoliticaValidator()
    {
        RuleFor(x => x.ToleranciaPorMarcacaoMinutos).InclusiveBetween(0, 30).WithMessage("Use de 0 a 30 minutos.");
        RuleFor(x => x.ToleranciaDiariaMinutos).InclusiveBetween(0, 60).WithMessage("Use de 0 a 60 minutos.");
        RuleFor(x => x.ToleranciaDiariaMinutos).GreaterThanOrEqualTo(x => x.ToleranciaPorMarcacaoMinutos).WithMessage("O limite diário não pode ser menor que a tolerância por marcação.");
        RuleFor(x => x.PercentualHeDiaUtil).InclusiveBetween(50, 200).WithMessage("O adicional de hora extra é de no mínimo 50% (CF art. 7º, XVI).");
        RuleFor(x => x.PercentualHeDescansoFeriado).InclusiveBetween(50, 300).WithMessage("Use de 50% a 300%.");
        RuleFor(x => x.LimiteDiarioHeMinutos).InclusiveBetween(0, 240).WithMessage("Use de 0 a 240 minutos.");
        RuleFor(x => x.AdicionalNoturnoPercentual).InclusiveBetween(20, 100).WithMessage("O adicional noturno é de no mínimo 20% (CLT art. 73).");
        RuleFor(x => x.InicioNoturno).Must(Horario.Valido).WithMessage("Hora inválida (use HH:mm).");
        RuleFor(x => x.FimNoturno).Must(Horario.Valido).WithMessage("Hora inválida (use HH:mm).");
        RuleFor(x => x.IntervaloMinimoAcima6hMinutos).InclusiveBetween(30, 120).WithMessage("Use de 30 a 120 minutos.");
        RuleFor(x => x.IntervaloMinimo4a6hMinutos).InclusiveBetween(0, 60).WithMessage("Use de 0 a 60 minutos.");
        RuleFor(x => x.InterjornadaMinimaMinutos).InclusiveBetween(0, 1440).WithMessage("Use de 0 a 1440 minutos.");
        RuleFor(x => x.ValidadeBancoMeses).InclusiveBetween(1, 12).WithMessage("Use de 1 a 12 meses.");
        RuleFor(x => x.JanelaDuplicidadeMinutos).InclusiveBetween(1, 10).WithMessage("Use de 1 a 10 minutos.");
        RuleFor(x => x.Observacao).MaximumLength(500);
    }
}

public sealed class EmpresaService(IPeopleFlowDbContext db, AcessoService acesso, IUsuarioAtual usuario, ApuracaoService apuracao, Relogio relogio)
{
    public static readonly DateOnly InicioDaHistoria = new(2000, 1, 1);

    public async Task<IReadOnlyList<EmpresaDto>> ListarAsync(CancellationToken ct)
    {
        var empresas = await acesso.EmpresasVisiveis().AsNoTracking().OrderBy(e => e.NomeFantasia).ToListAsync(ct);
        var ids = empresas.Select(e => e.Id).ToList();
        var contagem = await db.Funcionarios.Where(f => ids.Contains(f.EmpresaId) && f.Ativo)
            .GroupBy(f => f.EmpresaId).Select(g => new { g.Key, Total = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.Total, ct);
        var versoes = (await db.Politicas.Where(p => ids.Contains(p.EmpresaId)).ToListAsync(ct))
            .GroupBy(p => p.EmpresaId)
            .ToDictionary(g => g.Key, g => Vigente(g.ToList(), relogio.HojePadrao)?.Versao);
        return empresas.Select(e => Mapear(e, contagem.GetValueOrDefault(e.Id), versoes.GetValueOrDefault(e.Id))).ToList();
    }

    public async Task<EmpresaDto> ObterAsync(Guid id, CancellationToken ct)
    {
        var empresa = await acesso.ExigirEmpresaAsync(id, ct);
        var total = await db.Funcionarios.CountAsync(f => f.EmpresaId == id && f.Ativo, ct);
        var politicas = await db.Politicas.Where(p => p.EmpresaId == id).ToListAsync(ct);
        return Mapear(empresa, total, Vigente(politicas, relogio.Hoje(empresa))?.Versao);
    }

    public async Task<EmpresaDto> CriarAsync(SalvarEmpresaRequest request, CancellationToken ct)
    {
        acesso.ExigirGestaoDeCadastros();
        var cnpj = Documentos.SoDigitos(request.Cnpj);
        if (await db.Empresas.AnyAsync(e => e.Cnpj == cnpj, ct))
        {
            throw new ConflictException("Já existe uma empresa com este CNPJ.");
        }

        var empresa = new Empresa();
        Aplicar(empresa, request);
        db.Empresas.Add(empresa);
        db.Politicas.Add(new PoliticaEmpresa { EmpresaId = empresa.Id, Versao = 1, VigenteDesde = InicioDaHistoria, CriadoPorId = usuario.Id, Observacao = "Política padrão da CLT" });
        await db.SaveChangesAsync(ct);
        return Mapear(empresa, 0, 1);
    }

    public async Task<EmpresaDto> AtualizarAsync(Guid id, SalvarEmpresaRequest request, CancellationToken ct)
    {
        acesso.ExigirGestaoDeCadastros();
        var empresa = await db.Empresas.FirstOrDefaultAsync(e => e.Id == id, ct) ?? throw new NotFoundException("Empresa não encontrada.");
        var cnpj = Documentos.SoDigitos(request.Cnpj);
        if (await db.Empresas.AnyAsync(e => e.Cnpj == cnpj && e.Id != id, ct))
        {
            throw new ConflictException("Já existe uma empresa com este CNPJ.");
        }

        var mudouLocal = !string.Equals(empresa.Uf, request.Uf.Trim(), StringComparison.OrdinalIgnoreCase)
            || !string.Equals(empresa.Municipio, request.Municipio.Trim(), StringComparison.OrdinalIgnoreCase);
        Aplicar(empresa, request);
        await db.SaveChangesAsync(ct);

        if (mudouLocal)
        {
            var hoje = relogio.Hoje(empresa);
            await apuracao.RecalcularEmpresaAsync(id, hoje.AddDays(-ApuracaoService.JanelaMaximaDias), hoje, ct);
        }

        return await ObterAsync(id, ct);
    }

    public async Task<IReadOnlyList<PoliticaDto>> PoliticasAsync(Guid empresaId, CancellationToken ct)
    {
        var empresa = await acesso.ExigirEmpresaAsync(empresaId, ct);
        var politicas = await db.Politicas.AsNoTracking().Where(p => p.EmpresaId == empresaId).ToListAsync(ct);
        var vigente = Vigente(politicas, relogio.Hoje(empresa));
        var nomes = await NomesAsync(politicas.Select(p => p.CriadoPorId), ct);
        return politicas.OrderByDescending(p => p.Versao).Select(p => Mapear(p, nomes, p.Id == vigente?.Id)).ToList();
    }

    public async Task<PoliticaDto> PoliticaVigenteAsync(Guid empresaId, CancellationToken ct)
    {
        var empresa = await acesso.ExigirEmpresaAsync(empresaId, ct);
        var politicas = await db.Politicas.AsNoTracking().Where(p => p.EmpresaId == empresaId).ToListAsync(ct);
        var vigente = Vigente(politicas, relogio.Hoje(empresa)) ?? throw new NotFoundException("A empresa ainda não tem política.");
        var nomes = await NomesAsync([vigente.CriadoPorId], ct);
        return Mapear(vigente, nomes, true);
    }

    public async Task<NovaPoliticaDto> NovaPoliticaAsync(Guid empresaId, SalvarPoliticaRequest request, CancellationToken ct)
    {
        acesso.ExigirGestaoDeCadastros();
        var empresa = await acesso.ExigirEmpresaAsync(empresaId, ct);
        var politicas = await db.Politicas.Where(p => p.EmpresaId == empresaId).ToListAsync(ct);
        var ultima = politicas.OrderByDescending(p => p.Versao).FirstOrDefault();
        var hoje = relogio.Hoje(empresa);

        if (ultima is not null && request.VigenteDesde <= ultima.VigenteDesde)
        {
            throw new ValidationException("vigenteDesde", $"A nova versão precisa começar depois de {ultima.VigenteDesde:dd/MM/yyyy}, início da versão {ultima.Versao}.");
        }

        if (request.VigenteDesde < hoje.AddDays(-ApuracaoService.JanelaMaximaDias))
        {
            throw new ValidationException("vigenteDesde", $"A vigência pode retroagir no máximo {ApuracaoService.JanelaMaximaDias} dias.");
        }

        var politica = new PoliticaEmpresa
        {
            EmpresaId = empresaId,
            Versao = (ultima?.Versao ?? 0) + 1,
            VigenteDesde = request.VigenteDesde,
            ToleranciaPorMarcacaoMinutos = request.ToleranciaPorMarcacaoMinutos,
            ToleranciaDiariaMinutos = request.ToleranciaDiariaMinutos,
            ModoTolerancia = request.ModoTolerancia,
            DestinoHoraExtra = request.DestinoHoraExtra,
            DestinoHeDescansoFeriado = request.DestinoHeDescansoFeriado,
            PercentualHeDiaUtil = request.PercentualHeDiaUtil,
            PercentualHeDescansoFeriado = request.PercentualHeDescansoFeriado,
            LimiteDiarioHeMinutos = request.LimiteDiarioHeMinutos,
            AdicionalNoturnoPercentual = request.AdicionalNoturnoPercentual,
            InicioNoturno = Horario.Ler(request.InicioNoturno),
            FimNoturno = Horario.Ler(request.FimNoturno),
            HoraNoturnaReduzida = request.HoraNoturnaReduzida,
            ProrrogacaoNoturna = request.ProrrogacaoNoturna,
            IntervaloMinimoAcima6hMinutos = request.IntervaloMinimoAcima6hMinutos,
            IntervaloMinimo4a6hMinutos = request.IntervaloMinimo4a6hMinutos,
            InterjornadaMinimaMinutos = request.InterjornadaMinimaMinutos,
            ValidadeBancoMeses = request.ValidadeBancoMeses,
            JanelaDuplicidadeMinutos = request.JanelaDuplicidadeMinutos,
            Observacao = string.IsNullOrWhiteSpace(request.Observacao) ? null : request.Observacao.Trim(),
            CriadoPorId = usuario.Id
        };
        db.Politicas.Add(politica);
        await db.SaveChangesAsync(ct);

        var dias = request.VigenteDesde <= hoje
            ? await apuracao.RecalcularEmpresaAsync(empresaId, request.VigenteDesde, hoje, ct)
            : 0;

        var nomes = await NomesAsync([usuario.Id], ct);
        return new NovaPoliticaDto(Mapear(politica, nomes, request.VigenteDesde <= hoje), dias);
    }

    public static PoliticaEmpresa? Vigente(IReadOnlyCollection<PoliticaEmpresa> politicas, DateOnly dia) =>
        politicas.Where(p => p.VigenteDesde <= dia).OrderByDescending(p => p.VigenteDesde).ThenByDescending(p => p.Versao).FirstOrDefault()
        ?? politicas.OrderBy(p => p.VigenteDesde).FirstOrDefault();

    private async Task<Dictionary<Guid, string>> NomesAsync(IEnumerable<Guid?> ids, CancellationToken ct)
    {
        var lista = ids.Where(i => i is not null).Select(i => i!.Value).Distinct().ToList();
        return await db.Usuarios.Where(u => lista.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.Nome, ct);
    }

    private static void Aplicar(Empresa empresa, SalvarEmpresaRequest request)
    {
        empresa.RazaoSocial = request.RazaoSocial.Trim();
        empresa.NomeFantasia = request.NomeFantasia.Trim();
        empresa.Cnpj = Documentos.SoDigitos(request.Cnpj);
        empresa.Uf = request.Uf.Trim().ToUpperInvariant();
        empresa.Municipio = request.Municipio.Trim();
        empresa.Cor = string.IsNullOrWhiteSpace(request.Cor) ? empresa.Cor : request.Cor;
        empresa.Ativa = request.Ativa;
    }

    private static EmpresaDto Mapear(Empresa e, int funcionarios, int? versao) =>
        new(e.Id, e.RazaoSocial, e.NomeFantasia, e.Cnpj, e.Uf, e.Municipio, e.FusoHorario, e.Cor, e.Ativa, funcionarios, versao);

    private static PoliticaDto Mapear(PoliticaEmpresa p, IReadOnlyDictionary<Guid, string> nomes, bool vigente) => new(
        p.Id, p.EmpresaId, p.Versao, p.VigenteDesde, p.ToleranciaPorMarcacaoMinutos, p.ToleranciaDiariaMinutos, p.ModoTolerancia,
        p.DestinoHoraExtra, p.DestinoHeDescansoFeriado, p.PercentualHeDiaUtil, p.PercentualHeDescansoFeriado, p.LimiteDiarioHeMinutos,
        p.AdicionalNoturnoPercentual, Horario.Formatar(p.InicioNoturno), Horario.Formatar(p.FimNoturno), p.HoraNoturnaReduzida,
        p.ProrrogacaoNoturna, p.IntervaloMinimoAcima6hMinutos, p.IntervaloMinimo4a6hMinutos, p.InterjornadaMinimaMinutos,
        p.ValidadeBancoMeses, p.JanelaDuplicidadeMinutos, p.Observacao, p.CriadoEm,
        p.CriadoPorId is { } criador ? nomes.GetValueOrDefault(criador) : null, vigente);
}
