import { afterEach, describe, expect, it, vi } from 'vitest';
import supplyChainService, { EntryConflictError } from './supplyChainService';

// The portal's own endpoint (SupplyChainController). The role comes from the person's AD groups on the server,
// so the browser only ever reads it: it must be treated as untrusted input and checked before it is used.

function json(status: number, body: unknown, statusText = ''): Response {
  return new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { 'Content-Type': 'application/json' },
  });
}

function stubFetch(respond: () => Promise<Response>) {
  const fetchMock = vi.fn(respond);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('supplyChainService.getAccess', () => {
  it('asks the portal who the person is, sending their Windows credentials', async () => {
    const fetchMock = stubFetch(() => Promise.resolve(json(200, { allowed: true, role: 'buyer' })));

    await supplyChainService.getAccess();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/supply-chain\/access$/);
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('include');
  });

  it.each(['buyer', 'planner', 'manager'] as const)('returns the %s role', async role => {
    stubFetch(() => Promise.resolve(json(200, { allowed: true, role })));

    expect(await supplyChainService.getAccess()).toEqual({ allowed: true, role });
  });

  it('returns no access for a person with no role', async () => {
    stubFetch(() => Promise.resolve(json(200, { allowed: false, role: null })));

    expect(await supplyChainService.getAccess()).toEqual({ allowed: false, role: null });
  });

  it.each([
    ['an unknown role', { allowed: true, role: 'admin' }],
    ['a missing role', { allowed: true }],
    ['a role in the wrong case', { allowed: true, role: 'Manager' }],
    ['allowed as text', { allowed: 'true', role: 'manager' }],
  ])('treats %s as no access, never as a guess', async (_label, body) => {
    stubFetch(() => Promise.resolve(json(200, body)));

    expect(await supplyChainService.getAccess()).toEqual({ allowed: false, role: null });
  });

  it('throws the server\'s own message when the check fails', async () => {
    stubFetch(() => Promise.resolve(json(502, { error: 'The Workbench is temporarily unavailable.' }, 'Bad Gateway')));

    await expect(supplyChainService.getAccess()).rejects.toThrow('The Workbench is temporarily unavailable.');
  });

  it('falls back to the HTTP status when the failure has no message', async () => {
    stubFetch(() => Promise.resolve(new Response('<html>oops</html>', { status: 500, statusText: 'Server Error' })));

    await expect(supplyChainService.getAccess()).rejects.toThrow('HTTP 500: Server Error');
  });

  it('lets a network failure through, so the page can say the check could not be made', async () => {
    stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));

    await expect(supplyChainService.getAccess()).rejects.toThrow('Failed to fetch');
  });
});

describe('supplyChainService.getRows', () => {
  const PAGE = { rows: [], total: 0, page: 1, pageSize: 50, liveAvailable: true, correlationId: 'c1' };

  it('asks for the page with the filters as query parameters, sending Windows credentials', async () => {
    const fetchMock = stubFetch(() => Promise.resolve(json(200, PAGE)));

    await supplyChainService.getRows({ division: 'D', card: 'noPo', page: '2', search: 'R&D 50%' });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const parsed = new URL(url);
    expect(parsed.pathname).toMatch(/\/supply-chain\/rows$/);
    expect(parsed.searchParams.get('division')).toBe('D');
    expect(parsed.searchParams.get('card')).toBe('noPo');
    expect(parsed.searchParams.get('page')).toBe('2');
    expect(parsed.searchParams.get('search')).toBe('R&D 50%');   // encoded and decoded intact
    expect(init.credentials).toBe('include');
  });

  it('returns the page as the portal sent it', async () => {
    stubFetch(() => Promise.resolve(json(200, { ...PAGE, total: 1234, liveAvailable: false })));

    const page = await supplyChainService.getRows({ division: 'D' });

    expect(page.total).toBe(1234);
    expect(page.liveAvailable).toBe(false);
  });

  it('shows Reporting-Service\'s own explanation for a rejected request', async () => {
    // Reporting-Service answers { code, message }; the portal's own faults answer { error }. Both read well to a person.
    stubFetch(() => Promise.resolve(json(400, { code: 'PARAMETER_VALIDATION_FAILED', message: 'card must be one of: noPo, ng.' })));

    await expect(supplyChainService.getRows({ division: 'D', card: 'x' })).rejects.toThrow('card must be one of: noPo, ng.');
  });

  it('shows the portal\'s message when Reporting-Service is unavailable', async () => {
    stubFetch(() => Promise.resolve(json(502, { error: 'The Workbench is temporarily unavailable. Please try again shortly.' })));

    await expect(supplyChainService.getRows({ division: 'D' })).rejects.toThrow('temporarily unavailable');
  });
});

describe('supplyChainService.getSummary', () => {
  it('asks for the cards and backlog of a division', async () => {
    const fetchMock = stubFetch(() => Promise.resolve(json(200, { openLines: 3, cards: {}, backlog: [], liveAvailable: true })));

    const summary = await supplyChainService.getSummary({ division: 'D', refresh: 'true' });

    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    const parsed = new URL(url);
    expect(parsed.pathname).toMatch(/\/supply-chain\/summary$/);
    expect(parsed.searchParams.get('refresh')).toBe('true');
    expect(summary.openLines).toBe(3);
  });
});

describe('supplyChainService.getCategories', () => {
  it('returns the Category menu', async () => {
    const fetchMock = stubFetch(() => Promise.resolve(json(200, [{ name: 'Received', example: null }, { name: 'Expediting', example: 'DHL' }])));

    const menu = await supplyChainService.getCategories();

    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(new URL(url).pathname).toMatch(/\/supply-chain\/categories$/);
    expect(menu.map(c => c.name)).toEqual(['Received', 'Expediting']);
  });
});

describe('supplyChainService.saveEntry', () => {
  const REQUEST = {
    division: 'D', lineKey: '9100001|ITEM-0001|1', category: 'Expediting', expected: { category: null },
  };
  const SAVED_ENTRY = {
    category: 'Expediting', details: null, plannersNotes: null, updatedBy: String.raw`SRXGLOBAL\hsalazar`, updatedUtc: '2026-11-12T01:00:00',
  };

  it('sends the change as a JSON PATCH with Windows credentials', async () => {
    const fetchMock = stubFetch(() => Promise.resolve(json(200, { status: 'Saved', entry: SAVED_ENTRY, correlationId: 'c1' })));

    await supplyChainService.saveEntry(REQUEST);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/supply-chain\/entry$/);
    expect(init.method).toBe('PATCH');
    expect(init.credentials).toBe('include');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual(REQUEST);   // exactly what was given: nothing added, nothing dropped
  });

  it('keeps a null in "expected": it means the screen showed the field empty, and is not the same as leaving it out', async () => {
    const fetchMock = stubFetch(() => Promise.resolve(json(200, { status: 'Saved', entry: SAVED_ENTRY })));

    await supplyChainService.saveEntry(REQUEST);

    const sent = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(sent.expected).toEqual({ category: null });
  });

  it('returns whether it was saved and the line\'s entry afterwards', async () => {
    stubFetch(() => Promise.resolve(json(200, { status: 'Saved', entry: SAVED_ENTRY })));

    const saved = await supplyChainService.saveEntry(REQUEST);

    expect(saved.status).toBe('Saved');
    expect(saved.entry.category).toBe('Expediting');
    expect(saved.entry.updatedBy).toBe(String.raw`SRXGLOBAL\hsalazar`);
  });

  it('reports "NoChange" when the server found the value already there', async () => {
    stubFetch(() => Promise.resolve(json(200, { status: 'NoChange', entry: SAVED_ENTRY })));

    expect((await supplyChainService.saveEntry(REQUEST)).status).toBe('NoChange');
  });

  it('turns a 409 into an EntryConflictError that says who changed it, when, and what it holds now', async () => {
    const theirs = { ...SAVED_ENTRY, category: 'Received' };
    stubFetch(() => Promise.resolve(json(409, {
      code: 'EDIT_CONFLICT', message: 'Category was changed by SRXGLOBAL\\ypkhor10 since it was loaded.',
      field: 'Category', changedBy: String.raw`SRXGLOBAL\ypkhor10`, changedUtc: '2026-11-12T00:30:00', entry: theirs,
    })));

    const error = await supplyChainService.saveEntry(REQUEST).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(EntryConflictError);
    const conflict = error as EntryConflictError;
    expect(conflict.field).toBe('category');                 // the server names the field in PascalCase; the screen uses camelCase
    expect(conflict.changedBy).toBe(String.raw`SRXGLOBAL\ypkhor10`);
    expect(conflict.changedUtc).toBe('2026-11-12T00:30:00');
    expect(conflict.entry.category).toBe('Received');
    expect(conflict.message).toContain('was changed by');
  });

  it('copes with a conflict that does not know who changed it', async () => {
    stubFetch(() => Promise.resolve(json(409, { code: 'EDIT_CONFLICT', message: 'changed', field: 'Details', changedBy: null, changedUtc: null, entry: SAVED_ENTRY })));

    const conflict = await supplyChainService.saveEntry(REQUEST).catch((e: unknown) => e) as EntryConflictError;

    expect(conflict.field).toBe('details');
    expect(conflict.changedBy).toBeNull();
  });

  it('treats a conflict that names a field this screen does not know as an ordinary error, still with its message', async () => {
    stubFetch(() => Promise.resolve(json(409, { code: 'EDIT_CONFLICT', message: 'Something else changed.', field: 'Colour', entry: SAVED_ENTRY })));

    const error = await supplyChainService.saveEntry(REQUEST).catch((e: unknown) => e);

    expect(error).not.toBeInstanceOf(EntryConflictError);
    expect((error as Error).message).toBe('Something else changed.');
  });

  it.each([
    [400, { code: 'INVALID_CATEGORY', message: '\'Foo\' is not on the Category menu.' }, 'not on the Category menu'],
    [403, { code: 'FIELD_NOT_ALLOWED', message: 'planner may not change Category on this line.' }, 'may not change Category'],
    [404, { code: 'LINE_NOT_FOUND', message: 'No such line, or it is not one of yours.' }, 'No such line'],
    [503, { code: 'STORE_BUSY', message: 'The Workbench is busy saving someone else\'s change.' }, 'busy saving'],
    [502, { error: 'The Workbench is temporarily unavailable. Please try again shortly.' }, 'temporarily unavailable'],
  ])('shows the server\'s own explanation for a %i, which is not a conflict', async (status, body, text) => {
    stubFetch(() => Promise.resolve(json(status, body)));

    const error = await supplyChainService.saveEntry(REQUEST).catch((e: unknown) => e);

    expect(error).not.toBeInstanceOf(EntryConflictError);
    expect((error as Error).message).toContain(text);
  });

  it('lets a network failure through, so the cell can say the change was not saved', async () => {
    stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));

    await expect(supplyChainService.saveEntry(REQUEST)).rejects.toThrow('Failed to fetch');
  });
});

describe('supplyChainService.canAccess', () => {
  it('is true for a person with a role', async () => {
    stubFetch(() => Promise.resolve(json(200, { allowed: true, role: 'planner' })));

    expect(await supplyChainService.canAccess()).toBe(true);
  });

  it('is false for a person with no role', async () => {
    stubFetch(() => Promise.resolve(json(200, { allowed: false, role: null })));

    expect(await supplyChainService.canAccess()).toBe(false);
  });

  it('is false, not an error, when the check fails: the Welcome tile just stays off', async () => {
    stubFetch(() => Promise.resolve(json(502, { error: 'down' })));
    expect(await supplyChainService.canAccess()).toBe(false);

    stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    expect(await supplyChainService.canAccess()).toBe(false);
  });
});
