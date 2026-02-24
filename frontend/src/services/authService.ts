import { UserContext } from '@/types/auth';

const API_BASE = (import.meta as any).env.VITE_API_URL || 'http://localhost:5050';

export interface AuthResponse {
  authenticated: boolean;
  identity: string;
  claims: Array<{ type: string; value: string }>;
  authType: string;
}

class AuthService {
  /**
   * Test AD authentication via backend.
   * Windows Auth is handled by backend; this verifies the user session.
   */
  async testAuthentication(): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE}/api/auth/test`, {
        method: 'GET',
        credentials: 'include', // Include Windows Auth cookies
      });

      if (!res.ok) {
        throw new Error(`Authentication failed: ${res.status} ${res.statusText}`);
      }

      return await res.json();
    } catch (err) {
      console.error('[AuthService] Authentication error:', err);
      throw err;
    }
  }

  /**
   * Sign out by clearing session (backend handles cookie expiration).
   */
  async signOut(): Promise<void> {
    try {
      // Optional: Call backend sign-out endpoint if needed
      // await fetch(`${API_BASE}/api/auth/signout`, { credentials: 'include' });
      
      // Clear local storage
      sessionStorage.removeItem('user');
    } catch (err) {
      console.error('[AuthService] Sign out error:', err);
    }
  }

  /**
   * Parse claims to extract user info and roles.
   */
  parseUserContext(response: AuthResponse): UserContext {
    const roles = response.claims
      .filter(c => c.type.includes('role') || c.type === 'groups')
      .map(c => c.value);

    const email = response.claims.find(c => c.type.includes('email'))?.value || '';
    const displayName = response.claims.find(c => c.type.includes('name'))?.value || 
                       response.identity.split('\\')[1] || // Extract username from DOMAIN\username
                       'User';

    return {
      authenticated: response.authenticated,
      identity: response.identity,
      displayName,
      email,
      roles,
      authType: response.authType,
    };
  }
}

export default new AuthService();
