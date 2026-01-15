import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SportFilter, SortOption, Sport } from '@/types/signal';

const sports: Sport[] = ['NBA', 'NHL', 'NFL', 'CBB', 'CFB'];

interface RefreshMeta {
  lastSignalsRefresh: Date | null;
  cronIntervalMinutes: number;
  isRefreshing: boolean;
}

interface HeaderProps {
  sportFilter: SportFilter;
  onSportFilterChange: (sport: SportFilter) => void;
  sortOption: SortOption;
  onSortOptionChange: (sort: SortOption) => void;
  meta?: RefreshMeta;
  onForceRefresh?: () => void;
  isForceRefreshing?: boolean;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return 'just now';
  if (diffMins === 1) return '1 min ago';
  if (diffMins < 60) return `${diffMins} mins ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  return `${diffHours} hours ago`;
}

function getNextRefreshIn(lastRefresh: Date, intervalMinutes: number): string {
  const now = new Date();
  const nextRefresh = new Date(lastRefresh.getTime() + intervalMinutes * 60 * 1000);
  const diffMs = nextRefresh.getTime() - now.getTime();

  if (diffMs <= 0) return 'any moment';

  const diffMins = Math.ceil(diffMs / (1000 * 60));
  if (diffMins === 1) return '1 min';
  return `${diffMins} mins`;
}

export function Header({
  sportFilter,
  onSportFilterChange,
  sortOption,
  onSortOptionChange,
  meta,
  onForceRefresh,
  isForceRefreshing,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-background border-b p-4">
      <div className="flex flex-col gap-4">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Whale Tracer</h1>
        </div>

        {/* Refresh status row */}
        {meta && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {meta.lastSignalsRefresh ? (
              <>
                <span>
                  Last sync: {formatTimeAgo(meta.lastSignalsRefresh)}
                </span>
                <span className="hidden sm:inline">·</span>
                <span className="hidden sm:inline">
                  Next in: {getNextRefreshIn(meta.lastSignalsRefresh, meta.cronIntervalMinutes)}
                </span>
              </>
            ) : (
              <span>No sync data yet</span>
            )}

            {meta.isRefreshing && (
              <Badge variant="secondary" className="text-xs">
                Syncing...
              </Badge>
            )}

            {onForceRefresh && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={onForceRefresh}
                disabled={isForceRefreshing || meta.isRefreshing}
              >
                {isForceRefreshing ? 'Refreshing...' : 'Force Refresh'}
              </Button>
            )}
          </div>
        )}

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sport filter chips */}
          <div className="flex flex-wrap gap-1">
            <Badge
              variant={sportFilter === 'All' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => onSportFilterChange('All')}
            >
              All
            </Badge>
            {sports.map((sport) => (
              <Badge
                key={sport}
                variant={sportFilter === sport ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => onSportFilterChange(sport)}
              >
                {sport}
              </Badge>
            ))}
          </div>

          {/* Sort dropdown */}
          <div className="ml-auto">
            <Select value={sortOption} onValueChange={(v) => onSortOptionChange(v as SortOption)}>
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
      </div>
    </header>
  );
}
