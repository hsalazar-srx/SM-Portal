// src/services/invoiceService.ts
// Uses skill: architecture/ui-ux-best-practices

const API_BASE = (import.meta as any).env.VITE_API_URL || 'http://localhost:5050';

export type InvoiceType = 'AP' | 'AR' | 'ALL';

export interface InvoiceSummary {
  invoiceNo:     string;
  date:          string;          // "yyyy-MM-dd"
  type:          'AP' | 'AR';
  companyCode:   string;
  partyName:     string;
  currency:      string;
  amountExclTax: number;
  taxAmount:     number;
  totalInclTax:  number;
}

export interface InvoiceListResponse {
  totalCount: number;
  fromDate:   string;
  toDate:     string;
  items:      InvoiceSummary[];
}

class InvoiceService {
  /**
   * Fetch invoices from GET /api/invoices (SM-Portal backend → MyInvois.Api → DB2).
   * Uses Windows AD credential forwarding (credentials: 'include').
   * Throws on HTTP error so callers can set error state.
   */
  async getInvoices(
    fromDate: string,
    toDate: string,
    type: InvoiceType
  ): Promise<InvoiceListResponse> {
    const url = new URL(`${API_BASE}/api/invoices`);
    url.searchParams.set('fromDate', fromDate);
    url.searchParams.set('toDate', toDate);
    url.searchParams.set('type', type);

    const res = await fetch(url.toString(), {
      method: 'GET',
      credentials: 'include',   // Windows AD NTLM credential forwarding
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `HTTP ${res.status}: ${res.statusText}`);
    }

    return res.json();
  }
}

export default new InvoiceService();
