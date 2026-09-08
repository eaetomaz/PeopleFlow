using Microsoft.EntityFrameworkCore;
using PeopleFlow.Application.Abstractions;
using PeopleFlow.Domain.Comum;
using PeopleFlow.Domain.Empresas;
using PeopleFlow.Domain.Funcionarios;
using PeopleFlow.Domain.Usuarios;

namespace PeopleFlow.Application.Acesso;

public sealed class AcessoService(IPeopleFlowDbContext db, IUsuarioAtual usuario)
{
    public bool VeTudo => usuario.Perfil is Perfil.Admin or Perfil.RH;

    public bool PodeGerirCadastros => usuario.Perfil is Perfil.Admin or Perfil.RH;

    public bool PodeAprovar => usuario.Perfil is Perfil.Admin or Perfil.RH or Perfil.Gestor;

    public IQueryable<Funcionario> FuncionariosVisiveis()
    {
        var consulta = db.Funcionarios.AsQueryable();
        if (VeTudo)
        {
            return consulta;
        }

        var proprio = usuario.FuncionarioId;
        if (proprio is null)
        {
            return consulta.Where(_ => false);
        }

        return usuario.Perfil == Perfil.Gestor
            ? consulta.Where(f => f.Id == proprio || f.GestorId == proprio)
            : consulta.Where(f => f.Id == proprio);
    }

    public IQueryable<Empresa> EmpresasVisiveis()
    {
        if (VeTudo)
        {
            return db.Empresas.AsQueryable();
        }

        var proprio = usuario.FuncionarioId;
        return db.Empresas.Where(e => db.Funcionarios.Any(f => f.Id == proprio && f.EmpresaId == e.Id));
    }

    public async Task<Funcionario> ExigirFuncionarioAsync(Guid funcionarioId, CancellationToken ct)
    {
        var funcionario = await FuncionariosVisiveis().Include(f => f.Empresa).FirstOrDefaultAsync(f => f.Id == funcionarioId, ct);
        return funcionario ?? throw new NotFoundException("Funcionário não encontrado.");
    }

    public async Task<Empresa> ExigirEmpresaAsync(Guid empresaId, CancellationToken ct)
    {
        var empresa = await EmpresasVisiveis().FirstOrDefaultAsync(e => e.Id == empresaId, ct);
        return empresa ?? throw new NotFoundException("Empresa não encontrada.");
    }

    public void ExigirGestaoDeCadastros()
    {
        if (!PodeGerirCadastros)
        {
            throw new BusinessRuleException("Só Admin ou RH podem alterar cadastros.");
        }
    }
}
