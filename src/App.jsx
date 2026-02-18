// ── App.jsx ─ Open World Drive ──────────────────────────────────
// Modular architecture, delta-time game loop, merged geometry world,
// NPC traffic, weather, monster, audio, drift, camera modes, minimap.
import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

import {
  CAR_ACCEL, CAR_BRAKE, CAR_FRICTION, CAR_MAX_SPEED, CAR_REVERSE_MAX,
  STEER_SPEED, CAM_BASE_DIST, CAM_BASE_HEIGHT, CAM_SMOOTH,
  WORLD_BOUND, SPEED_MULT, SHADOW_CAM_SIZE,
  DRIFT_STEER_MULT, DRIFT_FRICTION,
} from './constants.js';

import { buildCar } from './Car.js';
import { buildWorld } from './World.js';
import { createNPCs, updateNPCs, checkNPCCollision } from './NPCSystem.js';
import {
  createRainSystem, updateRain,
  createDustSystem, updateDust,
  createClouds, updateClouds,
} from './Effects.js';
import { createMonster, updateMonster } from './Monster.js';
import { createAudio } from './AudioSystem.js';
import { HUD, HitFlash, Minimap, drawMinimap, LoadingScreen } from './HUD.jsx';

export default function OpenWorldDrive() {
  const mountRef   = useRef(null);
  const minimapRef = useRef(null);
  const touchRef   = useRef({ gas: false, brake: false, left: false, right: false, drift: false });
  const nightRef   = useRef(false);
  const rainRef    = useRef(false);

  const [speed, setSpeed]             = useState(0);
  const [nightMode, setNightMode]     = useState(false);
  const [raining, setRaining]         = useState(false);
  const [loading, setLoading]         = useState(true);
  const [cameraMode, setCameraMode]   = useState(0);
  const [drifting, setDrifting]       = useState(false);
  const [monsterDist, setMonsterDist] = useState(9999);
  const [hitFlash, setHitFlash]       = useState(0);
  const [muted, setMuted]             = useState(false);
  const [musicOn, setMusicOn]         = useState(false);

  const lastSpeedRef   = useRef(-1);
  const cameraModeRef  = useRef(0);
  const hitCooldownRef = useRef(0);

  const toggleNight  = useCallback(() => setNightMode(n => !n), []);
  const toggleRain   = useCallback(() => setRaining(r => !r),   []);
  const toggleCamera = useCallback(() => {
    setCameraMode(m => { const next = (m + 1) % 3; cameraModeRef.current = next; return next; });
  }, []);

  useEffect(() => { nightRef.current = nightMode; }, [nightMode]);
  useEffect(() => { rainRef.current  = raining;  }, [raining]);

  const audioRef = useRef(null);
  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.init();
      audioRef.current.resume();
      const m = audioRef.current.toggleMute();
      setMuted(m);
    }
  }, []);
  const toggleMusic = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.init();
      audioRef.current.resume();
      const m = audioRef.current.toggleMusic();
      setMusicOn(m);
    }
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const w = container.clientWidth, h = container.clientHeight;

    // ── Renderer ──────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
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

    // ── Build world ───────────────────────────────────────────
    const worldData = buildWorld(scene);
    const { buildings, trees, lamps, trafficLightMats, roadMat } = worldData;

    // ── Build car ─────────────────────────────────────────────
    const car = buildCar(scene);

    // ── NPCs ──────────────────────────────────────────────────
    const npcs = createNPCs(scene);

    // ── Effects ───────────────────────────────────────────────
    const rainSys  = createRainSystem(scene);
    const dustSys  = createDustSystem(scene);
    const cloudSys = createClouds(scene);

    // ── Monster ───────────────────────────────────────────────
    const monster = createMonster(scene);

    // ── Audio ─────────────────────────────────────────────────
    const audio = createAudio();
    audioRef.current = audio;

    const startAudio = () => {
      audio.init();
      audio.resume();
      window.removeEventListener('click', startAudio);
      window.removeEventListener('keydown', startAudio);
      window.removeEventListener('touchstart', startAudio);
    };
    window.addEventListener('click', startAudio);
    window.addEventListener('keydown', startAudio);
    window.addEventListener('touchstart', startAudio);

    // ── Physics state ─────────────────────────────────────────
    const st = {
      speed: 0, angle: 0, keys: {}, drifting: false,
      cam: { distance: CAM_BASE_DIST, height: CAM_BASE_HEIGHT, smoothX: 0, smoothZ: -CAM_BASE_DIST },
    };

    // ── Keyboard ──────────────────────────────────────────────
    const onKeyDown = (e) => {
      st.keys[e.code] = true;
      if (e.code === 'KeyC') {
        cameraModeRef.current = (cameraModeRef.current + 1) % 3;
        setCameraMode(cameraModeRef.current);
      }
    };
    const onKeyUp = (e) => { st.keys[e.code] = false; };
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

    let tlClock = 0;
    let hitFlashVal = 0;
    const clock = new THREE.Clock();
    let animId;

    setLoading(false);

    // ═══════════════════════════════════════════════════════════
    // GAME LOOP
    // ═══════════════════════════════════════════════════════════
    const animate = () => {
      animId = requestAnimationFrame(animate);

      const rawDelta = clock.getDelta();
      const dt  = Math.min(rawDelta * 60, 3);
      const sec = rawDelta;

      const tc = touchRef.current;
      const k  = st.keys;

      // ── Input ────────────────────────────────────────────────
      const accel    = k['ArrowUp']    || k['KeyW'] || tc.gas;
      const brake    = k['ArrowDown']  || k['KeyS'] || tc.brake;
      const left     = k['ArrowLeft']  || k['KeyA'] || tc.left;
      const right    = k['ArrowRight'] || k['KeyD'] || tc.right;
      const driftKey = k['Space'] || tc.drift;

      // ── Drift ────────────────────────────────────────────────
      const isDrifting = driftKey && Math.abs(st.speed) > 0.3;
      if (isDrifting !== st.drifting) {
        st.drifting = isDrifting;
        setDrifting(isDrifting);
      }

      // ── Car physics ──────────────────────────────────────────
      if (accel) st.speed = Math.min(st.speed + CAR_ACCEL * dt, CAR_MAX_SPEED);
      else if (brake) st.speed = Math.max(st.speed - CAR_BRAKE * dt, CAR_REVERSE_MAX);
      else {
        const fric = isDrifting ? DRIFT_FRICTION : CAR_FRICTION;
        if (st.speed > 0) st.speed = Math.max(0, st.speed - fric * dt);
        else if (st.speed < 0) st.speed = Math.min(0, st.speed + fric * dt);
      }

      if (isDrifting) st.speed *= (1 - 0.02 * dt);

      const sf = Math.min(Math.abs(st.speed) / 1.0, 1);
      const steerMult = isDrifting ? DRIFT_STEER_MULT : 1;
      if (left)  st.angle += STEER_SPEED * steerMult * sf * (st.speed >= 0 ? 1 : -1) * dt;
      if (right) st.angle -= STEER_SPEED * steerMult * sf * (st.speed >= 0 ? 1 : -1) * dt;

      let nx = car.position.x + Math.sin(st.angle) * st.speed * dt;
      let nz = car.position.z + Math.cos(st.angle) * st.speed * dt;

      // ── Collisions ───────────────────────────────────────────
      let collided = false;
      for (const b of buildings) {
        if (Math.abs(nx - b.x) < b.hw && Math.abs(nz - b.z) < b.hd) {
          collided = true; break;
        }
      }
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
      if (!collided && checkNPCCollision(npcs, nx, nz)) collided = true;

      if (collided) {
        st.speed *= -0.3;
        nx = car.position.x;
        nz = car.position.z;
        audio.playCrash();
      }

      // ── Position ─────────────────────────────────────────────
      car.position.x = Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, nx));
      car.position.z = Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, nz));
      car.rotation.y = st.angle;

      const leanTarget = isDrifting
        ? (left ? 0.06 : right ? -0.06 : 0)
        : (left ? 0.03 : right ? -0.03 : 0);
      car.rotation.z += (leanTarget - car.rotation.z) * 0.08 * dt;

      // ── Headlight ────────────────────────────────────────────
      headlight.position.set(
        car.position.x + Math.sin(st.angle) * 3, 2.5,
        car.position.z + Math.cos(st.angle) * 3);
      headlight.target.position.set(
        car.position.x + Math.sin(st.angle) * 20, 0,
        car.position.z + Math.cos(st.angle) * 20);

      // ── Camera ───────────────────────────────────────────────
      const cm = cameraModeRef.current;
      if (cm === 0) {
        const cd = st.cam.distance + Math.abs(st.speed) * 3;
        st.cam.smoothX += (car.position.x - Math.sin(st.angle) * cd - st.cam.smoothX) * CAM_SMOOTH * dt;
        st.cam.smoothZ += (car.position.z - Math.cos(st.angle) * cd - st.cam.smoothZ) * CAM_SMOOTH * dt;
        camera.position.set(st.cam.smoothX, st.cam.height + Math.abs(st.speed) * 2, st.cam.smoothZ);
        camera.lookAt(car.position.x, 1.5, car.position.z);
      } else if (cm === 1) {
        camera.position.set(car.position.x, 80, car.position.z + 0.01);
        camera.lookAt(car.position.x, 0, car.position.z);
      } else {
        const cx = car.position.x + Math.sin(st.angle) * 0.5;
        const cz = car.position.z + Math.cos(st.angle) * 0.5;
        camera.position.set(cx, 2.2, cz);
        camera.lookAt(
          car.position.x + Math.sin(st.angle) * 20,
          1.8,
          car.position.z + Math.cos(st.angle) * 20);
      }

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

      // ── Wet road ─────────────────────────────────────────────
      if (rainRef.current) {
        roadMat.roughness = 0.15;
        roadMat.metalness = 0.6;
      } else {
        roadMat.roughness = 0.7;
        roadMat.metalness = 0;
      }

      // ── Traffic lights ───────────────────────────────────────
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

      // ── Monster ──────────────────────────────────────────────
      const monResult = updateMonster(monster, dt, car.position, isNight);
      setMonsterDist(Math.round(monResult.dist));

      if (hitCooldownRef.current > 0) hitCooldownRef.current -= sec;
      if (monResult.isClose && hitCooldownRef.current <= 0) {
        st.speed *= -0.5;
        hitFlashVal = 0.6;
        hitCooldownRef.current = 2;
      }
      if (hitFlashVal > 0) {
        hitFlashVal = Math.max(0, hitFlashVal - sec * 1.5);
        setHitFlash(hitFlashVal);
      }

      // ── Effects ──────────────────────────────────────────────
      updateRain(rainSys, sec, car.position, rainRef.current && !isNight);
      updateDust(dustSys, sec, car.position, st.angle, st.speed * (isDrifting ? 2 : 1));
      updateClouds(cloudSys, sec, isNight, rainRef.current);

      // ── Audio ────────────────────────────────────────────────
      audio.update(st.speed, isNight, rainRef.current, monResult.dist);

      // ── HUD speed ────────────────────────────────────────────
      const displaySpeed = Math.abs(Math.round(st.speed * SPEED_MULT));
      if (displaySpeed !== lastSpeedRef.current) {
        lastSpeedRef.current = displaySpeed;
        setSpeed(displaySpeed);
      }

      // ── Minimap ──────────────────────────────────────────────
      if (minimapRef.current) {
        const ctx = minimapRef.current.getContext('2d');
        if (ctx) drawMinimap(ctx, car.position, st.angle, npcs, monster.mesh.position, isNight);
      }

      // ── Render ───────────────────────────────────────────────
      renderer.render(scene, camera);
    };

    animate();

    // ═══════════════════════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════════════════════
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
      window.removeEventListener('resize',  onResize);
      window.removeEventListener('click', startAudio);
      window.removeEventListener('keydown', startAudio);
      window.removeEventListener('touchstart', startAudio);

      audio.dispose();

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
      <HitFlash intensity={hitFlash} />
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      <Minimap canvasRef={minimapRef} />
      <HUD
        speed={speed}
        nightMode={nightMode}
        raining={raining}
        onToggleNight={toggleNight}
        onToggleRain={toggleRain}
        onToggleCamera={toggleCamera}
        onToggleMute={toggleMute}
        onToggleMusic={toggleMusic}
        touchRef={touchRef}
        drifting={drifting}
        monsterDist={monsterDist}
        muted={muted}
        musicOn={musicOn}
        cameraMode={cameraMode}
      />
    </div>
  );
}
