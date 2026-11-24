import styles from '@/components/auth/auth.module.css';
import FurnitureIllustration from '@/components/auth/FurnitureIllustration';
import { assets } from '@/svgPaths';
import { LuBox, LuFactory, LuLayoutGrid, LuRecycle, LuRuler, LuScissors } from 'react-icons/lu';

interface AuthShowcaseProps {
  eyebrow?: string;
  title: string;
  highlight: string;
  lead: string;
}

/**
 * Decorative brand panel shared by the auth pages (login, register, forgot, OTP).
 * Presentational only.
 */
const AuthShowcase = ({
  eyebrow = 'Furniture & interior manufacturing',
  title,
  highlight,
  lead,
}: AuthShowcaseProps) => (
  <aside className={styles.showcase}>
    <div className={styles.showcaseTop}>
      <img src={assets.phinxLogoLight} alt="Phinx" className={styles.showcaseLogo} />
      <span className={styles.eyebrow}>
        <LuRuler aria-hidden="true" />
        {eyebrow}
      </span>
      <h1 className={styles.headline}>
        {title}
        <span>{highlight}</span>
      </h1>
      <p className={styles.lead}>{lead}</p>
    </div>

    <div className={styles.illustrationWrap}>
      <FurnitureIllustration />
      <div className={`${styles.floatChip} ${styles.chipNesting}`}>
        <LuLayoutGrid aria-hidden="true" />
        <span>Nesting optimised</span>
      </div>
      <div className={`${styles.floatChip} ${styles.chipCnc}`}>
        <LuScissors aria-hidden="true" />
        <span>CNC ready</span>
      </div>
    </div>

    <ul className={styles.features}>
      <li>
        <span className={styles.featureIcon}>
          <LuBox aria-hidden="true" />
        </span>
        <div>
          <strong>3D furniture design</strong>
          <small>Cabinets, wardrobes and kitchens</small>
        </div>
      </li>
      <li>
        <span className={styles.featureIcon}>
          <LuRecycle aria-hidden="true" />
        </span>
        <div>
          <strong>Less sheet waste</strong>
          <small>Smart nesting on every board</small>
        </div>
      </li>
      <li>
        <span className={styles.featureIcon}>
          <LuFactory aria-hidden="true" />
        </span>
        <div>
          <strong>Production ready</strong>
          <small>Cut lists, reports and G-code</small>
        </div>
      </li>
    </ul>
  </aside>
);

export default AuthShowcase;
