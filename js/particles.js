/**
 * NZ Agency — particles.js
 * Canvas particules flottantes connectées (style réseau tech)
 */

(function () {
  'use strict';

  const canvas = document.getElementById('particlesCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // Config
  const CONFIG = {
    particleCount: 40,
    maxDistance:   110,
    particleSize:  { min: 0.8, max: 1.8 },
    speed:         { min: 0.06, max: 0.22 },
    colors: ['#ffffff', '#d4d4d4', '#a3a3a3'],
    opacity: {
      particle: 0.25,
      line:      0.05,
    },
    mouse: {
      radius: 130,
      repelStrength: 0.8,
    },
  };

  let particles = [];
  let animationId;
  let mouse = { x: null, y: null };
  let W, H;

  /* ---- Resize ---- */
  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  /* ---- Particle class ---- */
  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x  = Math.random() * W;
      this.y  = initial ? Math.random() * H : (Math.random() < 0.5 ? -10 : H + 10);
      this.vx = (Math.random() - 0.5) * 2 * (CONFIG.speed.min + Math.random() * (CONFIG.speed.max - CONFIG.speed.min));
      this.vy = (Math.random() - 0.5) * 2 * (CONFIG.speed.min + Math.random() * (CONFIG.speed.max - CONFIG.speed.min));
      this.r  = CONFIG.particleSize.min + Math.random() * (CONFIG.particleSize.max - CONFIG.particleSize.min);
      this.color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
      this.opacity = 0.3 + Math.random() * 0.5;
      this.life    = 0;
      this.maxLife = 200 + Math.random() * 600;
    }

    update() {
      this.life++;

      // Mouse repulsion
      if (mouse.x !== null) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONFIG.mouse.radius && dist > 0) {
          const force = (CONFIG.mouse.radius - dist) / CONFIG.mouse.radius;
          this.vx += (dx / dist) * force * CONFIG.mouse.repelStrength * 0.05;
          this.vy += (dy / dist) * force * CONFIG.mouse.repelStrength * 0.05;
        }
      }

      // Dampen velocity to prevent runaway
      this.vx *= 0.999;
      this.vy *= 0.999;

      // Clamp speed
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      const maxSpeed = CONFIG.speed.max * 2;
      if (speed > maxSpeed) {
        this.vx = (this.vx / speed) * maxSpeed;
        this.vy = (this.vy / speed) * maxSpeed;
      }

      this.x += this.vx;
      this.y += this.vy;

      // Wrap around edges
      if (this.x < -20)    this.x = W + 20;
      if (this.x > W + 20) this.x = -20;
      if (this.y < -20)    this.y = H + 20;
      if (this.y > H + 20) this.y = -20;
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.fillStyle   = this.color;
      ctx.shadowBlur  = 8;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /* ---- Init ---- */
  function init() {
    particles = [];
    for (let i = 0; i < CONFIG.particleCount; i++) {
      particles.push(new Particle());
    }
  }

  /* ---- Draw connections ---- */
  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONFIG.maxDistance) {
          const alpha = (1 - dist / CONFIG.maxDistance) * CONFIG.opacity.line;

          ctx.save();
          ctx.globalAlpha = alpha;

          const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
          gradient.addColorStop(0, p1.color);
          gradient.addColorStop(1, p2.color);

          ctx.strokeStyle = gradient;
          ctx.lineWidth   = 0.5;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  /* ---- Animate ---- */
  function animate() {
    ctx.clearRect(0, 0, W, H);

    drawConnections();

    for (const p of particles) {
      p.update();
      p.draw();
    }

    animationId = requestAnimationFrame(animate);
  }

  /* ---- Mouse tracking ---- */
  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }

  function onMouseLeave() {
    mouse.x = null;
    mouse.y = null;
  }

  /* ---- Visibility API — pause when tab hidden ---- */
  function onVisibilityChange() {
    if (document.hidden) {
      cancelAnimationFrame(animationId);
    } else {
      animate();
    }
  }

  /* ---- Throttled resize ---- */
  let resizeTimer;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      init();
    }, 200);
  }

  /* ---- Start ---- */
  resize();
  init();
  animate();

  window.addEventListener('resize',   onResize, { passive: true });
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  canvas.addEventListener('mouseleave', onMouseLeave, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);

})();
