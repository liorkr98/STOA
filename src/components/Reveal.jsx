import React, { useEffect, useRef, useState } from "react";

/**
 * Reveal — scroll-triggered entrance wrapper.
 *
 * Uses IntersectionObserver (once: true, -100px margin) to fade + lift a section
 * into view as it enters the viewport. Animation is pure CSS transform/opacity so
 * it runs off the main thread and stays smooth under load; reduced-motion users
 * see the content immediately with no movement.
 *
 * Props:
 *   as        {string}  Element tag to render (default "div")
 *   delay     {number}  ms stagger before this element animates in (default 0)
 *   y         {number}  px of vertical travel on entrance (default 18)
 *   className {string}  Passthrough classes
 */
export default function Reveal({
  as: Tag = "div",
  delay = 0,
  y = 18,
  className = "",
  style = {},
  children,
  ...rest
}) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced-motion: show immediately, skip the observer + movement.
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -100px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : `translateY(${y}px)`,
        transition: `opacity 600ms var(--ease-out) ${delay}ms, transform 600ms var(--ease-out) ${delay}ms`,
        willChange: shown ? "auto" : "opacity, transform",
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
