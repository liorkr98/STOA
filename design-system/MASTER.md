# Stoa Design System — MASTER
**Date:** 18/05/2026 | **Version:** 1.0 | **Owner:** Bar Amsalem

This is the single source of truth for all Stoa UI decisions. Every component, page, and visual element must follow these rules. When in doubt, refer here — not to previous code or guesses.

---

## Color Palette

### Core Colors

| Token | Hex | Usage |
|-------|-----|-------|
| deepest-navy | #0A1A3F | Dark mode backgrounds, hero sections, nav bars |
| primary-blue | #1E3A8A | Buttons, badges, active states, links |
| lighter-blue | #2E5090 | Hover states, secondary info, subtle accents |
| gold | #D4AF37 | CTAs, founding badges, premium signals |
| gold-light | #E8CC6E | Backgrounds behind gold text, subtle highlights, dark mode gold text |
| white | #FAFAFA | Page background (light mode), card backgrounds |

### Market Sentiment Colors

**Use ONLY on:** Long/Short tags, Hit/Partial/Miss badges, gain/loss percentage indicators.
**Never use on:** stat cards, general UI, buttons, backgrounds, borders, or decorative elements.

| Token | Hex | Usage |
|-------|-----|-------|
| rolex-green | #0E6B45 | Positive — long positions, hits, gains |
| green-light | #1A8C5A | Lighter variant for backgrounds, hover |
| velvet-red | #922B3E | Negative — short positions, misses, losses |
| red-light | #B8475C | Lighter variant for backgrounds, hover |

### Neutrals

| Hex | Usage |
|-----|-------|
| #E8E6E1 | Light borders, dividers, subtle backgrounds |
| #C4C2BD | Disabled states, placeholder text |
| #8A8884 | Secondary text, metadata, labels |
| #5C5B58 | Body text (light mode) |
| #2C2B29 | Primary text (light mode) |

---

## Typography

Three fonts. Each has a specific role. Do not mix them.

| Font | Weights | Role |
|------|---------|------|
| Lora (serif) | 400, 500, 600 | Analyst names, report headlines, article titles, display text |
| Manrope (sans-serif) | 400, 500 | Body copy, UI labels, navigation, metadata, descriptions, tags |
| Space Grotesk (sans-serif) | 400, 500, 700 | Elo ratings, stats, numbers, percentages, any data display |

### Google Fonts Import

Add a Google Fonts import for Lora weights 400 500 600, Manrope weights 400 500, and Space Grotesk weights 400 500 700. Construct the import URL yourself.

### Wordmark

STOA wordmark uses letter-spacing: 4-5px, font-weight: 500, in the primary text color of the current mode.

---

## Design Line — Restrained Liquid Glass

Inspired by Apple Liquid Glass aesthetic, but dialed back for elegance. The glass frames the content — it never competes with it.

### Cards

- Border-radius: 10px (never higher)
- Light mode: background rgba(30, 58, 138, 0.03), border 0.5px solid rgba(30, 58, 138, 0.07)
- Dark mode: background rgba(255, 255, 255, 0.05), border 0.5px solid rgba(255, 255, 255, 0.08)
- Top-edge highlight: 0.5px gradient line across the top edge — linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent) for light mode, rgba(255,255,255,0.12) for dark mode
- No drop shadows. Depth comes from layering and the top-edge highlight only.

### Tags and Badges

- Border-radius: 4px (squared off — not pills, not fully rounded)
- Style: 0.5px border with low-opacity background fill
- Letter-spacing: 0.5-1px on uppercase labels

### Buttons

- Primary CTA: solid gold (#D4AF37) background, deepest-navy text, border-radius 6px
- Secondary/ghost: gold outline (0.5px border), transparent background, gold text
- Standard actions: primary-blue background, white text, border-radius 6px

### Borders

- Always 0.5px. Never 1px or 2px. This is a core part of the glass aesthetic.

### Ambient Glow

- Soft blurred circles (filter: blur 80-90px) of primary-blue and gold in the background
- Opacity: 4-7% on light mode, 7-12% on dark mode
- Touch/cursor reactive — glow shifts position subtly when the user moves their pointer
- Never spotlight-bright. Barely noticeable. Felt more than seen.

### Spacing

- Generous vertical spacing between sections
- Letter-spacing: 0.5-1.5px on small uppercase labels
- Do not crowd elements — when in doubt, add more space

---

## Light Mode / Dark Mode

| Property | Light Mode | Dark Mode |
|----------|-----------|-----------|
| Page background | #FAFAFA | #0C1829 |
| Card background | rgba(30,58,138, 0.03) | rgba(255,255,255, 0.05) |
| Card border | rgba(30,58,138, 0.07) | rgba(255,255,255, 0.08) |
| Primary text | #0A1A3F | rgba(255,255,255, 0.92) |
| Secondary text | #5C5B58 | rgba(255,255,255, 0.4) |
| Metadata / labels | #8A8884 | rgba(255,255,255, 0.3) |
| Gold accent | #D4AF37 | #D4AF37 (same) |
| Gold text (on dark bg) | — | #E8CC6E |
| Nav underline (active) | 1px solid #0A1A3F | 1px solid rgba(255,255,255, 0.4) |
| Ambient glow opacity | 4-5% | 7-10% |

Light mode is the default. Dark mode is supported but not the primary experience.

---

## Navigation Style

- Text links, not pill buttons
- Active state: underline (1px, 2px padding-bottom)
- Font: Manrope 400, 12px, letter-spacing 0.5px
- No background highlights on nav items

---

## Component Rules

### Analyst Profile Card
- Avatar: 50-52px, border-radius 8px (not circle), with subtle border
- Name: Lora 500, 17-18px
- Founding badge: gold tint background, gold border, Manrope 10px uppercase, letter-spacing 1px
- Metadata: Manrope 400, 13px, #8A8884

### Stat Cards
- Numbers: Space Grotesk 500, 21-22px
- Labels: Manrope 400, 11px, letter-spacing 0.5px
- Accent label (e.g. Top 8%): gold color, 11px

### Track Record / Calls List
- Ticker: Manrope 500, 13px, primary text
- Direction tags (Long/Short): 4px radius, market colors only
- Outcome tags (Hit/Partial/Miss): 4px radius, market colors only
- Metadata (target, timeframe): Manrope 400, 12px, secondary text

### Subscribe Button
- Solid gold, deepest-navy text, border-radius 6px
- Format: "Subscribe . $XX/mo"
- Font: Manrope 500, 12-13px

---

## Anti-Patterns — Do NOT

- Use market green/red anywhere outside of sentiment tags
- Use border-radius above 10px on cards or above 6px on buttons
- Use pill-shaped (fully rounded) tags or badges
- Use drop shadows (depth comes from glass layering only)
- Use borders thicker than 0.5px
- Use bold body text — keep Manrope at 400 or 500, never 600+
- Mix font roles (do not use Space Grotesk for headlines or Lora for UI labels)
- Use generic placeholder colors — always pull from this palette
