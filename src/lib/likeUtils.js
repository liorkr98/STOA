export function isReportLiked(reportId) {
  return localStorage.getItem(`stoa_liked_report_${reportId}`) === "true";
}

export function setReportLiked(reportId, liked) {
  if (liked) {
    localStorage.setItem(`stoa_liked_report_${reportId}`, "true");
  } else {
    localStorage.removeItem(`stoa_liked_report_${reportId}`);
  }
}