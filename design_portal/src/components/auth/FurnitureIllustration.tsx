import styles from '@/components/auth/auth.module.css';

/**
 * Decorative kitchen + wardrobe elevation drawn as a workshop blueprint.
 * Purely presentational: no props, no state.
 */
const FurnitureIllustration = () => (
  <svg
    className={styles.illustration}
    viewBox="0 0 560 400"
    role="img"
    aria-label="Kitchen and wardrobe elevation with production dimensions"
  >
    {/* overall width dimension */}
    <g className={styles.dim}>
      <line x1="40" y1="28" x2="470" y2="28" />
      <line x1="40" y1="20" x2="40" y2="36" />
      <line x1="470" y1="20" x2="470" y2="36" />
      <rect className={styles.dimTag} x="216" y="17" width="78" height="22" rx="11" />
      <text x="255" y="32">
        3600 mm
      </text>
    </g>

    {/* tall wardrobe */}
    <rect className={styles.woodDark} x="40" y="60" width="112" height="300" rx="3" />
    <rect className={styles.wood} x="44" y="64" width="51" height="292" rx="2" />
    <rect className={styles.wood} x="97" y="64" width="51" height="292" rx="2" />
    <rect className={styles.handle} x="88" y="190" width="3" height="40" rx="1.5" />
    <rect className={styles.handle} x="101" y="190" width="3" height="40" rx="1.5" />

    {/* wall cabinets */}
    <rect className={styles.woodDark} x="176" y="76" width="168" height="86" rx="3" />
    <rect className={styles.woodLight} x="180" y="80" width="78" height="78" rx="2" />
    <rect className={styles.woodLight} x="262" y="80" width="78" height="78" rx="2" />
    <rect className={styles.handle} x="236" y="140" width="16" height="3" rx="1.5" />
    <rect className={styles.handle} x="268" y="140" width="16" height="3" rx="1.5" />

    {/* open shelves */}
    <rect className={styles.woodDark} x="364" y="112" width="96" height="5" rx="2" />
    <rect className={styles.woodDark} x="364" y="156" width="96" height="5" rx="2" />
    <rect className={styles.stone} x="372" y="90" width="9" height="22" rx="1.5" />
    <rect className={styles.accentFill} x="383" y="94" width="8" height="18" rx="1.5" />
    <rect className={styles.woodLight} x="393" y="88" width="10" height="24" rx="1.5" />
    <path className={styles.stone} d="M424 156 h22 l-3 -18 h-16 z" />
    <path className={styles.leaf} d="M435 138 c-2 -16 6 -22 14 -24 c-2 10 -6 18 -14 24 z" />
    <path className={styles.leaf} d="M435 138 c0 -14 -8 -20 -16 -20 c2 10 8 16 16 20 z" />

    {/* countertop */}
    <rect className={styles.stone} x="168" y="236" width="300" height="12" rx="2" />

    {/* base cabinets */}
    <rect className={styles.woodDark} x="172" y="248" width="292" height="112" rx="3" />
    {/* drawer stack */}
    <rect className={styles.wood} x="176" y="252" width="88" height="32" rx="2" />
    <rect className={styles.wood} x="176" y="288" width="88" height="32" rx="2" />
    <rect className={styles.wood} x="176" y="324" width="88" height="32" rx="2" />
    <rect className={styles.handle} x="206" y="266" width="28" height="3" rx="1.5" />
    <rect className={styles.handle} x="206" y="302" width="28" height="3" rx="1.5" />
    <rect className={styles.handle} x="206" y="338" width="28" height="3" rx="1.5" />
    {/* doors */}
    <rect className={styles.wood} x="268" y="252" width="94" height="104" rx="2" />
    <rect className={styles.wood} x="366" y="252" width="94" height="104" rx="2" />
    <rect className={styles.handle} x="352" y="270" width="3" height="30" rx="1.5" />
    <rect className={styles.handle} x="373" y="270" width="3" height="30" rx="1.5" />

    {/* items on counter */}
    <path className={styles.accentFill} d="M200 236 h26 v-14 a13 13 0 0 0 -26 0 z" />
    <rect className={styles.woodLight} x="410" y="214" width="34" height="22" rx="3" />

    {/* floor */}
    <line className={styles.floor} x1="20" y1="361" x2="540" y2="361" />

    {/* base height dimension */}
    <g className={styles.dim}>
      <line x1="492" y1="248" x2="492" y2="360" />
      <line x1="484" y1="248" x2="500" y2="248" />
      <line x1="484" y1="360" x2="500" y2="360" />
      <rect className={styles.dimTag} x="503" y="293" width="44" height="22" rx="11" />
      <text x="525" y="308">
        720
      </text>
    </g>

    {/* cut marker on a door: hints at nesting / CNC */}
    <g className={styles.cutMark}>
      <rect x="366" y="252" width="94" height="104" rx="2" />
    </g>
  </svg>
);

export default FurnitureIllustration;
