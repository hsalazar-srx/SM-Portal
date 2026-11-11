// src/components/supply-chain/workbenchState.ts
// Uses skill: architecture/ui-ux-best-practices
import type { CardKey } from '@/services/supplyChainService';

/**
 * The columns the server can sort by: Reporting-Service's `LineSort` (LineQuery.cs) in camelCase, without `status`,
 * which sorts a different column from the Buy Status shown. Live MOVEX fields cannot be sorted. A key the server
 * does not know comes back as a 400 that names the valid ones.
 */
export type SortKey =
  | 'moStartDate' | 'item' | 'buyer' | 'supplier' | 'customer' | 'type' | 'plannedDate' | 'category' | 'updated';

/** Melbourne. Johor Bahru (L) follows once the module is proven. */
export const DEFAULT_DIVISION = 'D';
const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_SORT: SortKey = 'moStartDate';

/** Everything that decides which lines are listed and in what order. Pure data: the page just renders it. */
export interface WorkbenchState {
  division: string;
  card: CardKey | null;
  okNg: '' | 'ok' | 'ng';
  buyer: string;
  category: string;
  search: string;
  includeGone: boolean;
  sort: SortKey;
  descending: boolean;
  page: number;
  pageSize: number;
}

/** The parts of the state that narrow the list (not how it is sorted or paged). */
export type WorkbenchFilters = Pick<WorkbenchState, 'okNg' | 'buyer' | 'category' | 'search' | 'includeGone'>;

export function initialState(division: string = DEFAULT_DIVISION): WorkbenchState {
  return {
    division, card: null, okNg: '', buyer: '', category: '', search: '', includeGone: false,
    sort: DEFAULT_SORT, descending: false, page: 1, pageSize: DEFAULT_PAGE_SIZE,
  };
}

// Anything that changes which lines are listed returns to page 1: page 4 of one list is not page 4 of another.

/** Clicking a card shows only its lines; clicking the active card again shows everything. */
export function toggleCard(state: WorkbenchState, card: CardKey): WorkbenchState {
  return { ...state, card: state.card === card ? null : card, page: 1 };
}

/** Changes filters. If nothing actually differs the same state comes back, so React makes no update and no request. */
export function setFilter(state: WorkbenchState, patch: Partial<WorkbenchFilters>): WorkbenchState {
  const unchanged = (Object.keys(patch) as (keyof WorkbenchFilters)[]).every(key => patch[key] === state[key]);
  return unchanged ? state : { ...state, ...patch, page: 1 };
}

/** A new column sorts ascending; the same column again flips the direction. */
export function sortBy(state: WorkbenchState, key: SortKey): WorkbenchState {
  return { ...state, sort: key, descending: state.sort === key ? !state.descending : false, page: 1 };
}

export function goToPage(state: WorkbenchState, page: number): WorkbenchState {
  return { ...state, page: Math.max(1, page) };
}

export function hasActiveFilters(state: WorkbenchState): boolean {
  return state.card !== null || state.okNg !== '' || state.buyer !== '' || state.category !== ''
    || state.search.trim() !== '' || state.includeGone;
}

/** Removes the card and filters; keeps how the list is sorted. */
export function clearFilters(state: WorkbenchState): WorkbenchState {
  return { ...initialState(state.division), sort: state.sort, descending: state.descending, pageSize: state.pageSize };
}

/**
 * The query string for GET /supply-chain/rows: only what is set, under the names the portal accepts. `refresh` asks
 * for a fresh MOVEX read instead of the one kept for the last minute.
 */
export function toRowsParams(state: WorkbenchState, refresh = false): Record<string, string> {
  const params: Record<string, string> = {
    division: state.division,
    page: String(state.page),
    pageSize: String(state.pageSize),
  };
  if (state.card) params.card = state.card;
  if (state.okNg) params.okNg = state.okNg;
  if (state.buyer) params.buyer = state.buyer;
  if (state.category) params.category = state.category;
  if (state.search.trim()) params.search = state.search.trim();
  if (state.includeGone) params.includeGone = 'true';
  if (state.sort !== DEFAULT_SORT) params.sort = state.sort;
  if (state.descending) params.descending = 'true';
  if (refresh) params.refresh = 'true';
  return params;
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** The first and last line number a page shows, for "Showing 51 to 100 of 1,234". 0 to 0 for an empty list. */
export function pageRange(page: number, pageSize: number, total: number): { from: number; to: number } {
  if (total === 0) return { from: 0, to: 0 };
  return { from: (page - 1) * pageSize + 1, to: Math.min(page * pageSize, total) };
}
