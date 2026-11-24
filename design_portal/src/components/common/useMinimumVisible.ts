import { useEffect, useRef, useState } from 'react';

/** How long a Phinx loader stays on screen at minimum, so its assembly animation can be read. */
export const LOADER_MIN_VISIBLE_MS = 1200;

/**
 * Mirrors `active`, but once it turns true keeps returning true for at least `minMs`.
 * Only affects how long the loader is shown — the underlying loading logic is untouched.
 */
export function useMinimumVisible(active: boolean, minMs = LOADER_MIN_VISIBLE_MS) {
  const shownAt = useRef<number | null>(null);
  const [, rerender] = useState(0);

  if (active && shownAt.current === null) {
    shownAt.current = Date.now();
  }

  const remaining =
    !active && shownAt.current !== null ? minMs - (Date.now() - shownAt.current) : 0;

  useEffect(() => {
    if (active || shownAt.current === null) return undefined;
    const left = minMs - (Date.now() - shownAt.current);
    const timer = window.setTimeout(
      () => {
        shownAt.current = null;
        rerender((n) => n + 1);
      },
      Math.max(0, left)
    );
    return () => window.clearTimeout(timer);
  }, [active, minMs]);

  return active || remaining > 0;
}
