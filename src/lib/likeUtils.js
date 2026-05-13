// Namespaced by userEmail so different users on the same browser can't share like state,
// and the same user can't double-like from different sessions.
function key(reportId, userEmail) {
  return `stoa_liked_${userEmail || "anon"}_${reportId}`;
}

export function isReportLiked(reportId, userEmail) {
  return localStorage.getItem(key(reportId, userEmail)) === "1";
}

export function setReportLiked(reportId, liked, userEmail) {
  if (liked) {
    localStorage.setItem(key(reportId, userEmail), "1");
  } else {
    localStorage.removeItem(key(reportId, userEmail));
  }
}
