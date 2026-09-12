using PeopleFlow.API.Hosting;

namespace PeopleFlow.API.Http;

public sealed class OriginGuardMiddleware(RequestDelegate next, PeopleFlowApiOptions options)
{
    private static readonly HashSet<string> SafeMethods = new(StringComparer.OrdinalIgnoreCase) { "GET", "HEAD", "OPTIONS", "TRACE" };

    private static readonly string[] AllowedBodyTypes = ["application/json"];

    public async Task InvokeAsync(HttpContext context)
    {
        var request = context.Request;
        if (request.Path.StartsWithSegments("/api") && !SafeMethods.Contains(request.Method))
        {
            var origin = request.Headers.Origin.ToString();
            var fetchSite = request.Headers["Sec-Fetch-Site"].ToString();
            var deniedOrigin = origin.Length > 0 && !options.AllowedOrigins.Contains(origin.TrimEnd('/'), StringComparer.OrdinalIgnoreCase);
            if (deniedOrigin || string.Equals(fetchSite, "cross-site", StringComparison.OrdinalIgnoreCase))
            {
                await Problems.WriteAsync(context, StatusCodes.Status403Forbidden, "Requisição bloqueada: origem não permitida.");
                return;
            }

            var hasBody = request.ContentLength is > 0 || request.Headers.ContainsKey("Transfer-Encoding");
            var contentType = request.ContentType ?? string.Empty;
            if (hasBody && !AllowedBodyTypes.Any(type => contentType.StartsWith(type, StringComparison.OrdinalIgnoreCase)))
            {
                await Problems.WriteAsync(context, StatusCodes.Status415UnsupportedMediaType, "Envie o corpo como application/json.");
                return;
            }
        }

        await next(context);
    }
}
