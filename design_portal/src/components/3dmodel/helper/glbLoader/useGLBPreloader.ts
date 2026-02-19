import {
  CENTER_STUDY_TABLE,
  DINNER_TABLE,
  FLOWER,
  FRIDGE,
  MICROWAVE,
  SOFA,
  STOVE,
  TV,
} from '@/glbPaths';
import { useEffect, useRef } from 'react';
import { prefetchAll } from './index';

export const useGLBPreloader = () => {
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const allPaths: string[] = [];

    const collectPaths = (items: { path: string }[]) => {
      items.forEach((item) => {
        if (item.path) allPaths.push(item.path);
      });
    };

    collectPaths(SOFA);
    collectPaths(FRIDGE);
    collectPaths(STOVE);
    collectPaths(TV);
    collectPaths(DINNER_TABLE);
    collectPaths(FLOWER);
    collectPaths(MICROWAVE);
    collectPaths(CENTER_STUDY_TABLE);

    // Add any manually specified paths here if needed
    allPaths.push('/glb/kitchen_sink.glb');
    allPaths.push('/glb/door_handle.glb');

    // De-duplicate paths
    const uniquePaths = Array.from(new Set(allPaths));

    // console.log('Starting background prefetch for', uniquePaths.length, 'models');
    prefetchAll(uniquePaths);
  }, []);
};
