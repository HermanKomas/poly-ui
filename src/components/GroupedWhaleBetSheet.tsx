import { Copy, Check, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import type { ApiGroupedWhaleBet, ApiGroupedLine } from '@/lib/api';

type Sport = 'NBA' | 'NHL' | 'NFL' | 'CBB' | 'CFB';

const sportColors: Record<Sport, string> = {
  NBA: 'bg-orange-500',
  NHL: 'bg-blue-500',
  NFL: 'bg-green-500',
  CBB: 'bg-purple-500',
  CFB: 'bg-red-500',
};

interface GroupedWhaleBetSheetProps {
  group: ApiGroupedWhaleBet | null;
  // For showing both directions, we need the opposite direction group too
  oppositeGroup?: ApiGroupedWhaleBet | null;
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

interface LineCardProps {
  line: ApiGroupedLine;
  isPrimary: boolean;
  defaultExpanded?: boolean;
}

function LineCard({ line, isPrimary, defaultExpanded = false }: LineCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Extract the line display - combine outcome with line number from market_title
  const lineDisplay = formatLineDisplay(line.outcome, line.market_title);

  return (
    <Card className={isPrimary ? 'border-emerald-500/30' : ''}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isPrimary && (
              <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 shrink-0">
                Primary
              </Badge>
            )}
            <span className={`font-medium truncate ${isPrimary ? 'text-emerald-600' : ''}`} title={lineDisplay}>
              {lineDisplay}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {line.whale_count} whale{line.whale_count !== 1 ? 's' : ''}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm mt-2">
          <div>
            <span className="text-muted-foreground">Volume:</span>
            <span className="ml-1 font-medium">{formatCurrency(line.volume)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Avg Entry:</span>
            <span className="ml-1 font-medium">{formatPrice(line.avg_entry)}</span>
          </div>
        </div>

        {/* Expandable whale list */}
        {expanded && line.whales && line.whales.length > 0 && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Positions ({line.whales.length})
            </h5>
            {line.whales.map((whale, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span>🐋</span>
                  <span className="font-mono text-muted-foreground">
                    {whale.username || `${whale.trader_wallet.slice(0, 10)}...`}
                  </span>
                  {whale.rank && (
                    <span className="text-xs text-muted-foreground">#{whale.rank}</span>
                  )}
                  {whale.is_hedging && (
                    <Badge variant="outline" className="text-xs">Hedging</Badge>
                  )}
                </div>
                <span className="font-medium">
                  {formatCurrency(whale.size * whale.avg_price)} @ {formatPrice(whale.avg_price)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function GroupedWhaleBetSheet({
  group,
  oppositeGroup,
  open,
  onOpenChange,
}: GroupedWhaleBetSheetProps) {
  const [copied, setCopied] = useState(false);

  if (!group) return null;

  const sport = group.sport as Sport | null;
  const sheetTitle = `${group.event_title || group.event_slug} - ${group.bet_type || 'Market'}`;

  // Determine if this is a totals market (Over/Under tabs) or spread/moneyline (team name tabs)
  const isTotals = group.bet_type?.toLowerCase() === 'total' || group.bet_type?.toLowerCase() === 'totals';

  async function handleCopy() {
    if (!group) return;

    const lines = [
      `# ${group.event_title || group.event_slug}`,
      `**${group.sport} ${group.bet_type}** | ${formatDateTime(group.event_date)}`,
      '',
      `## ${group.direction.toUpperCase()} (${group.unique_whale_count} whales, ${group.combined_consensus_pct}% consensus)`,
      '',
    ];

    // Add primary line
    if (group.primary_line) {
      lines.push(`### Primary: ${group.primary_line.outcome}`);
      lines.push(`${group.primary_line.whale_count} whales | ${formatCurrency(group.primary_line.volume)} | Avg: ${formatPrice(group.primary_line.avg_entry)}`);
      lines.push('');
    }

    // Add other lines
    for (const line of group.other_lines) {
      lines.push(`### ${line.outcome}`);
      lines.push(`${line.whale_count} whales | ${formatCurrency(line.volume)} | Avg: ${formatPrice(line.avg_entry)}`);
      lines.push('');
    }

    if (group.primary_line?.polymarket_url) {
      lines.push(`[View on Polymarket](${group.primary_line.polymarket_url})`);
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  // All lines for the current direction
  const allLines = group.primary_line
    ? [group.primary_line, ...group.other_lines]
    : group.other_lines;

  // All lines for the opposite direction (if available)
  const oppositeLines = oppositeGroup?.primary_line
    ? [oppositeGroup.primary_line, ...oppositeGroup.other_lines]
    : oppositeGroup?.other_lines || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        <div className="p-6">
          <SheetHeader className="space-y-3 text-left">
            <SheetTitle className="text-xl pr-8">{sheetTitle}</SheetTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {sport && (
                <Badge className={`${sportColors[sport]} text-white`}>
                  {sport}
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {formatDateTime(group.event_date)}
              </span>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Overall Direction Banner */}
            <div className="rounded-lg border p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  OVERALL DIRECTION
                </span>
                <Badge
                  variant="secondary"
                  className={`${
                    group.direction.toLowerCase() === 'over'
                      ? 'bg-emerald-100 text-emerald-700'
                      : group.direction.toLowerCase() === 'under'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {group.direction.toUpperCase()}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground mb-3">
                {group.unique_whale_count} whales · {formatCurrency(group.total_volume)} volume · {group.combined_consensus_pct.toFixed(0)}% consensus
              </div>
              <Progress value={group.combined_consensus_pct} className="h-2" />
            </div>

            {/* Tabs for directions */}
            <Tabs defaultValue={group.direction} className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value={group.direction} className="text-sm">
                  {isTotals ? group.direction.toUpperCase() : group.direction}
                  <span className="ml-1 text-muted-foreground">({group.unique_whale_count})</span>
                </TabsTrigger>
                {oppositeGroup ? (
                  <TabsTrigger value={oppositeGroup.direction} className="text-sm">
                    {isTotals ? oppositeGroup.direction.toUpperCase() : oppositeGroup.direction}
                    <span className="ml-1 text-muted-foreground">({oppositeGroup.unique_whale_count})</span>
                  </TabsTrigger>
                ) : (
                  <TabsTrigger value="opposite" disabled className="text-sm opacity-50">
                    {isTotals ? (group.direction.toLowerCase() === 'over' ? 'UNDER' : 'OVER') : 'Other'}
                    <span className="ml-1">(0)</span>
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Current direction tab content */}
              <TabsContent value={group.direction} className="mt-4 space-y-3">
                {allLines.map((line, idx) => (
                  <LineCard
                    key={line.condition_id}
                    line={line}
                    isPrimary={idx === 0}
                    defaultExpanded={idx === 0}
                  />
                ))}
              </TabsContent>

              {/* Opposite direction tab content */}
              {oppositeGroup && (
                <TabsContent value={oppositeGroup.direction} className="mt-4 space-y-3">
                  {oppositeLines.map((line, idx) => (
                    <LineCard
                      key={line.condition_id}
                      line={line}
                      isPrimary={idx === 0}
                      defaultExpanded={idx === 0}
                    />
                  ))}
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>

        {/* Fixed bottom actions */}
        <div className="sticky bottom-0 bg-background border-t p-4">
          <div className="flex items-center gap-2">
            {group.primary_line?.polymarket_url && (
              <Button asChild className="flex-1">
                <a
                  href={group.primary_line.polymarket_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
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
