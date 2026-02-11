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
  // Maak een C-vormige path (blokletter, rond) met rechte uiteinden
  const shape = new THREE.Shape();
  const startAngle = Math.PI * 0.2;
  const endAngle = Math.PI * 1.75;
  const step = Math.PI / 60;
  
  // Begin op de buitenste cirkel bij startAngle
  const startX = Math.cos(startAngle) * radius;
  const startY = Math.sin(startAngle) * radius;
  shape.moveTo(startX, startY);
  
  // Loop de buitenste cirkel af tot endAngle
  for (let angle = startAngle; angle <= endAngle; angle += step) {
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    shape.lineTo(x, y);
  }
  
  // Voeg rechte lijn toe naar binnenste cirkel bij endAngle (recht uiteinde)
  const endOuterX = Math.cos(endAngle) * radius;
  const endOuterY = Math.sin(endAngle) * radius;
  const endInnerX = Math.cos(endAngle) * (radius - thickness);
  const endInnerY = Math.sin(endAngle) * (radius - thickness);
  shape.lineTo(endOuterX, endOuterY);
  shape.lineTo(endInnerX, endInnerY);
  
  // Loop de binnenste cirkel terug van endAngle naar startAngle
  for (let angle = endAngle; angle >= startAngle; angle -= step) {
    const x = Math.cos(angle) * (radius - thickness);
    const y = Math.sin(angle) * (radius - thickness);
    shape.lineTo(x, y);
  }
  
  // Voeg rechte lijn toe terug naar buitenste cirkel bij startAngle (recht uiteinde)
  const startInnerX = Math.cos(startAngle) * (radius - thickness);
  const startInnerY = Math.sin(startAngle) * (radius - thickness);
  shape.lineTo(startInnerX, startInnerY);
  shape.lineTo(startX, startY);
  
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
const c1 = createC(4, 0.6, 0xff0000);
const c2 = createC(3, 0.6, 0xff0000);
const c3 = createC(2, 0.6, 0xff0000);

// Zet de opening perfect verticaal in het midden
c1.rotation.z = 0;
c2.rotation.z = 0;
c3.rotation.z = 0;

scene.add(c1, c2, c3);

// Animatie: elke C draait rond eigen as, tegengestelde richting
function animate() {
  requestAnimationFrame(animate);

  c1.rotation.y += 0.006;
  c2.rotation.y -= 0.007;
  c3.rotation.y += 0.008;

  renderer.render(scene, camera);
}

animate();

// Resizen
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
