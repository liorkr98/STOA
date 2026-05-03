export const MOCK_STOCKS = {
  AAPL: { price: 198.45, change: 2.34, changePercent: 1.19 },
  TSLA: { price: 248.12, change: -5.67, changePercent: -2.23 },
  NVDA: { price: 875.30, change: 12.45, changePercent: 1.44 },
  MSFT: { price: 415.60, change: 3.21, changePercent: 0.78 },
  AMZN: { price: 186.75, change: -1.23, changePercent: -0.65 },
  GOOGL: { price: 155.90, change: 1.87, changePercent: 1.21 },
  META: { price: 502.30, change: 8.45, changePercent: 1.71 },
  JPM: { price: 198.20, change: -0.85, changePercent: -0.43 },
  AMD: { price: 142.80, change: -3.20, changePercent: -2.19 },
  NFLX: { price: 628.50, change: 9.75, changePercent: 1.58 },
  COIN: { price: 224.10, change: -12.40, changePercent: -5.24 },
  PLTR: { price: 24.85, change: 1.10, changePercent: 4.63 },
  RIVN: { price: 14.20, change: -0.65, changePercent: -4.38 },
  SHOP: { price: 76.40, change: 2.30, changePercent: 3.10 },
  ARM: { price: 118.60, change: 4.50, changePercent: 3.94 },
};

export const MOCK_ANALYSTS = [
  { id: "a1", name: "Sarah Chen", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face", accuracy: 87.5, yearlyYield: 34.2, followers: 12400, points: 8750, reports: 45, specialties: ["AI & Semiconductors", "Big Tech"], bio: "Senior Equity Research Analyst specializing in AI infrastructure and semiconductor cycles." },
  { id: "a2", name: "Marcus Webb", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face", accuracy: 82.1, yearlyYield: 28.7, followers: 9800, points: 7320, reports: 38, specialties: ["EV & Clean Energy", "Macro"], bio: "Macro strategist and EV sector analyst. Former Goldman Sachs. CFA Charterholder." },
  { id: "a3", name: "Elena Rodriguez", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face", accuracy: 79.3, yearlyYield: 22.1, followers: 7600, points: 6100, reports: 52, specialties: ["Consumer Tech", "Social Media"], bio: "Consumer tech and social media analyst. Previously at ARK Invest." },
  { id: "a4", name: "David Park", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face", accuracy: 76.8, yearlyYield: 19.5, followers: 5200, points: 5400, reports: 29, specialties: ["Financials", "Banking"], bio: "Banking and financials specialist. 10+ years covering Wall Street firms." },
  { id: "a5", name: "Aisha Patel", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face", accuracy: 74.2, yearlyYield: 17.3, followers: 4100, points: 4800, reports: 33, specialties: ["Crypto & Web3", "Fintech"], bio: "Crypto and fintech researcher. Former Coinbase analyst. MIT Computer Science." },
  { id: "a6", name: "James Hartwell", avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&crop=face", accuracy: 71.9, yearlyYield: 15.8, followers: 3200, points: 4100, reports: 21, specialties: ["Healthcare", "Biotech"], bio: "Healthcare and biotech analyst with a focus on oncology and gene therapy." },
  { id: "a7", name: "Priya Nair", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face", accuracy: 69.5, yearlyYield: 13.2, followers: 2800, points: 3500, reports: 18, specialties: ["E-Commerce", "Retail"], bio: "E-commerce and retail tech analyst. Tracks consumer behavior data and logistics trends." },
  { id: "a8", name: "Leo Fischer", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&crop=face", accuracy: 83.4, yearlyYield: 31.0, followers: 8900, points: 7800, reports: 41, specialties: ["Options Flow", "Derivatives"], bio: "Options strategist and derivatives specialist. Former market maker on CBOE." },
];

function getMergedAnalyst(analyst) {
  if (analyst.id !== "a1" || typeof window === "undefined") return analyst;
  try {
    const saved = JSON.parse(localStorage.getItem("stakify_profile")) || {};
    return { ...analyst, ...saved };
  } catch { return analyst; }
}

const PUBLISHED_KEY = "stakify_published_reports";

export function getPublishedReports() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(PUBLISHED_KEY)) || []; } catch { return []; }
}

export function publishReport(report) {
  const existing = getPublishedReports();
  const newReport = { ...report, id: `pub_${Date.now()}`, publishedAt: new Date().toISOString(), likes: 0, author: MOCK_ANALYSTS[0] };
  localStorage.setItem(PUBLISHED_KEY, JSON.stringify([newReport, ...existing]));
  return newReport;
}

export function getReports() {
  const published = getPublishedReports();
  return [...published, ...MOCK_REPORTS].map((r) => ({ ...r, author: getMergedAnalyst(r.author) }));
}

export const MOCK_REPORTS = [
  { id: "r1", title: "NVIDIA: The AI Backbone Play for 2026", author: MOCK_ANALYSTS[0], tickers: ["NVDA", "MSFT"], prediction: { action: "Long", ticker: "NVDA", targetPrice: 1050, timeframe: "12 months", lockPrice: 875.30, lockTime: "2026-04-10T14:30:00Z" }, likes: 342, publishedAt: "2026-04-10T14:30:00Z", excerpt: "NVIDIA continues to dominate the AI infrastructure market with its H200 and B100 chips. The data center revenue growth trajectory suggests significant upside from current levels.", isPremium: true, price: 4.99, industry: "AI & Semiconductors", marketCap: "mega" },
  { id: "r2", title: "Tesla's Robotaxi: Overhyped or Undervalued?", author: MOCK_ANALYSTS[1], tickers: ["TSLA"], prediction: { action: "Hold", ticker: "TSLA", targetPrice: 260, timeframe: "6 months", lockPrice: 248.12, lockTime: "2026-04-09T10:15:00Z" }, likes: 218, publishedAt: "2026-04-09T10:15:00Z", excerpt: "While the autonomous driving narrative is compelling, the timeline for mass deployment remains uncertain. We analyze the key catalysts and risks for the next 6 months.", isPremium: false, industry: "EV & Clean Energy", marketCap: "large" },
  { id: "r3", title: "Apple's AI Strategy: A Deep Dive", author: MOCK_ANALYSTS[2], tickers: ["AAPL", "GOOGL"], prediction: { action: "Long", ticker: "AAPL", targetPrice: 235, timeframe: "12 months", lockPrice: 198.45, lockTime: "2026-04-08T09:00:00Z" }, likes: 156, publishedAt: "2026-04-08T09:00:00Z", excerpt: "Apple's integration of on-device AI with Apple Intelligence represents a significant competitive moat. We examine the revenue implications of the services pivot.", isPremium: false, industry: "Big Tech", marketCap: "mega" },
  { id: "r4", title: "Short JPMorgan: Banking Headwinds Ahead", author: MOCK_ANALYSTS[3], tickers: ["JPM"], prediction: { action: "Short", ticker: "JPM", targetPrice: 175, timeframe: "6 months", lockPrice: 198.20, lockTime: "2026-04-07T16:00:00Z" }, likes: 89, publishedAt: "2026-04-07T16:00:00Z", excerpt: "Rising credit defaults and compressed net interest margins signal trouble for traditional banking.", isPremium: true, price: 6.99, industry: "Financials", marketCap: "mega" },
  { id: "r5", title: "Meta's Metaverse Pivot: Finally Paying Off?", author: MOCK_ANALYSTS[4], tickers: ["META"], prediction: { action: "Long", ticker: "META", targetPrice: 580, timeframe: "9 months", lockPrice: 502.30, lockTime: "2026-04-06T11:45:00Z" }, likes: 127, publishedAt: "2026-04-06T11:45:00Z", excerpt: "Reality Labs is showing signs of traction with enterprise VR adoption. Combined with ad revenue growth, Meta presents a compelling risk/reward case.", isPremium: false, industry: "Big Tech", marketCap: "mega" },
  { id: "r6", title: "AMD vs NVIDIA: The Underdog Catches Up", author: MOCK_ANALYSTS[0], tickers: ["AMD", "NVDA"], prediction: { action: "Long", ticker: "AMD", targetPrice: 200, timeframe: "12 months", lockPrice: 142.80, lockTime: "2026-04-05T09:30:00Z" }, likes: 201, publishedAt: "2026-04-05T09:30:00Z", excerpt: "AMD's MI300X is gaining real enterprise traction. With NVIDIA capacity constraints, AMD could capture 15-20% of the AI accelerator market in 2026.", isPremium: true, price: 4.99, industry: "AI & Semiconductors", marketCap: "large" },
  { id: "r7", title: "Netflix: Content Moat & Ad Tier Expansion", author: MOCK_ANALYSTS[2], tickers: ["NFLX"], prediction: { action: "Long", ticker: "NFLX", targetPrice: 750, timeframe: "9 months", lockPrice: 628.50, lockTime: "2026-04-04T13:00:00Z" }, likes: 175, publishedAt: "2026-04-04T13:00:00Z", excerpt: "Netflix's ad-supported tier is growing faster than expected, now at 40M MAUs.", isPremium: false, industry: "Consumer Tech", marketCap: "large" },
  { id: "r8", title: "Palantir: Government AI Gold Rush", author: MOCK_ANALYSTS[7], tickers: ["PLTR"], prediction: { action: "Long", ticker: "PLTR", targetPrice: 38, timeframe: "6 months", lockPrice: 24.85, lockTime: "2026-04-03T10:00:00Z" }, likes: 298, publishedAt: "2026-04-03T10:00:00Z", excerpt: "Palantir's AIP platform is becoming the default AI operating system for US government agencies.", isPremium: true, price: 7.99, industry: "AI & Semiconductors", marketCap: "mid" },
  { id: "r9", title: "Coinbase: The Crypto Exchange Monopoly", author: MOCK_ANALYSTS[4], tickers: ["COIN"], prediction: { action: "Hold", ticker: "COIN", targetPrice: 240, timeframe: "6 months", lockPrice: 224.10, lockTime: "2026-04-02T15:00:00Z" }, likes: 112, publishedAt: "2026-04-02T15:00:00Z", excerpt: "Coinbase's institutional custody business is the real moat. While retail trading volumes are volatile, the B2B layer is becoming indispensable.", isPremium: false, industry: "Crypto & Web3", marketCap: "mid" },
  { id: "r10", title: "Shopify: SMB Commerce Platform at Scale", author: MOCK_ANALYSTS[6], tickers: ["SHOP"], prediction: { action: "Long", ticker: "SHOP", targetPrice: 100, timeframe: "12 months", lockPrice: 76.40, lockTime: "2026-04-01T11:00:00Z" }, likes: 143, publishedAt: "2026-04-01T11:00:00Z", excerpt: "Shopify's merchant ecosystem and financial products are creating a durable competitive moat in SMB e-commerce.", isPremium: false, industry: "E-Commerce", marketCap: "large" },
  { id: "h1", title: "NVDA Long → $1050 Target Hit!", author: MOCK_ANALYSTS[0], tickers: ["NVDA"], prediction: { action: "Long", ticker: "NVDA", targetPrice: 1050, timeframe: "6 months", lockPrice: 620.00, lockTime: "2025-10-01T09:00:00Z", outcome: "hit", outcomeNote: "Target hit in 5 months — NVDA surged on H100 demand surge and beat consensus revenue by 22%." }, likes: 521, publishedAt: "2025-10-01T09:00:00Z", excerpt: "Our H100/H200 thesis played out perfectly. NVDA hit $1050 ahead of schedule.", isPremium: false, industry: "AI & Semiconductors", marketCap: "mega" },
  { id: "h8", title: "GS Long Prediction — Update", author: MOCK_ANALYSTS[1], tickers: ["JPM"], prediction: { action: "Long", ticker: "GS", targetPrice: 440, timeframe: "3 months", lockPrice: 390.00, lockTime: "2026-01-15T09:00:00Z", outcome: "miss", outcomeNote: "Goldman missed earnings on higher provision charges. Target not met within timeframe." }, likes: 88, publishedAt: "2026-01-15T09:00:00Z", excerpt: "Banking headwinds proved more persistent than modeled.", isPremium: false, industry: "Financials", marketCap: "mega" },
  { id: "h9", title: "COIN Long → $260 — Smashed +69%!", author: MOCK_ANALYSTS[4], tickers: ["COIN"], prediction: { action: "Long", ticker: "COIN", targetPrice: 260, timeframe: "12 months", lockPrice: 154.00, lockTime: "2025-04-01T09:00:00Z", outcome: "hit", outcomeNote: "COIN surged on crypto bull run and spot ETF approvals, hitting $260 in just 8 months." }, likes: 412, publishedAt: "2025-04-01T09:00:00Z", excerpt: "The crypto regulatory clarity thesis proved correct as COIN outperformed all our projections.", isPremium: false, industry: "Crypto & Web3", marketCap: "mid" },
];