# Stoa Design System — MASTER
**Date:** 24/05/2026 | **Version:** 2.0 | **Owner:** Bar Amsalem

This is the single source of truth for all Stoa UI decisions. Every component, page, and visual element must follow these rules. When in doubt, refer here — not to previous code or guesses.

**v2.0 marks the completion of the full redesign.** The v2 design tokens, the `.surface` glass primitive, the `.t-*` typography roles, the `.btn-*` button system, and the `.tag-*` sentiment tags are now the only canonical styling vocabulary. Older shadcn-only patterns (`bg-primary`, `text-foreground`, etc.) still work because the HSL token system is wired to the same palette — but new code should use the v2 tokens.

---

## Color Palette

### Core Colors

| Token | Hex | Usage |
|-------|-----|-------|
| deepest-navy | #0A1A3F | Dark mode backgrounds, hero sections, nav bars, primary text on light |
| primary-blue | #1E3A8A | Buttons, badges, active states, links, Elo values |
| lighter-blue | #2E5090 | Hover states, secondary info, subtle accents |
| gold | #D4AF37 | CTAs, founding badges, premium signals, "this matters" moments |
| gold-light | #E8CC6E | Backgrounds behind gold text, subtle highlights, dark mode gold text |
| white (`--bg`) | #FAFAFA | Page background (light mode), card backgrounds |

### Market Sentiment Colors

**Use ONLY on:** Long/Short tags, Hit/Near/Partial/Miss/Open badges, gain/loss percentage indicators, sparkline strokes.
**Never use on:** stat cards, general UI, buttons, backgrounds, borders, or decorative elements.

| Token | Hex | Usage |
|-------|-----|-------|
| rolex-green | #0E6B45 | Positive — long positions, hits, gains |
| green-light | #1A8C5A | Lighter variant for backgrounds, hover |
| velvet-red | #922B3E | Negative — short positions, misses, losses |
| red-light | #B8475C | Lighter variant for backgrounds, hover |

### Neutrals

| Token | Hex | Usage |
|-------|-----|-------|
| n-50 | #FAFAFA | Page background |
| n-100 | #F4F2EE | Warm subtle background |
| n-150 | #ECEAE5 | Subtle background variant |
| n-200 | #E8E6E1 | Light borders, dividers |
| n-300 | #C4C2BD | Disabled states, placeholder text (`--text-faint`) |
| n-400 | #8A8884 | Secondary text, metadata, labels (`--text-meta`) |
| n-500 | #5C5B58 | Body text (`--text-mute`) |
| n-600 | #2C2B29 | Primary text body (`--text-body`) |

### Semantic Tokens (CSS variables in `src/index.css`)

These are the canonical day-to-day variables. Reference them directly — don't reach for the raw hex above unless you're styling the brand mark or the dark CTA section.

```css
/* Light mode (default) */
--bg:           #FAFAFA;       /* Page background */
--bg-elev:      #FFFFFF;       /* Cards on top of the page (e.g. inside .surface inner cells) */
--bg-soft:      rgba(30, 58, 138, 0.03);  /* Glass card fill */
--bg-softer:    rgba(30, 58, 138, 0.015); /* Hover state for .surface-interactive */
--text:         #0A1A3F;       /* Primary text (navy) */
--text-body:    #2C2B29;       /* Body copy */
--text-mute:    #5C5B58;       /* Secondary text */
--text-meta:    #8A8884;       /* Metadata / labels */
--text-faint:   #C4C2BD;       /* Placeholders / disabled */
--border-rgba:    rgba(30, 58, 138, 0.07);   /* Hairline border */
--border-strong:  rgba(30, 58, 138, 0.14);   /* Hover/focus border */
--hairline:       rgba(30, 58, 138, 0.10);   /* Generic 1px divider */
--top-edge:       linear-gradient(90deg, transparent, rgba(255,255,255,0.85) 50%, transparent);

/* Dark mode (`.dark`) */
--bg:           #0C1829;
--bg-elev:      #112138;
--bg-soft:      rgba(255, 255, 255, 0.05);
--bg-softer:    rgba(255, 255, 255, 0.025);
--text:         rgba(255, 255, 255, 0.92);
--text-body:    rgba(255, 255, 255, 0.78);
--text-mute:    rgba(255, 255, 255, 0.50);
--text-meta:    rgba(255, 255, 255, 0.36);
--text-faint:   rgba(255, 255, 255, 0.22);
--border-rgba:    rgba(255, 255, 255, 0.08);
--border-strong:  rgba(255, 255, 255, 0.18);
--hairline:       rgba(255, 255, 255, 0.12);
--top-edge:       linear-gradient(90deg, transparent, rgba(255,255,255,0.12) 50%, transparent);
```

> **Note on `--border`.** Tailwind's HSL system uses `--border` as a 3-channel HSL color (e.g. `hsl(var(--border))`). The v2 rgba border token is therefore named `--border-rgba` to avoid collision. When writing inline styles use `var(--border-rgba)`. When writing Tailwind classes use `border-border`.

---

## Typography

Three fonts. Each has a specific role. Don't mix them.

| Font | Weights | Role |
|------|---------|------|
| **Lora** (serif) | 400, 500, 600 | Analyst names, report headlines, article titles, display text, pull quotes |
| **Manrope** (sans-serif) | 400, 500, 600 | Body copy, UI labels, navigation, metadata, descriptions, tags |
| **Space Grotesk** (sans-serif) | 400, 500, 700 | Elo ratings, stats, numbers, percentages, ticker symbols, any data |

### Font Variables

```css
--f-serif:  'Lora', 'Georgia', serif;
--f-sans:   'Manrope', system-ui, -apple-system, sans-serif;
--f-mono:   'Space Grotesk', 'SF Mono', monospace;
```

### Type Role Classes (v2 — use these for new code)

| Class | Family | Size | Weight | Letter-spacing | Use |
|-------|--------|------|--------|----------------|-----|
| `.t-display` | Lora | 28–78px (clamp) | 500 | -0.022em | Hero H1, page-level display |
| `.t-headline` | Lora | — | 500 | -0.018em | Page-level headlines |
| `.t-title` | Lora | 14–22px | 500 | 0 | Card titles, sub-headings, report titles |
| `.t-body` | Manrope | 14px / 1.5 | 400 | 0 | Default body copy |
| `.t-meta` | Manrope | 12px | 400 | 0.02em | Labels, metadata, footnotes |
| `.t-eyebrow` | Manrope | 11px UPPER | 500 | 0.14em | Section eyebrows |
| `.t-num` | Space Grotesk | varies | 500 | tnum on | Any numeric value |
| `.t-serif` / `.t-sans` / `.t-mono` | family aliases | — | — | — | Family-only helper |

### Wordmark

`STOA` rendered as the `<StoaLogo>` component (`src/components/StoaLogo.jsx`). Uses Lora 500/600 with `letter-spacing: 0.32em` next to the three-pillar "Candle Colonnade" SVG mark. Use `<StoaLogo size={22} textSize="text-sm" />` for nav bars; larger sizes for hero and footer.

The `.wordmark` CSS class is the bare-bones variant for places where the React component is overkill — uses Lora 500 + 0.32em tracking with no logo mark.

---

## Design Line — Restrained Liquid Glass

Inspired by Apple Liquid Glass aesthetic, but dialed back for elegance. The glass frames the content — it never competes with it.

### Geometry tokens

```css
--r-card:   10px;   /* Cards (never higher) */
--r-tag:    4px;    /* Tags, badges, inputs */
--r-btn:    6px;    /* Buttons */
--hair:     0.5px;  /* ALL borders. Never 1px+. */
```

### Cards — `.surface` and variants

The single most important visual primitive. Every card on every screen uses one of these.

| Class | When to use |
|-------|-------------|
| `.surface` | Default glass card — `bg-soft` fill + `0.5px border-rgba` border + `::before` top-edge highlight |
| `.surface-flat` | Same chrome, solid `--bg-elev` fill — used for grid cells inside a `.surface` (the entry/target/exit blocks on a prediction card) |
| `.surface-interactive` | Add to a `.surface` to give it a hover state (`--bg-softer` bg + `--border-strong` border, 240ms ease) |
| `.surface-gold-edge` | For premium/locked-prediction surfaces — gold-tinted background wash + 0.5px gold border + gold top-edge highlight |
| `.surface-premium` | Hover-only premium gradient border (rare; reserved for paid-tier feature surfaces) |

All variants share: **border-radius: 10px**, **0.5px border**, **top-edge highlight via `::before`**, **no drop shadows**.

### Tags and Badges — `.tag` and variants

| Class | Color | Use |
|-------|-------|-----|
| `.tag` | Neutral | Default tag/badge (sectors, kinds, generic labels) |
| `.tag-long` | rolex-green | Long position |
| `.tag-short` | velvet-red | Short position |
| `.tag-hold` | text-mute | Hold position |
| `.tag-hit` | rolex-green | Resolved · Hit |
| `.tag-near` | rolex-green light | Resolved · Near |
| `.tag-partial` | gold | Resolved · Partial |
| `.tag-miss` | velvet-red | Resolved · Miss |
| `.tag-open` | primary-blue | Open / Tracking |

All tags: **height: 22px**, **padding: 0 8px**, **font-size: 10.5px**, **Manrope 500**, **letter-spacing: 0.08em**, **TEXT-TRANSFORM: UPPERCASE**, **border-radius: 4px**, **0.5px border**.

Founding/premium badge: use `.badge-founding` — gold tint background, gold border, 10px Manrope uppercase 1.2em tracking.

### Buttons — `.btn` and variants

| Class | Background | Text | Use |
|-------|------------|------|-----|
| `.btn-gold` | gold-hex | deepest-navy | Primary CTA, Subscribe, Publish |
| `.btn-primary` | primary-blue | white | Standard action |
| `.btn-ghost` | transparent | text | Secondary action, modal close, tab switcher |
| `.btn-ghost-gold` | transparent | gold | Gold-outlined secondary |
| `.btn-text` | transparent | text-mute | Tertiary inline link-style |

Sizes: `.btn-sm` (30px), default (38px), `.btn-lg` (46px). All `border-radius: 6px`. Active state: `translateY(0.5px)`. Focus ring: `2px primary-blue/50`, 3px offset.

### Borders

- **Always 0.5px.** Never 1px or 2px. This is a core part of the glass aesthetic. The only exceptions are nav-link underlines (1px) and tier-band dividers (1px) where the line itself is the content.
- Use `var(--border-rgba)` for default borders, `var(--border-strong)` for hover/focus, `var(--hairline)` for generic 1px page dividers.

### Ambient Glow — `.ambient`

- Soft blurred circles (`filter: blur(86px)`) of `--primary-blue` and `--gold-hex` in the background corners
- Opacity: 5–6% on light mode, 9–10% on dark mode
- Add `class="ambient"` to any container that needs an editorial backdrop (hero, KPI strip, end-of-article subscribe)
- Never spotlight-bright. Barely noticeable. Felt more than seen.

### Spacing

```css
--pad-card:    24px;   /* Default card padding */
--pad-section: 96px;   /* Default vertical section padding */
--gap-sm: 8px;
--gap-md: 16px;
--gap-lg: 24px;
--gap-xl: 40px;
```

Density variants: `.density-compact` and `.density-roomy` rescale the above. Default is `.density-regular` (no override needed).

### Motion tokens

```css
--ease:   cubic-bezier(0.2, 0.7, 0.2, 1);
--t-fast: 140ms;   /* Buttons, nav links, micro-interactions */
--t-base: 240ms;   /* Cards, surfaces, AI rail collapse */
--t-slow: 480ms;   /* Heavy state transitions (rare) */
```

Named animation classes: `.fade-up` (hero entrance), `.pulse-dot` (live indicators), `.scale-pulse` (like/follow tap), `.flash-up` / `.flash-down` (price ticks), `.shimmer` (skeleton loaders).

---

## Page Chrome — Layout shells

| Class | Use |
|-------|-----|
| `.page` | Page root — min-height 100vh, `--bg` background, `--text-body` color |
| `.shell` | Centered container — max-width 1240px, 32px horizontal padding |
| `.topbar` | Sticky 60px top nav with backdrop blur + 0.5px bottom hairline |
| `.topbar-inner` | The 100%-height flex row inside `.topbar` |
| `.nav-link` | Manrope 12px text link with animated active underline |
| `.input` / `.search` | 38px / 36px input shells with hairline border |
| `.hr` / `.vr` | 1px hairline divider (horizontal / vertical) |
| `.receipt` | Space Grotesk uppercase caption — used on locked-prediction cards |
| `.eyebrow` | Manrope 11px uppercase eyebrow (legacy synonym for `.t-eyebrow`) |

---

## Components (canonical React components)

| Component | Path | Purpose |
|-----------|------|---------|
| `StoaLogo` | `src/components/StoaLogo.jsx` | Three-pillar "Candle Colonnade" SVG + "S T O A" wordmark. Auto-recolors light/dark. |
| `Sparkline` | `src/components/charts/Sparkline.jsx` | Tiny inline trend SVG (used on analyst cards, ticker rows). `kind="pos"` / `kind="neg"`. |
| `TrackChart` | `src/components/charts/TrackChart.jsx` | Interactive Elo trajectory chart with hover crosshair + flipping tooltip past 62% width. Tier bands + grid + resolved-call annotation. |
| `AnalystCard` | `src/components/AnalystCard.jsx` | Stat-led analyst card — avatar + name + founding badge + Elo/accuracy/subs stats + sparkline rail + sector tags + gold Subscribe CTA. Exports `Avatar` as a named export. |
| `PredictionCard` | `src/components/PredictionCard.jsx` | The locked-prediction card. 4-cell entry/target/exit/return grid. Renders open (status="open") and resolved variants. |
| `SubscribeCTA` | `src/components/SubscribeCTA.jsx` | Canonical sidebar subscribe card with feature list + monthly/annual price + 90% payout footnote. |
| `TopNavV2` | `src/components/layout/TopNavV2.jsx` | Investor top nav — logo + text links + search + bell + avatar. Sticky 60px backdrop-blur. |
| `StudioSidebar` | `src/components/layout/StudioSidebar.jsx` | Analyst-side 240px vertical nav with mini analyst card at bottom. |
| `StoaCoverageBadge` | `src/pages/StocksPage.jsx` (inline) | Live "N open LONG" / "N open SHORT" / "N covering" / "No coverage" pill on the markets grid. The differentiator vs. a vanilla finance ticker browser. |

### Avatar geometry (`.av` class)

- **NOT a circle.** 8px rounded square. Navy background, white initials, hairline border.
- Sizes: `.av-sm` (28px), `.av-md` (38px), `.av-lg` (52px), `.av-xl` (84px).
- The 8px geometry is part of the editorial identity. Do not round corners higher.

### Stat geometry (`.stat` class)

Mini KPI card — used inside analyst cards and KPI strips.
- `.stat-label` — 10.5px Manrope uppercase 0.12em tracking, `--text-meta`
- `.stat-value` — 22px Space Grotesk 500 tabular numerals
- `.stat-sub` — 11px Manrope, `--text-meta`

The bigger `.stat-card` (28-36px values) is still available for hero KPI surfaces.

---

## Light Mode / Dark Mode

| Property | Light Mode | Dark Mode |
|----------|-----------|-----------|
| Page background | #FAFAFA | #0C1829 |
| Card background | rgba(30,58,138, 0.03) | rgba(255,255,255, 0.05) |
| Card border | rgba(30,58,138, 0.07) | rgba(255,255,255, 0.08) |
| Primary text | #0A1A3F | rgba(255,255,255, 0.92) |
| Secondary text | #5C5B58 | rgba(255,255,255, 0.50) |
| Metadata / labels | #8A8884 | rgba(255,255,255, 0.36) |
| Gold accent | #D4AF37 | #D4AF37 (mark stays) |
| Gold text (on dark bg) | — | #E8CC6E |
| Nav underline (active) | 1px solid #0A1A3F | 1px solid rgba(255,255,255, 0.4) |
| Ambient glow opacity | 5–6% | 9–10% |

Light mode is the default. Dark mode is supported but not the primary experience.

---

## Navigation Style

- Text links, not pill buttons
- Active state: animated underline (transform: scaleX) — 1px, 2px padding-bottom
- Font: Manrope 400, 12px, letter-spacing 0.04em
- No background highlights on nav items
- Two distinct nav surfaces:
  - **`TopNavV2`** — investor surfaces (Discover, Markets, Researcher, Reading, Studio). Editorial text links.
  - **`StudioSidebar`** — analyst surfaces (Overview, Compose, Predictions, Publications, Audience, Analytics, Earnings, Settings). 240px vertical column.

The current global `AppLayout.jsx` still uses a shadcn-styled investor header. New investor screens should prefer the `TopNavV2` shell for the canonical look; analyst dashboard screens use `StudioSidebar`.

---

## Page Layouts

### Landing (`src/pages/LandingPage.jsx`)
1. **Hero** — ambient 2-column. Left: pulsing live eyebrow + Lora 78px headline ("Think clearly. *Invest better.*") + 18px Manrope subhead + gold + ghost CTAs + 3-icon trust strip. Right: prediction card stack — front NVDA hit (full size), two back cards rotated ±2° at 78%/55% opacity.
2. **Metrics strip** — 4-column hairline-bordered cells, 36px Space Grotesk numbers, 11px Manrope labels.
3. **How it works** — section heading + 3-card glass grid (STEP 01/02/03 in gold eyebrows).
4. **Comparison table** — `Stoa | Substack | Seeking Alpha` matrix. Stoa column header in gold. Section background `--bg-soft` with top + bottom hairline borders.
5. **Analyst spotlight** — 3 `AnalystCard` instances in a 3-column grid, with "View leaderboard" ghost button.
6. **Final CTA** — full-bleed `--deepest-navy` section with ambient blue + gold blur orbs, Lora 68px headline ("Your track record / *is the product.*").
7. **Footer** — 4-column grid (brand + 3 link columns), hairline above bottom row.

### Discover (`src/pages/HomeFeed.jsx`)
- Section banner with view toggle (Trending / Following / Subscriptions / Researchers — Following + Subscriptions hidden for logged-out users).
- Filter row: sector chips + sort dropdown.
- 2-column grid (`1fr 1.7fr`): left rail sticky (top: 78px) with mini leaderboard + trending tickers + dark navy "For Researchers" promo card; right main column is the feed.
- Article cards have author row + kind badge + Lora 22px headline + Manrope excerpt + optional inline locked-prediction summary strip + footer (read-time / views / comments / ticker tags).

### Markets (`src/pages/StocksPage.jsx`)
- Hero: navy block (`--deepest-navy`) with `.ambient` orbs, green pulsing "Live market data" eyebrow, Lora 40px "US equities" heading. Right side: 4 live index tiles (SPY / QQQ / DIA / VIX) in glass-on-navy treatment.
- Watchlist section with `WatchRow` rows (gradient navy initial chip, ticker + name, Stoa coverage mini, price, market cap, % change pill, X to remove).
- Filter row: sector chips + exchange segmented control (All/NASDAQ/NYSE) + search input.
- Stock grid (responsive `auto-fill, minmax(220px, 1fr)`). Each `StockCard` has ticker, exchange tag, company name, price, change pill, market cap, and `StoaCoverageBadge`.

### Profile (`src/pages/AnalystProfilePage.jsx`)
1. **Ambient header**: breadcrumb → XL avatar (gold ring, Stoic badge below) + identity block (38px Lora name, handle, bio, metadata row) + action stack (Subscribe + Notify/Message/Share).
2. **KPI strip** — 5 cells with hairline dividers: Elo / Accuracy / Total Calls / Avg. Return / Subscribers.
3. **Tab row** — Track record / Research / Predictions / About. Active = animated underline.
4. **Body**: `1.5fr / 1fr` split (main + sidebar).
   - **Track tab**: Hero Elo chart card (TrackChart + range tabs + tier-band legend) → Grade distribution card (5 columns) → Resolved calls table (full audit list).
   - **Research tab**: Card list of analyst's reports.
   - **Predictions tab**: Open positions grid + Recently resolved grid.
   - **About tab**: Long-form serif bio + 3-column grid (coverage universe / publishing cadence / etc) + `CustomBlocksSection` (read-only public view).
   - **Sidebar**: `SubscribeCTA` → `SentimentBreakdown` → `AccuracyTierBadge` + `TierProgressBar`.
5. **Modals**: `ShareModal` + `WalletConfirmDialog`.

### Report (`src/pages/ReportView.jsx`)
- Centred 720px column. Breadcrumb top bar + Save/Share/Export PDF.
- Article body: kind+premium+read-time row → Lora 52px H1 → italic 19px dek → author bar (hairline top/bottom + inline Subscribe CTA) → **Locked Prediction Receipt** (sticky-feeling card with entry/target/stop/live-price grid) → body blocks (drop cap on first P, headings, paragraphs, pull quote, embedded metrics, bull/bear block) → **PredictionTrajectoryChart** (if report has a locked prediction) → **FactChecker** (Claude + Yahoo + SEC EDGAR claim classification) → reactions row → end-of-article subscribe card → **CommentsSection**.
- **More from analyst** section: 3-card grid.
- **Sticky bottom Subscribe CTA** for non-subscribers.

### Studio (`src/pages/AnalystDashboard.jsx`)
- 240px `Sidebar` (Overview / Compose / Predictions / Publications / Audience / Analytics / Earnings / Settings) + flexible main area.
- **Overview**: date eyebrow + "Welcome back, NAME." display heading + 4 KPI cards → 2-column (TrackChart + insights panel) → open predictions grid → top reports table.
- **Compose**: stripped editor preview that opens the dedicated `/editor`.
- **Audience**: 4 KPI cards + recent-subscribers table.
- **Earnings**: navy "available balance" card with gold display number + lifetime card + 6-month revenue bar chart + `RevenueInsightsPanel`.
- **Predictions**: stats row + Open and Recently Resolved grids.
- **Analytics**: `TwitsPanel` + `WatchlistPanel` + `RevenueInsightsPanel`.
- **Settings**: placeholder.

### Compose (`src/pages/ReportEditor.jsx`)
- Full-bleed editor replacing global nav.
- **56px sticky top bar**: Back to Studio → "Draft · Research Report" → autosave indicator (green pulsing dot + monospace timestamp) → spacer → quality score + word count + read-time → Templates + Design buttons → Preview + Lock & publish → AI toggle.
- **3-column body** (`260px outline / 1fr editor / 340px AI rail`). AI rail collapses to 0 when toggled off.
- **Outline rail**: live outline of block-level items (title, headings, prediction, metrics, bull/bear) + visibility/monetization toggles + "Predictions will lock on publish" gold callout.
- **Editor column**: 720px centred. Block sequence: kind badge row → blocks. Block types: `title`, `dek`, `h`, `p`, `prediction`, `metrics`, `bullbear`, `pullquote`, `image`. Drag-and-drop reordering via `@hello-pangea/dnd` (grip handle in left gutter). Insertion zones between every block — thin hairline that expands into a gold "+ Add block /" pill on hover. Global `/` shortcut opens the slash menu.
- **Slash menu**: centred modal with categories (Text / Finance / Media). Finance items get a gold-tinted tile.
- **AI rail**: "Generate report skeleton" gold CTA (opens `AISidebar` floating panel) + "Open AI chat" ghost CTA (opens `AIChat` floating panel).
- **Templates panel** + **Design panel**: full-screen modals opened from the top bar.
- **Preview modal**: fullscreen overlay showing the same blocks rendered as the published reader would see them.
- **Autosave**: debounce 1500ms, persists to `Report` entity. **Publish**: locks entry price via `fetchLockPrice`, creates a `Prediction` entity, flips status to `published`.

---

## Component Rules

### Analyst Profile Card (`AnalystCard`)
- Avatar: 52px `av-lg`, 8px radius (not circle), subtle border, optional gold ring for Stoic tier
- Name: Lora 500, 17px
- Founding badge: gold tint background, gold border, Manrope 10px uppercase, letter-spacing 1.2em
- Metadata: Manrope 400, 13px, `--text-meta`
- Stats strip: 3 cells (Elo / Accuracy / Subs) using `.stat`
- Sparkline rail: 38px tall with hairline top/bottom
- Footer: sector tags + `Subscribe · $XX/mo` gold button

### Stat Cards
- Numbers: Space Grotesk 500, 21–22px (`.stat-value`)
- Labels: Manrope 400, 10.5px, letter-spacing 0.12em uppercase (`.stat-label`)
- Accent label (e.g. "Top 8%"): gold color, 11px

### Track Record / Calls List
- Ticker: Manrope 500, 13px, primary text
- Direction tags (Long/Short): `.tag-long` / `.tag-short`, 4px radius
- Outcome tags (Hit/Near/Partial/Miss/Open): `.tag-hit` / `.tag-near` / `.tag-partial` / `.tag-miss` / `.tag-open`, 4px radius
- Metadata (target, timeframe): Manrope 400, 12px, `--text-meta`

### Locked Prediction Card (`PredictionCard`)
- Receipt header — `.receipt` style: "LOCKED · DATE YEAR · #ID"
- Direction tag (LONG/SHORT/HOLD) + N-day window meta
- Optional italic Lora serif thesis quote
- 4-cell grid (Entry / Target / Status-or-Exit / Return) — 0.5px border, `--bg-elev` cells with `--border-rgba` 1px gap
- Open variant: status="open", grade="OPEN", "—" for return
- Resolved variant: grade HIT/NEAR/PARTIAL/MISS, return colored by sign

### Subscribe Button (`SubscribeCTA`)
- Solid gold, deepest-navy text, border-radius 6px
- Format: `Subscribe · $XX/mo` with actual price (Space Grotesk for the number)
- Font: Manrope 500, 13px
- Always goes through `WalletConfirmDialog` before charging — shows balance, cost, new balance, 90/10 split

### Stoa Coverage Badge (`StoaCoverageBadge`)
- Pill-style (4px radius, 0.5px border, height ~20px) appearing in the footer of every ticker card.
- Variants:
  - **"N open LONG"** — green tint, when analysts have open LONG positions
  - **"N open SHORT"** — red tint, when analysts have open SHORT positions
  - **"N covering"** with `<Users>` icon — coverage but no open positions
  - **"No coverage"** (faint) — no analyst has published on it
- Sourced live from `Prediction` entity counts. The differentiator vs. a vanilla finance ticker browser — surface it everywhere a ticker appears.

---

## Anti-Patterns — Do NOT

- ❌ Use market green/red anywhere outside of sentiment tags and gain/loss deltas
- ❌ Use border-radius above 10px on cards or above 6px on buttons
- ❌ Use pill-shaped (fully rounded) tags or badges
- ❌ Use drop shadows of any kind — depth comes from `.surface` glass layering and `::before` top-edge highlights only
- ❌ Use borders thicker than 0.5px (exceptions: nav-link active underline, tier-band markers)
- ❌ Use bold body text — keep Manrope at 400 or 500, never 600+
- ❌ Mix font roles (don't use Space Grotesk for headlines or Lora for UI labels)
- ❌ Use generic placeholder colors — always pull from this palette
- ❌ Reintroduce shadcn `bg-card` / `text-foreground` patterns in new components — prefer the v2 token vocabulary (`.surface`, `var(--text-body)`)
- ❌ Add new components without first checking if `AnalystCard` / `PredictionCard` / `SubscribeCTA` / etc. already covers the need
- ❌ Hardcode hex values — use the CSS variables (`var(--gold-hex)`, `var(--rolex-green)`, etc.)

---

## File Map

```
src/
├── index.css                            # All v2 tokens + classes — the canonical stylesheet
├── components/
│   ├── StoaLogo.jsx                     # Three-pillar mark + Lora wordmark
│   ├── AnalystCard.jsx                  # Canonical analyst card (+ Avatar export)
│   ├── PredictionCard.jsx               # Locked prediction card
│   ├── SubscribeCTA.jsx                 # Sidebar subscribe card
│   ├── charts/
│   │   ├── Sparkline.jsx
│   │   └── TrackChart.jsx               # Interactive Elo chart
│   ├── layout/
│   │   ├── AppLayout.jsx                # Global investor shell (current default)
│   │   ├── TopNavV2.jsx                 # Canonical investor top nav (v2)
│   │   ├── StudioSidebar.jsx            # Canonical analyst sidebar (v2)
│   │   ├── AppFooter.jsx
│   │   ├── SearchBar.jsx
│   │   ├── NotificationCenter.jsx
│   │   └── MobileBottomNav.jsx
│   ├── profile/
│   │   ├── ShareModal.jsx
│   │   └── CustomBlocks.jsx
│   ├── wallet/
│   │   ├── WalletConfirmDialog.jsx
│   │   └── WalletPolicy.jsx
│   ├── report/
│   │   ├── FactChecker.jsx              # Claude + Yahoo + SEC claim classification
│   │   ├── CommentsSection.jsx
│   │   ├── PredictionTrajectoryChart.jsx
│   │   └── ExportPDFButton.jsx
│   └── editor/                          # AIChat, AISidebar, EditorBlock, PredictionBlock,
│                                        # SlashCommandMenu, TemplatesPanel, DesignPanel, etc.
└── pages/                               # The seven canonical screens (each has a *.backup.jsx
                                         # snapshot of its pre-v2 incarnation for reference)
```

---

## Authoring checklist (when adding any new UI)

1. Does the design exist in the prototype handoff (`design_handoff_stoa_redesign/`) or this MASTER? Check first.
2. Is there an existing v2 component (`AnalystCard`, `PredictionCard`, `SubscribeCTA`, `Sparkline`, `TrackChart`, `StoaLogo`) that already does this? Use it.
3. Pick the right surface class: `.surface` for default cards, `.surface-interactive` for clickable cards, `.surface-flat` for inner cells, `.surface-gold-edge` for premium/locked-prediction cards.
4. Pick the right typography class: `.t-display` / `.t-headline` / `.t-title` for serif, `.t-body` / `.t-meta` / `.t-eyebrow` for sans, `.t-num` for any number.
5. Pick the right tag/badge: neutral `.tag` by default; sentiment variants only when the value IS sentiment.
6. Pick the right button: `.btn-gold` for primary CTAs, `.btn-primary` for standard actions, `.btn-ghost` for secondary.
7. Verify against anti-patterns — no shadows, no >10px radii, no thick borders, no market color outside sentiment, no font-mixing.
8. Run `npm run lint` and `npm run build` before committing.
