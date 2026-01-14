export type Sport = 'NBA' | 'NHL' | 'NFL' | 'CBB' | 'CFB';
export type BetType = 'Totals' | 'Spread' | 'Moneyline';

export interface WhalePosition {
  name: string;
  amount: number;
  entryPrice: number;
  isElite: boolean;
}

export interface Signal {
  id: number;
  sport: Sport;
  betType: BetType;
  matchup: {
    away: string;
    home: string;
    gameTime: Date;
  };
  pick: {
    side: string;
    entryPrice: number;
    currentPrice: number;
  };
  signal: {
    consensusPercent: number;
    whaleCount: number;
    totalVolume: number;
    weightedScore: number;
    signalScore: number;
    tier: 1 | 2 | null;
    rrRatio: number;
  };
  whalePositions: WhalePosition[];
  checklist: {
    consensusPass: boolean;
    traderCountPass: boolean;
    priceCeilingPass: boolean;
    rrRatioPass: boolean;
    noHedging: boolean;
    noEliteConflict: boolean;
  };
  polymarketUrl: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

export type SortOption = 'created' | 'gameTime';
export type SportFilter = Sport | 'All';

// Transform API signal to UI signal
export function transformApiSignal(apiSignal: {
  id: number;
  sport: string;
  outcome: string;
  event_title: string;
  market_title: string;
  event_date: string | null;
  avg_entry: number;
  current_price: number | null;
  consensus_pct: number;
  traders: number;
  total_volume: number;
  signal_score: number;
  tier: number;
  polymarket_url: string;
  first_seen_at: string;
  last_seen_at: string;
  bet_type?: string | null;
}): Signal {
  // Parse event title to extract teams (handles "Lakers @ Warriors" or "Lakers vs. Warriors")
  const eventTitle = apiSignal.event_title || '';
  let away = 'Team A';
  let home = 'Team B';

  if (eventTitle.includes(' @ ')) {
    const teams = eventTitle.split(' @ ');
    away = teams[0] || 'Team A';
    home = teams[1] || 'Team B';
  } else if (eventTitle.includes(' vs. ')) {
    const teams = eventTitle.split(' vs. ');
    away = teams[0] || 'Team A';
    home = teams[1] || 'Team B';
  } else if (eventTitle.includes(' vs ')) {
    const teams = eventTitle.split(' vs ');
    away = teams[0] || 'Team A';
    home = teams[1] || 'Team B';
  } else {
    // Can't parse, use full title as away team
    away = eventTitle || 'Unknown';
    home = '';
  }

  // Use bet_type from API if available, otherwise infer from outcome/market_title
  let betType: BetType = 'Moneyline';

  if (apiSignal.bet_type) {
    // Map API bet_type to UI BetType
    const bt = apiSignal.bet_type.toLowerCase();
    if (bt === 'total' || bt === 'totals') {
      betType = 'Totals';
    } else if (bt === 'spread') {
      betType = 'Spread';
    } else if (bt === 'moneyline') {
      betType = 'Moneyline';
    }
  } else {
    // Fallback: infer from outcome and market_title
    const marketTitle = (apiSignal.market_title || '').toLowerCase();
    const outcome = (apiSignal.outcome || '').toLowerCase();

    if (outcome.startsWith('over') || outcome.startsWith('under')) {
      betType = 'Totals';
    } else if (marketTitle.includes('total') || marketTitle.includes('over/under')) {
      betType = 'Totals';
    } else if (marketTitle.includes('spread') || /[+-]\d/.test(apiSignal.outcome || '')) {
      betType = 'Spread';
    }
  }

  const entryPrice = apiSignal.avg_entry || 0;
  const currentPrice = apiSignal.current_price ?? entryPrice;

  // Calculate risk/reward ratio
  const rrRatio = currentPrice > 0 && currentPrice < 1
    ? (1 - currentPrice) / currentPrice
    : 0;

  return {
    id: apiSignal.id,
    sport: apiSignal.sport as Sport,
    betType,
    matchup: {
      away,
      home,
      gameTime: apiSignal.event_date ? new Date(apiSignal.event_date) : new Date(),
    },
    pick: {
      side: apiSignal.outcome,
      entryPrice,
      currentPrice,
    },
    signal: {
      consensusPercent: apiSignal.consensus_pct,
      whaleCount: apiSignal.traders,
      totalVolume: apiSignal.total_volume,
      weightedScore: apiSignal.signal_score,
      signalScore: apiSignal.signal_score,
      tier: apiSignal.tier === 1 || apiSignal.tier === 2 ? apiSignal.tier : null,
      rrRatio,
    },
    // Whale positions not available from API yet - would need separate endpoint
    whalePositions: [],
    checklist: {
      consensusPass: apiSignal.consensus_pct >= 80,
      traderCountPass: apiSignal.traders >= 3,
      priceCeilingPass: entryPrice <= 0.55,
      rrRatioPass: rrRatio >= 1.0,
      noHedging: true, // Not available from API
      noEliteConflict: true, // Not available from API
    },
    polymarketUrl: apiSignal.polymarket_url,
    firstSeenAt: new Date(apiSignal.first_seen_at),
    lastSeenAt: new Date(apiSignal.last_seen_at),
  };
}
