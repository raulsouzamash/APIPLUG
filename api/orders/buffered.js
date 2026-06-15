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

    // Busca de forma paralela 1 página para CADA status importante.
    // Isso garante 100% que a Pluggto vai filtrar certo (pois usamos status= único) 
    // e garante que pedidos raros (como shipping_informed) não sejam soterrados por milhares de pedidos.
    const statusesToFetch = ['approved', 'in_separation', 'invoiced', 'shipping_informed', 'buffered'];
    
    const fetchPromises = statusesToFetch.map(async (status) => {
      try {
        const resp = await fetch(`${API_BASE}/orders?status=${status}&sort=-created&limit=100&page=${page}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!resp.ok) return [];
        const data = await resp.json();
        return data.result || data.Order || [];
      } catch (e) {
        return [];
      }
    });

    const resultsArray = await Promise.all(fetchPromises);
    let results = [];
    resultsArray.forEach(arr => results.push(...arr));

    // Remove possíveis duplicados (caso a API da Pluggto tenha retornado o mesmo pedido por mudança de status no mesmo segundo)
    const uniqueIds = new Set();
    results = results.filter(item => {
      const id = item.Order ? item.Order.id : item.id;
      if (uniqueIds.has(id)) return false;
      uniqueIds.add(id);
      return true;
    });

    const validStatuses = ['approved', 'in_separation', 'invoiced', 'shipping_informed', 'buffered'];

    // Filtra apenas os que possuem buffering_date (agendamentos) e o status correto
    const scheduledOrders = results
      .map(item => item.Order ? item.Order : item)
      .filter(o => {
        if (!validStatuses.includes(o.status)) return false;

        const rootBuffered = !!o.buffering_date;
        const shipmentBuffered = o.shipments && o.shipments.some(s => s.buffering_date);
        if (!rootBuffered && !shipmentBuffered) return false;

        const bDateStr = o.buffering_date || (o.shipments && o.shipments.find(s => s.buffering_date)?.buffering_date);
        if (!bDateStr) return false;

        // Usa UTC-3 manualmente para evitar problemas de Intl/Locale na Vercel
        const now = new Date();
        const brTime = new Date(now.getTime() - 3 * 3600 * 1000);
        const todayStr = brTime.toISOString().substring(0, 10);

        // Como a data da Pluggto é no formato YYYY-MM-DD, a comparação de string funciona
        return String(bDateStr).substring(0, 10) >= todayStr;
      })
      .map(o => {
        const bDate = o.buffering_date || (o.shipments && o.shipments[0]?.buffering_date) || null;
        const eDate = o.expected_collection_date || (o.shipments && o.shipments[0]?.expected_collection_date) || null;
        const sComp = o.shipping_company || (o.shipments && o.shipments[0]?.shipping_company) || 'N/A';
        const sMeth = o.shipping_method || (o.shipments && o.shipments[0]?.shipping_method) || 'N/A';
        
        const shipmentWithNfe = o.shipments?.find(s => s.nfe_key);
        const nfeKey = shipmentWithNfe?.nfe_key || null;
        const nfeNum = nfeKey ? nfeKeyToNumber(nfeKey) : null;
        const nfeDate = shipmentWithNfe?.nfe_date || null;

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
          nfeDate: nfeDate,
        };
      });

    // Ordena de forma crescente pela data de agendamento (buffering_date)
    scheduledOrders.sort((a, b) => {
      if (!a.buffering_date) return 1;
      if (!b.buffering_date) return -1;
      return new Date(a.buffering_date) - new Date(b.buffering_date);
    });

    // Define a data do último pedido (apenas para compatibilidade, o frontend usa hasMore)
    const lastOrderDate = results.length > 0 
      ? (results[results.length - 1].Order ? results[results.length - 1].Order.created : results[results.length - 1].created) 
      : null;

    return res.status(200).json({ 
      ok: true, 
      orders: scheduledOrders, 
      hasMore: results.length > 0,
      lastOrderDate 
    });
  } catch (err) {
    console.error('[orders/buffered] Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
