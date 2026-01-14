import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { Signal, Sport } from '@/types/signal';
import { getSignalWhalePositions, type ApiWhalePosition } from '@/lib/api';

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

const sportColors: Record<Sport, string> = {
  NBA: 'bg-orange-500',
  NHL: 'bg-blue-500',
  NFL: 'bg-green-500',
  CBB: 'bg-purple-500',
  CFB: 'bg-red-500',
};

interface SignalDetailModalProps {
  signal: Signal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatPrice(price: number): string {
  return `${(price * 100).toFixed(0)}¢`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

export function SignalDetailModal({ signal, open, onOpenChange }: SignalDetailModalProps) {
  // Fetch whale positions when modal opens
  const {
    data: whalePositionsData,
    isLoading: isLoadingPositions,
    refetch,
  } = useQuery({
    queryKey: ['whale-positions', signal?.id],
    queryFn: async () => {
      if (!signal?.id || USE_MOCK_DATA) {
        return { positions: [], count: 0 };
      }
      return getSignalWhalePositions(signal.id);
    },
    enabled: open && !!signal?.id && !USE_MOCK_DATA,
    staleTime: 60 * 1000, // 1 minute
  });

  // Refetch when modal opens
  useEffect(() => {
    if (open && signal?.id && !USE_MOCK_DATA) {
      refetch();
    }
  }, [open, signal?.id, refetch]);

  if (!signal) return null;

  const priceDiff = signal.pick.currentPrice - signal.pick.entryPrice;
  const priceDiffDisplay = priceDiff >= 0
    ? `+${(priceDiff * 100).toFixed(0)}¢`
    : `${(priceDiff * 100).toFixed(0)}¢`;

  const whalePositions = whalePositionsData?.positions || [];

  const [copied, setCopied] = useState(false);

  function formatSignalAsMarkdown(): string {
    const lines: string[] = [
      `# ${signal.marketTitle}`,
      `**${signal.sport} ${signal.betType}** | ${formatDateTime(signal.matchup.gameTime)}`,
      '',
      '## The Pick',
      `**${signal.pick.side}**`,
      `- Entry: ${formatPrice(signal.pick.entryPrice)}`,
      `- Current: ${formatPrice(signal.pick.currentPrice)} (${priceDiffDisplay})`,
      '',
      '## Signal Strength',
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Consensus | ${signal.signal.consensusPercent}% |`,
      `| Whale Count | ${signal.signal.whaleCount} traders |`,
      `| Total Volume | ${formatCurrency(signal.signal.totalVolume)} |`,
      `| Signal Score | ${signal.signal.signalScore.toFixed(2)}${signal.signal.tier ? ` (Tier ${signal.signal.tier})` : ''} |`,
      `| R/R Ratio | ${signal.signal.rrRatio.toFixed(2)}:1 |`,
      '',
    ];

    if (whalePositions.length > 0) {
      lines.push('## Whale Positions');
      lines.push('| Trader | Position | Entry |');
      lines.push('|--------|----------|-------|');
      for (const whale of whalePositions) {
        const name = whale.username || `${whale.trader_wallet.slice(0, 8)}...`;
        const rank = whale.rank ? ` #${whale.rank}` : '';
        lines.push(`| ${name}${rank} | ${formatCurrency(whale.current_value)} | ${formatPrice(whale.avg_price)} |`);
      }
      lines.push('');
    }

    lines.push('## Checklist');
    lines.push(`- ${signal.checklist.consensusPass ? '[x]' : '[ ]'} Consensus ≥80%`);
    lines.push(`- ${signal.checklist.traderCountPass ? '[x]' : '[ ]'} Traders ≥3`);
    lines.push(`- ${signal.checklist.priceCeilingPass ? '[x]' : '[ ]'} Price ≤55¢`);
    lines.push(`- ${signal.checklist.rrRatioPass ? '[x]' : '[ ]'} R/R ≥1.0:1`);
    lines.push(`- ${signal.checklist.noHedging ? '[x]' : '[ ]'} No hedging`);
    lines.push(`- ${signal.checklist.noEliteConflict ? '[x]' : '[ ]'} No elite conflicts`);
    lines.push('');
    lines.push(`[View on Polymarket](${signal.polymarketUrl})`);

    return lines.join('\n');
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(formatSignalAsMarkdown());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {signal.marketTitle}
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge className={`${sportColors[signal.sport]} text-white`}>
              {signal.sport} {signal.betType}
            </Badge>
            <span>{formatDateTime(signal.matchup.gameTime)}</span>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* The Pick */}
          <section>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">THE PICK</h4>
            <div className="bg-muted rounded-lg p-4">
              <p className="font-bold text-xl mb-1">{signal.pick.side}</p>
              <p className="text-sm">
                Entry: {formatPrice(signal.pick.entryPrice)} → Current: {formatPrice(signal.pick.currentPrice)}{' '}
                <span className={priceDiff >= 0 ? 'text-green-500' : 'text-red-500'}>
                  ({priceDiffDisplay})
                </span>
              </p>
            </div>
          </section>

          {/* Signal Strength */}
          <section>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">SIGNAL STRENGTH</h4>
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Consensus</span>
                <div className="flex items-center gap-2 flex-1 max-w-[200px] ml-4">
                  <Progress value={signal.signal.consensusPercent} className="h-2" />
                  <span className="font-mono text-sm w-10">{signal.signal.consensusPercent}%</span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span>Whale Count</span>
                <span className="font-mono">{signal.signal.whaleCount} traders</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Volume</span>
                <span className="font-mono">{formatCurrency(signal.signal.totalVolume)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Signal Score</span>
                <span className="font-mono">
                  {signal.signal.signalScore.toFixed(2)}
                  {signal.signal.tier && ` (Tier ${signal.signal.tier})`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>R/R Ratio</span>
                <span className="font-mono">
                  {signal.signal.rrRatio.toFixed(2)}:1{' '}
                  {signal.signal.rrRatio >= 1 ? '🟢' : '🔴'}
                </span>
              </div>
            </div>
          </section>

          {/* Whale Positions */}
          <section>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">WHALE POSITIONS</h4>
            <div className="bg-muted rounded-lg p-4 space-y-2">
              {isLoadingPositions ? (
                <p className="text-sm text-muted-foreground">Loading whale positions...</p>
              ) : whalePositions.length > 0 ? (
                whalePositions.map((whale: ApiWhalePosition) => (
                  <div key={whale.id || whale.trader_wallet} className="flex justify-between text-sm">
                    <span>
                      {whale.rank && whale.rank <= 10 ? '🐋' : '🦈'}{' '}
                      {whale.username || `${whale.trader_wallet.slice(0, 8)}...`}
                      {whale.rank && <span className="text-muted-foreground ml-1">#{whale.rank}</span>}
                    </span>
                    <span className="font-mono">
                      {formatCurrency(whale.current_value)} @ {formatPrice(whale.avg_price)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {USE_MOCK_DATA
                    ? 'Whale positions not available in mock mode'
                    : 'No whale positions linked yet. Run sync script to populate.'}
                </p>
              )}
            </div>
          </section>

          {/* Checklist */}
          <section>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">CHECKLIST</h4>
            <div className="space-y-1 text-sm">
              <div>{signal.checklist.consensusPass ? '✅' : '❌'} Consensus ≥80%</div>
              <div>{signal.checklist.traderCountPass ? '✅' : '❌'} Traders ≥3</div>
              <div>{signal.checklist.priceCeilingPass ? '✅' : '❌'} Price ≤55¢</div>
              <div>{signal.checklist.rrRatioPass ? '✅' : '❌'} R/R ≥1.0:1</div>
              <div>{signal.checklist.noHedging ? '✅' : '❌'} No hedging</div>
              <div>{signal.checklist.noEliteConflict ? '✅' : '❌'} No elite conflicts</div>
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button asChild className="flex-1">
              <a href={signal.polymarketUrl} target="_blank" rel="noopener noreferrer">
                View on Polymarket ↗
              </a>
            </Button>
            <Button variant="outline" onClick={handleCopy} className="px-3">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
