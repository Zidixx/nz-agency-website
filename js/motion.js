/* NZ Agency · motion design : curseur, aimants, textes animés, inclinaisons, scroll. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var clamp = function (v, a, b) { return Math.min(Math.max(v, a), b); };

  var mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, moved: false };
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    mouse.x = e.clientX; mouse.y = e.clientY;
    if (!mouse.moved) document.documentElement.classList.add('cursor-on');
    mouse.moved = true;
  }, { passive: true });

  /* Une seule boucle d'animation pour tous les effets continus. */
  var tasks = [];
  function loop() {
    for (var i = 0; i < tasks.length; i++) tasks[i]();
    requestAnimationFrame(loop);
  }

  /* ---------- Textes découpés en lettres (titres) ---------- */
  function splitText(el) {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = '1';
    var i = 0;
    function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span');
            w.className = 'w';
            Array.prototype.forEach.call(part, function (c) {
              var ch = document.createElement('span');
              ch.className = 'ch';
              ch.style.setProperty('--i', i++);
              ch.textContent = c;
              w.appendChild(ch);
            });
            frag.appendChild(w);
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1 && !child.classList.contains('flame-text')) {
          walk(child);
        } else if (child.nodeType === 1) {
          child.classList.add('ch', 'ch--block');
          child.style.setProperty('--i', i++);
        }
      });
    }
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    walk(el);
    $$('.w, .ch', el).forEach(function (s) { s.setAttribute('aria-hidden', 'true'); });
    el.classList.add('split');
  }

  function initSplit() {
    $$('.hero-title, .head h2.display').forEach(splitText);
    var hero = document.getElementById('hero');
    if (hero) {
      var title = hero.querySelector('.hero-title');
      requestAnimationFrame(function () { requestAnimationFrame(function () { title && title.classList.add('is-in'); }); });
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    $$('.head h2.split').forEach(function (h) { io.observe(h); });
  }

  /* ---------- Texte qui roule au survol (boutons, liens de la navbar) ---------- */
  function initRoll() {
    $$('.btn, .nav-links a').forEach(function (el) {
      if (el.closest('form')) return;
      Array.prototype.slice.call(el.childNodes).forEach(function (n) {
        if (n.nodeType !== 3 || !n.textContent.trim()) return;
        var text = n.textContent.trim();
        var wrap = document.createElement('span');
        wrap.className = 'roll';
        wrap.setAttribute('data-text', text);
        var inner = document.createElement('span');
        inner.textContent = text;
        wrap.appendChild(inner);
        n.parentNode.replaceChild(wrap, n);
      });
    });
  }

  /* ---------- Curseur ---------- */
  function initCursor() {
    var dot = document.createElement('div');
    var ring = document.createElement('div');
    dot.className = 'cursor-dot';
    ring.className = 'cursor-ring';
    dot.setAttribute('aria-hidden', 'true');
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring);
    document.body.appendChild(dot);
    document.documentElement.classList.add('has-cursor');

    var rx = mouse.x, ry = mouse.y;
    tasks.push(function () {
      if (!mouse.moved) return;
      rx = lerp(rx, mouse.x, 0.18);
      ry = lerp(ry, mouse.y, 0.18);
      dot.style.transform = 'translate(' + mouse.x + 'px,' + mouse.y + 'px)';
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
    });

    document.addEventListener('pointerover', function (e) {
      var t = e.target;
      var hot = t.closest && t.closest('a, button, [data-hot], .skill, .phase, .qa-btn, label');
      var text = t.closest && t.closest('input, textarea, select');
      ring.classList.toggle('is-hot', !!hot && !text);
      ring.classList.toggle('is-text', !!text);
      dot.classList.toggle('is-text', !!text);
    });
    document.addEventListener('pointerdown', function () { ring.classList.add('is-down'); });
    document.addEventListener('pointerup', function () { ring.classList.remove('is-down'); });
    document.addEventListener('mouseleave', function () { dot.style.opacity = ring.style.opacity = '0'; });
    document.addEventListener('mouseenter', function () { dot.style.opacity = ring.style.opacity = ''; });
  }

  /* ---------- Aimants : les boutons suivent un peu la souris ---------- */
  function initMagnets() {
    $$('.btn:not(.btn-submit), .nav-links a, .nav-burger').forEach(function (el) {
      var strength = el.classList.contains('btn--lg') ? 0.3 : 0.22;
      el.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + dx * strength + 'px,' + dy * strength * 1.3 + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- Hero : halo qui suit la souris, téléphone incliné en 3D ---------- */
  function initHeroPointer() {
    var hero = document.getElementById('hero');
    if (!hero) return;
    var rocket = hero.querySelector('.rocket');
    var chips = $$('.chip', hero);
    var cx = 0, cy = 0, tx = 0, ty = 0, gx = 50, gy = 40;
    var inside = false;
    hero.addEventListener('pointerenter', function () { inside = true; });
    hero.addEventListener('pointerleave', function () { inside = false; tx = 0; ty = 0; });
    tasks.push(function () {
      var r = hero.getBoundingClientRect();
      if (r.bottom < 0) return;
      if (inside) {
        tx = (mouse.x - r.left) / r.width - 0.5;
        ty = (mouse.y - r.top) / r.height - 0.5;
        gx = lerp(gx, ((mouse.x - r.left) / r.width) * 100, 0.08);
        gy = lerp(gy, ((mouse.y - r.top) / r.height) * 100, 0.08);
      }
      cx = lerp(cx, tx, 0.07);
      cy = lerp(cy, ty, 0.07);
      hero.style.setProperty('--gx', gx.toFixed(2) + '%');
      hero.style.setProperty('--gy', gy.toFixed(2) + '%');
      if (rocket) rocket.style.setProperty('--tilt', 'rotateY(' + (cx * 22).toFixed(2) + 'deg) rotateX(' + (-cy * 16).toFixed(2) + 'deg)');
      chips.forEach(function (c, k) {
        var depth = k === 0 ? 38 : -46;
        c.style.translate = (cx * depth).toFixed(1) + 'px ' + (cy * depth).toFixed(1) + 'px';
      });
    });
  }

  /* ---------- Cartes : inclinaison 3D et reflet sous la souris ---------- */
  function initTilt() {
    $$('.skill, .phase, .day-row, .ask, .info, .book-card').forEach(function (card) {
      card.classList.add('tilt');
      card.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        var max = card.classList.contains('day-row') ? 2 : 5;
        card.style.setProperty('--px', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--py', (py * 100).toFixed(1) + '%');
        card.style.transform = 'perspective(900px) rotateX(' + ((0.5 - py) * max).toFixed(2) + 'deg) rotateY(' + ((px - 0.5) * max).toFixed(2) + 'deg) translateZ(0)';
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });
  }

  /* ---------- Bande défilante : vitesse, sens et inclinaison selon le scroll ---------- */
  function initTicker() {
    var track = document.querySelector('.ticker-track');
    if (!track) return;
    track.style.animation = 'none';
    var x = 0, last = window.scrollY, vel = 0, dir = -1, skew = 0;
    tasks.push(function () {
      var y = window.scrollY;
      var dy = y - last;
      last = y;
      if (dy) dir = dy > 0 ? -1 : 1;
      vel = lerp(vel, Math.abs(dy), 0.1);
      skew = lerp(skew, clamp(dy * 0.35, -10, 10), 0.12);
      var half = track.scrollWidth / 2;
      x += dir * (0.6 + vel * 0.35);
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0) skewX(' + skew.toFixed(2) + 'deg)';
    });
  }

  /* ---------- Parallaxe au scroll ---------- */
  function initParallax() {
    var items = $$('[data-speed]');
    if (!items.length) return;
    tasks.push(function () {
      var vh = window.innerHeight;
      items.forEach(function (el) {
        var r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var center = r.top + r.height / 2 - vh / 2;
        el.style.translate = '0 ' + (center * parseFloat(el.dataset.speed)).toFixed(1) + 'px';
      });
    });
  }

  /* ---------- Grand mot du footer : les lettres ondulent sous la souris ---------- */
  function initFooterWave() {
    var word = document.querySelector('.footer-word');
    if (!word) return;
    var text = word.textContent;
    word.textContent = '';
    var chars = Array.prototype.map.call(text, function (c) {
      var s = document.createElement('span');
      s.textContent = c;
      word.appendChild(s);
      return s;
    });
    tasks.push(function () {
      var r = word.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      chars.forEach(function (s) {
        var b = s.getBoundingClientRect();
        var d = Math.hypot(mouse.x - (b.left + b.width / 2), mouse.y - (b.top + b.height / 2));
        var k = Math.max(0, 1 - d / 260);
        var cur = parseFloat(s.dataset.k || 0);
        var next = lerp(cur, k, 0.15);
        s.dataset.k = next;
        s.style.transform = 'translateY(' + (-next * 34).toFixed(1) + 'px)';
        s.style.webkitTextStroke = next > 0.05 ? '1.5px rgba(255,' + Math.round(106 + next * 80) + ',19,' + (0.3 + next * 0.7).toFixed(2) + ')' : '';
        s.style.color = next > 0.5 ? 'rgba(255,106,19,' + ((next - 0.5) * 2 * 0.9).toFixed(2) + ')' : '';
      });
    });
  }

  function init() {
    initSplit();
    if (reduced) return;
    initRoll();
    initTicker();
    initParallax();
    if (fine) {
      initCursor();
      initMagnets();
      initHeroPointer();
      initTilt();
      initFooterWave();
    }
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
