using System.Diagnostics;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;

namespace PeopleFlow.API.Http;

public static class Problems
{
    public const string ContentType = "application/problem+json";
    public const int ClientClosedRequest = 499;

    public static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    public static string Title(int status) => status switch
    {
        400 => "Dados inválidos",
        401 => "Não autenticado",
        403 => "Acesso negado",
        404 => "Não encontrado",
        405 => "Método não permitido",
        409 => "Conflito",
        415 => "Tipo de conteúdo não aceito",
        422 => "Não foi possível concluir",
        429 => "Muitas requisições",
        499 => "Operação cancelada",
        503 => "Serviço indisponível",
        _ => status >= 500 ? "Erro interno" : "Erro na requisição"
    };

    public static string DefaultDetail(int status) => status switch
    {
        400 => "Um ou mais campos são inválidos.",
        401 => "Faça login para continuar.",
        403 => "Você não tem permissão para acessar este recurso.",
        404 => "O recurso solicitado não foi encontrado.",
        405 => "Este método não é aceito nesta rota.",
        409 => "O registro já existe.",
        415 => "O tipo de conteúdo enviado não é aceito.",
        422 => "A operação não pôde ser concluída.",
        429 => "Você fez muitas requisições em pouco tempo. Aguarde um instante e tente de novo.",
        503 => "O serviço está temporariamente indisponível.",
        _ => "Ocorreu um erro inesperado. Tente de novo em instantes."
    };

    public static ProblemDetails Create(HttpContext context, int status, string? detail = null, IReadOnlyDictionary<string, string[]>? errors = null)
    {
        var problem = new ProblemDetails
        {
            Type = $"https://httpstatuses.io/{status}",
            Title = Title(status),
            Status = status,
            Detail = detail ?? DefaultDetail(status)
        };
        Enrich(context, problem);
        if (errors is { Count: > 0 })
        {
            problem.Extensions["errors"] = errors;
        }

        return problem;
    }

    public static void Enrich(HttpContext context, ProblemDetails problem)
    {
        problem.Extensions["traceId"] = Activity.Current?.Id ?? context.TraceIdentifier;
        problem.Extensions["correlationId"] = CorrelationIdMiddleware.Get(context);
    }

    public static async Task WriteAsync(HttpContext context, ProblemDetails problem)
    {
        if (context.Response.HasStarted)
        {
            return;
        }

        context.Response.StatusCode = problem.Status ?? 500;
        context.Response.ContentType = ContentType;
        await JsonSerializer.SerializeAsync(context.Response.Body, problem, JsonOptions, context.RequestAborted);
    }

    public static Task WriteAsync(HttpContext context, int status, string? detail = null, IReadOnlyDictionary<string, string[]>? errors = null) =>
        WriteAsync(context, Create(context, status, detail, errors));
}
