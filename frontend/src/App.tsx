// src/App.tsx
// Implements: architecture/ui-ux-best-practices
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import SignIn from './components/SignIn';
import WelcomePage from './components/WelcomePage';
import ComponentShowcase from './components/ComponentShowcase';

export default function App() {
  const { user, isLoading } = useAuth();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Public routes (no auth required)
  if (!user?.authenticated) {
    return <SignIn />;
  }

  // Protected routes (auth required)
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/components" element={<ComponentShowcase />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
