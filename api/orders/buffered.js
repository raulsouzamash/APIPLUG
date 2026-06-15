const { requireAuth } = require('../_lib/auth');
const { getPluggtoToken, nfeKeyToNumber } = require('../_lib/pluggto');

const API_BASE = 'https://api.plugg.to';

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const user = requireAuth(req, res);
  if (!user) return;

  const page = parseInt(req.query.page) || 1;

  try {
    const token = await getPluggtoToken();

    // Busca apenas 1 página por vez para não dar timeout, a paginação será controlada pelo Frontend
    // Usando uma gama maior de status (incluindo invoiced e shipped) para não perder agendados
    const resp = await fetch(`${API_BASE}/orders?status=approved,in_separation,invoiced,shipping_informed,buffered,shipped&sort=-created&limit=100&page=${page}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!resp.ok) {
      throw new Error(`Erro Pluggto: ${resp.status}`);
    }

    const data = await resp.json();
    const results = data.result || data.Order || []; 

    // Pega a data de criação do último pedido da página para o frontend saber se deve continuar
    const lastOrderDate = results.length > 0 ? results[results.length - 1].created : null;

    // Filtra apenas os que possuem buffering_date (agendamentos)
    const scheduledOrders = results
      .map(item => item.Order ? item.Order : item)
      .filter(o => {
        const rootBuffered = !!o.buffering_date;
        const shipmentBuffered = o.shipments && o.shipments.some(s => s.buffering_date);
        if (!rootBuffered && !shipmentBuffered) return false;

        const bDateStr = o.buffering_date || (o.shipments && o.shipments.find(s => s.buffering_date)?.buffering_date);
        if (!bDateStr) return false;

        // Pega a data de hoje no fuso do Brasil (formato YYYY-MM-DD)
        const brTime = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
        const today = new Date(brTime);
        const todayStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, '0') + "-" + String(today.getDate()).padStart(2, '0');

        // Como a data da Pluggto é no formato YYYY-MM-DD, a comparação de string funciona perfeitamente
        return bDateStr.substring(0, 10) >= todayStr;
      })
      .map(o => {
        const bDate = o.buffering_date || (o.shipments && o.shipments[0]?.buffering_date) || null;
        const eDate = o.expected_collection_date || (o.shipments && o.shipments[0]?.expected_collection_date) || null;
        const sComp = o.shipping_company || (o.shipments && o.shipments[0]?.shipping_company) || 'N/A';
        const sMeth = o.shipping_method || (o.shipments && o.shipments[0]?.shipping_method) || 'N/A';
        
        const shipmentWithNfe = o.shipments?.find(s => s.nfe_key);
        const nfeKey = shipmentWithNfe?.nfe_key || null;
        const nfeNum = nfeKey ? nfeKeyToNumber(nfeKey) : null;

        return {
          id: o.id,
          ext: o.external || o.original_id || 'N/A',
          other_ids: o.other_ids ? o.other_ids.map(i => String(i.code)) : [],
          created: o.created,
          status: o.status,
          sub_status: o.sub_status,
          buffering_date: bDate,
          expected_collection_date: eDate,
          shipping_company: sComp,
          shipping_method: sMeth,
          nfeKey: nfeKey,
          nfNumber: nfeNum,
        };
      });

    // Ordena de forma crescente pela data de agendamento (buffering_date)
    scheduledOrders.sort((a, b) => {
      if (!a.buffering_date) return 1;
      if (!b.buffering_date) return -1;
      return new Date(a.buffering_date) - new Date(b.buffering_date);
    });

    return res.status(200).json({ 
      ok: true, 
      orders: scheduledOrders, 
      hasMore: results.length === 100,
      lastOrderDate 
    });
  } catch (err) {
    console.error('[orders/buffered] Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
