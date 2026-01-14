import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSignals, getMeta, refreshSignals as apiRefreshSignals } from '@/lib/api';
import { transformApiSignal, type Signal } from '@/types/signal';
import { mockSignals } from '@/data/mockSignals';

// Set to true to use mock data (for development without API)
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

export function useSignals(sport?: string) {
  return useQuery({
    queryKey: ['signals', sport],
    queryFn: async (): Promise<Signal[]> => {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return mockSignals;
      }

      const response = await getSignals({
        sport: sport && sport !== 'All' ? sport : undefined,
        hours: 72,
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
