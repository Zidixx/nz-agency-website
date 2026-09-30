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


  /* ---------- Délais : tête de lecture de Jour 0 à Jour 12, lancée à l'apparition ---------- */
  function initDays() {
    var track = document.getElementById('daysTrack');
    if (!track) return;
    var rows = $$('.day-row', track);
    var now = document.getElementById('daysNow');
    var big = document.getElementById('daysBig');
    var DURATION = 3600;
    var lastDay = -1;

    function render(ph) {
      rows.forEach(function (row) {
        var d = parseFloat(row.style.getPropertyValue('--d'));
        var done = ph >= d - 0.001;
        row.style.setProperty('--w', Math.max(Math.min(d, ph), 0.25).toFixed(3));
        row.style.setProperty('--ph', ph.toFixed(3));
        row.style.setProperty('--ph-on', ph > 0.02 && ph < 11.98 ? '1' : '0');
        row.style.setProperty('--lbl', done ? '1' : '0');
        row.classList.toggle('is-done', done);
      });
      var day = Math.floor(ph + 0.001);
      if (day !== lastDay) {
        lastDay = day;
        if (now) now.textContent = day;
        if (big) big.textContent = day;
      }
    }

    function play() {
      var start = null;
      function step(t) {
        if (!start) start = t;
        var k = Math.min((t - start) / DURATION, 1);
        // Démarrage vif puis ralenti à l'approche du jour 12.
        render(12 * (1 - Math.pow(1 - k, 2.2)));
        if (k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    render(0);
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      play();
    }, { threshold: 0.35 });
    io.observe(track);
  }

  /* ---------- Hero : recule, s'arrondit et s'efface en scrollant ---------- */
  function initHeroScroll() {
    var hero = document.getElementById('hero');
    if (!hero) return;
    var inner = hero.querySelector('.hero-copy');
    tasks.push(function () {
      var r = hero.getBoundingClientRect();
      if (r.bottom < 0) return;
      var p = clamp(-r.top / r.height, 0, 1);
      hero.style.scale = (1 - p * 0.07).toFixed(4);
      hero.style.borderRadius = '0 0 ' + (40 + p * 60).toFixed(1) + 'px ' + (40 + p * 60).toFixed(1) + 'px';
      if (inner) {
        inner.style.translate = '0 ' + (p * -90).toFixed(1) + 'px';
        inner.style.opacity = (1 - p * 1.3).toFixed(3);
        inner.style.filter = p > 0.02 ? 'blur(' + (p * 6).toFixed(2) + 'px)' : '';
      }
    });
    hero.style.transformOrigin = '50% 0';
  }

  /* ---------- Méthode : la section sombre s'ouvre comme un rideau ---------- */
  function initCurtain() {
    var sec = document.getElementById('processus');
    if (!sec) return;
    tasks.push(function () {
      var vh = window.innerHeight;
      var r = sec.getBoundingClientRect();
      if (r.top > vh || r.bottom < 0) return;
      var p = clamp((vh - r.top) / (vh * 0.9), 0, 1);
      var e = 1 - Math.pow(1 - p, 3);
      var x = ((1 - e) * 9).toFixed(2), y = ((1 - e) * 7).toFixed(2);
      sec.style.clipPath = 'inset(' + y + '% ' + x + '% 0% ' + x + '% round ' + (40 + (1 - e) * 40).toFixed(1) + 'px)';
    });
  }

  /* ---------- Cartes : arrivée en 3D au rythme du scroll ---------- */
  function initScrubIn() {
    var groups = [
      { sel: '.phase', y: 90, rx: 22 },
      { sel: '.stat', y: 50, rx: 0 },
      { sel: '.skill', y: 110, rx: 18 },
      { sel: '.qa', y: 40, rx: 0, x: 60 },
      { sel: '.form-card, .info, .book-card', y: 70, rx: 10 },
    ];
    var items = [];
    groups.forEach(function (g) {
      $$(g.sel).forEach(function (el, k) {
        el.classList.add('scrub-in');
        items.push({ el: el, g: g, lag: (k % 3) * 0.08 });
      });
    });
    tasks.push(function () {
      var vh = window.innerHeight;
      items.forEach(function (it) {
        var r = it.el.getBoundingClientRect();
        if (r.top > vh + 40 || r.bottom < -40) return;
        var p = clamp((vh - r.top) / (vh * 0.55) - it.lag, 0, 1);
        var e = 1 - Math.pow(1 - p, 3);
        var inv = 1 - e;
        it.el.style.translate = ((it.g.x || 0) * inv).toFixed(1) + 'px ' + (it.g.y * inv).toFixed(1) + 'px';
        it.el.style.rotate = it.g.rx ? 'x ' + (it.g.rx * inv).toFixed(2) + 'deg' : '';
        it.el.style.scale = (0.9 + 0.1 * e).toFixed(4);
        it.el.style.opacity = (0.15 + 0.85 * e).toFixed(3);
      });
    });
  }

  /* ---------- Méthode : visuels animés à l'activation de leur étape ---------- */
  function initScenes() {
    $$('.scene').forEach(function (scene) {
      var motion = scene.querySelector('animateMotion');
      var count = scene.querySelector('.chart-count');
      new MutationObserver(function () {
        if (!scene.classList.contains('is-active')) return;
        if (motion && motion.beginElement) { try { motion.beginElement(); } catch (e) { /* SMIL absent : point fixe */ } }
        if (count) {
          var to = parseInt(count.getAttribute('data-to'), 10);
          var start = null;
          var step = function (t) {
            if (!start) start = t;
            var k = Math.min((t - start) / 1600, 1);
            var v = Math.round(to * (1 - Math.pow(1 - k, 3)));
            count.textContent = '+ ' + v.toLocaleString('fr-FR');
            if (k < 1 && scene.classList.contains('is-active')) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      }).observe(scene, { attributes: true, attributeFilter: ['class'] });
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
    initTicker();
    initParallax();
    initDays();
    initHeroScroll();
    initCurtain();
    initScrubIn();
    initScenes();
    if (fine) {
      initHeroPointer();
      initTilt();
      initFooterWave();
    }
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
