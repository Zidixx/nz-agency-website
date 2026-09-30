/* NZ Agency · interactions du site (navbar, hero, scroll, FAQ). */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Défilement doux (souris uniquement) ---------- */
  var lenis = null;
  function initLenis() {
    if (reduced || !finePointer || !window.Lenis) return;
    lenis = new window.Lenis({ duration: 1.05, easing: function (t) { return 1 - Math.pow(1 - t, 3); } });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }

  function scrollToTarget(el) {
    if (lenis) lenis.scrollTo(el, { offset: -90 });
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  /* ---------- Navbar : teinte selon la section sous la pilule, menu mobile ---------- */
  function initNav() {
    var nav = $('#nav');
    var menu = $('#menu');
    var burger = $('#burger');
    if (!nav) return;
    var themed = $$('[data-theme]');

    function tone() {
      var y = 40;
      var current = 'dark';
      for (var i = 0; i < themed.length; i++) {
        var r = themed[i].getBoundingClientRect();
        if (r.top <= y && r.bottom > y) current = themed[i].getAttribute('data-theme');
      }
      nav.setAttribute('data-tone', current);
    }

    // Lien actif : la section la plus présente à l'écran.
    var links = $$('.nav-links a[href^="#"]');
    var sections = links.map(function (a) { return $(a.getAttribute('href')); }).filter(Boolean);
    function active() {
      var mid = window.innerHeight * 0.4;
      var id = null;
      sections.forEach(function (s) {
        var r = s.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) id = '#' + s.id;
      });
      links.forEach(function (a) {
        if (a.getAttribute('href') === id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { tone(); active(); ticking = false; });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    tone();

    if (!menu || !burger) return;
    function setMenu(open) {
      menu.classList.toggle('is-open', open);
      nav.classList.toggle('is-menu', open);
      document.body.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      menu.setAttribute('aria-hidden', String(!open));
      if (lenis) open ? lenis.stop() : lenis.start();
    }
    burger.addEventListener('click', function () { setMenu(!menu.classList.contains('is-open')); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); burger.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 900) setMenu(false); });
  }

  /* ---------- Ancres internes ---------- */
  function initAnchors() {
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var target = $(id);
        if (!target) return;
        e.preventDefault();
        scrollToTarget(target);
        history.replaceState(null, '', id);
      });
    });
  }

  /* ---------- Hero : ciel étoilé, entrée, décollage au scroll ---------- */
  function initStars() {
    var canvas = $('#stars');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var stars = [];
    var w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var visible = true;

    function resize() {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.round((w * h) / 9000);
      stars = [];
      for (var i = 0; i < count; i++) {
        stars.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.2 + 0.2, a: Math.random(), s: Math.random() * 0.012 + 0.003, v: Math.random() * 0.15 + 0.05 });
      }
      draw(0);
    }
    function draw(dt) {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i];
        if (dt) {
          st.a += st.s;
          st.y += st.v * dt * 0.06;
          if (st.y > h) { st.y = 0; st.x = Math.random() * w; }
        }
        var alpha = 0.25 + Math.abs(Math.sin(st.a)) * 0.6;
        ctx.fillStyle = 'rgba(255,255,255,' + alpha.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    var last = 0;
    function loop(t) {
      if (visible) draw(last ? t - last : 16);
      last = t;
      requestAnimationFrame(loop);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });
    if (reduced) return;
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(canvas);
    requestAnimationFrame(loop);
  }

  function initHero() {
    var hero = $('#hero');
    if (!hero) return;
    requestAnimationFrame(function () { requestAnimationFrame(function () { hero.classList.add('is-ready'); }); });

    var stage = $('.hero-stage', hero);
    if (!stage || reduced) return;
    var ticking = false;
    function update() {
      var r = hero.getBoundingClientRect();
      var p = Math.min(Math.max(-r.top / (r.height * 0.7), 0), 1);
      stage.style.setProperty('--lift', p.toFixed(3));
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- Apparitions au scroll ---------- */
  function initReveal() {
    var items = $$('[data-reveal], .days');
    if (!('IntersectionObserver' in window) || reduced) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Compteurs ---------- */
  function initCounters() {
    var nums = $$('[data-count]');
    if (!nums.length) return;
    function run(el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      var suffix = el.getAttribute('data-suffix') || '';
      if (reduced) { el.textContent = target + suffix; return; }
      var start = null;
      function step(t) {
        if (!start) start = t;
        var k = Math.min((t - start) / 1400, 1);
        var eased = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.6 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ---------- Méthode : étapes pilotées par le scroll (grand écran) ---------- */
  function initJourney() {
    var track = $('#journeyTrack');
    if (!track) return;
    var rail = $('.rail', track);
    var steps = $$('.rail-step', track);
    var panels = $$('.panel', track);
    var scenes = $$('.scene', track);
    var count = panels.length;
    var current = -1;
    var mq = window.matchMedia('(min-width: 901px)');

    function setStep(i) {
      if (i === current) return;
      current = i;
      steps.forEach(function (s, k) {
        s.classList.toggle('is-active', k === i);
        s.classList.toggle('is-done', k < i);
        if (k === i) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current');
      });
      panels.forEach(function (p, k) { p.classList.toggle('is-active', k === i); });
      scenes.forEach(function (p, k) { p.classList.toggle('is-active', k === i); });
    }

    var ticking = false;
    function update() {
      ticking = false;
      if (!mq.matches) return;
      var r = track.getBoundingClientRect();
      var total = r.height - window.innerHeight;
      var p = Math.min(Math.max(-r.top / total, 0), 1);
      if (rail) rail.style.setProperty('--p', p.toFixed(3));
      setStep(Math.min(count - 1, Math.floor(p * count * 0.999)));
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });

    steps.forEach(function (s, k) {
      s.addEventListener('click', function () {
        var top = track.getBoundingClientRect().top + window.scrollY;
        var total = track.offsetHeight - window.innerHeight;
        var y = top + total * ((k + 0.5) / count);
        if (lenis) lenis.scrollTo(y); else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
      });
    });
    setStep(0);
    update();
  }

  /* ---------- FAQ ---------- */
  function initFaq() {
    $$('.qa').forEach(function (item) {
      var btn = $('.qa-btn', item);
      btn.addEventListener('click', function () {
        var open = !item.classList.contains('is-open');
        item.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
    });
  }

  /* ---------- Compteur de caractères du message ---------- */
  function initCharCount() {
    var area = $('#message');
    var out = $('#messageCount');
    if (!area || !out) return;
    function update() { out.textContent = area.value.length + ' / 2000'; }
    area.addEventListener('input', update);
    update();
  }

  /* ---------- Barre d'action mobile : après le hero, masquée au contact ---------- */
  function initDock() {
    var dock = $('#dock');
    var hero = $('#hero');
    var contact = $('#contact');
    if (!dock || !hero) return;
    document.body.classList.add('has-dock');
    var pastHero = false, onContact = false;
    function render() {
      var on = pastHero && !onContact;
      dock.classList.toggle('is-on', on);
      dock.setAttribute('aria-hidden', String(!on));
      $$('a', dock).forEach(function (a) { a.tabIndex = on ? 0 : -1; });
    }
    new IntersectionObserver(function (e) { pastHero = !e[0].isIntersecting; render(); }, { threshold: 0.15 }).observe(hero);
    if (contact) new IntersectionObserver(function (e) { onContact = e[0].isIntersecting; render(); }, { threshold: 0.1 }).observe(contact);
  }

  function init() {
    document.documentElement.classList.add('js');
    initLenis();
    initNav();
    initAnchors();
    initStars();
    initHero();
    initReveal();
    initCounters();
    initJourney();
    initFaq();
    initCharCount();
    initDock();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
