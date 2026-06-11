const { requireAuth } = require('../_lib/auth');
const { getPluggtoToken, getOrderByExternal, nfeKeyToNumber } = require('../_lib/pluggto');

const CHUNK_SIZE = 5;
const CHUNK_DELAY_MS = 250;
const MAX_ORDERS_PER_REQUEST = 30;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const user = requireAuth(req, res);
  if (!user) return;

  const { orderIds } = req.body || {};

  if (!Array.isArray(orderIds) || orderIds.length === 0) {
    return res.status(400).json({ error: 'orderIds deve ser um array não vazio.' });
  }

  if (orderIds.length > MAX_ORDERS_PER_REQUEST) {
    return res.status(400).json({
      error: `Máximo ${MAX_ORDERS_PER_REQUEST} pedidos por requisição. O frontend deve enviar em lotes.`,
    });
  }

  // Sanitiza: somente strings alfanuméricas
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
              return { ext, nfeKey: null, nfeNum: null, status: null, error: 'Não encontrado' };
            }

            const shipment = order.shipments?.find(s => s.nfe_key);
            const nfeKey = shipment?.nfe_key || null;
            const nfeNum = nfeKey ? nfeKeyToNumber(nfeKey) : null;

            return {
              ext,
              nfeKey,
              nfeNum,
              status: order.status || null,
              error: null,
            };
          } catch (e) {
            return { ext, nfeKey: null, nfeNum: null, status: null, error: e.message };
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
    console.error('[orders/nfe] Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
