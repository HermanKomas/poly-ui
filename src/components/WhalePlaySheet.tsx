import { Copy, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { ApiWhalePlay, ApiWhalePlayOutcome } from '@/lib/api';

type Sport = 'NBA' | 'NHL' | 'NFL' | 'CBB' | 'CFB';

const sportColors: Record<Sport, string> = {
  NBA: 'bg-orange-500',
  NHL: 'bg-blue-500',
  NFL: 'bg-green-500',
  CBB: 'bg-purple-500',
  CFB: 'bg-red-500',
};

interface WhalePlaySheetProps {
  play: ApiWhalePlay | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return 'TBD';

  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPrice(price: number): string {
  return `${(price * 100).toFixed(0)}¢`;
}

function OutcomeCard({ outcome, isPrimary }: { outcome: ApiWhalePlayOutcome; isPrimary: boolean }) {
  return (
    <Card className={`${isPrimary ? 'border-emerald-500/30' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isPrimary && <span className="text-emerald-500">→</span>}
            <span className={`font-semibold ${isPrimary ? 'text-emerald-600' : ''}`}>
              {outcome.outcome}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {outcome.whale_count} whale{outcome.whale_count !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm mb-4">
          <div>
            <span className="text-muted-foreground">Total Volume:</span>
            <span className="ml-1 font-semibold">{formatCurrency(outcome.total_volume)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Avg Entry:</span>
            <span className="ml-1 font-semibold">{formatPrice(outcome.avg_entry)}</span>
          </div>
        </div>

        {/* Individual positions */}
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Individual Positions ({outcome.positions.length})
          </h5>
          {outcome.positions.map((pos, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span>🐋</span>
                <span className="font-mono text-muted-foreground">
                  {pos.username || `${pos.trader_wallet.slice(0, 10)}...`}
                </span>
                {pos.rank && (
                  <span className="text-xs text-muted-foreground">#{pos.rank}</span>
                )}
              </div>
              <span className="font-medium">
                {formatCurrency(pos.current_value)} @ {formatPrice(pos.avg_price)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function WhalePlaySheet({ play, open, onOpenChange }: WhalePlaySheetProps) {
  const [copied, setCopied] = useState(false);

  if (!play) return null;

  const sport = play.sport as Sport | null;

  // Build title: "Bet Type: Market Title" or just market title
  const sheetTitle = play.bet_type && play.market_title
    ? `${play.bet_type}: ${play.market_title}`
    : play.market_title || play.event_title || 'Unknown Market';

  async function handleCopy() {
    if (!play) return;

    const lines = [
      `# ${play.event_title || play.market_title}`,
      `**${play.sport} ${play.bet_type}** | ${formatDateTime(play.event_date)}`,
      '',
      '## Whale Positions',
    ];

    for (const outcome of play.outcomes) {
      lines.push(`### ${outcome.outcome}`);
      lines.push(`${outcome.whale_count} whales | ${formatCurrency(outcome.total_volume)} | Avg Entry: ${formatPrice(outcome.avg_entry)}`);
      for (const pos of outcome.positions) {
        const name = pos.username || `${pos.trader_wallet.slice(0, 10)}...`;
        lines.push(`- ${name}${pos.rank ? ` #${pos.rank}` : ''}: ${formatCurrency(pos.current_value)} @ ${formatPrice(pos.avg_price)}`);
      }
      lines.push('');
    }

    if (play.polymarket_url) {
      lines.push(`[View on Polymarket](${play.polymarket_url})`);
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        <div className="p-6">
          <SheetHeader className="space-y-3 text-left">
            <SheetTitle className="text-xl pr-8">
              {sheetTitle}
            </SheetTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {sport && (
                <Badge className={`${sportColors[sport]} text-white`}>
                  {sport}
                </Badge>
              )}
              {play.bet_type && (
                <Badge variant="outline">{play.bet_type.toLowerCase()}</Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {formatDateTime(play.event_date)}
              </span>
            </div>
          </SheetHeader>

          <div className="mt-8 space-y-6">
            {/* Summary stats */}
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Whales:</span>
                <span className="ml-1 font-semibold">{play.total_whale_count}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Volume:</span>
                <span className="ml-1 font-semibold">{formatCurrency(play.total_volume)}</span>
              </div>
            </div>

            {/* Whale Consensus */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Whale Consensus
              </h4>
              <div className="space-y-3">
                {play.outcomes.map((outcome, idx) => (
                  <OutcomeCard
                    key={outcome.outcome}
                    outcome={outcome}
                    isPrimary={idx === 0}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Fixed bottom actions */}
        <div className="sticky bottom-0 bg-background border-t p-4">
          <div className="flex items-center gap-2">
            {play.polymarket_url && (
              <Button asChild className="flex-1">
                <a href={play.polymarket_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on Polymarket
                </a>
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
