/**
 * NZ Agency — animations.js
 * Scroll reveal, compteurs count-up, typewriter, timeline
 */

(function () {
  'use strict';

  /* ============================================================
     SCROLL REVEAL — IntersectionObserver
     ============================================================ */
  function initScrollReveal() {
    const elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    elements.forEach((el) => observer.observe(el));
  }

  /* ============================================================
     COUNT-UP ANIMATION
     ============================================================ */
  function animateCounter(el) {
    const target  = parseInt(el.dataset.target, 10);
    const prefix  = el.dataset.prefix  || '';
    const suffix  = el.dataset.suffix  || '';
    const duration = 1800;
    const startTime = performance.now();

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function update(currentTime) {
      const elapsed  = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      const current = Math.round(easedProgress * target);

      el.textContent = prefix + current + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = prefix + target + suffix;
      }
    }

    requestAnimationFrame(update);
  }

  function initCounters() {
    const counters = document.querySelectorAll('.stat-number[data-target]');
    if (!counters.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach((counter) => observer.observe(counter));
  }

  /* ============================================================
     TYPEWRITER EFFECT
     ============================================================ */
  function initTypewriter() {
    const el = document.getElementById('typewriter');
    if (!el) return;

    const phrases = [
      'NZ Agency conçoit des expériences digitales haut de gamme.',
      'Landing pages, réservations, e-commerce — clé en main.',
      'Optimisés pour la performance. Sécurisés par design.',
      'Du code propre qui convertit, impressionne et se vend.',
    ];

    let phraseIndex = 0;
    let charIndex   = 0;
    let isDeleting  = false;
    let isPaused    = false;

    const TYPING_SPEED  = 42;
    const DELETING_SPEED = 22;
    const PAUSE_AFTER   = 2400;
    const PAUSE_BEFORE  = 300;

    function type() {
      if (isPaused) return;

      const phrase = phrases[phraseIndex];

      if (!isDeleting) {
        charIndex++;
        el.textContent = phrase.slice(0, charIndex);

        if (charIndex === phrase.length) {
          isPaused = true;
          setTimeout(() => {
            isPaused    = false;
            isDeleting  = true;
            setTimeout(type, PAUSE_BEFORE);
          }, PAUSE_AFTER);
          return;
        }
        setTimeout(type, TYPING_SPEED);
      } else {
        charIndex--;
        el.textContent = phrase.slice(0, charIndex);

        if (charIndex === 0) {
          isDeleting  = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
          setTimeout(type, PAUSE_BEFORE + 100);
          return;
        }
        setTimeout(type, DELETING_SPEED);
      }
    }

    // Start after hero entrance animation
    setTimeout(type, 1200);
  }

  /* ============================================================
     PROCESS TIMELINE ANIMATION
     ============================================================ */
  function initTimeline() {
    const fill = document.getElementById('processLineFill');
    if (!fill) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            fill.classList.add('animate');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );

    const line = document.querySelector('.process-line');
    if (line) observer.observe(line);
  }

  /* ============================================================
     FAQ ACCORDION
     ============================================================ */
  function initFAQ() {
    const items = document.querySelectorAll('.faq-item');
    if (!items.length) return;

    items.forEach((item) => {
      const btn  = item.querySelector('.faq-btn');
      const body = item.querySelector('.faq-body');
      if (!btn || !body) return;

      btn.addEventListener('click', () => {
        const isOpen = item.classList.contains('active');

        // Close all
        items.forEach((i) => {
          i.classList.remove('active');
          const b = i.querySelector('.faq-btn');
          const d = i.querySelector('.faq-body');
          if (b) b.setAttribute('aria-expanded', 'false');
          if (d) d.classList.remove('open');
        });

        // Toggle current
        if (!isOpen) {
          item.classList.add('active');
          btn.setAttribute('aria-expanded', 'true');
          body.classList.add('open');
        }
      });

      // Keyboard: Enter / Space already handled by button default
    });
  }

  /* ============================================================
     SECTION PROGRESS INDICATOR (optional ambient effect)
     ============================================================ */
  function initSectionObserver() {
    const sections = document.querySelectorAll('section[id]');
    if (!sections.length) return;

    const navLinks = document.querySelectorAll('.nav-link');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            navLinks.forEach((link) => {
              link.classList.toggle(
                'active-nav',
                link.getAttribute('href') === `#${id}`
              );
            });
          }
        });
      },
      {
        threshold: 0.4,
        rootMargin: '-80px 0px -60% 0px',
      }
    );

    sections.forEach((s) => observer.observe(s));
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    initScrollReveal();
    initCounters();
    initTypewriter();
    initTimeline();
    initFAQ();
    initSectionObserver();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
