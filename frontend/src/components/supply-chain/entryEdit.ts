// src/components/supply-chain/entryEdit.ts
// Uses skill: architecture/ui-ux-best-practices
import {
  EntryConflictError,
  type EntryField,
  type EntryRequest,
  type LineEntry,
  type SupplyChainRole,
  type WorkbenchRow,
} from '@/services/supplyChainService';
import { formatNumber, shortUser, utcText } from './rowFormat';

/** Reporting-Service refuses longer text (LineEntryService.MaxTextLength). */
export const MAX_TEXT_LENGTH = 1000;

/**
 * Which fields a role may change. Reporting-Service is the authority (SupplyChainPermissions) and refuses the rest
 * with a 403; this only decides which cells are drawn as editable, so nobody is offered a box that cannot save.
 * Keep in step with it.
 */
export function editableFields(role: SupplyChainRole): readonly EntryField[] {
  switch (role) {
    case 'planner': return ['plannersNotes'];
    default: return ['category', 'details'];   // buyer (own lines: the server only sends those) and manager
  }
}

const LABELS: Record<EntryField, string> = {
  category: 'Category',
  details: 'Details / Issue',
  plannersNotes: 'Planners Notes',
};

export function fieldLabel(field: EntryField): string {
  return LABELS[field];
}

const clean = (text: string | null | undefined) => (text ?? '').trim();

/** Same text as far as the server is concerned: ends trimmed, and empty, blank and nothing all mean "not set". */
export function sameText(a: string | null | undefined, b: string | null | undefined): boolean {
  return clean(a) === clean(b);
}

/** Why this text cannot be saved, or null. Checked here so a too-long paste is explained before anything is sent. */
export function textProblem(field: EntryField, text: string): string | null {
  const length = clean(text).length;
  return length > MAX_TEXT_LENGTH
    ? `${fieldLabel(field)} is ${formatNumber(length)} characters; the limit is ${formatNumber(MAX_TEXT_LENGTH)}.`
    : null;
}

/**
 * The save for one field, or null when there is nothing to save. `shown` is what the screen was showing when the
 * person started editing; it goes along as `expected`, so a change made by someone else in the meantime is caught.
 * Clearing a field sends an empty string: null would mean "leave it alone".
 */
export function buildEntryRequest(
  division: string, lineKey: string, field: EntryField, text: string, shown: string | null,
): EntryRequest | null {
  if (sameText(text, shown)) return null;
  return { division, lineKey, [field]: clean(text), expected: { [field]: shown } };
}

/**
 * "Use mine" after a conflict: the same change, now expecting what the line holds now. It saves unless the field
 * changes yet again in the meantime, in which case the person sees a new conflict, not a silent overwrite.
 */
export function retryAgainstTheirs(request: EntryRequest, field: EntryField, theirs: LineEntry): EntryRequest {
  return { ...request, expected: { ...request.expected, [field]: theirs[field] } };
}

/**
 * What a cell is doing about its save. A failure keeps the request that failed (`retry`) and a conflict the one that
 * was refused (`mine`), so "Try again" and "Use mine" send exactly that.
 */
export type CellStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'failed'; message: string; retry?: EntryRequest }
  | { kind: 'conflict'; field: EntryField; message: string; theirs: LineEntry; mine: EntryRequest };

const NETWORK_MESSAGE = 'Could not reach the server, so this was not saved. Check your connection and try again.';

/**
 * A failed save other than a conflict. The server's own words are kept; a browser's "Failed to fetch" is not shown.
 * `retry` is the request that failed; there is none when the text was refused before anything was sent.
 */
export function failureStatus(error: unknown, retry?: EntryRequest): Extract<CellStatus, { kind: 'failed' }> {
  const message = error instanceof TypeError ? NETWORK_MESSAGE
    : error instanceof Error && error.message ? error.message
    : 'The change could not be saved. Please try again.';
  return retry ? { kind: 'failed', message, retry } : { kind: 'failed', message };
}

/** A save refused because someone else changed the field first: who, when, and what it holds now. */
export function conflictStatus(error: EntryConflictError, mine: EntryRequest): Extract<CellStatus, { kind: 'conflict' }> {
  const message = error.changedBy
    ? `${shortUser(error.changedBy)} changed this${error.changedUtc ? ` at ${utcText(error.changedUtc)}` : ''}.`
    : 'Someone else changed this.';
  return { kind: 'conflict', field: error.field, message, theirs: error.entry, mine };
}

/** Which status a thrown error becomes, remembering the request that was being sent. */
export function statusOfError(error: unknown, request: EntryRequest): Extract<CellStatus, { kind: 'failed' | 'conflict' }> {
  return error instanceof EntryConflictError ? conflictStatus(error, request) : failureStatus(error, request);
}

/** The later of two "updated" stamps (ISO, UTC, so they compare as text). A missing stamp is the oldest. */
const isNewer = (candidate: string | null, current: string | null) =>
  candidate !== null && (current === null || candidate >= current);

/**
 * The rows with one saved field put on its line. Only that field (and the "updated by / when" stamp, if it is
 * newer) is taken: two cells of one line can save at the same time, and the answer to the first must not undo the
 * second. The same list comes back if the line is not on this page.
 */
export function withEntry(rows: WorkbenchRow[], lineKey: string, field: EntryField, saved: LineEntry): WorkbenchRow[] {
  if (!rows.some(r => r.lineKey === lineKey)) return rows;
  return rows.map(r => {
    if (r.lineKey !== lineKey) return r;
    const stamp = isNewer(saved.updatedUtc, r.entry.updatedUtc)
      ? { updatedBy: saved.updatedBy, updatedUtc: saved.updatedUtc }
      : {};
    return { ...r, entry: { ...r.entry, [field]: saved[field], ...stamp } };
  });
}
