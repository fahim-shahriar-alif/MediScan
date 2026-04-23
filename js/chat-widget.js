/**
 * chat-widget.js — Floating AI Health Chat widget for MediScan.
 * Injects a chat bubble + popup on every page for logged-in users.
 */

(function () {
  const CONFIG  = window.CONFIG || {};
  const API_URL = CONFIG.API_URL || 'https://mediscan-gf5j.onrender.com';

  // Only show if logged in
  let user = null;
  try { user = JSON.parse(localStorage.getItem('mediscan_user')); } catch (_) {}
  if (!user) return;

  // Load health context — only for the current user
  let ctx = {};
  try {
    const uid = user.id || 'anonymous';
    ctx = {
      // Try user-scoped key first, fall back to generic only if it belongs to this user
      analysis: JSON.parse(localStorage.getItem(`analysisResult_${uid}`) || 'null'),
      symptoms: JSON.parse(localStorage.getItem(`symptomResult_${uid}`)  || 'null'),
      symData:  JSON.parse(localStorage.getItem(`symptomData_${uid}`)    || 'null')
               || JSON.parse(localStorage.getItem('symptomData') || 'null'),
    };
  } catch (_) {}

  // Build system prompt
  function buildSystemPrompt() {
    const lines = [
      'You are MediScan AI, a helpful and empathetic health assistant.',
      'Provide clear, concise health information in 1-3 short paragraphs.',
      'Always remind users to consult a doctor for diagnosis or treatment.',
      'Never diagnose. Use plain language.',
    ];
    if (ctx.analysis?.source === 'ai_analysis') {
      lines.push('', "PATIENT'S RECENT REPORT:");
      if (ctx.analysis.summary) lines.push(`Summary: ${ctx.analysis.summary}`);
      if (ctx.analysis.status)  lines.push(`Status: ${ctx.analysis.status}`);
      if (ctx.analysis.metrics?.length) {
        ctx.analysis.metrics.forEach(m =>
          lines.push(`  - ${m.name}: ${m.value} ${m.unit} (${m.status})`));
      }
    }
    if (ctx.symptoms?.urgency) {
      lines.push('', "PATIENT'S SYMPTOM CHECK:");
      if (ctx.symData?.symptoms?.length) lines.push(`Symptoms: ${ctx.symData.symptoms.join(', ')}`);
      lines.push(`Urgency: ${ctx.symptoms.urgency}`);
    }
    return lines.join('\n');
  }

  const systemPrompt = buildSystemPrompt();
  const messages = [];

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
#chatWidget{position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;font-family:'Inter',sans-serif}
.chat-bubble{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#2563EB,#1D4ED8);border:none;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(37,99,235,.4);transition:transform .2s,box-shadow .2s;position:relative}
.chat-bubble:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(37,99,235,.5)}
.chat-bubble__icon--close{display:none}
.chat-bubble.open .chat-bubble__icon--chat{display:none}
.chat-bubble.open .chat-bubble__icon--close{display:block}
.chat-bubble__badge{position:absolute;top:-4px;right:-4px;width:18px;height:18px;background:#EF4444;border-radius:50%;font-size:.6875rem;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center;border:2px solid #fff}
.chat-popup{position:absolute;bottom:68px;right:0;width:360px;max-height:520px;background:#fff;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.18);display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:scale(.92) translateY(12px);pointer-events:none;transition:opacity .2s,transform .2s;transform-origin:bottom right}
.chat-popup.open{opacity:1;transform:scale(1) translateY(0);pointer-events:all}
.chat-popup__header{display:flex;align-items:center;justify-content:space-between;padding:.875rem 1rem;background:linear-gradient(135deg,#1e3a5f,#2563EB);color:#fff}
.chat-popup__header-left{display:flex;align-items:center;gap:.625rem}
.chat-popup__avatar{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center}
.chat-popup__title{font-size:.9375rem;font-weight:700;line-height:1.2}
.chat-popup__status{display:flex;align-items:center;gap:.3rem;font-size:.6875rem;opacity:.85}
.chat-popup__dot{width:6px;height:6px;background:#4ADE80;border-radius:50%;animation:cwPulse 2s infinite}
@keyframes cwPulse{0%,100%{opacity:1}50%{opacity:.4}}
.chat-popup__close{background:none;border:none;color:rgba(255,255,255,.8);cursor:pointer;padding:.25rem;border-radius:6px;display:flex;align-items:center}
.chat-popup__close:hover{background:rgba(255,255,255,.15);color:#fff}
.chat-popup__messages{flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:.75rem;background:#F8FAFC}
.cw-msg{display:flex;gap:.5rem;max-width:88%;animation:cwFade .18s ease}
@keyframes cwFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.cw-msg--user{align-self:flex-end;flex-direction:row-reverse}
.cw-msg__av{width:26px;height:26px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;margin-top:2px}
.cw-msg--ai .cw-msg__av{background:#DBEAFE;color:#2563EB}
.cw-msg--user .cw-msg__av{background:#E5E7EB;color:#6B7280}
.cw-msg__bubble{padding:.625rem .875rem;border-radius:14px;font-size:.875rem;line-height:1.55}
.cw-msg--ai .cw-msg__bubble{background:#fff;border:1px solid #E5E7EB;border-bottom-left-radius:4px;color:#111827}
.cw-msg--user .cw-msg__bubble{background:#2563EB;color:#fff;border-bottom-right-radius:4px}
.cw-typing{display:flex;gap:4px;align-items:center;padding:2px 0}
.cw-typing span{width:6px;height:6px;background:#9CA3AF;border-radius:50%;animation:cwBounce 1.2s infinite}
.cw-typing span:nth-child(2){animation-delay:.2s}
.cw-typing span:nth-child(3){animation-delay:.4s}
@keyframes cwBounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
.chat-popup__suggestions{padding:.5rem .75rem 0;display:flex;gap:.375rem;flex-wrap:wrap;background:#F8FAFC}
.cw-suggestion{padding:.25rem .625rem;border:1.5px solid #E5E7EB;border-radius:999px;font-size:.75rem;font-family:inherit;color:#374151;background:#fff;cursor:pointer;transition:border-color .15s,color .15s;white-space:nowrap}
.cw-suggestion:hover{border-color:#2563EB;color:#2563EB}
.chat-popup__input-wrap{display:flex;align-items:flex-end;gap:.5rem;padding:.75rem;border-top:1px solid #E5E7EB;background:#fff}
.chat-popup__input{flex:1;border:1.5px solid #E5E7EB;border-radius:10px;padding:.5rem .75rem;font-size:.875rem;font-family:inherit;color:#111827;resize:none;outline:none;max-height:80px;overflow-y:auto;line-height:1.5;transition:border-color .15s}
.chat-popup__input:focus{border-color:#2563EB}
.chat-popup__send{width:34px;height:34px;background:#2563EB;border:none;border-radius:8px;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s}
.chat-popup__send:hover{background:#1D4ED8}
.chat-popup__send:disabled{background:#E5E7EB;cursor:not-allowed}
@media(max-width:480px){.chat-popup{width:calc(100vw - 2rem);right:-.5rem}}
  `;
  document.head.appendChild(style);

  // Inject HTML
  const widget = document.createElement('div');
  widget.id = 'chatWidget';
  widget.innerHTML = `
    <button class="chat-bubble" id="cwBubble" aria-label="Open AI Health Chat" title="AI Health Chat">
      <svg class="chat-bubble__icon chat-bubble__icon--chat" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <svg class="chat-bubble__icon chat-bubble__icon--close" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      <span class="chat-bubble__badge" id="cwBadge" hidden>1</span>
    </button>
    <div class="chat-popup" id="cwPopup" aria-hidden="true">
      <div class="chat-popup__header">
        <div class="chat-popup__header-left">
          <div class="chat-popup__avatar">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          </div>
          <div>
            <p class="chat-popup__title">MediScan AI</p>
            <p class="chat-popup__status"><span class="chat-popup__dot"></span>Online</p>
          </div>
        </div>
        <button class="chat-popup__close" id="cwClose" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="chat-popup__messages" id="cwMessages"></div>
      <div class="chat-popup__suggestions" id="cwSuggestions"></div>
      <div class="chat-popup__input-wrap">
        <textarea id="cwInput" class="chat-popup__input" placeholder="Ask about your health…" rows="1" maxlength="400"></textarea>
        <button class="chat-popup__send" id="cwSend" type="button" aria-label="Send">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>`;
  document.body.appendChild(widget);

  const bubbleBtn = document.getElementById('cwBubble');
  const popup     = document.getElementById('cwPopup');
  const closeBtn  = document.getElementById('cwClose');
  const msgList   = document.getElementById('cwMessages');
  const inputEl   = document.getElementById('cwInput');
  const sendBtn   = document.getElementById('cwSend');
  const suggestEl = document.getElementById('cwSuggestions');
  const badge     = document.getElementById('cwBadge');

  let isOpen = false, unread = 0, welcomed = false;

  function openChat() {
    isOpen = true;
    popup.classList.add('open');
    bubbleBtn.classList.add('open');
    badge.hidden = true; unread = 0;
    if (!welcomed) { welcome(); welcomed = true; }
    setTimeout(() => inputEl.focus(), 200);
  }
  function closeChat() {
    isOpen = false;
    popup.classList.remove('open');
    bubbleBtn.classList.remove('open');
  }

  bubbleBtn.addEventListener('click', () => isOpen ? closeChat() : openChat());
  closeBtn.addEventListener('click', closeChat);
  document.addEventListener('click', e => { if (isOpen && !widget.contains(e.target)) closeChat(); });

  function welcome() {
    const hasCtx = ctx.analysis?.source === 'ai_analysis' || ctx.symptoms?.urgency;
    const name = user.name?.split(' ')[0] || '';
    addMsg('ai', hasCtx
      ? `Hi ${name}! I've loaded your health data. Ask me anything about your results.`
      : `Hi ${name}! I'm your MediScan AI assistant. Ask me any health question!`);
    renderSuggestions();
  }

  function renderSuggestions() {
    const qs = [];
    if (ctx.analysis?.metrics?.length) {
      const ab = ctx.analysis.metrics.find(m => m.status !== 'Normal');
      if (ab) qs.push(`What does ${ab.status.toLowerCase()} ${ab.name} mean?`);
    }
    if (ctx.analysis?.diseases?.length) qs.push(`Tell me about ${ctx.analysis.diseases[0].name}`);
    if (ctx.symData?.symptoms?.length)  qs.push(`Why do I have ${ctx.symData.symptoms[0].toLowerCase()}?`);
    qs.push('What should I eat to stay healthy?');

    suggestEl.innerHTML = qs.slice(0, 3).map(q =>
      `<button class="cw-suggestion" type="button">${q}</button>`).join('');
    suggestEl.querySelectorAll('.cw-suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        inputEl.value = btn.textContent;
        suggestEl.innerHTML = '';
        send();
      });
    });
  }

  function addMsg(role, content) {
    const isUser = role === 'user';
    const div = document.createElement('div');
    div.className = `cw-msg cw-msg--${isUser ? 'user' : 'ai'}`;
    div.innerHTML = `
      <div class="cw-msg__av">
        ${isUser
          ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
          : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'}
      </div>
      <div class="cw-msg__bubble">${fmt(content)}</div>`;
    msgList.appendChild(div);
    msgList.scrollTop = msgList.scrollHeight;
    if (!isOpen && !isUser) { unread++; badge.textContent = unread; badge.hidden = false; }
  }

  function addTyping() {
    const d = document.createElement('div');
    d.id = 'cwTyping'; d.className = 'cw-msg cw-msg--ai';
    d.innerHTML = `<div class="cw-msg__av"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></div><div class="cw-msg__bubble"><div class="cw-typing"><span></span><span></span><span></span></div></div>`;
    msgList.appendChild(d);
    msgList.scrollTop = msgList.scrollHeight;
  }
  function removeTyping() { document.getElementById('cwTyping')?.remove(); }

  function fmt(t) {
    return String(t)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
      .replace(/\n/g,'<br>');
  }

  async function send() {
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = ''; inputEl.style.height = 'auto';
    sendBtn.disabled = true;
    addMsg('user', text);
    messages.push({ role: 'user', content: text });
    addTyping();
    try {
      const reply = await callGroq();
      removeTyping();
      addMsg('ai', reply);
      messages.push({ role: 'assistant', content: reply });
    } catch (err) {
      removeTyping();
      addMsg('ai', `Sorry, something went wrong. ${err.message}`);
    }
    sendBtn.disabled = false;
  }

  async function callGroq() {
    const res = await fetch(`${API_URL}/api/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ messages: messages.slice(-8), systemPrompt }),
    });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Server error');
    return data.reply;
  }

  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 80) + 'px';
  });
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  sendBtn.addEventListener('click', send);

})();
