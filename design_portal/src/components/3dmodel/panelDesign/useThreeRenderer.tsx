import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function useThreeRenderer(
  scene: THREE.Scene | null,
  containerRef: React.RefObject<HTMLDivElement>
) {
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    if (!scene || !containerRef.current) return;

    const width = 300;
    const height = 200;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 5000);
    camera.position.set(400, 300, 400);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controlsRef.current = controls;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      controls.dispose();
      renderer.dispose();
    };
  }, [scene, containerRef]);
}
