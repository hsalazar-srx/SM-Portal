namespace MovexPortal.Models;

/// <summary>
/// Report catalog entry — mirrors Reporting.Core ReportDefinition (GET /api/v1/reports).
/// SM-Portal owns this copy to avoid a cross-project dependency. The parameter list drives
/// the Reports page form, so a new catalog report needs no portal change.
/// </summary>
public class ReportDefinitionDto
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Domain { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public List<string> SupportedFormats { get; set; } = [];
    public string DefaultFormat { get; set; } = string.Empty;
    public int MaxRows { get; set; }
    public List<ReportParameterDto> Parameters { get; set; } = [];
}

/// <summary>Typed report input — mirrors Reporting.Core ReportParameter.</summary>
public class ReportParameterDto
{
    public string Name { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>date | string | integer | decimal | multiselect</summary>
    public string Type { get; set; } = string.Empty;

    public bool Required { get; set; }
    public string? DefaultValue { get; set; }
    public List<string> AllowedValues { get; set; } = [];
    public string? Description { get; set; }
}

/// <summary>Body of POST /api/reports/{id}/download.</summary>
public class ReportDownloadRequest
{
    /// <summary>excel | pdf — formats that produce a file.</summary>
    public string Format { get; set; } = "excel";

    /// <summary>Parameter values by name. Blank values are dropped so catalog defaults apply.</summary>
    public Dictionary<string, string?> Parameters { get; set; } = [];
}

/// <summary>A rendered report file, passed through from Reporting-Service unchanged.</summary>
public sealed record ReportFile(byte[] Content, string ContentType, string FileName);
