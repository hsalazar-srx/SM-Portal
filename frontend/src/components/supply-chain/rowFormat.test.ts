import { describe, expect, it } from 'vitest';
import {
  buyStatusVariant,
  dateText,
  etaText,
  formatNumber,
  okNgDisplay,
  poStatusText,
  updatedText,
  utcText,
} from './rowFormat';
import type { LiveFields } from '@/services/supplyChainService';

const live = (over: Partial<LiveFields> = {}): LiveFields =>
  ({ state: 'Found', poStatus: '35', eta: '2026-11-27', requestedDate: '2026-11-03', ...over });

describe('okNgDisplay', () => {
  it('shows OK in green and NG in red', () => {
    expect(okNgDisplay('OK')).toMatchObject({ label: 'OK', variant: 'success' });
    expect(okNgDisplay('NG')).toMatchObject({ label: 'NG', variant: 'error' });
  });

  it('shows a question mark, with the reason, when it cannot be known: never a guessed NG', () => {
    const d = okNgDisplay(null);

    expect(d).toMatchObject({ label: '?', variant: 'neutral' });
    expect(d.title).toMatch(/MOVEX could not be read/);
  });
});

describe('buyStatusVariant', () => {
  it.each([
    ['No purchase order', 'error'],
    ['Now Overdue', 'error'],
    ['Late Order', 'warning'],
    ['Unconfirmed PO', 'warning'],
    ['Order not printed', 'warning'],
    ['OK', 'success'],
    ['At QC inspection', 'success'],
  ])('colours MSP\'s "%s" as %s', (status, variant) => {
    expect(buyStatusVariant(status)).toBe(variant);
  });

  it('leaves an unknown or missing status neutral rather than guessing', () => {
    expect(buyStatusVariant('Something new')).toBe('neutral');
    expect(buyStatusVariant(null)).toBe('neutral');
  });
});

describe('etaText', () => {
  it('shows the confirmed date when MOVEX has one', () => {
    expect(etaText(live())).toBe('2026-11-27');
  });

  it('says there is no date yet when the line is in MOVEX but has no confirmed date', () => {
    expect(etaText(live({ eta: null, poStatus: '20' }))).toBe('No date yet');
  });

  it('says the PO line is not in MOVEX', () => {
    expect(etaText(live({ state: 'NotInMovex', eta: null, poStatus: null }))).toBe('Not in MOVEX');
  });

  it('shows a dash for a line with no PO line, and a question mark when MOVEX could not be read', () => {
    expect(etaText(live({ state: 'None', eta: null, poStatus: null }))).toBe('—');
    expect(etaText(live({ state: 'Unavailable', eta: null, poStatus: null }))).toBe('?');
  });
});

describe('poStatusText', () => {
  it('shows the PO line status, a dash when there is none, and a question mark when unknown', () => {
    expect(poStatusText(live())).toBe('35');
    expect(poStatusText(live({ state: 'None', poStatus: null }))).toBe('—');
    expect(poStatusText(live({ state: 'Unavailable', poStatus: null }))).toBe('?');
  });
});

describe('formatNumber', () => {
  it.each([
    [1180, '1,180'],
    [590.5, '590.5'],
    [0.21, '0.21'],
    [0.05, '0.05'],
    [0, '0'],
  ])('shows %f as %s', (n, text) => {
    expect(formatNumber(n)).toBe(text);
  });

  it('shows a dash when there is no number', () => {
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber(undefined)).toBe('—');
  });
});

describe('dateText', () => {
  it('shows an ISO date as it is, and a dash for none', () => {
    expect(dateText('2026-11-27')).toBe('2026-11-27');
    expect(dateText(null)).toBe('—');
  });
});

describe('utcText', () => {
  it('shows a UTC stamp to the minute, saying it is UTC', () => {
    expect(utcText('2026-11-12T00:30:45')).toBe('2026-11-12 00:30 UTC');
    expect(utcText('2026-11-12T00:30:00.1234567')).toBe('2026-11-12 00:30 UTC');
  });
});

describe('updatedText', () => {
  const changed = (updatedBy: string | null) =>
    ({ category: null, details: null, plannersNotes: null, updatedBy, updatedUtc: '2026-11-10T01:00:00' });

  it('drops the domain from a Windows account name', () => {
    expect(updatedText(changed(String.raw`SRXGLOBAL\ypkhor10`))).toBe('ypkhor10 · 2026-11-10');
    expect(updatedText(changed('plain'))).toBe('plain · 2026-11-10');
    expect(updatedText(changed(null))).toBe(' · 2026-11-10');
  });

  it('says "never" for a line nobody has changed', () => {
    expect(updatedText({ category: null, details: null, plannersNotes: null, updatedBy: null, updatedUtc: null })).toBe('never');
  });

  it('shows who last changed it and the day', () => {
    const entry = { category: 'Received', details: null, plannersNotes: null,
      updatedBy: String.raw`SRXGLOBAL\ypkhor10`, updatedUtc: '2026-11-10T01:00:00' };

    expect(updatedText(entry)).toBe('ypkhor10 · 2026-11-10');
  });
});
