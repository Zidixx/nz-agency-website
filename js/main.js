/**
 * NZ Agency — main.js
 * Logique principale :
 * - Navbar scroll / burger mobile
 * - Smooth scroll
 * - Ripple effect
 */

(function () {
  'use strict';

  /* ============================================================
     NAVBAR — Scroll behavior + burger mobile
     ============================================================ */
  function initNavbar() {
    const navbar  = document.getElementById('navbar');
    const burger  = document.getElementById('burger');
    const navMobile = document.getElementById('navMobile');
    if (!navbar) return;

    let lastScrollY = 0;
    let ticking = false;

    function updateNavbar() {
      const scrollY = window.scrollY;
      navbar.classList.toggle('scrolled', scrollY > 40);
      lastScrollY = scrollY;
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateNavbar);
        ticking = true;
      }
    }, { passive: true });

    // Run on load
    updateNavbar();

    // Burger toggle
    if (burger && navMobile) {
      burger.addEventListener('click', () => {
        const isOpen = burger.classList.toggle('active');
        burger.setAttribute('aria-expanded', isOpen.toString());
        navMobile.setAttribute('aria-hidden', (!isOpen).toString());
        navMobile.classList.toggle('open', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });

      // Close on mobile link click
      navMobile.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
          burger.classList.remove('active');
          burger.setAttribute('aria-expanded', 'false');
          navMobile.setAttribute('aria-hidden', 'true');
          navMobile.classList.remove('open');
          document.body.style.overflow = '';
        });
      });

      // Close on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && burger.classList.contains('active')) {
          burger.classList.remove('active');
          burger.setAttribute('aria-expanded', 'false');
          navMobile.setAttribute('aria-hidden', 'true');
          navMobile.classList.remove('open');
          document.body.style.overflow = '';
          burger.focus();
        }
      });
    }
  }

  /* ============================================================
     SMOOTH SCROLL
     Gère les liens d'ancre avec offset navbar
     ============================================================ */
  function initSmoothScroll() {
    const NAVBAR_HEIGHT = 80;

    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href === '#') return;

        const target = document.querySelector(href);
        if (!target) return;

        e.preventDefault();

        const top = target.getBoundingClientRect().top + window.scrollY - NAVBAR_HEIGHT;

        window.scrollTo({
          top,
          behavior: 'smooth',
        });

        // Update URL without triggering scroll
        history.pushState(null, '', href);
      });
    });
  }

  /* ============================================================
     RIPPLE EFFECT on buttons
     ============================================================ */
  function initRipple() {
    document.querySelectorAll('.btn-primary, .btn-outline').forEach((btn) => {
      btn.addEventListener('click', function (e) {
        const rect    = btn.getBoundingClientRect();
        const x       = e.clientX - rect.left;
        const y       = e.clientY - rect.top;
        const size    = Math.max(rect.width, rect.height) * 2;

        const ripple  = document.createElement('span');
        ripple.classList.add('ripple');
        ripple.style.cssText = `
          width: ${size}px;
          height: ${size}px;
          left: ${x - size / 2}px;
          top: ${y - size / 2}px;
        `;

        btn.appendChild(ripple);

        ripple.addEventListener('animationend', () => ripple.remove());
      });
    });
  }

  /* ============================================================
     ACTIVE NAV LINK STYLE (complementing animations.js observer)
     ============================================================ */
  function initActiveNavStyle() {
    // Add CSS rule for active nav
    const style = document.createElement('style');
    style.textContent = `
      .nav-link.active-nav {
        color: var(--text-primary) !important;
      }
      .nav-link.active-nav::after {
        width: 60% !important;
      }
    `;
    document.head.appendChild(style);
  }

  /* ============================================================
     PHOTO FALLBACK — assurer l'affichage même si SVG introuvable
     ============================================================ */
  function initPhotoFallback() {
    document.querySelectorAll('.member-photo').forEach((img) => {
      // Only hide if image fully loaded but has no content (real error)
      if (img.complete && img.naturalWidth === 0) {
        img.style.display = 'none';
        const fallback = img.nextElementSibling;
        if (fallback && fallback.classList.contains('photo-fallback')) {
          fallback.style.display = 'flex';
        }
      }
    });
  }

  /* ============================================================
     STICKY CONTACT INFO OFFSET (adjust for navbar height)
     ============================================================ */
  function adjustStickyOffset() {
    const info = document.querySelector('.contact-info');
    if (!info) return;

    function update() {
      const navH = document.getElementById('navbar')?.offsetHeight || 80;
      info.style.top = (navH + 16) + 'px';
    }

    update();
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('scroll', update, { passive: true });
  }

  /* ============================================================
     SCROLL TO TOP on logo click (already via href="#hero")
     Extra: back to top button on long scroll
     ============================================================ */
  function initBackToTop() {
    // Lightweight: logo already handles it via smooth scroll
    // This just ensures scroll-to-top works on footer logo too
    document.querySelectorAll('a[href="#hero"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        history.pushState(null, '', '#');
      });
    });
  }

  /* ============================================================
     FORM CHARACTER COUNTER for textarea
     ============================================================ */
  function initCharCounter() {
    const textarea = document.getElementById('message');
    if (!textarea) return;

    const counter = document.createElement('span');
    counter.setAttribute('aria-live', 'polite');
    counter.style.cssText = `
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted);
      text-align: right;
      margin-top: 4px;
      font-family: var(--font-mono);
    `;

    textarea.parentNode.insertBefore(counter, textarea.nextSibling.nextSibling);

    function update() {
      const len = textarea.value.length;
      const max = 2000;
      counter.textContent = `${len} / ${max}`;
      counter.style.color = len > max * 0.9
        ? (len >= max ? 'var(--rose)' : 'var(--cyan)')
        : 'var(--text-muted)';
    }

    textarea.addEventListener('input', update);
    update();
  }

  /* ============================================================
     PERFORMANCE: preload visible images
     ============================================================ */
  function preloadImages() {
    // Photos equipe
    ['./assets/nathan.png', './assets/enzo.png'].forEach((src) => {
      const link = document.createElement('link');
      link.rel  = 'preload';
      link.as   = 'image';
      link.href = src;
      document.head.appendChild(link);
    });
  }

  /* ============================================================
     INIT ALL
     ============================================================ */
  function init() {
    initNavbar();
    initSmoothScroll();
    initRipple();
    initActiveNavStyle();
    initPhotoFallback();
    adjustStickyOffset();
    initBackToTop();
    initCharCounter();
    preloadImages();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
