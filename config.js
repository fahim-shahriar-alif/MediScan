/**
 * config.js — Application configuration.
 * This file is gitignored. Add your API keys below.
 *
 * Both keys come from the same Google Cloud project:
 *   console.cloud.google.com → APIs & Services → Credentials
 *
 * Enable these two APIs in your project:
 *   1. Cloud Vision API  (for OCR on medical report images)
 *   2. Generative Language API  (for Gemini AI analysis)
 *
 * SECURITY: Restrict both keys to HTTP referrers (your domain) in GCP Console.
 */
const CONFIG = {
  // Groq API — Free, fast, supports image analysis
  // Get your free key at: https://console.groq.com
  GROQ_API_KEY: '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',

  // Gemini API (backup)
  GOOGLE_GEMINI_API_KEY: 'AIzaSyCH3udCCXN5ynozX70FwG7MUoBinKYbG3k',
  GOOGLE_GEMINI_MODEL:   'gemini-1.5-flash',

  // OAuth (existing)
  GOOGLE_CLIENT_ID:  '',
  GITHUB_CLIENT_ID:  '',
};

// Make available globally for non-module scripts AND as a module export
window.CONFIG = CONFIG;