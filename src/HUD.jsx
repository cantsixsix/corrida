// ── HUD Components: speedometer, controls, minimap, loading ────
import { ROAD_DEFS, WORLD_SIZE } from './constants.js';

// ─── Button style (shared) ──────────────────────────────────────
const btnStyle = {
  width: 56, height: 56, borderRadius: 12,
  border: '2px solid rgba(255,255,255,0.3)',
  background: 'rgba(255,255,255,0.15)',
  color: '#fff', fontSize: '1.4rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none',
};

const smallBtn = {
  padding: '6px 14px', fontSize: '0.8rem',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, letterSpacing: 1,
};

// ─── Main HUD ───────────────────────────────────────────────────
export function HUD({
  speed, nightMode, raining,
  onToggleNight, onToggleRain, onToggleCamera, onToggleMute, onToggleMusic,
  touchRef, drifting, monsterDist, muted, cameraMode, musicOn,
}) {
  const t = (key, val) => (e) => {
    if (e) e.preventDefault();
    touchRef.current[key] = val;
  };

  const camLabels = ['🎥 3ª PESSOA', '🔭 AÉREA', '🏎️ COCKPIT'];

  return (
    <>
      {/* ── Feito por EDEN ── */}
      <div style={{
        position: 'absolute', top: 12, left: 16,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: '#fff', fontSize: '0.85rem', fontWeight: 700,
        letterSpacing: 2, textTransform: 'uppercase',
        opacity: 0.6, textShadow: '0 2px 8px rgba(0,0,0,0.7)',
        userSelect: 'none', pointerEvents: 'none',
      }}>
        Feito por EDEN
      </div>

      {/* ── Monster distance indicator (night only) ── */}
      {nightMode && monsterDist < 500 && (
        <div style={{
          position: 'absolute', top: 50, left: '50%', transform: 'translateX(-50%)',
          padding: '6px 18px', borderRadius: 10,
          background: monsterDist < 30 ? 'rgba(200,0,0,0.7)' : 'rgba(0,0,0,0.6)',
          fontFamily: "'Segoe UI', system-ui, sans-serif", color: '#fff',
          fontSize: '0.9rem', fontWeight: 700, backdropFilter: 'blur(6px)',
          animation: monsterDist < 50 ? 'monster-pulse 0.5s ease-in-out infinite' : 'none',
        }}>
          👹 {Math.round(monsterDist)}m
        </div>
      )}

      {/* ── Drift indicator ── */}
      {drifting && (
        <div style={{
          position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
          padding: '4px 14px', borderRadius: 8,
          background: 'rgba(255,100,0,0.7)', color: '#fff',
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          fontSize: '0.85rem', fontWeight: 800, letterSpacing: 2,
          animation: 'drift-flash 0.3s ease-in-out infinite',
        }}>
          🔥 DRIFT
        </div>
      )}

      {/* ── Speedometer bar ── */}
      <div style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
        background: 'rgba(0,0,0,0.65)', borderRadius: 16, backdropFilter: 'blur(10px)',
        fontFamily: "'Segoe UI', system-ui, sans-serif", color: '#fff',
        flexWrap: 'wrap', justifyContent: 'center',
      }}>
        <div style={{ fontSize: '2rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums', minWidth: 80, textAlign: 'right' }}>
          {speed}
        </div>
        <div style={{ fontSize: '0.75rem', opacity: 0.6, letterSpacing: 1 }}>KM/H</div>
        <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.2)', margin: '0 2px' }} />

        <button onClick={onToggleNight} style={{
          ...smallBtn,
          background: nightMode ? '#f1faee' : '#2b2d42',
          color: nightMode ? '#2b2d42' : '#f1faee',
        }}>{nightMode ? '☀️ DIA' : '🌙 NOITE'}</button>

        <button onClick={onToggleRain} style={{
          ...smallBtn,
          background: raining ? '#4fc3f7' : '#37474f', color: '#fff',
        }}>{raining ? '🌧️ CHUVA' : '☁️ LIMPO'}</button>

        <button onClick={onToggleCamera} style={{
          ...smallBtn, background: '#555', color: '#fff',
        }}>{camLabels[cameraMode] || '🎥 CAM'}</button>

        <button onClick={onToggleMute} style={{
          ...smallBtn, background: muted ? '#c1121f' : '#2e7d32', color: '#fff',
        }}>{muted ? '🔇' : '🔊'}</button>

        <button onClick={onToggleMusic} style={{
          ...smallBtn, background: musicOn ? '#6a1b9a' : '#37474f', color: '#fff',
        }}>{musicOn ? '🎵 MÚSICA' : '🎵 OFF'}</button>
      </div>

      {/* ── Keyboard legend ── */}
      <div style={{
        position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
        padding: '8px 20px', background: 'rgba(0,0,0,0.5)', borderRadius: 10,
        fontFamily: "'Segoe UI', system-ui, sans-serif", color: '#fff',
        fontSize: '0.75rem', opacity: 0.7, backdropFilter: 'blur(6px)', whiteSpace: 'nowrap',
      }}>
        <b>W/↑</b> Acelerar &nbsp; <b>S/↓</b> Frear &nbsp;
        <b>A/←</b> Esq &nbsp; <b>D/→</b> Dir &nbsp;
        <b>SPACE</b> Drift &nbsp; <b>C</b> Câmera
      </div>

      {/* ── Touch: steering (left side) ── */}
      <div style={{ position: 'absolute', bottom: 90, left: 20, display: 'flex', gap: 8, userSelect: 'none' }}>
        <button style={btnStyle}
          onTouchStart={t('left', true)}  onTouchEnd={t('left', false)}  onTouchCancel={t('left', false)}
          onMouseDown={t('left', true)}   onMouseUp={t('left', false)}   onMouseLeave={t('left', false)}
        >◀</button>
        <button style={btnStyle}
          onTouchStart={t('right', true)} onTouchEnd={t('right', false)} onTouchCancel={t('right', false)}
          onMouseDown={t('right', true)}  onMouseUp={t('right', false)}  onMouseLeave={t('right', false)}
        >▶</button>
      </div>

      {/* ── Touch: gas / brake / drift (right side) ── */}
      <div style={{ position: 'absolute', bottom: 90, right: 20, display: 'flex', gap: 8, userSelect: 'none' }}>
        <button style={btnStyle}
          onTouchStart={t('gas', true)}   onTouchEnd={t('gas', false)}   onTouchCancel={t('gas', false)}
          onMouseDown={t('gas', true)}    onMouseUp={t('gas', false)}    onMouseLeave={t('gas', false)}
        >▲</button>
        <button style={{ ...btnStyle, background: 'rgba(255,100,0,0.3)' }}
          onTouchStart={t('drift', true)} onTouchEnd={t('drift', false)} onTouchCancel={t('drift', false)}
          onMouseDown={t('drift', true)}  onMouseUp={t('drift', false)}  onMouseLeave={t('drift', false)}
        >🅿️</button>
        <button style={btnStyle}
          onTouchStart={t('brake', true)} onTouchEnd={t('brake', false)} onTouchCancel={t('brake', false)}
          onMouseDown={t('brake', true)}  onMouseUp={t('brake', false)}  onMouseLeave={t('brake', false)}
        >▼</button>
      </div>

      {/* ── Animations ── */}
      <style>{`
        @keyframes monster-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes drift-flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  );
}

// ─── Monster hit flash overlay ──────────────────────────────────
export function HitFlash({ intensity }) {
  if (intensity <= 0) return null;
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: `rgba(200, 0, 0, ${Math.min(intensity, 0.6)})`,
      pointerEvents: 'none', zIndex: 50,
      transition: 'background 0.15s',
    }} />
  );
}

// ─── Minimap (canvas element) ───────────────────────────────────
export function Minimap({ canvasRef }) {
  return (
    <canvas ref={canvasRef} width={180} height={180} style={{
      position: 'absolute', top: 16, right: 16, borderRadius: 12,
      border: '2px solid rgba(255,255,255,0.3)',
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
    }} />
  );
}

// draw function called from the game loop (imperative, not React)
export function drawMinimap(ctx, carPos, carAngle, npcs, monsterPos, isNight) {
  const S = 180;
  const scale = S / WORLD_SIZE;
  const cx = S / 2, cy = S / 2;

  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = '#1a2a1a';
  ctx.fillRect(0, 0, S, S);

  // roads
  ctx.fillStyle = '#555';
  ROAD_DEFS.forEach(r => {
    ctx.fillRect(
      cx + (r.x - r.w / 2) * scale,
      cy + (r.z - r.d / 2) * scale,
      Math.max(r.w * scale, 1),
      Math.max(r.d * scale, 1),
    );
  });

  // NPCs
  ctx.fillStyle = '#ff0';
  npcs.forEach(n => {
    ctx.beginPath();
    ctx.arc(cx + n.mesh.position.x * scale, cy + n.mesh.position.z * scale, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // Monster (night only)
  if (isNight && monsterPos) {
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(cx + monsterPos.x * scale, cy + monsterPos.z * scale, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx + monsterPos.x * scale, cy + monsterPos.z * scale, 7, 0, Math.PI * 2);
    ctx.stroke();
  }

  // player
  ctx.save();
  ctx.translate(cx + carPos.x * scale, cy + carPos.z * scale);
  ctx.rotate(-carAngle);
  ctx.fillStyle = '#ff3333';
  ctx.fillRect(-2, -3, 4, 6);
  ctx.restore();
}

// ─── Loading screen ─────────────────────────────────────────────
export function LoadingScreen() {
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#111',
      fontFamily: "'Segoe UI', system-ui, sans-serif", color: '#fff', zIndex: 100,
    }}>
      <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 20 }}>
        🏎️ Carregando Cidade…
      </div>
      <div style={{ width: 200, height: 4, background: '#333', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          width: '60%', height: '100%', background: '#c1121f', borderRadius: 2,
          animation: 'corridas-load 1.5s ease-in-out infinite',
        }} />
      </div>
      <style>{`
        @keyframes corridas-load {
          0%   { width: 0%;  margin-left: 0; }
          50%  { width: 60%; margin-left: 20%; }
          100% { width: 0%;  margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
