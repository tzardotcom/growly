/* =========================================================
   GROWLY — Landing Page interactions
   Fake-door flow + marketing loops + server-side analytics (B-160)
   ========================================================= */
(function () {
  'use strict';

  var SUPABASE_FUNCTIONS =
    'https://xxlnwijfmuwahvtvkxge.supabase.co/functions/v1';

  var SIGNUP_ENDPOINT = window.GROWLY_SIGNUP_URL ||
    SUPABASE_FUNCTIONS + '/growly-signup';

  var TRACK_ENDPOINT = window.GROWLY_TRACK_URL ||
    SUPABASE_FUNCTIONS + '/growly-track';

  var SERVER_EVENTS = {
    lp_view: 1,
    cta_click_starter_box: 1,
    email_submitted: 1,
    post_signup_question_answered: 1
  };

  var WAITLIST_BASE = 120;

  /* ---------- Helpers ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function getVisitorId() {
    var key = 'growly_visitor_id';
    var id = localStorage.getItem(key);
    if (!id) {
      id = uuid();
      localStorage.setItem(key, id);
    }
    return id;
  }

  function getSessionId() {
    var key = 'growly_session_id';
    var id = sessionStorage.getItem(key);
    if (!id) {
      id = uuid();
      sessionStorage.setItem(key, id);
    }
    return id;
  }

  function captureUtm() {
    var key = 'growly_utm';
    if (sessionStorage.getItem(key)) return;
    var params = new URLSearchParams(window.location.search);
    var utm = {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_term: params.get('utm_term') || '',
      utm_content: params.get('utm_content') || '',
      landing_path: window.location.pathname || '/'
    };
    sessionStorage.setItem(key, JSON.stringify(utm));
  }

  function getAttribution() {
    captureUtm();
    var utm = {};
    try { utm = JSON.parse(sessionStorage.getItem('growly_utm') || '{}'); } catch (e) { utm = {}; }
    return {
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      utm_source: utm.utm_source || null,
      utm_medium: utm.utm_medium || null,
      utm_campaign: utm.utm_campaign || null,
      utm_term: utm.utm_term || null,
      utm_content: utm.utm_content || null,
      landing_path: utm.landing_path || window.location.pathname || '/',
      referrer: document.referrer || null
    };
  }

  /* ---------- Analytics: server-side (B-160) + opcjonalny GTM/gtag ---------- */
  function track(event, payload) {
    var data = Object.assign({ event: event, ts: Date.now() }, payload || {});
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(data);
    if (typeof window.gtag === 'function') window.gtag('event', event, payload || {});

    if (!SERVER_EVENTS[event] || !TRACK_ENDPOINT) return;

    var body = Object.assign({}, getAttribution(), payload || {}, { event: event });
    var hp = $('#hpInput');
    body.website = hp ? hp.value : '';

    fetch(TRACK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true
    }).catch(function () { /* analytics nie blokuje UX */ });
  }

  function getFocusable(container) {
    return $all(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      container
    ).filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
  }

  /* =========================================================
     ANIMATED COUNTERS (social proof)
     ========================================================= */
  function getWaitlistCount() {
    var stored = parseInt(localStorage.getItem('growly_waitlist') || '0', 10);
    var joined = localStorage.getItem('growly_joined') === '1' ? 1 : 0;
    return WAITLIST_BASE + (stored || 0) + joined;
  }
  function renderCounters() {
    var n = getWaitlistCount();
    $all('[data-counter]').forEach(function (el) {
      el.textContent = n.toLocaleString('pl-PL');
    });
  }

  /* =========================================================
     MODAL CONTROL (fake-door box)
     ========================================================= */
  var boxModal = $('#boxModal');
  var exitModal = $('#exitModal');
  var lastSource = 'unknown';
  var lastFocused = null;

  function trapFocus(modal) {
    var card = $('.modal__card', modal);
    if (!card) return;
    var focusables = getFocusable(card);
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    card.addEventListener('keydown', function onKey(e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });
  }

  function openBox(source) {
    lastSource = source || 'unknown';
    lastFocused = document.activeElement;
    resetModalSteps();
    boxModal.classList.add('is-open');
    boxModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    track('cta_click_starter_box', { source: lastSource });
    var input = $('#emailInput');
    setTimeout(function () { if (input) input.focus(); }, 120);
  }
  function closeBox() {
    boxModal.classList.remove('is-open');
    boxModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }
  function resetModalSteps() {
    showStep(1);
  }
  function showStep(n) {
    $all('.modal__step', boxModal).forEach(function (step) {
      step.hidden = parseInt(step.getAttribute('data-step'), 10) !== n;
    });
  }

  function openExit() {
    if (sessionStorage.getItem('growly_exit_shown') === '1') return;
    if (localStorage.getItem('growly_joined') === '1') return;
    if (boxModal.classList.contains('is-open')) return;
    sessionStorage.setItem('growly_exit_shown', '1');
    exitModal.classList.add('is-open');
    exitModal.setAttribute('aria-hidden', 'false');
  }
  function closeExit() {
    exitModal.classList.remove('is-open');
    exitModal.setAttribute('aria-hidden', 'true');
  }

  /* ---------- Open triggers: KAŻDY przycisk z .js-open-box ---------- */
  document.addEventListener('click', function (e) {
    var opener = e.target.closest('.js-open-box');
    if (opener) {
      if (opener.hasAttribute('data-close-exit')) closeExit();
      openBox(opener.getAttribute('data-source'));
      return;
    }
    if (e.target.closest('[data-close-modal]')) { closeBox(); return; }
    if (e.target.closest('[data-close-exit]')) { closeExit(); return; }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeBox(); closeExit(); }
  });

  /* =========================================================
     STEP 1 — Email capture
     ========================================================= */
  var boxForm = $('#boxForm');
  if (boxForm) {
    boxForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('#emailInput');
      var error = $('#emailError');
      var email = (input.value || '').trim();
      var valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (!valid) {
        input.classList.add('is-invalid');
        error.classList.add('is-shown');
        input.focus();
        return;
      }
      input.classList.remove('is-invalid');
      error.classList.remove('is-shown');

      persistLead({ email: email, source: lastSource });
      localStorage.setItem('growly_email', email);
      localStorage.setItem('growly_joined', '1');
      localStorage.setItem('growly_waitlist', String((parseInt(localStorage.getItem('growly_waitlist') || '0', 10)) + 1));

      track('email_submitted', { source: lastSource });
      renderCounters();

      var pos = getWaitlistCount() + 1;
      var posEl = $('#queuePos');
      if (posEl) posEl.textContent = '#' + pos.toLocaleString('pl-PL');

      showStep(2);
    });
  }

  /* =========================================================
     STEP 2 — Research question
     ========================================================= */
  var questionForm = $('#questionForm');
  if (questionForm) {
    questionForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var picked = $('input[name="reason"]:checked', questionForm);
      var reason = picked ? picked.value : 'skipped';
      persistLead({ email: localStorage.getItem('growly_email'), reason: reason, source: lastSource });
      track('post_signup_question_answered', { reason: reason, source: lastSource });
      showStep(3);
    });
  }
  var skipBtn = $('[data-skip-question]');
  if (skipBtn) {
    skipBtn.addEventListener('click', function () {
      persistLead({ reason: 'skipped', source: lastSource });
      track('post_signup_question_answered', { reason: 'skipped', source: lastSource });
      showStep(3);
    });
  }

  /* =========================================================
     STEP 3 — Referral loop (pętla marketingowa)
     ========================================================= */
  var shareUrl = window.location.origin + window.location.pathname;
  var shareText = 'Znalazłem/am Growly — pierwszy box dla osób, które myślą, że nie mają ręki do roślin 🌱 Zapisz się na start:';

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-share]');
    if (!btn) return;
    var kind = btn.getAttribute('data-share');

    if (kind === 'wa') {
      window.open('https://wa.me/?text=' + encodeURIComponent(shareText + ' ' + shareUrl), '_blank');
    } else if (kind === 'fb') {
      window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl), '_blank');
    } else if (kind === 'copy') {
      var done = function () {
        var c = $('#referralCopied');
        if (c) { c.hidden = false; setTimeout(function () { c.hidden = true; }, 2500); }
      };
      if (navigator.clipboard) navigator.clipboard.writeText(shareUrl).then(done, done);
      else done();
    }
  });

  /* =========================================================
     PERSIST LEAD (Supabase Edge Function + lokalny fallback)
     ========================================================= */
  function persistLead(lead) {
    try {
      var leads = JSON.parse(localStorage.getItem('growly_leads') || '[]');
      leads.push(Object.assign({ t: Date.now() }, lead));
      localStorage.setItem('growly_leads', JSON.stringify(leads));
    } catch (err) { /* noop */ }

    if (!SIGNUP_ENDPOINT) return Promise.resolve();
    var hp = $('#hpInput');
    var payload = Object.assign({}, getAttribution(), {
      email: lead.email || null,
      reason: lead.reason || null,
      source: lead.source || null,
      website: hp ? hp.value : ''
    });
    return fetch(SIGNUP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(function () { /* fake-door: błąd sieci nie blokuje flow użytkownika */ });
  }

  /* =========================================================
     MARKETING LOOPS: sticky nav, floating CTA, exit intent
     ========================================================= */
  var nav = $('#nav');
  var floatingCta = $('#floatingCta');

  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    if (nav) nav.classList.toggle('is-stuck', y > 12);
    if (floatingCta) floatingCta.classList.toggle('is-visible', y > 700);
  }, { passive: true });

  document.addEventListener('mouseout', function (e) {
    if (!e.relatedTarget && e.clientY <= 0) openExit();
  });

  var announce = $('#announce');
  var announceClose = $('#announceClose');
  if (sessionStorage.getItem('growly_announce_closed') === '1' && announce) {
    announce.classList.add('is-hidden');
  }
  if (announceClose) {
    announceClose.addEventListener('click', function () {
      announce.classList.add('is-hidden');
      sessionStorage.setItem('growly_announce_closed', '1');
    });
  }

  /* =========================================================
     REVEAL ON SCROLL
     ========================================================= */
  var revealEls = $all('.section > .container, .hero__inner');
  revealEls.forEach(function (el) { el.classList.add('reveal'); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* =========================================================
     INIT
     ========================================================= */
  captureUtm();
  trapFocus(boxModal);
  trapFocus(exitModal);
  renderCounters();
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  track('lp_view', { ref: document.referrer || 'direct' });

})();
