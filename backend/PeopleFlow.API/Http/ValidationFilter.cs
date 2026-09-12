using FluentValidation;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using DomainValidationException = PeopleFlow.Domain.Comum.ValidationException;

namespace PeopleFlow.API.Http;

public sealed class ValidationFilter(IServiceProvider services) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (!context.ModelState.IsValid)
        {
            throw new DomainValidationException(FromModelState(context.ModelState));
        }

        var errors = new Dictionary<string, string[]>();
        foreach (var parameter in context.ActionDescriptor.Parameters)
        {
            if (!context.ActionArguments.TryGetValue(parameter.Name, out var argument))
            {
                if (parameter.BindingInfo?.BindingSource == BindingSource.Body && IsRequiredBody(parameter))
                {
                    errors["body"] = ["Envie os dados da requisição em JSON."];
                }

                continue;
            }

            if (argument is null)
            {
                continue;
            }

            var validatorType = typeof(IValidator<>).MakeGenericType(argument.GetType());
            if (services.GetService(validatorType) is not IValidator validator)
            {
                continue;
            }

            var result = await validator.ValidateAsync(new ValidationContext<object>(argument), context.HttpContext.RequestAborted);
            foreach (var group in result.Errors.GroupBy(error => CamelCasePath(error.PropertyName)))
            {
                errors[group.Key] = group.Select(error => error.ErrorMessage).Distinct().ToArray();
            }
        }

        if (errors.Count > 0)
        {
            throw new DomainValidationException(errors);
        }

        await next();
    }

    public static string CamelCasePath(string path)
    {
        if (string.IsNullOrEmpty(path))
        {
            return "body";
        }

        var segments = path.Split('.');
        for (var i = 0; i < segments.Length; i++)
        {
            var segment = segments[i];
            if (segment.Length > 0 && char.IsUpper(segment[0]))
            {
                segments[i] = char.ToLowerInvariant(segment[0]) + segment[1..];
            }
        }

        return string.Join('.', segments);
    }

    private static bool IsRequiredBody(Microsoft.AspNetCore.Mvc.Abstractions.ParameterDescriptor parameter) =>
        parameter.BindingInfo?.EmptyBodyBehavior != EmptyBodyBehavior.Allow;

    private static Dictionary<string, string[]> FromModelState(ModelStateDictionary modelState)
    {
        var errors = new Dictionary<string, string[]>();
        foreach (var (key, entry) in modelState)
        {
            if (entry.Errors.Count == 0)
            {
                continue;
            }

            var cleaned = key.StartsWith("$.", StringComparison.Ordinal) ? key[2..] : key == "$" ? "body" : key;
            var isBody = key.StartsWith('$') || cleaned.Length == 0;
            errors[CamelCasePath(cleaned)] = [isBody ? "O corpo da requisição tem um formato inválido." : "Valor inválido."];
        }

        return errors.Count > 0 ? errors : new Dictionary<string, string[]> { ["body"] = ["A requisição é inválida."] };
    }
}
