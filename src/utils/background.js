/**
 * src/utils/background.js
 *
 * Layers (bottom → top):
 *   0. Static noise texture  (CSS, always on)
 *   1. Aurora blobs          (canvas, slow drift)
 *   2. Shooting stars        (canvas, occasional streaks)
 *   3. Particle constellation (canvas, mouse-interactive)
 *   4. Subtle grid           (canvas, scrolling)
 */

export function initBackground() {
  const canvas = document.createElement('canvas');
  canvas.id = 'bg-canvas';
  Object.assign(canvas.style, {
    position: 'fixed', inset: '0',
    width: '100%', height: '100%',
    zIndex: '0', pointerEvents: 'none',
  });
  document.getElementById('__root__').prepend(canvas);
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, dpr = 1;
  let active = true;
  let mouse = { x: -9999, y: -9999, px: -9999, py: -9999 };

  // ── Resize ──────────────────────────────────────────────
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initParticles();
  }
  window.addEventListener('resize', resize, { passive: true });

  // ── Helpers ─────────────────────────────────────────────
  function isDark() {
    return document.documentElement.getAttribute('data-theme') !== 'light';
  }

  function getAccent() {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--accent').trim() || '#C6F135';
    return raw;
  }

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const full = h.length === 3
      ? h.split('').map(c => c + c).join('')
      : h;
    return {
      r: parseInt(full.slice(0,2), 16),
      g: parseInt(full.slice(2,4), 16),
      b: parseInt(full.slice(4,6), 16),
    };
  }

  // Luminance check so we boost alpha when accent is close to bg
  function relativeLuminance({ r, g, b }) {
    const toLinear = c => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }

  function getAlphaMultiplier(accent) {
    const rgb  = hexToRgb(accent);
    const lum  = relativeLuminance(rgb);
    const dark = isDark();
    // On dark bg (lum ~0), bright accent (lum high) = visible → mult 1
    // On light bg (lum ~1), dark accent (lum low) = visible → mult 1
    // Problematic: same-ish luminance → boost alpha
    const bgLum = dark ? 0.03 : 0.93;
    const contrast = Math.abs(lum - bgLum);
    // contrast 0 = same color, 1 = max contrast
    // when contrast < 0.2 we're in trouble
    return contrast < 0.15 ? 3.5 : contrast < 0.3 ? 2.0 : 1.0;
  }

  // ── Aurora blobs ────────────────────────────────────────
  class AuroraBlob {
    constructor(ox, oy, r, speed, phase) {
      this.ox = ox; this.oy = oy; this.r = r;
      this.speed = speed; this.phase = phase;
    }
    draw(t, accent, alphaMult) {
      const dark = isDark();
      const { r, g, b } = hexToRgb(accent);
      const base = dark
        ? 0.055 * alphaMult
        : 0.10  * alphaMult;

      const drift = Math.sin(t * this.speed + this.phase);
      const cx = (this.ox + drift * 0.14) * W;
      const cy = (this.oy + Math.cos(t * this.speed * 0.7 + this.phase) * 0.12) * H;
      const radius = this.r * Math.max(W, H);

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0,    `rgba(${r},${g},${b},${base})`);
      grad.addColorStop(0.45, `rgba(${r},${g},${b},${base * 0.35})`);
      grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }
  }

  const blobs = [
    new AuroraBlob(0.78, -0.1,  0.60, 0.00013, 0.0),
    new AuroraBlob(-0.1, 0.80,  0.45, 0.00010, 2.1),
    new AuroraBlob(0.45, 0.55,  0.35, 0.00017, 4.3),
    new AuroraBlob(0.20, 0.10,  0.28, 0.00008, 1.6),
  ];

  // ── Shooting stars ──────────────────────────────────────
  class ShootingStar {
    constructor() { this.reset(); }
    reset() {
      this.x    = Math.random() * W * 1.2 - W * 0.1;
      this.y    = Math.random() * H * 0.4;
      this.len  = Math.random() * 120 + 60;
      this.spd  = Math.random() * 6 + 5;
      this.ang  = (Math.PI / 180) * (Math.random() * 20 + 20); // 20–40°
      this.life = 0;
      this.maxLife = Math.random() * 40 + 30;
      this.waiting = Math.random() * 400 + 200; // frames before next
    }
    update() {
      if (this.waiting > 0) { this.waiting--; return; }
      this.x   += Math.cos(this.ang) * this.spd;
      this.y   += Math.sin(this.ang) * this.spd;
      this.life++;
      if (this.life >= this.maxLife) this.reset();
    }
    draw(accent, alphaMult) {
      if (this.waiting > 0) return;
      const dark = isDark();
      const { r, g, b } = hexToRgb(accent);
      const progress = this.life / this.maxLife;
      const alpha = Math.sin(progress * Math.PI) * (dark ? 0.7 : 0.5) * alphaMult;
      if (alpha <= 0) return;

      const tailX = this.x - Math.cos(this.ang) * this.len;
      const tailY = this.y - Math.sin(this.ang) * this.len;

      const grad = ctx.createLinearGradient(tailX, tailY, this.x, this.y);
      grad.addColorStop(0,   `rgba(${r},${g},${b},0)`);
      grad.addColorStop(0.6, `rgba(${r},${g},${b},${alpha * 0.4})`);
      grad.addColorStop(1,   `rgba(${r},${g},${b},${alpha})`);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(this.x, this.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Head glow
      ctx.beginPath();
      ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.fill();
      ctx.restore();
    }
  }

  const stars = Array.from({ length: 5 }, () => new ShootingStar());

  // ── Scrolling grid ──────────────────────────────────────
  function drawGrid(t) {
    const dark  = isDark();
    const alpha = dark ? 0.03 : 0.05;
    const COLS  = 28;
    const cellW = W / COLS;
    const offset = (t * 0.016) % cellW;
    const ROWS  = Math.ceil(H / cellW);

    ctx.save();
    ctx.strokeStyle = dark
      ? `rgba(255,255,255,${alpha})`
      : `rgba(0,0,0,${alpha})`;
    ctx.lineWidth = 0.5;

    for (let x = -offset; x <= W + cellW; x += cellW) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let row = 0; row <= ROWS + 1; row++) {
      const y = row * cellW;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();
  }

  // ── Particles ───────────────────────────────────────────
  let particles = [];
  const CONNECT = 140;
  const REPEL   = 120;

  function initParticles() {
    const count = Math.min(Math.floor((W * H) / 10000), 120);
    particles = Array.from({ length: count }, () => {
      const vx = (Math.random() - 0.5) * 0.35;
      const vy = (Math.random() - 0.5) * 0.35;
      return { x: Math.random() * W, y: Math.random() * H, vx, vy, bvx: vx, bvy: vy, r: Math.random() * 1.6 + 0.7 };
    });
  }

  function drawParticles(accent, alphaMult) {
    const { r, g, b } = hexToRgb(accent);
    const dark     = isDark();
    const dotBase  = (dark ? 0.55 : 0.50) * alphaMult;
    const lineBase = (dark ? 0.20 : 0.18) * alphaMult;

    // Update
    particles.forEach(p => {
      const dx   = p.x - mouse.x;
      const dy   = p.y - mouse.y;
      const dist = Math.hypot(dx, dy);
      if (dist < REPEL && dist > 0) {
        const f = (1 - dist / REPEL) * 0.7;
        p.vx += (dx / dist) * f;
        p.vy += (dy / dist) * f;
      }
      p.vx = p.vx * 0.97 + p.bvx * 0.03;
      p.vy = p.vy * 0.97 + p.bvy * 0.03;
      const spd = Math.hypot(p.vx, p.vy);
      if (spd > 4) { p.vx = (p.vx / spd) * 4; p.vy = (p.vy / spd) * 4; }
      p.x += p.vx; p.y += p.vy;
      if (p.x < -10) p.x = W + 10;
      if (p.x > W+10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      if (p.y > H+10) p.y = -10;
    });

    // Lines
    ctx.save();
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx   = particles[i].x - particles[j].x;
        const dy   = particles[i].y - particles[j].y;
        const dist = Math.hypot(dx, dy);
        if (dist < CONNECT) {
          const a = (1 - dist / CONNECT) * lineBase;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    // Dots + near-mouse glow
    particles.forEach(p => {
      const dist  = Math.hypot(p.x - mouse.x, p.y - mouse.y);
      const boost = dist < REPEL ? (1 - dist / REPEL) * 0.5 : 0;
      const alpha = Math.min(dotBase + boost, 1);

      if (dist < REPEL) {
        // Glow ring on close particles
        const gGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, REPEL * 0.3);
        gGrad.addColorStop(0, `rgba(${r},${g},${b},${0.08 * alphaMult})`);
        gGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = gGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, REPEL * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.fill();
    });
  }

  // ── Mouse cursor ripple ─────────────────────────────────
  let ripples = [];

  function spawnRipple() {
    if (mouse.x < 0 || mouse.x > W) return;
    const dx = mouse.x - mouse.px;
    const dy = mouse.y - mouse.py;
    if (Math.hypot(dx, dy) > 8) {
      ripples.push({ x: mouse.x, y: mouse.y, r: 0, maxR: 60, life: 1 });
    }
    mouse.px = mouse.x; mouse.py = mouse.y;
  }

  function drawRipples(accent, alphaMult) {
    const { r, g, b } = hexToRgb(accent);
    const dark = isDark();
    ripples = ripples.filter(rp => rp.life > 0);
    ripples.forEach(rp => {
      rp.r    += (rp.maxR - rp.r) * 0.08;
      rp.life -= 0.025;
      const a = rp.life * (dark ? 0.18 : 0.14) * alphaMult;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }

  // ── Main loop ───────────────────────────────────────────
  function draw(t) {
    if (!active) return;
    requestAnimationFrame(draw);

    ctx.clearRect(0, 0, W, H);

    const accent = getAccent();
    const mult   = getAlphaMultiplier(accent);

    drawGrid(t);

    blobs.forEach(b => b.draw(t, accent, mult));

    stars.forEach(s => { s.update(); s.draw(accent, mult); });

    spawnRipple();
    drawRipples(accent, mult);

    drawParticles(accent, mult);
  }

  // ── Mouse ────────────────────────────────────────────────
  const onMove = e => { mouse.x = e.clientX; mouse.y = e.clientY; };
  const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };
  window.addEventListener('mousemove',  onMove,  { passive: true });
  window.addEventListener('mouseleave', onLeave, { passive: true });
  window.addEventListener('touchmove', e => {
    if (e.touches[0]) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; }
  }, { passive: true });

  // ── Boot ────────────────────────────────────────────────
  resize();
  requestAnimationFrame(draw);

  return function cleanup() {
    active = false;
    window.removeEventListener('resize',     resize);
    window.removeEventListener('mousemove',  onMove);
    window.removeEventListener('mouseleave', onLeave);
    canvas.remove();
  };
}
