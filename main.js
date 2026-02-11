import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

// Basis
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 15);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Licht
const light = new THREE.DirectionalLight(0xffffff, 1.2);
light.position.set(5, 10, 10);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.3));

// Helper om een C-vorm te maken (torus met open stuk)
function createC(radius, thickness, color) {
  // Maak een C-vormige path (blokletter, rond)
  const shape = new THREE.Shape();
  const startAngle = Math.PI * 0.15;
  const endAngle = Math.PI * 1.85;
  const step = Math.PI / 60;
  // Begin op de buitenste cirkel
  for (let angle = startAngle; angle <= endAngle; angle += step) {
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (angle === startAngle) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  // Nu binnenste cirkel, in omgekeerde richting
  for (let angle = endAngle; angle >= startAngle; angle -= step) {
    const x = Math.cos(angle) * (radius - thickness);
    const y = Math.sin(angle) * (radius - thickness);
    shape.lineTo(x, y);
  }
  shape.closePath();

  // Extrude de shape tot een blokletter C
  const extrudeSettings = {
    steps: 1,
    depth: thickness,
    bevelEnabled: false
  };
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  const material = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.4,
    roughness: 0.3
  });
  const mesh = new THREE.Mesh(geometry, material);

  // Centreer zodat opening verticaal
  geometry.center();

  return mesh;
}

// 3 C's in elkaar (onderkant niet afgesneden: alles mooi gecentreerd)
const c1 = createC(5, 0.7, 0xff0000);
const c2 = createC(3.8, 0.7, 0xff0000);
const c3 = createC(2.6, 0.7, 0xff0000);

// Draai de opening van de C's 30 graden (z-as)
c1.rotation.z += THREE.MathUtils.degToRad(30);
c2.rotation.z += THREE.MathUtils.degToRad(30);
c3.rotation.z += THREE.MathUtils.degToRad(30);

// Kantel alles 45 graden
c1.rotation.z -= THREE.MathUtils.degToRad(35);
c2.rotation.z -= THREE.MathUtils.degToRad(35);
c3.rotation.z -= THREE.MathUtils.degToRad(35);

scene.add(c1, c2, c3);

// Optioneel: een donkergrijze ruit in het midden (abstract symbool)
const diamondGeom = new THREE.PlaneGeometry(2.2, 2.2);
const diamondMat = new THREE.MeshStandardMaterial({
  color: 0x222222,
  side: THREE.DoubleSide
});
const diamond = new THREE.Mesh(diamondGeom, diamondMat);
diamond.rotation.z = Math.PI / 4 * 2; // ruitvorm + extra 45 graden
diamond.position.set(0, 0, -0.1);
scene.add(diamond);

// Animatie: elke C draait rond eigen as, tegengestelde richting
function animate() {
  requestAnimationFrame(animate);

  c1.rotation.y += 0.01;
  c2.rotation.y -= 0.012;
  c3.rotation.y += 0.014;

  renderer.render(scene, camera);
}

animate();

// Resizen
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
