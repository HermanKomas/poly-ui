import { useState, useMemo } from 'react'
import { Toaster } from 'sonner'
import { Header } from '@/components/Header'
import { SignalGrid } from '@/components/SignalGrid'
import { SignalDetailModal } from '@/components/SignalDetailModal'
import { useSignals, useMeta, useRefreshSignals } from '@/hooks/useSignals'
import type { Signal, SportFilter, SortOption } from '@/types/signal'

function App() {
  const [sportFilter, setSportFilter] = useState<SportFilter>('All')
  const [sortOption, setSortOption] = useState<SortOption>('created')
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Fetch signals - pass sport filter to API for server-side filtering
  const { data: signals = [], isLoading } = useSignals(
    sportFilter !== 'All' ? sportFilter : undefined
  )

  // Fetch meta (refresh status)
  const { data: meta } = useMeta()

  // Force refresh mutation
  const refreshMutation = useRefreshSignals()

  const filteredAndSortedSignals = useMemo(() => {
    let result = signals

    // Client-side filter (in case API doesn't filter, or for 'All')
    if (sportFilter !== 'All') {
      result = result.filter((s) => s.sport === sportFilter)
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortOption) {
        case 'created':
          // Newest first
          return b.firstSeenAt.getTime() - a.firstSeenAt.getTime()
        case 'gameTime':
          // Earliest game first
          return a.matchup.gameTime.getTime() - b.matchup.gameTime.getTime()
        default:
          return 0
      }
    })

    return result
  }, [signals, sportFilter, sortOption])

  const handleSignalClick = (signal: Signal) => {
    setSelectedSignal(signal)
    setModalOpen(true)
  }

  const handleForceRefresh = () => {
    refreshMutation.mutate(sportFilter !== 'All' ? sportFilter : undefined)
  }

  // Transform API meta to header meta
  const headerMeta = meta ? {
    lastSignalsRefresh: meta.last_signals_refresh ? new Date(meta.last_signals_refresh) : null,
    cronIntervalMinutes: meta.cron_interval_minutes,
    isRefreshing: meta.is_refreshing,
  } : undefined

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading signals...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        sportFilter={sportFilter}
        onSportFilterChange={setSportFilter}
        sortOption={sortOption}
        onSortOptionChange={setSortOption}
        meta={headerMeta}
        onForceRefresh={handleForceRefresh}
        isForceRefreshing={refreshMutation.isPending}
      />

      <main>
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
      </main>

      <SignalDetailModal
        signal={selectedSignal}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      <Toaster position="bottom-center" />
    </div>
  )
}

export default App
