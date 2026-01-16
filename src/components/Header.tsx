import { Link, useLocation } from 'react-router-dom';
import { Radio, Fish } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Header() {
  const location = useLocation();
  const isSignals = location.pathname === '/';
  const isWhalePlays = location.pathname === '/whale-plays';

  return (
    <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="px-4 py-3">
        <div className="flex items-center gap-6">
          {/* Logo/Title */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl">🐋</span>
            <span className="font-semibold text-lg">whaletracer.io</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            <Link
              to="/"
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
            <Link
              to="/whale-plays"
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                isWhalePlays
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Fish className="w-4 h-4" />
              Whale Plays
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
