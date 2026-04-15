/**
 * nav.js — Navbar active-link, auth-aware user slot, profile dropdown,
 *           and step indicator renderer.
 *
 * Included on every page as <script src="[../]js/nav.js" type="module">
 * The navbar HTML must contain an empty <div id="navbar__user-slot"></div>
 * instead of hardcoded avatar markup.
 */

// ─── Path helpers ────────────────────────────────────────────────────────────

const inPages = window.location.pathname.includes('/pages/');
const root    = inPages ? '../' : '';
const pages   = inPages ? '' : 'pages/';

// ─── Active nav link ─────────────────────────────────────────────────────────

(function highlightActiveNav() {
  const links   = document.querySelectorAll('.navbar__nav a');
  const current = window.location.pathname;

  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const linkPath = new URL(href, window.location.href).pathname;
    if (
      linkPath === current ||
      (current === '/' && href === 'index.html') ||
      (current.endsWith('/index.html') && href === 'index.html')
    ) {
      link.classList.add('active');
    }
  });
})();

// ─── Auth-aware navbar user slot ─────────────────────────────────────────────

(function renderNavbarUser() {
  const slot = document.getElementById('navbar__user-slot');
  if (!slot) return;

  // Read session
  let user = null;
  try {
    const raw = localStorage.getItem('mediscan_user');
    if (raw) user = JSON.parse(raw);
  } catch (_) {}

  if (!user) {
    // ── Not logged in → show Sign In + Get Started ──────────────────────────
    slot.innerHTML = `
      <div class="navbar__auth-btns">
        <a href="${pages}login.html" class="btn btn-ghost btn-sm">Sign In</a>
        <a href="${pages}signup.html" class="btn btn-primary btn-sm">Get Started</a>
      </div>`;
    return;
  }

  // ── Logged in → show avatar + dropdown ─────────────────────────────────────
  const initials = user.initials
    || (user.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'U');
  const firstName = user.name ? user.name.split(' ')[0] : 'User';

  slot.innerHTML = `
    <div class="navbar__avatar" id="navAvatar" role="button"
         aria-haspopup="true" aria-expanded="false" tabindex="0"
         aria-label="User account: ${firstName}">
      <div class="navbar__avatar-circle" aria-hidden="true">${initials}</div>
      <span class="navbar__avatar-name">${firstName}</span>

      <div class="profile-dropdown" id="profileDropdown" role="menu">
        <div class="profile-dropdown__header">
          <div class="profile-dropdown__avatar-lg">${initials}</div>
          <div>
            <p class="profile-dropdown__name">${user.name || 'User'}</p>
            <p class="profile-dropdown__email">${user.email || ''}</p>
          </div>
        </div>
        <div class="profile-dropdown__divider"></div>
        <a class="profile-dropdown__item" href="${pages}health-history.html" role="menuitem">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          Health History
        </a>
        <a class="profile-dropdown__item" href="${pages}upload.html" role="menuitem">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Upload Report
        </a>
        <a class="profile-dropdown__item" href="${pages}symptoms.html" role="menuitem">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          Symptom Checker
        </a>
        <div class="profile-dropdown__divider"></div>
        <button class="profile-dropdown__item profile-dropdown__item--danger"
                id="profileSignOut" role="menuitem" type="button">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign Out
        </button>
      </div>
    </div>`;

  const avatar   = document.getElementById('navAvatar');
  const dropdown = document.getElementById('profileDropdown');

  function open()   { dropdown.classList.add('profile-dropdown--open');    avatar.setAttribute('aria-expanded', 'true');  }
  function close()  { dropdown.classList.remove('profile-dropdown--open'); avatar.setAttribute('aria-expanded', 'false'); }
  function toggle() { dropdown.classList.contains('profile-dropdown--open') ? close() : open(); }

  avatar.addEventListener('click',   (e) => { e.stopPropagation(); toggle(); });
  avatar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    if (e.key === 'Escape') close();
  });
  document.addEventListener('click', close);
  dropdown.addEventListener('click', (e) => e.stopPropagation());

  document.getElementById('profileSignOut').addEventListener('click', () => {
    localStorage.removeItem('mediscan_user');
    localStorage.removeItem('mediscan_session');
    sessionStorage.removeItem('mediscan_session_only');
    window.location.href = `${root}pages/login.html`;
  });
})();

// ─── Step Indicator ──────────────────────────────────────────────────────────

/**
 * @param {string|HTMLElement} container
 * @param {string[]} steps
 * @param {number}   currentStep  1-based
 */
export function renderStepIndicator(container, steps, currentStep) {
  const el = typeof container === 'string'
    ? document.querySelector(container)
    : container;
  if (!el) return;

  const checkSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"/></svg>`;

  let html = '';
  steps.forEach((label, i) => {
    const n = i + 1;
    const state = n < currentStep ? 'step--completed'
                : n === currentStep ? 'step--active'
                : 'step--inactive';
    const content = n < currentStep ? checkSVG : n;

    html += `<div class="step ${state}" aria-label="Step ${n}: ${label}">
      <div class="step__circle">${content}</div>
      <span class="step__label">${label}</span>
    </div>`;

    if (i < steps.length - 1) {
      const done = n < currentStep ? 'step__connector--completed' : '';
      html += `<div class="step__connector ${done}" aria-hidden="true"></div>`;
    }
  });

  el.innerHTML = html;
  el.classList.add('steps');
}
