const API_BASE = 'https://api.plugg.to';

// Cache de token Pluggto por instância de função (melhor esforço)
let _cachedToken = null;
let _tokenExpiry = 0;

/**
 * Autentica na Pluggto e retorna o access_token.
 * Usa cache em memória para evitar chamadas desnecessárias.
 */
async function getPluggtoToken() {
  if (_cachedToken && Date.now() < _tokenExpiry) {
    return _cachedToken;
  }

  const params = new URLSearchParams({
    client_id:     process.env.PLUGGTO_CLIENT_ID,
    client_secret: process.env.PLUGGTO_CLIENT_SECRET,
    grant_type:    'password',
    username:      process.env.PLUGGTO_USERNAME,
    password:      process.env.PLUGGTO_PASSWORD,
  });

  const resp = await fetch(`${API_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Autenticação Pluggto falhou (${resp.status}): ${body}`);
  }

  const data = await resp.json();
  if (!data.access_token) throw new Error('Pluggto não retornou access_token');

  _cachedToken = data.access_token;
  _tokenExpiry = Date.now() + ((data.expires_in || 3600) * 1000) - 60_000;

  return _cachedToken;
}

/**
 * Busca um pedido pelo ID externo (ex: ID Shopee).
 * Retorna o objeto order ou null se não encontrado.
 */
async function getOrderByExternal(token, extId) {
  const resp = await fetch(
    `${API_BASE}/orders?external=${encodeURIComponent(extId)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!resp.ok) {
    const errorBody = await resp.text().catch(() => '');
    throw new Error(`Erro ao buscar pedido ${extId}: ${resp.status} ${errorBody}`);
  }

  const data = await resp.json();
  let orders = [];
  if (Array.isArray(data))             orders = data;
  else if (Array.isArray(data.result)) orders = data.result;
  else if (Array.isArray(data.Order))  orders = data.Order;
  else if (Array.isArray(data.data))   orders = data.data;

  if (!orders.length) {
    // If Pluggto returned a single object instead of array
    if (data && data.Order && !Array.isArray(data.Order)) return data.Order;
    if (data && data.id) return data;
    return null;
  }
  return orders[0].Order || orders[0];
}

/**
 * Busca a URL da etiqueta de envio para um orderId interno da Pluggto.
 * Retorna a URL (string) ou null.
 */
async function getLabelUrl(token, orderId) {
  const resp = await fetch(
    `${API_BASE}/labels?orders=${orderId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!resp.ok) return null;
  const data = await resp.json();
  return data.urls?.[0] || null;
}

/**
 * Extrai o número da NF a partir da chave NFe de 44 dígitos.
 * Posições 26-34 (base 10, sem zeros à esquerda).
 */
function nfeKeyToNumber(nfeKey) {
  if (!nfeKey || nfeKey.length !== 44) return null;
  return String(parseInt(nfeKey.substring(25, 34), 10));
}

module.exports = { getPluggtoToken, getOrderByExternal, getLabelUrl, nfeKeyToNumber };
