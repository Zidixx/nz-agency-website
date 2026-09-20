/**
 * NZ Agency — contact.js
 *
 * Chaque demande part d'abord vers l'admin NZ, qui l'enregistre, ouvre un fil
 * de discussion et alerte Discord. EmailJS reste en secours : si l'admin est
 * injoignable, la demande arrive quand même par email plutôt que d'être perdue.
 */

(function () {
  'use strict';

  /* ============================================================
     CONFIG EMAILJS
     ============================================================ */
  // Point d'entrée de l'admin. En développement, on parle au serveur local.
  const API_DEMANDES = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? 'http://localhost:3000/api/demandes'
    : 'https://admin.nzagency.fr/api/demandes';

  const EMAILJS_SERVICE_ID  = 'service_mul4c8e';
  const EMAILJS_TEMPLATE_ID = 'template_urog0u8';
  const EMAILJS_PUBLIC_KEY  = 'cRAmhysp09mNHVh3u';

  /* ============================================================
     REFERENCES DOM
     ============================================================ */
  const form       = document.getElementById('contactForm');
  const submitBtn  = document.getElementById('submitBtn');
  const successMsg = document.getElementById('formSuccess');
  const errorMsg   = document.getElementById('formErrorMsg');

  if (!form) return;

  /* ============================================================
     INIT EMAILJS
     ============================================================ */
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

  /* ============================================================
     VALIDATION
     ============================================================ */
  const validators = {
    fullName(v) {
      if (!v.trim()) return 'Ce champ est obligatoire.';
      if (v.trim().length < 2) return 'Minimum 2 caractères.';
      if (v.trim().length > 100) return 'Maximum 100 caractères.';
      if (/<[^>]*>/.test(v)) return 'Caractères non autorisés.';
      return '';
    },
    email(v) {
      if (!v.trim()) return 'Ce champ est obligatoire.';
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!re.test(v.trim())) return 'Adresse email invalide.';
      if (v.length > 150) return 'Email trop long.';
      return '';
    },
    phone(v) {
      const brut = v.trim();
      if (!brut) return 'Ce champ est obligatoire.';

      const international = brut.startsWith('+');
      const chiffres = brut.replace(/\D/g, '');

      // 10 chiffres pour un numéro français, 8 à 15 en international (E.164).
      if (international) {
        if (chiffres.length < 8)  return 'Numéro trop court.';
        if (chiffres.length > 15) return 'Numéro trop long.';
      } else {
        if (!/^0[1-9]/.test(chiffres)) return 'Un numéro français commence par 0 suivi de 1 à 9.';
        if (chiffres.length !== 10) return 'Un numéro français compte 10 chiffres.';
      }
      return '';
    },
    budget(v) {
      if (!v) return 'Veuillez sélectionner une fourchette.';
      return '';
    },
    projectType(v) {
      if (!v) return 'Veuillez sélectionner un type.';
      return '';
    },
    message(v) {
      if (!v.trim()) return 'Ce champ est obligatoire.';
      if (v.trim().length < 10) return 'Minimum 10 caractères.';
      if (v.trim().length > 2000) return 'Maximum 2000 caractères.';
      return '';
    },
    rgpd(checked) {
      if (!checked) return 'Vous devez accepter pour continuer.';
      return '';
    },
  };

  function showFieldError(fieldId, message) {
    const field   = document.getElementById(fieldId);
    const errorEl = document.getElementById(fieldId + 'Error');
    if (field)   field.classList.toggle('error', !!message);
    if (errorEl) errorEl.textContent = message;
  }

  function clearAllErrors() {
    ['fullName', 'email', 'phone', 'projectType', 'budget', 'message', 'rgpd']
      .forEach((id) => showFieldError(id, ''));
  }

  function validateForm(data) {
    let isValid = true;
    const checks = [
      ['fullName',    validators.fullName(data.fullName)],
      ['email',       validators.email(data.email)],
      ['phone',       validators.phone(data.phone)],
      ['projectType', validators.projectType(data.projectType)],
      ['budget',      validators.budget(data.budget)],
      ['message',     validators.message(data.message)],
      ['rgpd',        validators.rgpd(data.rgpd)],
    ];
    checks.forEach(([field, error]) => {
      if (error) { showFieldError(field, error); isValid = false; }
    });
    return isValid;
  }

  /* ============================================================
     HONEYPOT (anti-spam)
     ============================================================ */
  function isSpam() {
    const honeypot = form.querySelector('input[name="website_url"]');
    return honeypot && honeypot.value !== '';
  }

  /* ============================================================
     LOADING STATE
     ============================================================ */
  function setLoading(loading) {
    submitBtn.disabled = loading;
    submitBtn.classList.toggle('loading', loading);
    submitBtn.setAttribute('aria-busy', loading.toString());
  }

  /* ============================================================
     MESSAGES
     ============================================================ */
  function showSuccess() {
    successMsg.hidden = false;
    errorMsg.hidden   = true;
    successMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function showError() {
    errorMsg.hidden   = false;
    successMsg.hidden = true;
    errorMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideMessages() {
    successMsg.hidden = true;
    errorMsg.hidden   = true;
  }

  /* ============================================================
     ENVOI VERS L'ADMIN NZ
     ============================================================ */
  async function envoyerAAdmin(data) {
    const honeypot = form.querySelector('input[name="website_url"]');

    const reponse = await fetch(API_DEMANDES, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom:         data.fullName,
        email:       data.email,
        telephone:   data.phone,
        type_projet: data.projectType,
        budget:      data.budget,
        message:     data.message,
        source:      'site',
        website_url: honeypot ? honeypot.value : '',
      }),
    });

    if (!reponse.ok) {
      const detail = await reponse.json().catch(() => ({}));
      throw new Error(detail.erreur || ('HTTP ' + reponse.status));
    }
    return reponse.json();
  }

  /* ============================================================
     ENVOI VIA EMAILJS (secours)
     ============================================================ */
  async function sendEmail(data) {
    return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      name:         data.fullName,
      from_name:    data.fullName,
      email:        data.email,
      from_email:   data.email,
      phone:        data.phone,
      project_type: data.projectType,
      budget:       data.budget,
      message:      data.message,
    });
  }

  /* ============================================================
     SUBMIT
     ============================================================ */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors();
    hideMessages();

    if (isSpam()) { showSuccess(); return; }

    const data = {
      fullName:    form.fullName.value,
      email:       form.email.value,
      phone:       form.phone ? form.phone.value : '',
      projectType: form.projectType.value,
      budget:      form.budget ? form.budget.value : '',
      message:     form.message.value,
      rgpd:        form.rgpd.checked,
    };

    if (!validateForm(data)) {
      const firstError = form.querySelector('.error');
      if (firstError) firstError.focus();
      return;
    }

    setLoading(true);

    try {
      try {
        await envoyerAAdmin(data);
      } catch (erreurAdmin) {
        // L'admin n'a pas répondu : on ne perd pas la demande pour autant.
        console.warn('[NZ Agency] Admin injoignable, bascule sur EmailJS :', erreurAdmin);
        await sendEmail(data);
      }
      showSuccess();
      form.reset();
      form.querySelectorAll('select').forEach((s) => { s.selectedIndex = 0; });
    } catch (err) {
      console.error('[NZ Agency] Envoi impossible :', err);
      showError();
    } finally {
      setLoading(false);
    }
  });

  /* ============================================================
     SAISIE DU TÉLÉPHONE
     On ne laisse entrer que des chiffres (plus un « + » initial pour
     l'international), on groupe par deux à la française et on bloque net au
     nombre maximum de chiffres : impossible de taper un numéro invalide.
     ============================================================ */
  function formaterTelephone(valeur) {
    const international = valeur.trim().startsWith('+');
    let chiffres = valeur.replace(/\D/g, '');

    if (international) {
      chiffres = chiffres.slice(0, 15);
      if (chiffres.length <= 2) return '+' + chiffres;
      // +33 6 12 34 56 78 : indicatif, puis le chiffre isolé s'il en reste un
      // nombre impair, puis des paires. Sans ce décalage on obtient
      // « +33 61 23 45 67 8 », qui ne ressemble à aucun numéro.
      const indicatif = chiffres.slice(0, 2);
      let reste       = chiffres.slice(2);
      let tete        = '';
      if (reste.length % 2 === 1) {
        tete  = reste.slice(0, 1) + ' ';
        reste = reste.slice(1);
      }
      const paires = reste.replace(/(\d{2})(?=\d)/g, '$1 ');
      return ('+' + indicatif + ' ' + tete + paires).trim();
    }

    chiffres = chiffres.slice(0, 10);
    return chiffres.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  }

  const champTel = document.getElementById('phone');
  if (champTel) {
    champTel.addEventListener('input', () => {
      const avant = champTel.value;
      const apres = formaterTelephone(avant);
      if (apres !== avant) {
        // On replace le curseur en fin de saisie : sans ça, il saute au début
        // à chaque caractère inséré par le formatage.
        champTel.value = apres;
        champTel.setSelectionRange(apres.length, apres.length);
      }
    });

    // Un collage peut contenir des points, des slashs, un indicatif exotique.
    champTel.addEventListener('paste', (e) => {
      e.preventDefault();
      const colle = (e.clipboardData || window.clipboardData).getData('text');
      champTel.value = formaterTelephone(colle);
    });
  }

  /* ============================================================
     LIVE VALIDATION
     ============================================================ */
  ['projectType', 'budget'].forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    select.addEventListener('change', () => showFieldError(id, validators[id](select.value)));
  });

  ['fullName', 'email', 'phone', 'message'].forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('blur', () => {
      if (input.value !== '') showFieldError(id, validators[id](input.value));
    });
    input.addEventListener('input', () => {
      if (input.classList.contains('error')) showFieldError(id, '');
    });
  });

  ['projectType'].forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    select.addEventListener('change', () => showFieldError(id, ''));
  });

  const rgpd = document.getElementById('rgpd');
  if (rgpd) {
    rgpd.addEventListener('change', () => {
      if (rgpd.checked) showFieldError('rgpd', '');
    });
  }

})();
