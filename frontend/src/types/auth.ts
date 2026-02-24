export interface UserContext {
  authenticated: boolean;
  identity: string; // "DOMAIN\username"
  displayName: string;
  email: string;
  roles: string[];
  authType: string;
}

export interface AuthContextType {
  user: UserContext | null;
  isLoading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}
