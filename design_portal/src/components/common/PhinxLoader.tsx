import React from 'react';
import styles from './PhinxLoader.module.css';

/**
 * Phinx loading system — furniture line-art that "assembles" while work is in progress.
 *
 * Scenes (one design language: same stroke, palette and 3.6s rhythm):
 *  - cabinet : plinth, sides, top, shelf and doors fit together (general / full-screen work)
 *  - sofa    : a sofa outline is drawn, then cushions settle (lists of designs)
 *  - lamp    : a pendant lamp lights the room (rendering)
 *  - sheet   : cut panels are laid out on a board (nesting / sheet layout)
 *
 * The component only renders what it is given — callers keep their own loading logic.
 */
export type PhinxLoaderScene = 'cabinet' | 'sofa' | 'lamp' | 'sheet';

interface PhinxLoaderProps {
  scene?: PhinxLoaderScene;
  /** Main line, e.g. "Crafting your space…" */
  label?: string;
  /** Optional smaller line under the label. */
  hint?: string;
  /** Full-screen blocking overlay (fixed, with backdrop). */
  overlay?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** Show the tape-measure progress strip. Defaults to true for md/lg. */
  showProgress?: boolean;
  /** Marks the app-wide page loader; while it is up, other overlays step aside. */
  pageLoader?: boolean;
  className?: string;
}

const Cabinet = () => (
  <svg viewBox="0 0 120 100" className={styles.art} aria-hidden="true">
    <line className={styles.floor} x1="8" y1="91" x2="112" y2="91" />
    <rect className={`${styles.part} ${styles.c1}`} x="30" y="83" width="60" height="7" rx="1.5" />
    <rect className={`${styles.part} ${styles.c2}`} x="30" y="22" width="6" height="61" rx="1" />
    <rect className={`${styles.part} ${styles.c2}`} x="84" y="22" width="6" height="61" rx="1" />
    <rect className={`${styles.part} ${styles.c3}`} x="26" y="15" width="68" height="7" rx="1.5" />
    <line className={`${styles.part} ${styles.c4}`} x1="37" y1="52" x2="83" y2="52" />
    <rect className={`${styles.accent} ${styles.c5} ${styles.hingeLeft}`} x="37.5" y="23.5" width="22" height="58" rx="1" />
    <rect className={`${styles.accent} ${styles.c5} ${styles.hingeRight}`} x="60.5" y="23.5" width="22" height="58" rx="1" />
    <line className={`${styles.part} ${styles.c6}`} x1="55" y1="47" x2="55" y2="57" />
    <line className={`${styles.part} ${styles.c6}`} x1="65" y1="47" x2="65" y2="57" />
  </svg>
);

const Sofa = () => (
  <svg viewBox="0 0 120 84" className={styles.art} aria-hidden="true">
    <line className={styles.floor} x1="8" y1="76" x2="112" y2="76" />
    <path
      className={`${styles.part} ${styles.draw}`}
      pathLength={1}
      d="M24 44 V27 Q24 20 31 20 H89 Q96 20 96 27 V44"
    />
    <path
      className={`${styles.part} ${styles.draw}`}
      pathLength={1}
      d="M14 66 V47 Q14 41 20 41 Q27 41 27 47 V55 H93 V47 Q93 41 100 41 Q106 41 106 47 V66 Z"
    />
    <path className={`${styles.part} ${styles.s2}`} d="M22 66 V73 M98 66 V73" />
    <rect className={`${styles.accent} ${styles.s3}`} x="30" y="45" width="29" height="10" rx="3" />
    <rect className={`${styles.accent} ${styles.s4}`} x="61" y="45" width="29" height="10" rx="3" />
  </svg>
);

const Lamp = () => (
  <svg viewBox="0 0 120 100" className={styles.art} aria-hidden="true">
    <path className={styles.cone} d="M45 47 L20 90 H100 L75 47 Z" />
    <line className={styles.floor} x1="8" y1="91" x2="112" y2="91" />
    <g className={styles.sway}>
      <line className={styles.part} x1="60" y1="0" x2="60" y2="24" />
      <path className={styles.part} d="M41 46 L50 24 H70 L79 46 Z" />
      <circle className={styles.bulb} cx="60" cy="50" r="4.5" />
    </g>
    <path
      className={`${styles.part} ${styles.lit}`}
      d="M38 90 V78 Q38 73 43 73 H77 Q82 73 82 78 V90 M34 82 H86"
    />
  </svg>
);

const Sheet = () => (
  <svg viewBox="0 0 120 90" className={styles.art} aria-hidden="true">
    <rect className={styles.board} x="8" y="10" width="104" height="70" rx="2" />
    <rect className={`${styles.accent} ${styles.n1}`} x="13" y="15" width="40" height="30" rx="1" />
    <rect className={`${styles.accent} ${styles.n2}`} x="57" y="15" width="24" height="30" rx="1" />
    <rect className={`${styles.accent} ${styles.n3}`} x="85" y="15" width="22" height="60" rx="1" />
    <rect className={`${styles.accent} ${styles.n4}`} x="13" y="49" width="28" height="26" rx="1" />
    <rect className={`${styles.accent} ${styles.n5}`} x="45" y="49" width="36" height="26" rx="1" />
    <line className={styles.cutter} x1="8" y1="10" x2="8" y2="80" />
  </svg>
);

const SCENES: Record<PhinxLoaderScene, () => React.JSX.Element> = {
  cabinet: Cabinet,
  sofa: Sofa,
  lamp: Lamp,
  sheet: Sheet,
};

export default function PhinxLoader({
  scene = 'cabinet',
  label = 'Crafting your space…',
  hint,
  overlay = false,
  size = overlay ? 'lg' : 'md',
  showProgress,
  pageLoader = false,
  className,
}: PhinxLoaderProps) {
  const Art = SCENES[scene];
  const progress = showProgress ?? size !== 'sm';

  const body = (
    <div
      className={`${styles.loader} ${styles[size]} ${overlay ? styles.card : ''} ${className || ''}`}
      role="status"
      aria-live="polite"
    >
      <Art />
      {progress && <span className={styles.tape} aria-hidden="true" />}
      {label && <span className={styles.label}>{label}</span>}
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );

  if (!overlay) return body;
  return (
    <div className={styles.overlay} data-phx-page-loader={pageLoader ? '' : undefined}>
      {body}
    </div>
  );
}

/** Compact inline indicator (three boards stacking) for small spots such as buttons and list footers. */
export function PhinxMiniLoader({ label, className }: { label?: string; className?: string }) {
  return (
    <span className={`${styles.mini} ${className || ''}`} role="status" aria-live="polite">
      <span className={styles.planks} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {label && <span>{label}</span>}
    </span>
  );
}
