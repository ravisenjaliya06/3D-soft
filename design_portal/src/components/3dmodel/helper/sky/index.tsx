import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { SkySet } from './interfaces';

export const createSky = (skySet: SkySet): Sky => {
  /** 
   * Creates and configures a Three.js Sky object with custom atmospheric and sun parameters.
  */

  const sky = new Sky();
  sky.name = skySet.name;
  sky.scale.setScalar(450000);
  const sun = new THREE.Vector3();
  sun.setFromSphericalCoords(
    1,
    THREE.MathUtils.degToRad(skySet.degreeCoordinate.phi),
    THREE.MathUtils.degToRad(skySet.degreeCoordinate.theta)
  );
  sky.material.uniforms['sunPosition'].value.copy(sun);
  sky.material.uniforms['rayleigh'].value = skySet.material.rayleigh;
  sky.material.uniforms['turbidity'].value = skySet.material.turbidity;
  sky.material.uniforms['mieCoefficient'].value = skySet.material.mieCoefficient;
  if (skySet.material.mieDirectionalG) {
    sky.material.uniforms['mieDirectionalG'].value = skySet.material.mieDirectionalG;
  }
  return sky;
};
