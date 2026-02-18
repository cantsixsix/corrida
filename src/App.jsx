// ── App.jsx ─ Open World Drive ──────────────────────────────────
// Rewritten: modular architecture, delta-time game loop, merged
// geometry world, NPC traffic, weather effects, minimap,
// independent touch controls, and proper cleanup.
import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

import {
  CAR_ACCEL, CAR_BRAKE, CAR_FRICTION, CAR_MAX_SPEED, CAR_REVERSE_MAX,
  STEER_SPEED, CAM_BASE_DIST, CAM_BASE_HEIGHT, CAM_SMOOTH,
  WORLD_BOUND, SPEED_MULT, SHADOW_CAM_SIZE,
} from './constants.js';

import { buildCar } from './Car.js';
import { buildWorld } from './World.js';
import { createNPCs, updateNPCs, checkNPCCollision } from './NPCSystem.js';
import {
  createRainSystem, updateRain,
  createDustSystem, updateDust,
  createClouds, updateClouds,
} from './Effects.js';
import { HUD, Minimap, drawMinimap, LoadingScreen } from './HUD.jsx';

export default function OpenWorldDrive() {
  const mountRef   = useRef(null);
  const minimapRef = useRef(null);
  const touchRef   = useRef({ gas: false, brake: false, left: false, right: false });
  const nightRef   = useRef(false);
  const rainRef    = useRef(false);

  const [speed, setSpeed]         = useState(0);
  const [nightMode, setNightMode] = useState(false);
  const [raining, setRaining]     = useState(false);
  const [loading, setLoading]     = useState(true);

  const lastSpeedRef = useRef(-1);

  const toggleNight = useCallback(() => setNightMode(n => !n), []);
  const toggleRain  = useCallback(() => setRaining(r => !r),   []);

  useEffect(() => { nightRef.current = nightMode; }, [nightMode]);
  useEffect(() => { rainRef.current  = raining;  }, [raining]);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const w = container.clientWidth, h = container.clientHeight;

    // ── Renderer ──────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;  // lighter than PCFSoft
    container.appendChild(renderer.domElement);

    // ── Scene + Camera ────────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, w / h, 0.5, 1200);

    // ── Lights ────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.position.set(100, 120, 80);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near   = 10;
    sunLight.shadow.camera.far    = 200;
    sunLight.shadow.camera.left   = -SHADOW_CAM_SIZE;
    sunLight.shadow.camera.right  =  SHADOW_CAM_SIZE;
    sunLight.shadow.camera.top    =  SHADOW_CAM_SIZE;
    sunLight.shadow.camera.bottom = -SHADOW_CAM_SIZE;
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x4a7c59, 0.3);
    scene.add(hemiLight);

    const headlight = new THREE.SpotLight(0xffffee, 0, 60, Math.PI / 5, 0.5, 1.5);
    scene.add(headlight);
    scene.add(headlight.target);

    // ── Build world (merged geos → fast) ─────────────────────
    const worldData = buildWorld(scene);
    const { buildings, trees, lamps, trafficLightMats } = worldData;

    // ── Build car ─────────────────────────────────────────────
    const car = buildCar(scene);

    // ── NPCs ──────────────────────────────────────────────────
    const npcs = createNPCs(scene);

    // ── Effects ───────────────────────────────────────────────
    const rainSys  = createRainSystem(scene);
    const dustSys  = createDustSystem(scene);
    const cloudSys = createClouds(scene);

    // ── Physics state (no React) ─────────────────────────────
    const st = {
      speed: 0, angle: 0, keys: {},
      cam: { distance: CAM_BASE_DIST, height: CAM_BASE_HEIGHT, smoothX: 0, smoothZ: -CAM_BASE_DIST },
    };

    // ── Keyboard ──────────────────────────────────────────────
    const onKeyDown = (e) => { st.keys[e.code] = true; };
    const onKeyUp   = (e) => { st.keys[e.code] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);

    // ── Resize ────────────────────────────────────────────────
    const onResize = () => {
      const nw = container.clientWidth, nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    // ── Traffic light timer ───────────────────────────────────
    let tlClock = 0;

    // ── Clock (delta-time) ────────────────────────────────────
    const clock  = new THREE.Clock();
    let animId;

    // mark loaded
    setLoading(false);

    // ═══════════════════════════════════════════════════════════
    // GAME LOOP
    // ═══════════════════════════════════════════════════════════
    const animate = () => {
      animId = requestAnimationFrame(animate);

      const rawDelta = clock.getDelta();
      const dt = Math.min(rawDelta * 60, 3);   // normalised: 1.0 at 60 fps
      const sec = rawDelta;                     // real seconds for effects

      const tc = touchRef.current;
      const k  = st.keys;

      // ── Input ────────────────────────────────────────────────
      const accel = k['ArrowUp']    || k['KeyW'] || tc.gas;
      const brake = k['ArrowDown']  || k['KeyS'] || tc.brake;
      const left  = k['ArrowLeft']  || k['KeyA'] || tc.left;
      const right = k['ArrowRight'] || k['KeyD'] || tc.right;

      // ── Car physics (dt-scaled) ──────────────────────────────
      if (accel) st.speed = Math.min(st.speed + CAR_ACCEL * dt, CAR_MAX_SPEED);
      else if (brake) st.speed = Math.max(st.speed - CAR_BRAKE * dt, CAR_REVERSE_MAX);
      else {
        if (st.speed > 0) st.speed = Math.max(0, st.speed - CAR_FRICTION * dt);
        else if (st.speed < 0) st.speed = Math.min(0, st.speed + CAR_FRICTION * dt);
      }

      const sf = Math.min(Math.abs(st.speed) / 1.0, 1);
      if (left)  st.angle += STEER_SPEED * sf * (st.speed >= 0 ? 1 : -1) * dt;
      if (right) st.angle -= STEER_SPEED * sf * (st.speed >= 0 ? 1 : -1) * dt;

      let nx = car.position.x + Math.sin(st.angle) * st.speed * dt;
      let nz = car.position.z + Math.cos(st.angle) * st.speed * dt;

      // ── Collision: buildings ──────────────────────────────────
      let collided = false;
      for (const b of buildings) {
        if (Math.abs(nx - b.x) < b.hw && Math.abs(nz - b.z) < b.hd) {
          collided = true; break;
        }
      }
      // ── Collision: trees / lamps ─────────────────────────────
      if (!collided) {
        for (const t of trees) {
          const dx = nx - t.x, dz = nz - t.z;
          if (dx * dx + dz * dz < t.r * t.r + 2) { collided = true; break; }
        }
      }
      if (!collided) {
        for (const l of lamps) {
          const dx = nx - l.x, dz = nz - l.z;
          if (dx * dx + dz * dz < l.r * l.r + 2) { collided = true; break; }
        }
      }
      // ── Collision: NPCs ──────────────────────────────────────
      if (!collided && checkNPCCollision(npcs, nx, nz)) collided = true;

      if (collided) {
        st.speed *= -0.3;
        nx = car.position.x;
        nz = car.position.z;
      }

      // ── Position ─────────────────────────────────────────────
      car.position.x = Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, nx));
      car.position.z = Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, nz));
      car.rotation.y = st.angle;
      car.rotation.z += ((left ? 0.03 : right ? -0.03 : 0) - car.rotation.z) * 0.08 * dt;

      // ── Headlight ────────────────────────────────────────────
      headlight.position.set(
        car.position.x + Math.sin(st.angle) * 3, 2.5,
        car.position.z + Math.cos(st.angle) * 3);
      headlight.target.position.set(
        car.position.x + Math.sin(st.angle) * 20, 0,
        car.position.z + Math.cos(st.angle) * 20);

      // ── Camera follow ────────────────────────────────────────
      const cd = st.cam.distance + Math.abs(st.speed) * 3;
      st.cam.smoothX += (car.position.x - Math.sin(st.angle) * cd - st.cam.smoothX) * CAM_SMOOTH * dt;
      st.cam.smoothZ += (car.position.z - Math.cos(st.angle) * cd - st.cam.smoothZ) * CAM_SMOOTH * dt;
      camera.position.set(st.cam.smoothX, st.cam.height + Math.abs(st.speed) * 2, st.cam.smoothZ);
      camera.lookAt(car.position.x, 1.5, car.position.z);

      // ── Sun follow ───────────────────────────────────────────
      sunLight.position.set(car.position.x + 50, 100, car.position.z + 40);
      sunLight.target.position.copy(car.position);

      // ── Day / Night ──────────────────────────────────────────
      const isNight = nightRef.current;
      if (isNight) {
        scene.background.set(0x0a0a1a);
        scene.fog.color.set(0x0a0a1a);
        ambientLight.intensity = 0.08;
        sunLight.intensity     = 0.05;
        hemiLight.intensity    = 0.05;
        headlight.intensity    = 2.5;
      } else {
        const sky = rainRef.current ? 0x5a6a7a : 0x87ceeb;
        scene.background.set(sky);
        scene.fog.color.set(sky);
        ambientLight.intensity = rainRef.current ? 0.3 : 0.5;
        sunLight.intensity     = rainRef.current ? 0.4 : 1.0;
        hemiLight.intensity    = 0.3;
        headlight.intensity    = rainRef.current ? 0.8 : 0;
      }

      // ── Traffic lights (cycle every 6s) ──────────────────────
      tlClock += sec;
      const phase = (tlClock % 6) / 6;
      if (phase < 0.45) {
        trafficLightMats.red.emissiveIntensity    = 0.1;
        trafficLightMats.yellow.emissiveIntensity = 0.1;
        trafficLightMats.green.emissiveIntensity  = 0.9;
      } else if (phase < 0.55) {
        trafficLightMats.red.emissiveIntensity    = 0.1;
        trafficLightMats.yellow.emissiveIntensity = 0.9;
        trafficLightMats.green.emissiveIntensity  = 0.1;
      } else {
        trafficLightMats.red.emissiveIntensity    = 0.9;
        trafficLightMats.yellow.emissiveIntensity = 0.1;
        trafficLightMats.green.emissiveIntensity  = 0.1;
      }

      // ── NPCs ─────────────────────────────────────────────────
      updateNPCs(npcs, dt);

      // ── Effects ──────────────────────────────────────────────
      updateRain(rainSys, sec, car.position, rainRef.current && !isNight);
      updateDust(dustSys, sec, car.position, st.angle, st.speed);
      updateClouds(cloudSys, sec, isNight, rainRef.current);

      // ── HUD speed (only update when value changes) ──────────
      const displaySpeed = Math.abs(Math.round(st.speed * SPEED_MULT));
      if (displaySpeed !== lastSpeedRef.current) {
        lastSpeedRef.current = displaySpeed;
        setSpeed(displaySpeed);
      }

      // ── Minimap ──────────────────────────────────────────────
      if (minimapRef.current) {
        const ctx = minimapRef.current.getContext('2d');
        if (ctx) drawMinimap(ctx, car.position, st.angle, npcs);
      }

      // ── Render ───────────────────────────────────────────────
      renderer.render(scene, camera);
    };

    animate();

    // ═══════════════════════════════════════════════════════════
    // CLEANUP  (proper dispose)
    // ═══════════════════════════════════════════════════════════
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
      window.removeEventListener('resize',  onResize);

      // traverse & dispose all geometry / materials
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#000' }}>
      {loading && <LoadingScreen />}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      <Minimap canvasRef={minimapRef} />
      <HUD
        speed={speed}
        nightMode={nightMode}
        raining={raining}
        onToggleNight={toggleNight}
        onToggleRain={toggleRain}
        touchRef={touchRef}
      />
    </div>
  );
}
