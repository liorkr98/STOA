import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Robust "back" handler.
//
// navigate(-1) silently no-ops in three real scenarios:
//   1. The user landed directly on the page (email link, refresh, deep-link).
//      location.key === "default" and history.length is 1.
//   2. The user navigated in from an external site, so the previous history
//      entry is outside this SPA — navigate(-1) leaves us inside the app.
//   3. Browser quirks (Safari, in-app webviews) where history.length lies.
//
// To keep the back button from feeling broken in any of these cases, we:
//   - Detect "no SPA history" up front and route directly to the fallback.
//   - If we DO navigate(-1) and the URL doesn't change within 120ms,
//     assume the back stack pointed outside the app and route to fallback.
export default function useGoBack(fallback = "/") {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    const hasSpaHistory =
      location.key && location.key !== "default" && window.history.length > 1;
    if (!hasSpaHistory) {
      navigate(fallback, { replace: true });
      return;
    }
    const before = window.location.pathname + window.location.search;
    navigate(-1);
    setTimeout(() => {
      const after = window.location.pathname + window.location.search;
      if (after === before) {
        // navigate(-1) didn't change the URL — back stack must point off-app.
        navigate(fallback, { replace: true });
      }
    }, 120);
  }, [navigate, location.key, fallback]);
}
