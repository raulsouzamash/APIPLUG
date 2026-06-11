const { requireAuth } = require('../_lib/auth');
const { getPluggtoToken } = require('../_lib/pluggto');

const API_BASE = 'https://api.plugg.to';
const MAX_IDS_PER_URL = 50; // Limite de segurança para evitar estourar limite de tamanho de URL

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const user = requireAuth(req, res);
  if (!user) return;

  const { orderIds } = req.body || {};

  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return res.status(400).json({ error: 'Nenhum orderId fornecido.' });
  }

  try {
    const token = await getPluggtoToken();
    const consolidatedUrls = [];

    // Fatiar os IDs para não criar uma URL gigante
    for (let i = 0; i < orderIds.length; i += MAX_IDS_PER_URL) {
      const chunk = orderIds.slice(i, i + MAX_IDS_PER_URL);
      const query = chunk.join(',');

      const resp = await fetch(`${API_BASE}/labels?orders=${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.urls && data.urls.length > 0) {
          // A Pluggto normalmente consolida em poucas URLs
          consolidatedUrls.push(...data.urls);
        }
      }
    }

    return res.status(200).json({ urls: [...new Set(consolidatedUrls)] });

  } catch (err) {
    console.error('[orders/bulk-labels] Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
