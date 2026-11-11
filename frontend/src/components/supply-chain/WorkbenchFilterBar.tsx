// src/components/supply-chain/WorkbenchFilterBar.tsx
// Uses skill: architecture/ui-ux-best-practices
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import type { Category } from '@/services/supplyChainService';
import { hasActiveFilters, type WorkbenchFilters, type WorkbenchState } from './workbenchState';

/**
 * The filter row. Search applies on Enter or the Search button, not on every key, so typing does not fire a request
 * per letter. `buyers` is null for a buyer, who sees only their own lines and has nobody to filter by.
 */
export default function WorkbenchFilterBar({
  state, buyers, categories, onChange, onClear,
}: {
  state: WorkbenchState;
  buyers: string[] | null;
  categories: Category[];
  onChange: (patch: Partial<WorkbenchFilters>) => void;
  onClear: () => void;
}) {
  const [searchText, setSearchText] = useState(state.search);

  // Keep the box in step when something else changes the search (Clear filters).
  useEffect(() => { setSearchText(state.search); }, [state.search]);

  return (
    <form
      className="grid gap-md md:grid-cols-2 lg:grid-cols-6 items-end"
      onSubmit={e => { e.preventDefault(); onChange({ search: searchText }); }}
    >
      <div className="lg:col-span-2 flex gap-sm items-end">
        <Input
          label="Search"
          placeholder="Item, MO, supplier, customer or PO line"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
        <Button type="submit" variant="secondary" className="shrink-0">Search</Button>
      </div>

      {buyers && (
        <Select
          label="Buyer"
          value={state.buyer}
          onChange={e => onChange({ buyer: e.target.value })}
          options={[{ value: '', label: 'All buyers' }, ...buyers.map(b => ({ value: b, label: b }))]}
        />
      )}

      <Select
        label="Category"
        value={state.category}
        onChange={e => onChange({ category: e.target.value })}
        options={[{ value: '', label: 'All categories' }, ...categories.map(c => ({ value: c.name, label: c.name }))]}
      />

      <Select
        label="OK / NG"
        value={state.okNg}
        onChange={e => onChange({ okNg: e.target.value as WorkbenchFilters['okNg'] })}
        options={[{ value: '', label: 'All' }, { value: 'ok', label: 'OK' }, { value: 'ng', label: 'NG' }]}
      />

      <div className="flex flex-wrap items-center gap-md pb-sm">
        <label className="flex items-center gap-sm text-sm">
          <input
            type="checkbox"
            checked={state.includeGone}
            onChange={e => onChange({ includeGone: e.target.checked })}
          />
          Show lines gone from MSP
        </label>
        {hasActiveFilters(state) && (
          <Button type="button" variant="tertiary" size="sm" onClick={onClear}>Clear filters</Button>
        )}
      </div>
    </form>
  );
}
