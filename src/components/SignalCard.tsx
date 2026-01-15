import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Signal, Sport } from '@/types/signal';

const sportColors: Record<Sport, string> = {
  NBA: 'bg-orange-500',
  NHL: 'bg-blue-500',
  NFL: 'bg-green-500',
  CBB: 'bg-purple-500',
  CFB: 'bg-red-500',
};

const tierBorderColors: Record<1 | 2 | 'excluded', string> = {
  1: 'border-l-4 border-l-green-500',
  2: 'border-l-4 border-l-yellow-500',
  excluded: 'border-l-4 border-l-neutral-400 opacity-60',
};

interface SignalCardProps {
  signal: Signal;
  onClick: () => void;
}

function formatVolume(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount.toFixed(0)}`;
}

function formatStake(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount.toFixed(0)}`;
}

function formatGameTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 0) {
    return 'Started';
  } else if (diffHours < 24) {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } else {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  }
}

export function SignalCard({ signal, onClick }: SignalCardProps) {
  const tierKey = signal.signal.tier ?? 'excluded';
  const isExcluded = signal.signal.tier === null;
  const hasPosition = signal.myPosition !== null;

  return (
    <Card
      className={`cursor-pointer transition-shadow hover:shadow-lg ${tierBorderColors[tierKey]} ${isExcluded ? 'bg-muted' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        {/* Header row: sport badge + position indicator + game time */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Badge className={`${sportColors[signal.sport]} text-white text-xs`}>
              {signal.sport}
            </Badge>
            {hasPosition && (
              <span
                className="text-xs bg-blue-500/20 text-blue-500 px-1.5 py-0.5 rounded font-medium"
                title={`Your position: ${signal.myPosition!.side} (${formatStake(signal.myPosition!.stake)})`}
              >
                {formatStake(signal.myPosition!.stake)}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {formatGameTime(signal.matchup.gameTime)}
          </span>
        </div>

        {/* Title and pick */}
        <h3 className="font-semibold text-sm leading-tight mb-0.5 line-clamp-2">
          {signal.marketTitle}
        </h3>
        <p className="text-sm text-muted-foreground mb-2">{signal.pick.side}</p>

        {/* Stats row */}
        <div className="text-xs text-muted-foreground mb-2">
          {signal.signal.consensusPercent}% · {signal.signal.whaleCount} whales · {formatVolume(signal.signal.totalVolume)}
        </div>

        {/* Bottom row: tier + entry price */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            {signal.signal.tier && (
              <Badge
                variant={signal.signal.tier === 1 ? 'default' : 'secondary'}
                className={`text-xs px-1.5 py-0 ${signal.signal.tier === 1 ? 'bg-green-500' : 'bg-yellow-500'}`}
              >
                Tier {signal.signal.tier}
              </Badge>
            )}
            <span className="text-muted-foreground">
              R/R {signal.signal.rrRatio.toFixed(1)}:1
            </span>
          </div>
          <span className="font-mono">{(signal.pick.entryPrice * 100).toFixed(0)}¢</span>
        </div>
      </CardContent>
    </Card>
  );
}
