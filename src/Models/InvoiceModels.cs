namespace MovexPortal.Models;

/// <summary>
/// Invoice summary DTO — mirrors MyInvois.Api.Models.InvoiceSummaryDto.
/// SM-Portal owns this copy to avoid a cross-project dependency.
/// </summary>
public class InvoiceSummaryDto
{
    public string  InvoiceNo     { get; set; } = string.Empty;
    public string  Date          { get; set; } = string.Empty;
    public string  Type          { get; set; } = string.Empty;
    public string  CompanyCode   { get; set; } = string.Empty;
    public string  PartyName     { get; set; } = string.Empty;
    public string  Currency      { get; set; } = string.Empty;
    public decimal AmountExclTax { get; set; }
    public decimal TaxAmount     { get; set; }
    public decimal TotalInclTax  { get; set; }
}

/// <summary>
/// Response envelope from GET /api/v1/invoices on MyInvois.Api.
/// TotalCount is present now for future server-side pagination without a breaking change.
/// </summary>
public class InvoiceListResponse
{
    public int                     TotalCount { get; set; }
    public string                  FromDate   { get; set; } = string.Empty;
    public string                  ToDate     { get; set; } = string.Empty;
    public List<InvoiceSummaryDto> Items      { get; set; } = [];
}
