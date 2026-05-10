const SYSTEM_PROMPT = `Anda adalah ElektroBot, asisten kecerdasan buatan yang bertindak sebagai seorang akademisi dan pakar di bidang Teknik Elektro. Tujuan utama Anda adalah membantu mahasiswa, insinyur, dan peneliti dalam memahami konsep-konsep teknis kelistrikan dan rekayasa secara mendalam.

Karakteristik Anda:
- Gunakan bahasa yang formal, baku, terstruktur, dan akademis (menggunakan "saya" dan "Anda"). Hindari bahasa gaul atau santai.
- Berikan penjelasan yang komprehensif, logis, dan didasarkan pada prinsip-prinsip sains atau teknik yang kuat.
- Sertakan terminologi teknis yang tepat dan jelaskan jika perlu.
- Apabila menyertakan persamaan matematis atau rumus, tuliskan secara sistematis beserta definisi untuk setiap variabel yang digunakan.
- Susun pemaparan menggunakan poin-poin atau paragraf yang terorganisir dengan baik untuk memudahkan pembacaan analitis.
- Domain kepakaran Anda meliputi: teori rangkaian listrik, elektronika analog dan digital, sistem tenaga listrik, mesin-mesin elektrik, sistem kendali, instrumentasi, K3 kelistrikan, PLC, serta sistem tertanam (embedded systems).
- Jika pengguna mengajukan pertanyaan di luar ranah teknik elektro atau ilmu terapan, berikan jawaban singkat dan arahkan kembali diskusi ke topik keilmuan yang relevan.

PENTING - FITUR REKOMENDASI:
Di akhir SETIAP jawaban Anda, Anda WAJIB memberikan 3 rekomendasi pertanyaan lanjutan yang sangat relevan dengan penjelasan Anda sebelumnya. Anda harus membungkus 3 pertanyaan tersebut HANYA di dalam tag <rekomendasi>...</rekomendasi>, dengan memisahkan masing-masing pertanyaan menggunakan garis miring (/).
Contoh Format Wajib di akhir teks:
<rekomendasi>Bagaimana cara mengukur arus bocor pada sistem proteksi?/Apa perbedaan antara relay elektromekanis dan solid state?/Bagaimana cara kalibrasi sensor tegangan?</rekomendasi>

Pendekatan Anda adalah mendidik dan memandu pengguna menuju pemahaman konseptual dan analitis yang utuh, setara dengan standar diskursus perguruan tinggi.`;

let history = JSON.parse(localStorage.getItem('chatHistory')) || [];
let isLoading = false;

const OPENROUTER_API_KEY = "__OPENROUTER_API_KEY__";

// Theme Logic
const themeIconPath = {
  dark: "M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18.75a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75zM6.166 17.834a.75.75 0 001.06 1.06l1.591-1.59a.75.75 0 10-1.06-1.061l-1.591 1.59zM4.5 12a.75.75 0 01-.75.75H1.5a.75.75 0 010-1.5h2.25a.75.75 0 01.75.75zM6.166 6.166a.75.75 0 001.06 1.06l1.59-1.591a.75.75 0 00-1.061-1.06l-1.59 1.591z", // Sun
  light: "M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" // Moon
};

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const iconPath = document.querySelector('#themeIcon path');
  if (iconPath) {
    iconPath.setAttribute('d', theme === 'light' ? themeIconPath.light : themeIconPath.dark);
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  setTheme(currentTheme === 'light' ? 'dark' : 'light');
}

// Initialize theme & Memory
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  if (savedTheme) {
    setTheme(savedTheme);
  } else if (prefersLight) {
    setTheme('light');
  } else {
    setTheme('dark');
  }

  // Load Memory
  if (history.length > 0) {
    const welcome = document.getElementById('welcomeCard');
    if (welcome) welcome.remove();
    
    // Render past messages
    history.forEach(msg => {
      addMessage(msg.role === 'assistant' ? 'bot' : 'user', msg.content, true);
    });
  }
});

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function sendQuick(text) {
  document.getElementById('userInput').value = text;
  sendMessage();
}

function clearChat() {
  history = [];
  localStorage.removeItem('chatHistory');
  const chat = document.getElementById('chat');
  chat.innerHTML = '';
  const welcome = document.createElement('div');
  welcome.className = 'welcome-card';
  welcome.id = 'welcomeCard';
  welcome.innerHTML = `
    <div class="welcome-icon">⚡</div>
    <h2>Selamat Datang di ElektroBot</h2>
    <p>Asisten AI untuk mendukung pembelajaran dan riset Anda di bidang <strong style="color:var(--accent)">Teknik Elektro</strong>. Ajukan pertanyaan seputar teori dasar maupun analisis teknis lanjutan.</p>
    <div class="quick-grid">
      <button class="quick-btn" onclick="sendQuick('Mohon jelaskan Hukum Kirchhoff (KVL dan KCL) beserta contoh penerapannya.')">
        <span class="q-icon">📐</span>Hukum Kirchhoff
      </button>
      <button class="quick-btn" onclick="sendQuick('Bagaimana prinsip kerja sistem proteksi relay pada gardu induk?')">
        <span class="q-icon">🛡️</span>Proteksi Relay
      </button>
      <button class="quick-btn" onclick="sendQuick('Mohon berikan penjelasan mengenai analisis rangkaian Thevenin dan Norton.')">
        <span class="q-icon">🔬</span>Teorema Thevenin
      </button>
      <button class="quick-btn" onclick="sendQuick('Sebutkan dan jelaskan klasifikasi sensor dalam sistem kendali otomatis.')">
        <span class="q-icon">📡</span>Sensor & Kendali
      </button>
    </div>`;
  chat.appendChild(welcome);
}

function addMessage(role, text, isHistoryLoad = false) {
  const welcome = document.getElementById('welcomeCard');
  if (welcome) welcome.remove();

  const chat = document.getElementById('chat');
  const wrap = document.createElement('div');
  wrap.className = `msg ${role}`;
  wrap.style.flexDirection = 'column';
  wrap.style.alignItems = role === 'user' ? 'flex-end' : 'flex-start';

  const avatarAndBubble = document.createElement('div');
  avatarAndBubble.style.display = 'flex';
  avatarAndBubble.style.gap = '12px';
  avatarAndBubble.style.flexDirection = role === 'user' ? 'row-reverse' : 'row';

  const av = document.createElement('div');
  av.className = 'avatar';
  av.textContent = role === 'bot' ? '⚡' : 'B';

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  
  // Parse Recommendations
  let recommendations = [];
  if (role === 'bot') {
    const recMatch = text.match(/<rekomendasi>([\s\S]*?)<\/rekomendasi>/i);
    if (recMatch) {
      const recText = recMatch[1];
      recommendations = recText.split('/').map(r => r.trim()).filter(r => r.length > 0);
      text = text.replace(/<rekomendasi>[\s\S]*?<\/rekomendasi>/i, ''); // Remove tags from bubble
    }
  }

  const formattedHtml = formatText(text);

  avatarAndBubble.appendChild(av);
  avatarAndBubble.appendChild(bubble);
  wrap.appendChild(avatarAndBubble);
  chat.appendChild(wrap);

  function appendRecommendations() {
    if (recommendations.length > 0) {
      const recContainer = document.createElement('div');
      recContainer.className = 'rekomendasi-container';
      
      recommendations.forEach(rec => {
        const btn = document.createElement('button');
        btn.className = 'rekomendasi-btn';
        btn.textContent = rec;
        btn.onclick = () => sendQuick(rec);
        recContainer.appendChild(btn);
      });
      
      recContainer.style.marginLeft = '46px';
      recContainer.style.marginTop = '8px';
      wrap.appendChild(recContainer);
    }
  }

  bubble.innerHTML = formattedHtml;
  appendRecommendations();
  
  if (!isHistoryLoad) {
    chat.scrollTop = chat.scrollHeight;
  }
  
  if (window.MathJax) {
    MathJax.typesetPromise([wrap]).catch(console.log);
  }

  return bubble;
}

function formatText(text) {
  // Extract math blocks to prevent formatting from breaking them
  const mathBlocks = [];
  let mathCounter = 0;
  
  // Replace display math $$ ... $$
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match) => {
    mathBlocks[mathCounter] = match;
    return `__MATH_BLOCK_${mathCounter++}__`;
  });
  
  // Replace inline math $ ... $
  text = text.replace(/\$([^\n\$]+)\$/g, (match) => {
    mathBlocks[mathCounter] = match;
    return `__MATH_BLOCK_${mathCounter++}__`;
  });

  // Code blocks
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code>${escapeHtml(code.trim())}</code></pre>`);
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Headings
  text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  // Bold
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Bullet list
  text = text.replace(/^[-•] (.+)$/gm, '<li>$1</li>');
  text = text.replace(/(<li>.*<\/li>(\n|$))+/g, m => `<ul>${m}</ul>`);
  // Numbered list
  text = text.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  // Newlines
  text = text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
  
  let formatted = `<p>${text.trim()}</p>`;

  // Restore math blocks safely
  for (let i = 0; i < mathCounter; i++) {
    // Escape HTML tags inside math blocks to prevent breaking the typewriter
    let safeMath = mathBlocks[i].replace(/</g, '&lt;').replace(/>/g, '&gt;');
    formatted = formatted.replace(`__MATH_BLOCK_${i}__`, safeMath);
  }
  
  return formatted;
}

function escapeHtml(t) {
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function addTyping() {
  const chat = document.getElementById('chat');
  const wrap = document.createElement('div');
  wrap.className = 'msg bot';
  wrap.id = 'typingMsg';

  const avatarAndBubble = document.createElement('div');
  avatarAndBubble.style.display = 'flex';
  avatarAndBubble.style.gap = '12px';

  const av = document.createElement('div');
  av.className = 'avatar';
  av.textContent = '⚡';

  const typing = document.createElement('div');
  typing.className = 'typing';
  typing.innerHTML = '<span></span><span></span><span></span>';

  avatarAndBubble.appendChild(av);
  avatarAndBubble.appendChild(typing);
  wrap.appendChild(avatarAndBubble);
  chat.appendChild(wrap);
  chat.scrollTop = chat.scrollHeight;
}

function removeTyping() {
  const t = document.getElementById('typingMsg');
  if (t) t.remove();
}

async function sendMessage() {
  if (isLoading) return;
  const input = document.getElementById('userInput');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  input.style.height = 'auto';
  isLoading = true;
  document.getElementById('sendBtn').disabled = true;

  addMessage('user', text);
  history.push({ role: 'user', content: text });
  localStorage.setItem('chatHistory', JSON.stringify(history));
  addTyping();

  try {
    // 1. Format pesan untuk OpenRouter
    const openRouterMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }))
    ];

    // 2. Gunakan OpenRouter API
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    
    // Ambil API Key (Hardcoded -> LocalStorage -> Prompt)
    let activeKey = OPENROUTER_API_KEY;
    if (!activeKey || activeKey.includes("MASUKKAN") || activeKey.includes("__OPENROUTER") || activeKey.trim() === "") {
      activeKey = localStorage.getItem('userApiKey');
      if (!activeKey) {
        activeKey = prompt("Website ini berjalan di GitHub Pages. Masukkan OpenRouter API Key Anda (sk-or-...):");
        if (activeKey) {
          localStorage.setItem('userApiKey', activeKey.trim());
        } else {
          throw new Error('API Key tidak diberikan.');
        }
      }
    }

    const payload = {
      model: "google/gemini-3.1-flash-lite",
      messages: openRouterMessages,
      max_tokens: 1000
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${activeKey}`,
        'HTTP-Referer': window.location.href,
        'X-Title': 'ElektroBot'
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 401) {
      localStorage.removeItem('userApiKey');
      throw new Error('API Key tidak valid (Unauthorized). Pop-up akan muncul lagi saat halaman dimuat ulang.');
    }
    if (!res.ok) throw new Error('Koneksi ke API gagal');
    
    const data = await res.json();
    removeTyping();

    // Ekstrak balasan dari struktur JSON OpenRouter
    const reply = data.choices?.[0]?.message?.content || 'Terjadi kesalahan sistem, silakan coba lagi.';
    
    addMessage('bot', reply);
    history.push({ role: 'assistant', content: reply });
    localStorage.setItem('chatHistory', JSON.stringify(history));

  } catch (err) {
    console.error(err);
    removeTyping();
    // FALLBACK UNTUK LOCALHOST DEMO (Jika API Key kosong/gagal)
    const mockReply = `ERROR: ${err.message}. \nJika ini adalah masalah API Key, silakan REFRESH halaman browser Anda untuk memasukkan ulang API Key yang benar. \n\n<rekomendasi>Coba lagi nanti/Periksa log console/Bantu saya melakukan debugging.</rekomendasi>`;
    addMessage('bot', mockReply);
    history.push({ role: 'assistant', content: mockReply });
    localStorage.setItem('chatHistory', JSON.stringify(history));
  }

  isLoading = false;
  document.getElementById('sendBtn').disabled = false;
  input.focus();
}
