import * as THREE from 'three';

export function buildCar(scene) {
  const car = new THREE.Group();

  const add = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    car.add(m);
    return m;
  };

  // ── Chassis ───────────────────────────────────────────────
  const chassisMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  add(new THREE.BoxGeometry(2.4, 0.25, 5.0), chassisMat, 0, 0.35, 0);

  // ── Body ──────────────────────────────────────────────────
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

  // ── Cabin ─────────────────────────────────────────────────
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1d3557, metalness: 0.5, roughness: 0.2 });
  const cabin = add(new THREE.BoxGeometry(2.0, 0.65, 2.0), cabinMat, 0, 1.4, -0.2);
  cabin.castShadow = true;

  // Roof
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x22223b, metalness: 0.6, roughness: 0.3 });
  add(new THREE.BoxGeometry(1.9, 0.08, 1.8), roofMat, 0, 1.76, -0.2);

  // ── Glass ─────────────────────────────────────────────────
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xa8dadc, metalness: 0.9, roughness: 0.05, transparent: true, opacity: 0.45,
  });

  const ws = add(new THREE.BoxGeometry(1.8, 0.55, 0.08), glassMat, 0, 1.45, 0.8);
  ws.rotation.x = -0.2;
  const rw = add(new THREE.BoxGeometry(1.8, 0.55, 0.08), glassMat, 0, 1.45, -1.2);
  rw.rotation.x = 0.2;

  add(new THREE.BoxGeometry(0.08, 0.45, 1.6), glassMat, -1.04, 1.45, -0.2);
  add(new THREE.BoxGeometry(0.08, 0.45, 1.6), glassMat,  1.04, 1.45, -0.2);

  // ── Side mirrors ──────────────────────────────────────────
  const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xc1121f, metalness: 0.6, roughness: 0.3 });
  const mGlassMat = new THREE.MeshStandardMaterial({ color: 0x88ccee, metalness: 1, roughness: 0 });
  [-1.25, 1.25].forEach(x => {
    add(new THREE.BoxGeometry(0.25, 0.18, 0.35), mirrorMat, x, 1.25, 0.5);
    add(new THREE.BoxGeometry(0.04, 0.12, 0.2), mGlassMat, x + (x > 0 ? 0.13 : -0.13), 1.25, 0.5);
  });

  // ── Bumpers ───────────────────────────────────────────────
  const bumperMat = new THREE.MeshStandardMaterial({ color: 0x2b2d42, roughness: 0.6, metalness: 0.3 });
  add(new THREE.BoxGeometry(2.4, 0.3, 0.25), bumperMat, 0, 0.55,  2.5);
  add(new THREE.BoxGeometry(2.4, 0.3, 0.25), bumperMat, 0, 0.55, -2.5);

  // Grille + slats
  add(new THREE.BoxGeometry(1.4, 0.25, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.8 }), 0, 0.7, 2.45);
  const slatMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9, roughness: 0.2 });
  for (let i = 0; i < 5; i++) {
    add(new THREE.BoxGeometry(1.3, 0.015, 0.07), slatMat, 0, 0.6 + i * 0.05, 2.46);
  }

  // License plates
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xf1faee, roughness: 0.5 });
  add(new THREE.BoxGeometry(0.6, 0.2, 0.04), plateMat, 0, 0.5,  2.53);
  add(new THREE.BoxGeometry(0.6, 0.2, 0.04), plateMat, 0, 0.5, -2.53);

  // ── Wheels ────────────────────────────────────────────────
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
  const rimMat  = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.15 });
  const hubMat  = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
  const archMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });

  [[-1.15, 0.35, 1.5], [1.15, 0.35, 1.5], [-1.15, 0.35, -1.5], [1.15, 0.35, -1.5]].forEach(pos => {
    const tire = add(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 16), tireMat, pos[0], pos[1], pos[2]);
    tire.rotation.z = Math.PI / 2; tire.castShadow = true;
    const rim = add(new THREE.CylinderGeometry(0.24, 0.24, 0.32, 12), rimMat, pos[0], pos[1], pos[2]);
    rim.rotation.z = Math.PI / 2;
    add(new THREE.SphereGeometry(0.1, 8, 8), hubMat, pos[0] + (pos[0] > 0 ? 0.17 : -0.17), pos[1], pos[2]);
    add(new THREE.BoxGeometry(0.15, 0.5, 0.9), archMat, pos[0] + (pos[0] > 0 ? 0.08 : -0.08), pos[1] + 0.2, pos[2]);
  });

  // ── Headlights ────────────────────────────────────────────
  const hlMat     = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffcc, emissiveIntensity: 0.9, metalness: 0.5 });
  const hlRingMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 });
  [[-0.8, 0.72, 2.42], [0.8, 0.72, 2.42]].forEach(pos => {
    add(new THREE.SphereGeometry(0.18, 10, 10), hlMat, pos[0], pos[1], pos[2]);
    const ring = add(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 12), hlRingMat, pos[0], pos[1], pos[2] + 0.05);
    ring.rotation.x = Math.PI / 2;
  });

  // Fog lights
  const fogMat = new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffaa, emissiveIntensity: 0.5 });
  add(new THREE.SphereGeometry(0.1, 8, 8), fogMat, -0.9, 0.48, 2.52);
  add(new THREE.SphereGeometry(0.1, 8, 8), fogMat,  0.9, 0.48, 2.52);

  // Tail lights
  const tlMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.6 });
  add(new THREE.BoxGeometry(0.4, 0.2, 0.08), tlMat, -0.8, 0.72, -2.48);
  add(new THREE.BoxGeometry(0.4, 0.2, 0.08), tlMat,  0.8, 0.72, -2.48);

  // Turn signals
  const turnMat = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: 0xff6600, emissiveIntensity: 0.4 });
  add(new THREE.BoxGeometry(0.2, 0.15, 0.08), turnMat, -0.5, 0.72, -2.48);
  add(new THREE.BoxGeometry(0.2, 0.15, 0.08), turnMat,  0.5, 0.72, -2.48);

  // Exhaust pipes
  const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.8, roughness: 0.3 });
  [-0.5, 0.5].forEach(x => {
    const ex = add(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 8), exhaustMat, x, 0.3, -2.55);
    ex.rotation.x = Math.PI / 2;
  });

  // Antenna
  add(new THREE.CylinderGeometry(0.015, 0.01, 0.8, 4),
    new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7 }), -0.6, 2.15, -0.8);

  scene.add(car);
  return car;
}
