// src/components/SupplyChainPage.tsx
// Uses skill: architecture/ui-ux-best-practices
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import ResponsiveHeader from '@/components/ResponsiveHeader';
import PageFooter from '@/components/PageFooter';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { H2, Muted } from '@/components/ui/typography';
import supplyChainService, { type SupplyChainAccess } from '@/services/supplyChainService';
import reportService from '@/services/reportService';
import WorkbenchTab from '@/components/supply-chain/WorkbenchTab';
import {
  canRunSupplyChainReports,
  roleGuidance,
  roleLabel,
  visibleTabs,
  type SupplyChainTabId,
} from '@/components/supply-chain/supplyChainTabs';

type AccessState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; access: SupplyChainAccess };

/** What the unbuilt tabs will hold. Each is built in its own release; until then the tab says so instead of staying blank. */
const COMING: Record<Exclude<SupplyChainTabId, 'workbench'>, string> = {
  dashboard: 'The backlog per buyer and the trend are built after the Workbench.',
  reports: 'The Supply Chain reports will be listed here. Until then, use Reports on the home page.',
  categories: 'The Category menu will be shown here; managers will be able to edit it.',
};

/**
 * Module shell for the Supply Chain Workbench. It asks the portal who the person is (their role comes from AD
 * groups, resolved on the server), shows what that role can do, and offers the module's tabs. The tab contents
 * arrive one release at a time.
 */
export default function SupplyChainPage() {
  const { user, signOut } = useAuth();
  const [state, setState] = useState<AccessState>({ status: 'loading' });
  const [canRunReports, setCanRunReports] = useState(false);
  const [tab, setTab] = useState<SupplyChainTabId>('workbench');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    setCanRunReports(false);

    supplyChainService.getAccess()
      .then(access => { if (!cancelled) setState({ status: 'ready', access }); })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : 'The Workbench could not be reached. Please try again.',
          });
        }
      });

    // The Reports tab depends on report roles, not Workbench roles; a failure here just leaves it off.
    reportService.listReports()
      .then(reports => { if (!cancelled) setCanRunReports(canRunSupplyChainReports(reports)); })
      .catch(() => { /* the tab stays off */ });

    return () => { cancelled = true; };
  }, [attempt]);

  const tabs = visibleTabs(canRunReports);

  // The role of a person who may use the Workbench; null while checking, on a failed check, or with no access.
  // A constant, so the tab callbacks below keep the "not null" narrowing that a state property would lose.
  const role = state.status === 'ready' ? state.access.role : null;

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <ResponsiveHeader
        title="Supply Chain"
        subtitle="Purchase lines, backlog and reports"
        userName={user?.displayName}
        onSignOut={signOut}
      />

      <div className="flex-1 max-w-7xl mx-auto w-full px-md lg:px-lg py-lg space-y-lg">
        <div>
          <H2>Supply Chain Workbench</H2>
          <Muted className="text-sm mt-xs">
            See what needs ordering, what is late and what is waiting on a supplier, and record what you are doing about it.
          </Muted>
        </div>

        <LoadingState isLoading={state.status === 'loading'} message="Checking your access…" size="lg" />

        {state.status === 'error' && (
          <Alert kind="danger" title="Could not check your access">
            <p>{state.message}</p>
            <Button variant="secondary" size="sm" className="mt-sm" onClick={() => setAttempt(n => n + 1)}>
              Try again
            </Button>
          </Alert>
        )}

        {state.status === 'ready' && !state.access.allowed && (
          <Alert kind="info" title="No access to the Workbench">
            Your account is not in a Supply Chain group. Contact IT if you need access.
          </Alert>
        )}

        {role && (
          <>
            {/* Context bar: who the portal thinks you are, and what that allows. */}
            <div className="flex flex-wrap items-center gap-sm rounded-md border border-outline bg-surface px-md py-sm">
              <Badge variant="primary">{roleLabel(role)}</Badge>
              <span className="text-sm text-text-weak">{roleGuidance(role)}</span>
            </div>

            <Tabs value={tab} onValueChange={value => setTab(value as SupplyChainTabId)}>
              <div className="overflow-x-auto">
                <TabsList>
                  {tabs.map(t => (
                    <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {tabs.map(t => (
                <TabsContent key={t.id} value={t.id}>
                  {t.id === 'workbench'
                    ? <WorkbenchTab role={role} />
                    : <Alert kind="info" title={`${t.label} is on its way`}>{COMING[t.id]}</Alert>}
                </TabsContent>
              ))}
            </Tabs>
          </>
        )}
      </div>

      <PageFooter context="Supply Chain" />
    </div>
  );
}
