import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ApiWhalePlay } from '@/lib/api';

type Sport = 'NBA' | 'NHL' | 'NFL' | 'CBB' | 'CFB';

const sportColors: Record<Sport, string> = {
  NBA: 'bg-orange-500',
  NHL: 'bg-blue-500',
  NFL: 'bg-green-500',
  CBB: 'bg-purple-500',
  CFB: 'bg-red-500',
};

interface WhalePlayCardProps {
  play: ApiWhalePlay;
  onClick: () => void;
}

function formatVolume(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount.toFixed(0)}`;
}

type GameStatus = 'future' | 'in_progress' | 'ended';

function getGameStatus(dateStr: string | null, apiStatus: string): GameStatus {
  // Use API status if it says ended
  if (apiStatus === 'ended') return 'ended';

  if (!dateStr) return 'future';

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  // Game started more than 4 hours ago = ended
  if (diffHours < -4) {
    return 'ended';
  }
  // Game started within last 4 hours = in progress
  if (diffHours < 0) {
    return 'in_progress';
  }
  // Game is in the future
  return 'future';
}

function formatGameTime(dateStr: string | null, status: GameStatus): string {
  if (status === 'ended') return 'Ended';
  if (status === 'in_progress') return 'In Progress';

  if (!dateStr) return 'TBD';

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
    // Game within 24 hours - show time
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } else {
    // Game more than 24 hours away - show date and time
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }
}

export function WhalePlayCard({ play, onClick }: WhalePlayCardProps) {
  const sport = play.sport as Sport | null;
  const dominantOutcome = play.outcomes[0]; // Already sorted by volume
  const gameStatus = getGameStatus(play.event_date, play.status);
  const isEnded = gameStatus === 'ended';
  const isInProgress = gameStatus === 'in_progress';

  return (
    <Card
      className={`cursor-pointer transition-shadow hover:shadow-lg ${isEnded ? 'opacity-60' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        {/* Header row: sport badge + whale count + game time */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            {sport && (
              <Badge className={`${sportColors[sport]} text-white text-xs`}>
                {sport}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="inline-block w-4 h-4 text-center">🐋</span>
              {play.total_whale_count} whale{play.total_whale_count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Event title */}
        <h3 className="font-semibold text-sm leading-tight mb-0.5 line-clamp-1">
          {play.event_title || play.market_title || 'Unknown Market'}
        </h3>

        {/* Bet type */}
        <p className="text-xs text-muted-foreground mb-2">
          {play.bet_type || 'Unknown'}
        </p>

        {/* Dominant outcome */}
        {dominantOutcome && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">
              <span className="text-muted-foreground">→</span>{' '}
              <span className="font-medium">{dominantOutcome.outcome}</span>
            </span>
          </div>
        )}

        {/* Volume and game time */}
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono font-medium">
            {formatVolume(play.total_volume)}
            <span className="text-muted-foreground ml-1">total volume</span>
          </span>
          <span className={`flex items-center gap-1.5 ${isInProgress ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
            {isInProgress && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            )}
            {formatGameTime(play.event_date, gameStatus)}
          </span>
        </div>

        {/* Avg entry if available */}
        {dominantOutcome && (
          <div className="text-xs mt-1 text-muted-foreground">
            <span>Avg Entry: {(dominantOutcome.avg_entry * 100).toFixed(0)}¢</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
