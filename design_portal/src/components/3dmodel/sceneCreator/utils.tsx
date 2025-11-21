import * as THREE from 'three';

/**
 * Get the X and Y positions whenever a mouse event is called.
 */
export const findXY = (renderer: THREE.WebGLRenderer, event: MouseEvent) => {
  const boundingClientRect = renderer.domElement.getBoundingClientRect(); // Get the DOM element's bounding client rectangle for accurate mouse position calculations.

  const x = ((event.clientX - boundingClientRect.left) / boundingClientRect.width) * 2 - 1;
  const y = -((event.clientY - boundingClientRect.top) / boundingClientRect.height) * 2 + 1;

  return { x, y };
};
