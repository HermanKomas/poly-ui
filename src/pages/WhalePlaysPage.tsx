import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WhalePlayCard } from '@/components/WhalePlayCard';
import { WhalePlaySheet } from '@/components/WhalePlaySheet';
import { useWhalePlays } from '@/hooks/useSignals';
import type { ApiWhalePlay } from '@/lib/api';

type Sport = 'NBA' | 'NHL' | 'NFL' | 'CBB' | 'CFB';
type SportFilter = Sport | 'All';
type BetTypeFilter = 'All' | 'Totals' | 'Spread' | 'Moneyline';
type StatusFilter = 'All' | 'open' | 'ended';

const sports: Sport[] = ['NBA', 'NHL', 'NFL', 'CBB', 'CFB'];
const betTypes: BetTypeFilter[] = ['All', 'Totals', 'Spread', 'Moneyline'];

export function WhalePlaysPage() {
  const [sportFilter, setSportFilter] = useState<SportFilter>('All');
  const [betTypeFilter, setBetTypeFilter] = useState<BetTypeFilter>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [gameDate, setGameDate] = useState<string>('');
  // Input values (local state for typing)
  const [minVolumeInput, setMinVolumeInput] = useState<string>('');
  const [minWhalesInput, setMinWhalesInput] = useState<string>('');
  // Applied values (sent to API on Enter)
  const [minVolume, setMinVolume] = useState<string>('');
  const [minWhales, setMinWhales] = useState<string>('');
  const [page, setPage] = useState(1);
  const [selectedPlay, setSelectedPlay] = useState<ApiWhalePlay | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data, isLoading, error } = useWhalePlays({
    sport: sportFilter !== 'All' ? sportFilter : undefined,
    bet_type: betTypeFilter !== 'All' ? betTypeFilter : undefined,
    status: statusFilter !== 'All' ? statusFilter : undefined,
    game_date: gameDate || undefined,
    min_volume: minVolume ? parseFloat(minVolume) : undefined,
    min_whales: minWhales ? parseInt(minWhales, 10) : undefined,
    page,
    page_size: 25,
  });

  const handlePlayClick = (play: ApiWhalePlay) => {
    setSelectedPlay(play);
    setSheetOpen(true);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (value: any) => void, value: any) => {
    setter(value);
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Loading whale plays...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-red-500">Error loading whale plays</p>
      </div>
    );
  }

  const plays = data?.plays || [];
  const totalPages = data?.total_pages || 1;
  const total = data?.total || 0;

  return (
    <div className="p-4">
      {/* Page header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Whale Plays</h2>
        <p className="text-sm text-muted-foreground">
          Track where smart money is moving
        </p>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        <span>Active Positions: <strong className="text-foreground">{total}</strong></span>
        <span>
          Total Whales: <strong className="text-foreground">
            {plays.reduce((sum, p) => sum + p.total_whale_count, 0)}
          </strong>
        </span>
        <span>
          Total Volume: <strong className="text-foreground">
            ${plays.reduce((sum, p) => sum + p.total_volume, 0).toLocaleString()}
          </strong>
        </span>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Sport filter chips */}
        <div className="flex flex-wrap gap-1">
          <Badge
            variant={sportFilter === 'All' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => handleFilterChange(setSportFilter, 'All')}
          >
            All
          </Badge>
          {sports.map((sport) => (
            <Badge
              key={sport}
              variant={sportFilter === sport ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => handleFilterChange(setSportFilter, sport)}
            >
              {sport}
            </Badge>
          ))}
        </div>

        {/* Bet type filter */}
        <Select
          value={betTypeFilter}
          onValueChange={(v) => handleFilterChange(setBetTypeFilter, v as BetTypeFilter)}
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
          onValueChange={(v) => handleFilterChange(setStatusFilter, v as StatusFilter)}
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
            onChange={(e) => handleFilterChange(setGameDate, e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Game Date"
          />
          {gameDate && (
            <button
              onClick={() => handleFilterChange(setGameDate, '')}
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
                handleFilterChange(setMinVolume, minVolumeInput);
              }
            }}
            onBlur={() => {
              if (minVolumeInput !== minVolume) {
                handleFilterChange(setMinVolume, minVolumeInput);
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
                handleFilterChange(setMinVolume, '');
              }}
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
                handleFilterChange(setMinWhales, minWhalesInput);
              }
            }}
            onBlur={() => {
              if (minWhalesInput !== minWhales) {
                handleFilterChange(setMinWhales, minWhalesInput);
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
                handleFilterChange(setMinWhales, '');
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {plays.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          No whale plays found for these filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {plays.map((play) => (
            <WhalePlayCard
              key={play.condition_id}
              play={play}
              onClick={() => handlePlayClick(play)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-1">
            {/* Show page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? 'default' : 'outline'}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <span className="text-sm text-muted-foreground ml-2">
            Page {page} of {totalPages}
          </span>
        </div>
      )}

      {/* Sheet */}
      <WhalePlaySheet
        play={selectedPlay}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
