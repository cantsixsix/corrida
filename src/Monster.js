// ── Monster System ──────────────────────────────────────────────
// A slow, terrifying creature that only appears at night.
// Chases the player with glowing red eyes and a sinister float.
import * as THREE from 'three';
import { MONSTER_SPEED, MONSTER_SPAWN_DIST, MONSTER_HIT_DIST } from './constants.js';

function buildMonsterMesh() {
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m;
  };

  const darkMat  = new THREE.MeshStandardMaterial({ color: 0x0a0505, roughness: 0.95 });
  const skinMat  = new THREE.MeshStandardMaterial({ color: 0x1a0808, roughness: 0.9 });
  const eyeMat   = new THREE.MeshStandardMaterial({
    color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2.5,
  });
  const hornMat  = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7, metalness: 0.3 });
  const clawMat  = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6, metalness: 0.4 });

  // ── Body (torso) ──
  const body = add(new THREE.BoxGeometry(3, 5, 2.5), darkMat, 0, 4, 0);
  body.castShadow = true;

  // ── Head ──
  const head = add(new THREE.SphereGeometry(1.5, 10, 8), skinMat, 0, 7.5, 0);
  head.castShadow = true;

  // ── Eyes (glowing red) ──
  add(new THREE.SphereGeometry(0.3, 8, 6), eyeMat, -0.5, 7.8, 1.2);
  add(new THREE.SphereGeometry(0.3, 8, 6), eyeMat,  0.5, 7.8, 1.2);
  // inner bright pupil
  add(new THREE.SphereGeometry(0.12, 6, 4), eyeMat, -0.5, 7.8, 1.45);
  add(new THREE.SphereGeometry(0.12, 6, 4), eyeMat,  0.5, 7.8, 1.45);

  // ── Mouth ──
  add(new THREE.BoxGeometry(1.0, 0.2, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x220000, roughness: 0.9 }),
    0, 7.0, 1.3);

  // ── Horns ──
  const hornGeo = new THREE.ConeGeometry(0.3, 1.8, 6);
  const lh = add(hornGeo.clone(), hornMat, -0.8, 9.0, -0.2);
  lh.rotation.z = 0.25;
  const rh = add(hornGeo, hornMat, 0.8, 9.0, -0.2);
  rh.rotation.z = -0.25;

  // ── Arms ──
  const armGeo = new THREE.BoxGeometry(0.8, 3.5, 0.8);
  const leftArm  = add(armGeo.clone(), darkMat, -2.2, 4.5, 0);
  leftArm.rotation.z = 0.15;
  const rightArm = add(armGeo, darkMat,  2.2, 4.5, 0);
  rightArm.rotation.z = -0.15;

  // ── Claws (3 per hand) ──
  for (let i = -1; i <= 1; i++) {
    const claw = new THREE.ConeGeometry(0.1, 0.6, 4);
    add(claw.clone(), clawMat, -2.2 + i * 0.25, 2.5, 0.2);
    add(claw, clawMat, 2.2 + i * 0.25, 2.5, 0.2);
  }

  // ── Legs ──
  const legGeo = new THREE.BoxGeometry(1.0, 2.5, 1.0);
  add(legGeo.clone(), darkMat, -0.9, 1.0, 0);
  add(legGeo, darkMat,  0.9, 1.0, 0);

  // ── Eerie red glow underneath ──
  const glow = new THREE.PointLight(0xff2200, 1.5, 40, 2);
  glow.position.set(0, 1, 0);
  g.add(glow);

  // scale up
  g.scale.set(1.8, 1.8, 1.8);

  return { group: g, leftArm, rightArm, glow, eyeMat };
}

// ═════════════════════════════════════════════════════════════════
// PUBLIC API
// ═════════════════════════════════════════════════════════════════

export function createMonster(scene) {
  const { group, leftArm, rightArm, glow, eyeMat } = buildMonsterMesh();
  group.visible = false;
  group.position.set(0, 0, -MONSTER_SPAWN_DIST);
  scene.add(group);

  return {
    mesh: group,
    leftArm,
    rightArm,
    glow,
    eyeMat,
    time: 0,
    wasNight: false,
    dist: 9999,
  };
}

export function updateMonster(monster, dt, carPos, isNight) {
  const m = monster.mesh;
  monster.time += dt * 0.016;  // real-ish seconds

  // ── Night on: show + chase ──
  if (isNight) {
    if (!monster.wasNight) {
      // just became night → spawn behind player
      const spawnAngle = Math.atan2(carPos.x, carPos.z) + Math.PI;
      m.position.x = carPos.x + Math.sin(spawnAngle) * MONSTER_SPAWN_DIST;
      m.position.z = carPos.z + Math.cos(spawnAngle) * MONSTER_SPAWN_DIST;
      m.visible = true;
      monster.wasNight = true;
    }

    // chase the player
    const dx = carPos.x - m.position.x;
    const dz = carPos.z - m.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    monster.dist = dist;

    if (dist > 2) {
      const nx = dx / dist;
      const nz = dz / dist;
      m.position.x += nx * MONSTER_SPEED * dt;
      m.position.z += nz * MONSTER_SPEED * dt;
      m.rotation.y = Math.atan2(dx, dz);
    }

    // sinister floating animation
    m.position.y = Math.sin(monster.time * 2) * 0.4 + 0.3;

    // arm sway
    monster.leftArm.rotation.x  = Math.sin(monster.time * 3) * 0.3;
    monster.rightArm.rotation.x = Math.sin(monster.time * 3 + Math.PI) * 0.3;

    // eye pulse
    monster.eyeMat.emissiveIntensity = 2.0 + Math.sin(monster.time * 5) * 0.8;

    // glow intensity increases as it gets closer
    monster.glow.intensity = Math.min(3, 1.5 + (150 / Math.max(dist, 10)));

  } else {
    // ── Day: hide + reset ──
    if (monster.wasNight) {
      m.visible = false;
      m.position.set(0, -50, 0);
      monster.wasNight = false;
      monster.dist = 9999;
    }
  }

  return {
    isClose: isNight && monster.dist < MONSTER_HIT_DIST,
    dist: monster.dist,
  };
}
