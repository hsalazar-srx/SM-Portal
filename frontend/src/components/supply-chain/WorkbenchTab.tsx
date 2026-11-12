// src/components/supply-chain/WorkbenchTab.tsx
// Uses skill: architecture/ui-ux-best-practices
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/spinner';
import { Caption } from '@/components/ui/typography';
import supplyChainService, {
  type Category, type EntryField, type LineEntry, type RowsPage, type Summary, type SupplyChainRole,
} from '@/services/supplyChainService';
import { editableFields, withEntry } from './entryEdit';
import WorkbenchCards from './WorkbenchCards';
import WorkbenchFilterBar from './WorkbenchFilterBar';
import WorkbenchTable from './WorkbenchTable';
import {
  DEFAULT_DIVISION, clearFilters, goToPage, initialState, setFilter, sortBy, toggleCard, toRowsParams,
  type WorkbenchState,
} from './workbenchState';

/**
 * The Workbench list: cards that filter, a filter row, and the lines with their live MOVEX fields. The person's
 * role decides which cells are editable. Reporting-Service decides which lines the person may see and change, so
 * nothing here narrows by role except hiding a buyer filter a buyer has no use for.
 *
 * The lines and the summary load separately, so the table appears without waiting for the (slower) summary. A newer
 * request always wins over an older one still in flight. "Refresh from MOVEX" asks for a fresh read instead of the
 * one kept for the last minute.
 */
export default function WorkbenchTab({ role }: { role: SupplyChainRole }) {
  const [state, setState] = useState<WorkbenchState>(() => initialState());
  // The last page that loaded and when, kept together because one is meaningless without the other.
  const [loaded, setLoaded] = useState<{ page: RowsPage; at: Date } | null>(null);
  const [rowsError, setRowsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const latestRows = useRef(0);

  const fetchRows = useCallback(async (s: WorkbenchState, refresh: boolean) => {
    const id = ++latestRows.current;
    setLoading(true);
    setRowsError(null);
    try {
      const page = await supplyChainService.getRows(toRowsParams(s, refresh));
      if (id !== latestRows.current) return;
      setLoaded({ page, at: new Date() });
    } catch (err: unknown) {
      if (id !== latestRows.current) return;
      setRowsError(err instanceof Error ? err.message : 'The lines could not be loaded. Please try again.');
    } finally {
      if (id === latestRows.current) setLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async (refresh: boolean) => {
    try {
      setSummary(await supplyChainService.getSummary({
        division: DEFAULT_DIVISION,
        ...(refresh && { refresh: 'true' }),
      }));
    } catch {
      setSummary(null);   // the cards show dashes; the list and its own error say what is wrong
    }
  }, []);

  useEffect(() => { void fetchRows(state, false); }, [state, fetchRows]);
  useEffect(() => { void fetchSummary(false); }, [fetchSummary]);
  useEffect(() => {
    supplyChainService.getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  // A saved change is shown straight away without reloading the page. The summary is read again because "Not
  // updated" depends on it; the server keeps the slow MOVEX read for a minute, so this is cheap.
  const entrySaved = useCallback((lineKey: string, field: EntryField, entry: LineEntry) => {
    setLoaded(l => (l && { ...l, page: { ...l.page, rows: withEntry(l.page.rows, lineKey, field, entry) } }));
    void fetchSummary(false);
  }, [fetchSummary]);

  async function refresh() {
    setRefreshing(true);
    await Promise.all([fetchRows(state, true), fetchSummary(true)]);
    setRefreshing(false);
  }

  // A buyer sees only their own lines, so there is nobody to filter by.
  const buyers = role === 'buyer'
    ? null
    : [...new Set((summary?.backlog ?? []).map(b => b.buyer))].sort();

  const data = loaded?.page ?? null;
  const updatedLabel = loaded
    ? `Updated ${loaded.at.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}. `
    : '';

  return (
    <div className="space-y-md">
      <WorkbenchCards
        summary={summary}
        active={state.card}
        onToggle={card => setState(s => toggleCard(s, card))}
        onShowAll={() => setState(s => (s.card ? toggleCard(s, s.card) : s))}
      />

      <Card>
        <CardBody>
          <WorkbenchFilterBar
            state={state}
            buyers={buyers}
            categories={categories}
            onChange={patch => setState(s => setFilter(s, patch))}
            onClear={() => setState(s => clearFilters(s))}
          />
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-sm">
        <Caption>
          {updatedLabel}PO status, ETA and OK/NG are read from MOVEX and kept for up to a minute.
        </Caption>
        <Button variant="secondary" size="sm" onClick={() => void refresh()} disabled={refreshing || loading}>
          {refreshing ? 'Refreshing…' : 'Refresh from MOVEX'}
        </Button>
      </div>

      {data && !data.liveAvailable && (
        <Alert kind="warning" title="MOVEX could not be read">
          The lines are shown, but PO status, ETA and OK/NG are unknown, and the NG and Awaiting confirmation cards cannot
          be counted. Try Refresh in a moment.
        </Alert>
      )}

      {rowsError && (
        <Alert kind="danger" title="Could not load the lines">
          <p>{rowsError}</p>
          <Button variant="secondary" size="sm" className="mt-sm" onClick={() => void fetchRows(state, false)}>
            Try again
          </Button>
        </Alert>
      )}

      {!data && loading && <LoadingState isLoading message="Loading lines…" size="lg" />}

      {data && data.rows.length === 0 && !loading && (
        <Alert kind="info" title="No lines match">
          Nothing matches the cards and filters you have chosen.
          <Button variant="secondary" size="sm" className="mt-sm" onClick={() => setState(s => clearFilters(s))}>
            Clear filters
          </Button>
        </Alert>
      )}

      {data && data.rows.length > 0 && (
        <WorkbenchTable
          rows={data.rows}
          total={data.total}
          page={data.page}
          pageSize={data.pageSize}
          sort={state.sort}
          descending={state.descending}
          loading={loading}
          editing={{ fields: editableFields(role), division: state.division, categories, locked: loading, onSaved: entrySaved }}
          onSort={key => setState(s => sortBy(s, key))}
          onPage={page => setState(s => goToPage(s, page))}
        />
      )}
    </div>
  );
}
