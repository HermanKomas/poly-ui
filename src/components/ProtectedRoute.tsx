/**
 * Protected Route Component
 *
 * Wraps routes that require authentication.
 * Redirects to login if user is not authenticated.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If true, requires pro or enterprise subscription */
  requirePro?: boolean;
}

export function ProtectedRoute({ children, requirePro = false }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show nothing while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check pro tier requirement
  if (requirePro && user && !['pro', 'enterprise'].includes(user.subscription_tier)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Pro Feature</h1>
          <p className="text-muted-foreground mb-4">
            This feature requires a Pro subscription.
          </p>
          <p className="text-sm text-muted-foreground">
            Upgrade to Pro for $20/month to unlock all features.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
