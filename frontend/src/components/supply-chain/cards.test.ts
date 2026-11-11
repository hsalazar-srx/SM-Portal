import { describe, expect, it } from 'vitest';
import { CARDS, cardValue, openLinesValue } from './cards';

describe('CARDS', () => {
  it('lists the six cards in the order the Workbench shows them', () => {
    expect(CARDS.map(c => c.key)).toEqual(['noPo', 'overdueToOrder', 'ng', 'awaitingConfirmation', 'notUpdated', 'gone']);
  });

  it('names each card for the person, with a hint saying what it counts', () => {
    expect(CARDS.map(c => c.label)).toEqual(
      ['No PO', 'Overdue to order', 'NG', 'Awaiting confirmation', 'Not updated', 'Gone from MSP']);
    expect(CARDS.every(c => c.hint.length > 10)).toBe(true);
  });

  it('has no duplicate keys, so each click asks for its own list', () => {
    expect(new Set(CARDS.map(c => c.key)).size).toBe(CARDS.length);
  });

  it('does not put a number of days in a hint, because the window is the server\'s to decide', () => {
    expect(CARDS.some(c => /\d+ days/.test(c.hint))).toBe(false);
  });
});

describe('cardValue', () => {
  const summary = { cards: { noPo: 1234, overdueToOrder: 0, ng: null, awaitingConfirmation: 7, notUpdated: 2000, gone: 3 } };

  it('shows a count with thousands separators', () => {
    expect(cardValue(summary, 'noPo')).toBe('1,234');
    expect(cardValue(summary, 'notUpdated')).toBe('2,000');
  });

  it('shows zero as 0, not as unknown', () => {
    expect(cardValue(summary, 'overdueToOrder')).toBe('0');
  });

  it('shows a dash for a card that could not be worked out (MOVEX was unavailable), never a made-up zero', () => {
    expect(cardValue(summary, 'ng')).toBe('—');
  });

  it('shows a dash before the summary has arrived', () => {
    expect(cardValue(null, 'noPo')).toBe('—');
  });
});

describe('openLinesValue', () => {
  it('shows the open lines with thousands separators, or a dash before the summary arrives', () => {
    expect(openLinesValue({ openLines: 1234 })).toBe('1,234');
    expect(openLinesValue({ openLines: 0 })).toBe('0');
    expect(openLinesValue(null)).toBe('—');
  });
});
