import { useState, useMemo } from 'react';
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
import { useSignals } from '@/hooks/useSignals';
import type { Signal, SportFilter, SortOption, Sport } from '@/types/signal';

const sports: Sport[] = ['NBA', 'NHL', 'NFL', 'CBB', 'CFB'];

export function SignalsPage() {
  const [sportFilter, setSportFilter] = useState<SportFilter>('All');
  const [sortOption, setSortOption] = useState<SortOption>('created');
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: signals = [], isLoading } = useSignals(
    sportFilter !== 'All' ? sportFilter : undefined
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Loading signals...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2 p-4 border-b">
        <div className="flex flex-wrap gap-1">
          <Badge
            variant={sportFilter === 'All' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSportFilter('All')}
          >
            All
          </Badge>
          {sports.map((sport) => (
            <Badge
              key={sport}
              variant={sportFilter === sport ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSportFilter(sport)}
            >
              {sport}
            </Badge>
          ))}
        </div>

        <div className="ml-auto">
          <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
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

      {/* Grid */}
      {filteredAndSortedSignals.length === 0 ? (
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
