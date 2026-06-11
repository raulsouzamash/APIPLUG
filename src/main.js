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
    <div class="login-page">
      <div class="login-box">
        <div class="login-logo">
          <div class="login-logo-icon">📦</div>
          <div>
            <h1>Pluggto Tools</h1>
            <span>Painel Interno</span>
          </div>
        </div>
        <p class="login-subtitle">Faça login com suas credenciais para continuar.</p>
        <form id="loginForm" autocomplete="on">
          <div class="form-group">
            <label class="form-label" for="email">Email</label>
            <input class="form-input" id="email" name="email" type="email"
              placeholder="seu@email.com" autocomplete="email" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="password">Senha</label>
            <input class="form-input" id="password" name="password" type="password"
              placeholder="••••••••" autocomplete="current-password" required />
          </div>
          <button class="btn-login" type="submit" id="loginBtn">
            <span id="loginBtnText">Entrar</span>
          </button>
          <div class="login-error" id="loginError"></div>
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
    <header class="app-header">
      <div class="header-logo">
        <div class="header-icon">📦</div>
        <div>
          <h1>Pluggto Tools</h1>
          <small>Chaves NFe & Etiquetas de Envio</small>
        </div>
      </div>
      <div class="header-right">
        ${state.user?.role === 'admin' ? '<button class="btn-dl blue" id="btnAdminPanel" style="margin-right:10px;">Painel Admin</button>' : ''}
        <span class="header-user">${state.user?.email || ''}</span>
        <button class="btn-logout" id="logoutBtn">Sair</button>
      </div>
    </header>

    <main class="app-main fade-in">

      <!-- IDs dos pedidos -->
      <div class="card">
        <div class="card-label"><div class="step-num">1</div>Cole os IDs dos Pedidos</div>
        <textarea id="orderInput"
          placeholder="Cole os IDs dos pedidos, um por linha:
260610Q971GUG0
260610Q5SMJKD0
260611SKD55QD0
..."></textarea>
        <div class="textarea-meta">
          <div class="count-pill"><b id="orderCount">0</b> pedidos detectados</div>
          <button class="btn-clear" id="clearBtn">✕ Limpar</button>
        </div>
      </div>

      <!-- Ações -->
      <div class="card">
        <div class="card-label"><div class="step-num">2</div>Escolha a Ação</div>
        <div class="actions-grid">
          <button class="action-btn nfe" id="btnNfe">
            <span class="btn-icon">🔑</span>
            <span class="btn-title">Buscar Chaves NFe</span>
            <span class="btn-desc">Exporta XLSX com chaves e nº NF</span>
          </button>
          <button class="action-btn label" id="btnLabel">
            <span class="btn-icon">🏷️</span>
            <span class="btn-title">Baixar Etiquetas</span>
            <span class="btn-desc">Links das etiquetas em XLSX + PDFs</span>
          </button>
          <button class="action-btn both" id="btnBoth">
            <span class="btn-icon">⚡</span>
            <span class="btn-title">Ambos</span>
            <span class="btn-desc">NFe + Etiquetas em uma operação</span>
          </button>
        </div>
      </div>

      <!-- Busca JSON -->
      <div class="card">
        <div class="card-label">🔎 Inspecionar Pedido (JSON Completo)</div>
        <div style="display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap;">
          <select id="jsonSearchType" class="form-input" style="width: auto; max-width: 200px;">
            <option value="external">ID Externo (ex: Shopee)</option>
            <option value="internal">ID Pluggto</option>
          </select>
          <input type="text" id="jsonSearchValue" class="form-input" style="flex: 1; min-width: 200px;" placeholder="Digite o ID para ver o JSON..." />
          <button class="btn-dl blue" id="btnSearchJson" style="padding: 10px 16px;">Buscar JSON</button>
        </div>
        <div id="jsonResultContainer" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 12px; font-weight: 600;">Resultado:</span>
            <button class="btn-clear" id="btnCopyJson">Copiar JSON</button>
          </div>
          <pre id="jsonResultPre" style="background: var(--bg); border: 1px solid var(--border2); border-radius: var(--radius-sm); padding: 14px; font-size: 12px; max-height: 400px; overflow: auto; color: var(--accent);"></pre>
        </div>
      </div>

      <!-- Progresso -->
      <div class="card progress-card" id="progressCard">
        <div class="card-label" id="progressTitle">⏳ Processando...</div>
        <div class="prog-top">
          <div class="prog-label" id="progLabel">Iniciando...</div>
          <div class="prog-frac" id="progFrac">0 / 0</div>
        </div>
        <div class="prog-track"><div class="prog-fill" id="progFill"></div></div>
        <div class="prog-status"><span class="spinner"></span><span id="progStatus">Aguarde...</span></div>
      </div>

      <!-- Resultados -->
      <div class="card results-card" id="resultsCard">
        <div class="results-header">
          <div class="results-title">📊 Resultados</div>
          <div class="dl-btns" id="dlBtns"></div>
        </div>
        <div class="stats-row" id="statsRow"></div>
        <div class="table-wrap">
          <table>
            <thead><tr id="tableHead"></tr></thead>
            <tbody id="tableBody"></tbody>
          </table>
        </div>
      </div>

    </main>
    
    <!-- Admin Modal -->
    <div id="adminModal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 9999; align-items: center; justify-content: center; padding: 20px;">
      <div class="modal-content" style="max-width: 600px; width: 100%; background: var(--bg); padding: 24px; border-radius: var(--radius); border: 1px solid var(--border); box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 18px;">👥 Painel de Usuários</h2>
          <button id="closeAdminModalBtn" style="background: none; border: none; color: var(--text2); cursor: pointer; font-size: 20px;">✕</button>
        </div>
        
        <div style="background: var(--bg-alt); padding: 16px; border-radius: var(--radius-sm); margin-bottom: 20px;">
          <h3 style="margin-top: 0; font-size: 14px; margin-bottom: 12px;">Adicionar Novo Usuário</h3>
          <div style="display: flex; gap: 10px;">
            <input type="email" id="newAdminEmail" class="form-input" placeholder="Email" style="flex: 1;" />
            <input type="password" id="newAdminPassword" class="form-input" placeholder="Senha" style="width: 150px;" />
            <button id="btnCreateUser" class="btn-dl green" style="padding: 8px 16px;">Criar</button>
          </div>
        </div>
        
        <h3 style="margin-top: 0; font-size: 14px; margin-bottom: 12px;">Usuários Cadastrados</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Email</th><th>Nível</th><th>Ações</th></tr></thead>
            <tbody id="adminUserList"></tbody>
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
    shipping_informed: ['green',  '✓ Enviado'],
    invoice_error:     ['orange', '⚠ Erro NF'],
    approved:          ['blue',   '● Enviar NF-e'],
    delivered:         ['green',  '✓ Entregue'],
    cancelled:         ['red',    '✕ Cancelado'],
  };
  const [cls, label] = map[status] || ['gray', status || 'N/A'];
  return `<span class="badge ${cls}">${label}</span>`;
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
    <div class="stat-box c-total"><div class="stat-val">${total}</div><div class="stat-lbl">Total processados</div></div>`;
  if (mode === 'nfe' || mode === 'both')
    stats += `<div class="stat-box c-ok"><div class="stat-val">${withKey}</div><div class="stat-lbl">Com Chave NFe</div></div>`;
  if (mode === 'label' || mode === 'both')
    stats += `<div class="stat-box c-ok"><div class="stat-val">${withLbl}</div><div class="stat-lbl">Com Etiqueta</div></div>`;
  stats += `
    <div class="stat-box c-warn"><div class="stat-val">${approved}</div><div class="stat-lbl">Enviar NF-e</div></div>`;
  document.getElementById('statsRow').innerHTML = stats;

  // Download buttons
  const dlBtns = document.getElementById('dlBtns');
  dlBtns.innerHTML = '';
  if (mode === 'nfe' || mode === 'both') {
    const b = document.createElement('button');
    b.className = 'btn-dl green'; b.innerHTML = '⬇ Chaves NFe (.xlsx)';
    b.onclick = downloadNfeXlsx; dlBtns.appendChild(b);
  }
  if (mode === 'label' || mode === 'both') {
    const b = document.createElement('button');
    b.className = 'btn-dl blue'; b.innerHTML = '⬇ Etiquetas (.xlsx)';
    b.onclick = downloadLabelsXlsx; dlBtns.appendChild(b);
  }
  if (withLbl > 0) {
    const b = document.createElement('button');
    b.className = 'btn-dl orange'; b.innerHTML = `⬇ Baixar ${withLbl} PDFs`;
    b.onclick = downloadAllPdfs; dlBtns.appendChild(b);
  }

  // Table head
  let heads = '<th class="td-num">#</th><th>ID Pedido</th><th>Status</th>';
  if (mode === 'nfe' || mode === 'both') heads += '<th>Nº NF</th><th>Chave NFe</th>';
  if (mode === 'label' || mode === 'both') heads += '<th>Etiqueta</th>';
  document.getElementById('tableHead').innerHTML = heads;

  // Table body
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';
  res.forEach((r, i) => {
    const tr = document.createElement('tr');
    let cols = `
      <td class="td-num">${i + 1}</td>
      <td class="td-id">${r.ext}</td>
      <td>${statusBadge(r.status)}</td>`;
    if (mode === 'nfe' || mode === 'both') {
      cols += `<td class="td-nf">${r.nfeNum ?? '<span style="color:var(--text3)">—</span>'}</td>`;
      cols += `<td class="td-key" title="${r.nfeKey ?? ''}">${r.nfeKey ?? '<span style="color:var(--text3)">—</span>'}</td>`;
    }
    if (mode === 'label' || mode === 'both') {
      cols += `<td>${r.labelUrl
        ? `<a class="link-pdf" href="${r.labelUrl}" target="_blank" rel="noopener">⬇ PDF</a>`
        : `<span class="no-url">${r.labelError || '—'}</span>`}</td>`;
    }
    tr.innerHTML = cols;
    tbody.appendChild(tr);
  });

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

async function downloadAllPdfs() {
  const withUrl = state.results.filter(r => r.labelUrl);
  if (!withUrl.length) { toast('Nenhuma etiqueta disponível.', 'error'); return; }
  toast(`Baixando ${withUrl.length} PDFs...`, 'info');
  for (const r of withUrl) {
    const a = document.createElement('a');
    a.href = r.labelUrl;
    a.download = `etiqueta_${r.ext}.pdf`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    await sleep(700);
  }
  toast(`${withUrl.length} PDFs iniciados!`, 'success');
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

// ─── Admin Panel ──────────────────────────────────────────
async function openAdminPanel() {
  document.getElementById('adminModal').style.display = 'flex';
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
      tr.innerHTML = `
        <td>${u.email}</td>
        <td><span class="badge ${u.role === 'admin' ? 'blue' : 'green'}">${u.role}</span></td>
        <td>
          ${u.isMain ? '<span style="color:var(--text3);font-size:12px;">Mestre</span>' : 
            `<button class="btn-clear" onclick="deleteAdminUser('${u.email}')" style="color: var(--danger); border: 1px solid var(--danger);">Excluir</button>`}
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3" style="color:var(--danger);">Erro: ${err.message}</td></tr>`;
  }
}

async function createAdminUser() {
  const email = document.getElementById('newAdminEmail').value.trim();
  const password = document.getElementById('newAdminPassword').value;
  if (!email || !password) { toast('Preencha email e senha', 'error'); return; }
  
  const btn = document.getElementById('btnCreateUser');
  btn.disabled = true;
  btn.textContent = '...';
  
  try {
    await apiFetch('/api/users/create', { method: 'POST', body: { email, password } });
    toast('Usuário criado com sucesso!', 'success');
    document.getElementById('newAdminEmail').value = '';
    document.getElementById('newAdminPassword').value = '';
    await loadAdminUsers();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Criar';
  }
}

window.deleteAdminUser = async function(email) {
  if (!confirm(`Tem certeza que deseja remover o acesso de ${email}?`)) return;
  try {
    await apiFetch('/api/users/delete', { method: 'POST', body: { email } });
    toast('Usuário removido.', 'success');
    await loadAdminUsers();
  } catch (err) {
    toast(err.message, 'error');
  }
}

