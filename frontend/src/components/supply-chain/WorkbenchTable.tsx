// src/components/supply-chain/WorkbenchTable.tsx
// Uses skill: architecture/ui-ux-best-practices
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Caption } from '@/components/ui/typography';
import { cn } from '@/lib/utils';
import type { Category, EntryField, LineEntry, WorkbenchRow } from '@/services/supplyChainService';
import EntryCell from './EntryCell';
import {
  DASH, buyStatusVariant, dateText, etaText, formatNumber, okNgDisplay, poStatusText, updatedText,
} from './rowFormat';
import { pageCount, pageRange, type SortKey } from './workbenchState';

/** What the table needs to let the person change a line: which fields, and what to do when one is saved. */
export interface EntryEditing {
  /** The fields this person's role may change. Everything else is shown read-only. */
  fields: readonly EntryField[];
  division: string;
  categories: Category[];
  /** True while the list is reloading: the cells cannot be edited until it has arrived. */
  locked: boolean;
  /** One field of a line was saved (or replaced by "Keep theirs"); `entry` is the line's entry as the server has it. */
  onSaved: (lineKey: string, field: EntryField, entry: LineEntry) => void;
}

interface Column {
  id: string;
  label: string;
  /** Present only for columns the server can sort. Live MOVEX fields cannot be sorted. */
  sort?: SortKey;
  align?: 'right';
  render: (row: WorkbenchRow, editing: EntryEditing) => ReactNode;
}

/** An entry column: editable when the person's role allows it, otherwise the text, cut to the column. */
const entryColumn = (id: string, label: string, field: EntryField, width: string, sort?: SortKey): Column => ({
  id, label, sort,
  render: (r, editing) => editing.fields.includes(field)
    ? <EntryCell row={r} field={field} division={editing.division} categories={editing.categories}
        locked={editing.locked} onSaved={editing.onSaved} />
    : clipped(r.entry[field], width),
});

const muted = (text: string | null) => <span className="text-text-weak">{text ?? DASH}</span>;

/** A cell that may hold long free text: cut to the column, with the whole text on hover. */
const clipped = (text: string | null, width: string) => (
  <span className={cn('block truncate', width)} title={text ?? undefined}>{text ?? DASH}</span>
);

const COLUMNS: readonly Column[] = [
  { id: 'buyer', label: 'Buyer', sort: 'buyer', render: r => muted(r.buyer) },
  { id: 'mo', label: 'MO', render: r => <span className="font-mono">{r.moOrder}</span> },
  { id: 'moStart', label: 'MO start', sort: 'moStartDate', render: r => dateText(r.moStartDate) },
  {
    id: 'item', label: 'Item', sort: 'item',
    render: r => (
      <>
        <span className="font-mono whitespace-nowrap">{r.item}</span>
        {r.description && <span className="block max-w-[16rem] truncate text-xs text-text-weak" title={r.description}>{r.description}</span>}
      </>
    ),
  },
  { id: 'supplier', label: 'Supplier', sort: 'supplier', render: r => clipped(r.supplier, 'max-w-[10rem]') },
  { id: 'customer', label: 'Customer', sort: 'customer', render: r => clipped(r.customer, 'max-w-[10rem]') },
  {
    id: 'status', label: 'Status',
    render: r => (
      <span className="flex flex-col items-start gap-xs">
        {r.buyStatus ? <Badge size="sm" variant={buyStatusVariant(r.buyStatus)}>{r.buyStatus}</Badge> : muted(null)}
        {r.closedDate && <Badge size="sm" variant="neutral">Gone from MSP {r.closedDate}</Badge>}
      </span>
    ),
  },
  { id: 'poLine', label: 'PO line', render: r => <span className="font-mono">{r.poLine ?? DASH}</span> },
  { id: 'poStatus', label: 'PO status', render: r => poStatusText(r.live) },
  { id: 'qty', label: 'Req qty', align: 'right', render: r => <span className="font-mono">{formatNumber(r.reqQty)}</span> },
  { id: 'requested', label: 'Requested', render: r => dateText(r.live.requestedDate) },
  { id: 'eta', label: 'ETA (confirmed)', render: r => etaText(r.live) },
  {
    id: 'okNg', label: 'OK / NG',
    render: r => {
      const d = okNgDisplay(r.okNg);
      return <Badge size="sm" variant={d.variant} title={d.title}>{d.label}</Badge>;
    },
  },
  entryColumn('category', 'Category', 'category', 'max-w-[10rem]', 'category'),
  entryColumn('details', 'Details / Issue', 'details', 'max-w-[14rem]'),
  entryColumn('notes', 'Planners Notes', 'plannersNotes', 'max-w-[12rem]'),
  { id: 'updated', label: 'Updated', sort: 'updated', render: r => <span className="whitespace-nowrap">{updatedText(r.entry)}</span> },
];

/**
 * The lines. Category, Details and Planners Notes are editable cells for the roles that may change them; everything
 * else is read-only. The header stays in view while the body scrolls; a column the server can sort is a
 * button, and the sorted one says which way. Below it: paging, with the range shown. While a new page loads the old
 * rows stay (dimmed) so the table does not jump.
 */
export default function WorkbenchTable({
  rows, total, page, pageSize, sort, descending, loading, editing, onSort, onPage,
}: {
  rows: WorkbenchRow[];
  editing: EntryEditing;
  total: number;
  page: number;
  pageSize: number;
  sort: SortKey;
  descending: boolean;
  loading: boolean;
  onSort: (key: SortKey) => void;
  onPage: (page: number) => void;
}) {
  const pages = pageCount(total, pageSize);
  const { from, to } = pageRange(page, pageSize, total);

  return (
    <div className="space-y-sm">
      <div className={cn('max-h-[70vh] overflow-auto rounded-md border border-outline transition-opacity', loading && 'opacity-60')}
        aria-busy={loading}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-surface border-b border-outline">
            <tr>
              {COLUMNS.map(col => {
                const sortKey = col.sort;
                const direction = sortKey && sortKey === sort ? (descending ? 'descending' : 'ascending') : undefined;
                return (
                  <th
                    key={col.id}
                    scope="col"
                    aria-sort={direction}
                    className={cn('px-md py-sm font-semibold text-text-weak whitespace-nowrap', col.align === 'right' ? 'text-right' : 'text-left')}
                  >
                    {sortKey ? (
                      <button type="button" onClick={() => onSort(sortKey)}
                        className="inline-flex items-center gap-xs hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-sm">
                        {col.label}
                        <span aria-hidden="true" className="w-3 text-xs">
                          {direction === 'descending' ? '▼' : direction === 'ascending' ? '▲' : ''}
                        </span>
                      </button>
                    ) : col.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.lineKey} className={cn('border-b border-outline hover:bg-surface transition-colors duration-normal', row.closedDate && 'opacity-70')}>
                {COLUMNS.map(col => (
                  <td key={col.id} className={cn('px-md py-sm align-top', col.align === 'right' && 'text-right')}>
                    {col.render(row, editing)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-sm">
        <Caption>
          {total === 0 ? 'No lines' : `Showing ${formatNumber(from)} to ${formatNumber(to)} of ${formatNumber(total)}`}
        </Caption>
        <div className="flex items-center gap-sm">
          <Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => onPage(page - 1)}>Previous</Button>
          <Caption>Page {page} of {formatNumber(pages)}</Caption>
          <Button variant="secondary" size="sm" disabled={page >= pages || loading} onClick={() => onPage(page + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
