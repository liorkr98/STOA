const STORAGE_KEY = "stakify_twits";

const DEFAULT_TWITS = [
  { id: 1, content: "Watching NVDA open. This AI infrastructure cycle has legs — don't fight the tape. 🟢", time: "2h ago" },
  { id: 2, content: "Fed commentary was more hawkish than expected. Rotating out of rate-sensitive names. Staying long quality tech.", time: "1d ago" },
];

export function getTwits() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_TWITS;
  } catch {
    return DEFAULT_TWITS;
  }
}

export function saveTwit(content) {
  const current = getTwits();
  const newTwit = { id: Date.now(), content, time: "just now" };
  const updated = [newTwit, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}