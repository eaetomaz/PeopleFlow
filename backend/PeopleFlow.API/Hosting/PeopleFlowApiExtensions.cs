using System.Text.Json.Serialization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.FileProviders;
using PeopleFlow.API.Http;
using PeopleFlow.Application;
using PeopleFlow.Application.Abstractions;
using PeopleFlow.Domain.Comum;
using PeopleFlow.Infrastructure;
using PeopleFlow.Infrastructure.Persistence;
using Serilog;
using Serilog.Events;

namespace PeopleFlow.API.Hosting;

public static class PeopleFlowApiExtensions
{
    public static WebApplicationBuilder AddPeopleFlowApi(this WebApplicationBuilder builder, PeopleFlowApiOptions options)
    {
        builder.Configuration["AllowedHosts"] = "localhost;127.0.0.1;[::1]";

        builder.Services.AddSerilog((_, logger) =>
        {
            logger
                .MinimumLevel.Information()
                .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
                .MinimumLevel.Override("Microsoft.Hosting.Lifetime", LogEventLevel.Information)
                .MinimumLevel.Override("Microsoft.EntityFrameworkCore", LogEventLevel.Warning)
                .Enrich.FromLogContext()
                .Enrich.WithProperty("Application", "PeopleFlow")
                .WriteTo.File(
                    Path.Combine(options.Paths.Logs, "peopleflow-.log"),
                    rollingInterval: RollingInterval.Day,
                    retainedFileCountLimit: 14,
                    outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {CorrelationId} {Message:lj}{NewLine}{Exception}");
            if (options.ConsoleLogging)
            {
                logger.WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}");
            }
        });

        var dataProtection = builder.Services.AddDataProtection()
            .SetApplicationName("PeopleFlow")
            .PersistKeysToFileSystem(new DirectoryInfo(options.Paths.Keys));
        if (OperatingSystem.IsWindows())
        {
            dataProtection.ProtectKeysWithDpapi();
        }

        builder.Services.AddSingleton(options);
        builder.Services.AddHttpContextAccessor();
        builder.Services.AddApplication();
        builder.Services.AddInfrastructure(options.Paths);
        builder.Services.AddScoped<IUsuarioAtual, UsuarioAtual>();

        builder.Services.AddControllers(mvc =>
            {
                mvc.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true;
                mvc.Filters.Add<ValidationFilter>();
            })
            .AddApplicationPart(typeof(PeopleFlowApiExtensions).Assembly)
            .ConfigureApiBehaviorOptions(api => api.SuppressModelStateInvalidFilter = true)
            .AddJsonOptions(json =>
            {
                json.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
                json.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
            });

        builder.Services.AddProblemDetails(problems => problems.CustomizeProblemDetails = context =>
        {
            var status = context.ProblemDetails.Status ?? context.HttpContext.Response.StatusCode;
            context.ProblemDetails.Status = status;
            context.ProblemDetails.Type = $"https://httpstatuses.io/{status}";
            context.ProblemDetails.Title = Problems.Title(status);
            context.ProblemDetails.Detail = Problems.DefaultDetail(status);
            Problems.Enrich(context.HttpContext, context.ProblemDetails);
        });
        builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
        builder.Services.AddAutenticacaoPeopleFlow();

        return builder;
    }

    public static WebApplication UsePeopleFlowApi(this WebApplication app, PeopleFlowApiOptions options)
    {
        app.UseMiddleware<CorrelationIdMiddleware>();
        app.UseSerilogRequestLogging(logging =>
        {
            logging.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0} ms";
            logging.GetLevel = (context, _, exception) => exception is not null || context.Response.StatusCode >= 500
                ? LogEventLevel.Error
                : IsQuiet(context.Request.Path) ? LogEventLevel.Verbose : LogEventLevel.Information;
        });
        app.UseMiddleware<SecurityHeadersMiddleware>();
        app.UseExceptionHandler(new ExceptionHandlerOptions
        {
            SuppressDiagnosticsCallback = context => context.Exception is DomainException or OperationCanceledException or BadHttpRequestException
        });
        app.UseStatusCodePages();
        app.UseMiddleware<OriginGuardMiddleware>();

        StaticFileOptions? staticFiles = null;
        if (options.HasWebRoot)
        {
            staticFiles = new StaticFileOptions
            {
                FileProvider = new PhysicalFileProvider(options.WebRootDirectory!),
                ContentTypeProvider = new FileExtensionContentTypeProvider(),
                OnPrepareResponse = context =>
                {
                    context.Context.Response.Headers.CacheControl = context.Context.Request.Path.StartsWithSegments("/assets")
                        ? "public,max-age=31536000,immutable"
                        : "no-cache";
                }
            };
            app.UseDefaultFiles(new DefaultFilesOptions { FileProvider = staticFiles.FileProvider });
            app.UseStaticFiles(staticFiles);
        }

        app.UseRouting();
        app.UseAuthentication();
        app.UseMiddleware<UserLogContextMiddleware>();
        app.UseAuthorization();
        app.MapControllers();

        app.MapFallback("/api/{**path}", NotFound).AllowAnonymous();

        if (staticFiles is not null)
        {
            app.MapFallbackToFile("{*path:nonfile}", "index.html", staticFiles).AllowAnonymous();
        }

        return app;
    }

    public static Task InitializePeopleFlowDatabaseAsync(this WebApplication app) => DatabaseInitializer.InitializeAsync(app.Services);

    private static Task NotFound(HttpContext context) => Problems.WriteAsync(context, StatusCodes.Status404NotFound);

    private static bool IsQuiet(PathString path) =>
        path.StartsWithSegments("/health") || path.StartsWithSegments("/assets") || !path.StartsWithSegments("/api");
}
