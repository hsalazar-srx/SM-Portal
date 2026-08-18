// src/components/ExchangeRatePage.tsx
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
import { H2, Caption, Muted } from '@/components/ui/typography';
import exchangeRateService, { type ExchangeRateResult } from '@/services/exchangeRateService';
import PageFooter from '@/components/PageFooter';

// yyyy-MM-dd of today in local time — used as default date and max-date for the picker
function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'JPY', label: 'JPY — Japanese Yen' },
  { value: 'HKD', label: 'HKD — Hong Kong Dollar' },
  { value: 'NZD', label: 'NZD — New Zealand Dollar' },
  { value: 'MYR', label: 'MYR — Malaysian Ringgit' },
  { value: 'SGD', label: 'SGD — Singapore Dollar' },
];

export default function ExchangeRatePage() {
  const { user, signOut } = useAuth();

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [date,     setDate]     = useState(todayLocal());
  const [currency, setCurrency] = useState('USD');

  // ── Result state ─────────────────────────────────────────────────────────────
  // null = search ran but no rate found within fallback window (404)
  const [rateResult, setRateResult] = useState<ExchangeRateResult | null | undefined>(undefined);
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [hasLoaded,  setHasLoaded]  = useState(false);

  // Snapshot of the query params shown in the result header
  const [queriedDate,     setQueriedDate]     = useState('');
  const [queriedCurrency, setQueriedCurrency] = useState('');

  // ── Search handler ────────────────────────────────────────────────────────────
  async function handleSearch() {
    setError(null);
    setIsLoading(true);
    setRateResult(undefined);

    // Capture query params for display in results
    setQueriedDate(date);
    setQueriedCurrency(currency);

    try {
      const result = await exchangeRateService.getRate(currency, date);
      setRateResult(result);   // null = 404 (no rate), object = success
      setHasLoaded(true);
    } catch (err: any) {
      setError(err.message ?? 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">

      <ResponsiveHeader
        title="Exchange Rates"
        subtitle="Daily SPOT rates from the Reserve Bank of Australia"
        userName={user?.displayName}
        onSignOut={signOut}
      />

      <div className="flex-1 max-w-7xl mx-auto w-full px-md lg:px-lg py-lg space-y-lg">

        {/* Page header */}
        <div>
          <H2>SPOT Exchange Rates</H2>
          <Muted className="text-sm mt-xs">
            Rates sourced from RBA Table F11.1 and stored in the MOVEX currency table (CCURRA).
            Convention: 1 AUD = X foreign currency units (RBA publishes as &quot;A$1=USD&quot;).
            For weekends and public holidays, the most recent prior business day rate is returned.
          </Muted>
        </div>

        {/* Filter card */}
        <Card>
          <CardHeaderStrip title="Look Up Rate" />
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-md items-end">
              <Input
                type="date"
                label="Date"
                value={date}
                max={todayLocal()}
                onChange={e => setDate(e.target.value)}
              />
              <Select
                label="Currency"
                value={currency}
                options={CURRENCY_OPTIONS}
                onChange={e => setCurrency(e.target.value)}
              />
              <Button
                onClick={handleSearch}
                disabled={isLoading || !date}
                className="w-full"
              >
                {isLoading ? 'Loading…' : 'Get Rate'}
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Error */}
        {error && (
          <Alert kind="danger" title="Error retrieving exchange rate">
            {error}
          </Alert>
        )}

        {/* Loading */}
        <LoadingState isLoading={isLoading} message="Fetching exchange rate from MOVEX…" size="lg" />

        {/* Not found */}
        {hasLoaded && !isLoading && rateResult === null && (
          <Alert kind="warning" title="No Rate Available">
            No exchange rate found for <strong>{queriedCurrency}</strong> on <strong>{queriedDate}</strong>.
            The RBA had no published rate for this date or the preceding fallback window.
            This typically occurs during extended public holiday periods.
          </Alert>
        )}

        {/* Results */}
        {hasLoaded && !isLoading && rateResult != null && (
          <>
            {/* Fallback notice */}
            {rateResult.usedFallback && (
              <Alert kind="warning" title="Prior Business Day Rate Applied">
                The requested date (<strong>{rateResult.requestedDate}</strong>) had no published
                rate{rateResult.isWeekend ? ' — weekend' : ' — public holiday or no data'}.
                The most recent available rate from{' '}
                <strong>{rateResult.effectiveDate}</strong> is shown below.
              </Alert>
            )}

            {/* Stat cards */}
            <StatsGrid
              columns={3}
              stats={[
                {
                  label: `SPOT Rate (${rateResult.currency} per AUD)`,
                  value: rateResult.rate.toFixed(4),
                  icon: '💱',
                  color: 'primary',
                },
                {
                  label: 'Effective Date',
                  value: rateResult.effectiveDate,
                  icon: '📅',
                  color: rateResult.usedFallback ? 'warning' : 'success',
                },
                {
                  label: 'Source',
                  value: `${rateResult.source} F11.1`,
                  icon: '🏦',
                  color: 'info',
                },
              ]}
            />

            {/* Detail card */}
            <Card>
              <CardHeaderStrip
                title={`AUD/${queriedCurrency} Rate — ${rateResult.requestedDate}`}
              />
              <CardBody>
                <div className="space-y-lg">

                  {/* Large rate display */}
                  <div className="text-center py-md border-b border-outline">
                    <p className="text-4xl font-bold text-primary font-mono tracking-tight">
                      1 AUD = {rateResult.rate.toFixed(4)} {rateResult.currency}
                    </p>
                    <Muted className="text-sm mt-sm">
                      Rate type: <strong>{rateResult.rateType}</strong> · Source: {rateResult.source} Table F11.1
                    </Muted>
                  </div>

                  {/* Metadata grid */}
                  <div className="grid md:grid-cols-2 gap-lg">
                    <div>
                      <Caption className="block uppercase tracking-wider text-xs font-semibold text-text-weak mb-xs">
                        Requested Date
                      </Caption>
                      <p className="font-mono text-sm">{rateResult.requestedDate}</p>
                    </div>

                    <div>
                      <Caption className="block uppercase tracking-wider text-xs font-semibold text-text-weak mb-xs">
                        Effective Date
                      </Caption>
                      <div className="flex items-center gap-sm flex-wrap">
                        <p className="font-mono text-sm">{rateResult.effectiveDate}</p>
                        {rateResult.usedFallback && (
                          <Badge variant="warning" size="sm">
                            Prior day fallback
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <Caption className="block uppercase tracking-wider text-xs font-semibold text-text-weak mb-xs">
                        Last RBA Sync (UTC)
                      </Caption>
                      <p className="font-mono text-sm">
                        {rateResult.lastSyncUtc ?? '—'}
                      </p>
                    </div>

                    <div>
                      <Caption className="block uppercase tracking-wider text-xs font-semibold text-text-weak mb-xs">
                        Day Type
                      </Caption>
                      <div className="flex items-center gap-sm">
                        <Badge
                          variant={rateResult.isWeekend ? 'neutral' : 'success'}
                          size="sm"
                        >
                          {rateResult.isWeekend ? 'Weekend' : 'Business day'}
                        </Badge>
                        {rateResult.usedFallback && !rateResult.isWeekend && (
                          <Badge variant="warning" size="sm">
                            No data — fallback applied
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </CardBody>
            </Card>
          </>
        )}

      </div>

      <PageFooter />

    </div>
  );
}
