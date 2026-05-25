import { useEffect, useState } from "react";

/**
 * useAutoHideOnScroll
 *
 * Returns `true` when the page-level top nav should be visible.
 * Scrolling DOWN past `threshold` hides it; scrolling UP at all reveals
 * it; at the very top of the page it's always visible. Throttled to one
 * decision per animation frame (~60fps) for performance.
 */
export function useAutoHideOnScroll({ threshold = 8 } = {}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY;
        if (y <= 0) {
          setVisible(true);
        } else if (Math.abs(delta) > threshold) {
          setVisible(delta < 0);
        }
        lastY = y;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return visible;
}
