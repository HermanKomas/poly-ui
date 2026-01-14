const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_KEY = import.meta.env.VITE_API_KEY || '';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(API_KEY && { 'X-API-Key': API_KEY }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

// API Types
export interface ApiSignal {
  id: number;
  market_slug: string;
  outcome: string;
  sport: string;
  tier: number;
  signal_score: number;
  consensus_pct: number;
  traders: number;
  total_volume: number;
  avg_entry: number;
  current_price: number | null;
  event_title: string;
  market_title: string;
  event_date: string | null;
  polymarket_url: string;
  first_seen_at: string;
  last_seen_at: string;
  alert_sent_at: string | null;
  resolved_at: string | null;
}

export interface ApiTrader {
  wallet: string;
  username: string | null;
  rank: number;
  leaderboard_pnl: number | null;
  total_positions: number | null;
  wins: number | null;
  losses: number | null;
  open_positions: number | null;
  win_rate: number | null;
  total_staked: number | null;
  total_pnl: number | null;
  roi_pct: number | null;
  first_seen_at: string | null;
  last_updated: string | null;
}

export interface ApiMeta {
  last_leaderboard_refresh: string | null;
  last_signals_refresh: string | null;
  cron_interval_minutes: number;
  is_refreshing: boolean;
  refresh_error: string | null;
}

export interface ApiWhalePosition {
  id: number;
  trader_wallet: string;
  condition_id: string;
  outcome: string;
  size: number;
  avg_price: number;
  current_value: number;
  status: string;
  pnl: number | null;
  resolved_at: string | null;
  first_seen_at: string;
  last_seen_at: string;
  username: string | null;
  rank: number | null;
}

// API Functions
export async function getSignals(params?: {
  sport?: string;
  tier?: number;
  hours?: number;
  include_resolved?: boolean;
}): Promise<{ signals: ApiSignal[]; count: number }> {
  const searchParams = new URLSearchParams();
  if (params?.sport) searchParams.set('sport', params.sport);
  if (params?.tier) searchParams.set('tier', String(params.tier));
  if (params?.hours) searchParams.set('hours', String(params.hours));
  if (params?.include_resolved) searchParams.set('include_resolved', 'true');

  const query = searchParams.toString();
  return fetchApi(`/api/signals${query ? `?${query}` : ''}`);
}

export async function getLeaderboard(limit = 100): Promise<{ traders: ApiTrader[]; count: number }> {
  return fetchApi(`/api/leaderboard?limit=${limit}`);
}

export async function getMeta(): Promise<ApiMeta> {
  return fetchApi('/api/meta');
}

export async function refreshLeaderboard(limit = 100): Promise<{ success: boolean; message: string }> {
  return fetchApi(`/api/leaderboard/refresh?limit=${limit}`, { method: 'POST' });
}

export async function refreshSignals(params?: {
  sport?: string;
  top_n?: number;
}): Promise<{ success: boolean; message: string }> {
  const searchParams = new URLSearchParams();
  if (params?.sport) searchParams.set('sport', params.sport);
  if (params?.top_n) searchParams.set('top_n', String(params.top_n));

  const query = searchParams.toString();
  return fetchApi(`/api/signals/refresh${query ? `?${query}` : ''}`, { method: 'POST' });
}

export async function getTraderPositions(wallet: string, sport?: string): Promise<{
  positions: unknown[];
  count: number;
}> {
  const searchParams = new URLSearchParams();
  if (sport) searchParams.set('sport', sport);

  const query = searchParams.toString();
  return fetchApi(`/api/traders/${wallet}/positions${query ? `?${query}` : ''}`);
}

export async function getSignalWhalePositions(signalId: number): Promise<{
  positions: ApiWhalePosition[];
  count: number;
  signal_outcome: string;
}> {
  return fetchApi(`/api/signals/${signalId}/positions`);
}

// Journal Types and Functions
export interface ApiJournalEntry {
  id: number;
  signal_id: number;
  outcome: string;
  stake: number;
  entry_price: number;
  potential_payout: number | null;
  status: 'open' | 'won' | 'lost' | 'sold';
  actual_payout: number | null;
  profit_loss: number | null;
  thesis: string | null;  // Notes field
  contradicts_signal: boolean;
  trade_date: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getSignalJournal(signalId: number): Promise<ApiJournalEntry> {
  return fetchApi(`/api/signals/${signalId}/journal`);
}

export async function createSignalJournal(
  signalId: number,
  notes?: string
): Promise<ApiJournalEntry> {
  return fetchApi(`/api/signals/${signalId}/journal`, {
    method: 'POST',
    body: JSON.stringify({ notes: notes || null }),
  });
}

export async function updateSignalJournalNotes(
  signalId: number,
  notes: string
): Promise<ApiJournalEntry> {
  return fetchApi(`/api/signals/${signalId}/journal`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
  });
}

export async function refreshSignalJournal(signalId: number): Promise<ApiJournalEntry> {
  return fetchApi(`/api/signals/${signalId}/journal/refresh`, {
    method: 'POST',
  });
}
