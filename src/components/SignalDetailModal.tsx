import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, Check, BookOpen, RefreshCw, AlertTriangle, Save, Loader2, Pencil } from 'lucide-react';
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

function formatSignalAsMarkdown(
  signal: Signal,
  whalePositions: ApiWhalePosition[],
  priceDiffDisplay: string
): string {
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
    // Group positions by outcome
    const byOutcome = whalePositions.reduce((acc, pos) => {
      if (!acc[pos.outcome]) acc[pos.outcome] = [];
      acc[pos.outcome].push(pos);
      return acc;
    }, {} as Record<string, ApiWhalePosition[]>);

    // Sort outcomes: pick's side first
    const sortedOutcomes = Object.keys(byOutcome).sort((a, b) => {
      if (a === signal.pick.side) return -1;
      if (b === signal.pick.side) return 1;
      return a.localeCompare(b);
    });

    lines.push('## Whale Positions');
    for (const outcome of sortedOutcomes) {
      const positions = byOutcome[outcome];
      const isPick = outcome === signal.pick.side;
      const totalVolume = positions.reduce((sum, p) => sum + p.current_value, 0);

      lines.push('');
      lines.push(`### ${isPick ? '✓' : '✗'} ${outcome}`);
      lines.push(`${positions.length} traders · ${formatCurrency(totalVolume)}`);
      lines.push('');
      lines.push('| Trader | Position | Entry |');
      lines.push('|--------|----------|-------|');
      for (const whale of positions) {
        const name = whale.username || `${whale.trader_wallet.slice(0, 8)}...`;
        const rank = whale.rank ? ` #${whale.rank}` : '';
        lines.push(`| ${name}${rank} | ${formatCurrency(whale.current_value)} | ${formatPrice(whale.avg_price)} |`);
      }
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

  const [copied, setCopied] = useState(false);

  // Journal state
  const [journalMode, setJournalMode] = useState<'hidden' | 'loading' | 'form' | 'display'>('hidden');
  const [journalEntry, setJournalEntry] = useState<ApiJournalEntry | null>(null);
  const [journalNotes, setJournalNotes] = useState('');
  const [journalError, setJournalError] = useState<string | null>(null);
  const [notesExpanded, setNotesExpanded] = useState(false);

  const queryClient = useQueryClient();

  // Check if journal entry exists when modal opens
  const { data: existingJournal, isLoading: isCheckingJournal } = useQuery({
    queryKey: ['journal', signal?.id],
    queryFn: async () => {
      if (!signal?.id || USE_MOCK_DATA) return null;
      try {
        return await getSignalJournal(signal.id);
      } catch {
        return null; // 404 means no entry exists
      }
    },
    enabled: open && !!signal?.id && !USE_MOCK_DATA,
    staleTime: 30 * 1000,
  });

  // Update state when existing journal loads
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

  // Reset journal state when modal closes
  useEffect(() => {
    if (!open) {
      setJournalMode('hidden');
      setJournalEntry(null);
      setJournalNotes('');
      setJournalError(null);
      setNotesExpanded(false);
    }
  }, [open]);

  // Create journal mutation
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

  // Update notes mutation
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

  // Refresh mutation
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

  // Handle journal button click
  function handleJournalClick() {
    if (journalMode === 'hidden') {
      setJournalMode('loading');
      setJournalError(null);
      createJournalMutation.mutate();
    }
  }

  // Get status display info
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

  // Group positions by outcome
  const positionsByOutcome = whalePositions.reduce((acc, pos) => {
    const outcome = pos.outcome;
    if (!acc[outcome]) {
      acc[outcome] = [];
    }
    acc[outcome].push(pos);
    return acc;
  }, {} as Record<string, ApiWhalePosition[]>);

  // Get outcomes sorted: pick's side first, then others
  const pickSide = signal.pick.side;
  const outcomes = Object.keys(positionsByOutcome).sort((a, b) => {
    if (a === pickSide) return -1;
    if (b === pickSide) return 1;
    return a.localeCompare(b);
  });

  // Calculate totals per side
  function getSideTotals(positions: ApiWhalePosition[]) {
    return {
      count: positions.length,
      volume: positions.reduce((sum, p) => sum + p.current_value, 0),
    };
  }

  // Calculate actual consensus from whale positions (if loaded)
  const actualConsensus = (() => {
    if (whalePositions.length === 0) return null;

    const pickPositions = positionsByOutcome[pickSide] || [];
    const pickVolume = pickPositions.reduce((sum, p) => sum + p.current_value, 0);
    const totalVolume = whalePositions.reduce((sum, p) => sum + p.current_value, 0);

    if (totalVolume === 0) return null;
    return Math.round((pickVolume / totalVolume) * 100);
  })();

  // Use actual consensus if available, otherwise stored value
  const displayConsensus = actualConsensus ?? signal.signal.consensusPercent;
  const consensusChanged = actualConsensus !== null && actualConsensus !== signal.signal.consensusPercent;

  async function handleCopy() {
    try {
      // signal is guaranteed non-null here (checked above)
      await navigator.clipboard.writeText(formatSignalAsMarkdown(signal!, whalePositions, priceDiffDisplay));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[650px] max-h-[90vh] overflow-y-auto overflow-x-hidden">
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
                  <Progress value={displayConsensus} className="h-2" />
                  <span className="font-mono text-sm w-10">
                    {displayConsensus}%
                    {consensusChanged && (
                      <span className="text-muted-foreground text-xs ml-1" title={`Was ${signal.signal.consensusPercent}%`}>
                        *
                      </span>
                    )}
                  </span>
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
            <div className="space-y-3">
              {isLoadingPositions ? (
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Loading whale positions...</p>
                </div>
              ) : outcomes.length > 0 ? (
                outcomes.map((outcome) => {
                  const positions = positionsByOutcome[outcome];
                  const totals = getSideTotals(positions);
                  const isPick = outcome === pickSide;
                  return (
                    <div
                      key={outcome}
                      className={`rounded-lg p-4 ${isPick ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-medium ${isPick ? 'text-green-500' : 'text-red-500'}`}>
                          {isPick ? '✓' : '✗'} {outcome}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {totals.count} traders · {formatCurrency(totals.volume)}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {positions.map((whale: ApiWhalePosition) => (
                          <div key={whale.id || whale.trader_wallet} className="flex justify-between text-sm">
                            <span className="flex items-center gap-1 min-w-0">
                              {whale.rank && whale.rank <= 10 ? '🐋' : '🦈'}{' '}
                              <span className="truncate">
                                {whale.username || `${whale.trader_wallet.slice(0, 8)}...`}
                              </span>
                              {whale.rank && <span className="text-muted-foreground">#{whale.rank}</span>}
                            </span>
                            <span className="font-mono flex-shrink-0">
                              {formatCurrency(whale.current_value)} @ {formatPrice(whale.avg_price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    {USE_MOCK_DATA
                      ? 'Whale positions not available in mock mode'
                      : 'No whale positions linked yet. Run sync script to populate.'}
                  </p>
                </div>
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

          {/* Journal Section */}
          {(journalMode !== 'hidden' || journalEntry) && (
            <section>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">MY POSITION</h4>

              {/* Loading state */}
              {journalMode === 'loading' && (
                <div className="bg-muted rounded-lg p-4 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Fetching your position from Polymarket...</span>
                </div>
              )}

              {/* Error state with retry */}
              {journalMode === 'form' && journalError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-3">
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
                </div>
              )}

              {/* Display state - show position details */}
              {journalMode === 'display' && journalEntry && (
                <div className="space-y-3">
                  {/* Warning if contradicts signal */}
                  {journalEntry.contradicts_signal && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-yellow-500">
                        Your position ({journalEntry.outcome}) contradicts the signal's pick ({signal.pick.side})
                      </p>
                    </div>
                  )}

                  {/* Position details card */}
                  <div className={`rounded-lg p-4 ${
                    journalEntry.contradicts_signal
                      ? 'bg-yellow-500/10 border border-yellow-500/30'
                      : 'bg-green-500/10 border border-green-500/30'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium">{journalEntry.outcome}</span>
                      <span className={getStatusDisplay(journalEntry.status).color}>
                        {getStatusDisplay(journalEntry.status).emoji} {getStatusDisplay(journalEntry.status).label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Stake:</span>
                        <span className="ml-2 font-mono">{formatCurrency(journalEntry.stake)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Entry:</span>
                        <span className="ml-2 font-mono">{formatPrice(journalEntry.entry_price)}</span>
                      </div>
                      {journalEntry.status !== 'open' && journalEntry.profit_loss !== null && (
                        <>
                          <div>
                            <span className="text-muted-foreground">Payout:</span>
                            <span className="ml-2 font-mono">
                              {journalEntry.actual_payout ? formatCurrency(journalEntry.actual_payout) : '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">P&L:</span>
                            <span className={`ml-2 font-mono ${
                              journalEntry.profit_loss >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {journalEntry.profit_loss >= 0 ? '+' : ''}{formatCurrency(journalEntry.profit_loss)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Notes section - collapsed view */}
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setNotesExpanded(true)}
                        >
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

                  {/* Notes section - expanded view */}
                  {notesExpanded && (
                    <div className="bg-muted rounded-lg p-4 space-y-2">
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
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button asChild className="flex-1">
              <a href={signal.polymarketUrl} target="_blank" rel="noopener noreferrer">
                View on Polymarket ↗
              </a>
            </Button>
            {journalMode === 'hidden' && !isCheckingJournal && !journalEntry && (
              <Button
                variant="outline"
                onClick={handleJournalClick}
                className="px-3"
                title="Add to Journal"
              >
                <BookOpen className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" onClick={handleCopy} className="px-3">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
