import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GroupedWhaleBetCard } from '@/components/GroupedWhaleBetCard';
import { GroupedWhaleBetSheet } from '@/components/GroupedWhaleBetSheet';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useGroupedWhaleBets } from '@/hooks/useSignals';
import type { ApiGroupedWhaleBet } from '@/lib/api';

type Sport = 'NBA' | 'NHL' | 'NFL' | 'CBB' | 'CFB';
type SportFilter = Sport | 'All';
type BetTypeFilter = 'All' | 'Totals' | 'Spread' | 'Moneyline';
type StatusFilter = 'All' | 'open' | 'ended';
type SortOption = 'consensus' | 'whales' | 'volume';

const sports: Sport[] = ['NBA', 'NHL', 'NFL', 'CBB', 'CFB'];
const betTypes: BetTypeFilter[] = ['All', 'Totals', 'Spread', 'Moneyline'];

export function WhalePlaysPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read filters from URL params with defaults
  const sportFilter = (searchParams.get('sport') as SportFilter) || 'All';
  const betTypeFilter = (searchParams.get('betType') as BetTypeFilter) || 'All';
  const statusFilter = (searchParams.get('status') as StatusFilter) || 'open';
  const gameDate = searchParams.get('date') || '';
  const minWhales = searchParams.get('minWhales') || '';
  const minVolume = searchParams.get('minVolume') || '';
  const sortBy = (searchParams.get('sort') as SortOption) || 'consensus';

  const [minWhalesInput, setMinWhalesInput] = useState<string>(minWhales);
  const [minVolumeInput, setMinVolumeInput] = useState<string>(minVolume);
  const [selectedGroup, setSelectedGroup] = useState<ApiGroupedWhaleBet | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Update URL params helper
  const updateParam = useCallback((key: string, value: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      // Remove param if it's the default value
      const isDefault =
        (key === 'sport' && value === 'All') ||
        (key === 'betType' && value === 'All') ||
        (key === 'status' && value === 'open') ||
        (key === 'sort' && value === 'consensus') ||
        !value;
      if (!isDefault) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      return newParams;
    });
  }, [setSearchParams]);

  const { data, isLoading, error } = useGroupedWhaleBets({
    sport: sportFilter !== 'All' ? sportFilter : undefined,
    bet_type: betTypeFilter !== 'All' ? betTypeFilter : undefined,
    status: statusFilter !== 'All' ? statusFilter : undefined,
    game_date: gameDate || undefined,
    min_whales: minWhales ? parseInt(minWhales, 10) : undefined,
    min_volume: minVolume ? parseFloat(minVolume) : undefined,
    expand: true,
  });

  // Find the opposite direction group when one is selected
  const oppositeGroup = useMemo(() => {
    if (!selectedGroup || !data?.groups) return null;

    const isOver = selectedGroup.direction.toLowerCase() === 'over';
    const isUnder = selectedGroup.direction.toLowerCase() === 'under';

    return data.groups.find((g) => {
      if (g.event_slug !== selectedGroup.event_slug) return false;
      if (g.bet_type !== selectedGroup.bet_type) return false;
      if (g.direction === selectedGroup.direction) return false;

      if (isOver && g.direction.toLowerCase() === 'under') return true;
      if (isUnder && g.direction.toLowerCase() === 'over') return true;

      return true;
    });
  }, [selectedGroup, data?.groups]);

  const handleGroupClick = (group: ApiGroupedWhaleBet) => {
    setSelectedGroup(group);
    setSheetOpen(true);
  };

  const groups = data?.groups || [];
  const total = data?.total || 0;

  // Sort groups based on selected option
  const sortedGroups = useMemo(() => {
    const sorted = [...groups];
    switch (sortBy) {
      case 'consensus':
        return sorted.sort((a, b) => b.combined_consensus_pct - a.combined_consensus_pct);
      case 'whales':
        return sorted.sort((a, b) => b.unique_whale_count - a.unique_whale_count);
      case 'volume':
        return sorted.sort((a, b) => b.total_volume - a.total_volume);
      default:
        return sorted;
    }
  }, [groups, sortBy]);

  // Calculate summary stats
  const totalWhales = useMemo(() => {
    return groups.reduce((sum, g) => sum + g.unique_whale_count, 0);
  }, [groups]);

  const totalVolume = useMemo(() => {
    return groups.reduce((sum, g) => sum + g.total_volume, 0);
  }, [groups]);

  return (
    <div className="p-4">
      {/* Page header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Whale Bets</h2>
        <p className="text-sm text-muted-foreground">
          Track where smart money is moving
        </p>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        {isLoading ? (
          <>
            <span>Active Positions: <span className="inline-block w-8 h-4 bg-muted animate-pulse rounded" /></span>
            <span>Total Whales: <span className="inline-block w-8 h-4 bg-muted animate-pulse rounded" /></span>
            <span>Total Volume: <span className="inline-block w-16 h-4 bg-muted animate-pulse rounded" /></span>
          </>
        ) : (
          <>
            <span>Active Positions: <strong className="text-foreground">{total}</strong></span>
            <span>
              Total Whales: <strong className="text-foreground">{totalWhales}</strong>
            </span>
            <span>
              Total Volume: <strong className="text-foreground">
                ${totalVolume.toLocaleString()}
              </strong>
            </span>
          </>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Sport filter chips */}
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

        {/* Bet type filter */}
        <Select
          value={betTypeFilter}
          onValueChange={(v) => updateParam('betType', v)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Bet Type" />
          </SelectTrigger>
          <SelectContent>
            {betTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type === 'All' ? 'All Types' : type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={(v) => updateParam('status', v)}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="ended">Ended</SelectItem>
          </SelectContent>
        </Select>

        {/* Game date filter */}
        <div className="relative">
          <input
            type="date"
            value={gameDate}
            onChange={(e) => updateParam('date', e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Game Date"
          />
          {gameDate && (
            <button
              onClick={() => updateParam('date', '')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Min whales filter */}
        <div className="relative">
          <input
            type="number"
            value={minWhalesInput}
            onChange={(e) => setMinWhalesInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateParam('minWhales', minWhalesInput);
              }
            }}
            onBlur={() => {
              if (minWhalesInput !== minWhales) {
                updateParam('minWhales', minWhalesInput);
              }
            }}
            className="h-9 w-[110px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Min Whales"
            min="1"
            step="1"
          />
          {minWhalesInput && (
            <button
              onClick={() => {
                setMinWhalesInput('');
                updateParam('minWhales', '');
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Min volume filter */}
        <div className="relative">
          <input
            type="number"
            value={minVolumeInput}
            onChange={(e) => setMinVolumeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateParam('minVolume', minVolumeInput);
              }
            }}
            onBlur={() => {
              if (minVolumeInput !== minVolume) {
                updateParam('minVolume', minVolumeInput);
              }
            }}
            className="h-9 w-[120px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Min Volume"
            min="0"
            step="100"
          />
          {minVolumeInput && (
            <button
              onClick={() => {
                setMinVolumeInput('');
                updateParam('minVolume', '');
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Sort by */}
        <Select
          value={sortBy}
          onValueChange={(v) => updateParam('sort', v)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="consensus">Consensus %</SelectItem>
            <SelectItem value="whales">Whale Count</SelectItem>
            <SelectItem value="volume">Volume</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid with loading state */}
      {error ? (
        <div className="flex items-center justify-center p-12">
          <p className="text-red-500">Error loading whale bets</p>
        </div>
      ) : isLoading ? (
        <LoadingSpinner message="Finding whale bets..." />
      ) : sortedGroups.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          No whale bets found for these filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sortedGroups.map((group) => (
            <GroupedWhaleBetCard
              key={group.group_key}
              group={group}
              onClick={() => handleGroupClick(group)}
            />
          ))}
        </div>
      )}

      {/* Sheet */}
      <GroupedWhaleBetSheet
        group={selectedGroup}
        oppositeGroup={oppositeGroup}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
