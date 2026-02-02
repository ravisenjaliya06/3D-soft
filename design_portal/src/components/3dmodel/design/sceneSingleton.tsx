import { SceneBuilder } from '../sceneCreator/sceneBuilder';
import { getDesignCatalogs } from '../sceneCreator/utils';
import { ThreeDView } from './interface';

/** Per-design scene cache so each design has its own scene. */
const sceneCache = new Map<string, ThreeDView>();

export function getOrCreateThreeDView(mount: HTMLDivElement, designId: string): ThreeDView {
  const cached = sceneCache.get(designId);
  if (cached) {
    if (cached.renderer?.domElement && cached.renderer.domElement.parentNode !== mount) {
      mount.appendChild(cached.renderer.domElement);
    }
    return cached;
  }

  const builder = new SceneBuilder({ mount });
  const threeDView = builder.build();
  sceneCache.set(designId, threeDView);
  getDesignCatalogs();
  return threeDView;
}

/** Remove a design's scene from cache (e.g. when leaving that design). Does not dispose. */
export function releaseDesignScene(designId: string): void {
  sceneCache.delete(designId);
}
