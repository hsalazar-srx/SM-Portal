// src/components/ReportsPage.tsx
// Uses skill: architecture/ui-ux-best-practices
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import ResponsiveHeader from '@/components/ResponsiveHeader';
import { Card, CardHeaderStrip, CardBody } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { LoadingState, Spinner } from '@/components/ui/spinner';
import { H2, H3, Caption, Muted } from '@/components/ui/typography';
import reportService, { type ReportDefinition, type ReportParameter } from '@/services/reportService';
import PageFooter from '@/components/PageFooter';
import ReportHelpDrawer from '@/components/ReportHelpDrawer';

// "InventoryManagement" → "Inventory Management"
function domainLabel(domain: string): string {
  return domain.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function initialValues(report: ReportDefinition): Record<string, string> {
  return Object.fromEntries(report.parameters.map(p => [p.name, p.defaultValue ?? '']));
}

/** One form control per catalog parameter — no per-report code. */
function ParameterField({
  param, value, onChange, disabled, compact = false,
}: {
  param: ReportParameter;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  /** Grouped fields sit in a tight grid: the group explains them once, so no per-field helper text. */
  compact?: boolean;
}) {
  const label = param.required ? `${param.displayName} *` : param.displayName;
  const helperText = compact ? undefined : param.description ?? undefined;

  if (param.type === 'multiselect') {
    const selected = new Set(value.split(',').filter(Boolean));
    const toggle = (option: string) => {
      const next = new Set(selected);
      next.has(option) ? next.delete(option) : next.add(option);
      onChange(param.allowedValues.filter(v => next.has(v)).join(','));
    };
    return (
      <fieldset className="space-y-sm" disabled={disabled}>
        <legend className="block text-sm font-medium text-text">{label}</legend>
        <div className="flex flex-wrap gap-md">
          {param.allowedValues.map(option => (
            <label key={option} className="inline-flex items-center gap-xs text-sm cursor-pointer">
              <input type="checkbox" checked={selected.has(option)} onChange={() => toggle(option)} />
              {option}
            </label>
          ))}
        </div>
        {helperText && <p className="text-xs text-text-weak">{helperText}</p>}
      </fieldset>
    );
  }

  if (param.allowedValues.length > 0) {
    // A blank first option means "let the report decide" — for an optional parameter with no
    // default (e.g. company, which comes from the server's environment).
    const blank = param.required ? 'Select…' : 'Default';
    const options = [
      ...(param.defaultValue ? [] : [{ value: '', label: blank }]),
      ...param.allowedValues.map(v => ({ value: v, label: v })),
    ];
    return (
      <Select label={label} helperText={helperText} value={value} options={options}
              disabled={disabled} onChange={e => onChange(e.target.value)} />
    );
  }

  const inputType =
    param.type === 'date' ? 'date' :
    param.type === 'integer' || param.type === 'decimal' ? 'number' : 'text';

  return (
    <Input type={inputType} label={label} helperText={helperText} value={value}
           step={param.type === 'decimal' ? 'any' : undefined}
           placeholder={param.defaultValue ? `Default ${param.defaultValue}` : param.required ? undefined : 'Leave blank for all'}
           disabled={disabled} onChange={e => onChange(e.target.value)} />
  );
}

export default function ReportsPage() {
  const { user, signOut } = useAuth();

  // ── Catalog state ─────────────────────────────────────────────────────────────
  const [reports,       setReports]       = useState<ReportDefinition[]>([]);
  const [catalogError,  setCatalogError]  = useState<string | null>(null);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  // ── Selection + form state ────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [values,     setValues]     = useState<Record<string, string>>({});

  // ── Download state ────────────────────────────────────────────────────────────
  const [isRunning,     setIsRunning]     = useState(false);
  const [elapsed,       setElapsed]       = useState(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [savedFile,     setSavedFile]     = useState<string | null>(null);
  const [helpOpen,      setHelpOpen]      = useState(false);

  const selected = reports.find(r => r.id === selectedId) ?? null;

  useEffect(() => {
    reportService.listReports()
      .then(list => {
        setReports(list);
        if (list.length === 1) selectReport(list[0]);   // nothing to choose between
      })
      .catch((err: unknown) =>
        setCatalogError(err instanceof Error ? err.message : 'Could not load the report list.'))
      .finally(() => setCatalogLoaded(true));
  }, []);

  // Elapsed-seconds counter while a report runs — a full item master takes ~15s.
  useEffect(() => {
    if (!isRunning) return;
    setElapsed(0);
    const timer = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isRunning]);

  const byDomain = useMemo(() => {
    const groups = new Map<string, ReportDefinition[]>();
    for (const r of reports) groups.set(r.domain, [...(groups.get(r.domain) ?? []), r]);
    return [...groups.entries()];
  }, [reports]);

  function selectReport(report: ReportDefinition) {
    setSelectedId(report.id);
    setValues(initialValues(report));
    setDownloadError(null);
    setSavedFile(null);
    setHelpOpen(false);
  }

  // Ungrouped parameters are the filters; each group (e.g. "Book rates") is shown as its own block.
  const filters = selected?.parameters.filter(p => !p.group) ?? [];
  const groups = useMemo(() => {
    const byGroup = new Map<string, ReportParameter[]>();
    for (const p of selected?.parameters ?? [])
      if (p.group) byGroup.set(p.group, [...(byGroup.get(p.group) ?? []), p]);
    return [...byGroup.entries()];
  }, [selected]);

  const missingRequired = selected?.parameters
    .filter(p => p.required && !p.defaultValue && !values[p.name]?.trim())
    .map(p => p.displayName) ?? [];

  async function handleDownload() {
    if (!selected) return;
    setDownloadError(null);
    setSavedFile(null);
    setIsRunning(true);
    try {
      setSavedFile(await reportService.downloadReport(selected.id, values));
    } catch (err: unknown) {
      setDownloadError(err instanceof Error ? err.message : 'The report could not be produced. Please try again.');
    } finally {
      setIsRunning(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">

      <ResponsiveHeader
        title="Reports"
        subtitle="Live MOVEX data, downloaded as Excel"
        userName={user?.displayName}
        onSignOut={signOut}
      />

      <div className="flex-1 max-w-7xl mx-auto w-full px-md lg:px-lg py-lg space-y-lg">

        <div>
          <H2>Reports</H2>
          <Muted className="text-sm mt-xs">
            Reports run directly against MOVEX when you download them, so the file always reflects
            current data. Choose a report, adjust the filters if needed, and download.
          </Muted>
        </div>

        {catalogError && (
          <Alert kind="danger" title="Could not load reports">{catalogError}</Alert>
        )}

        <LoadingState isLoading={!catalogLoaded} message="Loading reports…" size="lg" />

        {catalogLoaded && !catalogError && reports.length === 0 && (
          <Alert kind="info" title="No reports available">
            Your account does not have access to any reports. Contact IT if you need access.
          </Alert>
        )}

        {reports.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg items-start">

            {/* Report list, grouped by domain */}
            <Card className="lg:col-span-1">
              <CardHeaderStrip title="Available Reports" />
              <CardBody className="space-y-md">
                {byDomain.map(([domain, list]) => (
                  <div key={domain} className="space-y-xs">
                    <Caption className="uppercase tracking-wide">{domainLabel(domain)}</Caption>
                    {list.map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => selectReport(r)}
                        disabled={isRunning}
                        aria-pressed={r.id === selectedId}
                        className={`w-full text-left rounded-md border px-md py-sm transition-colors ${
                          r.id === selectedId
                            ? 'border-primary bg-primary-50'
                            : 'border-outline hover:bg-primary-50'
                        } disabled:opacity-50`}
                      >
                        <div className="font-medium">{r.displayName}</div>
                        {r.category && <div className="text-xs text-text-weak">{r.category}</div>}
                      </button>
                    ))}
                  </div>
                ))}
              </CardBody>
            </Card>

            {/* Selected report */}
            <Card className="lg:col-span-2">
              <CardHeaderStrip title={selected?.displayName ?? 'Select a report'} />
              <CardBody className="space-y-lg">
                {!selected && <Muted>Choose a report from the list to see its filters.</Muted>}

                {selected && (
                  <>
                    <div className="space-y-xs">
                      <Muted className="text-sm">{selected.description}</Muted>
                      <div className="flex flex-wrap items-center justify-between gap-sm">
                        <div className="flex flex-wrap gap-xs">
                          <Badge variant="neutral" size="sm">{domainLabel(selected.domain)}</Badge>
                          {selected.supportedFormats.includes('excel') && (
                            <Badge variant="success" size="sm">Excel</Badge>
                          )}
                        </div>
                        {selected.help && (
                          <Button variant="secondary" size="sm" onClick={() => setHelpOpen(true)} aria-haspopup="dialog">
                            ? How to read this report
                          </Button>
                        )}
                      </div>
                    </div>

                    {filters.length > 0 && (
                      <div className="space-y-md">
                        <H3 className="text-base">Filters</H3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                          {filters.map(p => (
                            <ParameterField
                              key={p.name}
                              param={p}
                              value={values[p.name] ?? ''}
                              disabled={isRunning}
                              onChange={v => setValues(prev => ({ ...prev, [p.name]: v }))}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {groups.map(([heading, params]) => (
                      <div key={heading} className="space-y-md">
                        <div className="flex flex-wrap items-baseline justify-between gap-sm">
                          <H3 className="text-base">{heading}</H3>
                          <button
                            type="button"
                            className="text-sm text-primary underline disabled:opacity-50"
                            disabled={isRunning}
                            onClick={() => setValues(prev => ({
                              ...prev,
                              ...Object.fromEntries(params.map(p => [p.name, p.defaultValue ?? ''])),
                            }))}
                          >
                            Reset to defaults
                          </button>
                        </div>
                        {params.find(p => p.description)?.description && (
                          <p className="text-xs text-text-weak">{params.find(p => p.description)?.description}</p>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-md">
                          {params.map(p => (
                            <ParameterField
                              key={p.name}
                              param={p}
                              compact
                              value={values[p.name] ?? ''}
                              disabled={isRunning}
                              onChange={v => setValues(prev => ({ ...prev, [p.name]: v }))}
                            />
                          ))}
                        </div>
                      </div>
                    ))}

                    <div className="flex flex-wrap items-center gap-md">
                      <Button
                        onClick={handleDownload}
                        disabled={isRunning || missingRequired.length > 0 || !selected.supportedFormats.includes('excel')}
                      >
                        {isRunning ? 'Running report…' : 'Download Excel'}
                      </Button>
                      {isRunning && (
                        <span className="inline-flex items-center gap-sm text-sm text-text-weak">
                          <Spinner size="sm" /> Querying MOVEX — {elapsed}s
                        </span>
                      )}
                      {missingRequired.length > 0 && !isRunning && (
                        <span className="text-sm text-text-weak">Required: {missingRequired.join(', ')}</span>
                      )}
                    </div>

                    {downloadError && (
                      <Alert kind="danger" title="The report could not be produced">{downloadError}</Alert>
                    )}

                    {savedFile && !isRunning && (
                      <Alert kind="success" title="Download complete">
                        Saved <strong>{savedFile}</strong> to your Downloads folder.
                        {selected.help && (
                          <>
                            {' '}Not sure how to read it?{' '}
                            <button
                              type="button"
                              onClick={() => setHelpOpen(true)}
                              className="font-medium underline hover:no-underline"
                            >
                              Open the guide
                            </button>
                          </>
                        )}
                      </Alert>
                    )}
                  </>
                )}
              </CardBody>
            </Card>
          </div>
        )}
      </div>

      {selected?.help && (
        <ReportHelpDrawer report={selected} isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
      )}

      <PageFooter />
    </div>
  );
}
