/**
 * db.js — Firestore database operations for MediScan
 *
 * Structure:
 *   users/{userId}/history    — health history entries
 *   users/{userId}/analyses   — report analysis results
 *   users/{userId}/symptoms   — symptom check results
 */

import {
  db,
  auth,
  collection, addDoc, getDocs, doc, setDoc, deleteDoc,
  query, orderBy, serverTimestamp,
} from './firebase.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getUserId() {
  const user = auth.currentUser;
  if (!user?.uid) {
    console.error('auth.currentUser is null — Firebase Auth not ready');
    throw new Error('User not logged in');
  }
  return user.uid;
}

function userCol(subCollection) {
  return collection(db, 'users', getUserId(), subCollection);
}

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH HISTORY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Save a health history entry to Firestore
 * @param {object} entry - { type, title, description, badge, badgeColor, link }
 */
export async function saveHistoryEntry(entry) {
  try {
    const col = userCol('history');
    await addDoc(col, {
      ...entry,
      createdAt: serverTimestamp(),
      date: new Date().toISOString(),
    });
    console.log('✅ History entry saved to Firestore');
  } catch (err) {
    console.error('❌ Failed to save history entry:', err);
  }
}

/**
 * Load all health history entries for the current user
 * @returns {Promise<Array>}
 */
export async function loadHistory() {
  try {
    const col = userCol('history');
    const q   = query(col, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('❌ Failed to load history:', err);
    return [];
  }
}

/**
 * Delete a history entry
 */
export async function deleteHistoryEntry(entryId) {
  try {
    await deleteDoc(doc(db, 'users', getUserId(), 'history', entryId));
  } catch (err) {
    console.error('❌ Failed to delete history entry:', err);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ANALYSIS RESULTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Save a report analysis result to Firestore
 */
export async function saveAnalysis(result, fileName) {
  try {
    const col = userCol('analyses');
    const docRef = await addDoc(col, {
      ...result,
      fileName: fileName || 'report',
      savedAt: serverTimestamp(),
    });

    // Also save to history
    await saveHistoryEntry({
      type:        'scan',
      title:       'Blood Work Analysis',
      description: result.summary || 'Medical report analyzed by AI.',
      badge:       'Report Scan',
      badgeColor:  'primary',
      link:        'analysis.html',
      analysisId:  docRef.id,
    });

    console.log('✅ Analysis saved to Firestore:', docRef.id);
    return docRef.id;
  } catch (err) {
    console.error('❌ Failed to save analysis:', err);
    return null;
  }
}

/**
 * Load all analyses for the current user
 */
export async function loadAnalyses() {
  try {
    const col  = userCol('analyses');
    const q    = query(col, orderBy('savedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('❌ Failed to load analyses:', err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SYMPTOM RESULTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Save a symptom check result to Firestore
 */
export async function saveSymptomCheck(result, symptomData) {
  try {
    const col = userCol('symptoms');
    const docRef = await addDoc(col, {
      result,
      symptomData,
      savedAt: serverTimestamp(),
    });

    // Also save to history
    const symptoms = symptomData?.symptoms?.join(', ') || 'Various symptoms';
    await saveHistoryEntry({
      type:        'check',
      title:       'AI Symptom Check',
      description: `Reported: ${symptoms}. Assessment: ${result.urgencyTitle || result.urgency || 'Completed'}.`,
      badge:       'Health Check',
      badgeColor:  'warning',
      link:        'symptom-results.html',
      symptomId:   docRef.id,
    });

    console.log('✅ Symptom check saved to Firestore:', docRef.id);
    return docRef.id;
  } catch (err) {
    console.error('❌ Failed to save symptom check:', err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// APPOINTMENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Save an appointment to Firestore
 */
export async function saveAppointment(appointmentData) {
  try {
    const col = userCol('appointments');
    const docRef = await addDoc(col, {
      ...appointmentData,
      savedAt: serverTimestamp(),
    });

    // Also save to history
    await saveHistoryEntry({
      type:        'appointment',
      title:       `Appointment with ${appointmentData.doctorName || 'Specialist'}`,
      description: `${appointmentData.specialty || 'Consultation'} scheduled at ${appointmentData.address || ''}.`,
      badge:       'Appointment',
      badgeColor:  'success',
      link:        'appointment-confirmed.html',
      appointmentId: docRef.id,
    });

    console.log('✅ Appointment saved to Firestore:', docRef.id);
    return docRef.id;
  } catch (err) {
    console.error('❌ Failed to save appointment:', err);
    return null;
  }
}

/**
 * Load all appointments for the current user
 */
export async function loadAppointments() {
  try {
    const col  = userCol('appointments');
    const q    = query(col, orderBy('savedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('❌ Failed to load appointments:', err);
    return [];
  }
}
