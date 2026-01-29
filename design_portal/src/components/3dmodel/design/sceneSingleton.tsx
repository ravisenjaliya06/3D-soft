import { SceneBuilder } from '../sceneCreator/sceneBuilder';
import { getDesignCatalogs } from '../sceneCreator/utils';
import { ThreeDView } from './interface';

let globalThreeDView: ThreeDView | null = null;

export function getOrCreateThreeDView(mount: HTMLDivElement) {
  if (globalThreeDView) {
    if (globalThreeDView.renderer?.domElement) {
      mount.appendChild(globalThreeDView.renderer.domElement);
    }
    return globalThreeDView;
  }

  const builder = new SceneBuilder({ mount });
  globalThreeDView = builder.build();
  getDesignCatalogs();
  return globalThreeDView;
}
