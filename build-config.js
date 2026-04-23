/**
 * build-config.js
 * Runs at Netlify build time to generate config.js from environment variables.
 * This keeps API keys out of the git repository.
 */

const fs = require('fs');

const config = `const CONFIG = {
  GROQ_API_KEY:          '${process.env.GROQ_API_KEY || ''}',
  GOOGLE_GEMINI_API_KEY: '${process.env.GOOGLE_GEMINI_API_KEY || ''}',
  GOOGLE_GEMINI_MODEL:   'gemini-1.5-flash',
  GOOGLE_CLIENT_ID:      '${process.env.GOOGLE_CLIENT_ID || ''}',
  GITHUB_CLIENT_ID:      '${process.env.GITHUB_CLIENT_ID || ''}',
};

window.CONFIG = CONFIG;
`;

fs.writeFileSync('config.js', config);
console.log('✅ config.js generated from environment variables');
