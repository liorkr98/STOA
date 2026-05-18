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

MVP / closed beta. 50 analysts across 3 tiers, ~1,000 subscribers target. Built on Base44.

## Brand and Design System

- **Logo:** The Candle Colonnade — three architectural columns with ghost wicks (30% opacity hairlines) that read as candlestick charts
- **Wordmark:** STOA in spaced classical serif, letter-spacing 4-5px
- **Tagline:** "Think clearly. Invest better."
- **Full design system:** Follow design-system/MASTER.md for all UI work — colors, typography, spacing, components, and anti-patterns are defined there.

## Team

- **Bar** — Founder. Product, design, strategy, analyst recruitment. Not a developer. Uses Claude Code for design changes and frontend work.
- **Krisi** — Tech co-founder. Backend, infrastructure, core engineering. Code lives on Krisi's GitHub account.

## Rules for Claude Code

1. **Always explain changes in plain language.** Bar is not a developer — describe what you changed and why, not just the code.
2. **Always create a new branch before making changes.** Never push directly to main. Branch naming: design/[short-description] for Bar's design work.
3. **Show before/after when changing UI elements.** Describe the visual difference.
4. **Ask clarifying questions before making big changes.** If a request is ambiguous, ask — don't guess.
5. **Keep the design system consistent.** Always read design-system/MASTER.md before making any visual changes.
6. **When fixing bugs, explain what caused the bug** in simple terms before explaining the fix.
7. **Don't refactor or restructure code unless explicitly asked.** Stick to the specific request.
