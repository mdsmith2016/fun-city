import * as THREE from 'three';

export function createRenderer(container: HTMLElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  return renderer;
}

/** Keeps renderer + cameras sized to the container. Returns a disposer. */
export function handleResize(
  container: HTMLElement,
  renderer: THREE.WebGLRenderer,
  cameras: THREE.PerspectiveCamera[],
): () => void {
  const onResize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    for (const camera of cameras) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    renderer.setSize(w, h);
  };
  onResize();
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}
