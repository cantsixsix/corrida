// ── Visual Effects: Rain, Dust / Exhaust, Clouds ────────────────
import * as THREE from 'three';
import { WORLD_SIZE } from './constants.js';

// ═══════════════════════════════════════════════════════════════
// RAIN
// ═══════════════════════════════════════════════════════════════
export function createRainSystem(scene) {
  const count = 5000;
  const positions  = new Float32Array(count * 3);
  const velocities = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 200;
    positions[i * 3 + 1] = Math.random() * 80;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    velocities[i] = 40 + Math.random() * 40;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xaaaacc, size: 0.3, transparent: true, opacity: 0.5, depthWrite: false,
  });

  const rain = new THREE.Points(geo, mat);
  rain.visible = false;
  scene.add(rain);
  return { points: rain, velocities };
}

export function updateRain(sys, delta, carPos, active) {
  sys.points.visible = active;
  if (!active) return;

  const pos = sys.points.geometry.attributes.position.array;
  const n   = pos.length / 3;
  for (let i = 0; i < n; i++) {
    pos[i * 3 + 1] -= sys.velocities[i] * delta;
    if (pos[i * 3 + 1] < 0) {
      pos[i * 3]     = carPos.x + (Math.random() - 0.5) * 200;
      pos[i * 3 + 1] = 70 + Math.random() * 20;
      pos[i * 3 + 2] = carPos.z + (Math.random() - 0.5) * 200;
    }
  }
  sys.points.geometry.attributes.position.needsUpdate = true;
}

// ═══════════════════════════════════════════════════════════════
// DUST / EXHAUST
// ═══════════════════════════════════════════════════════════════
export function createDustSystem(scene) {
  const count = 150;
  const positions = new Float32Array(count * 3);
  const ages = new Float32Array(count).fill(999);
  const maxAges = new Float32Array(count);
  const vx = new Float32Array(count);
  const vy = new Float32Array(count);
  const vz = new Float32Array(count);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xbbaa88, size: 0.6, transparent: true, opacity: 0.35, depthWrite: false,
  });

  const dust = new THREE.Points(geo, mat);
  scene.add(dust);
  return { points: dust, ages, maxAges, vx, vy, vz, nextIdx: 0, emitTimer: 0 };
}

export function updateDust(sys, delta, carPos, carAngle, carSpeed) {
  const { points, ages, maxAges, vx, vy, vz } = sys;
  const pos   = points.geometry.attributes.position.array;
  const count = ages.length;
  const abs   = Math.abs(carSpeed);

  // emit
  sys.emitTimer += delta;
  if (abs > 0.2 && sys.emitTimer > 0.02) {
    sys.emitTimer = 0;
    const idx = sys.nextIdx;
    sys.nextIdx = (sys.nextIdx + 1) % count;

    const bx = carPos.x - Math.sin(carAngle) * 3;
    const bz = carPos.z - Math.cos(carAngle) * 3;

    pos[idx * 3]     = bx + (Math.random() - 0.5) * 1.5;
    pos[idx * 3 + 1] = 0.2 + Math.random() * 0.3;
    pos[idx * 3 + 2] = bz + (Math.random() - 0.5) * 1.5;
    ages[idx]    = 0;
    maxAges[idx] = 0.5 + Math.random() * 1.0;
    vx[idx] = (Math.random() - 0.5) * 2;
    vy[idx] = 1 + Math.random() * 2;
    vz[idx] = (Math.random() - 0.5) * 2;
  }

  // update
  for (let i = 0; i < count; i++) {
    if (ages[i] >= maxAges[i]) continue;
    ages[i] += delta;
    pos[i * 3]     += vx[i] * delta;
    pos[i * 3 + 1] += vy[i] * delta;
    pos[i * 3 + 2] += vz[i] * delta;
    vy[i] -= 0.5 * delta;
    if (ages[i] >= maxAges[i]) pos[i * 3 + 1] = -100;
  }

  points.geometry.attributes.position.needsUpdate = true;
  points.material.opacity = Math.min(0.35, abs * 0.3);
}

// ═══════════════════════════════════════════════════════════════
// CLOUDS
// ═══════════════════════════════════════════════════════════════
export function createClouds(scene) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide,
  });

  const clouds = [];
  for (let i = 0; i < 15; i++) {
    const size = 20 + Math.random() * 40;
    const geo  = new THREE.SphereGeometry(size, 8, 6);
    geo.scale(1, 0.25, 1);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      (Math.random() - 0.5) * WORLD_SIZE,
      80 + Math.random() * 30,
      (Math.random() - 0.5) * WORLD_SIZE,
    );
    scene.add(mesh);
    clouds.push({ mesh, speed: 2 + Math.random() * 5 });
  }

  return { clouds, material: mat };
}

export function updateClouds(sys, delta, isNight, isRaining) {
  for (const c of sys.clouds) {
    c.mesh.visible = !isNight;
    c.mesh.position.x += c.speed * delta;
    if (c.mesh.position.x > WORLD_SIZE * 0.4) c.mesh.position.x = -WORLD_SIZE * 0.4;
  }
  if (!isNight) {
    sys.material.opacity = isRaining ? 0.85 : 0.5;
    sys.material.color.set(isRaining ? 0x888888 : 0xffffff);
  }
}
