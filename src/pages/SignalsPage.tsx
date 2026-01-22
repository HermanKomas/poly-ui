import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SignalGrid } from '@/components/SignalGrid';
import { SignalDetailSheet } from '@/components/SignalDetailSheet';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useSignals } from '@/hooks/useSignals';
import type { Signal, SportFilter, SortOption, Sport } from '@/types/signal';

const sports: Sport[] = ['NBA', 'NHL', 'NFL', 'CBB', 'CFB'];
const betTypes = ['All', 'Totals', 'Spread', 'Moneyline'] as const;
type BetTypeFilter = (typeof betTypes)[number];

type DateFilter = 'today' | 'yesterday' | 'this_week' | 'all';

export function SignalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read filters from URL params with defaults
  const sportFilter = (searchParams.get('sport') as SportFilter) || 'All';
  const betTypeFilter = (searchParams.get('betType') as BetTypeFilter) || 'All';
  const dateFilter = (searchParams.get('date') as DateFilter) || 'this_week';
  const sortOption = (searchParams.get('sort') as SortOption) || 'created';

  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Update URL params helper
  const updateParam = useCallback((key: string, value: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      // Remove param if it's the default value
      const isDefault = (key === 'sport' && value === 'All') ||
                       (key === 'betType' && value === 'All') ||
                       (key === 'date' && value === 'this_week') ||
                       (key === 'sort' && value === 'created');
      if (value && !isDefault) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      return newParams;
    });
  }, [setSearchParams]);

  const { data: signals = [], isLoading } = useSignals(
    sportFilter !== 'All' ? sportFilter : undefined,
    dateFilter,
    betTypeFilter !== 'All' ? betTypeFilter : undefined
  );

  const filteredAndSortedSignals = useMemo(() => {
    let result = signals;

    if (sportFilter !== 'All') {
      result = result.filter((s) => s.sport === sportFilter);
    }

    result = [...result].sort((a, b) => {
      switch (sortOption) {
        case 'created':
          return b.firstSeenAt.getTime() - a.firstSeenAt.getTime();
        case 'gameTime':
          return a.matchup.gameTime.getTime() - b.matchup.gameTime.getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [signals, sportFilter, sortOption]);

  const handleSignalClick = (signal: Signal) => {
    setSelectedSignal(signal);
    setModalOpen(true);
  };

  return (
    <div>
      {/* Filters row - always visible */}
      <div className="flex flex-wrap items-center gap-2 p-4 border-b">
        <div className="flex flex-wrap gap-1">
          <Badge
            variant={sportFilter === 'All' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => updateParam('sport', 'All')}
          >
            All
          </Badge>
          {sports.map((sport) => (
            <Badge
              key={sport}
              variant={sportFilter === sport ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => updateParam('sport', sport)}
            >
              {sport}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Select value={betTypeFilter} onValueChange={(v) => updateParam('betType', v)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Bet Type" />
            </SelectTrigger>
            <SelectContent>
              {betTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={(v) => updateParam('date', v)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortOption} onValueChange={(v) => updateParam('sort', v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created">Signal Created</SelectItem>
              <SelectItem value="gameTime">Game Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid with loading state */}
      {isLoading ? (
        <LoadingSpinner message="Loading signals..." />
      ) : filteredAndSortedSignals.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          No signals match your filters.
        </div>
      ) : (
        <SignalGrid
          signals={filteredAndSortedSignals}
          onSignalClick={handleSignalClick}
        />
      )}

      <SignalDetailSheet
        signal={selectedSignal}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
