import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ApiGroupedWhaleBet } from '@/lib/api';

type Sport = 'NBA' | 'NHL' | 'NFL' | 'CBB' | 'CFB';

const sportColors: Record<Sport, string> = {
  NBA: 'bg-orange-500',
  NHL: 'bg-blue-500',
  NFL: 'bg-green-500',
  CBB: 'bg-purple-500',
  CFB: 'bg-red-500',
};

interface GroupedWhaleBetCardProps {
  group: ApiGroupedWhaleBet;
  onClick: () => void;
}

function formatVolume(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount.toFixed(0)}`;
}

// Extract line number from market_title and combine with outcome
// e.g., market_title: "Total Points: Over/Under 224.5", outcome: "Under" -> "Under 224.5"
function formatLineDisplay(outcome: string, marketTitle: string | null): string {
  if (!marketTitle) return outcome;

  // Try to extract the line number from market title
  // Common patterns: "Over/Under 224.5", "O/U 224.5", "224.5"
  const numberMatch = marketTitle.match(/(\d+\.?\d*)\s*(points?|pts?)?$/i)
    || marketTitle.match(/(?:over\/under|o\/u|ou)\s*(\d+\.?\d*)/i)
    || marketTitle.match(/(\d+\.?\d*)/);

  if (numberMatch && numberMatch[1]) {
    const lineNumber = numberMatch[1];
    // Return outcome + line number, e.g., "Under 224.5"
    return `${outcome} ${lineNumber}`;
  }

  // Fallback: if market_title is different from outcome, show market_title
  if (marketTitle.toLowerCase() !== outcome.toLowerCase()) {
    return marketTitle;
  }

  return outcome;
}

function formatGameTime(dateStr: string | null): string {
  if (!dateStr) return 'TBD';

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < -4) return 'Ended';
  if (diffHours < 0) return 'In Progress';

  if (diffHours < 24) {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } else {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }
}

export function GroupedWhaleBetCard({ group, onClick }: GroupedWhaleBetCardProps) {
  const sport = group.sport as Sport | null;
  const isEnded = group.event_date && new Date(group.event_date).getTime() < Date.now() - 4 * 60 * 60 * 1000;

  // Use winning_direction for display
  const winning = group.winning_direction;
  const losing = group.losing_direction;

  // Format direction for display
  const directionDisplay = winning.direction.toUpperCase();
  const isOver = directionDisplay === 'OVER';
  const isUnder = directionDisplay === 'UNDER';

  return (
    <Card
      className={`cursor-pointer transition-shadow hover:shadow-lg ${isEnded ? 'opacity-60' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        {/* Header row: sport badge + unique whale count */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            {sport && (
              <Badge className={`${sportColors[sport]} text-white text-xs`}>
                {sport}
              </Badge>
            )}
            {group.bet_type && (
              <Badge variant="outline" className="text-xs">
                {group.bet_type}
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="inline-block w-4 h-4 text-center">🐋</span>
            {winning.unique_whale_count} whale{winning.unique_whale_count !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Event title */}
        <h3 className="font-semibold text-sm leading-tight mb-1 line-clamp-1">
          {group.event_title || group.event_slug || 'Unknown Event'}
        </h3>

        {/* Direction badge with consensus */}
        <div className="flex items-center gap-2 mb-2">
          <Badge
            variant="secondary"
            className={`${
              isOver
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                : isUnder
                ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
            }`}
          >
            {directionDisplay}
          </Badge>
          <span className="text-sm font-medium">
            {group.combined_consensus_pct.toFixed(0)}% consensus
          </span>
          {/* Show losing direction indicator if whales exist on opposite side */}
          {losing && losing.unique_whale_count > 0 && (
            <span className="text-xs text-muted-foreground">
              vs {losing.unique_whale_count} {losing.direction}
            </span>
          )}
        </div>

        {/* Primary line info */}
        {winning.primary_line && (
          <div className="text-xs text-muted-foreground mb-2">
            <span className="font-medium text-foreground">
              {formatLineDisplay(winning.primary_line.outcome, winning.primary_line.market_title)}
            </span>
            <span className="mx-1">·</span>
            <span>{winning.primary_line.whale_count} whales</span>
            <span className="mx-1">·</span>
            <span>{formatVolume(winning.primary_line.volume)}</span>
          </div>
        )}

        {/* Lines count and game time */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {winning.line_count} line{winning.line_count !== 1 ? 's' : ''}
            <span className="mx-1">·</span>
            {formatVolume(winning.total_volume)} total
          </span>
          <span className="text-muted-foreground">
            {formatGameTime(group.event_date)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
