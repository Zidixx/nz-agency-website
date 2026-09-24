/**
 * NZ Agency — effects.js
 * Scroll premium : smooth scroll, parallaxe, tilt 3D, spotlight curseur,
 * barre de progression, boutons magnétiques, marquee.
 * Tout est désactivé proprement si prefers-reduced-motion ou sur mobile tactile.
 */

(function () {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COARSE  = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

  /* ============================================================
     SMOOTH SCROLL (Lenis si dispo, sinon natif)
     ============================================================ */
  function initSmoothScroll() {
    if (REDUCED || COARSE || typeof window.Lenis !== 'function') return null;

    const lenis = new window.Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Les ancres passent par Lenis
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (!id || id === '#') return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -70 });
      });
    });

    // Désactive le smooth scroll CSS pour éviter le conflit
    document.documentElement.style.scrollBehavior = 'auto';
    return lenis;
  }

  /* ============================================================
     BARRE DE PROGRESSION DE LECTURE
     ============================================================ */
  function initProgressBar() {
    const bar = document.getElementById('scrollProgress');
    if (!bar) return;

    let ticking = false;
    function update() {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 0 ? (window.scrollY / h) * 100 : 0;
      bar.style.transform = 'scaleX(' + (p / 100) + ')';
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ============================================================
     PARALLAXE — data-parallax="0.12"
     ============================================================ */
  function initParallax() {
    if (REDUCED) return;
    const items = [...document.querySelectorAll('[data-parallax]')];
    if (!items.length) return;

    let ticking = false;
    function update() {
      const vh = window.innerHeight;
      items.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) return;
        const speed  = parseFloat(el.dataset.parallax) || 0.1;
        const offset = (rect.top + rect.height / 2 - vh / 2) * -speed;
        el.style.setProperty('--parallax', offset.toFixed(2) + 'px');
      });
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ============================================================
     TILT 3D — data-tilt (suivi souris)
     ============================================================ */
  function initTilt() {
    if (REDUCED || COARSE) return;
    document.querySelectorAll('[data-tilt]').forEach((el) => {
      const max = parseFloat(el.dataset.tilt) || 8;

      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width  - 0.5;
        const py = (e.clientY - r.top)  / r.height - 0.5;
        el.style.setProperty('--rx', (-py * max).toFixed(2) + 'deg');
        el.style.setProperty('--ry', ( px * max).toFixed(2) + 'deg');
        el.classList.add('is-tilting');
      });

      el.addEventListener('mouseleave', () => {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
        el.classList.remove('is-tilting');
      });
    });
  }

  /* ============================================================
     SPOTLIGHT CURSEUR sur les cartes
     ============================================================ */
  function initSpotlight() {
    if (COARSE) return;
    const cards = document.querySelectorAll('.service-card, .phase-card, .team-card');
    cards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top)  + 'px');
      });
    });
  }

  /* ============================================================
     BOUTONS MAGNÉTIQUES
     ============================================================ */
  function initMagnetic() {
    if (REDUCED || COARSE) return;
    document.querySelectorAll('[data-magnetic]').forEach((btn) => {
      const strength = parseFloat(btn.dataset.magnetic) || 0.25;

      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width  / 2) * strength;
        const y = (e.clientY - r.top  - r.height / 2) * strength;
        btn.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  }

  /* ============================================================
     RÉVÉLATION DE TEXTE MOT À MOT — data-split
     ============================================================ */
  function initSplitText() {
    const targets = document.querySelectorAll('[data-split]');
    if (!targets.length) return;

    targets.forEach((el) => {
      if (el.dataset.splitDone) return;
      const html = el.innerHTML;
      // on ne découpe que les nœuds texte de premier niveau
      const wrap = document.createElement('span');
      wrap.innerHTML = html;

      function splitNode(node, out) {
        node.childNodes.forEach((child) => {
          if (child.nodeType === 3) {
            child.textContent.split(/(\s+)/).forEach((word) => {
              if (!word.trim()) { out.appendChild(document.createTextNode(word)); return; }
              const s = document.createElement('span');
              s.className = 'word';
              s.textContent = word;
              out.appendChild(s);
            });
          } else if (child.nodeType === 1) {
            const clone = child.cloneNode(false);
            splitNode(child, clone);
            out.appendChild(clone);
          }
        });
      }

      const container = document.createElement('span');
      splitNode(wrap, container);
      el.innerHTML = '';
      el.appendChild(container);
      el.dataset.splitDone = '1';

      el.querySelectorAll('.word').forEach((w, i) => {
        w.style.setProperty('--wd', (i * 28) + 'ms');
      });
    });

    if (REDUCED) {
      targets.forEach((el) => el.classList.add('is-revealed'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25 });

    targets.forEach((el) => io.observe(el));
  }

  /* ============================================================
     PHASES ÉPINGLÉES — surbrillance de la phase active
     ============================================================ */
  function initPhaseHighlight() {
    const cards = document.querySelectorAll('.phase-card');
    if (!cards.length) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('is-active', entry.isIntersecting && entry.intersectionRatio > 0.55);
      });
    }, { threshold: [0, 0.55, 1] });

    cards.forEach((c) => io.observe(c));
  }

  /* ============================================================
     PARCOURS ÉPINGLÉ — étape pilotée par le scroll
     ============================================================ */
  function initJourney() {
    const wrap = document.getElementById('journeyWrap');
    if (!wrap) return;

    const fill   = document.getElementById('railFill');
    const steps  = [...wrap.querySelectorAll('.rail-step')];
    const panels = [...wrap.querySelectorAll('.journey-panel')];
    const scenes = [...wrap.querySelectorAll('.journey-scene')];
    const total  = panels.length;
    if (!total) return;

    let current = -1;

    function setStep(i) {
      if (i === current) return;
      current = i;
      steps.forEach((el, n)  => el.classList.toggle('is-active', n === i));
      panels.forEach((el, n) => el.classList.toggle('is-active', n === i));
      scenes.forEach((el, n) => el.classList.toggle('is-active', n === i));
    }

    let ticking = false;
    function update() {
      const rect     = wrap.getBoundingClientRect();
      const scrolled = -rect.top;
      const range    = wrap.offsetHeight - window.innerHeight;
      const progress = range > 0 ? Math.min(1, Math.max(0, scrolled / range)) : 0;

      if (fill) fill.style.transform = 'scaleY(' + progress.toFixed(4) + ')';
      setStep(Math.min(total - 1, Math.max(0, Math.floor(progress * total))));
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();

    // Clic sur une étape : on scrolle jusqu'à la portion correspondante
    steps.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        const range   = wrap.offsetHeight - window.innerHeight;
        const wrapTop = wrap.getBoundingClientRect().top + window.scrollY;
        const top     = wrapTop + (i / total) * range + 24;
        window.scrollTo({ top: top, behavior: REDUCED ? 'auto' : 'smooth' });
      });
    });
  }

  /* ============================================================
     NAVBAR QUI SE DOCK AU SCROLL
     ============================================================ */
  function initNavDock() {
    const nav = document.getElementById('navbar');
    if (!nav) return;
    let ticking = false;
    function update() {
      nav.classList.toggle('is-docked', window.scrollY > 24);
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ============================================================
     BARRE D'ACTION MOBILE — visible après le hero, masquée
     quand le formulaire de contact est à l'écran
     ============================================================ */
  function initMobileCta() {
    const barre = document.getElementById('mobileCta');
    const hero = document.getElementById('hero');
    const contact = document.getElementById('contact');
    if (!barre || !hero || !contact) return;

    let heroVisible = true;
    let contactVisible = false;
    const maj = () => {
      const afficher = !heroVisible && !contactVisible;
      barre.classList.toggle('is-visible', afficher);
      barre.setAttribute('aria-hidden', String(!afficher));
      barre.querySelectorAll('a').forEach((a) => (a.tabIndex = afficher ? 0 : -1));
    };
    new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; maj(); }).observe(hero);
    new IntersectionObserver(([e]) => { contactVisible = e.isIntersecting; maj(); }).observe(contact);
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    initSmoothScroll();
    initProgressBar();
    initParallax();
    initTilt();
    initSpotlight();
    initMagnetic();
    initSplitText();
    initPhaseHighlight();
    initJourney();
    initNavDock();
    initMobileCta();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
