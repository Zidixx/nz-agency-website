/**
 * NZ Agency — booking.js
 *
 * Réservation d'un call en visio, en trois étapes : date, heure, infos.
 * Les disponibilités et la réservation passent par l'admin NZ, qui interroge
 * Google Agenda, crée l'événement Meet et envoie les emails.
 */

(function () {
  'use strict';

  const API_BASE = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? 'http://localhost:3000/api/booking'
    : 'https://admin.nzagency.fr/api/booking';

  // Cloudflare Turnstile : laisser vide pour désactiver. La clé secrète
  // correspondante se configure côté admin (TURNSTILE_SECRET_KEY).
  const TURNSTILE_SITE_KEY = '';

  const modal = document.getElementById('bookingModal');
  if (!modal) return;

  const panel      = modal.querySelector('.booking-panel');
  const steps      = [...modal.querySelectorAll('.booking-step')];
  const stepDots   = [...modal.querySelectorAll('.booking-progress li')];
  const monthLabel = modal.querySelector('#bookingMonthLabel');
  const grid       = modal.querySelector('#bookingGrid');
  const prevBtn    = modal.querySelector('#bookingPrev');
  const nextBtn    = modal.querySelector('#bookingNext');
  const dayLabel   = modal.querySelector('#bookingDayLabel');
  const slotsWrap  = modal.querySelector('#bookingSlots');
  const summary    = modal.querySelector('#bookingSummary');
  const form       = modal.querySelector('#bookingForm');
  const submitBtn  = modal.querySelector('#bookingSubmit');
  const errorBox   = modal.querySelector('#bookingError');
  const success    = modal.querySelector('#bookingSuccess');

  const MOIS  = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const JOURS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];

  const state = {
    step: 1,
    month: null,          // 'AAAA-MM'
    days: new Map(),      // 'AAAA-MM' → Set('AAAA-MM-JJ')
    date: null,           // 'AAAA-MM-JJ'
    slot: null,           // { start, end, label }
    lastFocus: null,
    turnstileId: null,
  };

  /* ============================================================
     OUVERTURE / FERMETURE
     ============================================================ */
  function open(e) {
    if (e) e.preventDefault();
    state.lastFocus = document.activeElement;
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('open'));
    document.body.style.overflow = 'hidden';
    if (!state.month) {
      const now = new Date();
      renderMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    }
    goTo(state.step === 4 ? 1 : state.step);
    setTimeout(() => (modal.querySelector('.booking-close') || panel).focus(), 50);
  }

  function close() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { modal.hidden = true; }, 250);
    if (state.lastFocus && state.lastFocus.focus) state.lastFocus.focus();
  }

  document.querySelectorAll('[data-booking]').forEach((el) => el.addEventListener('click', open));
  modal.querySelectorAll('[data-booking-close]').forEach((el) => el.addEventListener('click', close));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) close();
  });

  // Piège le focus dans la modale : Tab ne doit pas partir derrière.
  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = [...panel.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href]')]
      .filter((el) => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last  = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ============================================================
     ÉTAPES
     ============================================================ */
  function goTo(step) {
    state.step = step;
    steps.forEach((s) => { s.hidden = Number(s.dataset.step) !== step; });
    stepDots.forEach((d) => {
      const n = Number(d.dataset.step);
      d.classList.toggle('active', n === step);
      d.classList.toggle('done', n < step);
    });
    panel.scrollTop = 0;
    hideError();
  }

  modal.querySelectorAll('[data-booking-back]').forEach((btn) => {
    btn.addEventListener('click', () => goTo(Number(btn.dataset.bookingBack)));
  });

  /* ============================================================
     API
     ============================================================ */
  async function api(path, options) {
    const res = await fetch(API_BASE + path, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.erreur || ('HTTP ' + res.status));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  /* ============================================================
     ÉTAPE 1 — CALENDRIER
     ============================================================ */
  function monthShift(month, delta) {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  async function renderMonth(month) {
    state.month = month;
    const [y, m] = month.split('-').map(Number);
    monthLabel.textContent = `${MOIS[m - 1]} ${y}`;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    prevBtn.disabled = month <= currentMonth;
    // Horizon de 30 jours : au plus le mois suivant.
    nextBtn.disabled = month >= monthShift(currentMonth, 1);

    grid.innerHTML = '';
    grid.setAttribute('aria-busy', 'true');

    let available = state.days.get(month);
    if (!available) {
      try {
        const data = await api(`/availability?month=${month}`);
        available = new Set(data.days || []);
        state.days.set(month, available);
      } catch (err) {
        grid.setAttribute('aria-busy', 'false');
        showError(err.status === 503
          ? 'Notre agenda est momentanément indisponible. Réessayez dans quelques minutes.'
          : 'Impossible de charger les disponibilités. Vérifiez votre connexion.');
        return;
      }
    }
    if (state.month !== month) return; // l'utilisateur a changé de mois entre-temps

    const firstDay = new Date(y, m - 1, 1);
    const offset = (firstDay.getDay() + 6) % 7; // lundi en premier
    const daysInMonth = new Date(y, m, 0).getDate();
    const frag = document.createDocumentFragment();

    for (let i = 0; i < offset; i++) {
      const empty = document.createElement('span');
      empty.className = 'booking-day booking-day--empty';
      frag.appendChild(empty);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${month}-${String(d).padStart(2, '0')}`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'booking-day';
      btn.textContent = String(d);
      const ok = available.has(iso);
      btn.disabled = !ok;
      if (ok) btn.classList.add('available');
      if (iso === state.date) btn.classList.add('selected');
      btn.setAttribute('aria-label', `${JOURS[(new Date(y, m - 1, d).getDay() + 6) % 7]} ${d} ${MOIS[m - 1]}${ok ? '' : ', indisponible'}`);
      btn.addEventListener('click', () => selectDate(iso));
      frag.appendChild(btn);
    }
    grid.appendChild(frag);
    grid.setAttribute('aria-busy', 'false');
  }

  prevBtn.addEventListener('click', () => renderMonth(monthShift(state.month, -1)));
  nextBtn.addEventListener('click', () => renderMonth(monthShift(state.month, 1)));

  /* ============================================================
     ÉTAPE 2 — CRÉNEAUX
     ============================================================ */
  function dateLisible(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return `${JOURS[(date.getDay() + 6) % 7]} ${d} ${MOIS[m - 1]} ${y}`;
  }

  async function selectDate(iso) {
    state.date = iso;
    state.slot = null;
    dayLabel.textContent = dateLisible(iso);
    slotsWrap.innerHTML = '<p class="booking-loading">Chargement des créneaux…</p>';
    goTo(2);

    try {
      const data = await api(`/slots?date=${iso}`);
      if (state.date !== iso) return;
      renderSlots(data.slots || []);
    } catch (err) {
      slotsWrap.innerHTML = '';
      showError(err.status === 503
        ? 'Notre agenda est momentanément indisponible. Réessayez dans quelques minutes.'
        : 'Impossible de charger les créneaux.');
    }
  }

  function renderSlots(slots) {
    slotsWrap.innerHTML = '';
    if (!slots.length) {
      slotsWrap.innerHTML = '<p class="booking-empty">Plus aucun créneau ce jour-là. Choisissez une autre date.</p>';
      return;
    }
    slots.forEach((slot) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'booking-slot';
      btn.textContent = slot.label;
      btn.addEventListener('click', () => selectSlot(slot));
      slotsWrap.appendChild(btn);
    });
  }

  function selectSlot(slot) {
    state.slot = slot;
    summary.textContent = `${dateLisible(state.date)} à ${slot.label}, heure de Paris · 30 min en visio`;
    goTo(3);
    mountTurnstile();
    setTimeout(() => form.querySelector('#bkPrenom').focus(), 50);
  }

  /* ============================================================
     ÉTAPE 3 — FORMULAIRE
     ============================================================ */
  const validators = {
    bkPrenom(v) {
      if (!v.trim()) return 'Ce champ est obligatoire.';
      if (v.trim().length < 2) return 'Minimum 2 caractères.';
      if (v.trim().length > 60) return 'Maximum 60 caractères.';
      if (/<[^>]*>/.test(v)) return 'Caractères non autorisés.';
      return '';
    },
    bkNom(v) { return validators.bkPrenom(v); },
    bkEmail(v) {
      if (!v.trim()) return 'Ce champ est obligatoire.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())) return 'Adresse email invalide.';
      if (v.length > 150) return 'Email trop long.';
      return '';
    },
    bkPhone(v) {
      const brut = v.trim();
      if (!brut) return 'Ce champ est obligatoire.';
      const chiffres = brut.replace(/\D/g, '');
      if (brut.startsWith('+')) {
        if (chiffres.length < 8)  return 'Numéro trop court.';
        if (chiffres.length > 15) return 'Numéro trop long.';
      } else {
        if (!/^0[1-9]/.test(chiffres)) return 'Un numéro français commence par 0 suivi de 1 à 9.';
        if (chiffres.length !== 10) return 'Un numéro français compte 10 chiffres.';
      }
      return '';
    },
    bkProjet(v) {
      if (!v.trim()) return 'Ce champ est obligatoire.';
      if (v.trim().length < 20) return 'Minimum 20 caractères : dites-nous en un peu plus.';
      if (v.trim().length > 1000) return 'Maximum 1000 caractères.';
      return '';
    },
    bkRgpd(checked) { return checked ? '' : 'Vous devez accepter pour continuer.'; },
  };

  function showFieldError(id, message) {
    const field   = form.querySelector('#' + id);
    const errorEl = form.querySelector('#' + id + 'Error');
    if (field)   field.classList.toggle('error', !!message);
    if (errorEl) errorEl.textContent = message;
  }

  function validate(data) {
    let valid = true;
    [
      ['bkPrenom', validators.bkPrenom(data.prenom)],
      ['bkNom',    validators.bkNom(data.nom)],
      ['bkEmail',  validators.bkEmail(data.email)],
      ['bkPhone',  validators.bkPhone(data.telephone)],
      ['bkProjet', validators.bkProjet(data.description)],
      ['bkRgpd',   validators.bkRgpd(data.rgpd)],
    ].forEach(([id, err]) => {
      showFieldError(id, err);
      if (err) valid = false;
    });
    return valid;
  }

  // Compteur de caractères, comme sur le formulaire de contact.
  const projet  = form.querySelector('#bkProjet');
  const counter = form.querySelector('#bkProjetCount');
  projet.addEventListener('input', () => { counter.textContent = `${projet.value.length} / 1000`; });

  // Téléphone : chiffres seulement, groupés par deux (voir contact.js).
  const phone = form.querySelector('#bkPhone');
  function formaterTelephone(valeur) {
    const international = valeur.trim().startsWith('+');
    let chiffres = valeur.replace(/\D/g, '');
    if (international) {
      chiffres = chiffres.slice(0, 15);
      if (chiffres.length <= 2) return '+' + chiffres;
      const indicatif = chiffres.slice(0, 2);
      let reste = chiffres.slice(2);
      let tete = '';
      if (reste.length % 2 === 1) { tete = reste.slice(0, 1) + ' '; reste = reste.slice(1); }
      return ('+' + indicatif + ' ' + tete + reste.replace(/(\d{2})(?=\d)/g, '$1 ')).trim();
    }
    return chiffres.slice(0, 10).replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  }
  phone.addEventListener('input', () => {
    const apres = formaterTelephone(phone.value);
    if (apres !== phone.value) { phone.value = apres; phone.setSelectionRange(apres.length, apres.length); }
  });

  ['bkPrenom', 'bkNom', 'bkEmail', 'bkPhone', 'bkProjet'].forEach((id) => {
    const input = form.querySelector('#' + id);
    input.addEventListener('blur', () => { if (input.value) showFieldError(id, validators[id](input.value)); });
    input.addEventListener('input', () => { if (input.classList.contains('error')) showFieldError(id, ''); });
  });
  form.querySelector('#bkRgpd').addEventListener('change', (e) => { if (e.target.checked) showFieldError('bkRgpd', ''); });

  /* Turnstile (optionnel) */
  function mountTurnstile() {
    if (!TURNSTILE_SITE_KEY || state.turnstileId !== null) return;
    const holder = form.querySelector('#bkTurnstile');
    const render = () => { state.turnstileId = window.turnstile.render(holder, { sitekey: TURNSTILE_SITE_KEY, theme: 'dark' }); };
    if (window.turnstile) return render();
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = render;
    document.head.appendChild(s);
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    submitBtn.classList.toggle('loading', loading);
    submitBtn.setAttribute('aria-busy', String(loading));
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }
  function hideError() { errorBox.hidden = true; }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    if (!state.slot) return goTo(1);

    const honeypot = form.querySelector('input[name="website_url"]');
    const data = {
      prenom:      form.bkPrenom.value,
      nom:         form.bkNom.value,
      email:       form.bkEmail.value,
      telephone:   form.bkPhone.value,
      description: form.bkProjet.value,
      rgpd:        form.bkRgpd.checked,
      debut:       state.slot.start,
      website_url: honeypot ? honeypot.value : '',
      turnstile:   state.turnstileId !== null && window.turnstile ? window.turnstile.getResponse(state.turnstileId) : undefined,
    };

    if (!validate(data)) {
      const first = form.querySelector('.error');
      if (first) first.focus();
      return;
    }

    setLoading(true);
    try {
      const result = await api('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      showSuccess(result);
    } catch (err) {
      if (err.status === 409) {
        // Le créneau vient d'être pris : on retourne aux heures, rafraîchies.
        state.days.delete(state.month);
        await selectDate(state.date);
        showError(err.message);
      } else if (err.status === 422 && err.data && err.data.champs) {
        const map = { prenom: 'bkPrenom', nom: 'bkNom', email: 'bkEmail', telephone: 'bkPhone', description: 'bkProjet', rgpd: 'bkRgpd' };
        err.data.champs.forEach((c) => { if (map[c]) showFieldError(map[c], 'Valeur invalide.'); });
        showError(err.data.champs.includes('debut') ? "Ce créneau n'est plus proposé. Choisissez-en un autre." : 'Vérifiez les champs signalés.');
      } else {
        showError(err.message || 'Une erreur est survenue. Écrivez-nous à contact@nzagency.fr.');
      }
    } finally {
      setLoading(false);
      if (state.turnstileId !== null && window.turnstile) window.turnstile.reset(state.turnstileId);
    }
  });

  /* ============================================================
     ÉTAPE 4 — CONFIRMATION
     ============================================================ */
  function showSuccess(result) {
    success.querySelector('#bkDoneDate').textContent = result.dateLisible || dateLisible(result.date);
    success.querySelector('#bkDoneTime').textContent = `${result.heure} (heure de Paris), ${result.duree || 30} min`;
    const link = success.querySelector('#bkMeetLink');
    link.href = result.meetLink;
    success.querySelector('#bkDoneMail').textContent = result.emailEnvoye
      ? `Un email de confirmation vient de partir à ${form.bkEmail.value.trim()}, avec l'invitation Google Agenda.`
      : "L'invitation Google Agenda vous a été envoyée. L'email de confirmation suivra.";
    goTo(4);
    form.reset();
    counter.textContent = '0 / 1000';
    state.days.delete(state.month);
    state.slot = null;
    state.date = null;
  }
})();
