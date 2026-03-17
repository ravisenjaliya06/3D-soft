import { SceneBuilder } from '../sceneCreator/sceneBuilder';
import { getDesignCatalogs } from '../sceneCreator/utils';
import { ThreeDView } from './interface';

/** Per-design scene cache so each design has its own scene. */
const sceneCache = new Map<string, ThreeDView>();

export function getOrCreateThreeDView(
  mount: HTMLDivElement,
  designId: string,
  versionId?: string
): ThreeDView {
  const cacheKey = versionId ? `${designId}_${versionId}` : designId;
  let threeDView = sceneCache.get(cacheKey);

  if (threeDView) {
    if (threeDView.renderer?.domElement && threeDView.renderer.domElement.parentNode !== mount) {
      mount.appendChild(threeDView.renderer.domElement);
    }
    return threeDView;
  }

  // Create new scene and fetch initial state
  const builder = new SceneBuilder({ mount });
  threeDView = builder.build();
  sceneCache.set(cacheKey, threeDView);
  getDesignCatalogs(versionId, threeDView);

  return threeDView;
}

/** Remove a design's scene from cache (e.g. when leaving that design). Does not dispose. */
export function releaseDesignScene(designId: string, versionId?: string): void {
  const cacheKey = versionId ? `${designId}_${versionId}` : designId;
  sceneCache.delete(cacheKey);
}

/** Get cached design view without re-mounting or appending to DOM. */
export function getThreeDViewOnly(designId: string, versionId?: string): ThreeDView | undefined {
  const cacheKey = versionId ? `${designId}_${versionId}` : designId;
  return sceneCache.get(cacheKey);
}
