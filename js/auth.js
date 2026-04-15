/**
 * auth.js — Authentication logic for MediScan.
 * Uses localStorage for session persistence.
 * Supports: email/password, Google OAuth, GitHub OAuth.
 */

// ─── Constants ─────────────────────────────────────────────────────────────

const AUTH_KEY   = 'mediscan_user';
const SESSION_KEY = 'mediscan_session';

// ─── Session helpers ────────────────────────────────────────────────────────

export function getUser() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setUser(user) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  localStorage.setItem(SESSION_KEY, Date.now().toString());
}

export function clearUser() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function isLoggedIn() {
  return !!getUser();
}

// ─── Registered users store (localStorage-based) ───────────────────────────

function getRegisteredUsers() {
  try {
    return JSON.parse(localStorage.getItem('mediscan_users') || '[]');
  } catch { return []; }
}

function saveRegisteredUsers(users) {
  localStorage.setItem('mediscan_users', JSON.stringify(users));
}

// ─── Email / Password Auth ──────────────────────────────────────────────────

export function signUp({ name, email, password }) {
  const users = getRegisteredUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false, error: 'An account with this email already exists.' };
  }
  const user = {
    id: 'user_' + Date.now(),
    name,
    email,
    initials: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
    provider: 'email',
    createdAt: new Date().toISOString(),
    // NOTE: In production, NEVER store plain-text passwords.
    // This is a demo-only implementation.
    _pw: btoa(password),
  };
  users.push(user);
  saveRegisteredUsers(users);
  const { _pw, ...safeUser } = user;
  setUser(safeUser);
  return { ok: true, user: safeUser };
}

export function signIn({ email, password, remember }) {
  const users = getRegisteredUsers();
  const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!found) {
    return { ok: false, error: 'No account found with this email.' };
  }
  if (found._pw !== btoa(password)) {
    return { ok: false, error: 'Incorrect password.' };
  }
  const { _pw, ...safeUser } = found;
  setUser(safeUser);
  if (!remember) {
    // Mark as session-only (cleared on tab close via sessionStorage flag)
    sessionStorage.setItem('mediscan_session_only', '1');
  }
  return { ok: true, user: safeUser };
}

export function signOut(redirectTo = '../index.html') {
  clearUser();
  sessionStorage.removeItem('mediscan_session_only');
  window.location.href = redirectTo;
}

// ─── Password reset (demo — shows token in UI) ─────────────────────────────

export function requestPasswordReset(email) {
  const users = getRegisteredUsers();
  const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!found) {
    // Don't reveal whether email exists — always return ok
    return { ok: true };
  }
  // In production this would send an email. Here we store a token.
  const token = Math.random().toString(36).slice(2, 10).toUpperCase();
  const resets = JSON.parse(localStorage.getItem('mediscan_resets') || '{}');
  resets[token] = { email, expires: Date.now() + 15 * 60 * 1000 };
  localStorage.setItem('mediscan_resets', JSON.stringify(resets));
  return { ok: true, _demoToken: token }; // only shown in demo UI
}

// ─── Google OAuth ───────────────────────────────────────────────────────────

export function signInWithGoogle() {
  // Uses Google Identity Services (GSI) popup flow.
  // Requires the GSI script and a real Client ID in config.js:
  //   CONFIG.GOOGLE_CLIENT_ID = 'your-client-id.apps.googleusercontent.com'
  if (typeof google === 'undefined' || !CONFIG?.GOOGLE_CLIENT_ID) {
    _showOAuthFallback('Google');
    return;
  }
  google.accounts.id.initialize({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    callback: (response) => _handleGoogleCredential(response.credential),
  });
  google.accounts.id.prompt();
}

function _handleGoogleCredential(credential) {
  // Decode the JWT payload (no verification needed client-side for demo)
  try {
    const payload = JSON.parse(atob(credential.split('.')[1]));
    const user = {
      id: 'google_' + payload.sub,
      name: payload.name,
      email: payload.email,
      initials: payload.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      avatar: payload.picture,
      provider: 'google',
      createdAt: new Date().toISOString(),
    };
    setUser(user);
    _redirectAfterLogin();
  } catch (e) {
    console.error('Google credential parse failed:', e);
  }
}

// ─── GitHub OAuth ───────────────────────────────────────────────────────────

export function signInWithGitHub() {
  // GitHub OAuth requires a server-side callback to exchange the code for a token.
  // For a pure frontend demo, we redirect to GitHub and handle the callback.
  if (!CONFIG?.GITHUB_CLIENT_ID) {
    _showOAuthFallback('GitHub');
    return;
  }
  const params = new URLSearchParams({
    client_id: CONFIG.GITHUB_CLIENT_ID,
    redirect_uri: window.location.origin + '/pages/auth-callback.html',
    scope: 'user:email',
    state: Math.random().toString(36).slice(2),
  });
  window.location.href = `https://github.com/login/oauth/authorize?${params}`;
}

// ─── Redirect after login ───────────────────────────────────────────────────

export function _redirectAfterLogin() {
  const inPages = window.location.pathname.includes('/pages/');
  const returnTo = sessionStorage.getItem('mediscan_return_to');
  sessionStorage.removeItem('mediscan_return_to');
  if (returnTo) {
    window.location.href = returnTo;
  } else {
    window.location.href = inPages ? '../index.html' : 'index.html';
  }
}

// ─── Route guard — call on protected pages ──────────────────────────────────

export function requireAuth() {
  if (!isLoggedIn()) {
    // Save where the user was trying to go
    sessionStorage.setItem('mediscan_return_to', window.location.href);

    // Show a full-page overlay so there's no blank flash during redirect
    document.documentElement.style.visibility = 'hidden';

    const inPages = window.location.pathname.includes('/pages/');
    window.location.replace((inPages ? '' : 'pages/') + 'login.html');
  }
}

// ─── OAuth fallback (no client ID configured) ───────────────────────────────

function _showOAuthFallback(provider) {
  // Create a demo user for testing when OAuth isn't configured
  const demoUser = {
    id: provider.toLowerCase() + '_demo_' + Date.now(),
    name: 'Demo User',
    email: 'demo@mediscan.health',
    initials: 'DU',
    provider: provider.toLowerCase(),
    createdAt: new Date().toISOString(),
  };
  setUser(demoUser);
  _redirectAfterLogin();
}

// ─── Update navbar with real user data ─────────────────────────────────────

export function updateNavbarUser() {
  const user = getUser();
  if (!user) return;

  const circle = document.querySelector('.navbar__avatar-circle');
  const name   = document.querySelector('.navbar__avatar-name');
  const plName = document.querySelector('.profile-dropdown__name');
  const plEmail = document.querySelector('.profile-dropdown__email');
  const plAvatar = document.querySelector('.profile-dropdown__avatar-lg');

  if (circle)   circle.textContent = user.initials || 'U';
  if (name)     name.textContent   = user.name?.split(' ')[0] || 'User';
  if (plName)   plName.textContent = user.name || 'User';
  if (plEmail)  plEmail.textContent = user.email || '';
  if (plAvatar) plAvatar.textContent = user.initials || 'U';
}
