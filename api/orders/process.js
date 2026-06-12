const { requireAuth } = require('../_lib/auth');
const { getPluggtoToken, getOrderByExternal, getLabelUrl, nfeKeyToNumber } = require('../_lib/pluggto');

const CHUNK_SIZE = 5;
const CHUNK_DELAY_MS = 250;
const MAX_ORDERS_PER_REQUEST = 30;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const user = requireAuth(req, res);
  if (!user) return;

  const { ids, action } = req.body || {};

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids deve ser um array não vazio.' });
  }

  if (!['nfe', 'label', 'both'].includes(action)) {
    return res.status(400).json({ error: 'Ação inválida. Use nfe, label ou both.' });
  }

  if (ids.length > MAX_ORDERS_PER_REQUEST) {
    return res.status(400).json({
      error: `Máximo ${MAX_ORDERS_PER_REQUEST} pedidos por requisição. O frontend deve enviar em lotes.`,
    });
  }

  // Sanitiza: permite apenas caracteres alfanuméricos e hífens
  const safeIds = ids.map(id => String(id).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 50));

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
              return { ext, error: 'Pedido não encontrado' };
            }

            const result = {
              id: order.id,
              ext: order.external || order.original_id || ext,
              status: order.status || null,
            };

            // NFe logic
            if (action === 'nfe' || action === 'both') {
              const shipment = order.shipments?.find(s => s.nfe_key);
              const nfeKey = shipment?.nfe_key || null;
              const nfeNum = nfeKey ? nfeKeyToNumber(nfeKey) : null;
              result.nfeKey = nfeKey;
              result.nfNumber = nfeNum;
              if (!nfeKey) result.error = 'Sem NFe';
            }

            // Etiqueta logic
            if (action === 'label' || action === 'both') {
              const labelUrl = await getLabelUrl(token, order.id);
              result.labelUrl = labelUrl;
              if (!labelUrl) result.labelError = 'Sem Etiqueta';
            }

            return result;
          } catch (e) {
            return { ext, error: e.message };
          }
        })
      );

      results.push(...chunkResults);

      if (i + CHUNK_SIZE < safeIds.length) {
        await new Promise(r => setTimeout(r, CHUNK_DELAY_MS));
      }
    }

    return res.status(200).json({ data: results });
  } catch (err) {
    console.error('[orders/process] Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
