// WallSyncManager.ts

import * as THREE from "three";
import { store } from "../store";
import { convertFromMM, convertToMM } from "../handler/unitConversion";

export class WallSyncManager {
  private scene: THREE.Scene;

  constructor() {
    this.scene = store.getState().scene?.scene;
  }

  /**
   * Main function: sync wall from 2D → Redux + 3D
   */
  public syncWall(wallData: any) {
    const wallMesh = this._createWallMesh(wallData);
    this.scene.add(wallMesh);

    return wallMesh;
  }

  /**
   * Create 3D wall from your 2D data structure
   */
  private _createWallMesh(wall: any) {
    const { startPoint, endPoint, thickness, length } = wall;
    console.log(startPoint, endPoint, thickness, "startPoint, endPoint, thickness");
    const height = wall.height || 2000;

    console.log(length, height, thickness, "length, height, thickness");

    const geometry = new THREE.BoxGeometry(length, height, thickness);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });

    const mesh = new THREE.Mesh(geometry, material);

    mesh.name = `wall_${wall.id}`;
    mesh.userData.wallId = wall.id;

    console.log(startPoint.x + endPoint.x);
    console.log(startPoint.y + endPoint.y);

    mesh.position.set(
      (((startPoint.x + endPoint.x) / 2) / 100),
      1,
      (((startPoint.y + endPoint.y) / 2) / 100)
    );

    const angle = Math.atan2(
      endPoint.y - startPoint.y,
      endPoint.x - startPoint.x
    );
    mesh.rotation.y = -angle;

    mesh.scale.set(
        0.01, 0.01, 0.01
    );

    return mesh;
  }
}
