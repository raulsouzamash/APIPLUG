const { requireAuth } = require('../_lib/auth');
const { getPluggtoToken, getOrderByExternal } = require('../_lib/pluggto');

const API_BASE = 'https://api.plugg.to';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const user = requireAuth(req, res);
  if (!user) return;

  const { searchType, searchValue } = req.body || {};

  if (!searchValue) {
    return res.status(400).json({ error: 'O valor de busca é obrigatório.' });
  }

  try {
    const token = await getPluggtoToken();
    let resultData = null;

    if (searchType === 'internal') {
      // Busca pelo ID interno da Pluggto
      const resp = await fetch(`${API_BASE}/orders/${encodeURIComponent(searchValue)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) {
        if (resp.status === 404) return res.status(404).json({ error: 'Pedido não encontrado (ID Pluggto).' });
        throw new Error(`Erro na API Pluggto: ${resp.status}`);
      }
      const data = await resp.json();
      resultData = data.Order || data;

    } else if (searchType === 'external') {
      // Busca pelo ID Externo (ex: Shopee)
      resultData = await getOrderByExternal(token, searchValue);
      if (!resultData) {
        return res.status(404).json({ error: 'Pedido não encontrado (ID Externo).' });
      }

    } else {
      return res.status(400).json({ error: 'Tipo de busca inválido. Use "internal" ou "external".' });
    }

    return res.status(200).json({ data: resultData });

  } catch (err) {
    console.error('[orders/json] Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
