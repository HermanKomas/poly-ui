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

export function SignalCard({ signal, onClick }: SignalCardProps) {
  const tierKey = signal.signal.tier ?? 'excluded';
  const isExcluded = signal.signal.tier === null;

  return (
    <Card
      className={`cursor-pointer transition-shadow hover:shadow-lg ${tierBorderColors[tierKey]} ${isExcluded ? 'bg-muted' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge className={`${sportColors[signal.sport]} text-white text-xs`}>
            {signal.sport} {signal.betType}
          </Badge>
        </div>

        <h3 className="font-semibold text-lg mb-1">
          {signal.marketTitle}
        </h3>
        <p className="text-muted-foreground mb-3">{signal.pick.side}</p>

        <div className="text-sm text-muted-foreground mb-3">
          {signal.signal.consensusPercent}% consensus · {signal.signal.whaleCount} whales
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {signal.signal.tier && (
              <Badge
                variant={signal.signal.tier === 1 ? 'default' : 'secondary'}
                className={signal.signal.tier === 1 ? 'bg-green-500' : 'bg-yellow-500'}
              >
                Tier {signal.signal.tier}
              </Badge>
            )}
          </div>
          <span className="font-mono">Entry: {(signal.pick.entryPrice * 100).toFixed(0)}¢</span>
        </div>

        <div className="mt-2 text-sm text-muted-foreground">
          R/R: {signal.signal.rrRatio.toFixed(2)}:1
        </div>
      </CardContent>
    </Card>
  );
}
