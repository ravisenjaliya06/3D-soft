// WallSyncManager.ts

import * as THREE from 'three';
import { Wall } from '../2dmodel/interface';
import { store } from '../store';
import { WALL_DEFAULT_HEIGHT } from './constants';
import { FLOOR_PLAN_TYPES, GEOMETRY, MATERIAL_TYPE, MeshObjectData } from './interface';
import { MeshBuilder } from './meshBuilder';

export class WallSyncManager {
  private scene: THREE.Scene;
  private data: Wall;

  constructor() {
    this.scene = store.getState().scene?.scene;
    this.data = {} as Wall;
  }

  /**
   * Main function: sync wall from 2D → Redux + 3D
   */
  public syncWall(data: Wall): THREE.Mesh {
    this.data = data;

    const wallMesh = this._createWallMesh();
    this.scene.add(wallMesh);

    return wallMesh;
  }

  private _convertPosition2DTo3D(): THREE.Vector3 {
    const sumX = this.data.startPoint.x + this.data.endPoint.x;
    const sumY = this.data.startPoint.y + this.data.endPoint.y;

    const x = sumX / 2 / 100;
    const y = 1.4;
    const z = sumY / 2 / 100;

    return new THREE.Vector3(x, y, z);
  }

  private _findRotation(): THREE.Vector3 {
    const angle = Math.atan2(
      this.data.endPoint.y - this.data.startPoint.y,
      this.data.endPoint.x - this.data.startPoint.x
    );
    return new THREE.Vector3(0, -angle, 0);
  }

  private _convertDataToMeshData(): MeshObjectData {
    const id = crypto.randomUUID();

    const meshData: MeshObjectData = {
      id: id,
      name: `wall_${id}`,
      type: FLOOR_PLAN_TYPES.WALL,
      geometry_type: GEOMETRY.BOX_GEOMETRY,
      dimensions: {
        width: this.data.length,
        height: this.data.height || WALL_DEFAULT_HEIGHT,
        depth: this.data.thickness,
      },
      position: this._convertPosition2DTo3D(),
      rotation: this._findRotation(),
      scale: { x: 0.01, y: 0.001, z: 0.01 },
      material: {
        type: MATERIAL_TYPE.COLOR,
        value: '#c4c3c3',
      },
      isMain: true,
    };

    return meshData;
  }

  /**
   * Create 3D wall from your 2D data structure
   */
  private _createWallMesh() {
    const mesh = new MeshBuilder(this._convertDataToMeshData()).createMesh();

    return mesh;
  }
}
