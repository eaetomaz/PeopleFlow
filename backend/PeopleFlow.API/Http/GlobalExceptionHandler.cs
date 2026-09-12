using Microsoft.AspNetCore.Diagnostics;
using PeopleFlow.Domain.Comum;

namespace PeopleFlow.API.Http;

public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger, IHostEnvironment environment) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is OperationCanceledException && context.RequestAborted.IsCancellationRequested)
        {
            if (!context.Response.HasStarted)
            {
                context.Response.StatusCode = Problems.ClientClosedRequest;
            }

            return true;
        }

        var (status, detail, errors) = exception switch
        {
            ValidationException validation => (400, validation.Message, validation.Errors),
            BusinessRuleException rule => (422, rule.Message, rule.Errors),
            NotFoundException notFound => (404, notFound.Message, null),
            ConflictException conflict => (409, conflict.Message, null),
            BadHttpRequestException badRequest => (badRequest.StatusCode, "A requisição é inválida.", null),
            InvalidDataException => (400, "O conteúdo enviado é inválido.", null),
            _ => (500, (string?)null, (IReadOnlyDictionary<string, string[]>?)null)
        };

        if (status >= 500)
        {
            logger.LogError(exception, "Unhandled exception on {Method} {Path}", context.Request.Method, context.Request.Path);
        }
        else if (exception is not DomainException)
        {
            logger.LogWarning("Request rejected with {Status}: {Message}", status, exception.Message);
        }

        var problem = Problems.Create(context, status, detail, errors);
        if (status >= 500 && environment.IsDevelopment())
        {
            problem.Extensions["exception"] = exception.ToString();
        }

        await Problems.WriteAsync(context, problem);
        return true;
    }
}
