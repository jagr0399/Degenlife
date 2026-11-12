// Renderer + post stack for the "modern Unity indie" look: ACES, soft shadows, IBL, GTAO, light bloom.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const QUALITY = {
  low: { pixelRatio: 1, shadow: 1024, gtao: false, bloom: true },
  medium: { pixelRatio: 1, shadow: 2048, gtao: true, bloom: true },
  high: { pixelRatio: 1.5, shadow: 2048, gtao: true, bloom: true },
};

export function createRenderer(canvas, quality = 'high') {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060a);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.12;

  const camera = new THREE.PerspectiveCamera(72, 1, 0.03, 500);
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const gtao = new GTAOPass(scene, camera, 1, 1);
  gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1.2, scale: 1.0, samples: 12 });
  gtao.blendIntensity = 0.85;
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.5, 0.82);
  composer.addPass(renderPass); composer.addPass(gtao); composer.addPass(bloom); composer.addPass(new OutputPass());

  let q = QUALITY[quality] || QUALITY.high;
  function setQuality(name) {
    q = QUALITY[name] || QUALITY.high;
    gtao.enabled = q.gtao;
    bloom.enabled = q.bloom;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pixelRatio));
    scene.traverse((o) => { if (o.isLight && o.castShadow) { o.shadow.mapSize.set(q.shadow, q.shadow); if (o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null; } } });
    resize();
  }
  function resize() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  setQuality(quality);
  return { renderer, composer, scene, camera, setQuality, resize, render: () => composer.render() };
}
