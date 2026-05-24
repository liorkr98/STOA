# CLAUDE.md — Stoa Project Context

## What is Stoa?

Stoa is a two-sided marketplace where independent financial analysts publish stock research and retail investors pay for it. Think OnlyFans but for stock market analysis.

Named after the ancient Athenian Stoa — a public gathering place for intellectual debate and commerce.

## How It Works

- Analysts sign up, create a profile, and publish research (reports, BUY/SELL calls, short posts)
- They set their own pricing — monthly subscriptions ($5–$200/mo) or pay-per-report ($1–$50)
- Every prediction an analyst makes (ticker, direction, target price, timeframe) is automatically logged and scored into a public track record using a modified Elo rating (600–1400 scale)
- Retail investors browse analysts, see their verified track records, and subscribe to the ones they trust
- The platform takes a 10% cut of all transactions
- All transactions in USD

## Three Content Types

| Type | Description | Feeds Track Record? |
|------|-------------|---------------------|
| Research Report | Long-form analysis, 1,000–5,000 words. Includes investment card. | Yes |
| BUY/SELL Call | Short call with investment card only. | Yes |
| Short Post | Market commentary, news reaction, insight. No investment card. | No |

## What Makes Stoa Different

1. **Analysts OWN their subscriber list** — unlike Seeking Alpha, which owns the relationship
2. **Verified public track record** that scores every call — this exists nowhere else
3. **Flexible monetization** — subscriptions + pay-per-report, analyst sets the price

The track record is the core moat. It's non-transferable — if an analyst leaves, their score stays on Stoa.

## Track Record Engine

- Every call is logged with: ticker, direction (Long/Short/Hold), target price, timeframe
- Entry price locks at moment of publication
- At timeframe end: system pulls final price and grades: Hit / Near Hit / Partial / Miss
- Modified Elo rating: 600–1400 scale
- Full vision: 80% technical scoring (accuracy + precision) + 20% social scoring (subscriber ratings, engagement). Social scoring is Phase 2.
- Track records are public, non-transferable, and permanent

## Current Stage

**MVP / closed beta. The full v2 UI/UX redesign is complete** (May 2026, branches `design/full-rebuild-v3` → `design/restore-features` → `design/update-docs`). Every primary screen has been rebuilt from scratch against the prototype handoff, with the original implementations preserved as `*.backup.jsx` snapshots. 50 analysts across 3 tiers, ~1,000 subscribers target. Built on Base44.

## Brand and Design System

- **Logo:** The Candle Colonnade — three architectural pillars with ghost wicks (≈30% opacity hairlines) that read as candlestick charts. Implemented in `src/components/StoaLogo.jsx`.
- **Wordmark:** STOA in spaced classical serif (Lora 500/600), letter-spacing `0.32em` (≈4–5px at typical sizes)
- **Tagline:** "Think clearly. Invest better."
- **Full design system:** Read `design-system/MASTER.md` (v2.0 dated 24/05/2026) before any UI change. It documents the v2 token vocabulary, every `.surface` / `.t-*` / `.btn-*` / `.tag-*` class, the canonical React components, the page layouts for all seven screens, and the anti-patterns list.

### The seven canonical screens

| Screen | File | Purpose |
|--------|------|---------|
| Landing | `src/pages/LandingPage.jsx` | Public marketing — hero with prediction card stack |
| Discover | `src/pages/HomeFeed.jsx` | Investor feed (Trending / Following / Subscriptions / Researchers) |
| Markets | `src/pages/StocksPage.jsx` | Ticker browser with the live Stoa coverage badge |
| Profile | `src/pages/AnalystProfilePage.jsx` | The analyst's public surface — the hero of Stoa |
| Report | `src/pages/ReportView.jsx` | Long-form reading view + FactChecker + comments |
| Studio | `src/pages/AnalystDashboard.jsx` | Analyst's home base — Overview / Compose / Audience / Earnings / etc. |
| Compose | `src/pages/ReportEditor.jsx` | Full-bleed block editor with AI sidebar |

### Canonical v2 components (use these — don't re-invent)

- `StoaLogo` — `src/components/StoaLogo.jsx`
- `Sparkline` — `src/components/charts/Sparkline.jsx`
- `TrackChart` — `src/components/charts/TrackChart.jsx`
- `AnalystCard` (and named export `Avatar`) — `src/components/AnalystCard.jsx`
- `PredictionCard` — `src/components/PredictionCard.jsx`
- `SubscribeCTA` — `src/components/SubscribeCTA.jsx`
- `TopNavV2` — `src/components/layout/TopNavV2.jsx` (investor pages)
- `StudioSidebar` — `src/components/layout/StudioSidebar.jsx` (analyst pages)
- `StoaCoverageBadge` — inline in `src/pages/StocksPage.jsx` (the differentiating ticker badge)
- Existing utility components are still canonical and must be reused: `ShareModal`, `WalletConfirmDialog`, `FactChecker`, `CommentsSection`, `PredictionTrajectoryChart`, `ExportPDFButton`, `AISidebar`, `AIChat`, `TemplatesPanel`, `DesignPanel`, `CustomBlocksSection`, `AccuracyTierBadge`, `TierProgressBar`.

## Team

- **Bar** — Founder. Product, design, strategy, analyst recruitment. Not a developer. Uses Claude Code for design changes and frontend work.
- **Krisi** — Tech co-founder. Backend, infrastructure, core engineering. Code lives on Krisi's GitHub account.

## Rules for Claude Code

### Process
1. **Always explain changes in plain language.** Bar is not a developer — describe what you changed and why, not just the code.
2. **Always create a new branch before making changes.** Never push directly to main. Branch naming: `design/[short-description]` for Bar's design work.
3. **Show before/after when changing UI elements.** Describe the visual difference.
4. **Ask clarifying questions before making big changes.** If a request is ambiguous, ask — don't guess.
5. **When fixing bugs, explain what caused the bug** in simple terms before explaining the fix.
6. **Don't refactor or restructure code unless explicitly asked.** Stick to the specific request.
7. **Don't delete `*.backup.jsx` files** without explicit permission — they're the snapshots of the pre-redesign pages and serve as the reference for restoring lost features.

### Design system (v2 — strictly enforced)
8. **Read `design-system/MASTER.md` before any visual change.** It is the single source of truth.
9. **Use v2 tokens for new code.** Reach for `.surface`, `.t-display` / `.t-title` / `.t-body` / `.t-meta` / `.t-eyebrow` / `.t-num`, `.btn-gold` / `.btn-primary` / `.btn-ghost` / `.btn-ghost-gold` / `.btn-text`, `.tag` / `.tag-long` / `.tag-short` / `.tag-hit` / `.tag-near` / `.tag-partial` / `.tag-miss` / `.tag-open`, `.av-sm/md/lg/xl`, `.ambient`, `.pulse-dot`, `.fade-up`, `.receipt`, `.shell`, `.page`. Don't reinvent these in inline styles.
10. **Never reintroduce drop shadows.** Depth comes from `.surface` glass layering and the `::before` top-edge highlight alone. The `--shadow-*` tokens are zeroed out and must stay that way.
11. **Never use border-radius above 10px on cards or above 6px on buttons.** Tags are 4px.
12. **Never use borders thicker than 0.5px** (only exceptions are nav-link active underlines and tier-band markers, where the line itself is the content).
13. **Sentiment colors (rolex-green, velvet-red, and their `green-light`/`red-light` variants) are restricted to:** direction tags (Long/Short), grade tags (Hit/Near/Partial/Miss/Open), gain/loss percentages, and sparkline strokes. Never on stat cards, general UI, buttons, backgrounds, borders, or decorative elements.
14. **Use the right font for the role.** Lora → display + headlines + report titles + pull quotes. Manrope → body + UI + labels + navigation. Space Grotesk → all numbers. Don't mix.
15. **Use `TopNavV2` for investor pages and `StudioSidebar` for analyst pages.** The shadcn-styled `AppLayout` header is still the global default, but new investor-side screens should prefer `TopNavV2` for the canonical look. The `/editor` route deliberately replaces the global nav (full-bleed compose).
16. **Use `var(--border-rgba)` for default 0.5px hairlines**, `var(--border-strong)` for hover/focus, `var(--hairline)` for generic page dividers. `--border` is a 3-channel HSL color reserved for the shadcn `border-border` class — don't put it in an inline `border:` shorthand.
17. **Don't hardcode hex values.** Use CSS variables (`var(--gold-hex)`, `var(--rolex-green)`, `var(--primary-blue)`, `var(--deepest-navy)`, `var(--text)`, `var(--text-mute)`, etc.). Direct hex is only acceptable for the brand mark and dark navy CTA sections where the value is documentation.
18. **Subscribe flows always go through `WalletConfirmDialog`.** Don't fire `subscribeAnalyst` (or any wallet spend) without showing the buyer the cost, balance, new balance, and 90/10 split first.

### Code quality
19. **Run `npm run lint` and `npm run build` before committing.** Both must pass clean.
20. **Default to no comments in code.** Only add one when the WHY is non-obvious (a hidden constraint, a subtle invariant, a workaround for a specific bug, behavior that would surprise a reader).
21. **Preserve data wiring when restyling.** When updating a page's visual layer, keep all existing Base44 entity calls (`base44.entities.*`), wallet/scoring/score-engine imports, autosave plumbing, view tracking, and analytics events. The `*.backup.jsx` files are the source for any data layer you need to graft back in.
