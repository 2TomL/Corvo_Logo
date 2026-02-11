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

// Electric border helper functions
class ElectricBorder {
  constructor() {
    this.time = 0;
    this.octaves = 12;
    this.lacunarity = 2.0;
    this.gain = 0.65;
    this.amplitude = 0.08;
    this.frequency = 15;
    this.baseFlatness = 0;
    this.displacement = 0.15;
    this.speed = 2.5;
  }

  random(x) {
    return (Math.sin(x * 12.9898) * 43758.5453) % 1;
  }

  noise2D(x, y) {
    const i = Math.floor(x);
    const j = Math.floor(y);
    const fx = x - i;
    const fy = y - j;

    const a = this.random(i + j * 57);
    const b = this.random(i + 1 + j * 57);
    const c = this.random(i + (j + 1) * 57);
    const d = this.random(i + 1 + (j + 1) * 57);

    const ux = fx * fx * (3.0 - 2.0 * fx);
    const uy = fy * fy * (3.0 - 2.0 * fy);

    return (
      a * (1 - ux) * (1 - uy) +
      b * ux * (1 - uy) +
      c * (1 - ux) * uy +
      d * ux * uy
    );
  }

  octavedNoise(x, time = 0, seed = 0) {
    let y = 0;
    let amplitude = this.amplitude;
    let frequency = this.frequency;

    for (let i = 0; i < this.octaves; i++) {
      let octaveAmplitude = amplitude;
      if (i === 0) {
        octaveAmplitude *= this.baseFlatness;
      }

      y += octaveAmplitude * this.noise2D(frequency * x + seed * 100, time * frequency * 0.3);
      frequency *= this.lacunarity;
      amplitude *= this.gain;
    }

    return y;
  }

  createElectricLine(radius, thickness, seed = 0, zPosition = 0) {
    const points = [];
    const sampleCount = 200;
    const startAngle = Math.PI * 0.2;
    const endAngle = Math.PI * 1.75;

    for (let i = 0; i <= sampleCount; i++) {
      const progress = i / sampleCount;
      const angle = startAngle + (endAngle - startAngle) * progress;
      
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = zPosition;
      
      points.push(new THREE.Vector3(x, y, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ 
      color: 0xff0000,
      linewidth: 2
    });
    const line = new THREE.Line(geometry, material);
    
    // Store original positions and seed
    line.userData.originalPositions = points.map(p => p.clone());
    line.userData.seed = seed;
    
    return line;
  }

  createStraightEdgeLine(radius, thickness, seed = 0, isOuter = true) {
    const points = [];
    const sampleCount = 30;
    const angle = Math.PI * 0.2; // Start angle waar de opening begint
    
    const actualRadius = isOuter ? radius : (radius - thickness);
    const x = Math.cos(angle) * actualRadius;
    const y = Math.sin(angle) * actualRadius;

    for (let i = 0; i <= sampleCount; i++) {
      const progress = i / sampleCount;
      const z = -0.3 + progress * 0.6;
      points.push(new THREE.Vector3(x, y, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ 
      color: 0xff0000,
      linewidth: 2
    });
    const line = new THREE.Line(geometry, material);
    
    line.userData.originalPositions = points.map(p => p.clone());
    line.userData.seed = seed;
    line.userData.isStraightEdge = true;
    line.userData.angle = angle;
    
    return line;
  }

  createEndEdgeLine(radius, thickness, seed = 0, isOuter = true) {
    const points = [];
    const sampleCount = 30;
    const angle = Math.PI * 1.75; // End angle waar de opening eindigt
    
    const actualRadius = isOuter ? radius : (radius - thickness);
    const x = Math.cos(angle) * actualRadius;
    const y = Math.sin(angle) * actualRadius;

    for (let i = 0; i <= sampleCount; i++) {
      const progress = i / sampleCount;
      const z = -0.3 + progress * 0.6;
      points.push(new THREE.Vector3(x, y, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ 
      color: 0xff0000,
      linewidth: 2
    });
    const line = new THREE.Line(geometry, material);
    
    line.userData.originalPositions = points.map(p => p.clone());
    line.userData.seed = seed;
    line.userData.isStraightEdge = true;
    line.userData.angle = angle;
    
    return line;
  }

  updateElectricLine(line) {
    const positions = line.geometry.attributes.position;
    const originalPositions = line.userData.originalPositions;
    const seed = line.userData.seed;

    if (line.userData.isStraightEdge) {
      // For straight edges, apply noise along the z-axis
      for (let i = 0; i < originalPositions.length; i++) {
        const progress = i / (originalPositions.length - 1);
        const noiseValue = this.octavedNoise(progress * 8, this.time, seed);
        
        const original = originalPositions[i];
        const angle = line.userData.angle;
        
        // Apply noise radially
        const currentRadius = Math.sqrt(original.x * original.x + original.y * original.y);
        const radiusWithNoise = currentRadius + noiseValue * this.displacement;
        
        positions.setXYZ(
          i,
          Math.cos(angle) * radiusWithNoise,
          Math.sin(angle) * radiusWithNoise,
          original.z
        );
      }
    } else {
      // For curved edges
      for (let i = 0; i < originalPositions.length; i++) {
        const progress = i / (originalPositions.length - 1);
        const noiseValue = this.octavedNoise(progress * 8, this.time, seed);
        
        const original = originalPositions[i];
        const angle = Math.atan2(original.y, original.x);
        const currentRadius = Math.sqrt(original.x * original.x + original.y * original.y);
        const radiusWithNoise = currentRadius + noiseValue * this.displacement;
        
        positions.setXYZ(
          i,
          Math.cos(angle) * radiusWithNoise,
          Math.sin(angle) * radiusWithNoise,
          original.z
        );
      }
    }
    
    positions.needsUpdate = true;
  }
}

const electricBorder = new ElectricBorder();

// Create electric lines for each C
const electricLines = [];

// C1 - outer and inner borders (front and back) + straight edges
const c1OuterFront = electricBorder.createElectricLine(4, 0.6, 0, 0.3);
const c1OuterBack = electricBorder.createElectricLine(4, 0.6, 1, -0.3);
const c1InnerFront = electricBorder.createElectricLine(4 - 0.6, 0.6, 2, 0.3);
const c1InnerBack = electricBorder.createElectricLine(4 - 0.6, 0.6, 3, -0.3);
const c1OuterStart = electricBorder.createStraightEdgeLine(4, 0.6, 4, true);
const c1OuterEnd = electricBorder.createEndEdgeLine(4, 0.6, 5, true);
const c1InnerStart = electricBorder.createStraightEdgeLine(4, 0.6, 6, false);
const c1InnerEnd = electricBorder.createEndEdgeLine(4, 0.6, 7, false);
c1.add(c1OuterFront, c1OuterBack, c1InnerFront, c1InnerBack, c1OuterStart, c1OuterEnd, c1InnerStart, c1InnerEnd);
electricLines.push(c1OuterFront, c1OuterBack, c1InnerFront, c1InnerBack, c1OuterStart, c1OuterEnd, c1InnerStart, c1InnerEnd);

// C2 - outer and inner borders (front and back) + straight edges
const c2OuterFront = electricBorder.createElectricLine(3, 0.6, 8, 0.3);
const c2OuterBack = electricBorder.createElectricLine(3, 0.6, 9, -0.3);
const c2InnerFront = electricBorder.createElectricLine(3 - 0.6, 0.6, 10, 0.3);
const c2InnerBack = electricBorder.createElectricLine(3 - 0.6, 0.6, 11, -0.3);
const c2OuterStart = electricBorder.createStraightEdgeLine(3, 0.6, 12, true);
const c2OuterEnd = electricBorder.createEndEdgeLine(3, 0.6, 13, true);
const c2InnerStart = electricBorder.createStraightEdgeLine(3, 0.6, 14, false);
const c2InnerEnd = electricBorder.createEndEdgeLine(3, 0.6, 15, false);
c2.add(c2OuterFront, c2OuterBack, c2InnerFront, c2InnerBack, c2OuterStart, c2OuterEnd, c2InnerStart, c2InnerEnd);
electricLines.push(c2OuterFront, c2OuterBack, c2InnerFront, c2InnerBack, c2OuterStart, c2OuterEnd, c2InnerStart, c2InnerEnd);

// C3 - outer and inner borders (front and back) + straight edges
const c3OuterFront = electricBorder.createElectricLine(2, 0.6, 16, 0.3);
const c3OuterBack = electricBorder.createElectricLine(2, 0.6, 17, -0.3);
const c3InnerFront = electricBorder.createElectricLine(2 - 0.6, 0.6, 18, 0.3);
const c3InnerBack = electricBorder.createElectricLine(2 - 0.6, 0.6, 19, -0.3);
const c3OuterStart = electricBorder.createStraightEdgeLine(2, 0.6, 20, true);
const c3OuterEnd = electricBorder.createEndEdgeLine(2, 0.6, 21, true);
const c3InnerStart = electricBorder.createStraightEdgeLine(2, 0.6, 22, false);
const c3InnerEnd = electricBorder.createEndEdgeLine(2, 0.6, 23, false);
c3.add(c3OuterFront, c3OuterBack, c3InnerFront, c3InnerBack, c3OuterStart, c3OuterEnd, c3InnerStart, c3InnerEnd);
electricLines.push(c3OuterFront, c3OuterBack, c3InnerFront, c3InnerBack, c3OuterStart, c3OuterEnd, c3InnerStart, c3InnerEnd);

// Speed lines effect - motion lines flying from left to right
class SpeedLines {
  constructor() {
    this.lines = [];
    this.maxLines = 20;
    this.createLines();
  }

  createLines() {
    for (let i = 0; i < this.maxLines; i++) {
      const line = this.createSpeedLine();
      this.lines.push(line);
      scene.add(line);
    }
  }

  createSpeedLine() {
    const points = [];
    const startX = 10;
    const length = Math.random() * 2 + 1;
    const endX = startX - length;
    
    const y = (Math.random() - 0.5) * 8;
    const z = (Math.random() - 0.5) * 2;
    
    points.push(new THREE.Vector3(startX, y, z));
    points.push(new THREE.Vector3(endX, y, z));
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: Math.random() * 0.5 + 0.3
    });
    
    const line = new THREE.Line(geometry, material);
    
    line.userData.speed = Math.random() * 0.15 + 0.1;
    line.userData.length = length;
    line.userData.resetX = 10;
    line.userData.minX = -10;
    line.userData.y = y;
    line.userData.z = z;
    
    return line;
  }

  update() {
    this.lines.forEach(line => {
      const positions = line.geometry.attributes.position;
      const currentX = positions.getX(0);
      
      if (currentX < line.userData.minX) {
        // Reset to right
        const newY = (Math.random() - 0.5) * 8;
        const newZ = (Math.random() - 0.5) * 2;
        const newLength = Math.random() * 2 + 1;
        
        positions.setXYZ(0, line.userData.resetX, newY, newZ);
        positions.setXYZ(1, line.userData.resetX - newLength, newY, newZ);
        
        line.userData.y = newY;
        line.userData.z = newZ;
        line.userData.length = newLength;
        line.material.opacity = Math.random() * 0.5 + 0.3;
      } else {
        // Move left
        positions.setXYZ(0, currentX - line.userData.speed, line.userData.y, line.userData.z);
        positions.setXYZ(1, currentX - line.userData.speed - line.userData.length, line.userData.y, line.userData.z);
      }
      
      positions.needsUpdate = true;
    });
  }
}

const speedLines = new SpeedLines();

// Animatie: elke C draait rond eigen as, tegengestelde richting
function animate() {
  requestAnimationFrame(animate);

  // Update electric border time
  electricBorder.time += 0.016 * electricBorder.speed;
  
  // Update all electric lines
  electricLines.forEach(line => {
    electricBorder.updateElectricLine(line);
  });

  // Update speed lines
  speedLines.update();

  c1.rotation.y += 0.003;
  c2.rotation.y -= 0.003;
  c3.rotation.y -= 0.005;

  renderer.render(scene, camera);
}

animate();

// Resizen
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

