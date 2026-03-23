// src/services/exchangeRateService.ts
// Uses skill: architecture/ui-ux-best-practices

const API_BASE = (import.meta as any).env.VITE_API_URL || 'http://localhost:5050';

/**
 * SPOT exchange rate result from the SM-Portal backend → Reporting-Service.
 * Rate convention: 1 {currency} = {rate} AUD  (e.g. 1 USD = 0.6828 AUD — RBA).
 */
export interface ExchangeRateResult {
  currency:      string;
  requestedDate: string;   // "yyyy-MM-dd" — the date the caller asked for
  effectiveDate: string;   // "yyyy-MM-dd" — may differ from requestedDate on weekends
  rate:          number;
  rateType:      string;   // always "SPOT"
  source:        string;   // always "RBA"
  usedFallback:  boolean;  // true when weekend/holiday fallback was applied
  isWeekend:     boolean;
  lastSyncUtc:   string | null;
}

class ExchangeRateService {
  /**
   * Fetch the SPOT exchange rate for a currency on a given date.
   * Returns null when no rate exists within the 3-day fallback window (404).
   * Throws on network errors or 5xx responses for caller to set error state.
   */
  async getRate(currency: string, date: string): Promise<ExchangeRateResult | null> {
    const res = await fetch(
      `${API_BASE}/api/exchange-rates/${encodeURIComponent(currency)}/${encodeURIComponent(date)}`,
      {
        method: 'GET',
        credentials: 'include',   // Windows AD NTLM credential forwarding
      }
    );

    if (res.status === 404) {
      return null;  // No rate for this date — caller renders the not-found state
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `HTTP ${res.status}: ${res.statusText}`);
    }

    return res.json();
  }
}

export default new ExchangeRateService();
