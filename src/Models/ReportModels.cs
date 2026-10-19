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

    /// <summary>Role a user needs to see and run this report — mapped to AD groups by ReportAccess.</summary>
    public string RequiredRole { get; set; } = string.Empty;

    public List<string> SupportedFormats { get; set; } = [];
    public string DefaultFormat { get; set; } = string.Empty;
    public int MaxRows { get; set; }
    public List<ReportParameterDto> Parameters { get; set; } = [];

    /// <summary>In-app help from the catalog, shown beside the report. Null when the report has none.</summary>
    public ReportHelpDto? Help { get; set; }
}

/// <summary>Mirrors Reporting.Core ReportHelp — plain titled sections, rendered by the Reports page.</summary>
public class ReportHelpDto
{
    public List<ReportHelpSectionDto> Sections { get; set; } = [];
}

public class ReportHelpSectionDto
{
    public string Title { get; set; } = string.Empty;
    public string? Text { get; set; }
    public List<ReportHelpItemDto> Items { get; set; } = [];
    public List<string> Bullets { get; set; } = [];
}

public class ReportHelpItemDto
{
    public string Term { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
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

    /// <summary>Parameters sharing a group are shown together under that heading (e.g. "Book rates").</summary>
    public string? Group { get; set; }
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
