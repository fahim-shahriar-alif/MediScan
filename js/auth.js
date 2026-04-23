/**
 * auth.js — Firebase Authentication for MediScan
 * Supports: Google Sign-In, Email/Password
 */

import {
  auth,
  provider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  db,
  doc,
  setDoc,
  serverTimestamp,
} from './firebase.js';

// ─── Session helpers ────────────────────────────────────────────────────────

const AUTH_KEY = 'mediscan_user';

export function getUser() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setUser(user) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

function clearUser() {
  localStorage.removeItem(AUTH_KEY);
}

export function isLoggedIn() {
  return !!getUser();
}

// ─── Map Firebase user → app user ──────────────────────────────────────────

function mapUser(firebaseUser) {
  // Priority: displayName → email prefix → 'User'
  const rawName = firebaseUser.displayName
    || firebaseUser.email?.split('@')[0]?.replace(/[._]/g, ' ')
    || 'User';

  // Capitalize each word
  const name = rawName.replace(/\b\w/g, c => c.toUpperCase());

  return {
    id:        firebaseUser.uid,
    name,
    email:     firebaseUser.email,
    avatar:    firebaseUser.photoURL || null,
    initials:  name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
    provider:  firebaseUser.providerData?.[0]?.providerId || 'email',
    createdAt: firebaseUser.metadata?.creationTime || new Date().toISOString(),
  };
}

// ─── Sync user profile to Firestore ────────────────────────────────────────
// Upserts users/{uid} so the admin panel can see all registered patients.
// Uses merge:true so it never overwrites existing sub-collections or fields.

async function syncUserToFirestore(firebaseUser, overrideName) {
  try {
    const rawName = overrideName
      || firebaseUser.displayName
      || firebaseUser.email?.split('@')[0]?.replace(/[._]/g, ' ')
      || 'User';
    const name = rawName.replace(/\b\w/g, c => c.toUpperCase());

    await setDoc(
      doc(db, 'users', firebaseUser.uid),
      {
        displayName: name,
        email:       firebaseUser.email,
        photoURL:    firebaseUser.photoURL || null,
        provider:    firebaseUser.providerData?.[0]?.providerId || 'email',
        createdAt:   firebaseUser.metadata?.creationTime || new Date().toISOString(),
        lastSeen:    serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    // Non-fatal — don't block the login flow
    console.warn('Could not sync user to Firestore:', err);
  }
}

// ─── Auth state listener ────────────────────────────────────────────────────

onAuthStateChanged(auth, (firebaseUser) => {
  if (firebaseUser) {
    setUser(mapUser(firebaseUser));
  } else {
    // Firebase says no user — clear localStorage too
    clearUser();
  }
});

// ─── Google Sign-In ─────────────────────────────────────────────────────────

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    setUser(mapUser(result.user));
    await syncUserToFirestore(result.user);
    _redirectAfterLogin();
  } catch (err) {
    console.error('Google sign-in failed:', err);
    throw err;
  }
}

// ─── Email / Password Sign-In ───────────────────────────────────────────────

export async function signIn({ email, password }) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    setUser(mapUser(result.user));
    await syncUserToFirestore(result.user);
    return { ok: true, user: mapUser(result.user) };
  } catch (err) {
    return { ok: false, error: _friendlyError(err.code) };
  }
}

// ─── Email / Password Sign-Up ───────────────────────────────────────────────

export async function signUp({ name, email, password }) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    const user = mapUser({ ...result.user, displayName: name });
    setUser(user);
    await syncUserToFirestore(result.user, name);
    return { ok: true, user };
  } catch (err) {
    return { ok: false, error: _friendlyError(err.code) };
  }
}

// ─── Sign Out ───────────────────────────────────────────────────────────────

export async function signOut(redirectTo = '../index.html') {
  try {
    await firebaseSignOut(auth);
  } catch (err) {
    console.error('Firebase signout error:', err);
  }
  clearUser();
  // Clear all mediscan data from localStorage
  Object.keys(localStorage)
    .filter(k => k.startsWith('mediscan'))
    .forEach(k => localStorage.removeItem(k));
  window.location.href = redirectTo;
}

// ─── Redirect after login ───────────────────────────────────────────────────

export function _redirectAfterLogin() {
  const returnTo = sessionStorage.getItem('mediscan_return_to');
  sessionStorage.removeItem('mediscan_return_to');
  if (returnTo) {
    window.location.href = returnTo;
  } else {
    const inPages = window.location.pathname.includes('/pages/');
    window.location.href = inPages ? '../index.html' : 'index.html';
  }
}

// ─── Route guard ────────────────────────────────────────────────────────────

export function requireAuth() {
  if (!isLoggedIn()) {
    sessionStorage.setItem('mediscan_return_to', window.location.href);
    document.documentElement.style.visibility = 'hidden';
    const inPages = window.location.pathname.includes('/pages/');
    window.location.replace((inPages ? '' : 'pages/') + 'login.html');
  }
}

// ─── Navbar update ──────────────────────────────────────────────────────────

export function updateNavbarUser() {
  const user = getUser();
  if (!user) return;

  const circle  = document.querySelector('.navbar__avatar-circle');
  const name    = document.querySelector('.navbar__avatar-name');
  const plName  = document.querySelector('.profile-dropdown__name');
  const plEmail = document.querySelector('.profile-dropdown__email');
  const plAvatar = document.querySelector('.profile-dropdown__avatar-lg');

  if (circle)   circle.textContent  = user.initials || 'U';
  if (name)     name.textContent    = user.name?.split(' ')[0] || 'User';
  if (plName)   plName.textContent  = user.name || 'User';
  if (plEmail)  plEmail.textContent = user.email || '';
  if (plAvatar) plAvatar.textContent = user.initials || 'U';
}

// ─── Friendly error messages ────────────────────────────────────────────────

function _friendlyError(code) {
  const map = {
    'auth/user-not-found':       'No account found with this email.',
    'auth/wrong-password':       'Incorrect password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password':        'Password must be at least 6 characters.',
    'auth/invalid-email':        'Please enter a valid email address.',
    'auth/too-many-requests':    'Too many attempts. Please try again later.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed.',
    'auth/invalid-credential':   'Invalid email or password.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}
