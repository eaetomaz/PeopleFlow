using PeopleFlow.Domain.Comum;

namespace PeopleFlow.Domain.Jornadas;

public enum TipoJornada
{
    Semanal,
    Ciclica
}

public sealed class Jornada : Entidade, IAuditavel
{
    public Guid EmpresaId { get; set; }

    public string Nome { get; set; } = string.Empty;

    public TipoJornada Tipo { get; set; } = TipoJornada.Semanal;

    public TimeOnly HoraVirada { get; set; } = new(4, 0);

    public bool FeriadosCompensados { get; set; }

    public bool Ativa { get; set; } = true;

    public List<JornadaDia> Dias { get; set; } = [];

    public int CargaCicloMinutos => Dias.Sum(dia => dia.CargaMinutos);
}

public sealed class JornadaDia : Entidade
{
    public Guid JornadaId { get; set; }

    public int Indice { get; set; }

    public bool Folga { get; set; }

    public List<JornadaPeriodo> Periodos { get; set; } = [];

    public int CargaMinutos => Folga ? 0 : Periodos.Sum(periodo => periodo.DuracaoMinutos);
}

public sealed class JornadaPeriodo : Entidade
{
    public Guid JornadaDiaId { get; set; }

    public int Ordem { get; set; }

    public TimeOnly Entrada { get; set; }

    public TimeOnly Saida { get; set; }

    public int DuracaoMinutos
    {
        get
        {
            var minutos = (int)(Saida - Entrada).TotalMinutes;
            return minutos <= 0 ? minutos + 24 * 60 : minutos;
        }
    }
}
