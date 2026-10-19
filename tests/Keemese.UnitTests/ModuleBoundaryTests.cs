using System.Reflection;
using Keemese.Api.Infrastructure.Data;
using Keemese.UnitTests.BoundaryFixture.Modules.Billing;
using Keemese.UnitTests.BoundaryFixture.Modules.Students;

namespace Keemese.UnitTests;

/// <summary>ADR-0002: a type in Modules.X may use Modules.Y only through Modules.Y.Contracts.</summary>
public class ModuleBoundaryTests
{
    [Fact]
    public void Api_modules_reference_other_modules_only_through_contracts()
    {
        var violations = ModuleBoundaries.Violations(typeof(AppDbContext).Assembly.GetTypes(), "Keemese.Api.Modules");
        Assert.Empty(violations);
    }

    [Fact]
    public void Checker_flags_non_contract_references_and_allows_contracts()
    {
        var fixtureTypes = typeof(ModuleBoundaryTests).Assembly.GetTypes()
            .Where(t => t.Namespace?.StartsWith("Keemese.UnitTests.BoundaryFixture", StringComparison.Ordinal) == true);

        var violations = ModuleBoundaries.Violations(fixtureTypes, "Keemese.UnitTests.BoundaryFixture.Modules");

        Assert.Equal([$"{typeof(InvoiceService).FullName} -> {typeof(StudentService).FullName}"], violations);
    }
}

internal static class ModuleBoundaries
{
    private const BindingFlags All = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static | BindingFlags.DeclaredOnly;

    // shortcut: checks signatures (base types, interfaces, fields, properties, constructors, methods), not method bodies; add IL inspection if a leak slips through review.
    public static List<string> Violations(IEnumerable<Type> types, string modulesNamespace)
    {
        var violations = new List<string>();
        foreach (var type in types)
        {
            if (ModuleOf(type, modulesNamespace) is not { } module) continue;
            foreach (var used in ReferencedTypes(type).Distinct())
            {
                if (ModuleOf(used, modulesNamespace) is { } other && other != module && !IsContract(used, modulesNamespace, other))
                {
                    violations.Add($"{type.FullName} -> {used.FullName}");
                }
            }
        }
        return violations;
    }

    private static bool IsContract(Type type, string modulesNamespace, string module)
    {
        var contracts = $"{modulesNamespace}.{module}.Contracts";
        return type.Namespace == contracts || type.Namespace!.StartsWith(contracts + ".", StringComparison.Ordinal);
    }

    private static string? ModuleOf(Type type, string modulesNamespace)
    {
        var ns = type.Namespace;
        if (ns is null || !ns.StartsWith(modulesNamespace + ".", StringComparison.Ordinal)) return null;
        return ns[(modulesNamespace.Length + 1)..].Split('.')[0];
    }

    private static IEnumerable<Type> ReferencedTypes(Type type)
    {
        var direct = new List<Type?> { type.BaseType };
        direct.AddRange(type.GetInterfaces());
        direct.AddRange(type.GetFields(All).Select(f => f.FieldType));
        direct.AddRange(type.GetProperties(All).Select(p => p.PropertyType));
        foreach (var method in type.GetConstructors(All).Cast<MethodBase>().Concat(type.GetMethods(All)))
        {
            direct.AddRange(method.GetParameters().Select(p => p.ParameterType));
            if (method is MethodInfo mi) direct.Add(mi.ReturnType);
        }
        return direct.OfType<Type>().SelectMany(Unwrap);
    }

    private static IEnumerable<Type> Unwrap(Type type)
    {
        if (type.HasElementType) return Unwrap(type.GetElementType()!);
        if (!type.IsGenericType) return [type];
        return type.GetGenericArguments().SelectMany(Unwrap).Prepend(type.GetGenericTypeDefinition());
    }
}
