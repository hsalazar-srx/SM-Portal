import { describe, expect, it } from 'vitest';
import {
  buildEntryRequest,
  conflictStatus,
  editableFields,
  failureStatus,
  fieldLabel,
  MAX_TEXT_LENGTH,
  retryAgainstTheirs,
  sameText,
  statusOfError,
  textProblem,
  withEntry,
} from './entryEdit';
import { EntryConflictError, type LineEntry, type WorkbenchRow } from '@/services/supplyChainService';

const entry = (over: Partial<LineEntry> = {}): LineEntry =>
  ({ category: null, details: null, plannersNotes: null, updatedBy: null, updatedUtc: null, ...over });

describe('editableFields', () => {
  // Reporting-Service is the authority (SupplyChainPermissions). This only decides which cells to draw as editable,
  // so a person is not offered a box the server would refuse. It must match the roles table agreed with purchasing.
  it('lets a buyer change Category and Details, a planner only Planners Notes, a manager Category and Details', () => {
    expect(editableFields('buyer')).toEqual(['category', 'details']);
    expect(editableFields('planner')).toEqual(['plannersNotes']);
    expect(editableFields('manager')).toEqual(['category', 'details']);
  });
});

describe('fieldLabel', () => {
  it('names each field as the column heading does', () => {
    expect(fieldLabel('category')).toBe('Category');
    expect(fieldLabel('details')).toBe('Details / Issue');
    expect(fieldLabel('plannersNotes')).toBe('Planners Notes');
  });
});

describe('sameText', () => {
  it('ignores spaces at the ends, and treats empty, blank and nothing as the same', () => {
    expect(sameText('abc', ' abc ')).toBe(true);
    expect(sameText(null, '')).toBe(true);
    expect(sameText(null, '   ')).toBe(true);
    expect(sameText('', undefined)).toBe(true);
  });

  it('tells different text apart, including a change of case', () => {
    expect(sameText('abc', 'abd')).toBe(false);
    expect(sameText('abc', 'ABC')).toBe(false);
    expect(sameText(null, 'x')).toBe(false);
  });
});

describe('textProblem', () => {
  it('is fine up to the server\'s limit, counting after the ends are trimmed', () => {
    expect(textProblem('details', 'x'.repeat(MAX_TEXT_LENGTH))).toBeNull();
    expect(textProblem('details', `  ${'x'.repeat(MAX_TEXT_LENGTH)}  `)).toBeNull();
    expect(textProblem('details', '')).toBeNull();
  });

  it('says which field is too long, by how many characters it has, and the limit', () => {
    const problem = textProblem('plannersNotes', 'x'.repeat(MAX_TEXT_LENGTH + 34));

    expect(problem).toBe('Planners Notes is 1,034 characters; the limit is 1,000.');
  });
});

describe('buildEntryRequest', () => {
  const build = (field: 'category' | 'details' | 'plannersNotes', text: string, shown: string | null) =>
    buildEntryRequest('D', '9100001|ITEM-0001|1', field, text, shown);

  it('names the line and division, sends only the one field, and says what the screen was showing', () => {
    expect(build('details', 'DHL in transit', null)).toEqual({
      division: 'D', lineKey: '9100001|ITEM-0001|1', details: 'DHL in transit', expected: { details: null },
    });
  });

  it('trims the text', () => {
    expect(build('details', '  DHL  ', null)?.details).toBe('DHL');
  });

  it('sends an empty string to clear a field, never null (null means "leave it alone")', () => {
    const request = build('details', '   ', 'old text');

    expect(request).toMatchObject({ details: '', expected: { details: 'old text' } });
    expect(request?.details).not.toBeNull();
  });

  it('sends nothing when the text is the same as the screen showed', () => {
    expect(build('details', 'same', 'same')).toBeNull();
    expect(build('details', ' same ', 'same')).toBeNull();
    expect(build('details', '', null)).toBeNull();
  });

  it('sends the value shown as it was, so a stale screen is caught even if only spaces differ', () => {
    expect(build('category', 'Expediting', 'Received')?.expected).toEqual({ category: 'Received' });
  });

  it('leaves the other two fields out entirely', () => {
    const request = build('category', 'Expediting', null)!;

    expect(request).not.toHaveProperty('details');
    expect(request).not.toHaveProperty('plannersNotes');
  });
});

describe('failureStatus', () => {
  it('keeps the server\'s explanation for a failed save', () => {
    expect(failureStatus(new Error('\'Foo\' is not on the Category menu.')))
      .toEqual({ kind: 'failed', message: '\'Foo\' is not on the Category menu.' });
  });

  it('says the change was not saved when the network failed, rather than showing a browser message', () => {
    const status = failureStatus(new TypeError('Failed to fetch'));

    expect(status).toEqual({ kind: 'failed', message: 'Could not reach the server, so this was not saved. Check your connection and try again.' });
  });

  it('copes with something that is not an Error', () => {
    expect(failureStatus('boom')).toMatchObject({ kind: 'failed' });
  });

  it('keeps the request that failed, so "Try again" sends exactly that', () => {
    const request = buildEntryRequest('D', 'k', 'details', 'new', 'old')!;

    expect(failureStatus(new Error('busy'), request)).toEqual({ kind: 'failed', message: 'busy', retry: request });
  });

  it('has nothing to retry when no request was made (a refusal before sending)', () => {
    expect(failureStatus(new Error('too long'))).not.toHaveProperty('retry');
  });
});

describe('conflictStatus', () => {
  const theirs = entry({ category: 'Received' });
  const mine = buildEntryRequest('D', 'k', 'category', 'Expediting', null)!;

  it('says who changed it and when (UTC, to the minute), and keeps what it holds now and what was being sent', () => {
    const conflict = new EntryConflictError('Category was changed…', 'category', String.raw`SRXGLOBAL\ypkhor10`, '2026-11-12T00:30:00', theirs);

    expect(conflictStatus(conflict, mine)).toEqual({
      kind: 'conflict', field: 'category', theirs, mine,
      message: 'ypkhor10 changed this at 2026-11-12 00:30 UTC.',
    });
  });

  it('copes with not knowing who or when', () => {
    const conflict = new EntryConflictError('changed', 'details', null, null, theirs);

    expect(conflictStatus(conflict, mine).message).toBe('Someone else changed this.');
  });
});

describe('statusOfError', () => {
  const request = buildEntryRequest('D', 'k', 'details', 'new', null)!;

  it('turns a conflict into a conflict and anything else into a failure, both remembering the request', () => {
    const conflict = new EntryConflictError('changed', 'details', null, null, entry());

    expect(statusOfError(conflict, request)).toMatchObject({ kind: 'conflict', mine: request });
    expect(statusOfError(new Error('busy'), request)).toMatchObject({ kind: 'failed', retry: request });
  });
});

describe('retryAgainstTheirs ("use mine")', () => {
  it('sends the same change again, now expecting what is there now, so it goes through unless it changes again', () => {
    const mine = buildEntryRequest('D', 'k', 'category', 'Expediting', 'Old')!;
    const theirs = entry({ category: 'Received' });

    const again = retryAgainstTheirs(mine, 'category', theirs);

    expect(again).toEqual({ division: 'D', lineKey: 'k', category: 'Expediting', expected: { category: 'Received' } });
  });

  it('expects nothing when their value is empty: someone cleared it', () => {
    const mine = buildEntryRequest('D', 'k', 'details', 'new', 'old')!;

    expect(retryAgainstTheirs(mine, 'details', entry()).expected).toEqual({ details: null });
  });

  it('does not change the request it was given', () => {
    const mine = buildEntryRequest('D', 'k', 'details', 'new', 'old')!;

    retryAgainstTheirs(mine, 'details', entry({ details: 'theirs' }));

    expect(mine.expected).toEqual({ details: 'old' });
  });
});

describe('withEntry', () => {
  const row = (lineKey: string, over: Partial<LineEntry> = {}): WorkbenchRow =>
    ({ lineKey, entry: entry(over) } as WorkbenchRow);

  it('puts the saved field on that line only', () => {
    const rows = [row('a'), row('b'), row('c')];

    const after = withEntry(rows, 'b', 'category', entry({ category: 'Received' }));

    expect(after.map(r => r.entry.category)).toEqual([null, 'Received', null]);
  });

  it('changes only the field that was saved: a save of one field must not undo a parallel save of another', () => {
    // Details was saved a moment ago and is already on the row; the response to the earlier Category save arrives
    // late and carries the entry as it was then (no details).
    const rows = [row('a', { details: 'DHL in transit', updatedBy: 'u', updatedUtc: '2026-11-12T01:00:05' })];

    const after = withEntry(rows, 'a', 'category',
      entry({ category: 'Expediting', updatedBy: 'u', updatedUtc: '2026-11-12T01:00:02' }));

    expect(after[0].entry.category).toBe('Expediting');
    expect(after[0].entry.details).toBe('DHL in transit');
  });

  it('shows the latest "updated by / when", never going back to an older one', () => {
    const rows = [row('a', { updatedBy: 'u2', updatedUtc: '2026-11-12T01:00:05' })];

    const older = withEntry(rows, 'a', 'category', entry({ category: 'x', updatedBy: 'u1', updatedUtc: '2026-11-12T01:00:02' }));
    expect(older[0].entry).toMatchObject({ updatedBy: 'u2', updatedUtc: '2026-11-12T01:00:05' });

    const newer = withEntry(rows, 'a', 'category', entry({ category: 'x', updatedBy: 'u3', updatedUtc: '2026-11-12T01:00:09' }));
    expect(newer[0].entry).toMatchObject({ updatedBy: 'u3', updatedUtc: '2026-11-12T01:00:09' });
  });

  it('takes the stamp when the line had none yet', () => {
    const after = withEntry([row('a')], 'a', 'details', entry({ details: 'd', updatedBy: 'u', updatedUtc: '2026-11-12T01:00:02' }));

    expect(after[0].entry).toMatchObject({ details: 'd', updatedBy: 'u', updatedUtc: '2026-11-12T01:00:02' });
  });

  it('leaves the original rows alone, and keeps the other rows as the very same objects', () => {
    const rows = [row('a'), row('b')];

    const after = withEntry(rows, 'b', 'category', entry({ category: 'Received' }));

    expect(rows[1].entry.category).toBeNull();
    expect(after[0]).toBe(rows[0]);
  });

  it('returns the same list when the line is not on this page', () => {
    const rows = [row('a')];

    expect(withEntry(rows, 'zzz', 'category', entry({ category: 'x' }))).toBe(rows);
  });
});
