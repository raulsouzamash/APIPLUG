import * as XLSX from 'xlsx';

// ─── State ────────────────────────────────────────────────
const state = {
  user: null,
  results: [],
  bufferedOrders: [],
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
    <!-- Top Navigation Bar -->
    <header class="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 shadow-lg mb-6 animate-slide-up sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <div class="flex-shrink-0 flex items-center gap-3 mr-8">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-pluggto to-green-500 flex items-center justify-center text-white font-bold shadow-[0_0_10px_rgba(16,169,88,0.4)]">P</div>
              <span class="font-bold text-lg text-slate-100 hidden sm:block tracking-wide">Pluggto Tools</span>
            </div>
            <div class="hidden sm:flex sm:space-x-8" id="navMenu">
              <button data-page="page-nfe" class="nav-tab active-tab border-pluggto text-white inline-flex items-center px-1 pt-1 border-b-2 text-sm font-semibold transition-colors shadow-[0_2px_0_0_rgba(16,169,88,1)]">NFe & Etiquetas</button>
              <button data-page="page-agendamentos" class="nav-tab border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors">Agendamentos</button>
              <button data-page="page-json" class="nav-tab border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors">Inspecionar JSON</button>
            </div>
          </div>
          <div class="flex items-center gap-4">
            ${state.user?.role === 'admin' ? '<button class="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 text-xs font-semibold py-1.5 px-3 rounded-md transition-colors" id="btnAdminPanel">Admin</button>' : ''}
            <span class="text-sm font-medium text-slate-400 hidden md:inline-block">${state.user?.email || ''}</span>
            <button class="text-slate-500 hover:text-red-400 text-sm font-medium transition-colors" id="logoutBtn">Sair</button>
          </div>
        </div>
      </div>
      <!-- Mobile menu -->
      <div class="sm:hidden flex overflow-x-auto border-t border-slate-800" id="navMenuMobile">
        <button data-page="page-nfe" class="nav-tab-mobile active-tab-mobile border-pluggto text-pluggto whitespace-nowrap py-3 px-4 border-b-2 font-semibold text-sm">NFe & Etiquetas</button>
        <button data-page="page-agendamentos" class="nav-tab-mobile border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm">Agendamentos</button>
        <button data-page="page-json" class="nav-tab-mobile border-transparent text-slate-400 hover:text-slate-200 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm">Inspecionar JSON</button>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 animate-slide-up" style="animation-delay: 0.1s;">
      
      <!-- Progresso Global -->
      <div class="glass-card p-6 hidden mb-6" id="progressCard">
        <div class="flex items-center gap-3 mb-4">
          <span class="spinner" style="border-color: #cbd5e1; border-top-color: #10A958;"></span>
          <h2 class="text-base font-semibold text-slate-800" id="progressTitle">Processando...</h2>
        </div>
        <div class="flex justify-between text-sm font-medium mb-2">
          <span class="text-slate-600" id="progLabel">Iniciando...</span>
          <span class="text-pluggto font-bold" id="progFrac">0 / 0</span>
        </div>
        <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-3 border border-slate-200">
          <div class="bg-pluggto h-full w-0 transition-all duration-300" id="progFill"></div>
        </div>
        <div class="text-sm text-slate-500" id="progStatus">Aguarde...</div>
      </div>

      <!-- ================= PAGE 1: NFe & Etiquetas ================= -->
      <div id="page-nfe" class="page-section flex flex-col gap-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- IDs dos pedidos -->
          <div class="glass-card p-6 lg:p-8">
            <div class="flex items-center gap-3 mb-5">
              <div class="w-8 h-8 rounded-full bg-pluggto/20 text-pluggto flex items-center justify-center font-bold border border-pluggto/30 shadow-[0_0_10px_rgba(16,169,88,0.2)]">1</div>
              <h2 class="text-lg font-bold text-slate-100">Cole os IDs dos Pedidos</h2>
            </div>
            <textarea id="orderInput" class="input-field min-h-[160px] font-mono text-base leading-relaxed"
              placeholder="Cole os IDs dos pedidos, um por linha:
260610Q971GUG0
260610Q5SMJKD0
..."></textarea>
            <div class="flex items-center justify-between mt-4">
              <div class="text-sm font-medium text-pluggto bg-pluggto/10 border border-pluggto/20 py-1.5 px-4 rounded-full">
                <b id="orderCount">0</b> pedidos
              </div>
              <button class="text-sm font-semibold text-slate-400 hover:text-slate-700 transition-colors" id="clearBtn">✕ Limpar</button>
            </div>
          </div>

          <!-- Ações -->
          <div class="glass-card p-6 lg:p-8">
            <div class="flex items-center gap-3 mb-5">
              <div class="w-8 h-8 rounded-full bg-pluggto/20 text-pluggto flex items-center justify-center font-bold border border-pluggto/30 shadow-[0_0_10px_rgba(16,169,88,0.2)]">2</div>
              <h2 class="text-lg font-bold text-slate-100">Escolha a Ação</h2>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 h-[160px]">
              <button class="flex flex-col items-center justify-center gap-3 p-5 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-pluggto/50 hover:shadow-lg transition-all group" id="btnNfe">
                <span class="text-4xl group-hover:scale-110 transition-transform drop-shadow-md">🔑</span>
                <span class="font-bold text-slate-200 tracking-wide">Buscar Chaves</span>
              </button>
              <button class="flex flex-col items-center justify-center gap-3 p-5 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-pluggto/50 hover:shadow-lg transition-all group" id="btnLabel">
                <span class="text-4xl group-hover:scale-110 transition-transform drop-shadow-md">🏷️</span>
                <span class="font-bold text-slate-200 tracking-wide">Baixar Etiquetas</span>
              </button>
              <button class="sm:col-span-2 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-pluggto/30 bg-pluggto/10 hover:bg-pluggto/20 hover:border-pluggto transition-all group shadow-sm hover:shadow-[0_0_15px_rgba(16,169,88,0.3)]" id="btnBoth">
                <span class="text-2xl group-hover:scale-110 transition-transform drop-shadow-md">⚡</span>
                <span class="font-bold text-pluggto text-lg tracking-wide">Ambos (NFe + Etiquetas)</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Resultados -->
        <div class="glass-card p-6 lg:p-8 hidden animate-fade-in" id="resultsCard">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-700 pb-4">
            <h2 class="text-xl font-bold text-slate-100 flex items-center gap-2 drop-shadow-sm">📊 Resultados</h2>
            <div class="flex gap-2" id="dlBtns"></div>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8" id="statsRow"></div>
          
          <div class="mb-6 hidden" id="filterContainer">
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span class="text-slate-400">🔍</span>
              </div>
              <input type="text" id="filterNfInput" class="input-field pl-12 max-w-md" placeholder="Buscar por Nº NF ou ID..." />
            </div>
          </div>

          <div class="overflow-x-auto border border-slate-200 rounded-xl">
            <table class="w-full text-left text-sm whitespace-nowrap">
              <thead class="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr id="tableHead"></tr>
              </thead>
              <tbody id="tableBody" class="divide-y divide-slate-100"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ================= PAGE 2: Agendamentos ================= -->
      <div id="page-agendamentos" class="page-section flex flex-col gap-6 hidden">
        <div class="glass-card p-6 lg:p-8 border-l-4 border-l-blue-500 bg-blue-900/20">
          <h2 class="text-lg font-bold text-slate-100 flex items-center gap-2 mb-2">📅 Exportar Agendamentos Pendentes</h2>
          <p class="text-base text-slate-300 mb-6">Busca e exporta uma planilha com todos os pedidos dos últimos 30 dias que não foram enviados e possuem "buffering_date" definido.</p>
          <button class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] transition-all w-full sm:w-auto text-base" id="btnDownloadBuffered">⬇ Baixar Agendamentos (.xlsx)</button>
        </div>

        <!-- Resultados Agendamentos -->
        <div class="glass-card p-6 lg:p-8 hidden animate-fade-in" id="bufferedResultsCard">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-700 pb-4">
            <h2 class="text-xl font-bold text-slate-100 flex items-center gap-2">📅 Agendamentos Encontrados</h2>
          </div>
          
          <div class="flex flex-col sm:flex-row gap-6 mb-8">
            <div class="bg-slate-800/80 border border-slate-700 p-5 rounded-xl text-center w-full sm:w-auto min-w-[160px] shadow-sm">
              <div class="text-3xl font-black text-slate-100" id="bufferedTotalCount">0</div>
              <div class="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">Total Encontrados</div>
            </div>
            
            <div class="flex-1 flex flex-col justify-center max-w-sm">
              <label class="label-text">Filtrar por Dia de Agendamento:</label>
              <input type="date" id="filterBufferedDate" class="input-field" />
            </div>
          </div>

          <div class="overflow-x-auto border border-slate-700 rounded-xl shadow-inner">
            <table class="w-full text-left text-sm whitespace-nowrap">
              <thead class="text-xs text-slate-400 uppercase bg-slate-800/80 border-b border-slate-700">
                <tr>
                  <th class="px-5 py-4">ID Interno</th>
                  <th class="px-5 py-4">ID Externo</th>
                  <th class="px-5 py-4">Status</th>
                  <th class="px-5 py-4">Data Criação</th>
                  <th class="px-5 py-4">Data Agendamento</th>
                </tr>
              </thead>
              <tbody id="bufferedTableBody" class="divide-y divide-slate-700/50 bg-slate-900/30 backdrop-blur-sm"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ================= PAGE 3: Inspecionar JSON ================= -->
      <div id="page-json" class="page-section flex flex-col gap-6 hidden">
        <div class="glass-card p-6 lg:p-8">
          <h2 class="text-lg font-bold text-slate-100 flex items-center gap-2 mb-6">🔎 Inspecionar Pedido (JSON Completo)</h2>
          <div class="flex flex-col sm:flex-row gap-4 mb-6">
            <select id="jsonSearchType" class="input-field sm:max-w-[220px]">
              <option value="external">ID Externo (ex: Shopee)</option>
              <option value="internal">ID Pluggto</option>
            </select>
            <input type="text" id="jsonSearchValue" class="input-field flex-1" placeholder="Digite o ID para ver o JSON completo retornado pela API..." />
            <button class="btn-primary py-3 px-8 text-base" id="btnSearchJson">Buscar JSON</button>
          </div>
          <div id="jsonResultContainer" class="hidden">
            <div class="flex justify-between items-center mb-3">
              <span class="text-sm font-bold text-slate-400">Resultado da Busca:</span>
              <button class="text-sm font-semibold text-pluggto hover:text-green-400 transition-colors" id="btnCopyJson">📋 Copiar JSON</button>
            </div>
            <pre id="jsonResultPre" class="bg-slate-800 border border-slate-700 rounded-xl p-6 text-sm font-mono text-green-400 max-h-[600px] overflow-auto shadow-inner"></pre>
          </div>
        </div>
      </div>

    </main>
    
    <!-- Admin Modal -->
    <div id="adminModal" class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] hidden items-center justify-center p-4 animate-fade-in">
      <div class="glass-panel w-full max-w-2xl p-8 relative overflow-hidden bg-slate-900 border border-slate-700/50 shadow-2xl">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold text-slate-100 flex items-center gap-2">👥 Painel de Usuários</h2>
          <button id="closeAdminModalBtn" class="text-slate-500 hover:text-slate-300 text-2xl transition-colors">✕</button>
        </div>
        
        <div class="bg-slate-800/80 border border-slate-700 p-6 rounded-xl mb-8 shadow-inner">
          <h3 id="adminFormTitle" class="text-sm font-bold text-slate-300 mb-4">Adicionar Novo Usuário</h3>
          <div class="flex flex-wrap gap-4 items-end">
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
        
        <h3 class="text-sm font-bold text-slate-300 mb-3">Usuários Cadastrados</h3>
        <div class="overflow-x-auto border border-slate-700 rounded-xl shadow-inner">
          <table class="w-full text-left text-sm">
            <thead class="text-xs text-slate-400 uppercase bg-slate-800/80 border-b border-slate-700">
              <tr><th class="px-5 py-3">Email</th><th class="px-5 py-3">Nível</th><th class="px-5 py-3 text-right">Ações</th></tr>
            </thead>
            <tbody id="adminUserList" class="divide-y divide-slate-700/50 bg-slate-900/30 backdrop-blur-sm"></tbody>
          </table>
        </div>
      </div>
    </div>`;

  // Events
  document.querySelectorAll('.nav-tab, .nav-tab-mobile').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const pageId = e.target.getAttribute('data-page');
      switchPage(pageId);
    });
  });

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
  document.getElementById('filterBufferedDate')?.addEventListener('change', renderBufferedTable);

  if (state.user?.role === 'admin') {
    document.getElementById('btnAdminPanel').addEventListener('click', openAdminPanel);
    document.getElementById('closeAdminModalBtn').addEventListener('click', () => {
      document.getElementById('adminModal').style.display = 'none';
    });
    document.getElementById('btnCreateUser').addEventListener('click', createAdminUser);
  }
}

function switchPage(pageId) {
  // Hide all pages
  document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
  // Show target page
  const target = document.getElementById(pageId);
  if (target) target.classList.remove('hidden');

  // Update desktop tabs
  document.querySelectorAll('#navMenu .nav-tab').forEach(tab => {
    if (tab.getAttribute('data-page') === pageId) {
      tab.classList.remove('border-transparent', 'text-slate-500');
      tab.classList.add('border-pluggto', 'text-slate-900');
    } else {
      tab.classList.add('border-transparent', 'text-slate-500');
      tab.classList.remove('border-pluggto', 'text-slate-900');
    }
  });

  // Update mobile tabs
  document.querySelectorAll('#navMenuMobile .nav-tab-mobile').forEach(tab => {
    if (tab.getAttribute('data-page') === pageId) {
      tab.classList.remove('border-transparent', 'text-slate-500');
      tab.classList.add('border-pluggto', 'text-pluggto');
    } else {
      tab.classList.add('border-transparent', 'text-slate-500');
      tab.classList.remove('border-pluggto', 'text-pluggto');
    }
  });
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
    shipping_informed: ['bg-green-50 text-green-700 border-green-200',  '✓ Enviado'],
    invoice_error:     ['bg-orange-50 text-orange-700 border-orange-200', '⚠ Erro NF'],
    approved:          ['bg-blue-50 text-blue-700 border-blue-200',   '● Enviar NF-e'],
    delivered:         ['bg-emerald-50 text-emerald-700 border-emerald-200',  '✓ Entregue'],
    cancelled:         ['bg-red-50 text-red-700 border-red-200',    '✕ Cancelado'],
  };
  const [cls, label] = map[status] || ['bg-slate-100 text-slate-700 border-slate-300', status || 'N/A'];
  return `<span class="px-2.5 py-1.5 rounded-md text-xs font-bold border ${cls} shadow-sm">${label}</span>`;
}

function renderResults(mode) {
  const res = state.results;
  const card = document.getElementById('resultsCard');
  card.classList.remove('hidden');

  // Stats
  const total    = res.length;
  const withKey  = res.filter(r => r.nfeKey).length;
  const withLbl  = res.filter(r => r.labelUrl).length;
  const approved = res.filter(r => r.status === 'approved').length;
  const errCount = res.filter(r => r.error || r.labelError).length;

  let stats = `
    <div class="bg-slate-800/80 border border-slate-700 p-5 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
      <div class="text-3xl font-black text-slate-100">${total}</div>
      <div class="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">Total processados</div>
    </div>`;
  if (mode === 'nfe' || mode === 'both')
    stats += `<div class="bg-slate-800/80 border border-pluggto/30 p-5 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
      <div class="text-3xl font-black text-pluggto">${withKey}</div>
      <div class="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">Com Chave NFe</div>
    </div>`;
  if (mode === 'label' || mode === 'both')
    stats += `<div class="bg-slate-800/80 border border-pluggto/30 p-5 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
      <div class="text-3xl font-black text-pluggto">${withLbl}</div>
      <div class="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">Com Etiqueta</div>
    </div>`;
  stats += `
    <div class="bg-slate-800/80 border border-blue-500/30 p-5 rounded-xl flex flex-col items-center justify-center text-center shadow-sm">
      <div class="text-3xl font-black text-blue-400">${approved}</div>
      <div class="text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">Enviar NF-e</div>
    </div>`;
  document.getElementById('statsRow').innerHTML = stats;

  // Download buttons
  const dlBtns = document.getElementById('dlBtns');
  dlBtns.innerHTML = '';
  if (mode === 'nfe' || mode === 'both') {
    const b = document.createElement('button');
    b.className = 'bg-pluggto/10 hover:bg-pluggto/20 text-pluggto border border-pluggto/30 font-bold py-2.5 px-5 rounded-lg shadow-sm transition-colors text-sm'; b.innerHTML = '⬇ Chaves NFe (.xlsx)';
    b.onclick = downloadNfeXlsx; dlBtns.appendChild(b);
  }
  if (mode === 'label' || mode === 'both') {
    const b = document.createElement('button');
    b.className = 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold py-2.5 px-5 rounded-lg shadow-sm transition-colors text-sm'; b.innerHTML = '⬇ Etiquetas (.xlsx)';
    b.onclick = downloadLabelsXlsx; dlBtns.appendChild(b);
  }
  if (withLbl > 0) {
    const b = document.createElement('button');
    b.className = 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold py-2.5 px-5 rounded-lg shadow-sm transition-colors text-sm'; b.innerHTML = `⬇ Baixar ${withLbl} PDFs`;
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

    while (keepFetching) {
      btn.innerHTML = `⏳ Buscando na Pluggto (página ${page})...`;
      const data = await apiFetch(`/api/orders/buffered?page=${page}`);
      
      if (data.orders && data.orders.length > 0) {
        allOrders.push(...data.orders);
      }

      if (page >= 50) {
        keepFetching = false;
      }

      if (!data.hasMore) {
        keepFetching = false;
      }

      if (keepFetching) {
        page++;
      }
    }

    if (allOrders.length === 0) {
      toast('Nenhum agendamento pendente encontrado.', 'info');
      btn.innerHTML = originalText;
      btn.disabled = false;
      return;
    }

    // Salvar no state e mostrar resultados
    state.bufferedOrders = allOrders;
    renderBufferedTable();


    toast(`Gerando planilha com ${allOrders.length} agendamentos...`, 'success');
    
    const wsData = [['ID Interno', 'ID Externo', 'Status', 'Data Agendamento (Buffering)', 'Data Criacao Pedido']];
    allOrders.forEach(o => {
      wsData.push([
        o.id,
        o.original_id || o.external || 'N/A',
        o.status,
        o.buffering_date || '',
        o.created || ''
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

function formatRelativeDate(dateStr) {
  if (!dateStr) return '-';
  const target = new Date(dateStr);
  const now = new Date();
  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const formattedDate = target.toLocaleDateString('pt-BR');
  if (diffDays === 0) return `${formattedDate} (hoje)`;
  if (diffDays === 1) return `${formattedDate} (amanhã)`;
  if (diffDays > 1) return `${formattedDate} (daqui a ${diffDays} dias)`;
  if (diffDays === -1) return `${formattedDate} (ontem)`;
  return `${formattedDate} (há ${Math.abs(diffDays)} dias)`;
}

function statusBufferedBadge(status) {
  if (status === 'shipping_informed') {
    return `<span class="px-2.5 py-1.5 rounded-md text-xs font-bold border bg-yellow-50 text-yellow-700 border-yellow-300 shadow-sm">📅 Agendado</span>`;
  }
  return statusBadge(status); // Fallback to existing
}

function renderBufferedTable() {
  const card = document.getElementById('bufferedResultsCard');
  const tbody = document.getElementById('bufferedTableBody');
  const countEl = document.getElementById('bufferedTotalCount');
  const filterVal = document.getElementById('filterBufferedDate')?.value || '';
  
  if (!card || !tbody || !countEl) return;
  card.classList.remove('hidden');
  
  let orders = state.bufferedOrders;
  
  if (filterVal) {
    orders = orders.filter(o => o.buffering_date && o.buffering_date.startsWith(filterVal));
  }
  
  countEl.textContent = orders.length;
  
  tbody.innerHTML = orders.map(o => {
    const createdStr = o.created ? new Date(o.created).toLocaleDateString('pt-BR') : '-';
    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="px-5 py-4 font-mono text-slate-700">${o.id || 'N/A'}</td>
        <td class="px-5 py-4 font-mono text-slate-700">${o.original_id || o.external || 'N/A'}</td>
        <td class="px-5 py-4">${statusBufferedBadge(o.status)}</td>
        <td class="px-5 py-4 text-slate-500">${createdStr}</td>
        <td class="px-5 py-4 text-pluggto font-bold">${formatRelativeDate(o.buffering_date)}</td>
      </tr>
    `;
  }).join('');
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
      tr.className = 'hover:bg-slate-50 transition-colors';
      const roleBadge = u.role === 'admin' 
        ? '<span class="bg-pluggto/10 text-pluggto border border-pluggto/30 px-2.5 py-1 rounded-md text-xs font-bold shadow-sm">Admin</span>' 
        : '<span class="bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-md text-xs font-bold shadow-sm">Usuário</span>';
        
      tr.innerHTML = `
        <td class="px-5 py-4 font-bold text-slate-800">${u.email}</td>
        <td class="px-5 py-4">${roleBadge}</td>
        <td class="px-5 py-4 text-right">
          ${u.isMain ? '<span class="text-slate-500 text-xs font-bold uppercase tracking-wider bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">Mestre</span>' : 
            `<button class="text-blue-600 hover:text-blue-500 hover:underline text-sm font-bold mr-4 transition-colors" onclick="editAdminUser('${u.email}', '${u.role}')">Editar</button>
             <button class="text-red-600 hover:text-red-500 hover:underline text-sm font-bold transition-colors" onclick="deleteAdminUser('${u.email}')">Excluir</button>`}
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

