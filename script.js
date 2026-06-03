(function () {
  'use strict';

  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const TAU = Math.PI * 2;

  let W, H;
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  /* ─── State ─── */
  let rockets = [];
  let particles = [];
  let shockwaves = [];
  let glitters = [];
  let autoMode = true;
  let lastAutoTime = 0;
  let autoInterval = 700; // ms between auto rockets
  let hintEl = document.getElementById('hint');
  let hintHidden = false;

  /* ─── Particle ─── */
  class Particle {
    constructor(x, y, dx, dy, life, hue, sat = 100, lit = 60, size = 2, gravity = 0.06, alpha = 1) {
      this.x = x; this.y = y;
      this.dx = dx; this.dy = dy;
      this.life = life; this.maxLife = life;
      this.hue = hue; this.sat = sat; this.lit = lit;
      this.size = size; this.gravity = gravity; this.alpha = alpha;
      this.drag = 0.96;
    }
    update() {
      this.dx *= this.drag;
      this.dy *= this.drag;
      this.x += this.dx;
      this.y += this.dy;
      this.dy += this.gravity;
      this.life--;
    }
    draw() {
      const a = (this.life / this.maxLife) * this.alpha;
      const r = this.size * (0.3 + 0.7 * (this.life / this.maxLife));
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(0.1, r), 0, TAU);
      ctx.fillStyle = `hsla(${this.hue},${this.sat}%,${this.lit}%,${a})`;
      ctx.fill();
    }
  }

  /* ─── Glitter ─── */
  class Glitter {
    constructor(x, y, hue) {
      this.x = x; this.y = y;
      this.dx = (Math.random() - 0.5) * 3;
      this.dy = (Math.random() - 0.5) * 3 - 1;
      this.hue = hue;
      this.life = 50 + Math.random() * 40;
      this.maxLife = this.life;
      this.s = 1 + Math.random() * 2;
      this.rot = Math.random() * TAU;
    }
    update() { this.x += this.dx; this.y += this.dy; this.dy += 0.05; this.life--; this.rot += 0.15; }
    draw() {
      const a = this.life / this.maxLife;
      const s = this.s * a;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.fillStyle = `hsla(${this.hue},100%,88%,${a})`;
      ctx.fillRect(-s, -s, s * 2, s * 2);
      ctx.restore();
    }
  }

  /* ─── Shockwave ─── */
  class Shockwave {
    constructor(x, y, hue) {
      this.x = x; this.y = y;
      this.r = 0; this.life = 35; this.maxLife = 35;
      this.hue = hue;
    }
    update() { this.r += 9; this.life--; }
    draw() {
      const a = (this.life / this.maxLife) * 0.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, TAU);
      ctx.strokeStyle = `hsla(${this.hue},80%,70%,${a})`;
      ctx.lineWidth = 3 * (this.life / this.maxLife);
      ctx.stroke();
    }
  }

  /* ─── Rocket ─── */
  class Rocket {
    constructor(tx, ty, type, hue) {
      this.x = tx !== undefined ? tx : W * 0.15 + Math.random() * W * 0.7;
      this.y = H;
      this.target = ty !== undefined ? ty : H * 0.1 + Math.random() * H * 0.45;
      this.hue = hue !== undefined ? hue : Math.random() * 360;
      this.type = type || 'normal';
      this.trail = [];
      this.speed = 7 + Math.random() * 4;
      const dist = this.y - this.target;
      const frames = dist / this.speed;
      this.vx = tx !== undefined ? 0 : ((Math.random() - 0.5) * 60) / frames;
    }

    update() {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > 12) this.trail.shift();

      this.x += this.vx;
      this.y -= this.speed;

      // Draw trail
      this.trail.forEach((t, i) => {
        const a = i / this.trail.length;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 1.5 * a, 0, TAU);
        ctx.fillStyle = `hsla(${this.hue},100%,70%,${a * 0.6})`;
        ctx.fill();
      });

      // Head glow
      ctx.beginPath();
      ctx.arc(this.x, this.y, 5, 0, TAU);
      ctx.fillStyle = `hsla(${this.hue},100%,70%,0.25)`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(this.x, this.y, 2.5, 0, TAU);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }

    explode() {
      shockwaves.push(new Shockwave(this.x, this.y, this.hue));
      for (let i = 0; i < 14; i++) glitters.push(new Glitter(this.x, this.y, this.hue));

      switch (this.type) {
        case 'normal':        explodeNormal(this.x, this.y, this.hue); break;
        case 'star':          explodeStar(this.x, this.y, this.hue); break;
        case 'ring':          explodeRing(this.x, this.y, this.hue); break;
        case 'heart':         explodeHeart(this.x, this.y, this.hue); break;
        case 'willow':        explodeWillow(this.x, this.y, this.hue); break;
        case 'chrysanthemum': explodeChrysanthemum(this.x, this.y, this.hue); break;
        default:              explodeNormal(this.x, this.y, this.hue);
      }
    }
  }

  /* ─── Explosion Types ─── */
  function explodeNormal(x, y, hue) {
    for (let i = 0; i < 130; i++) {
      const a = Math.random() * TAU;
      const sp = 1 + Math.random() * 5;
      particles.push(new Particle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 70 + Math.random() * 50, hue, 100, 55 + Math.random() * 25));
    }
    for (let i = 0; i < 50; i++) {
      const a = Math.random() * TAU;
      const sp = 0.5 + Math.random() * 2;
      particles.push(new Particle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 90, hue + 30, 100, 80, 1.5, 0.04));
    }
  }

  function explodeStar(x, y, hue) {
    const pts = 8;
    for (let p = 0; p < pts; p++) {
      const base = (p / pts) * TAU;
      for (const sp of [2, 3.5, 5.5]) {
        const j = (Math.random() - 0.5) * 0.12;
        particles.push(new Particle(x, y, Math.cos(base + j) * sp, Math.sin(base + j) * sp, 120 + Math.random() * 30, hue, 100, 65, 2.5, 0.04, 0.9));
        if (sp === 3.5) particles.push(new Particle(x, y, Math.cos(base + j) * sp * 0.55, Math.sin(base + j) * sp * 0.55, 90, hue + 45, 100, 80, 1.5, 0.04));
      }
    }
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * TAU;
      particles.push(new Particle(x, y, Math.cos(a) * Math.random() * 2, Math.sin(a) * Math.random() * 2, 60, hue + 60, 80, 85, 1, 0.03));
    }
  }

  function explodeRing(x, y, hue) {
    const n = 72;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const sp = 3.8 + (Math.random() - 0.5) * 0.4;
      particles.push(new Particle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 100, hue, 100, 65, 2.2, 0.03));
      if (i % 4 === 0) particles.push(new Particle(x, y, Math.cos(a) * sp * 1.35, Math.sin(a) * sp * 1.35, 75, hue + 35, 100, 80, 1.5, 0.035));
    }
  }

  function explodeHeart(x, y, hue) {
    const n = 90;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * TAU;
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      const scale = 0.22 + Math.random() * 0.03;
      particles.push(new Particle(x, y, hx * scale, hy * scale, 110 + Math.random() * 25, hue, 100, 65, 2, 0.02, 0.9));
    }
    for (let i = 0; i < 30; i++) {
      const t = Math.random() * TAU;
      const hx = 16 * Math.pow(Math.sin(t), 3) * 0.16;
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 0.16;
      particles.push(new Particle(x, y, hx, hy, 85, hue + 20, 100, 80, 1.2, 0.02));
    }
  }

  function explodeWillow(x, y, hue) {
    const n = 60;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const sp = 3 + Math.random() * 2.5;
      particles.push(new Particle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 170, hue, 90, 65, 1.8, 0.14, 0.85));
    }
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const sp = 1.5 + Math.random() * 1.5;
      particles.push(new Particle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 130, hue + 40, 80, 75, 1.2, 0.11, 0.7));
    }
  }

  function explodeChrysanthemum(x, y, hue) {
    const layers = [
      { n: 64, sp: 4.5, life: 140 },
      { n: 48, sp: 2.8, life: 170 },
      { n: 24, sp: 1.3, life: 190 }
    ];
    layers.forEach((l, li) => {
      for (let i = 0; i < l.n; i++) {
        const a = (i / l.n) * TAU + li * 0.28;
        const sp = l.sp + Math.random() * 0.5;
        particles.push(new Particle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, l.life, hue + li * 25, 100, 58 + li * 10, 2 - li * 0.25, 0.025, 0.95));
      }
    });
  }

  /* ─── Public spawn helpers (called from HTML) ─── */
  const TYPES = ['normal', 'normal', 'star', 'ring', 'heart', 'willow', 'chrysanthemum'];

  window.spawnType = function (type, tx, ty) {
    rockets.push(new Rocket(tx, ty, type));
  };

  window.spawnMega = function () {
    const cx = W * 0.5;
    const types = ['normal', 'star', 'ring', 'heart', 'chrysanthemum', 'willow'];
    types.forEach((t, i) => {
      setTimeout(() => {
        rockets.push(new Rocket(
          cx + (Math.random() - 0.5) * W * 0.4,
          H * 0.1 + Math.random() * H * 0.3,
          t,
          (i / types.length) * 360
        ));
      }, i * 140);
    });
  };

  window.toggleAuto = function () {
    autoMode = !autoMode;
    const btn = document.getElementById('btn-auto');
    if (btn) {
      btn.textContent = autoMode ? '⏸ AUTO' : '▶ AUTO';
      btn.classList.toggle('active', autoMode);
    }
  };

  /* ─── Click to fire ─── */
  canvas.addEventListener('click', (e) => {
    if (!hintHidden) {
      hintEl.style.opacity = '0';
      hintHidden = true;
    }
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    rockets.push(new Rocket(
      e.clientX + (Math.random() - 0.5) * 40,
      e.clientY + (Math.random() - 0.5) * 40,
      type
    ));
  });

  /* ─── Main loop ─── */
  function animate(ts) {
    // Fade trail
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, W, H);

    // Auto spawn
    if (autoMode && ts - lastAutoTime > autoInterval) {
      lastAutoTime = ts;
      const type = TYPES[Math.floor(Math.random() * TYPES.length)];
      rockets.push(new Rocket(undefined, undefined, type));
      // Occasionally double up
      if (Math.random() < 0.3) {
        setTimeout(() => rockets.push(new Rocket(undefined, undefined, TYPES[Math.floor(Math.random() * TYPES.length)])), 200);
      }
    }

    // Rockets
    rockets = rockets.filter(r => {
      r.update();
      if (r.y <= r.target) {
        r.explode();
        return false;
      }
      return true;
    });

    // Shockwaves
    shockwaves = shockwaves.filter(s => { s.update(); s.draw(); return s.life > 0; });

    // Particles
    particles = particles.filter(p => { p.update(); p.draw(); return p.life > 0; });

    // Glitters
    glitters = glitters.filter(g => { g.update(); g.draw(); return g.life > 0; });

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
})();
