// src/services/supplyChainService.ts
// Uses skill: architecture/ui-ux-best-practices

// No vite-env.d.ts in this project, so type the one env value read here.
const API_BASE =
  (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env.VITE_API_URL
  || 'http://localhost:5050';

const ROLES = ['buyer', 'planner', 'manager'] as const;

/**
 * The Supply Chain Workbench role the portal resolved from the person's AD groups. Reporting-Service decides what
 * each role may see and change; the browser only uses the role to show the right guidance and controls.
 */
export type SupplyChainRole = (typeof ROLES)[number];

/** GET /supply-chain/access: whether the person may use the Workbench, and in which role. */
export interface SupplyChainAccess {
  allowed: boolean;
  role: SupplyChainRole | null;
}

const NO_ACCESS: SupplyChainAccess = { allowed: false, role: null };

function isRole(value: unknown): value is SupplyChainRole {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/** What a person recorded against a line. Every field is null until someone sets it. */
export interface LineEntry {
  category: string | null;
  details: string | null;
  plannersNotes: string | null;
  updatedBy: string | null;
  updatedUtc: string | null;
}

/** Whether MOVEX was asked about the line's PO and what it said. */
export type LiveState = 'Found' | 'NotInMovex' | 'None' | 'Unavailable';

/** What MOVEX says about the line's PO right now. The date fields are ISO dates and null unless the state is Found. */
export interface LiveFields {
  state: LiveState;
  poStatus: string | null;
  eta: string | null;
  requestedDate: string | null;
}

/** One Workbench line, as GET /supply-chain/rows returns it. */
export interface WorkbenchRow {
  lineKey: string;
  moOrder: string;
  moStartDate: string | null;
  item: string;
  description: string | null;
  supplier: string | null;
  customer: string | null;
  buyer: string | null;
  type: string | null;
  status: string | null;
  buyStatus: string | null;
  reqQty: number | null;
  qtyShort: number | null;
  plannedDate: string | null;
  poLine: string | null;
  closedDate: string | null;
  entry: LineEntry;
  live: LiveFields;
  /** "OK" or "NG", or null when it cannot be known (MOVEX unreachable and the line is not Received). */
  okNg: 'OK' | 'NG' | null;
}

/** A page of rows. `total` counts every matching line across pages. */
export interface RowsPage {
  rows: WorkbenchRow[];
  total: number;
  page: number;
  pageSize: number;
  /** False when MOVEX could not be read: the stored rows still come back, but PO status, ETA and OK/NG are unknown. */
  liveAvailable: boolean;
  correlationId: string;
}

/** The cards. A count is null when it needs MOVEX and MOVEX could not be read. */
export type CardKey = 'noPo' | 'overdueToOrder' | 'ng' | 'awaitingConfirmation' | 'notUpdated' | 'gone';

export interface BuyerBacklog {
  buyer: string;
  openLines: number;
  noPo: number;
  overdueToOrder: number;
  ng: number | null;
  awaitingConfirmation: number | null;
  notUpdated: number;
}

/** GET /supply-chain/summary: card counts and the backlog per buyer, for what the person may see. */
export interface Summary {
  openLines: number;
  cards: Record<CardKey, number | null>;
  backlog: BuyerBacklog[];
  liveAvailable: boolean;
  correlationId: string;
}

/** One entry of the Category menu. */
export interface Category {
  name: string;
  example: string | null;
}

/**
 * A message for the person. Reporting-Service explains its own refusals as { code, message }; the portal's own faults
 * (and a wrong key, a timeout) come as { error }. Either reads well; anything else falls back to the HTTP status.
 */
async function errorFrom(res: Response): Promise<Error> {
  const body = await res.json().catch(() => ({}));
  return new Error(body.error ?? body.message ?? `HTTP ${res.status}: ${res.statusText}`);
}

class SupplyChainService {
  /**
   * Who the person is to the Workbench. Anything the server sends that is not exactly allowed + a known role counts
   * as no access, so a surprising answer never turns into a guess. Throws if the check itself fails (network, 5xx),
   * so a page can say "could not check" instead of "no access".
   */
  async getAccess(): Promise<SupplyChainAccess> {
    const body = await this.get<{ allowed?: unknown; role?: unknown }>('access');
    return body.allowed === true && isRole(body.role) ? { allowed: true, role: body.role } : NO_ACCESS;
  }

  /** One page of lines. `params` are the query-string values the portal accepts (see workbenchState.toRowsParams). */
  getRows(params: Record<string, string>): Promise<RowsPage> {
    return this.get('rows', params);
  }

  /** The card counts and backlog per buyer. */
  getSummary(params: Record<string, string>): Promise<Summary> {
    return this.get('summary', params);
  }

  /** The Category menu, in the order managers set. */
  getCategories(): Promise<Category[]> {
    return this.get('categories');
  }

  private async get<T>(resource: string, params: Record<string, string> = {}): Promise<T> {
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE}/supply-chain/${resource}${query ? `?${query}` : ''}`;
    const res = await fetch(url, { method: 'GET', credentials: 'include' });
    if (!res.ok) throw await errorFrom(res);
    return res.json();
  }

  /** Whether the person may use the Workbench; a failed check counts as "no", for the Welcome tile. */
  async canAccess(): Promise<boolean> {
    try {
      return (await this.getAccess()).allowed;
    } catch {
      return false;
    }
  }
}

export default new SupplyChainService();
