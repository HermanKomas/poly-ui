import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSignals,
  getMeta,
  refreshSignals as apiRefreshSignals,
  getWhalePlays,
  getGroupedWhaleBets,
  type ApiWhalePlaysResponse,
  type ApiGroupedWhaleBetsResponse,
} from '@/lib/api';
import { transformApiSignal, type Signal } from '@/types/signal';
import { mockSignals } from '@/data/mockSignals';

// Set to true to use mock data (for development without API)
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

export function useSignals(sport?: string, dateFilter?: string, betType?: string) {
  return useQuery({
    queryKey: ['signals', sport, dateFilter, betType],
    queryFn: async (): Promise<Signal[]> => {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return mockSignals;
      }

      const response = await getSignals({
        sport: sport && sport !== 'All' ? sport : undefined,
        bet_type: betType && betType !== 'All' ? betType : undefined,
        date_filter: dateFilter || 'this_week',
      });

      return response.signals.map(transformApiSignal);
    },
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });
}

export function useMeta() {
  return useQuery({
    queryKey: ['meta'],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        return {
          last_leaderboard_refresh: null,
          last_signals_refresh: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          cron_interval_minutes: 10,
          is_refreshing: false,
          refresh_error: null,
        };
      }

      return getMeta();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useRefreshSignals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sport?: string) => {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return { success: true, message: 'Mock refresh complete' };
      }

      return apiRefreshSignals({
        sport: sport && sport !== 'All' ? sport : undefined,
        top_n: 100,
      });
    },
    onSuccess: () => {
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['signals'] });
      queryClient.invalidateQueries({ queryKey: ['meta'] });
    },
  });
}

export function useWhalePlays(params?: {
  sport?: string;
  bet_type?: string;
  status?: string;
  game_date?: string;
  min_volume?: number;
  min_whales?: number;
  all_one_side?: boolean;
  page?: number;
  page_size?: number;
}) {
  return useQuery<ApiWhalePlaysResponse>({
    queryKey: ['whale-plays', params?.sport, params?.bet_type, params?.status, params?.game_date, params?.min_volume, params?.min_whales, params?.all_one_side, params?.page, params?.page_size],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return {
          plays: [],
          total: 0,
          page: 1,
          page_size: 25,
          total_pages: 0,
        };
      }

      return getWhalePlays({
        sport: params?.sport && params.sport !== 'All' ? params.sport : undefined,
        bet_type: params?.bet_type && params.bet_type !== 'All' ? params.bet_type : undefined,
        status: params?.status && params.status !== 'All' ? params.status : undefined,
        game_date: params?.game_date || undefined,
        min_volume: params?.min_volume || undefined,
        min_whales: params?.min_whales || undefined,
        all_one_side: params?.all_one_side || undefined,
        page: params?.page,
        page_size: params?.page_size ?? 25,
      });
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

// Grouped Whale Bets hook (spec-0002)
export function useGroupedWhaleBets(params?: {
  sport?: string;
  bet_type?: string;
  status?: string;
  game_date?: string;
  min_whales?: number;
  min_volume?: number;
  max_entry?: number;
  expand?: boolean;
}) {
  return useQuery<ApiGroupedWhaleBetsResponse>({
    queryKey: ['grouped-whale-bets', params?.sport, params?.bet_type, params?.status, params?.game_date, params?.min_whales, params?.min_volume, params?.max_entry, params?.expand],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return {
          groups: [],
          total: 0,
        };
      }

      return getGroupedWhaleBets({
        sport: params?.sport && params.sport !== 'All' ? params.sport : undefined,
        bet_type: params?.bet_type && params.bet_type !== 'All' ? params.bet_type : undefined,
        status: params?.status && params.status !== 'All' ? params.status : undefined,
        game_date: params?.game_date || undefined,
        min_whales: params?.min_whales || undefined,
        min_volume: params?.min_volume || undefined,
        max_entry: params?.max_entry || undefined,
        expand: params?.expand || undefined,
      });
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
