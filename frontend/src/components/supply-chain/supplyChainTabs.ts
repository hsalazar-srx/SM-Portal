// src/components/supply-chain/supplyChainTabs.ts
// Uses skill: architecture/ui-ux-best-practices
import type { SupplyChainRole } from '@/services/supplyChainService';

export type SupplyChainTabId = 'workbench' | 'dashboard' | 'reports' | 'categories';

export interface SupplyChainTab {
  id: SupplyChainTabId;
  label: string;
}

const TABS: readonly SupplyChainTab[] = [
  { id: 'workbench', label: 'Workbench' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'reports', label: 'Reports' },
  { id: 'categories', label: 'Categories' },
];

/**
 * The tabs of the module, in order. Workbench, Dashboard and Categories are for every role (the server scopes
 * what each one shows). Reports appears only for a person who can run Supply Chain reports, which is decided by
 * their report roles, not by their Workbench role.
 */
export function visibleTabs(canRunReports: boolean): SupplyChainTab[] {
  return TABS.filter(t => t.id !== 'reports' || canRunReports);
}

/**
 * Whether the person may run at least one Supply Chain report. The portal already limits the catalog to the reports
 * their AD groups allow, so any report in the SupplyChain domain is enough.
 */
export function canRunSupplyChainReports(reports: ReadonlyArray<{ domain: string }>): boolean {
  return reports.some(r => r.domain === 'SupplyChain');
}

const LABELS: Record<SupplyChainRole, string> = {
  buyer: 'Buyer',
  planner: 'Planner',
  manager: 'Manager',
};

export function roleLabel(role: SupplyChainRole): string {
  return LABELS[role];
}

const GUIDANCE: Record<SupplyChainRole, string> = {
  buyer: 'You see your own lines and can edit Category and Details on them.',
  planner: 'You see every line. Planners write Planners Notes; Category and Details belong to buyers.',
  manager: 'You see every line and can edit Category and Details on every line, including generic buyer codes.',
};

/** One sentence on what the role can see and change, shown in the context bar so nobody wonders why a box is locked. */
export function roleGuidance(role: SupplyChainRole): string {
  return GUIDANCE[role];
}
