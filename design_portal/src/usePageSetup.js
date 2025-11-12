import { useEffect } from 'react';
import { assets } from './svgPaths';

export const usePageSetup = (title) => {
  useEffect(() => {
    // Set page title
    if (title) document.title = title;

    // Set favicon dynamically
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = assets.headerbraventologo;
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, [title]);
};
