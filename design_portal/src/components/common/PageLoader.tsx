import Router, { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import PhinxLoader, { type PhinxLoaderScene } from './PhinxLoader';

/** Page loads stay up long enough for the cabinet to finish assembling. */
const PAGE_MIN_VISIBLE_MS = 1600;
/** Safety net: never block the screen longer than this, even if a route event is lost. */
const PAGE_MAX_VISIBLE_MS = 15000;

const sceneFor = (path: string): { scene: PhinxLoaderScene; label: string } => {
  const p = path.split('?')[0];
  if (p.startsWith('/rendering')) return { scene: 'lamp', label: 'Setting up the render studio…' };
  if (p.includes('nesting') || p.startsWith('/mes'))
    return { scene: 'sheet', label: 'Preparing production…' };
  if (p.startsWith('/designs') || p.startsWith('/template'))
    return { scene: 'sofa', label: 'Opening your designs…' };
  if (p.startsWith('/design/')) return { scene: 'cabinet', label: 'Opening the design studio…' };
  if (p.startsWith('/auth')) return { scene: 'cabinet', label: 'Preparing your experience…' };
  return { scene: 'cabinet', label: 'Crafting your space…' };
};

/**
 * App-wide page loader: shown on first load and on every route change,
 * held for a short minimum so the animation reads, then removed.
 */
export default function PageLoader() {
  const router = useRouter();
  const [target, setTarget] = useState<string | null>(router.asPath || '/');
  const shownAt = useRef(Date.now());
  const hideTimer = useRef<number | undefined>(undefined);
  const maxTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const clearTimers = () => {
      window.clearTimeout(hideTimer.current);
      window.clearTimeout(maxTimer.current);
    };
    const hide = () => {
      clearTimers();
      const left = PAGE_MIN_VISIBLE_MS - (Date.now() - shownAt.current);
      hideTimer.current = window.setTimeout(() => setTarget(null), Math.max(0, left));
    };
    const show = (url: string, { shallow }: { shallow?: boolean } = {}) => {
      const samePage = url.split(/[?#]/)[0] === Router.asPath.split(/[?#]/)[0];
      if (shallow || samePage) return;
      clearTimers();
      shownAt.current = Date.now();
      setTarget(url);
      maxTimer.current = window.setTimeout(() => setTarget(null), PAGE_MAX_VISIBLE_MS);
    };

    // First load / full reload: hide once the window has finished loading.
    if (document.readyState === 'complete') hide();
    else window.addEventListener('load', hide, { once: true });

    Router.events.on('routeChangeStart', show);
    Router.events.on('routeChangeComplete', hide);
    Router.events.on('routeChangeError', hide);
    return () => {
      window.removeEventListener('load', hide);
      Router.events.off('routeChangeStart', show);
      Router.events.off('routeChangeComplete', hide);
      Router.events.off('routeChangeError', hide);
      clearTimers();
    };
  }, []);

  if (target === null) return null;
  const { scene, label } = sceneFor(target);
  return <PhinxLoader overlay pageLoader scene={scene} label={label} />;
}
