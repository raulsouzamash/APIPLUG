import * as XLSX from 'xlsx';

// ─── State ────────────────────────────────────────────────
const state = {
  user: null,
  results: [],
  mode: null,
};

// ─── Boot ─────────────────────────────────────────────────
(async function boot() {
  try {
    const res = await apiFetch('/api/auth/me');
    if (res.authenticated) {
      state.user = res;
      renderApp();
    } else {
      renderLogin();
    }
  } catch {
    renderLogin();
  }
})();

// ─── API Helper ───────────────────────────────────────────
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'same-origin',
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Toast ────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ─── Login Page ───────────────────────────────────────────
function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="flex items-center justify-center w-full min-h-[80vh] animate-fade-in">
      <div class="glass-panel w-full max-w-md p-8 relative overflow-hidden">
        <div class="absolute -top-10 -right-10 w-32 h-32 bg-pluggto/20 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
        
        <div class="flex items-center gap-4 mb-2 relative z-10">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-pluggto to-blue-500 flex items-center justify-center text-2xl shadow-lg shadow-pluggto/30">📦</div>
          <div>
            <h1 class="text-2xl font-extrabold text-white tracking-tight">Pluggto Tools</h1>
            <span class="text-sm font-medium text-pluggto uppercase tracking-wider">Painel Interno</span>
          </div>
        </div>
        <p class="text-slate-400 text-sm mb-8 relative z-10">Faça login com suas credenciais para continuar.</p>
        
        <form id="loginForm" autocomplete="on" class="relative z-10">
          <div class="mb-5">
            <label class="label-text" for="email">Email</label>
            <input class="input-field" id="email" name="email" type="email" placeholder="seu@email.com" autocomplete="email" required />
          </div>
          <div class="mb-8">
            <label class="label-text" for="password">Senha</label>
            <input class="input-field" id="password" name="password" type="password" placeholder="••••••••" autocomplete="current-password" required />
          </div>
          <button class="btn-primary w-full text-lg py-3 flex justify-center items-center gap-2" type="submit" id="loginBtn">
            <span id="loginBtnText">Entrar</span>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
          <div class="hidden mt-4 text-center text-red-400 text-sm font-medium bg-red-500/10 py-2 px-3 rounded-lg border border-red-500/20" id="loginError"></div>
        </form>
      </div>
    </div>`;

  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('email').focus();
}

async function handleLogin(e) {
  e.preventDefault();
  const btn  = document.getElementById('loginBtn');
  const errEl = document.getElementById('loginError');
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  btn.disabled = true;
  document.getElementById('loginBtnText').textContent = 'Verificando...';
  errEl.classList.remove('show');

  try {
    await apiFetch('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    state.user = { email };
    renderApp();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add('show');
    btn.disabled = false;
    document.getElementById('loginBtnText').textContent = 'Entrar';
  }
}

// ─── App Page ─────────────────────────────────────────────
function renderApp() {
  document.getElementById('app').innerHTML = `
    <header class="flex items-center justify-between mb-8 pb-6 border-b border-slate-700/50 animate-slide-up">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-pluggto to-blue-500 flex items-center justify-center text-xl shadow-lg shadow-pluggto/20">📦</div>
        <div>
          <h1 class="text-xl font-bold text-white leading-tight">Pluggto Tools</h1>
          <small class="text-xs text-slate-400 font-medium">Chaves NFe & Etiquetas</small>
        </div>
      </div>
      <div class="flex items-center gap-4">
        ${state.user?.role === 'admin' ? '<button class="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-semibold py-1.5 px-3 rounded-md transition-colors" id="btnAdminPanel">Painel Admin</button>' : ''}
        <span class="text-sm font-medium text-slate-300 hidden sm:inline-block">${state.user?.email || ''}</span>
        <button class="text-slate-400 hover:text-white text-sm font-medium transition-colors" id="logoutBtn">Sair</button>
      </div>
    </header>

    <main class="flex flex-col gap-6 animate-slide-up" style="animation-delay: 0.1s;">

      <!-- IDs dos pedidos -->
      <div class="glass-card p-6">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-6 h-6 rounded-full bg-pluggto/20 text-pluggto flex items-center justify-center text-xs font-bold border border-pluggto/30">1</div>
          <h2 class="text-base font-semibold text-white">Cole os IDs dos Pedidos</h2>
        </div>
        <textarea id="orderInput" class="input-field min-h-[120px] font-mono text-sm leading-relaxed"
          placeholder="Cole os IDs dos pedidos, um por linha:
260610Q971GUG0
260610Q5SMJKD0
..."></textarea>
        <div class="flex items-center justify-between mt-3">
          <div class="text-xs font-medium text-pluggto bg-pluggto/10 border border-pluggto/20 py-1 px-3 rounded-full">
            <b id="orderCount">0</b> pedidos detectados
          </div>
          <button class="text-xs font-medium text-slate-400 hover:text-white transition-colors" id="clearBtn">✕ Limpar</button>
        </div>
      </div>

      <!-- Ações -->
      <div class="glass-card p-6">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-6 h-6 rounded-full bg-pluggto/20 text-pluggto flex items-center justify-center text-xs font-bold border border-pluggto/30">2</div>
          <h2 class="text-base font-semibold text-white">Escolha a Ação</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button class="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-700/80 hover:border-pluggto/50 transition-all group" id="btnNfe">
            <span class="text-3xl group-hover:scale-110 transition-transform">🔑</span>
            <span class="font-semibold text-sm text-white">Buscar Chaves NFe</span>
            <span class="text-xs text-slate-400 text-center">Exporta XLSX com chaves</span>
          </button>
          <button class="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-700/80 hover:border-pluggto/50 transition-all group" id="btnLabel">
            <span class="text-3xl group-hover:scale-110 transition-transform">🏷️</span>
            <span class="font-semibold text-sm text-white">Baixar Etiquetas</span>
            <span class="text-xs text-slate-400 text-center">Links das etiquetas</span>
          </button>
          <button class="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border border-pluggto/30 bg-pluggto/10 hover:bg-pluggto/20 hover:border-pluggto/60 transition-all group shadow-lg shadow-pluggto/5" id="btnBoth">
            <span class="text-3xl group-hover:scale-110 transition-transform">⚡</span>
            <span class="font-semibold text-sm text-pluggto">Ambos</span>
            <span class="text-xs text-slate-400 text-center">NFe + Etiquetas</span>
          </button>
        </div>
      </div>

      <!-- Busca de Agendamentos -->
      <div class="glass-card p-6 border-l-4 border-l-blue-500">
        <h2 class="text-base font-semibold text-white flex items-center gap-2 mb-1">📅 Exportar Agendamentos Pendentes</h2>
        <p class="text-sm text-slate-400 mb-4">Busca e exporta planilha com todos os pedidos que não foram enviados e possuem "buffering_date".</p>
        <button class="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors w-full sm:w-auto" id="btnDownloadBuffered">⬇ Baixar Agendamentos (.xlsx)</button>
      </div>

      <!-- Busca JSON -->
      <div class="glass-card p-6">
        <h2 class="text-base font-semibold text-white flex items-center gap-2 mb-4">🔎 Inspecionar Pedido (JSON Completo)</h2>
        <div class="flex flex-col sm:flex-row gap-3 mb-4">
          <select id="jsonSearchType" class="input-field sm:max-w-[200px]">
            <option value="external">ID Externo (ex: Shopee)</option>
            <option value="internal">ID Pluggto</option>
          </select>
          <input type="text" id="jsonSearchValue" class="input-field flex-1" placeholder="Digite o ID para ver o JSON..." />
          <button class="btn-primary" id="btnSearchJson">Buscar JSON</button>
        </div>
        <div id="jsonResultContainer" class="hidden">
          <div class="flex justify-between items-center mb-2">
            <span class="text-xs font-semibold text-slate-400">Resultado:</span>
            <button class="text-xs text-pluggto hover:text-white transition-colors" id="btnCopyJson">Copiar JSON</button>
          </div>
          <pre id="jsonResultPre" class="bg-slate-900 border border-slate-700 rounded-lg p-4 text-xs font-mono text-pluggto max-h-96 overflow-auto"></pre>
        </div>
      </div>

      <!-- Progresso -->
      <div class="glass-card p-6 hidden" id="progressCard">
        <div class="flex items-center gap-2 mb-4">
          <span class="spinner"></span>
          <h2 class="text-base font-semibold text-white" id="progressTitle">Processando...</h2>
        </div>
        <div class="flex justify-between text-sm font-medium mb-2">
          <span class="text-slate-300" id="progLabel">Iniciando...</span>
          <span class="text-pluggto" id="progFrac">0 / 0</span>
        </div>
        <div class="w-full bg-slate-700 h-2 rounded-full overflow-hidden mb-3">
          <div class="bg-pluggto h-full w-0 transition-all duration-300 shadow-[0_0_10px_#10A958]" id="progFill"></div>
        </div>
        <div class="text-xs text-slate-400" id="progStatus">Aguarde...</div>
      </div>

      <!-- Resultados -->
      <div class="glass-card p-6 hidden animate-fade-in" id="resultsCard">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-700/50 pb-4">
          <h2 class="text-lg font-bold text-white flex items-center gap-2">📊 Resultados</h2>
          <div class="flex gap-2" id="dlBtns"></div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6" id="statsRow"></div>
        
        <div class="mb-4 hidden" id="filterContainer">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span class="text-slate-400">🔍</span>
            </div>
            <input type="text" id="filterNfInput" class="input-field pl-10 max-w-sm" placeholder="Buscar por Nº NF ou ID..." />
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm whitespace-nowrap">
            <thead class="text-xs text-slate-400 uppercase bg-slate-900/50 border-b border-slate-700">
              <tr id="tableHead"></tr>
            </thead>
            <tbody id="tableBody" class="divide-y divide-slate-700/50"></tbody>
          </table>
        </div>
      </div>

    </main>
    
    <!-- Admin Modal -->
    <div id="adminModal" class="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] hidden items-center justify-center p-4 animate-fade-in">
      <div class="glass-panel w-full max-w-2xl p-6 relative overflow-hidden">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-lg font-bold text-white flex items-center gap-2">👥 Painel de Usuários</h2>
          <button id="closeAdminModalBtn" class="text-slate-400 hover:text-white text-xl transition-colors">✕</button>
        </div>
        
        <div class="bg-slate-900/50 border border-slate-700/50 p-5 rounded-xl mb-6">
          <h3 id="adminFormTitle" class="text-sm font-semibold text-slate-300 mb-3">Adicionar Novo Usuário</h3>
          <div class="flex flex-wrap gap-3 items-end">
            <div class="flex-1 min-w-[200px]">
              <label class="label-text">Email</label>
              <input type="email" id="newAdminEmail" class="input-field" placeholder="email@empresa.com" />
            </div>
            <div class="w-32">
              <label class="label-text">Senha</label>
              <input type="password" id="newAdminPassword" class="input-field" placeholder="••••••" />
            </div>
            <div class="w-32">
              <label class="label-text">Nível</label>
              <select id="newAdminRole" class="input-field">
                <option value="user">Usuário</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div class="flex gap-2">
              <button id="btnCreateUser" class="btn-primary">Criar</button>
              <button id="btnCancelEdit" class="btn-secondary hidden">Cancelar</button>
            </div>
          </div>
          <p id="editHelperText" class="hidden text-xs text-slate-400 mt-2">Deixe a senha em branco se não quiser alterar.</p>
        </div>
        
        <h3 class="text-sm font-semibold text-slate-300 mb-3">Usuários Cadastrados</h3>
        <div class="overflow-x-auto border border-slate-700/50 rounded-xl">
          <table class="w-full text-left text-sm">
            <thead class="text-xs text-slate-400 uppercase bg-slate-900/80 border-b border-slate-700/50">
              <tr><th class="px-4 py-3">Email</th><th class="px-4 py-3">Nível</th><th class="px-4 py-3 text-right">Ações</th></tr>
            </thead>
            <tbody id="adminUserList" class="divide-y divide-slate-700/50 bg-slate-800/30"></tbody>
          </table>
        </div>
      </div>
    </div>`;

  // Events
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  document.getElementById('clearBtn').addEventListener('click', () => {
    document.getElementById('orderInput').value = '';
    updateCount();
  });
  document.getElementById('orderInput').addEventListener('input', updateCount);
  document.getElementById('btnNfe').addEventListener('click', () => runAction('nfe'));
  document.getElementById('btnLabel').addEventListener('click', () => runAction('label'));
  document.getElementById('btnBoth').addEventListener('click', () => runAction('both'));
  
  document.getElementById('btnSearchJson').addEventListener('click', handleSearchJson);
  document.getElementById('btnCopyJson').addEventListener('click', copyJsonResult);
  document.getElementById('btnDownloadBuffered').addEventListener('click', handleDownloadBuffered);

  if (state.user?.role === 'admin') {
    document.getElementById('btnAdminPanel').addEventListener('click', openAdminPanel);
    document.getElementById('closeAdminModalBtn').addEventListener('click', () => {
      document.getElementById('adminModal').style.display = 'none';
    });
    document.getElementById('btnCreateUser').addEventListener('click', createAdminUser);
  }
}

async function handleLogout() {
  await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  state.user = null;
  renderLogin();
}

// ─── Helpers ──────────────────────────────────────────────
function getOrderIds() {
  return (document.getElementById('orderInput')?.value || '')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 3);
}

function updateCount() {
  const el = document.getElementById('orderCount');
  if (el) el.textContent = getOrderIds().length;
}

function setActionBtns(disabled) {
  ['btnNfe', 'btnLabel', 'btnBoth'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = disabled;
  });
}

// ─── Progress ─────────────────────────────────────────────
function showProgress(title) {
  document.getElementById('progressCard').classList.add('visible');
  document.getElementById('progressTitle').textContent = title;
  setProgress(0, 0, 0, 'Iniciando...');
}
function setProgress(done, total, pct, msg) {
  document.getElementById('progFill').style.width = pct + '%';
  document.getElementById('progFrac').textContent = `${done} / ${total}`;
  document.getElementById('progLabel').textContent = msg;
  document.getElementById('progStatus').textContent = msg;
}
function hideProgress() {
  document.getElementById('progressCard').classList.remove('visible');
}

// ─── Run Action ───────────────────────────────────────────
const BATCH_SIZE = 25; // max per API call (within Vercel timeout)

async function runAction(mode) {
  const ids = getOrderIds();
  if (!ids.length) { toast('Cole pelo menos um ID de pedido.', 'error'); return; }

  state.results = [];
  state.mode = mode;

  setActionBtns(true);
  document.getElementById('resultsCard').classList.remove('visible');

  const titles = {
    nfe:   '🔑 Buscando Chaves NFe',
    label: '🏷️ Buscando Etiquetas',
    both:  '⚡ Buscando NFe + Etiquetas',
  };
  showProgress(titles[mode]);

  try {
    const total = ids.length;
    let done = 0;

    // Divide em lotes de BATCH_SIZE
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      setProgress(done, total, Math.round((done / total) * 100), `Processando pedidos ${done + 1}–${Math.min(done + batch.length, total)} de ${total}...`);

      let endpoint, body;
      if (mode === 'nfe') {
        endpoint = '/api/orders/nfe';
        body = { orderIds: batch };
      } else if (mode === 'label') {
        endpoint = '/api/orders/labels';
        body = { orderIds: batch, includeNfe: false };
      } else {
        endpoint = '/api/orders/labels';
        body = { orderIds: batch, includeNfe: true };
      }

      const data = await apiFetch(endpoint, { method: 'POST', body });
      state.results.push(...data.results);
      done += batch.length;
      setProgress(done, total, Math.round((done / total) * 100), `${done} de ${total} concluídos`);

      // Pequeno delay entre lotes para não sobrecarregar
      if (i + BATCH_SIZE < ids.length) await sleep(200);
    }

    hideProgress();
    renderResults(mode);
    toast(`Concluído! ${state.results.length} pedidos processados.`, 'success');
  } catch (err) {
    hideProgress();
    if (err.message.includes('Não autenticado')) {
      toast('Sessão expirada. Faça login novamente.', 'error');
      setTimeout(renderLogin, 1500);
    } else {
      toast('Erro: ' + err.message, 'error');
    }
  } finally {
    setActionBtns(false);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Render Results ───────────────────────────────────────
function statusBadge(status) {
  const map = {
    shipping_informed: ['bg-green-500/10 text-green-400 border-green-500/30',  '✓ Enviado'],
    invoice_error:     ['bg-orange-500/10 text-orange-400 border-orange-500/30', '⚠ Erro NF'],
    approved:          ['bg-blue-500/10 text-blue-400 border-blue-500/30',   '● Enviar NF-e'],
    delivered:         ['bg-emerald-500/10 text-emerald-400 border-emerald-500/30',  '✓ Entregue'],
    cancelled:         ['bg-red-500/10 text-red-400 border-red-500/30',    '✕ Cancelado'],
  };
  const [cls, label] = map[status] || ['bg-slate-500/10 text-slate-400 border-slate-500/30', status || 'N/A'];
  return `<span class="px-2.5 py-1 rounded-md text-xs font-semibold border ${cls}">${label}</span>`;
}

function renderResults(mode) {
  const res = state.results;
  const card = document.getElementById('resultsCard');
  card.classList.add('visible');

  // Stats
  const total    = res.length;
  const withKey  = res.filter(r => r.nfeKey).length;
  const withLbl  = res.filter(r => r.labelUrl).length;
  const approved = res.filter(r => r.status === 'approved').length;
  const errCount = res.filter(r => r.error || r.labelError).length;

  let stats = `
    <div class="bg-slate-800/50 border border-slate-700 p-4 rounded-xl flex flex-col items-center justify-center text-center">
      <div class="text-2xl font-bold text-white">${total}</div>
      <div class="text-xs font-medium text-slate-400 uppercase tracking-wide mt-1">Total processados</div>
    </div>`;
  if (mode === 'nfe' || mode === 'both')
    stats += `<div class="bg-slate-800/50 border border-pluggto/30 p-4 rounded-xl flex flex-col items-center justify-center text-center">
      <div class="text-2xl font-bold text-pluggto">${withKey}</div>
      <div class="text-xs font-medium text-slate-400 uppercase tracking-wide mt-1">Com Chave NFe</div>
    </div>`;
  if (mode === 'label' || mode === 'both')
    stats += `<div class="bg-slate-800/50 border border-pluggto/30 p-4 rounded-xl flex flex-col items-center justify-center text-center">
      <div class="text-2xl font-bold text-pluggto">${withLbl}</div>
      <div class="text-xs font-medium text-slate-400 uppercase tracking-wide mt-1">Com Etiqueta</div>
    </div>`;
  stats += `
    <div class="bg-slate-800/50 border border-blue-500/30 p-4 rounded-xl flex flex-col items-center justify-center text-center">
      <div class="text-2xl font-bold text-blue-400">${approved}</div>
      <div class="text-xs font-medium text-slate-400 uppercase tracking-wide mt-1">Enviar NF-e</div>
    </div>`;
  document.getElementById('statsRow').innerHTML = stats;

  // Download buttons
  const dlBtns = document.getElementById('dlBtns');
  dlBtns.innerHTML = '';
  if (mode === 'nfe' || mode === 'both') {
    const b = document.createElement('button');
    b.className = 'bg-pluggto/20 hover:bg-pluggto/30 text-pluggto border border-pluggto/30 font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors text-sm'; b.innerHTML = '⬇ Chaves NFe (.xlsx)';
    b.onclick = downloadNfeXlsx; dlBtns.appendChild(b);
  }
  if (mode === 'label' || mode === 'both') {
    const b = document.createElement('button');
    b.className = 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors text-sm'; b.innerHTML = '⬇ Etiquetas (.xlsx)';
    b.onclick = downloadLabelsXlsx; dlBtns.appendChild(b);
  }
  if (withLbl > 0) {
    const b = document.createElement('button');
    b.className = 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors text-sm'; b.innerHTML = `⬇ Baixar ${withLbl} PDFs`;
    b.onclick = () => downloadAllPdfs(false); dlBtns.appendChild(b);

    const p = document.createElement('button');
    p.className = 'bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors text-sm flex items-center gap-2'; p.style.marginLeft = '8px'; p.innerHTML = `🖨️ Imprimir Etiquetas`;
    p.onclick = () => downloadAllPdfs(true); dlBtns.appendChild(p);
  }

  // Table head
  let heads = '<th class="px-4 py-3 text-center text-slate-500 w-12">#</th><th class="px-4 py-3">ID Pedido</th><th class="px-4 py-3">Status</th>';
  if (mode === 'nfe' || mode === 'both') heads += '<th class="px-4 py-3">Nº NF</th><th class="px-4 py-3">Chave NFe</th>';
  if (mode === 'label' || mode === 'both') heads += '<th class="px-4 py-3">Etiqueta</th>';
  document.getElementById('tableHead').innerHTML = heads;

  // Table body
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';
  res.forEach((r, i) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-800/50 transition-colors';
    let cols = `
      <td class="px-4 py-3 text-center text-slate-500 font-mono">${i + 1}</td>
      <td class="px-4 py-3 font-semibold text-white">${r.ext}</td>
      <td class="px-4 py-3">${statusBadge(r.status)}</td>`;
    if (mode === 'nfe' || mode === 'both') {
      cols += `<td class="px-4 py-3 font-mono text-blue-400">${r.nfeNum ?? '<span class="text-slate-600">—</span>'}</td>`;
      cols += `<td class="px-4 py-3 font-mono text-xs text-slate-300 max-w-xs truncate" title="${r.nfeKey ?? ''}">${r.nfeKey ?? '<span class="text-slate-600">—</span>'}</td>`;
    }
    if (mode === 'label' || mode === 'both') {
      cols += `<td class="px-4 py-3">${r.labelUrl
        ? `<a class="text-pluggto hover:text-white font-medium hover:underline flex items-center gap-1" href="${r.labelUrl}" target="_blank" rel="noopener">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg> 
            PDF
          </a>`
        : `<span class="text-red-400 font-medium text-xs">${r.labelError || '—'}</span>`}</td>`;
    }
    tr.innerHTML = cols;
    tbody.appendChild(tr);
  });

  const filterContainer = document.getElementById('filterContainer');
  filterContainer.style.display = 'block';
  
  const filterInput = document.getElementById('filterNfInput');
  filterInput.value = '';
  filterInput.oninput = function() {
    const term = this.value.toLowerCase().trim();
    const rows = document.querySelectorAll('#tableBody tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(term) ? '' : 'none';
    });
  };

  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── XLSX Downloads ───────────────────────────────────────
function datestamp() {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}
function pad(n) { return String(n).padStart(2, '0'); }

function makeNfeSheet(rows) {
  const wsData = [['ID Pedido', 'Nº NF', 'Chave NFe (44 dígitos)', 'Status']];
  rows.forEach(r => wsData.push([r.ext, r.nfeNum ?? '', r.nfeKey ?? '', r.status ?? '']));
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  // Força coluna da Chave NFe como texto (evita notação científica)
  for (let i = 1; i < wsData.length; i++) {
    const ref = XLSX.utils.encode_cell({ r: i, c: 2 });
    if (ws[ref]) { ws[ref].t = 's'; ws[ref].z = '@'; }
  }
  ws['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 50 }, { wch: 20 }];
  return ws;
}

function downloadNfeXlsx() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeNfeSheet(state.results), 'Chaves NFe');
  XLSX.writeFile(wb, `ChavesNFe_${datestamp()}.xlsx`);
  toast('XLSX de Chaves NFe baixado!');
}

function downloadLabelsXlsx() {
  const wb = XLSX.utils.book_new();
  const wsData = [['ID Pedido', 'Nº NF', 'Chave NFe', 'Link Etiqueta (PDF)', 'Status']];
  state.results.forEach(r => wsData.push([
    r.ext, r.nfeNum ?? '', r.nfeKey ?? '', r.labelUrl ?? '', r.status ?? '',
  ]));
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  for (let i = 1; i < wsData.length; i++) {
    const ref = XLSX.utils.encode_cell({ r: i, c: 2 });
    if (ws[ref]) { ws[ref].t = 's'; ws[ref].z = '@'; }
  }
  ws['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 50 }, { wch: 90 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Etiquetas');
  XLSX.writeFile(wb, `Etiquetas_${datestamp()}.xlsx`);
  toast('XLSX de Etiquetas baixado!');
}

async function downloadAllPdfs(autoPrint = false) {
  const validOrders = state.results.filter(r => r.orderId && r.labelUrl);
  if (!validOrders.length) { toast('Nenhuma etiqueta disponível.', 'error'); return; }
  
  toast(`Consolidando etiquetas de ${validOrders.length} pedidos...`, 'info');
  const orderIds = validOrders.map(r => r.orderId);

  try {
    const data = await apiFetch('/api/orders/bulk-labels', {
      method: 'POST',
      body: { orderIds }
    });

    if (!data.urls || data.urls.length === 0) {
      toast('Não foi possível gerar a etiqueta unificada.', 'error');
      return;
    }

    toast(`Pronto! Carregando arquivo(s) unificado(s)...`, 'success');
    for (const url of data.urls) {
      if (autoPrint) {
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = blobUrl;
          document.body.appendChild(iframe);
          iframe.onload = () => {
            iframe.contentWindow.print();
            setTimeout(() => {
               // Cleanup
               document.body.removeChild(iframe);
               URL.revokeObjectURL(blobUrl);
            }, 60000);
          };
        } catch (e) {
          toast('Bloqueio de segurança. Imprima manualmente (Ctrl+P).', 'warning');
          window.open(url, '_blank');
        }
      } else {
        window.open(url, '_blank');
      }
      await sleep(500);
    }
  } catch (err) {
    toast(`Erro ao unificar etiquetas: ${err.message}`, 'error');
  }
}

// ─── JSON Search ──────────────────────────────────────────
async function handleSearchJson() {
  const searchType = document.getElementById('jsonSearchType').value;
  const searchValue = document.getElementById('jsonSearchValue').value.trim();
  if (!searchValue) { toast('Digite o ID do pedido.', 'error'); return; }

  const btn = document.getElementById('btnSearchJson');
  btn.textContent = 'Buscando...';
  btn.disabled = true;
  document.getElementById('jsonResultContainer').style.display = 'none';

  try {
    const data = await apiFetch('/api/orders/json', {
      method: 'POST',
      body: { searchType, searchValue }
    });
    
    document.getElementById('jsonResultPre').textContent = JSON.stringify(data.data, null, 2);
    document.getElementById('jsonResultContainer').style.display = 'block';
    toast('JSON carregado com sucesso!', 'success');
  } catch (err) {
    if (err.message.includes('Não autenticado')) {
      toast('Sessão expirada.', 'error');
      setTimeout(renderLogin, 1500);
    } else {
      toast('Erro: ' + err.message, 'error');
    }
  } finally {
    btn.textContent = 'Buscar JSON';
    btn.disabled = false;
  }
}

function copyJsonResult() {
  const text = document.getElementById('jsonResultPre').textContent;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    toast('JSON copiado!', 'success');
  });
}

// ─── Buffered Orders (Agendamentos) ───────────────────────
async function handleDownloadBuffered() {
  const btn = document.getElementById('btnDownloadBuffered');
  const originalText = btn.innerHTML;
  btn.disabled = true;

  try {
    let allOrders = [];
    let page = 1;
    let keepFetching = true;
    
    // Calcula a data de 30 dias atrás
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    while (keepFetching) {
      btn.innerHTML = `⏳ Buscando na Pluggto (página ${page} - últimos 30 dias)...`;
      const data = await apiFetch(`/api/orders/buffered?page=${page}`);
      
      if (data.orders && data.orders.length > 0) {
        allOrders.push(...data.orders);
      }

      // Verifica a data do último pedido retornado na página
      // Verifica a data do último pedido retornado na página
      if (data.lastOrderDate) {
        const lastDate = new Date(data.lastOrderDate);
        // Desativamos a trava de 30 dias porque se a API ordenar do mais antigo pro mais novo,
        // o lastDate da página 1 será de anos atrás e vai cancelar a busca inteira imediatamente!
      }

      // Limite de segurança: buscar no máximo 50 páginas (5000 pedidos)
      if (page >= 50) {
        keepFetching = false;
      }

      // Se não tem mais páginas na Pluggto
      if (!data.hasMore) {
        keepFetching = false;
      }

      if (keepFetching) {
        page++;
      }
    }

    if (allOrders.length === 0) {
      toast('Nenhum agendamento pendente encontrado nos últimos 30 dias.', 'info');
      return;
    }

    toast(`Gerando planilha com ${allOrders.length} agendamentos...`, 'success');
    
    const wsData = [['ID Interno', 'ID Externo', 'Status', 'Sub-status', 'Data Agendamento (Buffering)', 'Previsão de Coleta', 'Transportadora', 'Método']];
    allOrders.forEach(o => {
      wsData.push([
        o.id, 
        o.external, 
        o.status, 
        o.sub_status || '',
        o.buffering_date ? new Date(o.buffering_date).toLocaleString('pt-BR') : '',
        o.expected_collection_date && o.expected_collection_date !== 'N/A' ? new Date(o.expected_collection_date).toLocaleString('pt-BR') : o.expected_collection_date,
        o.shipping_company,
        o.shipping_method
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Agendamentos');
    XLSX.writeFile(wb, `Agendamentos_Pendentes_${datestamp()}.xlsx`);
    
  } catch (err) {
    if (err.message.includes('Não autenticado')) {
      toast('Sessão expirada.', 'error');
      setTimeout(renderLogin, 1500);
    } else {
      toast('Erro: ' + err.message, 'error');
    }
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// ─── Admin Panel ──────────────────────────────────────────
let editingUserEmail = null;

async function openAdminPanel() {
  document.getElementById('adminModal').style.display = 'flex';
  cancelEditUser(); // Reset form
  await loadAdminUsers();
}

async function loadAdminUsers() {
  const tbody = document.getElementById('adminUserList');
  tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Carregando...</td></tr>';
  try {
    const data = await apiFetch('/api/users/list');
    tbody.innerHTML = '';
    data.users.forEach(u => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-700/50 transition-colors';
      const roleBadge = u.role === 'admin' 
        ? '<span class="bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded text-xs font-semibold">Admin</span>'
        : '<span class="bg-green-500/10 text-green-400 border border-green-500/30 px-2 py-0.5 rounded text-xs font-semibold">Usuário</span>';
        
      tr.innerHTML = `
        <td class="px-4 py-3 font-medium text-slate-200">${u.email}</td>
        <td class="px-4 py-3">${roleBadge}</td>
        <td class="px-4 py-3 text-right">
          ${u.isMain ? '<span class="text-slate-500 text-xs font-semibold uppercase tracking-wider bg-slate-800 px-2 py-1 rounded">Mestre</span>' : 
            `<button class="text-blue-400 hover:text-blue-300 hover:underline text-sm font-medium mr-3 transition-colors" onclick="editAdminUser('${u.email}', '${u.role}')">Editar</button>
             <button class="text-red-400 hover:text-red-300 hover:underline text-sm font-medium transition-colors" onclick="deleteAdminUser('${u.email}')">Excluir</button>`}
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3" style="color:var(--danger);">Erro: ${err.message}</td></tr>`;
  }
}

window.editAdminUser = function(email, role) {
  editingUserEmail = email;
  document.getElementById('adminFormTitle').textContent = `Editando Usuário: ${email}`;
  document.getElementById('newAdminEmail').value = email;
  document.getElementById('newAdminEmail').disabled = true;
  document.getElementById('newAdminRole').value = role;
  document.getElementById('newAdminPassword').value = '';
  document.getElementById('newAdminPassword').required = false;
  document.getElementById('btnCreateUser').textContent = 'Salvar';
  document.getElementById('btnCancelEdit').style.display = 'inline-block';
  document.getElementById('editHelperText').style.display = 'block';
}

function cancelEditUser() {
  editingUserEmail = null;
  document.getElementById('adminFormTitle').textContent = 'Adicionar Novo Usuário';
  document.getElementById('newAdminEmail').value = '';
  document.getElementById('newAdminEmail').disabled = false;
  document.getElementById('newAdminRole').value = 'user';
  document.getElementById('newAdminPassword').value = '';
  document.getElementById('newAdminPassword').required = true;
  document.getElementById('btnCreateUser').textContent = 'Criar';
  document.getElementById('btnCancelEdit').style.display = 'none';
  document.getElementById('editHelperText').style.display = 'none';
}

// Attach listener to cancel button
document.addEventListener('DOMContentLoaded', () => {
  const btnCancel = document.getElementById('btnCancelEdit');
  if (btnCancel) btnCancel.addEventListener('click', cancelEditUser);
});

async function createAdminUser() {
  const email = document.getElementById('newAdminEmail').value.trim();
  const password = document.getElementById('newAdminPassword').value;
  const role = document.getElementById('newAdminRole').value;
  
  if (!email) { toast('Preencha o email', 'error'); return; }
  if (!editingUserEmail && !password) { toast('Preencha a senha para criar o usuário', 'error'); return; }
  
  const btn = document.getElementById('btnCreateUser');
  const originalBtnText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '...';
  
  try {
    if (editingUserEmail) {
      await apiFetch('/api/users/update', { method: 'POST', body: { email, password, role } });
      toast('Usuário atualizado com sucesso!', 'success');
      cancelEditUser();
    } else {
      await apiFetch('/api/users/create', { method: 'POST', body: { email, password, role } });
      toast('Usuário criado com sucesso!', 'success');
      document.getElementById('newAdminEmail').value = '';
      document.getElementById('newAdminPassword').value = '';
    }
    await loadAdminUsers();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalBtnText;
  }
}

window.deleteAdminUser = async function(email) {
  if (!confirm(`Tem certeza que deseja remover o acesso de ${email}?`)) return;
  try {
    await apiFetch('/api/users/delete', { method: 'POST', body: { email } });
    toast('Usuário removido.', 'success');
    if (editingUserEmail === email) cancelEditUser();
    await loadAdminUsers();
  } catch (err) {
    toast(err.message, 'error');
  }
}

