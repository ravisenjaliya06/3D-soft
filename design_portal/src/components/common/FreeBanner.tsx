/**
 * FreeBanner — global "100% Free until 31-03-2027" announcement bar.
 *
 * Mounted in ``_app.tsx`` so it renders on EVERY page (login, dashboard,
 * design editor, settings — all of them). Self-contained: styles are
 * scoped via CSS Modules and the only external bit is the deadline date.
 *
 * Behaviour:
 *   - Fixed at the top of the viewport, full width, z-index higher than
 *     toasts/modals so it can't be hidden.
 *   - Auto-hides itself AFTER the deadline so we don't keep showing a
 *     stale offer (Date.now() check, runs only on the client to avoid
 *     SSR hydration mismatches).
 *   - Subtle pulse animation on the sparkle so it draws the eye without
 *     being aggressive.
 *
 * If you want to change the deadline, edit ``DEADLINE_ISO`` below.
 */

import { useEffect, useState } from 'react';
import styles from './FreeBanner.module.css';

/** ISO-format deadline (YYYY-MM-DD). End-of-day in user's local timezone. */
const DEADLINE_ISO = '2027-03-31';
const DEADLINE_DISPLAY = '31-03-2027';

export default function FreeBanner() {
  // Hidden during SSR — we don't know the client clock yet, and we don't
  // want a hydration mismatch flash. Banner appears after first paint.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const now = new Date();
    const deadline = new Date(`${DEADLINE_ISO}T23:59:59`);
    if (now <= deadline) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div  role="status" aria-live="polite">
     
    </div>
  );
}
