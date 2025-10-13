// @ts-nocheck
import * as THREE from 'three';

function getFloorY(scene: THREE.Scene): number {
  let floorY = 0;
  const cWallGroup = scene.getObjectByName(
    'cWallWithFloor',
  ) as THREE.Group | null;
  if (cWallGroup) {
    const floorObj = cWallGroup.children.find(
      (o) => (o as THREE.Mesh).geometry instanceof THREE.PlaneGeometry,
    ) as THREE.Mesh | undefined;
    if (floorObj) floorY = floorObj.position.y;
  }
  return floorY;
}

function getPlacementZAgainstCenterWall(
  scene: THREE.Scene,
  depth: number,
): number {
  let placeZ = depth / 2 + 0.02;
  const centerWall = scene.getObjectByName('Center Wall') as THREE.Mesh | null;
  if (centerWall) {
    const params = (centerWall.geometry as THREE.BoxGeometry).parameters as any;
    const wallDepth = params.depth as number;
    placeZ = centerWall.position.z + wallDepth / 2 + depth / 2 + 0.005;
  }
  return placeZ;
}

export const addDynamicObject = (scene: THREE.Scene, cabinetData: any) => {
  if (!cabinetData || !cabinetData.rule_parts) {
    console.error('Invalid cabinet data provided.');
    return;
  }

  // Convert to meters
  //   const mmToM = (val: number | null) => (val ? val / 1000 : 0);

  const width = cabinetData.width;
  const height = cabinetData.height;
  const depth = cabinetData.depth;
  const thickness = cabinetData.thickness;

  const floorY = getFloorY(scene);
  const placeZ = getPlacementZAgainstCenterWall(scene, depth);
  const placeX = 0;

  // Load texture
  const textureLoader = new THREE.TextureLoader();
  const woodTex = textureLoader.load('/textures/light_wood.jpg');
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(2, 1);

  const plankMaterialProps = new THREE.MeshStandardMaterial({
    map: woodTex,
    roughness: 0.6,
    metalness: 0,
  });

  const invisibleMaterial = new THREE.MeshStandardMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });

  // Create parent container
  const cabinetContainer = new THREE.Group();
  cabinetContainer.name = cabinetData.name || 'DynamicCabinet';
  cabinetContainer.position.set(placeX, floorY + height / 2, placeZ);

  // Helper to create plank mesh
  const createPlankMesh = (part: any) => {
    const dim = {
      width: part.width,
      height: part.height,
      depth: part.depth,
    };

    const pos = {
      x: part.position?.x || 0,
      y: part.position?.y || 0,
      z: part.position?.z || 0,
    };

    const geometry = new THREE.BoxGeometry(dim.width, dim.height, dim.depth);
    const mesh = new THREE.Mesh(geometry, plankMaterialProps);
    mesh.position.set(pos.x, pos.y, pos.z);
    mesh.name = part.name || 'Panel';
    return mesh;
  };

  // Create meshes for all parts
  cabinetData.rule_parts.forEach((part: any) => {
    const mesh = createPlankMesh(part);
    cabinetContainer.add(mesh);
  });

  // Add invisible box for interaction
  const invGeometry = new THREE.BoxGeometry(
    Math.max(width - thickness * 2, 0.02),
    Math.max(height - thickness * 2, 0.02),
    Math.max(depth - thickness * 2, 0.02),
  );
  const invMesh = new THREE.Mesh(invGeometry, invisibleMaterial);
  invMesh.name = 'InvisibleCabinetCollider';
  cabinetContainer.add(invMesh);

  // Add to scene
  scene.add(cabinetContainer);
};
