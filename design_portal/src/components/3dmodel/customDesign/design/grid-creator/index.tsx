import * as THREE from 'three';

export const createGrid = (size: number, divisions: number): THREE.Group => {
  const primaryGrid = new THREE.GridHelper(size, divisions, '#d3d3d3', '#d3d3d3');
  primaryGrid.material.opacity = 0.2;
  primaryGrid.material.transparent = true;
  primaryGrid.position.y = 0;
  primaryGrid.name = 'grid';

  const secondaryGrid = new THREE.GridHelper(size, divisions / 2, '#d3d3d3', '#d3d3d3');
  secondaryGrid.material.opacity = 0.05;
  secondaryGrid.material.transparent = true;
  secondaryGrid.position.y = 0;
  secondaryGrid.name = 'grid';

  // Create ground plane for shadows and depth perception
  const planeGeometry = new THREE.PlaneGeometry(size, size);
  const planeMaterial = new THREE.ShadowMaterial({
    opacity: 0.3,
    color: '#1e1b4b',
  });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -0.001; // Slightly below grid to prevent z-fighting
  plane.receiveShadow = true;
  plane.name = 'grid';
  plane.name = 'grid';

  const group = new THREE.Group();
  group.add(primaryGrid);
  group.add(secondaryGrid);
  group.add(plane);
  group.name = 'grid';
  group.name = 'grid';

  const axesHelper = new THREE.AxesHelper(3);
  axesHelper.name = 'axes';
  axesHelper.position.y = 0.01;
  axesHelper.renderOrder = 1;
  group.add(axesHelper);

  return group;
};
