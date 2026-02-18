import { useState, useEffect, useRef } from "react";
import * as THREE from "three";

const WORLD_SIZE = 800;
const ROAD_WIDTH = 12;
const CAR_ACCEL = 0.035;
const CAR_BRAKE = 0.03;
const CAR_FRICTION = 0.008;
const CAR_MAX_SPEED = 1.2;
const CAR_REVERSE_MAX = -0.4;
const STEER_SPEED = 0.028;

function addMesh(scene, geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  scene.add(m);
  return m;
}

function buildCar(scene) {
  const car = new THREE.Group();

  const add = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    car.add(m);
    return m;
  };

  // Chassis base
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  add(new THREE.BoxGeometry(2.4, 0.25, 5.0), chassisMat, 0, 0.35, 0);

  // Main body
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xc1121f, metalness: 0.7, roughness: 0.25 });
  const bodyLower = add(new THREE.BoxGeometry(2.3, 0.55, 4.8), bodyMat, 0, 0.75, 0);
  bodyLower.castShadow = true;

  // Hood
  const hood = add(new THREE.BoxGeometry(2.1, 0.3, 1.8), bodyMat, 0, 1.15, 1.2);
  hood.castShadow = true;

  // Hood scoop
  const scoopMat = new THREE.MeshStandardMaterial({ color: 0x2b2d42, roughness: 0.4, metalness: 0.6 });
  add(new THREE.BoxGeometry(0.6, 0.12, 0.8), scoopMat, 0, 1.36, 1.3);

  // Trunk
  const trunk = add(new THREE.BoxGeometry(2.1, 0.25, 1.2), bodyMat, 0, 1.1, -1.8);
  trunk.castShadow = true;

  // Cabin
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1d3557, metalness: 0.5, roughness: 0.2 });
  const cabin = add(new THREE.BoxGeometry(2.0, 0.65, 2.0), cabinMat, 0, 1.4, -0.2);
  cabin.castShadow = true;

  // Roof
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x22223b, metalness: 0.6, roughness: 0.3 });
  add(new THREE.BoxGeometry(1.9, 0.08, 1.8), roofMat, 0, 1.76, -0.2);

  // Glass
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xa8dadc, metalness: 0.9, roughness: 0.05, transparent: true, opacity: 0.45 });

  // Windshield front
  const ws = add(new THREE.BoxGeometry(1.8, 0.55, 0.08), glassMat, 0, 1.45, 0.8);
  ws.rotation.x = -0.2;

  // Rear window
  const rw = add(new THREE.BoxGeometry(1.8, 0.55, 0.08), glassMat, 0, 1.45, -1.2);
  rw.rotation.x = 0.2;

  // Side windows
  add(new THREE.BoxGeometry(0.08, 0.45, 1.6), glassMat, -1.04, 1.45, -0.2);
  add(new THREE.BoxGeometry(0.08, 0.45, 1.6), glassMat, 1.04, 1.45, -0.2);

  // Side mirrors
  const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xc1121f, metalness: 0.6, roughness: 0.3 });
  const mGlassMat = new THREE.MeshStandardMaterial({ color: 0x88ccee, metalness: 1, roughness: 0 });
  [-1.25, 1.25].forEach(x => {
    add(new THREE.BoxGeometry(0.25, 0.18, 0.35), mirrorMat, x, 1.25, 0.5);
    add(new THREE.BoxGeometry(0.04, 0.12, 0.2), mGlassMat, x + (x > 0 ? 0.13 : -0.13), 1.25, 0.5);
  });

  // Bumpers
  const bumperMat = new THREE.MeshStandardMaterial({ color: 0x2b2d42, roughness: 0.6, metalness: 0.3 });
  add(new THREE.BoxGeometry(2.4, 0.3, 0.25), bumperMat, 0, 0.55, 2.5);
  add(new THREE.BoxGeometry(2.4, 0.3, 0.25), bumperMat, 0, 0.55, -2.5);

  // Front grille + slats
  add(new THREE.BoxGeometry(1.4, 0.25, 0.06), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.8 }), 0, 0.7, 2.45);
  const slatMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9, roughness: 0.2 });
  for (let i = 0; i < 5; i++) {
    add(new THREE.BoxGeometry(1.3, 0.015, 0.07), slatMat, 0, 0.6 + i * 0.05, 2.46);
  }

  // License plates
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xf1faee, roughness: 0.5 });
  add(new THREE.BoxGeometry(0.6, 0.2, 0.04), plateMat, 0, 0.5, 2.53);
  add(new THREE.BoxGeometry(0.6, 0.2, 0.04), plateMat, 0, 0.5, -2.53);

  // Wheels
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.15 });
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
  const archMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });

  [[-1.15, 0.35, 1.5], [1.15, 0.35, 1.5], [-1.15, 0.35, -1.5], [1.15, 0.35, -1.5]].forEach(pos => {
    const tire = add(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 16), tireMat, pos[0], pos[1], pos[2]);
    tire.rotation.z = Math.PI / 2; tire.castShadow = true;
    const rim = add(new THREE.CylinderGeometry(0.24, 0.24, 0.32, 12), rimMat, pos[0], pos[1], pos[2]);
    rim.rotation.z = Math.PI / 2;
    add(new THREE.SphereGeometry(0.1, 8, 8), hubMat, pos[0] + (pos[0] > 0 ? 0.17 : -0.17), pos[1], pos[2]);
    add(new THREE.BoxGeometry(0.15, 0.5, 0.9), archMat, pos[0] + (pos[0] > 0 ? 0.08 : -0.08), pos[1] + 0.2, pos[2]);
  });

  // Headlights
  const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffcc, emissiveIntensity: 0.9, metalness: 0.5 });
  const hlRingMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 });
  [[-0.8, 0.72, 2.42], [0.8, 0.72, 2.42]].forEach(pos => {
    add(new THREE.SphereGeometry(0.18, 10, 10), hlMat, pos[0], pos[1], pos[2]);
    const ring = add(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 12), hlRingMat, pos[0], pos[1], pos[2] + 0.05);
    ring.rotation.x = Math.PI / 2;
  });

  // Fog lights
  const fogMat = new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffaa, emissiveIntensity: 0.5 });
  add(new THREE.SphereGeometry(0.1, 8, 8), fogMat, -0.9, 0.48, 2.52);
  add(new THREE.SphereGeometry(0.1, 8, 8), fogMat, 0.9, 0.48, 2.52);

  // Tail lights
  const tlMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.6 });
  add(new THREE.BoxGeometry(0.4, 0.2, 0.08), tlMat, -0.8, 0.72, -2.48);
  add(new THREE.BoxGeometry(0.4, 0.2, 0.08), tlMat, 0.8, 0.72, -2.48);

  // Turn signals
  const turnMat = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff6600, emissiveIntensity: 0.4 });
  add(new THREE.BoxGeometry(0.2, 0.15, 0.08), turnMat, -0.5, 0.72, -2.48);
  add(new THREE.BoxGeometry(0.2, 0.15, 0.08), turnMat, 0.5, 0.72, -2.48);

  // Exhaust pipes
  const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.8, roughness: 0.3 });
  [-0.5, 0.5].forEach(x => {
    const ex = add(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 8), exhaustMat, x, 0.3, -2.55);
    ex.rotation.x = Math.PI / 2;
  });

  // Antenna
  add(new THREE.CylinderGeometry(0.015, 0.01, 0.8, 4), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7 }), -0.6, 2.15, -0.8);

  scene.add(car);
  return car;
}

function buildWorld(scene) {
  // Ground
  const groundGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 64, 64);
  const verts = groundGeo.attributes.position.array;
  for (let i = 2; i < verts.length; i += 3) {
    const x = verts[i - 2], z = verts[i - 1];
    if (Math.sqrt(x * x + z * z) > 80) verts[i] = Math.sin(x * 0.02) * Math.cos(z * 0.03) * 3 + Math.sin(x * 0.05 + z * 0.04) * 1.5;
  }
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ color: 0x4a7c59, roughness: 0.9, flatShading: true }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);

  // Materials
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.7 });
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xf4d35e, roughness: 0.5 });
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xf1faee, roughness: 0.5 });
  const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xb0a89a, roughness: 0.85 });

  const roadDefs = [
    { x: 0, z: 0, w: ROAD_WIDTH, d: WORLD_SIZE * 0.8 },
    { x: 0, z: 0, w: WORLD_SIZE * 0.8, d: ROAD_WIDTH },
    { x: 120, z: 0, w: ROAD_WIDTH, d: WORLD_SIZE * 0.6 },
    { x: -120, z: 0, w: ROAD_WIDTH, d: WORLD_SIZE * 0.6 },
    { x: 0, z: 120, w: WORLD_SIZE * 0.6, d: ROAD_WIDTH },
    { x: 0, z: -120, w: WORLD_SIZE * 0.6, d: ROAD_WIDTH },
    { x: 60, z: 60, w: ROAD_WIDTH, d: 130 },
    { x: 60, z: 60, w: 130, d: ROAD_WIDTH },
    { x: -60, z: -60, w: ROAD_WIDTH, d: 130 },
    { x: -60, z: -60, w: 130, d: ROAD_WIDTH },
  ];

  roadDefs.forEach(r => {
    const road = addMesh(scene, new THREE.BoxGeometry(r.w, 0.05, r.d), roadMat, r.x, 0.02, r.z);
    road.receiveShadow = true;
    const isH = r.w > r.d;

    // Sidewalks
    if (isH) {
      addMesh(scene, new THREE.BoxGeometry(r.w, 0.12, 3.5), sidewalkMat, r.x, 0.06, r.z + r.d / 2 + 2);
      addMesh(scene, new THREE.BoxGeometry(r.w, 0.12, 3.5), sidewalkMat, r.x, 0.06, r.z - r.d / 2 - 2);
    } else {
      addMesh(scene, new THREE.BoxGeometry(3.5, 0.12, r.d), sidewalkMat, r.x + r.w / 2 + 2, 0.06, r.z);
      addMesh(scene, new THREE.BoxGeometry(3.5, 0.12, r.d), sidewalkMat, r.x - r.w / 2 - 2, 0.06, r.z);
    }

    // Center dashes
    const length = isH ? r.w : r.d;
    for (let i = 0; i < Math.floor(length / 8); i++) {
      const dGeo = new THREE.BoxGeometry(isH ? 3 : 0.25, 0.06, isH ? 0.25 : 3);
      if (isH) addMesh(scene, dGeo, yellowMat, r.x - length / 2 + i * 8 + 4, 0.05, r.z);
      else addMesh(scene, dGeo, yellowMat, r.x, 0.05, r.z - length / 2 + i * 8 + 4);
    }

    // Edge lines
    const edgeOff = (isH ? r.d : r.w) / 2 - 0.5;
    for (let i = 0; i < Math.floor(length / 4); i++) {
      const lGeo = new THREE.BoxGeometry(isH ? 3.5 : 0.15, 0.055, isH ? 0.15 : 3.5);
      if (isH) {
        const px = r.x - length / 2 + i * 4 + 2;
        addMesh(scene, lGeo, lineMat, px, 0.05, r.z + edgeOff);
        addMesh(scene, lGeo, lineMat, px, 0.05, r.z - edgeOff);
      } else {
        const pz = r.z - length / 2 + i * 4 + 2;
        addMesh(scene, lGeo, lineMat, r.x + edgeOff, 0.05, pz);
        addMesh(scene, lGeo, lineMat, r.x - edgeOff, 0.05, pz);
      }
    }
  });

  // Buildings
  const bColors = [0x457b9d, 0x6d6875, 0xb5838d, 0xe5989b, 0x8d99ae, 0x2b2d42, 0x606c38, 0xbc6c25, 0x588157, 0x3a5a40, 0x9b2226, 0x264653, 0x023047];
  const buildings = [];
  const isOnRoad = (x, z) => roadDefs.some(r => Math.abs(x - r.x) < (r.w / 2 + 5) && Math.abs(z - r.z) < (r.d / 2 + 5));

  const winGlassMat = new THREE.MeshStandardMaterial({ color: 0x88bbdd, metalness: 0.8, roughness: 0.1, transparent: true, opacity: 0.5 });
  const winFrameMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.6 });
  const winLitMat = new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xffffcc, emissiveIntensity: 0.35 });
  const ledgeMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5 });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.7 });
  const acMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5 });
  const handleMat = new THREE.MeshStandardMaterial({ color: 0xdddd00, metalness: 0.9, roughness: 0.1 });

  for (let i = 0; i < 130; i++) {
    const bx = (Math.random() - 0.5) * WORLD_SIZE * 0.65;
    const bz = (Math.random() - 0.5) * WORLD_SIZE * 0.65;
    if (isOnRoad(bx, bz)) continue;

    const w = 8 + Math.random() * 16, h = 6 + Math.random() * 28, d = 8 + Math.random() * 16;
    const color = bColors[Math.floor(Math.random() * bColors.length)];
    const bMat = new THREE.MeshStandardMaterial({ color, roughness: 0.65, flatShading: true });

    const building = addMesh(scene, new THREE.BoxGeometry(w, h, d), bMat, bx, h / 2, bz);
    building.castShadow = true; building.receiveShadow = true;
    buildings.push({ x: bx, z: bz, hw: w / 2 + 1.5, hd: d / 2 + 1.5 });

    // Roof + base ledges
    addMesh(scene, new THREE.BoxGeometry(w + 0.4, 0.3, d + 0.4), ledgeMat, bx, h + 0.15, bz);
    addMesh(scene, new THREE.BoxGeometry(w + 0.3, 0.4, d + 0.3), ledgeMat, bx, 0.2, bz);

    const floors = Math.floor(h / 3.5);

    // Floor dividers
    for (let f = 1; f < floors; f++) {
      addMesh(scene, new THREE.BoxGeometry(w + 0.15, 0.1, d + 0.15), ledgeMat, bx, f * 3.5, bz);
    }

    // Windows on all 4 faces
    for (let f = 0; f < floors; f++) {
      const wy = 2.2 + f * 3.5;

      // Front & back
      const wc = Math.max(2, Math.floor(w / 3.5));
      for (let wi = 0; wi < wc; wi++) {
        const wx = bx - w / 2 + 2 + wi * ((w - 3) / Math.max(wc - 1, 1));
        const gm = Math.random() > 0.5 ? winLitMat : winGlassMat;
        // Front
        addMesh(scene, new THREE.BoxGeometry(1.4, 1.6, 0.08), winFrameMat, wx, wy, bz + d / 2 + 0.04);
        addMesh(scene, new THREE.BoxGeometry(1.1, 1.3, 0.06), gm, wx, wy, bz + d / 2 + 0.07);
        addMesh(scene, new THREE.BoxGeometry(1.5, 0.08, 0.2), ledgeMat, wx, wy - 0.75, bz + d / 2 + 0.1);
        // Back
        addMesh(scene, new THREE.BoxGeometry(1.4, 1.6, 0.08), winFrameMat, wx, wy, bz - d / 2 - 0.04);
        addMesh(scene, new THREE.BoxGeometry(1.1, 1.3, 0.06), gm, wx, wy, bz - d / 2 - 0.07);
      }

      // Sides
      const sc = Math.max(2, Math.floor(d / 3.5));
      for (let si = 0; si < sc; si++) {
        const sz = bz - d / 2 + 2 + si * ((d - 3) / Math.max(sc - 1, 1));
        const gm = Math.random() > 0.5 ? winLitMat : winGlassMat;
        addMesh(scene, new THREE.BoxGeometry(0.08, 1.6, 1.4), winFrameMat, bx + w / 2 + 0.04, wy, sz);
        addMesh(scene, new THREE.BoxGeometry(0.06, 1.3, 1.1), gm, bx + w / 2 + 0.07, wy, sz);
        addMesh(scene, new THREE.BoxGeometry(0.08, 1.6, 1.4), winFrameMat, bx - w / 2 - 0.04, wy, sz);
        addMesh(scene, new THREE.BoxGeometry(0.06, 1.3, 1.1), gm, bx - w / 2 - 0.07, wy, sz);
      }
    }

    // Door
    addMesh(scene, new THREE.BoxGeometry(1.2, 2.2, 0.1), doorMat, bx, 1.1, bz + d / 2 + 0.06);
    addMesh(scene, new THREE.BoxGeometry(0.25, 0.06, 0.08), handleMat, bx + 0.35, 1.1, bz + d / 2 + 0.12);

    // AC units
    if (Math.random() > 0.4) {
      for (let a = 0; a < Math.floor(Math.random() * 3) + 1; a++) {
        addMesh(scene, new THREE.BoxGeometry(0.8, 0.5, 0.4), acMat,
          bx + (Math.random() > 0.5 ? 1 : -1) * (w / 2 + 0.2),
          3 + a * 3.5 + Math.random() * 2,
          bz + (Math.random() - 0.5) * d * 0.6);
      }
    }

    // Rooftop
    if (h > 15 && Math.random() > 0.3) {
      addMesh(scene, new THREE.CylinderGeometry(0.8, 0.8, 1.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6 }),
        bx + (Math.random() - 0.5) * w * 0.4, h + 0.75, bz + (Math.random() - 0.5) * d * 0.4);
    }
    if (h > 12 && Math.random() > 0.5) {
      addMesh(scene, new THREE.CylinderGeometry(0.03, 0.03, 3, 4),
        new THREE.MeshStandardMaterial({ color: 0x555555 }),
        bx + (Math.random() - 0.5) * w * 0.3, h + 1.5, bz + (Math.random() - 0.5) * d * 0.3);
    }
  }

  // Trees
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.9 });
  const leafCols = [0x2d6a4f, 0x40916c, 0x52b788, 0x74c69d];

  for (let i = 0; i < 250; i++) {
    const tx = (Math.random() - 0.5) * WORLD_SIZE * 0.75;
    const tz = (Math.random() - 0.5) * WORLD_SIZE * 0.75;
    if (isOnRoad(tx, tz)) continue;
    if (buildings.some(b => Math.abs(tx - b.x) < b.hw && Math.abs(tz - b.z) < b.hd)) continue;
    const th = 2 + Math.random() * 2.5;
    const trunk = addMesh(scene, new THREE.CylinderGeometry(0.2, 0.35, th, 6), trunkMat, tx, th / 2, tz);
    trunk.castShadow = true;
    const lc = leafCols[Math.floor(Math.random() * leafCols.length)];
    const lm = new THREE.MeshStandardMaterial({ color: lc, roughness: 0.8, flatShading: true });
    const cs = 1.8 + Math.random() * 2.2;
    const crown = addMesh(scene, new THREE.SphereGeometry(cs, 7, 5), lm, tx, th + cs * 0.5, tz);
    crown.castShadow = true;
    if (Math.random() > 0.5) {
      const c2 = addMesh(scene, new THREE.SphereGeometry(cs * 0.7, 6, 4), lm,
        tx + (Math.random() - 0.5) * 1.5, th + cs * 1.1, tz + (Math.random() - 0.5) * 1.5);
      c2.castShadow = true;
    }
  }

  // Street lamps
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5 });
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xfff3b0, emissiveIntensity: 1 });
  for (let i = -280; i < 280; i += 35) {
    [9, -9].forEach(offset => {
      addMesh(scene, new THREE.CylinderGeometry(0.08, 0.12, 5.5, 6), lampMat, offset, 2.75, i);
      addMesh(scene, new THREE.BoxGeometry(1.2, 0.08, 0.08), lampMat, offset + (offset > 0 ? -0.6 : 0.6), 5.3, i);
      addMesh(scene, new THREE.BoxGeometry(0.5, 0.2, 0.5), lampMat, offset + (offset > 0 ? -1.1 : 1.1), 5.2, i);
      addMesh(scene, new THREE.SphereGeometry(0.25, 8, 8), bulbMat, offset + (offset > 0 ? -1.1 : 1.1), 5.05, i);
    });
  }

  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 120, WORLD_SIZE * 0.5);
  return buildings;
}

export default function OpenWorldDrive() {
  const mountRef = useRef(null);
  const stateRef = useRef({ speed: 0, angle: 0, keys: {}, cam: { distance: 14, height: 7, smoothX: 0, smoothZ: -14 } });
  const nightRef = useRef(false);
  const [speed, setSpeed] = useState(0);
  const [nightMode, setNightMode] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const w = container.clientWidth, h = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, w / h, 0.5, 600);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.position.set(100, 120, 80);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 10; sunLight.shadow.camera.far = 400;
    sunLight.shadow.camera.left = -150; sunLight.shadow.camera.right = 150;
    sunLight.shadow.camera.top = 150; sunLight.shadow.camera.bottom = -150;
    scene.add(sunLight);
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x4a7c59, 0.3);
    scene.add(hemiLight);
    const headlight = new THREE.SpotLight(0xffffee, 0, 60, Math.PI / 5, 0.5, 1.5);
    scene.add(headlight); scene.add(headlight.target);

    const buildings = buildWorld(scene);
    const car = buildCar(scene);

    const st = stateRef.current;
    const onKeyDown = (e) => { st.keys[e.code] = true; };
    const onKeyUp = (e) => { st.keys[e.code] = false; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let tA = false, tB = false, tL = false, tR = false;
    container._setTouch = (a, b, l, r) => { tA = a; tB = b; tL = l; tR = r; };

    const onResize = () => {
      const nw = container.clientWidth, nh = container.clientHeight;
      camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    let animId;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const keys = st.keys;
      const accel = keys["ArrowUp"] || keys["KeyW"] || tA;
      const brake = keys["ArrowDown"] || keys["KeyS"] || tB;
      const left = keys["ArrowLeft"] || keys["KeyA"] || tL;
      const right = keys["ArrowRight"] || keys["KeyD"] || tR;

      if (accel) st.speed = Math.min(st.speed + CAR_ACCEL, CAR_MAX_SPEED);
      else if (brake) st.speed = Math.max(st.speed - CAR_BRAKE, CAR_REVERSE_MAX);
      else {
        if (st.speed > 0) st.speed = Math.max(0, st.speed - CAR_FRICTION);
        else if (st.speed < 0) st.speed = Math.min(0, st.speed + CAR_FRICTION);
      }

      const sf = Math.min(Math.abs(st.speed) / 1.0, 1);
      if (left) st.angle += STEER_SPEED * sf * (st.speed >= 0 ? 1 : -1);
      if (right) st.angle -= STEER_SPEED * sf * (st.speed >= 0 ? 1 : -1);

      let nx = car.position.x + Math.sin(st.angle) * st.speed;
      let nz = car.position.z + Math.cos(st.angle) * st.speed;

      for (const b of buildings) {
        if (Math.abs(nx - b.x) < b.hw && Math.abs(nz - b.z) < b.hd) {
          st.speed *= -0.3; nx = car.position.x; nz = car.position.z; break;
        }
      }

      const bound = WORLD_SIZE * 0.42;
      car.position.x = Math.max(-bound, Math.min(bound, nx));
      car.position.z = Math.max(-bound, Math.min(bound, nz));
      car.rotation.y = st.angle;
      car.rotation.z += ((left ? 0.03 : right ? -0.03 : 0) - car.rotation.z) * 0.08;

      headlight.position.set(car.position.x + Math.sin(st.angle) * 3, 2.5, car.position.z + Math.cos(st.angle) * 3);
      headlight.target.position.set(car.position.x + Math.sin(st.angle) * 20, 0, car.position.z + Math.cos(st.angle) * 20);

      const cd = st.cam.distance + Math.abs(st.speed) * 3;
      st.cam.smoothX += (car.position.x - Math.sin(st.angle) * cd - st.cam.smoothX) * 0.04;
      st.cam.smoothZ += (car.position.z - Math.cos(st.angle) * cd - st.cam.smoothZ) * 0.04;
      camera.position.set(st.cam.smoothX, st.cam.height + Math.abs(st.speed) * 2, st.cam.smoothZ);
      camera.lookAt(car.position.x, 1.5, car.position.z);

      sunLight.position.set(car.position.x + 100, 120, car.position.z + 80);
      sunLight.target.position.copy(car.position);

      if (nightRef.current) {
        scene.background.set(0x0a0a1a); scene.fog.color.set(0x0a0a1a);
        ambientLight.intensity = 0.08; sunLight.intensity = 0.05; hemiLight.intensity = 0.05; headlight.intensity = 2.5;
      } else {
        scene.background.set(0x87ceeb); scene.fog.color.set(0x87ceeb);
        ambientLight.intensity = 0.5; sunLight.intensity = 1.0; hemiLight.intensity = 0.3; headlight.intensity = 0;
      }

      setSpeed(Math.abs(Math.round(st.speed * 80)));
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => { nightRef.current = nightMode; }, [nightMode]);

  const btnStyle = {
    width: 56, height: 56, borderRadius: 12, border: "2px solid rgba(255,255,255,0.3)",
    background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: "1.4rem",
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden", background: "#000" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      <div style={{
        position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 16, padding: "10px 24px",
        background: "rgba(0,0,0,0.65)", borderRadius: 16, backdropFilter: "blur(10px)",
        fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#fff"
      }}>
        <div style={{ fontSize: "2rem", fontWeight: 900, fontVariantNumeric: "tabular-nums", minWidth: 80, textAlign: "right" }}>{speed}</div>
        <div style={{ fontSize: "0.75rem", opacity: 0.6, letterSpacing: 1 }}>KM/H</div>
        <div style={{ width: 1, height: 30, background: "rgba(255,255,255,0.2)", margin: "0 4px" }} />
        <button onClick={() => setNightMode(n => !n)} style={{
          padding: "6px 14px", fontSize: "0.8rem", background: nightMode ? "#f1faee" : "#2b2d42",
          color: nightMode ? "#2b2d42" : "#f1faee", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, letterSpacing: 1
        }}>{nightMode ? "☀️ DIA" : "🌙 NOITE"}</button>
      </div>

      <div style={{
        position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
        padding: "8px 20px", background: "rgba(0,0,0,0.5)", borderRadius: 10,
        fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#fff",
        fontSize: "0.8rem", opacity: 0.7, backdropFilter: "blur(6px)", whiteSpace: "nowrap"
      }}>
        <b>W/↑</b> Acelerar &nbsp; <b>S/↓</b> Frear &nbsp; <b>A/←</b> Esquerda &nbsp; <b>D/→</b> Direita
      </div>

      <div style={{ position: "absolute", bottom: 90, left: 20, display: "flex", gap: 8, userSelect: "none" }}>
        {[{ l: "◀", k: "left" }, { l: "▶", k: "right" }].map(b => (
          <button key={b.k} style={btnStyle}
            onTouchStart={() => mountRef.current?._setTouch?.(false, false, b.k === "left", b.k === "right")}
            onTouchEnd={() => mountRef.current?._setTouch?.(false, false, false, false)}
          >{b.l}</button>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 90, right: 20, display: "flex", gap: 8, userSelect: "none" }}>
        {[{ l: "▲", k: "gas" }, { l: "▼", k: "brake" }].map(b => (
          <button key={b.k} style={btnStyle}
            onTouchStart={() => mountRef.current?._setTouch?.(b.k === "gas", b.k === "brake", false, false)}
            onTouchEnd={() => mountRef.current?._setTouch?.(false, false, false, false)}
          >{b.l}</button>
        ))}
      </div>
    </div>
  );
}