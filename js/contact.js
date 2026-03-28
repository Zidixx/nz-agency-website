/**
 * NZ Agency — contact.js
 * Formulaire de contact via EmailJS
 * Destination : nzdigitagency@gmail.com
 */

(function () {
  'use strict';

  /* ============================================================
     CONFIG EMAILJS
     ============================================================ */
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
      if (!v.trim()) return '';
      const re = /^[+0-9\s\-()]{7,20}$/;
      if (!re.test(v.trim())) return 'Numéro de téléphone invalide.';
      return '';
    },
    projectType(v) {
      if (!v) return 'Veuillez sélectionner un type.';
      return '';
    },
    budget(v) {
      if (!v) return 'Veuillez sélectionner un budget.';
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
     ENVOI VIA EMAILJS
     ============================================================ */
  async function sendEmail(data) {
    return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      name:         data.fullName,
      from_name:    data.fullName,
      email:        data.email,
      from_email:   data.email,
      phone:        data.phone || 'Non renseigné',
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
      budget:      form.budget.value,
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
      await sendEmail(data);
      showSuccess();
      form.reset();
      form.querySelectorAll('select').forEach((s) => { s.selectedIndex = 0; });
    } catch (err) {
      console.error('[NZ Agency] Erreur EmailJS:', err);
      showError();
    } finally {
      setLoading(false);
    }
  });

  /* ============================================================
     LIVE VALIDATION
     ============================================================ */
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

  ['projectType', 'budget'].forEach((id) => {
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
