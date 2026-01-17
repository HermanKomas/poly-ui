import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Radio, Fish, LogOut, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, isLoading } = useAuth();

  const isWhaleBets = location.pathname === '/' || location.pathname === '/whale-bets';
  const isSignals = location.pathname === '/signals';

  const handleLogout = async () => {
    await logout();
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            {/* Logo/Title */}
            <Link to="/" className="flex items-center gap-2">
              <span className="text-xl">🐋</span>
              <span className="font-semibold text-lg">whaletracer.io</span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              {/* Whale Bets - first tab, always visible */}
              <Link
                to="/"
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                  isWhaleBets
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <Fish className="w-4 h-4" />
                Whale Bets
              </Link>

              {/* Signals - only visible when authenticated */}
              {isAuthenticated && (
                <Link
                  to="/signals"
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                    isSignals
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <Radio className="w-4 h-4" />
                  Signals
                </Link>
              )}
            </nav>
          </div>

          {/* Auth section */}
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="w-20 h-8 bg-muted animate-pulse rounded" />
            ) : isAuthenticated && user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {user.display_name || user.email}
                  </span>
                  {user.subscription_tier !== 'free' && (
                    <Badge variant="secondary" className="text-xs">
                      {user.subscription_tier.toUpperCase()}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="sr-only">Logout</span>
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogin}
                className="gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
