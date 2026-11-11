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

async function errorFrom(res: Response): Promise<Error> {
  const body = await res.json().catch(() => ({}));
  return new Error(body.error ?? `HTTP ${res.status}: ${res.statusText}`);
}

class SupplyChainService {
  /**
   * Who the person is to the Workbench. Anything the server sends that is not exactly allowed + a known role counts
   * as no access, so a surprising answer never turns into a guess. Throws if the check itself fails (network, 5xx),
   * so a page can say "could not check" instead of "no access".
   */
  async getAccess(): Promise<SupplyChainAccess> {
    const res = await fetch(`${API_BASE}/supply-chain/access`, { method: 'GET', credentials: 'include' });
    if (!res.ok) throw await errorFrom(res);

    const body: { allowed?: unknown; role?: unknown } = await res.json();
    return body.allowed === true && isRole(body.role) ? { allowed: true, role: body.role } : NO_ACCESS;
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
