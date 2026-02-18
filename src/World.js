// ── World Builder ───────────────────────────────────────────────
// Every repeatable object (road markings, windows, trees, lamps …)
// is collected as a translated BufferGeometry and then merged into
// ONE mesh per material.  This cuts draw-calls from ~5 000 to ~40.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  WORLD_SIZE, ROAD_DEFS, INTERSECTIONS,
  FLOOR_HEIGHT, BUILDING_COUNT, TREE_COUNT, isOnRoad,
} from './constants.js';

// ── helpers ─────────────────────────────────────────────────────
function geoAt(geo, x, y, z) { geo.translate(x, y, z); return geo; }

function finalize(scene, geos, material, opts = {}) {
  if (!geos.length) return null;
  try {
    const merged = mergeGeometries(geos, false);
    if (!merged) return null;
    const mesh = new THREE.Mesh(merged, material);
    if (opts.castShadow)    mesh.castShadow    = true;
    if (opts.receiveShadow) mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  } catch (e) {
    console.warn('mergeGeometries failed:', e);
    return null;
  } finally {
    geos.forEach(g => g.dispose());
  }
}

// ── main ────────────────────────────────────────────────────────
export function buildWorld(scene) {

  /* ---- geometry collectors (grouped by material) ---- */
  const C = {
    road: [], yellowDash: [], whiteLine: [],
    sidewalk: [], interPad: [],
    winFrame: [], winGlass: [], winLit: [], ledge: [], floorDiv: [],
    door: [], handle: [], ac: [], roofCyl: [], roofAnt: [],
    trunk: [],
    lampPole: [], lampArm: [], lampBox: [], lampBulb: [],
    tlPole: [], tlHousing: [], tlRed: [], tlYellow: [], tlGreen: [],
    bench: [], trashcan: [], hydrant: [],
  };
  const buildingGeos = new Map();   // color → [geo]
  const leafGeos     = new Map();   // color → [geo]

  /* ---- collision arrays ---- */
  const buildings = [];
  const trees     = [];
  const lamps     = [];

  // ══════════════════════════════════════════════════════════════
  // GROUND  (procedural grass texture)
  // ══════════════════════════════════════════════════════════════
  const grassCanvas = document.createElement('canvas');
  grassCanvas.width = 512;
  grassCanvas.height = 512;
  const gCtx = grassCanvas.getContext('2d');
  // base fill
  gCtx.fillStyle = '#4a7a3a';
  gCtx.fillRect(0, 0, 512, 512);
  // variation blotches
  const grassColors = ['#3d6e30', '#5a8f48', '#4e8040', '#6a9a55', '#3a6a2e', '#78a862', '#2f5a24'];
  for (let i = 0; i < 3000; i++) {
    gCtx.fillStyle = grassColors[Math.floor(Math.random() * grassColors.length)];
    const gx = Math.random() * 512, gy = Math.random() * 512;
    gCtx.beginPath();
    gCtx.ellipse(gx, gy, 2 + Math.random() * 6, 1 + Math.random() * 3, Math.random() * Math.PI, 0, Math.PI * 2);
    gCtx.fill();
  }
  // small soil patches
  for (let i = 0; i < 400; i++) {
    gCtx.fillStyle = Math.random() > 0.5 ? '#5c4a2f' : '#6b5a3a';
    gCtx.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 3, 1 + Math.random() * 2);
  }
  const grassTex = new THREE.CanvasTexture(grassCanvas);
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.repeat.set(WORLD_SIZE / 20, WORLD_SIZE / 20);
  grassTex.magFilter = THREE.LinearFilter;
  grassTex.minFilter = THREE.LinearMipmapLinearFilter;
  grassTex.anisotropy = 4;

  const groundGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE);
  const ground = new THREE.Mesh(groundGeo,
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.92 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ══════════════════════════════════════════════════════════════
  // ROADS  +  MARKINGS  +  SIDEWALKS
  // ══════════════════════════════════════════════════════════════
  const RW = 14; // road width
  const INT_MARGIN = RW / 2 + 3; // skip zone around intersections

  function isNearIntersection(x, z, margin) {
    return INTERSECTIONS.some(i => Math.abs(x - i.x) < margin && Math.abs(z - i.z) < margin);
  }

  ROAD_DEFS.forEach(r => {
    C.road.push(geoAt(new THREE.BoxGeometry(r.w, 0.05, r.d), r.x, 0.02, r.z));
    const isH = r.w > r.d;

    // centre dashes — skip near intersections
    const len = isH ? r.w : r.d;
    for (let i = 0; i < Math.floor(len / 8); i++) {
      if (isH) {
        const px = r.x - len / 2 + i * 8 + 4;
        if (!isNearIntersection(px, r.z, INT_MARGIN))
          C.yellowDash.push(geoAt(new THREE.BoxGeometry(3, 0.06, 0.25), px, 0.05, r.z));
      } else {
        const pz = r.z - len / 2 + i * 8 + 4;
        if (!isNearIntersection(r.x, pz, INT_MARGIN))
          C.yellowDash.push(geoAt(new THREE.BoxGeometry(0.25, 0.06, 3), r.x, 0.05, pz));
      }
    }

    // edge lines — skip near intersections
    const eo = (isH ? r.d : r.w) / 2 - 0.5;
    for (let i = 0; i < Math.floor(len / 4); i++) {
      if (isH) {
        const px = r.x - len / 2 + i * 4 + 2;
        if (!isNearIntersection(px, r.z, INT_MARGIN)) {
          C.whiteLine.push(geoAt(new THREE.BoxGeometry(3.5, 0.055, 0.15), px, 0.05, r.z + eo));
          C.whiteLine.push(geoAt(new THREE.BoxGeometry(3.5, 0.055, 0.15), px, 0.05, r.z - eo));
        }
      } else {
        const pz = r.z - len / 2 + i * 4 + 2;
        if (!isNearIntersection(r.x, pz, INT_MARGIN)) {
          C.whiteLine.push(geoAt(new THREE.BoxGeometry(0.15, 0.055, 3.5), r.x + eo, 0.05, pz));
          C.whiteLine.push(geoAt(new THREE.BoxGeometry(0.15, 0.055, 3.5), r.x - eo, 0.05, pz));
        }
      }
    }
  });

  // ══════════════════════════════════════════════════════════════
  // INTERSECTION PADS  (clean flat squares at crossings)
  // ══════════════════════════════════════════════════════════════
  INTERSECTIONS.forEach(inter => {
    const pad = RW + 4;
    C.interPad.push(geoAt(new THREE.BoxGeometry(pad, 0.06, pad), inter.x, 0.03, inter.z));
  });

  // ══════════════════════════════════════════════════════════════
  // SIDEWALKS  (thin, segmented, skip at intersections & roads)
  // ══════════════════════════════════════════════════════════════
  const SW_W = 1.0;   // width (thin)
  const SW_H = 0.06;  // height (barely raised)
  const SW_SEG = 6;   // segment length
  const SW_OFF = RW / 2 + SW_W / 2 + 0.2;  // offset from road center

  ROAD_DEFS.forEach(r => {
    const isH = r.w > r.d;
    const len = isH ? r.w : r.d;
    const segs = Math.floor(len / SW_SEG);

    for (let s = 0; s < segs; s++) {
      const along = -len / 2 + s * SW_SEG + SW_SEG / 2;

      if (isH) {
        const sx = r.x + along;
        // skip if this segment is near an intersection
        if (isNearIntersection(sx, r.z, INT_MARGIN + 2)) continue;
        const sz1 = r.z + SW_OFF;
        const sz2 = r.z - SW_OFF;
        // skip if sidewalk position is on another road
        if (!isOnRoad(sx, sz1) || Math.abs(r.z + r.d / 2 - sz1) < 2)
          C.sidewalk.push(geoAt(new THREE.BoxGeometry(SW_SEG - 0.5, SW_H, SW_W), sx, SW_H / 2, sz1));
        if (!isOnRoad(sx, sz2) || Math.abs(r.z - r.d / 2 - sz2) < 2)
          C.sidewalk.push(geoAt(new THREE.BoxGeometry(SW_SEG - 0.5, SW_H, SW_W), sx, SW_H / 2, sz2));
      } else {
        const sz = r.z + along;
        if (isNearIntersection(r.x, sz, INT_MARGIN + 2)) continue;
        const sx1 = r.x + SW_OFF;
        const sx2 = r.x - SW_OFF;
        if (!isOnRoad(sx1, sz) || Math.abs(r.x + r.w / 2 - sx1) < 2)
          C.sidewalk.push(geoAt(new THREE.BoxGeometry(SW_W, SW_H, SW_SEG - 0.5), sx1, SW_H / 2, sz));
        if (!isOnRoad(sx2, sz) || Math.abs(r.x - r.w / 2 - sx2) < 2)
          C.sidewalk.push(geoAt(new THREE.BoxGeometry(SW_W, SW_H, SW_SEG - 0.5), sx2, SW_H / 2, sz));
      }
    }
  });

  // ══════════════════════════════════════════════════════════════
  // BUILDINGS
  // ══════════════════════════════════════════════════════════════
  const bColors = [
    0x457b9d, 0x6d6875, 0xb5838d, 0xe5989b, 0x8d99ae, 0x2b2d42,
    0x606c38, 0xbc6c25, 0x588157, 0x3a5a40, 0x9b2226, 0x264653, 0x023047,
  ];

  for (let i = 0; i < BUILDING_COUNT; i++) {
    const bx = (Math.random() - 0.5) * WORLD_SIZE * 0.65;
    const bz = (Math.random() - 0.5) * WORLD_SIZE * 0.65;

    const w = 8 + Math.random() * 16;
    const h = 6 + Math.random() * 28;
    const d = 8 + Math.random() * 16;

    // Check all 4 corners + centre so NO part of building overlaps a road
    const hw = w / 2 + 2;   // extra 2-unit clearance
    const hd = d / 2 + 2;
    if (
      isOnRoad(bx, bz) ||
      isOnRoad(bx - hw, bz - hd) || isOnRoad(bx + hw, bz - hd) ||
      isOnRoad(bx - hw, bz + hd) || isOnRoad(bx + hw, bz + hd) ||
      isOnRoad(bx - hw, bz)      || isOnRoad(bx + hw, bz)      ||
      isOnRoad(bx, bz - hd)      || isOnRoad(bx, bz + hd)
    ) continue;
    const color = bColors[Math.floor(Math.random() * bColors.length)];

    // body → group by colour
    if (!buildingGeos.has(color)) buildingGeos.set(color, []);
    buildingGeos.get(color).push(geoAt(new THREE.BoxGeometry(w, h, d), bx, h / 2, bz));

    buildings.push({ x: bx, z: bz, hw: w / 2 + 1.5, hd: d / 2 + 1.5 });

    // roof + base ledges
    C.ledge.push(geoAt(new THREE.BoxGeometry(w + 0.4, 0.3, d + 0.4), bx, h + 0.15, bz));
    C.ledge.push(geoAt(new THREE.BoxGeometry(w + 0.3, 0.4, d + 0.3), bx, 0.2, bz));

    const floors = Math.floor(h / FLOOR_HEIGHT);

    // floor dividers
    for (let f = 1; f < floors; f++)
      C.floorDiv.push(geoAt(new THREE.BoxGeometry(w + 0.15, 0.1, d + 0.15), bx, f * FLOOR_HEIGHT, bz));

    // windows (4 faces)
    for (let f = 0; f < floors; f++) {
      const wy = 2.2 + f * FLOOR_HEIGHT;

      // front + back
      const wc = Math.max(2, Math.floor(w / 3.5));
      for (let wi = 0; wi < wc; wi++) {
        const wx = bx - w / 2 + 2 + wi * ((w - 3) / Math.max(wc - 1, 1));
        const litF = Math.random() > 0.5;
        // front
        C.winFrame.push(geoAt(new THREE.BoxGeometry(1.4, 1.6, 0.08), wx, wy, bz + d / 2 + 0.04));
        (litF ? C.winLit : C.winGlass).push(geoAt(new THREE.BoxGeometry(1.1, 1.3, 0.06), wx, wy, bz + d / 2 + 0.07));
        C.ledge.push(geoAt(new THREE.BoxGeometry(1.5, 0.08, 0.2), wx, wy - 0.75, bz + d / 2 + 0.1));
        // back
        C.winFrame.push(geoAt(new THREE.BoxGeometry(1.4, 1.6, 0.08), wx, wy, bz - d / 2 - 0.04));
        (Math.random() > 0.5 ? C.winLit : C.winGlass).push(
          geoAt(new THREE.BoxGeometry(1.1, 1.3, 0.06), wx, wy, bz - d / 2 - 0.07));
      }

      // sides
      const sc = Math.max(2, Math.floor(d / 3.5));
      for (let si = 0; si < sc; si++) {
        const sz = bz - d / 2 + 2 + si * ((d - 3) / Math.max(sc - 1, 1));
        // right
        C.winFrame.push(geoAt(new THREE.BoxGeometry(0.08, 1.6, 1.4), bx + w / 2 + 0.04, wy, sz));
        (Math.random() > 0.5 ? C.winLit : C.winGlass).push(
          geoAt(new THREE.BoxGeometry(0.06, 1.3, 1.1), bx + w / 2 + 0.07, wy, sz));
        // left
        C.winFrame.push(geoAt(new THREE.BoxGeometry(0.08, 1.6, 1.4), bx - w / 2 - 0.04, wy, sz));
        (Math.random() > 0.5 ? C.winLit : C.winGlass).push(
          geoAt(new THREE.BoxGeometry(0.06, 1.3, 1.1), bx - w / 2 - 0.07, wy, sz));
      }
    }

    // door
    C.door.push(geoAt(new THREE.BoxGeometry(1.2, 2.2, 0.1), bx, 1.1, bz + d / 2 + 0.06));
    C.handle.push(geoAt(new THREE.BoxGeometry(0.25, 0.06, 0.08), bx + 0.35, 1.1, bz + d / 2 + 0.12));

    // AC units
    if (Math.random() > 0.4) {
      const count = Math.floor(Math.random() * 3) + 1;
      for (let a = 0; a < count; a++) {
        C.ac.push(geoAt(new THREE.BoxGeometry(0.8, 0.5, 0.4),
          bx + (Math.random() > 0.5 ? 1 : -1) * (w / 2 + 0.2),
          3 + a * FLOOR_HEIGHT + Math.random() * 2,
          bz + (Math.random() - 0.5) * d * 0.6));
      }
    }

    // rooftop
    if (h > 15 && Math.random() > 0.3)
      C.roofCyl.push(geoAt(new THREE.CylinderGeometry(0.8, 0.8, 1.5, 6),
        bx + (Math.random() - 0.5) * w * 0.4, h + 0.75, bz + (Math.random() - 0.5) * d * 0.4));
    if (h > 12 && Math.random() > 0.5)
      C.roofAnt.push(geoAt(new THREE.CylinderGeometry(0.03, 0.03, 3, 3),
        bx + (Math.random() - 0.5) * w * 0.3, h + 1.5, bz + (Math.random() - 0.5) * d * 0.3));
  }

  // ══════════════════════════════════════════════════════════════
  // TREES
  // ══════════════════════════════════════════════════════════════
  const leafCols = [0x2d6a4f, 0x40916c, 0x52b788, 0x74c69d];

  for (let i = 0; i < TREE_COUNT; i++) {
    const tx = (Math.random() - 0.5) * WORLD_SIZE * 0.75;
    const tz = (Math.random() - 0.5) * WORLD_SIZE * 0.75;
    if (isOnRoad(tx, tz)) continue;
    if (buildings.some(b => Math.abs(tx - b.x) < b.hw && Math.abs(tz - b.z) < b.hd)) continue;

    const th = 2 + Math.random() * 2.5;
    C.trunk.push(geoAt(new THREE.CylinderGeometry(0.2, 0.35, th, 6), tx, th / 2, tz));

    const lc = leafCols[Math.floor(Math.random() * leafCols.length)];
    if (!leafGeos.has(lc)) leafGeos.set(lc, []);
    const cs = 1.8 + Math.random() * 2.2;
    leafGeos.get(lc).push(geoAt(new THREE.SphereGeometry(cs, 6, 4), tx, th + cs * 0.5, tz));
    if (Math.random() > 0.5) {
      leafGeos.get(lc).push(geoAt(new THREE.SphereGeometry(cs * 0.7, 5, 3),
        tx + (Math.random() - 0.5) * 1.5, th + cs * 1.1, tz + (Math.random() - 0.5) * 1.5));
    }

    trees.push({ x: tx, z: tz, r: 0.5 });
  }

  // ══════════════════════════════════════════════════════════════
  // STREET LAMPS  (extended range for bigger world)
  // ══════════════════════════════════════════════════════════════
  const lampRange = WORLD_SIZE * 0.4;
  for (let i = -lampRange; i < lampRange; i += 35) {
    [9, -9].forEach(off => {
      C.lampPole.push(geoAt(new THREE.CylinderGeometry(0.08, 0.12, 5.5, 6), off, 2.75, i));
      C.lampArm.push(geoAt(new THREE.BoxGeometry(1.2, 0.08, 0.08),
        off + (off > 0 ? -0.6 : 0.6), 5.3, i));
      C.lampBox.push(geoAt(new THREE.BoxGeometry(0.5, 0.2, 0.5),
        off + (off > 0 ? -1.1 : 1.1), 5.2, i));
      C.lampBulb.push(geoAt(new THREE.SphereGeometry(0.25, 6, 6),
        off + (off > 0 ? -1.1 : 1.1), 5.05, i));
      lamps.push({ x: off, z: i, r: 0.3 });
    });
  }

  // ══════════════════════════════════════════════════════════════
  // TRAFFIC LIGHTS  (synchronised across intersections)
  // ══════════════════════════════════════════════════════════════
  INTERSECTIONS.forEach(inter => {
    const corners = [
      { x: inter.x + 6.5, z: inter.z + 6.5 },
      { x: inter.x - 6.5, z: inter.z + 6.5 },
      { x: inter.x + 6.5, z: inter.z - 6.5 },
      { x: inter.x - 6.5, z: inter.z - 6.5 },
    ];
    corners.forEach(c => {
      C.tlPole.push(geoAt(new THREE.CylinderGeometry(0.08, 0.1, 4.5, 6), c.x, 2.25, c.z));
      C.tlHousing.push(geoAt(new THREE.BoxGeometry(0.4, 1.2, 0.3), c.x, 5, c.z));
      C.tlRed.push(geoAt(new THREE.SphereGeometry(0.1, 5, 4), c.x, 5.35, c.z + 0.16));
      C.tlYellow.push(geoAt(new THREE.SphereGeometry(0.1, 5, 4), c.x, 5.0, c.z + 0.16));
      C.tlGreen.push(geoAt(new THREE.SphereGeometry(0.1, 5, 4), c.x, 4.65, c.z + 0.16));
    });
  });

  // ══════════════════════════════════════════════════════════════
  // STREET FURNITURE  (benches, bins, hydrants along main roads)
  // ══════════════════════════════════════════════════════════════
  const furnRange = WORLD_SIZE * 0.35;
  for (let i = -furnRange; i < furnRange; i += 40) {
    [14, -14].forEach(off => {
      // bench
      C.bench.push(geoAt(new THREE.BoxGeometry(1.5, 0.08, 0.6), off, 0.45, i));
      C.bench.push(geoAt(new THREE.BoxGeometry(0.1, 0.45, 0.6), off - 0.7, 0.22, i));
      C.bench.push(geoAt(new THREE.BoxGeometry(0.1, 0.45, 0.6), off + 0.7, 0.22, i));
      C.bench.push(geoAt(new THREE.BoxGeometry(1.5, 0.5, 0.08), off, 0.6, i - 0.28));
    });
    if (i % 80 === 0) {
      [13, -13].forEach(off => {
        C.trashcan.push(geoAt(new THREE.CylinderGeometry(0.3, 0.25, 0.8, 8), off, 0.4, i + 15));
      });
    }
    if ((i + 20) % 120 === 0) {
      [12.5, -12.5].forEach(off => {
        C.hydrant.push(geoAt(new THREE.CylinderGeometry(0.12, 0.15, 0.6, 6), off, 0.3, i + 20));
        C.hydrant.push(geoAt(new THREE.SphereGeometry(0.14, 5, 4), off, 0.65, i + 20));
      });
    }
  }

  // ══════════════════════════════════════════════════════════════
  // FINALIZE – merge each group into one mesh
  // ══════════════════════════════════════════════════════════════
  const M = {
    road:     new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.7 }),
    interPad: new THREE.MeshStandardMaterial({ color: 0x3e3e3e, roughness: 0.65 }),
    sidewalk: new THREE.MeshStandardMaterial({ color: 0xc8beb0, roughness: 0.85 }),
    yellow:   new THREE.MeshStandardMaterial({ color: 0xf4d35e, roughness: 0.5 }),
    white:    new THREE.MeshStandardMaterial({ color: 0xf1faee, roughness: 0.5 }),
    winFrame: new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.6 }),
    winGlass: new THREE.MeshStandardMaterial({ color: 0x88bbdd, metalness: 0.8, roughness: 0.1, transparent: true, opacity: 0.5 }),
    winLit:   new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xffffcc, emissiveIntensity: 0.35 }),
    ledge:    new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5 }),
    door:     new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.7 }),
    handle:   new THREE.MeshStandardMaterial({ color: 0xc9a84c, metalness: 0.9, roughness: 0.1 }),
    ac:       new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5 }),
    roofMtl:  new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6 }),
    antenna:  new THREE.MeshStandardMaterial({ color: 0x555555 }),
    trunk:    new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.9 }),
    lamp:     new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5 }),
    bulb:     new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xfff3b0, emissiveIntensity: 1 }),
    tlPole:   new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 }),
    tlHouse:  new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 }),
    tlRed:    new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.8 }),
    tlYellow: new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 0.3 }),
    tlGreen:  new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.3 }),
    bench:    new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.8 }),
    trash:    new THREE.MeshStandardMaterial({ color: 0x2f4f2f, roughness: 0.7, metalness: 0.3 }),
    hydrant:  new THREE.MeshStandardMaterial({ color: 0xcc2200, roughness: 0.5, metalness: 0.3 }),
  };

  const roadMesh = finalize(scene, C.road, M.road, { receiveShadow: true });
  finalize(scene, C.interPad,  M.interPad, { receiveShadow: true });
  finalize(scene, C.sidewalk,  M.sidewalk, { receiveShadow: true });
  finalize(scene, C.yellowDash, M.yellow);
  finalize(scene, C.whiteLine,  M.white);

  // buildings per colour
  for (const [color, geos] of buildingGeos) {
    finalize(scene, geos,
      new THREE.MeshStandardMaterial({ color, roughness: 0.65 }),
      { castShadow: true, receiveShadow: true });
  }

  finalize(scene, C.winFrame, M.winFrame);
  finalize(scene, C.winGlass, M.winGlass);
  finalize(scene, C.winLit,   M.winLit);
  finalize(scene, C.ledge,    M.ledge);
  finalize(scene, C.floorDiv, M.ledge);
  finalize(scene, C.door,     M.door);
  finalize(scene, C.handle,   M.handle);
  finalize(scene, C.ac,       M.ac);
  finalize(scene, C.roofCyl,  M.roofMtl);
  finalize(scene, C.roofAnt,  M.antenna);

  // trees
  finalize(scene, C.trunk, M.trunk, { castShadow: true });
  for (const [color, geos] of leafGeos) {
    finalize(scene, geos,
      new THREE.MeshStandardMaterial({ color, roughness: 0.8 }),
      { castShadow: true });
  }

  // lamps
  finalize(scene, C.lampPole, M.lamp);
  finalize(scene, C.lampArm,  M.lamp);
  finalize(scene, C.lampBox,  M.lamp);
  finalize(scene, C.lampBulb, M.bulb);

  // traffic lights
  finalize(scene, C.tlPole,    M.tlPole);
  finalize(scene, C.tlHousing, M.tlHouse);
  finalize(scene, C.tlRed,     M.tlRed);
  finalize(scene, C.tlYellow,  M.tlYellow);
  finalize(scene, C.tlGreen,   M.tlGreen);

  // furniture
  finalize(scene, C.bench,    M.bench);
  finalize(scene, C.trashcan, M.trash);
  finalize(scene, C.hydrant,  M.hydrant);

  // sky + fog
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 150, WORLD_SIZE * 0.35);

  return {
    buildings,
    trees,
    lamps,
    trafficLightMats: { red: M.tlRed, yellow: M.tlYellow, green: M.tlGreen },
    roadMat: M.road,
  };
}
