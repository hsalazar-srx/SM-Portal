// src/components/supply-chain/cards.ts
// Uses skill: architecture/ui-ux-best-practices
import type { CardKey, Summary } from '@/services/supplyChainService';
import { DASH, formatNumber } from './rowFormat';

interface CardDefinition {
  /** The name the portal accepts as the `card` filter and returns in the summary. */
  key: CardKey;
  label: string;
  /** What the card counts, shown as its tooltip. */
  hint: string;
  color: 'error' | 'warning' | 'primary';
}

/** The cards in display order. MRP actions and planned buys join when those rows exist. */
export const CARDS: readonly CardDefinition[] = [
  { key: 'noPo', label: 'No PO', hint: 'MSP lines that have no purchase order yet', color: 'error' },
  { key: 'overdueToOrder', label: 'Overdue to order', hint: 'No-PO lines that would arrive after their MO starts even if ordered today', color: 'error' },
  { key: 'ng', label: 'NG', hint: 'No ETA, or an ETA after the MO starts (unless the Category is Received)', color: 'error' },
  { key: 'awaitingConfirmation', label: 'Awaiting confirmation', hint: 'A PO exists but the supplier has not confirmed a date', color: 'warning' },
  { key: 'notUpdated', label: 'Not updated', hint: 'No change to the line for longer than the allowed window', color: 'warning' },
  { key: 'gone', label: 'Gone from MSP', hint: 'Lines that have dropped out of the MSP output, kept for reference', color: 'primary' },
];

/** A card's count for display, or a dash when it is unknown (MOVEX unavailable) or the summary has not arrived. */
export function cardValue(summary: Pick<Summary, 'cards'> | null, key: CardKey): string {
  return formatNumber(summary?.cards[key]);
}

export function openLinesValue(summary: Pick<Summary, 'openLines'> | null): string {
  return summary ? formatNumber(summary.openLines) : DASH;
}
