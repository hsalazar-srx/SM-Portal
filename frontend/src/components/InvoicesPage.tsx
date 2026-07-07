// src/components/InvoicesPage.tsx
// Uses skill: architecture/ui-ux-best-practices
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import ResponsiveHeader from '@/components/ResponsiveHeader';
import { Card, CardHeaderStrip, CardBody } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/spinner';
import { StatsGrid } from '@/components/ui/stats';
import { H2, Muted, Caption } from '@/components/ui/typography';
import invoiceService, { InvoiceSummary, InvoiceType } from '@/services/invoiceService';
import { exportInvoicesToExcel } from '@/utils/exportToExcel';
import PageFooter from '@/components/PageFooter';

const PAGE_SIZE = 25;

function defaultFromDate(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function defaultToDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Types' },
  { value: 'AP',  label: 'AP — Accounts Payable' },
  { value: 'AR',  label: 'AR — Accounts Receivable' },
];

function invoiceBadge(inv: InvoiceSummary): { label: string; variant: 'warning' | 'success' | 'error' | 'neutral' } {
  const isCreditNote = inv.totalInclTax < 0;
  if (inv.type === 'AP') return isCreditNote
    ? { label: 'AP-CN', variant: 'neutral' }
    : { label: 'AP',    variant: 'warning' };
  return isCreditNote
    ? { label: 'AR-CN', variant: 'error' }
    : { label: 'AR',    variant: 'success' };
}

export default function InvoicesPage() {
  const { user, signOut } = useAuth();

  // Filter state
  const [fromDate,     setFromDate]     = useState(defaultFromDate());
  const [toDate,       setToDate]       = useState(defaultToDate());
  const [invoiceType,  setInvoiceType]  = useState<InvoiceType>('ALL');

  // Data state
  const [items,      setItems]      = useState<InvoiceSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [hasLoaded,  setHasLoaded]  = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  async function handleSearch() {
    if (!fromDate || !toDate) {
      setError('Please select both From Date and To Date.');
      return;
    }
    setError(null);
    setIsLoading(true);
    setCurrentPage(1);
    try {
      console.log('Fetching invoices with filters:', { fromDate, toDate, invoiceType });
      const result = await invoiceService.getInvoices(fromDate, toDate, invoiceType);
      console.log('Fetched invoices:', result);
      setItems(result.items);
      setTotalCount(result.totalCount);
      setHasLoaded(true);
    } catch (err: any) {
      setError(err.message ?? 'An unexpected error occurred.');
      setItems([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }

  // Client-side pagination
  const totalPages    = Math.ceil(items.length / PAGE_SIZE);
  const pagedItems    = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Summary stats
  const apCount     = items.filter(i => i.type === 'AP' && i.totalInclTax >= 0).length;
  const arCount     = items.filter(i => i.type === 'AR' && i.totalInclTax >= 0).length;
  const creditCount = items.filter(i => i.totalInclTax < 0).length;

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <ResponsiveHeader
        title="Scanfil APAC Portal"
        subtitle="Invoice Extract"
        userName={user?.displayName}
        onSignOut={signOut}
        showComponentsLink={true}
      />

      <div className="flex-1 max-w-7xl mx-auto w-full px-md lg:px-lg py-lg space-y-lg">
        <H2>Invoice Extract</H2>

        {/* Filter card */}
        <Card>
          <CardHeaderStrip title="Search Filters" />
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-md items-end">
              <Input
                label="From Date"
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
              />
              <Input
                label="To Date"
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
              />
              <Select
                label="Invoice Type"
                options={TYPE_OPTIONS}
                value={invoiceType}
                onChange={e => setInvoiceType(e.target.value as InvoiceType)}
              />
              <Button
                onClick={handleSearch}
                disabled={isLoading}
                className="h-10 self-end"
              >
                {isLoading ? 'Searching…' : 'Search'}
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Error */}
        {error && (
          <Alert kind="danger" title="Error">
            {error}
          </Alert>
        )}

        {/* Loading */}
        <LoadingState isLoading={isLoading} message="Fetching invoices from MOVEX…" size="lg" />

        {/* Results */}
        {hasLoaded && !isLoading && (
          <>
            {/* Summary stats */}
            <StatsGrid
              columns={4}
              stats={[
                { label: 'Total',         value: totalCount,  icon: '🧾', color: 'primary' },
                { label: 'AP Invoices',   value: apCount,     icon: '📥', color: 'warning' },
                { label: 'AR Invoices',   value: arCount,     icon: '📤', color: 'success' },
                { label: 'Credit Notes',  value: creditCount, icon: '↩', color: 'error'   },
              ]}
            />

            {/* Data table */}
            <Card>
              <CardHeaderStrip
                title={`Invoices — ${totalCount} result${totalCount !== 1 ? 's' : ''}`}
              />

              {/* Table actions bar */}
              <div className="flex items-center justify-between px-md pt-md pb-sm border-b border-outline">
                <Caption className="text-text-weak">
                  {items.length > 0
                    ? `Page ${currentPage} of ${totalPages || 1} · ${PAGE_SIZE} rows/page`
                    : 'No results'}
                </Caption>
                <Button
                  variant="secondary"
                  onClick={() => exportInvoicesToExcel(items, fromDate, toDate)}
                  disabled={items.length === 0}
                >
                  Export to Excel
                </Button>
              </div>

              <CardBody className="p-0 overflow-x-auto">
                {items.length === 0 ? (
                  <div className="p-lg text-center">
                    <Muted>No invoices found for the selected criteria.</Muted>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-surface border-b border-outline">
                      <tr>
                        {[
                          'Invoice No', 'Date', 'Type', 'Co.',
                          'Party Name', 'Currency', 'Excl. Tax', 'Tax', 'Total Incl. Tax',
                        ].map(h => (
                          <th
                            key={h}
                            className="px-md py-sm text-left font-semibold text-text-weak whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedItems.map((inv, idx) => (
                        <tr
                          key={`${inv.invoiceNo}-${idx}`}
                          className="border-b border-outline hover:bg-surface transition-colors duration-normal"
                        >
                          <td className="px-md py-sm font-mono font-medium whitespace-nowrap">
                            {inv.invoiceNo}
                          </td>
                          <td className="px-md py-sm whitespace-nowrap">{inv.date}</td>
                          <td className="px-md py-sm">
                            {(() => { const b = invoiceBadge(inv); return (
                              <Badge variant={b.variant} size="sm">{b.label}</Badge>
                            ); })()}
                          </td>
                          <td className="px-md py-sm">{inv.companyCode}</td>
                          <td
                            className="px-md py-sm max-w-xs truncate"
                            title={inv.partyName}
                          >
                            {inv.partyName}
                          </td>
                          <td className="px-md py-sm">{inv.currency}</td>
                          <td className="px-md py-sm text-right font-mono">
                            {inv.amountExclTax.toFixed(2)}
                          </td>
                          <td className="px-md py-sm text-right font-mono">
                            {inv.taxAmount.toFixed(2)}
                          </td>
                          <td className="px-md py-sm text-right font-mono font-semibold">
                            {inv.totalInclTax.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardBody>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-md py-sm border-t border-outline">
                  <Caption className="text-text-weak">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                    {Math.min(currentPage * PAGE_SIZE, items.length)} of {items.length}
                  </Caption>
                  <div className="flex gap-sm">
                    <Button
                      variant="secondary"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </>
        )}
      </div>

      <PageFooter context="Invoice Extract · Data sourced from MOVEX DB2" />
    </div>
  );
}
