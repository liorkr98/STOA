export function isReportSaved(reportId) {
  return localStorage.getItem(`stoa_saved_report_${reportId}`) === "true";
}

export function setReportSaved(reportId, saved) {
  if (saved) {
    localStorage.setItem(`stoa_saved_report_${reportId}`, "true");
  } else {
    localStorage.removeItem(`stoa_saved_report_${reportId}`);
  }
}