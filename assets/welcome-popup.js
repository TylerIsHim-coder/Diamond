(function () {
  'use strict';

  // Endpoint that issues (or re-sends) the one-time welcome code.
  // You can override per-environment by setting window.DIAMOND_WELCOME_API_URL before this script loads.
  var API_URL = (typeof window !== 'undefined' && window.DIAMOND_WELCOME_API_URL)
    ? String(window.DIAMOND_WELCOME_API_URL)
    : 'https://api.diamondbeautystores.com/claim';

  var STORAGE_KEY = 'diamondWelcomeOffer';
  var SHOW_DELAY_MS = 3000;
  var SUCCESS_AUTO_CLOSE_MS = 4500;
  var REQUEST_TIMEOUT_MS = 12000;

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Don't show again if the visitor already signed up or dismissed
  try {
    var existing = localStorage.getItem(STORAGE_KEY);
    if (existing === 'signed-up' || existing === 'dismissed') return;
  } catch (e) {
    // localStorage may be unavailable (private mode, sandbox) — fall through and show once per page load
  }

  var styles = [
    '.dwp-overlay {',
    '  position: fixed; inset: 0; z-index: 70;',
    '  pointer-events: none; visibility: hidden;',
    '  transition: visibility 0s linear 360ms;',
    '}',
    '.dwp-overlay.is-open {',
    '  pointer-events: auto; visibility: visible;',
    '  transition: visibility 0s linear 0s;',
    '}',
    '.dwp-backdrop {',
    '  position: absolute; inset: 0;',
    '  background: rgba(0, 0, 0, 0.55);',
    '  opacity: 0;',
    '  transition: opacity 360ms cubic-bezier(0.32, 0.72, 0, 1);',
    '  will-change: opacity;',
    '}',
    '.dwp-overlay.is-open .dwp-backdrop { opacity: 1; }',
    '.dwp-panel {',
    '  position: absolute; left: 50%; top: 50%;',
    '  transform: translate(-50%, -50%) scale(0.96);',
    '  width: min(28rem, calc(100vw - 2rem));',
    '  background: #FAF9F6;',
    '  color: #1A1A1A;',
    '  border-radius: 1.25rem;',
    '  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.32), 0 0 0 1px rgba(26,26,26,0.04);',
    '  padding: 2.25rem 1.75rem 2rem;',
    '  opacity: 0;',
    '  transition: opacity 360ms cubic-bezier(0.32, 0.72, 0, 1), transform 360ms cubic-bezier(0.32, 0.72, 0, 1);',
    '  will-change: opacity, transform;',
    '}',
    '@media (min-width: 480px) { .dwp-panel { padding: 2.5rem 2.25rem 2.25rem; } }',
    '.dwp-overlay.is-open .dwp-panel {',
    '  transform: translate(-50%, -50%) scale(1);',
    '  opacity: 1;',
    '}',
    '.dwp-close {',
    '  position: absolute; top: 0.85rem; right: 0.85rem;',
    '  width: 2rem; height: 2rem;',
    '  display: inline-flex; align-items: center; justify-content: center;',
    '  border-radius: 999px;',
    '  border: 1px solid rgba(26,26,26,0.18);',
    '  background: transparent; color: #1A1A1A;',
    '  cursor: pointer;',
    '  transition: background-color 200ms ease, border-color 200ms ease;',
    '}',
    '.dwp-close:hover { background: rgba(26,26,26,0.06); border-color: rgba(26,26,26,0.32); }',
    '.dwp-close svg { width: 0.9rem; height: 0.9rem; }',
    '.dwp-eyebrow {',
    '  font-family: Inter, system-ui, sans-serif;',
    '  font-size: 11px; letter-spacing: 0.22em;',
    '  text-transform: uppercase; color: #6B6B6B;',
    '  margin-bottom: 0.85rem;',
    '}',
    '.dwp-headline {',
    '  font-family: "Playfair Display", Georgia, serif;',
    '  font-weight: 600;',
    '  font-size: clamp(1.6rem, 4.2vw, 1.95rem);',
    '  line-height: 1.05; letter-spacing: -0.015em;',
    '  color: #1A1A1A; margin: 0;',
    '}',
    '.dwp-sub {',
    '  font-family: Inter, system-ui, sans-serif;',
    '  font-size: 14.5px; line-height: 1.55;',
    '  color: rgba(58,58,58,0.85);',
    '  margin: 0.85rem 0 1.4rem;',
    '}',
    '.dwp-form { display: flex; flex-direction: column; gap: 0.65rem; }',
    '.dwp-input {',
    '  width: 100%;',
    '  font-family: Inter, system-ui, sans-serif;',
    '  font-size: 15px; color: #1A1A1A;',
    '  background: #FFFFFF;',
    '  border: 1px solid rgba(26,26,26,0.18);',
    '  border-radius: 999px;',
    '  padding: 0.85rem 1.25rem;',
    '  transition: border-color 180ms ease, box-shadow 180ms ease;',
    '}',
    '.dwp-input::placeholder { color: rgba(107,107,107,0.7); }',
    '.dwp-input:focus { outline: none; border-color: #1A1A1A; box-shadow: 0 0 0 3px rgba(224,36,122,0.18); }',
    '.dwp-input:disabled { opacity: 0.6; cursor: not-allowed; }',
    '.dwp-button {',
    '  width: 100%;',
    '  font-family: Inter, system-ui, sans-serif;',
    '  font-size: 14.5px; font-weight: 500; letter-spacing: 0.01em;',
    '  color: #FFFFFF; background: #E0247A;',
    '  border: none; border-radius: 999px;',
    '  padding: 0.95rem 1.25rem;',
    '  cursor: pointer;',
    '  display: inline-flex; align-items: center; justify-content: center; gap: 0.55rem;',
    '  transition: background-color 200ms ease, transform 120ms ease;',
    '}',
    '.dwp-button:hover { background: #BD1A66; }',
    '.dwp-button:active { transform: translateY(1px); }',
    '.dwp-button:disabled { opacity: 0.7; cursor: not-allowed; }',
    '.dwp-spinner {',
    '  width: 1rem; height: 1rem;',
    '  border: 2px solid rgba(255,255,255,0.45);',
    '  border-top-color: #FFFFFF;',
    '  border-radius: 50%;',
    '  animation: dwp-spin 700ms linear infinite;',
    '  display: none;',
    '}',
    '.dwp-button.is-loading .dwp-spinner { display: inline-block; }',
    '@keyframes dwp-spin { to { transform: rotate(360deg); } }',
    '.dwp-message { font-family: Inter, system-ui, sans-serif; font-size: 13px; line-height: 1.5; min-height: 1.1em; margin: 0.15rem 0.25rem 0; }',
    '.dwp-message.is-error { color: #BD1A66; }',
    '.dwp-fineprint {',
    '  font-family: Inter, system-ui, sans-serif;',
    '  font-size: 11.5px; line-height: 1.5;',
    '  color: rgba(107,107,107,0.85);',
    '  margin: 1rem 0 0; text-align: center;',
    '}',
    '.dwp-success { display: none; text-align: center; }',
    '.dwp-success .dwp-check {',
    '  width: 3rem; height: 3rem; margin: 0.25rem auto 1rem;',
    '  border-radius: 999px; background: #E0247A;',
    '  display: inline-flex; align-items: center; justify-content: center;',
    '  color: #FFFFFF;',
    '}',
    '.dwp-success .dwp-check svg { width: 1.5rem; height: 1.5rem; }',
    '.dwp-overlay.is-success .dwp-form, .dwp-overlay.is-success .dwp-eyebrow, .dwp-overlay.is-success .dwp-headline, .dwp-overlay.is-success .dwp-sub, .dwp-overlay.is-success .dwp-fineprint { display: none; }',
    '.dwp-overlay.is-success .dwp-success { display: block; }',
    '@media (prefers-reduced-motion: reduce) {',
    '  .dwp-backdrop, .dwp-panel { transition-duration: 0.001ms !important; }',
    '  .dwp-overlay.is-open .dwp-panel { transform: translate(-50%, -50%) scale(1); }',
    '  .dwp-spinner { animation-duration: 1.4s; }',
    '}'
  ].join('\n');

  var html = [
    '<div class="dwp-overlay" role="dialog" aria-modal="true" aria-labelledby="dwp-headline" aria-hidden="true">',
    '  <div class="dwp-backdrop" data-dwp-close></div>',
    '  <div class="dwp-panel">',
    '    <button type="button" class="dwp-close" data-dwp-close aria-label="Close">',
    '      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    '    </button>',
    '    <p class="dwp-eyebrow">A welcome from Diamond</p>',
    '    <h2 class="dwp-headline" id="dwp-headline">Save 20% on your first order.</h2>',
    '    <p class="dwp-sub">Sign up and we\'ll send a one-time discount code straight to your inbox.</p>',
    '    <form class="dwp-form" novalidate>',
    '      <input class="dwp-input" type="email" name="EMAIL" autocomplete="email" placeholder="Enter your email" required aria-label="Email address" />',
    '      <button class="dwp-button" type="submit">',
    '        <span class="dwp-spinner" aria-hidden="true"></span>',
    '        <span class="dwp-button-label">Send my code</span>',
    '      </button>',
    '      <p class="dwp-message" role="status" aria-live="polite"></p>',
    '    </form>',
    '    <p class="dwp-fineprint">No spam, ever. Unsubscribe anytime.</p>',
    '    <div class="dwp-success" aria-hidden="true">',
    '      <span class="dwp-check" aria-hidden="true">',
    '        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 12 10 17 19 8"/></svg>',
    '      </span>',
    '      <h2 class="dwp-headline">Check your inbox.</h2>',
    '      <p class="dwp-sub" data-dwp-success-msg>Your 20% off code is on its way.</p>',
    '    </div>',
    '  </div>',
    '</div>'
  ].join('\n');

  function inject() {
    var styleEl = document.createElement('style');
    styleEl.setAttribute('data-dwp', '');
    styleEl.appendChild(document.createTextNode(styles));
    document.head.appendChild(styleEl);

    var wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper.firstElementChild);
  }

  function isValidEmail(value) {
    // Simple, permissive RFC-ish check — backend does final validation.
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function setStored(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch (e) { /* noop */ }
  }

  function submitForCode(email, onResult) {
    if (!API_URL) {
      console.warn('[welcome-popup] API_URL is not set. Email captured locally only:', email);
      setTimeout(function () { onResult({ ok: true, status: 'demo' }); }, 450);
      return;
    }

    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var didTimeout = false;
    var timeout = setTimeout(function () {
      didTimeout = true;
      try { if (controller) controller.abort(); } catch (e) {}
    }, REQUEST_TIMEOUT_MS);

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email }),
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      clearTimeout(timeout);
      // Try to parse JSON if present, but don’t depend on it.
      return res.text().then(function (text) {
        var payload = null;
        try { payload = text ? JSON.parse(text) : null; } catch (e) { payload = null; }
        if (!res.ok) {
          var errMsg = (payload && (payload.error || payload.message)) ? String(payload.error || payload.message) : 'Couldn’t send your code. Please try again.';
          onResult({ ok: false, error: errMsg });
          return;
        }
        onResult(payload && typeof payload === 'object' ? payload : { ok: true });
      });
    }).catch(function () {
      clearTimeout(timeout);
      var msg = didTimeout ? 'Network timed out. Please try again.' : 'Couldn’t reach our code service. Please try again.';
      onResult({ ok: false, error: msg });
    });
  }

  function init() {
    inject();

    var overlay = document.querySelector('.dwp-overlay');
    if (!overlay) return;
    var panel = overlay.querySelector('.dwp-panel');
    var form = overlay.querySelector('.dwp-form');
    var input = overlay.querySelector('.dwp-input');
    var button = overlay.querySelector('.dwp-button');
    var buttonLabel = overlay.querySelector('.dwp-button-label');
    var message = overlay.querySelector('.dwp-message');
    var successMsg = overlay.querySelector('[data-dwp-success-msg]');
    var lastFocused = null;

    function open() {
      lastFocused = document.activeElement;
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      // Defer focus until after the entry transition starts so the screen reader announces the dialog
      setTimeout(function () { try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); } }, 60);
    }

    function close(reason) {
      if (!overlay.classList.contains('is-open')) return;
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (reason === 'dismiss' && !overlay.classList.contains('is-success')) {
        setStored('dismissed');
      }
      if (lastFocused && typeof lastFocused.focus === 'function') {
        try { lastFocused.focus({ preventScroll: true }); } catch (e) { lastFocused.focus(); }
      }
    }

    function showError(text) {
      message.textContent = text;
      message.classList.add('is-error');
    }

    function clearError() {
      message.textContent = '';
      message.classList.remove('is-error');
    }

    function setLoading(loading) {
      button.classList.toggle('is-loading', loading);
      button.disabled = loading;
      input.disabled = loading;
      buttonLabel.textContent = loading ? 'Sending…' : 'Send my code';
    }

    overlay.querySelectorAll('[data-dwp-close]').forEach(function (el) {
      el.addEventListener('click', function () { close('dismiss'); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
        close('dismiss');
      }
    });

    // Focus trap inside the panel
    panel.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var focusables = panel.querySelectorAll('input, button, [href], [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    input.addEventListener('input', clearError);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (input.value || '').trim();
      if (!isValidEmail(email)) {
        showError('Please enter a valid email address.');
        input.focus();
        return;
      }
      clearError();
      setLoading(true);

      submitForCode(email, function (data) {
        setLoading(false);
        if (data && data.ok) {
          setStored('signed-up');
          if (successMsg) {
            successMsg.textContent = 'Your 20% off code is on its way to ' + email + '.';
          }
          overlay.classList.add('is-success');
          setTimeout(function () { close('success'); }, SUCCESS_AUTO_CLOSE_MS);
        } else {
          var msg2 = (data && (data.error || data.message)) ? String(data.error || data.message) : 'Something went wrong. Please try again.';
          showError(msg2);
        }
      });
    });

    setTimeout(open, SHOW_DELAY_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
