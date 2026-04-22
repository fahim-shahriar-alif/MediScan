/**
 * firebase.js — Firebase initialization for MediScan
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const firebaseConfig = {
  apiKey:            'AIzaSyDzOEZEaSzws_u909SrLluWaehQBRr1PGE',
  authDomain:        'mediscan-5534e.firebaseapp.com',
  projectId:         'mediscan-5534e',
  storageBucket:     'mediscan-5534e.firebasestorage.app',
  messagingSenderId: '787691091795',
  appId:             '1:787691091795:web:65b2cd16e5862efad853a6',
  measurementId:     'G-Y5NRTGXZYS',
};

const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const provider = new GoogleAuthProvider();

export {
  auth,
  provider,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
};
