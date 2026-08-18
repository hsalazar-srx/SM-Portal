namespace MovexPortal.Models;

/// <summary>
/// SPOT exchange rate DTO — mirrors Reporting.Api ExchangeRateController response.
/// SM-Portal owns this copy to avoid a cross-project dependency.
///
/// Rate convention: 1 AUD = {Rate} {Currency}  (e.g. 1 AUD = 0.7114 USD).
/// Matches the RBA F11.1 CSV header ("A$1=USD") and M3 CCURRA.CUARAT, verified against
/// pre-existing M3 rows written by APUCHER in 2003-2004. Do NOT invert this value.
/// </summary>
public class ExchangeRateResponse
{
    /// <summary>ISO 4217 currency code (e.g. "USD").</summary>
    public string  Currency      { get; set; } = string.Empty;

    /// <summary>The date the caller requested (yyyy-MM-dd).</summary>
    public string  RequestedDate { get; set; } = string.Empty;

    /// <summary>
    /// The date the returned rate actually applies to.
    /// Differs from RequestedDate when UsedFallback is true (e.g. Saturday → Friday).
    /// </summary>
    public string  EffectiveDate { get; set; } = string.Empty;

    /// <summary>Exchange rate: how many units of Currency equal 1 AUD.</summary>
    public decimal Rate          { get; set; }

    /// <summary>Rate type — always "SPOT" for this endpoint.</summary>
    public string  RateType      { get; set; } = string.Empty;

    /// <summary>Data source — always "RBA" (Reserve Bank of Australia).</summary>
    public string  Source        { get; set; } = string.Empty;

    /// <summary>
    /// True when no rate existed for RequestedDate and the most recent prior-day rate
    /// was returned instead (weekend or public holiday handling).
    /// </summary>
    public bool   UsedFallback  { get; set; }

    /// <summary>True when RequestedDate falls on a Saturday or Sunday.</summary>
    public bool   IsWeekend     { get; set; }

    /// <summary>UTC timestamp of the last successful RBA sync. Null if never synced.</summary>
    public string? LastSyncUtc  { get; set; }
}
