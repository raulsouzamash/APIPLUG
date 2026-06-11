const { requireAuth } = require('../_lib/auth');
const { getPluggtoToken, getOrderByExternal, getLabelUrl, nfeKeyToNumber } = require('../_lib/pluggto');

const CHUNK_SIZE = 4;
const CHUNK_DELAY_MS = 300;
const MAX_ORDERS_PER_REQUEST = 25;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const user = requireAuth(req, res);
  if (!user) return;

  const { orderIds, includeNfe } = req.body || {};

  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return res.status(400).json({ error: 'orderIds deve ser um array não vazio.' });
  }

  if (orderIds.length > MAX_ORDERS_PER_REQUEST) {
    return res.status(400).json({
      error: `Máximo ${MAX_ORDERS_PER_REQUEST} pedidos por requisição.`,
    });
  }

  const safeIds = orderIds.map(id => String(id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32));

  try {
    const token = await getPluggtoToken();
    const results = [];

    for (let i = 0; i < safeIds.length; i += CHUNK_SIZE) {
      const chunk = safeIds.slice(i, i + CHUNK_SIZE);

      const chunkResults = await Promise.all(
        chunk.map(async (ext) => {
          try {
            const order = await getOrderByExternal(token, ext);
            if (!order) {
              return { ext, orderId: null, nfeKey: null, nfeNum: null, status: null, labelUrl: null, labelError: 'Pedido não encontrado' };
            }

            const orderId = order.id;
            const status  = order.status || null;

            // NFe key (opcional, quando includeNfe=true)
            let nfeKey = null;
            let nfeNum = null;
            if (includeNfe) {
              const shipment = order.shipments?.find(s => s.nfe_key);
              nfeKey = shipment?.nfe_key || null;
              nfeNum = nfeKey ? nfeKeyToNumber(nfeKey) : null;
            }

            // Busca a URL da etiqueta
            let labelUrl = null;
            let labelError = null;
            try {
              labelUrl = await getLabelUrl(token, orderId);
              if (!labelUrl) labelError = `Sem etiqueta (status: ${status})`;
            } catch (e) {
              labelError = e.message;
            }

            return { ext, orderId, nfeKey, nfeNum, status, labelUrl, labelError };
          } catch (e) {
            return { ext, orderId: null, nfeKey: null, nfeNum: null, status: null, labelUrl: null, labelError: e.message };
          }
        })
      );

      results.push(...chunkResults);

      if (i + CHUNK_SIZE < safeIds.length) {
        await new Promise(r => setTimeout(r, CHUNK_DELAY_MS));
      }
    }

    return res.status(200).json({ results });
  } catch (err) {
    console.error('[orders/labels] Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
