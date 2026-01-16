import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, Check, BookOpen, RefreshCw, AlertTriangle, Save, Loader2, Pencil, ExternalLink } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import type { Signal, Sport } from '@/types/signal';
import {
  getSignalWhalePositions,
  getSignalJournal,
  createSignalJournal,
  updateSignalJournalNotes,
  refreshSignalJournal,
  type ApiWhalePosition,
  type ApiJournalEntry,
} from '@/lib/api';

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

const sportColors: Record<Sport, string> = {
  NBA: 'bg-orange-500',
  NHL: 'bg-blue-500',
  NFL: 'bg-green-500',
  CBB: 'bg-purple-500',
  CFB: 'bg-red-500',
};

interface SignalDetailSheetProps {
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
  }).format(date);
}

export function SignalDetailSheet({ signal, open, onOpenChange }: SignalDetailSheetProps) {
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
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (open && signal?.id && !USE_MOCK_DATA) {
      refetch();
    }
  }, [open, signal?.id, refetch]);

  const [copied, setCopied] = useState(false);

  // Journal state
  const [journalMode, setJournalMode] = useState<'hidden' | 'loading' | 'form' | 'display'>('hidden');
  const [journalEntry, setJournalEntry] = useState<ApiJournalEntry | null>(null);
  const [journalNotes, setJournalNotes] = useState('');
  const [journalError, setJournalError] = useState<string | null>(null);
  const [notesExpanded, setNotesExpanded] = useState(false);

  const queryClient = useQueryClient();

  const { data: existingJournal, isLoading: isCheckingJournal } = useQuery({
    queryKey: ['journal', signal?.id],
    queryFn: async () => {
      if (!signal?.id || USE_MOCK_DATA) return null;
      try {
        return await getSignalJournal(signal.id);
      } catch {
        return null;
      }
    },
    enabled: open && !!signal?.id && !USE_MOCK_DATA,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (existingJournal) {
      setJournalEntry(existingJournal);
      setJournalNotes(existingJournal.thesis || '');
      setJournalMode('display');
    } else if (!isCheckingJournal && open) {
      setJournalMode('hidden');
      setJournalEntry(null);
      setJournalNotes('');
    }
  }, [existingJournal, isCheckingJournal, open]);

  useEffect(() => {
    if (!open) {
      setJournalMode('hidden');
      setJournalEntry(null);
      setJournalNotes('');
      setJournalError(null);
      setNotesExpanded(false);
    }
  }, [open]);

  const createJournalMutation = useMutation({
    mutationFn: async () => {
      if (!signal?.id) throw new Error('No signal');
      return createSignalJournal(signal.id, journalNotes || undefined);
    },
    onSuccess: (data) => {
      setJournalEntry(data);
      setJournalMode('display');
      setJournalError(null);
      queryClient.invalidateQueries({ queryKey: ['journal', signal?.id] });
    },
    onError: (error: Error) => {
      setJournalError(error.message);
      setJournalMode('form');
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async () => {
      if (!signal?.id) throw new Error('No signal');
      return updateSignalJournalNotes(signal.id, journalNotes);
    },
    onSuccess: (data) => {
      setJournalEntry(data);
      setJournalError(null);
      setNotesExpanded(false);
      toast.success('Note saved');
    },
    onError: (error: Error) => {
      setJournalError(error.message);
      toast.error('Failed to save note');
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      if (!signal?.id) throw new Error('No signal');
      return refreshSignalJournal(signal.id);
    },
    onSuccess: (data) => {
      setJournalEntry(data);
      setJournalNotes(data.thesis || '');
      setJournalError(null);
    },
    onError: (error: Error) => {
      setJournalError(error.message);
    },
  });

  function handleJournalClick() {
    if (journalMode === 'hidden') {
      setJournalMode('loading');
      setJournalError(null);
      createJournalMutation.mutate();
    }
  }

  function getStatusDisplay(status: string): { emoji: string; label: string; color: string } {
    switch (status) {
      case 'won':
        return { emoji: '✅', label: 'Won', color: 'text-green-500' };
      case 'lost':
        return { emoji: '❌', label: 'Lost', color: 'text-red-500' };
      case 'sold':
        return { emoji: '💰', label: 'Sold', color: 'text-yellow-500' };
      case 'open':
      default:
        return { emoji: '⏳', label: 'Open', color: 'text-blue-500' };
    }
  }

  if (!signal) return null;

  const priceDiff = signal.pick.currentPrice - signal.pick.entryPrice;
  const priceDiffDisplay = priceDiff >= 0
    ? `+${(priceDiff * 100).toFixed(0)}¢`
    : `${(priceDiff * 100).toFixed(0)}¢`;

  const whalePositions = whalePositionsData?.positions || [];

  const positionsByOutcome = whalePositions.reduce((acc, pos) => {
    const outcome = pos.outcome;
    if (!acc[outcome]) {
      acc[outcome] = [];
    }
    acc[outcome].push(pos);
    return acc;
  }, {} as Record<string, ApiWhalePosition[]>);

  const pickSide = signal.pick.side;
  const outcomes = Object.keys(positionsByOutcome).sort((a, b) => {
    if (a === pickSide) return -1;
    if (b === pickSide) return 1;
    return a.localeCompare(b);
  });

  function getSideTotals(positions: ApiWhalePosition[]) {
    return {
      count: positions.length,
      volume: positions.reduce((sum, p) => sum + p.current_value, 0),
    };
  }

  const actualConsensus = (() => {
    if (whalePositions.length === 0) return null;
    const pickPositions = positionsByOutcome[pickSide] || [];
    const pickVolume = pickPositions.reduce((sum, p) => sum + p.current_value, 0);
    const totalVolume = whalePositions.reduce((sum, p) => sum + p.current_value, 0);
    if (totalVolume === 0) return null;
    return Math.round((pickVolume / totalVolume) * 100);
  })();

  const displayConsensus = actualConsensus ?? signal.signal.consensusPercent;

  async function handleCopy() {
    try {
      const lines = [
        `# ${signal!.marketTitle}`,
        `**${signal!.sport} ${signal!.betType}** | ${formatDateTime(signal!.matchup.gameTime)}`,
        '',
        '## The Pick',
        `**${signal!.pick.side}**`,
        `- Entry: ${formatPrice(signal!.pick.entryPrice)}`,
        `- Current: ${formatPrice(signal!.pick.currentPrice)} (${priceDiffDisplay})`,
        '',
        '## Signal Strength',
        `- Consensus: ${displayConsensus}%`,
        `- Whale Count: ${signal!.signal.whaleCount} traders`,
        `- Total Volume: ${formatCurrency(signal!.signal.totalVolume)}`,
        `- Signal Score: ${signal!.signal.signalScore.toFixed(2)}${signal!.signal.tier ? ` (Tier ${signal!.signal.tier})` : ''}`,
        `- R/R Ratio: ${signal!.signal.rrRatio.toFixed(2)}:1`,
        '',
      ];

      // Add whale positions if available
      if (outcomes.length > 0) {
        lines.push('## Whale Positions');
        for (const outcome of outcomes) {
          const positions = positionsByOutcome[outcome];
          const totals = getSideTotals(positions);
          const isPick = outcome === pickSide;
          lines.push(`### ${isPick ? '→ ' : ''}${outcome}`);
          lines.push(`${totals.count} traders · ${formatCurrency(totals.volume)}`);
          for (const whale of positions) {
            const name = whale.username || `${whale.trader_wallet.slice(0, 10)}...`;
            const rank = whale.rank ? ` #${whale.rank}` : '';
            lines.push(`- ${name}${rank}: ${formatCurrency(whale.current_value)} @ ${formatPrice(whale.avg_price)}`);
          }
          lines.push('');
        }
      }

      // Add checklist
      lines.push('## Checklist');
      lines.push(`${signal!.checklist.consensusPass ? '✅' : '❌'} Consensus ≥80%`);
      lines.push(`${signal!.checklist.traderCountPass ? '✅' : '❌'} Traders ≥3`);
      lines.push(`${signal!.checklist.priceCeilingPass ? '✅' : '❌'} Price ≤55¢`);
      lines.push(`${signal!.checklist.rrRatioPass ? '✅' : '❌'} R/R ≥1.0:1`);
      lines.push(`${signal!.checklist.noHedging ? '✅' : '❌'} No hedging`);
      lines.push(`${signal!.checklist.noEliteConflict ? '✅' : '❌'} No elite conflicts`);
      lines.push('');

      lines.push(`[View on Polymarket](${signal!.polymarketUrl})`);

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
              {signal.marketTitle}
            </SheetTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${sportColors[signal.sport]} text-white`}>
                {signal.sport}
              </Badge>
              <Badge variant="outline">{signal.betType.toLowerCase()}</Badge>
              <span className="text-sm text-muted-foreground">
                {formatDateTime(signal.matchup.gameTime)}
              </span>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* The Pick */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                The Pick
              </h4>
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <p className="font-semibold text-lg">{signal.pick.side}</p>
                  <p className="text-sm text-muted-foreground">
                    Entry: {formatPrice(signal.pick.entryPrice)} → Current: {formatPrice(signal.pick.currentPrice)}{' '}
                    <span className={priceDiff >= 0 ? 'text-green-500' : 'text-red-500'}>
                      ({priceDiffDisplay})
                    </span>
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Signal Strength */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Signal Strength
              </h4>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Consensus</span>
                    <div className="flex items-center gap-2">
                      <Progress value={displayConsensus} className="w-24 h-2" />
                      <span className="text-sm font-medium">{displayConsensus}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Whale Count</span>
                    <span className="font-medium">{signal.signal.whaleCount} traders</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Total Volume</span>
                    <span className="font-medium">{formatCurrency(signal.signal.totalVolume)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Signal Score</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{signal.signal.signalScore.toFixed(2)}</span>
                      {signal.signal.tier && (
                        <Badge variant={signal.signal.tier === 1 ? 'default' : 'secondary'} className="text-xs">
                          Tier {signal.signal.tier}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>R/R Ratio</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{signal.signal.rrRatio.toFixed(2)}:1</span>
                      <div className={`w-3 h-3 rounded-full ${signal.signal.rrRatio >= 1 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Whale Positions */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Whale Positions
              </h4>
              <div className="space-y-3">
                {isLoadingPositions ? (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Loading whale positions...</p>
                    </CardContent>
                  </Card>
                ) : outcomes.length > 0 ? (
                  outcomes.map((outcome) => {
                    const positions = positionsByOutcome[outcome];
                    const totals = getSideTotals(positions);
                    const isPick = outcome === pickSide;
                    return (
                      <Card
                        key={outcome}
                        className={isPick ? 'border-emerald-500/30' : ''}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {isPick && <span className="text-emerald-500">→</span>}
                              <span className={`font-semibold ${isPick ? 'text-emerald-600' : ''}`}>
                                {outcome}
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {totals.count} traders · {formatCurrency(totals.volume)}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {positions.map((whale: ApiWhalePosition) => (
                              <div key={whale.id || whale.trader_wallet} className="flex justify-between text-sm">
                                <span className="flex items-center gap-1">
                                  {whale.rank && whale.rank <= 10 ? '🐋' : '🦈'}{' '}
                                  <span className="truncate">
                                    {whale.username || `${whale.trader_wallet.slice(0, 8)}...`}
                                  </span>
                                  {whale.rank && <span className="text-muted-foreground">#{whale.rank}</span>}
                                </span>
                                <span className="font-medium">
                                  {formatCurrency(whale.current_value)} @ {formatPrice(whale.avg_price)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">
                        {USE_MOCK_DATA
                          ? 'Whale positions not available in mock mode'
                          : 'No whale positions linked yet.'}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Checklist */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Checklist
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>{signal.checklist.consensusPass ? '✅' : '❌'} Consensus ≥80%</div>
                <div>{signal.checklist.traderCountPass ? '✅' : '❌'} Traders ≥3</div>
                <div>{signal.checklist.priceCeilingPass ? '✅' : '❌'} Price ≤55¢</div>
                <div>{signal.checklist.rrRatioPass ? '✅' : '❌'} R/R ≥1.0:1</div>
                <div>{signal.checklist.noHedging ? '✅' : '❌'} No hedging</div>
                <div>{signal.checklist.noEliteConflict ? '✅' : '❌'} No elite conflicts</div>
              </div>
            </div>

            {/* Journal Section */}
            {(journalMode !== 'hidden' || journalEntry) && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  My Position
                </h4>

                {journalMode === 'loading' && (
                  <Card>
                    <CardContent className="p-4 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Fetching your position from Polymarket...</span>
                    </CardContent>
                  </Card>
                )}

                {journalMode === 'form' && journalError && (
                  <Card className="border-red-500/30">
                    <CardContent className="p-4 space-y-3">
                      <p className="text-sm text-red-500">{journalError}</p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setJournalError(null);
                          setJournalMode('loading');
                          createJournalMutation.mutate();
                        }}
                        disabled={createJournalMutation.isPending}
                        className="w-full"
                      >
                        {createJournalMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Retrying...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {journalMode === 'display' && journalEntry && (
                  <div className="space-y-3">
                    {journalEntry.contradicts_signal && (
                      <Card className="border-yellow-500/30 bg-yellow-500/5">
                        <CardContent className="p-3 flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-yellow-500">
                            Your position ({journalEntry.outcome}) contradicts the signal's pick ({signal.pick.side})
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    <Card className={journalEntry.contradicts_signal ? 'border-yellow-500/30' : 'border-emerald-500/30'}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold">{journalEntry.outcome}</span>
                          <span className={getStatusDisplay(journalEntry.status).color}>
                            {getStatusDisplay(journalEntry.status).emoji} {getStatusDisplay(journalEntry.status).label}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Stake:</span>
                            <span className="ml-2 font-medium">{formatCurrency(journalEntry.stake)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Entry:</span>
                            <span className="ml-2 font-medium">{formatPrice(journalEntry.entry_price)}</span>
                          </div>
                          {journalEntry.status !== 'open' && journalEntry.profit_loss !== null && (
                            <>
                              <div>
                                <span className="text-muted-foreground">Payout:</span>
                                <span className="ml-2 font-medium">
                                  {journalEntry.actual_payout ? formatCurrency(journalEntry.actual_payout) : '-'}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">P&L:</span>
                                <span className={`ml-2 font-medium ${journalEntry.profit_loss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {journalEntry.profit_loss >= 0 ? '+' : ''}{formatCurrency(journalEntry.profit_loss)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {!notesExpanded && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex-1 min-w-0">
                          {journalEntry.thesis ? (
                            <p className="text-sm text-muted-foreground italic truncate">
                              "{journalEntry.thesis}"
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">No notes</p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button variant="outline" size="sm" onClick={() => setNotesExpanded(true)}>
                            <Pencil className="h-4 w-4" />
                            <span className="ml-1">{journalEntry.thesis ? 'Edit' : 'Add Note'}</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refreshMutation.mutate()}
                            disabled={refreshMutation.isPending}
                          >
                            {refreshMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {notesExpanded && (
                      <Card>
                        <CardContent className="p-4 space-y-2">
                          <label className="text-sm text-muted-foreground">Notes</label>
                          <textarea
                            className="w-full bg-background border rounded-md p-2 text-sm"
                            placeholder="Add notes about your trade..."
                            rows={2}
                            value={journalNotes}
                            onChange={(e) => setJournalNotes(e.target.value)}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateNotesMutation.mutate()}
                              disabled={updateNotesMutation.isPending || journalNotes === (journalEntry.thesis || '')}
                            >
                              {updateNotesMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                              <span className="ml-1">Save</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setJournalNotes(journalEntry.thesis || '');
                                setNotesExpanded(false);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Fixed bottom actions */}
        <div className="sticky bottom-0 bg-background border-t p-4">
          <div className="flex items-center gap-2">
            <Button asChild className="flex-1">
              <a href={signal.polymarketUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                View on Polymarket
              </a>
            </Button>
            {journalMode === 'hidden' && !isCheckingJournal && !journalEntry && (
              <Button variant="outline" size="icon" onClick={handleJournalClick} title="Add to Journal">
                <BookOpen className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
