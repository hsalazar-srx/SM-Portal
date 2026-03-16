import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ResponsiveHeader from '@/components/ResponsiveHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeaderStrip, CardBody } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { H2, Display, Body, Muted, Code, Caption } from '@/components/ui/typography';

export default function WelcomePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return null; // Should not reach here if redirected properly
  }

  const firstName = user.displayName.split(' ')[0];
  const hasAdminRole = user.roles.some(r =>
    r.toLowerCase().includes('admin')
  );

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      {/* Responsive Header */}
      <ResponsiveHeader
        title="Scanfil APAC Portal"
        subtitle="Secure M3 Endpoint Access"
        userName={user.displayName}
        onSignOut={signOut}
        showComponentsLink={true}
      />

      <div className="flex-1">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
          <div className="max-w-7xl mx-auto px-md lg:px-lg py-lg md:py-xl">
            <Display className="text-white m-0 mb-md font-bold text-4xl md:text-5xl">
              Welcome, {firstName}! 👋
            </Display>
            <Body className="text-white opacity-90 text-base md:text-lg">
              You have access to <strong>{user.roles.length}</strong> role(s): 
              <span className="block md:inline md:ml-sm mt-xs md:mt-0 flex flex-wrap gap-xs">
                {user.roles.map((role, i) => (
                  <span key={i} className="px-sm py-xs bg-primary-700/50 rounded-sm text-sm font-medium">
                    {role}
                  </span>
                ))}
              </span>
            </Body>
          </div>
        </div>

        {/* Authentication Info */}
        <section className="w-full px-md lg:px-lg pt-md md:pt-lg">
          <div className="max-w-7xl mx-auto">
            <Alert 
              kind="success" 
              title="✅ Authentication Successful"
            >
              You are authenticated via <strong>Windows AD</strong> as <Code>{user.identity}</Code>
            </Alert>
          </div>
        </section>

        {/* Admin Section */}
        {hasAdminRole && (
          <section className="w-full px-md lg:px-lg mt-md">
            <div className="max-w-7xl mx-auto">
              <Alert 
                kind="info" 
                title="🔐 Admin Access"
              >
                You have <strong>admin privileges</strong>. You can manage RBAC rules and endpoint configurations.
              </Alert>
            </div>
          </section>
        )}

        {/* Feature Cards */}
        <section className="w-full px-md lg:px-lg py-md md:py-xl">
          <div className="max-w-7xl mx-auto">
            <H2 className="mb-md md:mb-lg">Available Features</H2>
            <div className="grid gap-md md:gap-lg md:grid-cols-2 lg:grid-cols-3 auto-rows-max">
              {([
                {
                  title: 'Endpoint Discovery',
                  desc: 'Browse M3 MOVEX endpoints available to your roles',
                  icon: '🔍',
                  path: undefined as string | undefined,
                  disabled: false,
                },
                {
                  title: 'Execute Transactions',
                  desc: 'Run approved M3 transactions with audit logging',
                  icon: '⚙️',
                  path: undefined,
                  disabled: false,
                },
                {
                  title: 'Execution History',
                  desc: 'View audit trail and transaction results',
                  icon: '📋',
                  path: undefined,
                  disabled: false,
                },
                {
                  title: 'Invoice Extract',
                  desc: 'View AP and AR invoices from MOVEX DB2',
                  icon: '🧾',
                  path: '/invoices',
                  disabled: false,
                },
                {
                  title: 'Role Management',
                  desc: 'Manage RBAC permissions (Admin only)',
                  icon: '👥',
                  path: undefined,
                  disabled: !hasAdminRole,
                },
                {
                  title: 'Configuration',
                  desc: 'Manage endpoint registry (Admin only)',
                  icon: '⚙️',
                  path: undefined,
                  disabled: !hasAdminRole,
                },
                {
                  title: 'Audit Dashboard',
                  desc: 'View compliance and audit metrics',
                  icon: '📊',
                  path: undefined,
                  disabled: false,
                },
              ] as const).map((feature, i) => (
                <Card
                  key={i}
                  className={`transition-all duration-normal hover:shadow-md ${
                    feature.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary-200'
                  }`}
                >
                  <CardHeaderStrip
                    title={`${feature.icon} ${feature.title}`}
                  />
                  <CardBody className="space-y-md">
                    <Body className="text-text-weak">
                      {feature.desc}
                    </Body>
                    <Button
                      disabled={feature.disabled || !feature.path}
                      onClick={() => feature.path && navigate(feature.path)}
                      className="w-full transition-all duration-normal"
                    >
                      Access
                    </Button>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* User Info Section */}
        <section className="w-full px-md lg:px-lg pb-md md:pb-lg">
          <div className="max-w-7xl mx-auto">
            <H2 className="mb-md md:mb-lg">Your Profile</H2>
            <Card className="shadow-md">
              <CardHeaderStrip 
                title="Authentication Details"
              />
              <CardBody>
                <div className="space-y-lg">
                  <div className="grid md:grid-cols-2 gap-lg">
                    <div>
                      <Muted className="block text-xs uppercase tracking-wider mb-sm font-semibold">
                        Identity
                      </Muted>
                      <Body className="font-mono text-sm">{user.identity}</Body>
                    </div>
                    <div>
                      <Muted className="block text-xs uppercase tracking-wider mb-sm font-semibold">
                        Display Name
                      </Muted>
                      <Body>{user.displayName}</Body>
                    </div>
                    <div>
                      <Muted className="block text-xs uppercase tracking-wider mb-sm font-semibold">
                        Email
                      </Muted>
                      <Body>{user.email || <span className="italic text-text-weak">Not provided</span>}</Body>
                    </div>
                    <div>
                      <Muted className="block text-xs uppercase tracking-wider mb-sm font-semibold">
                        Auth Type
                      </Muted>
                      <Body className="font-semibold text-primary">{user.authType}</Body>
                    </div>
                  </div>
                  <div className="pt-md border-t border-outline">
                    <Muted className="block text-xs uppercase tracking-wider mb-md font-semibold">
                      Assigned Roles
                    </Muted>
                    <div className="flex flex-wrap gap-sm">
                      {user.roles.map(role => (
                        <span 
                          key={role}
                          className="px-md py-sm bg-primary-100 text-primary-700 rounded-md text-sm font-semibold shadow-sm border border-primary-200 transition-all duration-normal hover:bg-primary-200"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-surface border-t border-outline mt-auto w-full px-md lg:px-lg">
        <div className="max-w-7xl mx-auto py-md md:py-lg">
          <Caption className="text-text-weak text-xs md:text-sm">
            © {new Date().getFullYear()} SRX Manufacturing • Internal Portal • 
            <a href="#" className="text-primary hover:text-primary-700 underline ml-sm transition-colors duration-normal">Support</a>
          </Caption>
        </div>
      </footer>
    </div>
  );
}
