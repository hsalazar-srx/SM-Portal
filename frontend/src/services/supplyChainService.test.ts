import { afterEach, describe, expect, it, vi } from 'vitest';
import supplyChainService from './supplyChainService';

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
