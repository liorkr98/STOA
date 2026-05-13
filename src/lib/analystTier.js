// Tier + achievement utilities — delegates to scoringEngine for scoring logic
import { computeScore, computeTier, computeTierProgress as engineProgress } from './scoringEngine';

// ── computeAnalystTier ────────────────────────────────────────────────────────
// Signature unchanged — called as computeAnalystTier(user, allReports) everywhere.
// allReports may be all reports or pre-filtered to the analyst — the filter below
// handles both cases safely.
export function computeAnalystTier(user, allReports) {
  const mine = (allReports || []).filter(r => r.created_by === user.email);
  const { score, total } = computeScore(mine.length ? mine : allReports || []);
  return computeTier(score, total);
}

// ── computeTierProgress ───────────────────────────────────────────────────────
// Returns { current, next, requirements } for TierProgressBar component.
export function computeTierProgress(user, allReports) {
  const mine = (allReports || []).filter(r => r.created_by === user.email);
  const { score, total } = computeScore(mine.length ? mine : allReports || []);
  return engineProgress(score, total);
}

// ── computeAchievements ───────────────────────────────────────────────────────
// Unchanged — based on raw report counts, not the scoring model.
export function computeAchievements(user, allReports) {
  const userReports = (allReports || []).filter(
    r => r.created_by === user.email && r.status === 'published'
  );
  const resolved = userReports.filter(
    r => r.prediction_outcome && r.prediction_outcome !== 'pending'
  );
  const hits   = resolved.filter(r => r.prediction_outcome === 'hit' || r.prediction_outcome === 'near');
  const shorts = resolved.filter(r =>
    r.prediction_action === 'Short' && (r.prediction_outcome === 'hit' || r.prediction_outcome === 'near')
  );
  const longs  = resolved.filter(r =>
    r.prediction_action === 'Long' && (r.prediction_outcome === 'hit' || r.prediction_outcome === 'near')
  );

  const sortedResolved = [...resolved].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  let streak = 0;
  for (const r of sortedResolved) {
    if (r.prediction_outcome === 'hit' || r.prediction_outcome === 'near') streak++;
    else break;
  }

  const longTermHit = resolved.some(r =>
    (r.prediction_outcome === 'hit' || r.prediction_outcome === 'near') &&
    r.prediction_timeframe &&
    (r.prediction_timeframe.includes('6') ||
     r.prediction_timeframe.toLowerCase().includes('year') ||
     r.prediction_timeframe.toLowerCase().includes('long'))
  );

  const speedDemon = resolved.some(r => {
    if (!r.created_date || !r.prediction_resolved_time) return false;
    return new Date(r.prediction_resolved_time) - new Date(r.created_date) <= 24 * 60 * 60 * 1000;
  });

  const joinDate   = user.created_date ? new Date(user.created_date) : new Date();
  const daysActive = Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24));

  return [
    { icon: '🔥', name: 'Hot Streak',    desc: '5 consecutive hits',        earned: streak >= 5 },
    { icon: '🎯', name: 'Sharpshooter',  desc: '10 consecutive hits',       earned: streak >= 10 },
    { icon: '💎', name: 'Diamond Hands', desc: '6-month+ call resolved',    earned: longTermHit },
    { icon: '🐂', name: 'Bull Master',   desc: '20 successful long calls',  earned: longs.length >= 20 },
    { icon: '🐻', name: 'Bear Master',   desc: '10 successful short calls', earned: shorts.length >= 10 },
    { icon: '📅', name: 'Veteran',       desc: '1 year on STOA',            earned: daysActive >= 365 },
    { icon: '🌟', name: 'Pioneer',       desc: 'Among first 100 researchers',  earned: !!user.is_pioneer },
    { icon: '📊', name: 'Century',       desc: '100 predictions resolved',  earned: resolved.length >= 100 },
    { icon: '⚡', name: 'Speed Demon',   desc: 'Prediction resolved in 24h', earned: speedDemon },
    { icon: '✅', name: 'Verified',      desc: 'Verified by STOA',          earned: !!user.verified },
  ];
}
