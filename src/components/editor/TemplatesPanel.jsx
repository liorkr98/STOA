import React, { useState } from "react";
import { X, Search, TrendingUp, BarChart3, Zap, Shield, Globe,
         DollarSign, Activity, AlertTriangle, Target, Layers,
         BookOpen, PieChart, Cpu } from "lucide-react";

// ── Category colors ──────────────────────────────────────────
const CATS = {
  "Deep Dive":    { color: "#1E3A8A", bg: "#e8f0fe" },
  "Quick Take":   { color: "#b45309", bg: "#fef3c7" },
  "Technical":    { color: "#065f46", bg: "#d1fae5" },
  "Macro":        { color: "#6d28d9", bg: "#ede9fe" },
  "Special":      { color: "#9f1239", bg: "#ffe4e6" },
};

// ── Helper to build blocks ──────────────────────────────────
const b = (type, content, extra = {}) => ({
  id: Date.now() + Math.random(),
  type, content, ...extra
});

// ══════════════════════════════════════════════════════════════
// 15 TEMPLATES
// ══════════════════════════════════════════════════════════════
const TEMPLATES = [

  // ─────────────────────────────────────────────────────────────
  // 1. INSTITUTIONAL DEEP DIVE (Goldman Sachs style)
  // ─────────────────────────────────────────────────────────────
  {
    id: "institutional-deep-dive",
    name: "Institutional Deep Dive",
    category: "Deep Dive",
    icon: BookOpen,
    description: "Goldman Sachs–style full-coverage initiation. 1,500–3,000 words. All sections.",
    estimatedTime: "2–3 hours",
    wordCount: "1,500–3,000",
    blocks: [
      b("heading",  "Investment Thesis & Rating"),
      b("callout",  "⭐ RATING: BUY  |  Price Target: $XXX  |  Current Price: $XXX  |  Upside: +XX%\nConviction Level: High  |  Time Horizon: 12 months", { icon: "⭐", color: "blue" }),
      b("text",     "We initiate coverage of [COMPANY] ($TICKER) with a BUY rating and a 12-month price target of $XXX, implying XX% upside from current levels. Our conviction is grounded in three structural drivers: [briefly name all three]. We believe the market is materially underappreciating [KEY MISPRICING]."),

      b("heading",  "Executive Summary"),
      b("text",     "[COMPANY] is a [market cap]-cap [sector] company that [core business in one sentence]. Founded in [year], the company [key milestone]. With $[X]B in annual revenue and XX% operating margins, [COMPANY] stands as [market position]. Despite recent [headwind], we see a clear path to [upside case]."),
      b("bullets",  "Dominant market position: [X]% share in [TAM] growing at [X]% CAGR\nExpanding margins: Operating margins inflecting from XX% to XX% over 24 months\nCatalyst-rich 12 months: [Product launch] / [Earnings inflection] / [M&A] in Q[X] 2025\nValuation disconnect: Trading at [X]x forward P/E vs. peers at [X]x — [X]% discount unwarranted"),

      b("heading",  "Business Overview"),
      b("text",     "[COMPANY] operates across [X] business segments: [Segment 1] (XX% of revenue), [Segment 2] (XX%), and [Segment 3] (XX%). The core product [describe]. Revenue is [recurring %]% recurring, giving visibility into forward estimates. The company serves [customer type] across [X] countries, with [X]% of revenue from the US."),

      b("heading",  "Industry & Competitive Landscape"),
      b("text",     "The [TAM] market is a $[X]B opportunity growing at [X]% CAGR through [year], driven by [secular driver 1] and [secular driver 2]. [COMPANY]'s competitive moat is built on [IP / network effects / switching costs / cost advantage]. Key competitors include [Comp 1] ($XX stock, [X]x P/E) and [Comp 2] ($XX stock). We view [COMPANY]'s position as [defensible/improving/dominant]."),
      b("quote",    "\"[Relevant direct quote from management or industry expert that supports the thesis.]\" — [Source, Date]"),

      b("heading",  "Financial Analysis"),
      b("text",     "Revenue has grown at a [X]% CAGR over the past 3 years, reaching $[X]B in FY[X]. We model [X]% revenue growth in FY[X+1] driven by [driver]. Gross margins of [X]% are [expanding/stable] due to [reason]. EBITDA margins of [X]% compare favorably to peers at [X]%. FCF conversion of [X]% supports our [X]x EV/EBITDA valuation."),
      b("stockchart","", { ticker: "AAPL" }),
      b("text",     "Key financial metrics: P/E [X]x (fwd), EV/EBITDA [X]x, P/S [X]x, P/FCF [X]x, Debt/EBITDA [X]x, ROIC [X]%, Net Debt $[X]B. Balance sheet is [strong/leveraged], with $[X]B cash and [X]x interest coverage."),

      b("heading",  "Valuation: Three-Method Analysis"),
      b("text",     "We use three methodologies to triangulate intrinsic value: (1) DCF with [X]% WACC and [X]% terminal growth yields $[X]. (2) Comparable company analysis: peers trade at [X]x forward EBITDA; applying [X]x to our FY[X+2] EBITDA estimate yields $[X]. (3) Sum-of-parts analysis values [Segment A] at $[X] and [Segment B] at $[X], for a SOTP of $[X]. Blending all three, we arrive at a $[X] price target."),

      b("heading",  "Key Risks"),
      b("bullets",  "Macro sensitivity: [X]% revenue is cyclical; recession could reduce EBITDA by [X]%\nCompetitive risk: [Competitor] entering the market with [product] in [timeframe]\nExecution risk: [Integration / turnaround / product launch] must deliver by Q[X]\nRegulatory risk: [Specific regulatory concern] could impact [specific business line]\nValuation risk: Multiple compression if growth disappoints vs. [X]x consensus estimate"),

      b("heading",  "Conclusion & Price Target"),
      b("text",     "We rate [COMPANY] a BUY with a 12-month price target of $[X], representing [X]% upside. The stock is currently underowned by institutional investors ([X]% institutional ownership vs. [X]% peer average), which we view as a setup for multiple expansion as [catalysts] materialize. We would add aggressively on any weakness below $[X] (our bear case). Key dates to watch: [Earnings / Investor Day / Product Launch]."),

      b("text",     "⚠️ Disclaimer: This report is for informational purposes only and does not constitute financial advice. Always do your own research (DYOR) before making any investment decisions."),
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 2. EARNINGS REACTION — Morgan Stanley Update Style
  // ─────────────────────────────────────────────────────────────
  {
    id: "earnings-reaction",
    name: "Earnings Reaction",
    category: "Quick Take",
    icon: Activity,
    description: "Post-earnings analysis. Beat/miss breakdown, guidance revision, PT update.",
    estimatedTime: "30–45 min",
    wordCount: "400–700",
    blocks: [
      b("heading", "Earnings Snapshot: [$TICKER] Q[X] 2025"),
      b("callout", "📊 RESULT: BEAT / MISS / IN-LINE\nRevenue: $XXXm vs $XXXm est (+X% beat)\nEPS: $X.XX vs $X.XX est (+X% beat)\nGuidance: RAISED / LOWERED / MAINTAINED\nOur View: Maintaining BUY | PT: $XXX", { icon: "📊", color: "blue" }),

      b("heading", "What the Numbers Say"),
      b("bullets", "Revenue of $[X]B [beat/missed] by [X]% — driven by [segment strength/weakness]\nEPS of $[X] [beat/missed] Street by $[X.XX] — [one-sentence reason]\nGross margin of [X]% [expanded/contracted] [X]bps YoY — [reason]\nFree cash flow of $[X]B [vs. $[X]B last quarter — [trend note]"),

      b("heading", "Guidance & Forward Look"),
      b("text",    "Management guided Q[X+1] revenue of $[X]–$[X]B vs. Street at $[X]B — a [X]% [beat/miss]. Full-year guidance was [raised to / maintained at / lowered to] $[X]–$[X]B. [One sentence on what drove the revision]. We [increase/decrease/maintain] our FY[X] estimates by [X]%."),

      b("heading", "The Key Call-Out: [Most Important Point]"),
      b("quote",   "\"[The most important quote from the earnings call — something management said that is the key insight.]\" — [CEO/CFO Name], Q[X] Earnings Call"),
      b("text",    "This matters because [explain in 2–3 sentences why this specific quote or metric changes the thesis / confirms it / introduces risk]."),

      b("heading", "Our Take: [Maintaining / Upgrading / Downgrading]"),
      b("text",    "These results [confirm / challenge] our thesis. [Specifically, what did you expect and what did you get?]. We are [maintaining our BUY / revising our view] with a [unchanged / revised] PT of $[X]. The market's [X]% reaction [seems overdone / is justified] because [reason]. We would [buy this dip / wait for more clarity at $[X]]."),

      b("text",    "⚠️ Disclaimer: This report is for informational purposes only and does not constitute financial advice."),
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 3. TECHNICAL CHART ANALYSIS
  // ─────────────────────────────────────────────────────────────
  {
    id: "technical-analysis",
    name: "Technical Chart Analysis",
    category: "Technical",
    icon: BarChart3,
    description: "Chart-first report. Support/resistance, trend analysis, entry/exit levels.",
    estimatedTime: "30–60 min",
    wordCount: "300–600",
    blocks: [
      b("heading", "Technical Analysis: $[TICKER]"),
      b("callout", "📈 BIAS: BULLISH / BEARISH / NEUTRAL\nEntry Zone: $XXX–$XXX\nTarget: $XXX (+XX%)\nStop Loss: $XXX (-X%)\nRisk/Reward: X:X\nTimeframe: [Swing / Positional / Long-term]", { icon: "📈", color: "green" }),

      b("stockchart", "", { ticker: "SPY" }),

      b("heading", "Trend Structure"),
      b("text",    "$[TICKER] is in a [primary uptrend / downtrend / consolidation] on the [daily / weekly] chart. The stock has been making [higher highs and higher lows / lower highs and lower lows / range-bound moves] since [timeframe]. The 200-day moving average at $[X] is [rising / falling / flat], confirming the [bullish / bearish] primary trend."),

      b("heading", "Key Levels"),
      b("bullets", "🔴 Resistance: $[X] (previous high, August 2024) | $[X] (200-week MA) | $[X] (supply zone)\n🟢 Support: $[X] (previous breakout level) | $[X] (50-week MA) | $[X] (major demand zone)\n📊 Volume: [X]% above average on [up/down] days — confirming [accumulation/distribution]\n📐 Pattern: [Head & Shoulders / Cup & Handle / Bull Flag / Wedge] — target projects to $[X]"),

      b("heading", "Entry, Stop & Targets"),
      b("text",    "Ideal entry: $[X]–$[X] on [a pullback to the breakout level / the current setup]. Stop loss: $[X] (below [specific level], invalidates the thesis). Target 1: $[X] (+[X]%). Target 2: $[X] (+[X]%). Risk/Reward ratio: [X]:1. Position size should reflect this setup quality — [suggested % of portfolio]."),

      b("heading", "Catalysts to Watch"),
      b("text",    "The technical setup is aligned with upcoming catalysts: [Earnings on X date], [Fed meeting on X], [sector rotation signal]. A break above $[X] with volume would confirm the move. A break below $[X] would invalidate the setup and suggest [alternate scenario]."),

      b("text",    "⚠️ Disclaimer: Technical analysis does not guarantee future results. This is not financial advice."),
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 4. VALUE INVESTOR DEEP DIVE (Buffett / Munger Style)
  // ─────────────────────────────────────────────────────────────
  {
    id: "value-investor",
    name: "Value Investor Deep Dive",
    category: "Deep Dive",
    icon: DollarSign,
    description: "Buffett-style moat analysis + DCF. Long-term fundamental value investing.",
    estimatedTime: "2–4 hours",
    wordCount: "2,000–4,000",
    blocks: [
      b("heading", "Value Analysis: $[TICKER] — A Business Worth Owning"),
      b("callout", "💎 VERDICT: BUY / HOLD / AVOID\nIntrinsic Value Estimate: $XXX\nCurrent Price: $XXX\nMargin of Safety: XX%\nMoat: WIDE / NARROW / NONE\nQuality Score: X/10", { icon: "💎", color: "blue" }),

      b("heading", "Why This Business?"),
      b("text",    "I've spent [X] hours studying [COMPANY]. The business does one thing exceptionally well: [core activity in plain English]. After [X] years of operation, they have [X] customers paying [$X] per year. The core question is whether this business can compound capital at [X]%+ over the next decade. Here's my case."),

      b("heading", "Economic Moat Assessment"),
      b("text",    "[COMPANY]'s moat comes from [intangible assets / network effects / cost advantages / switching costs / efficient scale]. Evidence: [Gross margins of [X]% vs. industry average [X]%]. [Customer retention rate of [X]%]. [Pricing power: raised prices [X]% in [year] with [minimal / no] churn]. I rate this moat as [WIDE / NARROW] because [specific reason]."),
      b("quote",   "\"The key to investing is not assessing how much an industry is going to affect society, or how much it will grow, but rather determining the competitive advantage of any given company.\" — Warren Buffett"),

      b("heading", "Management Quality"),
      b("bullets", "CEO [Name]: [X] years at company, skin in the game ([X]% owner, worth $[X]B at current prices)\nCapital allocation track record: [buybacks / acquisitions / reinvestment] at [X]% ROIC\nInsider buying/selling: [NET BUYER / SELLER] of $[X]M in past 12 months\nCompensation: [Incentives aligned / misaligned] — [X]% of comp tied to [specific metric]"),

      b("heading", "Financials: The Numbers Behind the Story"),
      b("text",    "Revenue has compounded at [X]% over 10 years. More importantly, earnings per share have compounded at [X]% — faster than revenue, showing operating leverage. Return on invested capital is [X]%, which means every $1 retained in the business generates $[X] in value. The balance sheet has $[X]B net cash — this is a fortress."),
      b("stockchart", "", { ticker: "BRK.B" }),

      b("heading", "Intrinsic Value Calculation (Owner Earnings DCF)"),
      b("text",    "Using Buffett's owner earnings approach: Net income $[X]B + D&A $[X]B – Capex $[X]B = Owner Earnings $[X]B. Growing at [X]% for 10 years, then [X]% terminal, discounted at [X]% = $[X]B equity value = $[X] per share. At $[X] current, the margin of safety is [X]%. I won't buy without at least a [X]% margin of safety."),

      b("heading", "What Would Make Me Wrong"),
      b("text",    "I invest knowing I can be wrong. The bear case: [describe the #1 risk that would permanently impair the business, not just the stock price]. This is not a temporary headwind — it would mean the moat is gone. Probability I assign to this scenario: [X]%. How I'd know I was wrong: [specific signal — a metric, a competitor's action, a management change]."),

      b("text",    "⚠️ Disclaimer: This is my personal analysis, not financial advice. I may hold a position in this security."),
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 5. MACRO MARKET OUTLOOK
  // ─────────────────────────────────────────────────────────────
  {
    id: "macro-outlook",
    name: "Macro Market Outlook",
    category: "Macro",
    icon: Globe,
    description: "Top-down macro analysis: rates, inflation, economic cycle, sector positioning.",
    estimatedTime: "1–2 hours",
    wordCount: "800–1,500",
    blocks: [
      b("heading", "Macro Outlook: [Month Year] — [Punchy Title]"),
      b("callout", "🌍 MACRO STANCE: RISK-ON / RISK-OFF / CAUTIOUS\nEconomic Cycle: EXPANSION / PEAK / CONTRACTION / TROUGH\nS&P 500 12-Month Target: X,XXX\nFed Path: [CUT X times / HOLD / HIKE]\nBiggest Risk: [One sentence]", { icon: "🌍", color: "blue" }),

      b("heading", "The Big Picture"),
      b("text",    "We are [X] months into the current [expansion/contraction]. GDP growth is running at [X]% annualized; we forecast [X]% for the next two quarters. The [key tension] is the central question of 2025: [specific tension, e.g., 'Can the Fed achieve a soft landing while inflation remains above 3%?']. Our answer: [bold call in one sentence]."),

      b("heading", "Rates & The Fed"),
      b("text",    "The Fed has [hiked / cut / held] rates [X] times this year, bringing the Fed Funds rate to [X]%. Market pricing implies [X] more [cuts/hikes] by year-end. We [agree/disagree] — here's why: [2–3 specific data points]. The 10-year Treasury at [X]% is [fairly valued / expensive / cheap] relative to our growth-and-inflation framework."),
      b("stockchart", "", { ticker: "TLT" }),

      b("heading", "Inflation Trajectory"),
      b("text",    "Core CPI is at [X]% — [above/below/at] the Fed's [X]% target. The [sticky / easing] component is [shelter / services / goods]. Our model suggests inflation reaches [X]% by [Q/Year]. The risk scenario where inflation re-accelerates requires [specific trigger]. We assign this a [X]% probability."),

      b("heading", "Sector Positioning"),
      b("bullets", "OVERWEIGHT: [Sector] — [reason tied to macro view]\nOVERWEIGHT: [Sector] — [reason]\nNEUTRAL: [Sector] — [reason]\nUNDERWEIGHT: [Sector] — [reason]\nUNDERWEIGHT: [Sector] — [biggest risk from macro scenario]"),

      b("heading", "Key Events Calendar"),
      b("text",    "The next [X] weeks are catalyst-rich. [Date]: [Fed meeting/FOMC minutes/CPI]. [Date]: [Earnings from bellwether]. [Date]: [Geopolitical event/Election/Policy deadline]. Each of these has the potential to [shift the market direction / confirm our thesis / introduce volatility]."),

      b("heading", "Our Positioning"),
      b("text",    "In this environment, we favor [asset class / style / sector]. We are using [volatility spikes / sector rotation signals / yield curve moves] as our timing signals. Our base case gives [X]% probability to [bull scenario], [X]% to [base], and [X]% to [bear]. In each scenario, the key is [specific portfolio action]."),

      b("text",    "⚠️ Disclaimer: Macro forecasts are inherently uncertain. This is not investment advice."),
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 6. SHORT THESIS (Bear Case)
  // ─────────────────────────────────────────────────────────────
  {
    id: "short-thesis",
    name: "Short / Bear Thesis",
    category: "Special",
    icon: AlertTriangle,
    description: "Structured bear case. Why a stock deserves a SELL rating and lower price target.",
    estimatedTime: "1–2 hours",
    wordCount: "800–1,500",
    blocks: [
      b("heading", "Bear Thesis: Why $[TICKER] is Overvalued"),
      b("callout", "🔴 RATING: SELL / UNDERPERFORM\nCurrent Price: $XXX\nBear Case Target: $XXX (-XX%)\nConviction: High / Medium\nKey Risk to Short: [Acquisition / Short squeeze / Earnings beat]", { icon: "🔴", color: "red" }),

      b("heading", "The Thesis in Three Points"),
      b("bullets", "OVERVALUATION: Trading at [X]x sales vs. comps at [X]x — [X]% premium for decelerating growth\nFUNDAMENTALS DETERIORATING: [Key metric] declining for [X] consecutive quarters\nCATALYST: [Upcoming event — earnings / lockup expiry / debt maturity] in [timeframe] will expose this"),

      b("heading", "The Bull Case and Why I Disagree"),
      b("text",    "Bulls argue [state the bull case fairly]. This is not wrong — but it misses [the critical counterpoint]. Specifically, [counterargument 1]. The market is pricing in [X]% growth for [X] years. Let's stress-test that: if growth is [X]% instead, the stock is worth $[X], not $[X]."),

      b("heading", "Valuation: The Math Doesn't Work"),
      b("text",    "At $[X], [COMPANY] trades at [X]x forward revenue and [X]x EBITDA. Peers with similar growth trade at [X]x and [X]x, respectively. For this premium to be justified, [COMPANY] needs to grow revenue at [X]% for [X] years — which has only happened [X] times in the sector's history. Our base case has revenue growing at [X]%, implying a fair value of $[X]–$[X]."),
      b("stockchart", "", { ticker: "TSLA" }),

      b("heading", "What Would Change My Mind"),
      b("text",    "I would cover this short if: (1) [specific upside catalyst materializes], (2) valuation compresses to [X]x, or (3) [management change / strategic pivot]. These are not my base case, but I respect that markets can stay irrational longer than shorts can stay solvent."),

      b("text",    "⚠️ Disclaimer: This is a contrarian view. Shorting carries unlimited risk. Do your own research. This is not financial advice."),
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 7. SECTOR ROTATION / THEMATIC PLAY
  // ─────────────────────────────────────────────────────────────
  {
    id: "sector-thematic",
    name: "Sector / Thematic Play",
    category: "Macro",
    icon: Layers,
    description: "Top-down thematic investing. Identify a sector trend + best-in-class stock picks.",
    estimatedTime: "1–2 hours",
    wordCount: "700–1,200",
    blocks: [
      b("heading", "Theme: [The Big Opportunity in [Sector/Theme]]"),
      b("callout", "🎯 THEME: [AI Infrastructure / Defense / Energy Transition / Healthcare Innovation / etc.]\nInvestment Horizon: [3–18 months]\nTop Pick: $[TICKER1] | Runner-Up: $[TICKER2]\nETF Play: $[ETF]\nRisk Level: [LOW / MEDIUM / HIGH]", { icon: "🎯", color: "blue" }),

      b("heading", "Why This Theme, Why Now"),
      b("text",    "[The macro or secular force driving this theme]: [Specific data point — e.g., '$2 trillion in AI capex committed through 2027']. This is not speculation — it's already happening: [Cite a real event or company action that confirms the trend]. The last time a comparable force emerged was [historical parallel], and it created [X]x returns for early movers over [X] years."),

      b("heading", "The Market Opportunity"),
      b("text",    "The total addressable market is $[X]B today, growing to $[X]B by [Year] ([X]% CAGR). The key driver is [technology shift / regulatory change / demographic force / supply constraint]. The companies best positioned are those with [key differentiator]."),

      b("heading", "Top Picks Within the Theme"),
      b("bullets", "🥇 $[TICKER1] — [Why this is the best-positioned pure play. Key metric: X%/X]\n🥈 $[TICKER2] — [Strong second. Less pure but more diversified risk. Key metric: X%]\n🏦 $[ETF] — [If you prefer basket exposure: tracks [X] companies, [X]% average P/E]\n⚡ $[TICKER3] — [Higher risk / higher reward. Earlier stage but fastest growth]"),
      b("stockchart", "", { ticker: "XLK" }),

      b("heading", "What Kills the Theme"),
      b("text",    "Three scenarios that end this trade: (1) [Policy risk — e.g., regulation], (2) [Technology risk — e.g., competing technology], (3) [Macro risk — e.g., rates remain elevated, killing capex]. Assign these: [X]% / [X]% / [X]% probability. Our portfolio construction accounts for this — [position sizing recommendation]."),

      b("text",    "⚠️ Disclaimer: Thematic investing involves sector concentration risk. This is not financial advice."),
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 8. CATALYST / EVENT-DRIVEN
  // ─────────────────────────────────────────────────────────────
  {
    id: "event-driven",
    name: "Catalyst / Event-Driven",
    category: "Quick Take",
    icon: Zap,
    description: "A specific catalyst — earnings, FDA decision, spin-off, M&A — and how to trade it.",
    estimatedTime: "30–60 min",
    wordCount: "400–800",
    blocks: [
      b("heading", "Catalyst Trade: $[TICKER] — [Event Name] on [Date]"),
      b("callout", "⚡ EVENT: [Earnings / FDA Decision / FOMC / M&A / Spin-off]\nDate: [Specific date or expected window]\nDirection: LONG / SHORT / STRADDLE\nExpected Move: ±X%\nOptions IV: [HIGH / NORMAL / LOW]", { icon: "⚡", color: "amber" }),

      b("heading", "The Setup"),
      b("text",    "[COMPANY]'s [event] arrives on [date]. The stock has moved an average of [X]% on this event over the past [X] occurrences (range: [low] to [high]). Current implied move from options is [X]%. Our directional view: [BUY / SELL] ahead of the event because [specific informational edge or setup]."),

      b("heading", "What the Market is Pricing"),
      b("text",    "Street consensus: [Revenue $X / EPS $X / key metric $X]. The implied EPS at $[current stock price] is $[X] — meaning the stock needs to earn $[X]+ to justify current valuation. We think [company will / won't] deliver that because [specific reason]."),

      b("heading", "The Trade"),
      b("bullets", "Entry: $[X]–$[X] [before / after initial reaction to the event]\nStop Loss: $[X] (below which the thesis is wrong)\nTarget: $[X] within [X] weeks post-event\nOptions strategy (if relevant): [Buy [X] calls / Buy straddle / Sell puts at $[X] strike]\nPosition size: [Conservative — [X]% of portfolio / Speculative — [X]% max]"),

      b("heading", "Risk Scenarios"),
      b("text",    "Bull case ([X]% prob): [Event beats by [X]%. Stock gaps to $[X]+]. Bear case ([X]% prob): [Event disappoints / guides down. Stock drops to $[X]]. Base case ([X]% prob): [In-line result; stock moves [X]% in either direction based on tone]."),

      b("text",    "⚠️ Disclaimer: Event-driven trades are high-risk. Options can expire worthless. Not financial advice."),
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 9. IPO / NEW LISTING ANALYSIS
  // ─────────────────────────────────────────────────────────────
  {
    id: "ipo-analysis",
    name: "IPO / New Listing Analysis",
    category: "Special",
    icon: TrendingUp,
    description: "S-1 analysis, valuation vs. comps, lockup calendar, first-day pop or pass.",
    estimatedTime: "1–2 hours",
    wordCount: "700–1,200",
    blocks: [
      b("heading", "IPO Analysis: [COMPANY] ($[TICKER]) — Buy, Flip, or Pass?"),
      b("callout", "📋 IPO VERDICT: BUY (long-term) / FLIP (first-day pop) / PASS\nIPO Price: $XX\nIPO Range: $XX–$XX\nPost-Money Valuation: $XB\nLockup Expiry: [Date]\nUnderwriters: [Banks]", { icon: "📋", color: "blue" }),

      b("heading", "Business in One Page"),
      b("text",    "[COMPANY] is [description]. Founded in [year] by [founders]. They make money by [revenue model]. In FY[X], revenue was $[X]M (+[X]% YoY), with gross margins of [X]%. The company is [profitable / pre-profit]. Key customers include [notable names]. The S-1 reveals [one key insight about the business that isn't obvious from the name]."),

      b("heading", "Valuation vs. Comps"),
      b("text",    "At the IPO price of $[X], [COMPANY] is valued at [X]x revenue (NTM). Comparable public companies: [Comp1] at [X]x, [Comp2] at [X]x, [Comp3] at [X]x. [COMPANY]'s premium/discount is [X]%. This is [justified / unjustified] because [reason]. Our fair value estimate at IPO: $[X]–$[X]."),

      b("heading", "Red Flags from the S-1"),
      b("bullets", "[Concentration risk: Top [X] customers = [X]% of revenue]\n[Insider selling: [CEO/Investor] selling $[X]M at IPO — read the details]\n[Competition: [Big Tech co.] is building directly into this market]\n[Path to profitability: [X] years away at current burn rate of $[X]M/quarter]\n[Lock-up cliff: [X]M shares unlock on [date] — watch for selling pressure]"),

      b("heading", "The Long-Term Case"),
      b("text",    "Ignoring the IPO pop, the question is: in 5 years, is this business worth [X]x today's IPO price? Our answer: [YES / MAYBE / NO]. Here's why: [The core unit economics / market position / moat argument in 3 sentences]."),

      b("text",    "⚠️ Disclaimer: IPO investing is speculative. Lock-up expiries can cause significant price drops. Not financial advice."),
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 10. M&A ARBITRAGE
  // ─────────────────────────────────────────────────────────────
  {
    id: "merger-arb",
    name: "M&A Arbitrage",
    category: "Special",
    icon: Target,
    description: "Deal analysis: spread, probability of closing, timeline, break risk.",
    estimatedTime: "45–90 min",
    wordCount: "500–900",
    blocks: [
      b("heading", "M&A Arbitrage: [ACQUIREE] / [ACQUIRER] Deal"),
      b("callout", "💼 DEAL: [ACQUIRER] acquiring [ACQUIREE] for $XX/share\nCurrent Price: $XX | Deal Price: $XX\nSpread: $X.XX (X%)\nAnnualized Return (X-mo close): XX%\nDeal Break Risk: LOW / MEDIUM / HIGH", { icon: "💼", color: "blue" }),

      b("heading", "Deal Summary"),
      b("text",    "[ACQUIRER] announced a deal to acquire [ACQUIREE] at $[X] per share [in cash / stock / mixed], representing a [X]% premium to the undisturbed price. Total deal value: $[X]B. Expected close: [Q/Year]. Regulatory approvals needed: [List jurisdictions]. Shareholder votes required: [Yes/No] from [which parties]."),

      b("heading", "Spread Analysis"),
      b("text",    "The current spread of $[X.XX] ([X]%) over [X] months implies an annualized return of [X]%. This compares to the risk-free rate of [X]% — an excess return of [X]bps for deal risk. The key question: is the deal risk premium [adequate / inadequate] given our probability assessment?"),

      b("heading", "Probability of Closing"),
      b("bullets", "Regulatory: [X]% — [antitrust analysis in one sentence]\nFinancing: [X]% — [acquirer balance sheet / financing commitment status]\nShareholder approval: [X]% — [major holders' positions]\nMaterial adverse change: [X]% — [any business deterioration risk]\nOverall close probability: [X]%"),

      b("heading", "Break Scenario"),
      b("text",    "If the deal breaks, [ACQUIREE] likely trades back to $[X] (pre-announcement price), representing a [X]% downside from current levels. The downside/upside ratio is [X]:[X]. We are comfortable with this ratio because [specific reason deal is likely to close]."),

      b("text",    "⚠️ Disclaimer: Merger arbitrage carries deal break risk. Spreads can widen significantly. Not financial advice."),
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 11. ESG / SUSTAINABILITY ANALYSIS
  // ─────────────────────────────────────────────────────────────
  {
    id: "esg-analysis",
    name: "ESG & Sustainability",
    category: "Special",
    icon: Shield,
    description: "ESG scoring, carbon transition risk, governance analysis, sustainability moat.",
    estimatedTime: "1–2 hours",
    wordCount: "700–1,200",
    blocks: [
      b("heading", "ESG Analysis: $[TICKER] — Sustainability as Competitive Advantage"),
      b("callout", "🌿 ESG RATING: LEADER / AVERAGE / LAGGARD\nE (Environmental): X/10\nS (Social): X/10\nG (Governance): X/10\nMSCI ESG Rating: AAA / AA / A / BBB\nClimate Risk: LOW / MEDIUM / HIGH\nFinancial Impact: POSITIVE / NEUTRAL / NEGATIVE", { icon: "🌿", color: "green" }),

      b("heading", "Why ESG Matters Financially for This Stock"),
      b("text",    "ESG is not philanthropy — it's risk management and competitive positioning. For [COMPANY], the most financially material ESG factor is [specific factor: e.g., 'carbon transition risk', 'supply chain labor standards', 'board independence']. Our analysis shows this factor could impact [X]% of EBITDA by [year] under [scenario]."),

      b("heading", "Environmental Analysis"),
      b("text",    "[COMPANY] emits [X] million tons of CO2 equivalent annually. This is [above / below / in line with] industry average of [X] tons per $1M revenue. Their net-zero commitment: [timeline and credibility assessment]. Carbon transition risk: if carbon is priced at $[X]/ton, it impacts margins by [X]bps. [Specific green capex / renewable target]."),

      b("heading", "Social & Governance"),
      b("bullets", "Board diversity: [X]% women, [X]% underrepresented minorities — [above/below] S&P 500 average\nCEO pay ratio: [X]x — [comment on alignment]\nLabor practices: [Union exposure / key risks / notable controversies]\nData privacy: [GDPR exposure / regulatory risk / breaches in past 3 years]\nSupply chain: [Key risks / audit practices / controversies]"),

      b("heading", "ESG as Investment Signal"),
      b("text",    "Academic research consistently shows that companies improving ESG scores outperform by [X]% annually (MSCI research, 2024). [COMPANY]'s score has [improved / declined / been stable] over the past 3 years. Based on trajectory, we expect [improvement to act as a tailwind / decline to increase cost of capital by X]bps."),

      b("text",    "⚠️ Disclaimer: ESG ratings vary by provider. This analysis uses publicly available data. Not financial advice."),
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 12. PORTFOLIO REVIEW / POSITION UPDATE
  // ─────────────────────────────────────────────────────────────
  {
    id: "portfolio-update",
    name: "Portfolio / Position Update",
    category: "Quick Take",
    icon: PieChart,
    description: "Monthly or quarterly subscriber update. What I bought, sold, and why.",
    estimatedTime: "30–45 min",
    wordCount: "400–700",
    blocks: [
      b("heading", "[Month Year] Portfolio Update"),
      b("callout", "📊 PORTFOLIO PERFORMANCE\nMTD: +X.X% vs S&P 500 +X.X% ([+/-X]% alpha)\nYTD: +XX.X% vs S&P 500 +XX.X%\nBiggest Win: $[TICKER] (+XX%)\nBiggest Loss: $[TICKER] (-X%)\nCurrent Cash: XX% of portfolio", { icon: "📊", color: "blue" }),

      b("heading", "What I Bought This Month"),
      b("bullets", "$[TICKER] — [Added / Initiated] X% position at ~$[X]. Thesis: [2 sentences]. Conviction: High\n$[TICKER] — [Added / Initiated] X% position at ~$[X]. Thesis: [2 sentences]. Conviction: Medium"),

      b("heading", "What I Sold"),
      b("bullets", "$[TICKER] — [Trimmed / Exited] at $[X]. [Reason: thesis played out / better opportunity elsewhere / risk management]. P&L: +X% over [X] months\n$[TICKER] — [Trimmed / Exited] at $[X]. [Reason]. P&L: [+/-X%]"),

      b("heading", "What Changed in Existing Positions"),
      b("text",    "$[TOP HOLDING]: [What news/data changed / didn't change]. [I'm] [adding / holding / watching]. The thesis [holds because / is evolving because] [specific reason]. New price target: $[X] (was $[X])."),

      b("heading", "What I'm Watching (Not Buying Yet)"),
      b("text",    "Three names on my watchlist: $[TICKER] (waiting for [specific condition at $[X]]), $[TICKER] (need to see [specific data point]), $[TICKER] (considering [catalyst] creates the entry). I'll act if [specific criteria]."),

      b("text",    "⚠️ Disclaimer: This is my personal portfolio, not a recommendation. Past performance ≠ future results."),
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 13. SMALL/MID-CAP DISCOVERY
  // ─────────────────────────────────────────────────────────────
  {
    id: "smallcap-discovery",
    name: "Small/Mid-Cap Discovery",
    category: "Deep Dive",
    icon: TrendingUp,
    description: "Introducing a hidden gem. Under-covered company with asymmetric upside.",
    estimatedTime: "1.5–2.5 hours",
    wordCount: "1,000–2,000",
    blocks: [
      b("heading", "Discovery Report: $[TICKER] — [Company Name] ([Market Cap])"),
      b("callout", "🔍 UNDER THE RADAR\nMarket Cap: $XM / $XB\nAverage Daily Volume: $XM\nAnalyst Coverage: X analysts (vs. S&P 500 avg of 15)\nInsider Ownership: XX%\nBuy Rating: [Our view]", { icon: "🔍", color: "blue" }),

      b("heading", "Why No One Is Talking About This"),
      b("text",    "[COMPANY] has [X] analyst covering it (if any), despite generating $[X]M in revenue and [X]% free cash flow margins. It's under the radar because [small size / recent spinoff / boring industry / no IR department / recent name change]. This informational inefficiency is our edge."),

      b("heading", "The Business Nobody Knows"),
      b("text",    "[COMPANY] [describe what they do in plain language — avoid jargon]. Their customers are [who]. They charge [how much]. The business is [profitable / rapidly growing toward profitability]. Here's what makes it special: [specific moat or advantage that you discovered]."),
      b("stockchart", "", { ticker: "IWM" }),

      b("heading", "The Numbers (And Why They're Better Than They Look)"),
      b("text",    "At first glance, [COMPANY] looks [expensive / cheap] on trailing metrics. But look closer: [normalized metric], [one-time charge that distorted earnings], [GAAP vs. cash earnings gap]. On an apples-to-apples basis, the stock trades at [X]x normalized FCF — [cheap / fair / expensive]."),

      b("heading", "Catalysts That Could Re-Rate This Stock"),
      b("bullets", "[Analyst initiation — if 1-2 bulge bracket banks initiate, multiple expands automatically]\n[Inclusion in [Small-Cap Index] — passive inflows when market cap crosses $[X]M]\n[Earnings inflection — [X]Q is the quarter we model going FCF positive]\n[Management roadshow / Investor Day — not widely broadcast, our readers will be early]"),

      b("heading", "Position Sizing & Exit"),
      b("text",    "Given the liquidity ([X] ADV), this is a 2–5% position for most portfolios. Entry: current levels. Target: $[X] in [X] months ([X]x FCF if thesis plays out). Stop: $[X] (below which [specific reason] no longer holds). I'll re-evaluate after [next earnings / management contact]."),

      b("text",    "⚠️ Disclaimer: Small caps carry liquidity risk. Position sizing matters. Not financial advice."),
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 14. SEMICONDUCTOR / TECHNOLOGY DEEP DIVE
  // ─────────────────────────────────────────────────────────────
  {
    id: "tech-deep-dive",
    name: "Technology / Semi Deep Dive",
    category: "Deep Dive",
    icon: Cpu,
    description: "Tech or semiconductor company analysis with product cycle, TAM, and AI exposure.",
    estimatedTime: "2–3 hours",
    wordCount: "1,200–2,500",
    blocks: [
      b("heading", "Tech Deep Dive: $[TICKER] — [Thesis in 6 Words]"),
      b("callout", "💻 TECH RATING: BUY\nPrice Target: $XXX\nAI/Cloud Exposure: HIGH / MEDIUM / LOW\nProduct Cycle: UPCYCLE / PEAK / DOWNCYCLE\nCompute Allocation: AI [X]% / Traditional [X]%\nKey Customers: [Top 3]", { icon: "💻", color: "blue" }),

      b("heading", "The Technology Thesis"),
      b("text",    "[COMPANY]'s core product is [specific chip / software / platform]. In the AI era, this matters because [specific AI use case this enables]. Revenue from AI-related workloads has [grown from [X]% to [X]% of mix in [X] years]. We believe this mix shift is [just beginning / accelerating / peaking], which drives our [bull/bear] case."),

      b("heading", "Product Analysis"),
      b("text",    "The [product name] is [generation X] and competes against [competitor product]. Key specs: [relevant specs in plain English]. Performance/watt ratio: [X]% better than competition. This matters for hyperscalers because [cost/efficiency reason]. The next-gen product [product name] launches in [timeframe] with [key improvement]."),
      b("stockchart", "", { ticker: "NVDA" }),

      b("heading", "Customer Concentration & AI Capex Visibility"),
      b("text",    "The top 4 customers ([hyperscalers or OEMs]) represent [X]% of revenue. Each has committed $[X]B in capex in [year], of which an estimated [X]% will flow to [COMPANY]. This gives [X]–[X] quarter revenue visibility. The risk: any hyperscaler that decides to [in-source / reduce capex / shift to competitor]."),

      b("heading", "Financials: The Upcycle Math"),
      b("text",    "In the last upcycle ([timeframe]), gross margins peaked at [X]% and FCF margins reached [X]%. We are [X] quarters into the current upcycle. Our model shows gross margins expanding from [X]% to [X]% over [X] quarters as [product mix / utilization / pricing] improve. At peak margins, FCF reaches $[X]B, supporting a $[X] stock."),

      b("heading", "Valuation: Cycle-Adjusted"),
      b("text",    "Semiconductor valuations must be cycle-adjusted. We use [X]x mid-cycle earnings of $[X] = $[X] PT. At current prices, this implies [X]% upside. The key debate: are we in [early / mid / late] cycle? Our view: [specific supporting argument]."),

      b("heading", "Risks"),
      b("bullets", "Product delay: [Next-gen product] delayed by [X] quarters could cost $[X]B revenue\nHyperscaler insourcing: [Google TPU / Amazon Trainium / Meta MTIA] could displace [X]% of revenue\nChina export controls: [$[X]B in Chinese revenue at risk from further restrictions]\nCycle downturn: If AI capex normalizes 20%, revenue falls [X]% from peak — stock likely resets to $[X]"),

      b("text",    "⚠️ Disclaimer: Semiconductor investing is highly cyclical. Not financial advice."),
    ]
  },

  // ─────────────────────────────────────────────────────────────
  // 15. DIVIDEND / INCOME STOCK
  // ─────────────────────────────────────────────────────────────
  {
    id: "dividend-income",
    name: "Dividend & Income Analysis",
    category: "Deep Dive",
    icon: DollarSign,
    description: "Dividend safety, growth, yield-on-cost, and total return framework for income investors.",
    estimatedTime: "1–1.5 hours",
    wordCount: "700–1,200",
    blocks: [
      b("heading", "Dividend Analysis: $[TICKER] — Income + Growth"),
      b("callout", "💰 DIVIDEND PROFILE\nCurrent Yield: X.X%\nDividend Safety: HIGH / MEDIUM / LOW (payout ratio: XX%)\nDividend Growth Rate (5yr CAGR): X.X%\nYears of Growth: XX (Dividend [Aristocrat/King/Champion])\nYield-on-Cost at 10yr: XX%", { icon: "💰", color: "green" }),

      b("heading", "Why This Dividend Is Safe"),
      b("text",    "[COMPANY] has paid and raised its dividend for [X] consecutive years. The dividend of $[X.XX] per share ($[X.XX] quarterly) is supported by: (1) FCF payout ratio of [X]% — well below the safe [X]% ceiling. (2) [X]x dividend coverage from operating cash flow. (3) Net debt/EBITDA of [X]x — conservative leverage leaves room for raises even in downturns."),

      b("heading", "Dividend Growth Potential"),
      b("text",    "The 5-year dividend CAGR has been [X]%. We model [X]%/year raises for the next [X] years based on [EPS growth / FCF growth / payout ratio expansion]. If you bought at today's price and held for 10 years, your yield-on-cost would reach [X]%. That's [X]x the current 10-year Treasury yield — and it grows."),
      b("stockchart", "", { ticker: "JNJ" }),

      b("heading", "Total Return Framework"),
      b("text",    "Income investors often overlook total return. For [COMPANY], we model: Dividend yield [X]% + Earnings growth [X]% + Multiple change [+/-X]% = Expected annual total return of [X]%. Over [X] years, $[X]K invested today grows to $[X]K (including reinvested dividends) in our base case."),

      b("heading", "When Would the Dividend Be Cut?"),
      b("text",    "We stress-test the dividend. In a severe recession where revenue falls [X]%, FCF drops to $[X]B — still [X]x coverage. The dividend would only be threatened if [specific scenario: operating cash flow drops below $[X]B / debt covenant triggered / debt maturity at $[X]B]. Probability: [X]%."),

      b("heading", "Valuation: Is the Yield Cheap or a Trap?"),
      b("text",    "[COMPANY] yields [X]%, [above/below] its 5-year average of [X]%. Stocks trading above their historical yield average are [often / not always] undervalued. [COMPANY] at [X]x P/E with [X]% dividend growth is [cheap / fairly priced / expensive] vs. [comp]. We rate it a [BUY / HOLD] for income portfolios."),

      b("text",    "⚠️ Disclaimer: Dividends can be cut. Past dividend growth does not guarantee future payments. Not financial advice."),
    ]
  },

];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function TemplatesPanel({ onSelectTemplate, onClose }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [preview, setPreview] = useState(null);

  const categories = ["All", ...Object.keys(CATS)];

  const filtered = TEMPLATES.filter(t => {
    const matchesSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = activeCategory === "All" || t.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#fff", borderRadius: 16, width: "min(900px, 95vw)",
        maxHeight: "90vh", display: "flex", flexDirection: "column",
        boxShadow: "0 25px 80px rgba(0,0,0,0.3)",
        overflow: "hidden",
      }}>

        {/* ── Header ─────────────────────────────────────────── */}
        <div style={{ padding: "24px 28px 16px", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#111827" }}>
                Report Templates
              </h2>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
                15 professional templates based on Goldman Sachs, Morgan Stanley & top independent analysts
              </p>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#6b7280" }}>
              <X size={20} />
            </button>
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search templates..."
              style={{ width: "100%", padding: "8px 12px 8px 36px", border: "1px solid #e5e7eb",
                borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box",
                background: "#f9fafb" }}
            />
          </div>

          {/* Category tabs */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {categories.map(cat => {
              const style = cat === "All" ? { color: "#374151", bg: "#f3f4f6" } : CATS[cat] || { color: "#374151", bg: "#f3f4f6" };
              const isActive = activeCategory === cat;
              return (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  style={{ padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500,
                    cursor: "pointer", border: "1px solid",
                    borderColor: isActive ? style.color : "#e5e7eb",
                    background: isActive ? style.bg : "#fff",
                    color: isActive ? style.color : "#6b7280",
                    transition: "all 0.15s" }}>
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Grid ───────────────────────────────────────────── */}
        <div style={{ overflowY: "auto", padding: "20px 28px",
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>

          {filtered.length === 0 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>
              No templates match your search.
            </div>
          )}

          {filtered.map(template => {
            const Icon = template.icon;
            const catStyle = CATS[template.category] || CATS["Deep Dive"];
            const isPreview = preview === template.id;

            return (
              <div key={template.id}
                style={{ border: `1px solid ${isPreview ? catStyle.color : "#e5e7eb"}`,
                  borderRadius: 12, padding: 16, cursor: "pointer",
                  transition: "all 0.15s", background: isPreview ? catStyle.bg : "#fff",
                  boxShadow: isPreview ? `0 0 0 2px ${catStyle.color}40` : "none",
                }}
                onClick={() => setPreview(isPreview ? null : template.id)}
                onMouseEnter={e => { if (!isPreview) e.currentTarget.style.borderColor = catStyle.color; }}
                onMouseLeave={e => { if (!isPreview) e.currentTarget.style.borderColor = "#e5e7eb"; }}
              >
                {/* Icon + category */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8,
                    background: catStyle.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={18} color={catStyle.color} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                    background: catStyle.bg, color: catStyle.color }}>
                    {template.category}
                  </span>
                </div>

                {/* Name + description */}
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 6px", color: "#111827" }}>
                  {template.name}
                </h3>
                <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 12px", lineHeight: 1.5 }}>
                  {template.description}
                </p>

                {/* Meta */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>⏱ {template.estimatedTime}</span>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>✍️ {template.wordCount} words</span>
                </div>

                {/* Expanded preview */}
                {isPreview && (
                  <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 12, marginBottom: 12 }}>
                    <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 8px", fontWeight: 600 }}>
                      SECTIONS ({template.blocks.filter(bl => bl.type === "heading").length}):
                    </p>
                    {template.blocks.filter(bl => bl.type === "heading").map((bl, i) => (
                      <div key={i} style={{ fontSize: 11, color: "#374151", padding: "2px 0",
                        display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ color: catStyle.color, fontWeight: 700 }}>→</span>
                        {bl.content}
                      </div>
                    ))}
                  </div>
                )}

                {/* Use button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTemplate(template.blocks);
                    onClose();
                  }}
                  style={{ width: "100%", padding: "8px 0", borderRadius: 8, fontSize: 13,
                    fontWeight: 600, cursor: "pointer", border: "none",
                    background: catStyle.color, color: "#fff", transition: "opacity 0.15s" }}
                  onMouseEnter={e => e.target.style.opacity = "0.9"}
                  onMouseLeave={e => e.target.style.opacity = "1"}
                >
                  Use This Template
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}