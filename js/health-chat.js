/**
 * health-chat.js — AI Health Chat for MediScan
 * Context-aware chat using the user's latest analysis and symptom data.
 */

const CONFIG  = window.CONFIG || {};
const API_URL = CONFIG.API_URL || 'https://mediscan-gf5j.onrender.com';

// ─── Load user health context ──────────────────────────────────────────────
function loadContext() {
  try {
    const analysis = JSON.parse(localStorage.getItem('analysisResult') || 'null');
    const symptoms = JSON.parse(localStorage.getItem('symptomResult')  || 'null');
    const symData  = JSON.parse(localStorage.getItem('symptomData')    || 'null');
    return { analysis, symptoms, symData };
  } catch { return {}; }
}

const ctx = loadContext();

// ─── Build system prompt ───────────────────────────────────────────────────
function buildSystemPrompt() {
  const lines = [
    'You are MediScan AI, a helpful and empathetic health assistant.',
    'You provide clear, accurate, and easy-to-understand health information.',
    'You always remind users to consult a qualified doctor for diagnosis or treatment.',
    'Keep responses concise — 2-4 short paragraphs max unless more detail is needed.',
    'Use plain language, avoid excessive medical jargon.',
    '',
    'IMPORTANT: You are NOT a doctor. Never diagnose. Always recommend professional consultation for serious concerns.',
  ];

  if (ctx.analysis?.source === 'ai_analysis') {
    lines.push('', '--- PATIENT\'S RECENT MEDICAL REPORT ANALYSIS ---');
    if (ctx.analysis.summary)   lines.push(`Summary: ${ctx.analysis.summary}`);
    if (ctx.analysis.status)    lines.push(`Status: ${ctx.analysis.status}`);
    if (ctx.analysis.nextSteps) lines.push(`Recommended next steps: ${ctx.analysis.nextSteps}`);
    if (ctx.analysis.metrics?.length) {
      lines.push('Key metrics:');
      ctx.analysis.metrics.forEach(m => {
        lines.push(`  - ${m.name}: ${m.value} ${m.unit} (${m.status}, normal: ${m.normalRange})`);
      });
    }
    if (ctx.analysis.diseases?.length) {
      lines.push('Detected conditions:');
      ctx.analysis.diseases.forEach(d => {
        lines.push(`  - ${d.name} (${d.likelihood} likelihood): ${d.description}`);
      });
    }
  }

  if (ctx.symptoms?.urgency) {
    lines.push('', '--- PATIENT\'S RECENT SYMPTOM CHECK ---');
    if (ctx.symData?.symptoms?.length) lines.push(`Symptoms: ${ctx.symData.symptoms.join(', ')}`);
    if (ctx.symData?.painLevel !== undefined) lines.push(`Pain level: ${ctx.symData.painLevel}/10`);
    lines.push(`Urgency: ${ctx.symptoms.urgencyTitle || ctx.symptoms.urgency}`);
    if (ctx.symptoms.conditions?.length) {
      lines.push('Possible conditions:');
      ctx.symptoms.conditions.forEach(c => lines.push(`  - ${c.name} (${c.match}% match)`));
    }
  }

  return lines.join('\n');
}

// ─── Chat state ────────────────────────────────────────────────────────────
const messages = []; // { role: 'user'|'assistant', content: string }
const systemPrompt = buildSystemPrompt();

// ─── DOM refs ──────────────────────────────────────────────────────────────
const chatMessages = document.getElementById('chatMessages');
const chatInput    = document.getElementById('chatInput');
const sendBtn      = document.getElementById('sendBtn');

// ─── Render context sidebar ────────────────────────────────────────────────
function renderContextSidebar() {
  const summary = document.getElementById('contextSummary');
  const parts   = [];

  if (ctx.analysis?.source === 'ai_analysis') {
    parts.push(`
      <div class="chat-context-item">
        <span class="chat-context-item__icon">🔬</span>
        <div>
          <p class="chat-context-item__label">Latest Report</p>
          <p class="chat-context-item__value">${ctx.analysis.status || 'Analyzed'}</p>
        </div>
      </div>`);
  }

  if (ctx.symptoms?.urgency) {
    parts.push(`
      <div class="chat-context-item">
        <span class="chat-context-item__icon">🩺</span>
        <div>
          <p class="chat-context-item__label">Symptom Check</p>
          <p class="chat-context-item__value">${ctx.symptoms.urgency} urgency</p>
        </div>
      </div>`);
  }

  if (parts.length) summary.innerHTML = parts.join('');

  // Suggestions
  const suggestions = buildSuggestions();
  const list = document.getElementById('suggestionsList');
  list.innerHTML = suggestions.map(q => `
    <button class="chat-suggestion" type="button" data-q="${q.replace(/"/g, '&quot;')}">${q}</button>
  `).join('');

  list.querySelectorAll('.chat-suggestion').forEach(btn => {
    btn.addEventListener('click', () => {
      chatInput.value = btn.dataset.q;
      sendMessage();
    });
  });
}

function buildSuggestions() {
  const base = [
    'What should I eat to stay healthy?',
    'How much water should I drink daily?',
    'What are signs I should see a doctor urgently?',
  ];

  const contextual = [];
  if (ctx.analysis?.metrics?.length) {
    const abnormal = ctx.analysis.metrics.filter(m => m.status !== 'Normal');
    if (abnormal.length) {
      contextual.push(`What does ${abnormal[0].status.toLowerCase()} ${abnormal[0].name} mean?`);
    }
  }
  if (ctx.analysis?.diseases?.length) {
    contextual.push(`Tell me more about ${ctx.analysis.diseases[0].name}`);
  }
  if (ctx.symData?.symptoms?.length) {
    contextual.push(`Why do I have ${ctx.symData.symptoms[0].toLowerCase()}?`);
  }
  if (ctx.analysis?.specialistType) {
    contextual.push(`Why do I need a ${ctx.analysis.specialistType}?`);
  }

  return [...contextual.slice(0, 3), ...base].slice(0, 5);
}

// ─── Render welcome message ────────────────────────────────────────────────
function renderWelcome() {
  const hasContext = ctx.analysis?.source === 'ai_analysis' || ctx.symptoms?.urgency;
  const text = hasContext
    ? `Hello! I've loaded your recent health data. I can answer questions about your results, explain what your metrics mean, or help with general health questions. What would you like to know?`
    : `Hello! I'm your MediScan AI health assistant. I can answer general health questions, explain medical terms, or help you understand symptoms. For personalized answers, upload a medical report or complete a symptom check first.`;

  appendMessage('assistant', text);
}

// ─── Append message to UI ──────────────────────────────────────────────────
function appendMessage(role, content) {
  const isUser = role === 'user';
  const div = document.createElement('div');
  div.className = `chat-msg chat-msg--${role}`;
  div.innerHTML = `
    <div class="chat-msg__avatar" aria-hidden="true">
      ${isUser
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'}
    </div>
    <div class="chat-msg__bubble">
      <p class="chat-msg__text">${formatMessage(content)}</p>
    </div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function appendTyping() {
  const div = document.createElement('div');
  div.className = 'chat-msg chat-msg--assistant chat-msg--typing';
  div.id = 'typingIndicator';
  div.innerHTML = `
    <div class="chat-msg__avatar" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
    </div>
    <div class="chat-msg__bubble">
      <div class="chat-typing">
        <span></span><span></span><span></span>
      </div>
    </div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTyping() {
  document.getElementById('typingIndicator')?.remove();
}

// Format message — convert **bold** and newlines
function formatMessage(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

// ─── Send message ──────────────────────────────────────────────────────────
async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  chatInput.value = '';
  chatInput.style.height = 'auto';
  sendBtn.disabled = true;

  // Add to UI and history
  appendMessage('user', text);
  messages.push({ role: 'user', content: text });

  appendTyping();

  try {
    const reply = await callGroq();
    removeTyping();
    appendMessage('assistant', reply);
    messages.push({ role: 'assistant', content: reply });
  } catch (err) {
    removeTyping();
    appendMessage('assistant', `Sorry, I couldn't process that. ${err.message}`);
  }

  sendBtn.disabled = false;
  chatInput.focus();
}

// ─── Groq API ──────────────────────────────────────────────────────────────
async function callGroq() {
  const res = await fetch(`${API_URL}/api/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ messages: messages.slice(-10), systemPrompt }),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Server error');
  return data.reply;
}

// ─── Input auto-resize ─────────────────────────────────────────────────────
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
});

chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener('click', sendMessage);

// ─── Clear chat ────────────────────────────────────────────────────────────
document.getElementById('clearChatBtn').addEventListener('click', () => {
  messages.length = 0;
  chatMessages.innerHTML = '';
  renderWelcome();
});

// ─── Init ──────────────────────────────────────────────────────────────────
renderContextSidebar();
renderWelcome();
