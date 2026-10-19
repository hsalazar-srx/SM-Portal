// src/services/reportService.ts
// Uses skill: architecture/ui-ux-best-practices

// No vite-env.d.ts in this project, so type the one env value read here.
const API_BASE =
  (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env.VITE_API_URL
  || 'http://localhost:5050';

/** A report parameter as declared in the Reporting-Service catalog. Drives the form. */
export interface ReportParameter {
  name:          string;
  displayName:   string;
  /** date | string | integer | decimal | multiselect */
  type:          string;
  required:      boolean;
  defaultValue:  string | null;
  allowedValues: string[];
  description:   string | null;
}

/** A term and its meaning — a glossary entry, or one sheet of a workbook. */
export interface ReportHelpItem {
  term: string;
  text: string;
}

/** One titled block of help. Any of text, items and bullets may be present. */
export interface ReportHelpSection {
  title:   string;
  text:    string | null;
  items:   ReportHelpItem[];
  bullets: string[];
}

/** Help declared for a report in the Reporting-Service catalog. */
export interface ReportHelp {
  sections: ReportHelpSection[];
}

/** A catalog report, as returned by GET /api/reports. */
export interface ReportDefinition {
  id:               string;
  displayName:      string;
  description:      string;
  domain:           string;
  category:         string;
  supportedFormats: string[];
  defaultFormat:    string;
  maxRows:          number;
  parameters:       ReportParameter[];
  help:             ReportHelp | null;
}

async function errorFrom(res: Response): Promise<Error> {
  const body = await res.json().catch(() => ({}));
  return new Error(body.error ?? `HTTP ${res.status}: ${res.statusText}`);
}

/** File name from Content-Disposition — prefers the RFC 5987 filename* form. */
function fileNameFrom(res: Response): string | null {
  const header = res.headers.get('Content-Disposition');
  if (!header) return null;

  const star = /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i.exec(header);
  if (star) return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ''));

  const plain = /filename\s*=\s*([^;]+)/i.exec(header);
  return plain ? plain[1].trim().replace(/^"|"$/g, '') : null;
}

class ReportService {
  /** Whether the signed-in user holds any report role (their AD groups). */
  async canAccess(): Promise<boolean> {
    const res = await fetch(`${API_BASE}/reports/access`, { method: 'GET', credentials: 'include' });
    if (!res.ok) return false;
    const body: { allowed?: boolean } = await res.json();
    return body.allowed === true;
  }

  /** Reports the signed-in user may run — the server filters by their AD groups. */
  async listReports(): Promise<ReportDefinition[]> {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'GET',
      credentials: 'include',   // Windows AD NTLM credential forwarding
    });

    if (!res.ok) throw await errorFrom(res);
    return res.json();
  }

  /**
   * Runs the report and saves the file the browser receives.
   * Returns the saved file name. Throws with the server's message on failure — for a 400
   * that is the Reporting-Service's own explanation (bad parameter, too many rows).
   */
  async downloadReport(
    reportId: string,
    parameters: Record<string, string>,
    format: 'excel' | 'pdf' = 'excel',
  ): Promise<string> {
    const res = await fetch(`${API_BASE}/reports/${encodeURIComponent(reportId)}/download`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format, parameters }),
    });

    if (!res.ok) throw await errorFrom(res);

    const fileName = fileNameFrom(res) ?? `${reportId}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
    const blob = await res.blob();

    // The browser saves a blob via a temporary object URL on a synthetic <a download>.
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Revoke after the click has been handled; revoking synchronously can cancel the save.
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return fileName;
  }
}

export default new ReportService();
