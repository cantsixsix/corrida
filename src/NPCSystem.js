// ── NPC Traffic System ──────────────────────────────────────────
import * as THREE from 'three';
import { ROAD_DEFS, NPC_COUNT } from './constants.js';

const NPC_COLORS = [
  0x2196f3, 0x4caf50, 0xff9800, 0x9c27b0,
  0xffeb3b, 0x00bcd4, 0xe91e63, 0x795548,
];

// Lightweight NPC car (~12 meshes)
function buildNPCCar(color) {
  const g = new THREE.Group();
  const body  = new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.3 });
  const dark  = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x88bbdd, transparent: true, opacity: 0.5, metalness: 0.8 });
  const hl    = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffcc, emissiveIntensity: 0.5 });
  const tl    = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.4 });

  const add = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m;
  };

  // body
  const b = add(new THREE.BoxGeometry(2, 0.6, 4.2), body, 0, 0.6, 0);
  b.castShadow = true;
  // cabin
  add(new THREE.BoxGeometry(1.7, 0.55, 1.6), glass, 0, 1.2, -0.3);
  // wheels
  [[-0.95, 0.3, 1.3], [0.95, 0.3, 1.3], [-0.95, 0.3, -1.3], [0.95, 0.3, -1.3]].forEach(p => {
    const w = add(new THREE.CylinderGeometry(0.3, 0.3, 0.25, 8), dark, p[0], p[1], p[2]);
    w.rotation.z = Math.PI / 2;
  });
  // headlights
  [[-0.65, 0.6, 2.12], [0.65, 0.6, 2.12]].forEach(p =>
    add(new THREE.SphereGeometry(0.12, 6, 6), hl, p[0], p[1], p[2]));
  // tail lights
  [[-0.65, 0.6, -2.12], [0.65, 0.6, -2.12]].forEach(p =>
    add(new THREE.BoxGeometry(0.3, 0.15, 0.06), tl, p[0], p[1], p[2]));

  return g;
}

// ── Public API ──────────────────────────────────────────────────
export function createNPCs(scene) {
  const npcs = [];
  const validRoads = ROAD_DEFS.filter(r => Math.max(r.w, r.d) > 100);
  if (!validRoads.length) return npcs;

  for (let i = 0; i < NPC_COUNT; i++) {
    const road = validRoads[i % validRoads.length];
    const isH  = road.w > road.d;
    const color = NPC_COLORS[i % NPC_COLORS.length];
    const car   = buildNPCCar(color);

    const length = isH ? road.w : road.d;
    const pos  = (Math.random() - 0.5) * length * 0.7;
    const lane = (Math.random() > 0.5 ? 1 : -1) * 2.8;
    const dir  = Math.random() > 0.5 ? 1 : -1;

    if (isH) {
      car.position.set(road.x + pos, 0, road.z + lane);
      car.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      car.position.set(road.x + lane, 0, road.z + pos);
      car.rotation.y = dir > 0 ? 0 : Math.PI;
    }

    scene.add(car);
    npcs.push({ mesh: car, road, isH, speed: 0.15 + Math.random() * 0.4, direction: dir, lane });
  }
  return npcs;
}

export function updateNPCs(npcs, dt) {
  for (const n of npcs) {
    const len  = n.isH ? n.road.w : n.road.d;
    const half = len * 0.38;
    if (n.isH) {
      n.mesh.position.x += n.speed * n.direction * dt;
      if (n.mesh.position.x > n.road.x + half)      { n.direction = -1; n.mesh.rotation.y = -Math.PI / 2; }
      else if (n.mesh.position.x < n.road.x - half)  { n.direction =  1; n.mesh.rotation.y =  Math.PI / 2; }
    } else {
      n.mesh.position.z += n.speed * n.direction * dt;
      if (n.mesh.position.z > n.road.z + half)      { n.direction = -1; n.mesh.rotation.y = Math.PI; }
      else if (n.mesh.position.z < n.road.z - half)  { n.direction =  1; n.mesh.rotation.y = 0; }
    }
  }
}

export function checkNPCCollision(npcs, px, pz) {
  for (const n of npcs) {
    const dx = px - n.mesh.position.x;
    const dz = pz - n.mesh.position.z;
    if (dx * dx + dz * dz < 9) return true;   // radius ≈ 3
  }
  return false;
}
