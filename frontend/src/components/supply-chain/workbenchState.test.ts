import { describe, expect, it } from 'vitest';
import {
  clearFilters,
  goToPage,
  hasActiveFilters,
  initialState,
  pageCount,
  pageRange,
  setFilter,
  sortBy,
  toggleCard,
  toRowsParams,
} from './workbenchState';

describe('initialState', () => {
  it('starts on the first page of Melbourne, oldest MO first, with no filters', () => {
    const s = initialState();

    expect(s).toMatchObject({
      division: 'D', card: null, okNg: '', buyer: '', category: '', search: '', includeGone: false,
      sort: 'moStartDate', descending: false, page: 1, pageSize: 50,
    });
    expect(hasActiveFilters(s)).toBe(false);
  });
});

describe('toggleCard', () => {
  it('turns a card on, and off again when it is clicked twice', () => {
    const on = toggleCard(initialState(), 'noPo');
    expect(on.card).toBe('noPo');

    expect(toggleCard(on, 'noPo').card).toBeNull();
  });

  it('switches from one card to another', () => {
    expect(toggleCard(toggleCard(initialState(), 'noPo'), 'ng').card).toBe('ng');
  });

  it('goes back to the first page, because the list is a different list', () => {
    const onPageFour = goToPage(initialState(), 4);

    expect(toggleCard(onPageFour, 'ng').page).toBe(1);
  });
});

describe('setFilter', () => {
  it('changes a filter and goes back to the first page', () => {
    const s = setFilter(goToPage(initialState(), 3), { buyer: 'SNFKAMAL' });

    expect(s.buyer).toBe('SNFKAMAL');
    expect(s.page).toBe(1);
  });

  it('returns the very same state when nothing would change, so submitting an unchanged search asks for nothing', () => {
    const s = setFilter(initialState(), { search: 'abc', buyer: 'B1' });

    expect(setFilter(s, { search: 'abc' })).toBe(s);
    expect(setFilter(s, { search: 'abc', buyer: 'B1', okNg: '' })).toBe(s);
  });

  it('still goes back to page one when something does change', () => {
    const s = goToPage(setFilter(initialState(), { search: 'abc' }), 3);

    expect(setFilter(s, { search: 'abd' }).page).toBe(1);
  });

  it('keeps everything else as it was', () => {
    const s = setFilter(toggleCard(initialState(), 'ng'), { okNg: 'ng' });

    expect(s.card).toBe('ng');
    expect(s.okNg).toBe('ng');
  });
});

describe('sortBy', () => {
  it('sorts a new column ascending', () => {
    const s = sortBy(initialState(), 'item');

    expect(s).toMatchObject({ sort: 'item', descending: false });
  });

  it('flips the direction when the same column is chosen again, and back', () => {
    const once = sortBy(initialState(), 'item');
    const twice = sortBy(once, 'item');

    expect(twice.descending).toBe(true);
    expect(sortBy(twice, 'item').descending).toBe(false);
  });

  it('starts a different column ascending even if the last one was descending', () => {
    const s = sortBy(sortBy(sortBy(initialState(), 'item'), 'item'), 'supplier');

    expect(s).toMatchObject({ sort: 'supplier', descending: false });
  });

  it('goes back to the first page', () => {
    expect(sortBy(goToPage(initialState(), 5), 'buyer').page).toBe(1);
  });
});

describe('goToPage', () => {
  it('never goes below the first page', () => {
    expect(goToPage(initialState(), 0).page).toBe(1);
    expect(goToPage(initialState(), -3).page).toBe(1);
  });
});

describe('clearFilters', () => {
  it('removes the card, filters and search but keeps how the list is sorted', () => {
    let s = toggleCard(initialState(), 'noPo');
    s = setFilter(s, { okNg: 'ng', buyer: 'B1', category: 'Received', search: 'x', includeGone: true });
    s = sortBy(s, 'supplier');

    const cleared = clearFilters(s);

    expect(hasActiveFilters(cleared)).toBe(false);
    expect(cleared).toMatchObject({ sort: 'supplier', descending: false, page: 1 });
  });
});

describe('hasActiveFilters', () => {
  it.each([
    ['a card', toggleCard(initialState(), 'ng')],
    ['an OK/NG filter', setFilter(initialState(), { okNg: 'ok' })],
    ['a buyer', setFilter(initialState(), { buyer: 'B1' })],
    ['a category', setFilter(initialState(), { category: 'Received' })],
    ['a search', setFilter(initialState(), { search: 'abc' })],
    ['gone lines shown', setFilter(initialState(), { includeGone: true })],
  ])('is true with %s', (_label, state) => {
    expect(hasActiveFilters(state)).toBe(true);
  });

  it('ignores a search of only spaces', () => {
    expect(hasActiveFilters(setFilter(initialState(), { search: '   ' }))).toBe(false);
  });
});

describe('toRowsParams', () => {
  it('always names the division and the page, and leaves out everything unset', () => {
    expect(toRowsParams(initialState())).toEqual({ division: 'D', page: '1', pageSize: '50' });
  });

  it('sends the sort only when it is not the default, and descending only when it is on', () => {
    expect(toRowsParams(sortBy(initialState(), 'item'))).toMatchObject({ sort: 'item' });
    expect(toRowsParams(sortBy(initialState(), 'item'))).not.toHaveProperty('descending');

    const desc = sortBy(sortBy(initialState(), 'item'), 'item');
    expect(toRowsParams(desc)).toMatchObject({ sort: 'item', descending: 'true' });
  });

  it('sends the filters under the names the portal accepts', () => {
    const s = setFilter(toggleCard(initialState(), 'awaitingConfirmation'),
      { okNg: 'ng', buyer: 'SNFKAMAL', category: 'Expediting', search: ' LFLI ', includeGone: true });

    expect(toRowsParams(s)).toEqual({
      division: 'D', page: '1', pageSize: '50', card: 'awaitingConfirmation', okNg: 'ng', buyer: 'SNFKAMAL',
      category: 'Expediting', search: 'LFLI', includeGone: 'true',
    });
  });

  it('asks for a fresh MOVEX read only when told to', () => {
    expect(toRowsParams(initialState())).not.toHaveProperty('refresh');
    expect(toRowsParams(initialState(), true)).toMatchObject({ refresh: 'true' });
  });
});

describe('paging figures', () => {
  it.each([
    [0, 50, 1],       // an empty list is still one (empty) page
    [1, 50, 1],
    [50, 50, 1],
    [51, 50, 2],
    [1234, 50, 25],   // made-up figure: 24 full pages and one part page
  ])('%i lines at %i per page is %i page(s)', (total, size, pages) => {
    expect(pageCount(total, size)).toBe(pages);
  });

  it('says which lines a page shows, the last page ending at the total', () => {
    expect(pageRange(1, 50, 1234)).toEqual({ from: 1, to: 50 });
    expect(pageRange(25, 50, 1234)).toEqual({ from: 1201, to: 1234 });
  });

  it('shows 0 to 0 for an empty list', () => {
    expect(pageRange(1, 50, 0)).toEqual({ from: 0, to: 0 });
  });
});
