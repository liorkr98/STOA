// Shared tier + achievement utilities

export function computeAnalystTier(user, allReports) {
  const userReports = (allReports || []).filter(r => r.created_by === user.email);
  const resolved = userReports.filter(r => r.prediction_outcome && r.prediction_outcome !== 'pending');
  const hits = resolved.filter(r => r.prediction_outcome === 'hit' || r.prediction_outcome === 'near').length;
  const accuracy = resolved.length > 0 ? (hits / resolved.length) * 100 : 0;
  const resolvedCount = resolved.length;

  const joinDate = user.created_date ? new Date(user.created_date) : new Date();
  const daysActive = Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24));

  if (resolvedCount >= 100 && daysActive >= 730 && accuracy >= 80)
    return { tier: 'legend', label: '👑 Legend', color: '#412402', bg: '#faeeda', border: '#ef9f27' };
  if (resolvedCount >= 50 && daysActive >= 365 && accuracy >= 80)
    return { tier: 'elite', label: '⭐ Elite', color: '#633806', bg: '#faeeda', border: '#f59e0b' };
  if (resolvedCount >= 30 && daysActive >= 180 && accuracy >= 65)
    return { tier: 'expert', label: '🔷 Expert', color: '#185fa5', bg: '#e6f1fb', border: '#3b82f6' };
  if (resolvedCount >= 15 && daysActive >= 90 && accuracy >= 50)
    return { tier: 'strong', label: '💪 Strong', color: '#3b6d11', bg: '#eaf3de', border: '#22c55e' };
  if (resolvedCount >= 5 && daysActive >= 30)
    return { tier: 'rising', label: '📈 Rising', color: '#0c447c', bg: '#e6f1fb', border: '#3b82f6' };
  return { tier: 'building', label: '🔨 Building', color: '#6b6a64', bg: '#f1f0ec', border: '#d3d1c7' };
}

// Returns { current, next, requirements } for progress display
export function computeTierProgress(user, allReports) {
  const userReports = (allReports || []).filter(r => r.created_by === user.email);
  const resolved = userReports.filter(r => r.prediction_outcome && r.prediction_outcome !== 'pending');
  const hits = resolved.filter(r => r.prediction_outcome === 'hit' || r.prediction_outcome === 'near').length;
  const accuracy = resolved.length > 0 ? (hits / resolved.length) * 100 : 0;
  const resolvedCount = resolved.length;
  const joinDate = user.created_date ? new Date(user.created_date) : new Date();
  const daysActive = Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24));

  const current = computeAnalystTier(user, allReports);

  const TIERS = [
    { tier: 'rising',  label: '📈 Rising',  needs: { resolved: 5,   days: 30,  accuracy: 0  } },
    { tier: 'strong',  label: '💪 Strong',  needs: { resolved: 15,  days: 90,  accuracy: 50 } },
    { tier: 'expert',  label: '🔷 Expert',  needs: { resolved: 30,  days: 180, accuracy: 65 } },
    { tier: 'elite',   label: '⭐ Elite',   needs: { resolved: 50,  days: 365, accuracy: 80 } },
    { tier: 'legend',  label: '👑 Legend',  needs: { resolved: 100, days: 730, accuracy: 80 } },
  ];

  const nextTier = TIERS.find(t => t.tier !== current.tier && (() => {
    if (t.tier === 'rising')  return resolvedCount < 5   || daysActive < 30;
    if (t.tier === 'strong')  return resolvedCount < 15  || daysActive < 90  || accuracy < 50;
    if (t.tier === 'expert')  return resolvedCount < 30  || daysActive < 180 || accuracy < 65;
    if (t.tier === 'elite')   return resolvedCount < 50  || daysActive < 365 || accuracy < 80;
    if (t.tier === 'legend')  return resolvedCount < 100 || daysActive < 730 || accuracy < 80;
    return false;
  })());

  if (!nextTier) return { current, next: null, requirements: [] };

  const n = nextTier.needs;
  const requirements = [];
  if (n.resolved > 0) requirements.push({
    label: 'Resolved calls', current: resolvedCount, required: n.resolved,
    met: resolvedCount >= n.resolved,
  });
  requirements.push({
    label: 'Days active', current: daysActive, required: n.days,
    met: daysActive >= n.days,
  });
  if (n.accuracy > 0) requirements.push({
    label: 'Accuracy', current: parseFloat(accuracy.toFixed(1)), required: n.accuracy,
    met: accuracy >= n.accuracy, isPercent: true,
  });

  return { current, next: nextTier, requirements };
}

export function computeAchievements(user, allReports) {
  const userReports = (allReports || []).filter(r => r.created_by === user.email && r.status === 'published');
  const resolved = userReports.filter(r => r.prediction_outcome && r.prediction_outcome !== 'pending');
  const hits = resolved.filter(r => r.prediction_outcome === 'hit' || r.prediction_outcome === 'near');
  const shorts = resolved.filter(r => r.prediction_action === 'Short' && (r.prediction_outcome === 'hit' || r.prediction_outcome === 'near'));
  const longs  = resolved.filter(r => r.prediction_action === 'Long'  && (r.prediction_outcome === 'hit' || r.prediction_outcome === 'near'));

  const sortedResolved = [...resolved].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  let streak = 0;
  for (const r of sortedResolved) {
    if (r.prediction_outcome === 'hit' || r.prediction_outcome === 'near') streak++;
    else break;
  }

  const longTermHit = resolved.some(r =>
    (r.prediction_outcome === 'hit' || r.prediction_outcome === 'near') &&
    r.prediction_timeframe && (r.prediction_timeframe.includes('6') || r.prediction_timeframe.toLowerCase().includes('year') || r.prediction_timeframe.toLowerCase().includes('long'))
  );

  const speedDemon = resolved.some(r => {
    if (!r.created_date || !r.prediction_resolved_time) return false;
    const diff = new Date(r.prediction_resolved_time) - new Date(r.created_date);
    return diff <= 24 * 60 * 60 * 1000;
  });

  const joinDate = user.created_date ? new Date(user.created_date) : new Date();
  const daysActive = Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24));

  const ALL_BADGES = [
    { icon: '🔥', name: 'Hot Streak',   desc: '5 consecutive hits',        earned: streak >= 5 },
    { icon: '🎯', name: 'Sharpshooter', desc: '10 consecutive hits',       earned: streak >= 10 },
    { icon: '💎', name: 'Diamond Hands',desc: '6-month+ call resolved',    earned: longTermHit },
    { icon: '🐂', name: 'Bull Master',  desc: '20 successful long calls',  earned: longs.length >= 20 },
    { icon: '🐻', name: 'Bear Master',  desc: '10 successful short calls', earned: shorts.length >= 10 },
    { icon: '📅', name: 'Veteran',      desc: '1 year on STOA',            earned: daysActive >= 365 },
    { icon: '🌟', name: 'Pioneer',      desc: 'Among first 100 analysts',  earned: !!user.is_pioneer },
    { icon: '📊', name: 'Century',      desc: '100 predictions resolved',  earned: resolved.length >= 100 },
    { icon: '⚡', name: 'Speed Demon',  desc: 'Prediction resolved in 24h',earned: speedDemon },
    { icon: '✅', name: 'Verified',     desc: 'Verified by STOA',          earned: !!user.verified },
  ];

  return ALL_BADGES;
}