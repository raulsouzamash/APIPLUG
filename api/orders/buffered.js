const { requireAuth } = require('../_lib/auth');
const { getPluggtoToken } = require('../_lib/pluggto');

const API_BASE = 'https://api.plugg.to';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const user = requireAuth(req, res);
  if (!user) return;

  try {
    const token = await getPluggtoToken();
    let allOrders = [];
    let page = 1;
    let hasMore = true;

    // Buscamos pedidos com status buffered (e approved por segurança, pois não foram enviados)
    // A Pluggto normalmente suporta comma-separated status
    while (hasMore && page <= 10) { // limite de segurança de 10 páginas (1000 pedidos)
      const resp = await fetch(`${API_BASE}/orders?status=buffered,approved&limit=100&page=${page}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!resp.ok) {
        throw new Error(`Erro Pluggto: ${resp.status}`);
      }

      const data = await resp.json();
      const results = data.result || data.Order || []; // A API da Pluggto pode retornar em 'result' ou direto

      if (results.length === 0) {
        hasMore = false;
      } else {
        allOrders.push(...results);
        if (results.length < 100) hasMore = false;
        else page++;
      }
    }

    // Filtra apenas os que possuem buffering_date (agendamentos) e mapeia os dados
    const scheduledOrders = allOrders
      .filter(o => o.buffering_date)
      .map(o => ({
        id: o.id,
        external: o.external || 'N/A',
        status: o.status,
        buffering_date: o.buffering_date,
        expected_collection_date: o.expected_collection_date || 'N/A',
        shipping_company: o.shipping_company || 'N/A',
        shipping_method: o.shipping_method || 'N/A',
      }));

    return res.status(200).json({ ok: true, total: scheduledOrders.length, orders: scheduledOrders });
  } catch (err) {
    console.error('[orders/buffered] Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
