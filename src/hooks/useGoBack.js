import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Robust "back" handler.
// navigate(-1) silently no-ops when the user landed directly on the page
// (link from email, refresh, deep-link). In that case we fall back to a
// sensible destination instead of leaving the button visually dead.
export default function useGoBack(fallback = "/") {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    const hasHistory =
      location.key && location.key !== "default" && window.history.length > 1;
    if (hasHistory) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [navigate, location.key, fallback]);
}
