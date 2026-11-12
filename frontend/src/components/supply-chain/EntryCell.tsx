// src/components/supply-chain/EntryCell.tsx
// Uses skill: architecture/ui-ux-best-practices
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import supplyChainService, {
  type Category, type EntryField, type EntryRequest, type LineEntry, type WorkbenchRow,
} from '@/services/supplyChainService';
import {
  buildEntryRequest, fieldLabel, retryAgainstTheirs, sameText, statusOfError, textProblem, type CellStatus,
} from './entryEdit';

const SAVED_MESSAGE_MS = 2500;

const CONTROL =
  'w-full rounded-md border border-outline bg-bg px-sm py-xs text-sm focus:outline-none focus:ring-2 '
  + 'focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60 read-only:opacity-60';

/**
 * One editable cell: Category is a menu that saves as soon as it is chosen; Details and Planners Notes are boxes
 * that save when the person leaves them (Enter also saves, Shift+Enter starts a new line, Escape puts back what
 * was there). What the screen showed when editing began (`baseline`) goes along as `expected`, so someone else's
 * change in the meantime comes back as a conflict, with "Keep theirs" and "Use mine", instead of being overwritten.
 *
 * A save is never sent twice at once, and what the person typed is never thrown away on a failure: it stays in the
 * box with the reason underneath. While the list is reloading (`locked`) the cell cannot be edited, so an answer
 * that was worked out before a save cannot land on top of it.
 */
export default function EntryCell({
  row, field, division, categories, locked, onSaved,
}: {
  row: WorkbenchRow;
  field: EntryField;
  division: string;
  categories: Category[];
  locked: boolean;
  onSaved: (lineKey: string, field: EntryField, entry: LineEntry) => void;
}) {
  const shown = row.entry[field];
  const [draft, setDraft] = useState(shown ?? '');
  const [status, setStatus] = useState<CellStatus>({ kind: 'idle' });

  const baseline = useRef(shown);                       // what the screen showed when editing began
  const draftRef = useRef(draft);                       // the draft, for the effect below to read
  const inFlight = useRef(false);                       // one save at a time, even for a fast double blur
  const skipSave = useRef(false);                       // Escape: leave without saving
  const timer = useRef<number | undefined>(undefined);
  const statusId = useId();

  useEffect(() => { draftRef.current = draft; }, [draft]);

  // The line was reloaded (Refresh, paging back, someone's save). Follow it, unless the person has typed something
  // that is not saved yet: that stays, and the baseline stays too, so a change made by someone else in the meantime
  // is caught as a conflict instead of being overwritten with a value this cell never displayed.
  useEffect(() => {
    if (sameText(draftRef.current, baseline.current)) {
      baseline.current = shown;
      setDraft(shown ?? '');
    }
  }, [shown]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function save(request: EntryRequest) {
    if (inFlight.current) return;
    inFlight.current = true;
    window.clearTimeout(timer.current);
    setStatus({ kind: 'saving' });
    try {
      const saved = await supplyChainService.saveEntry(request);
      baseline.current = saved.entry[field];
      setDraft(baseline.current ?? '');
      onSaved(row.lineKey, field, saved.entry);
      setStatus({ kind: 'saved' });
      timer.current = window.setTimeout(() => setStatus({ kind: 'idle' }), SAVED_MESSAGE_MS);
    } catch (err: unknown) {
      setStatus(statusOfError(err, request));
    } finally {
      inFlight.current = false;
    }
  }

  function commit(text: string) {
    if (status.kind === 'conflict') return;             // the person has to choose first
    const problem = textProblem(field, text);
    if (problem) {
      setStatus({ kind: 'failed', message: problem });
      return;
    }
    const request = buildEntryRequest(division, row.lineKey, field, text, baseline.current);
    if (!request) {
      if (status.kind === 'failed') setStatus({ kind: 'idle' });
      return;
    }
    void save(request);
  }

  function keepTheirs(theirs: LineEntry) {
    baseline.current = theirs[field];
    setDraft(baseline.current ?? '');
    onSaved(row.lineKey, field, theirs);
    setStatus({ kind: 'idle' });
  }

  const frozen = locked || status.kind === 'saving' || status.kind === 'conflict';

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.blur();
    } else if (e.key === 'Escape' && !frozen) {          // while frozen there is a save or a choice to finish first
      skipSave.current = true;
      setDraft(baseline.current ?? '');
      setStatus({ kind: 'idle' });
      e.currentTarget.blur();
    }
  }

  const failed = status.kind === 'failed';
  const retry = status.kind === 'failed' ? status.retry : undefined;
  const shared = {
    'aria-label': `${fieldLabel(field)} for MO ${row.moOrder}, ${row.item}`,
    'aria-describedby': statusId,
    'aria-invalid': failed || undefined,
  };

  return (
    <div className="min-w-[10rem] space-y-xs">
      {field === 'category' ? (
        <select
          {...shared}
          className={cn(CONTROL, 'max-w-[11rem] cursor-pointer', failed && 'border-error')}
          value={draft}
          disabled={frozen}
          onChange={e => {
            setDraft(e.target.value);
            commit(e.target.value);
          }}
        >
          <option value="">—</option>
          {/* A category the menu has since retired still shows on the lines that hold it. */}
          {draft && !categories.some(c => c.name === draft) && <option value={draft}>{draft}</option>}
          {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
      ) : (
        <textarea
          {...shared}
          className={cn(CONTROL, 'min-w-[12rem] max-w-[16rem] resize-y', failed && 'border-error')}
          rows={2}
          value={draft}
          readOnly={frozen}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={e => {
            if (skipSave.current) { skipSave.current = false; return; }
            commit(e.currentTarget.value);
          }}
        />
      )}

      <div id={statusId} className="text-xs">
        {status.kind === 'saving' && <p role="status" className="text-text-weak">Saving…</p>}
        {status.kind === 'saved' && <p role="status" className="text-success">Saved</p>}
        {status.kind === 'failed' && (
          <p role="alert" className="text-error">
            {status.message}
            {retry && (
              <>
                {' '}
                <button type="button" className="underline" onClick={() => void save(retry)}>Try again</button>
              </>
            )}
          </p>
        )}
        {status.kind === 'conflict' && (
          <div role="alert" className="space-y-xs rounded-md border border-warning bg-surface p-sm">
            <p>
              {status.message} It now says{' '}
              <span className="font-medium">{status.theirs[field] ? `“${status.theirs[field]}”` : 'nothing'}</span>.
            </p>
            <div className="flex gap-sm">
              <Button type="button" size="sm" variant="secondary" onClick={() => keepTheirs(status.theirs)}>Keep theirs</Button>
              <Button type="button" size="sm" variant="primary"
                onClick={() => void save(retryAgainstTheirs(status.mine, field, status.theirs))}>Use mine</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
