# Whale Tracer Dashboard - Design Spec

## Overview
A mobile-first dashboard for viewing sports betting signals from the Whale Tracer system. Displays smart money consensus plays with detailed breakdowns.

## Tech Stack
- React + TypeScript
- shadcn/ui components
- Tailwind CSS
- Mobile-first responsive design

---

## Views

### 1. Signal List (Home View)

**Layout:** Grid of signal cards
- Mobile (< 640px): 1 column
- Tablet (640px - 1024px): 2 columns  
- Desktop (> 1024px): 3 columns

**Signal Card Contents:**
```
┌─────────────────────────────────┐
│ [Sport Icon] NBA Totals         │  ← Category badge (color-coded)
│                                 │
│ Lakers @ Warriors               │  ← Matchup (bold, prominent)
│ Over 224.5                      │  ← Pick
│                                 │
│ 87% consensus · 5 whales        │  ← Key stats
│                                 │
│ [🟢 Tier 1]        Entry: 48¢   │  ← Tier badge + price
│ R/R: 2.08:1                     │  ← Risk/reward ratio
└─────────────────────────────────┘
```

**Card Styling:**
- Tier 1 signals: subtle green left border (border-l-4 border-green-500)
- Tier 2 signals: subtle yellow left border (border-l-4 border-yellow-500)
- Excluded/failed: gray, muted appearance
- Hover: slight elevation shadow
- Tap/click: opens detail modal

**Card Color Coding by Sport:**
- NBA: orange accent
- NHL: blue accent
- NFL: green accent
- CBB: purple accent
- CFB: red accent

**Header Bar:**
- Title: "Whale Tracer"
- Filter chips: All | NBA | NHL | NFL | CBB | CFB
- Sort: Tier (default) | Time | Consensus %
- Refresh button with last-updated timestamp

---

### 2. Signal Detail Modal

**Trigger:** Click/tap on any signal card

**Modal Behavior:**
- Centered overlay (shadcn Dialog component)
- Mobile: nearly full-screen (95% width, max-height 90vh, scrollable)
- Desktop: max-width 600px, centered
- Close: X button, click outside, or swipe down on mobile

**Modal Content Structure:**

```
┌──────────────────────────────────────────┐
│ [X]                                      │
│                                          │
│ Lakers @ Warriors                        │  ← Matchup title
│ NBA Totals · Jan 13, 7:30 PM ET         │  ← Category + game time
│                                          │
│ ─────────────────────────────────────── │
│                                          │
│ THE PICK                                 │
│ ┌──────────────────────────────────────┐ │
│ │  OVER 224.5                          │ │  ← Large, prominent
│ │  Entry: 48¢  →  Current: 51¢ (+3¢)   │ │  ← CLV indicator
│ └──────────────────────────────────────┘ │
│                                          │
│ SIGNAL STRENGTH                          │
│ ┌──────────────────────────────────────┐ │
│ │ Consensus     [████████░░] 87%       │ │
│ │ Whale Count   5 traders              │ │
│ │ Total Volume  $45,230                │ │
│ │ Signal Score  0.89 (Tier 1)          │ │
│ │ R/R Ratio     2.08:1 🟢              │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ WHALE POSITIONS                          │
│ ┌──────────────────────────────────────┐ │
│ │ 🐋 MrBlue        $12,400 @ 46¢      │ │
│ │ 🐋 MrIndigo      $8,200 @ 47¢       │ │
│ │ 🐋 whale_xyz     $15,100 @ 49¢      │ │
│ │ 🐋 kch123        $5,030 @ 48¢       │ │
│ │ 🐋 shark_fin     $4,500 @ 50¢       │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ CHECKLIST                                │
│ ✅ Consensus ≥80%                        │
│ ✅ Traders ≥3                            │
│ ✅ Price ≤55¢                            │
│ ✅ R/R ≥1.0:1                            │
│ ✅ No hedging                            │
│ ✅ No elite conflicts                    │
│                                          │
│ ─────────────────────────────────────── │
│                                          │
│ [ View on Polymarket ↗ ]                 │  ← External link button
│                                          │
└──────────────────────────────────────────┘
```

**Checklist Logic:**
- Green checkmark (✅) if rule passes
- Red X (❌) if rule fails
- Any failed rule = signal is excluded/grayed in list

---

## Component Hierarchy

```
App
├── Header
│   ├── Title
│   ├── FilterChips
│   ├── SortDropdown
│   └── RefreshButton
├── SignalGrid
│   └── SignalCard (multiple)
└── SignalDetailModal
    ├── MatchupHeader
    ├── PickDisplay
    ├── SignalStrengthSection
    ├── WhalePositionsTable
    ├── ChecklistSection
    └── PolymarketLink
```

---

## Data Types

```typescript
interface Signal {
  id: string;
  sport: 'NBA' | 'NHL' | 'NFL' | 'CBB' | 'CFB';
  betType: 'Totals' | 'Spread' | 'Moneyline';
  matchup: {
    away: string;
    home: string;
    gameTime: Date;
  };
  pick: {
    side: string;        // "Over 224.5" or "Lakers -3.5" or "Lakers ML"
    entryPrice: number;  // 0.48
    currentPrice: number;
  };
  signal: {
    consensusPercent: number;
    whaleCount: number;
    totalVolume: number;
    weightedScore: number;
    signalScore: number;
    tier: 1 | 2 | null;  // null = excluded
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
}

interface WhalePosition {
  name: string;
  amount: number;
  entryPrice: number;
  isElite: boolean;  // MrBlue, MrIndigo, etc.
}
```

---

## Styling Guidelines

### Colors (use Tailwind/shadcn defaults where possible)
- Background: neutral-50 (light) / neutral-950 (dark mode)
- Cards: white / neutral-900
- Primary accent: blue-600
- Tier 1: green-500
- Tier 2: yellow-500
- Excluded: neutral-400
- Sport accents: as defined above

### Typography
- Matchup titles: font-semibold text-lg
- Pick display: font-bold text-xl
- Stats/labels: text-sm text-muted-foreground
- Numbers/prices: font-mono

### Spacing
- Card padding: p-4
- Grid gap: gap-4
- Section spacing in modal: space-y-6

### Mobile Considerations
- Touch targets minimum 44px
- Cards should be tappable anywhere
- Modal should be scrollable with sticky close button
- No hover-only interactions

---

## Phase 1 Scope (This Build)
1. ✅ Signal card grid (responsive)
2. ✅ Signal detail modal
3. ✅ Filter by sport
4. ✅ Sort by tier/time/consensus
5. ✅ Mock data for development

## Future Phases
- Real-time data from Whale Tracer API
- Auto-refresh with ntfy notifications
- Dark mode toggle
- Position tracking (your open bets)
- Historical performance view

---

## Notes for Claude Code
- Use shadcn/ui Dialog for the modal
- Use shadcn/ui Card for signal cards
- Use shadcn/ui Badge for tier/sport indicators
- Use shadcn/ui Progress or custom bar for consensus display
- Keep all components in `src/components/`
- Use `cn()` utility for conditional classes
- Mobile-first: start with mobile styles, add `sm:`, `md:`, `lg:` breakpoints
