import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeaderStrip, CardBody } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { H1, Body, Caption, Code } from '@/components/ui/typography';

export default function SignIn() {
  const { signIn, isLoading, error } = useAuth();
  const [localError, setLocalError] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    
    try {
      await signIn();
      // Navigation to welcome page handled by App component
    } catch (err: any) {
      setLocalError(err.message || 'Sign-in failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200 flex items-center justify-center px-sm py-md md:py-lg">
      <div className="w-full max-w-md animate-fadeIn">
        {/* Logo/Header */}
        <div className="text-center mb-lg md:mb-xl">
          <H1 className="text-primary m-0 mb-sm tracking-tight font-bold text-3xl md:text-4xl">
            SM-Portal
          </H1>
          <Body className="text-text-weak opacity-90 text-sm md:text-base">
            Secure access to M3 endpoints
          </Body>
        </div>

        {/* Sign In Card */}
        <Card className="shadow-lg border border-primary-200 bg-bg">
          <CardHeaderStrip 
            title="Windows Authentication"
          />
          <CardBody className="space-y-md">
            <form onSubmit={handleSignIn} className="space-y-md">
              <Alert 
                kind="info" 
                title="ℹ️ How it works"
              >
                This portal uses <strong>Windows Active Directory</strong> for authentication. 
                Click <strong>Sign In</strong> to authenticate with your AD credentials.
              </Alert>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary-700 text-white font-semibold py-sm px-md rounded-md transition-all duration-normal shadow-md hover:shadow-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-xs">
                    <span className="animate-spin">⏳</span>
                    <span className="hidden sm:inline">Signing in...</span>
                    <span className="sm:hidden">Signing...</span>
                  </span>
                ) : (
                  <>
                    <span className="hidden sm:inline">Sign In with Windows AD</span>
                    <span className="sm:hidden">Sign In</span>
                  </>
                )}
              </Button>

              {(error || localError) && (
                <Alert 
                  kind="danger" 
                  title="❌ Authentication Failed"
                >
                  {error || localError}
                </Alert>
              )}

              <div className="pt-md border-t border-outline space-y-sm">
                <Caption className="text-xs flex gap-sm items-start text-text-weak">
                  <span className="text-sm flex-shrink-0">💡</span>
                  <span>
                    Make sure you're connected to the <strong>corporate network</strong> or <strong>VPN</strong> 
                    for Windows AD authentication to work.
                  </span>
                </Caption>
                <Caption className="text-xs flex gap-sm items-start text-text-weak">
                  <span className="text-sm">🔒</span>
                  <span>
                    Your authentication is handled securely by the backend 
                    using <strong>Negotiate</strong> (Kerberos/NTLM).
                  </span>
                </Caption>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Support Footer */}
        <div className="mt-lg text-center">
          <Caption className="text-text-weak">
            Need help? Contact <Code className="text-error">support@srx.com</Code>
          </Caption>
        </div>
      </div>
    </div>
  );
}
