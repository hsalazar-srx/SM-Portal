// src/components/supply-chain/rowFormat.ts
// Uses skill: architecture/ui-ux-best-practices
import type { LineEntry, LiveFields, WorkbenchRow } from '@/services/supplyChainService';

type BadgeVariant = 'success' | 'warning' | 'error' | 'neutral';

/** Shown for an empty value. */
export const DASH = '—';
const UNKNOWN = '?';

/** OK in green, NG in red; a line whose answer cannot be known shows a question mark, never a guessed NG. */
export function okNgDisplay(okNg: WorkbenchRow['okNg']): { label: string; variant: BadgeVariant; title?: string } {
  if (okNg === 'OK') return { label: 'OK', variant: 'success' };
  if (okNg === 'NG') return { label: 'NG', variant: 'error' };
  return { label: UNKNOWN, variant: 'neutral', title: 'Unknown: MOVEX could not be read, so there is no ETA to judge by.' };
}

// The strings are MSP's Buy Status values (Model/MSP.php). Colours are this screen's own judgement, except that
// "No purchase order" and "Unconfirmed PO" are also what Reporting-Service's No PO and Awaiting cards are built on
// (Cards.NoPoBuyStatus): keep those two in step if MSP ever renames them.
const BUY_STATUS: Record<string, BadgeVariant> = {
  'No purchase order': 'error',
  'Now Overdue': 'error',
  'Late Order': 'warning',
  'Unconfirmed PO': 'warning',
  'Order not printed': 'warning',
  'OK': 'success',
  'At QC inspection': 'success',
};

/** Colour for MSP's Buy Status. A status MSP adds later stays neutral until someone decides its colour. */
export function buyStatusVariant(status: string | null): BadgeVariant {
  return (status && BUY_STATUS[status]) || 'neutral';
}

/** The confirmed delivery date, or why there is none. */
export function etaText(live: LiveFields): string {
  switch (live.state) {
    case 'Found': return live.eta ?? 'No date yet';
    case 'NotInMovex': return 'Not in MOVEX';
    case 'Unavailable': return UNKNOWN;
    default: return DASH;
  }
}

/** The PO line's status. The server leaves it null unless MOVEX holds the line. */
export function poStatusText(live: LiveFields): string {
  return live.state === 'Unavailable' ? UNKNOWN : (live.poStatus ?? DASH);
}

const numberFormat = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 2 });

/** A quantity or a count with thousands separators (up to two decimals), or a dash when there is none. */
export function formatNumber(value: number | null | undefined): string {
  return value == null ? DASH : numberFormat.format(value);
}

/** Dates arrive as ISO yyyy-mm-dd and are shown that way (unambiguous in a table). */
export function dateText(date: string | null): string {
  return date ?? DASH;
}

/** DOMAIN\name → name. */
export function shortUser(user: string | null): string {
  if (!user) return '';
  const slash = user.lastIndexOf('\\');
  return slash >= 0 ? user.slice(slash + 1) : user;
}

/** A UTC stamp written without a zone ("2026-11-12T00:30:00") as "2026-11-12 00:30 UTC". */
export function utcText(stamp: string): string {
  return `${stamp.replace('T', ' ').slice(0, 16)} UTC`;
}

/** Who last changed the line and on which day, or "never". The stamp is UTC, written without a zone. */
export function updatedText(entry: LineEntry): string {
  if (!entry.updatedUtc) return 'never';
  return `${shortUser(entry.updatedBy)} · ${entry.updatedUtc.slice(0, 10)}`;
}
