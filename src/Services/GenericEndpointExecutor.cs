using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MovexPortal.Models;

namespace MovexPortal.Services;

/// <summary>
/// Implements: architecture/generic-endpoint-executor
/// Executes any M3 endpoint with field validation, RBAC enforcement, and audit logging.
/// Execution pipeline: RBAC Check → Field Validation → Transaction Builder → M3 Socket → Response Parser → Audit Log
/// </summary>
public sealed class GenericEndpointExecutor : IGenericEndpointExecutor
{
    private readonly IRbacService _rbacService;
    private readonly IAuditService _auditService;

    public GenericEndpointExecutor(IRbacService rbacService, IAuditService auditService)
    {
        _rbacService = rbacService ?? throw new ArgumentNullException(nameof(rbacService));
        _auditService = auditService ?? throw new ArgumentNullException(nameof(auditService));
    }

    public Task<ExecutionResult> ExecuteAsync(
        EndpointDefinition endpoint,
        IReadOnlyDictionary<string, object> inputs,
        UserContext user,
        CancellationToken cancellationToken = default)
    {
        return ExecuteInternalAsync(endpoint, inputs, user, cancellationToken);
    }

    private async Task<ExecutionResult> ExecuteInternalAsync(
        EndpointDefinition endpoint,
        IReadOnlyDictionary<string, object> inputs,
        UserContext user,
        CancellationToken cancellationToken)
    {
        // Step 1: RBAC Check
        var rbac = await _rbacService.AuthorizeAsync(user, endpoint, cancellationToken).ConfigureAwait(false);
        if (!rbac.Authorized)
        {
            await LogAuditAsync(endpoint, user, "access-denied", inputs, rbac.Reason ?? "Access denied", cancellationToken).ConfigureAwait(false);
            return new ExecutionResult(false, null, null, rbac.Reason ?? "Access denied", "RBAC_DENIED");
        }

        // Step 2: Field Validation (required fields, type validation, length validation)
        var validationErrors = ValidateFields(inputs, endpoint.Fields);
        if (validationErrors.Any())
        {
            var errorMsg = $"Validation failed: {string.Join("; ", validationErrors)}";
            await LogAuditAsync(endpoint, user, "validation-failed", inputs, errorMsg, cancellationToken).ConfigureAwait(false);
            return new ExecutionResult(false, null, null, errorMsg, "VALIDATION_FAILED");
        }

        // Step 3: Prepare for execution (audit logged, ready for M3 call)
        var auditId = await LogAuditAsync(endpoint, user, "execute-started", inputs, "Execution initiated", cancellationToken).ConfigureAwait(false);
        
        // TODO: Step 4: Transaction Builder → M3 Socket → Response Parser
        // For now, return NOT_IMPLEMENTED placeholder
        await LogAuditAsync(endpoint, user, "execute-failed", inputs, "M3 adapter not yet implemented", cancellationToken).ConfigureAwait(false);
        
        return new ExecutionResult(false, auditId, null, "Execution adapter not configured.", "NOT_IMPLEMENTED");
    }

    /// <summary>
    /// Validates all input fields against the endpoint definition.
    /// Checks: required fields, type compatibility, and length constraints.
    /// </summary>
    private static List<string> ValidateFields(
        IReadOnlyDictionary<string, object> inputs,
        IReadOnlyList<EndpointField> fields)
    {
        var errors = new List<string>();

        // Check required fields
        foreach (var field in fields.Where(f => f.Required))
        {
            if (!inputs.ContainsKey(field.Name))
            {
                errors.Add($"Required field '{field.Name}' is missing");
                continue;
            }

            var value = inputs[field.Name];
            if (value is null)
            {
                errors.Add($"Required field '{field.Name}' cannot be null");
                continue;
            }

            // Type validation
            var typeError = ValidateFieldType(field.Name, value, field.Type);
            if (typeError is not null)
            {
                errors.Add(typeError);
                continue;
            }

            // Length validation
            var lengthError = ValidateFieldLength(field.Name, value, field.MaxLength);
            if (lengthError is not null)
            {
                errors.Add(lengthError);
            }
        }

        return errors;
    }

    /// <summary>
    /// Validates field type compatibility. Supports: string, decimal, integer, boolean
    /// </summary>
    private static string? ValidateFieldType(string fieldName, object value, string? expectedType)
    {
        if (string.IsNullOrEmpty(expectedType) || expectedType.Equals("string", StringComparison.OrdinalIgnoreCase))
        {
            return null; // String accepts any value that can be stringified
        }

        var stringValue = value.ToString() ?? "";
        
        return expectedType.ToLower(CultureInfo.InvariantCulture) switch
        {
            "decimal" => decimal.TryParse(stringValue, out _) 
                ? null 
                : $"Field '{fieldName}' must be numeric (decimal)",
            
            "int" or "integer" => int.TryParse(stringValue, out _) 
                ? null 
                : $"Field '{fieldName}' must be an integer",
            
            "bool" or "boolean" => bool.TryParse(stringValue, out _) 
                ? null 
                : $"Field '{fieldName}' must be boolean (true/false)",
            
            _ => null // Unknown type, allow through
        };
    }

    /// <summary>
    /// Validates field length constraints.
    /// </summary>
    private static string? ValidateFieldLength(string fieldName, object value, int? maxLength)
    {
        if (maxLength is null)
        {
            return null; // No length constraint
        }

        var stringValue = value.ToString() ?? "";
        return stringValue.Length > maxLength 
            ? $"Field '{fieldName}' exceeds maximum length of {maxLength} (got {stringValue.Length})"
            : null;
    }

    /// <summary>
    /// Logs an audit event for endpoint execution.
    /// </summary>
    private async Task<string?> LogAuditAsync(
        EndpointDefinition endpoint,
        UserContext user,
        string eventType,
        IReadOnlyDictionary<string, object> inputs,
        string message,
        CancellationToken cancellationToken)
    {
        var auditEvent = new AuditEvent(
            eventType,
            user.Identity,
            $"{endpoint.Program}/{endpoint.Method}",
            endpoint.RiskLevel,
            DateTimeOffset.UtcNow,
            new Dictionary<string, object>(inputs) { { "message", message } });

        var auditId = await _auditService.LogAsync(auditEvent, cancellationToken).ConfigureAwait(false);
        return auditId;
    }
}
