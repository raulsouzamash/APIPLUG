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

    // Vamos tentar buscar por sub_status=waiting_expedition para reduzir a carga.
    // E também limitamos em até 50 páginas (5000 pedidos)
    while (hasMore && page <= 50) { 
      const resp = await fetch(`${API_BASE}/orders?sub_status=waiting_expedition&limit=100&page=${page}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!resp.ok) {
        throw new Error(`Erro Pluggto: ${resp.status}`);
      }

      const data = await resp.json();
      const results = data.result || data.Order || []; 

      if (results.length === 0) {
        hasMore = false;
      } else {
        allOrders.push(...results);
        if (results.length < 100) hasMore = false;
        else page++;
      }
    }

    // Caso a API ignore o sub_status e retorne tudo, precisamos garantir que o filtro local funcione.
    // Além disso, a data de agendamento pode estar na raiz (buffering_date) ou dentro de shipments[].
    const scheduledOrders = allOrders
      .filter(o => {
        const rootBuffered = !!o.buffering_date;
        const shipmentBuffered = o.shipments && o.shipments.some(s => s.buffering_date);
        return rootBuffered || shipmentBuffered;
      })
      .map(o => {
        // Pega do root ou do primeiro shipment
        const bDate = o.buffering_date || (o.shipments && o.shipments[0]?.buffering_date) || null;
        const eDate = o.expected_collection_date || (o.shipments && o.shipments[0]?.expected_collection_date) || null;
        const sComp = o.shipping_company || (o.shipments && o.shipments[0]?.shipping_company) || 'N/A';
        const sMeth = o.shipping_method || (o.shipments && o.shipments[0]?.shipping_method) || 'N/A';

        return {
          id: o.id,
          external: o.external || 'N/A',
          status: o.status,
          sub_status: o.sub_status,
          buffering_date: bDate,
          expected_collection_date: eDate,
          shipping_company: sComp,
          shipping_method: sMeth,
        };
      });

    return res.status(200).json({ ok: true, total: scheduledOrders.length, orders: scheduledOrders });
  } catch (err) {
    console.error('[orders/buffered] Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
