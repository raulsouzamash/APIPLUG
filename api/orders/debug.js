const { getPluggtoToken } = require('../_lib/pluggto');

const API_BASE = 'https://api.plugg.to';

module.exports = async function handler(req, res) {
  try {
    const token = await getPluggtoToken();
    const extId = '2000013515471907';

    let report = [];
    report.push("Iniciando debug para o pedido: " + extId);

    // 1. Busca o pedido direto
    const resp1 = await fetch(`${API_BASE}/orders?external=${extId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data1 = await resp1.json();
    let order = null;
    if (data1 && data1.Order && Array.isArray(data1.Order)) order = data1.Order[0];
    else if (data1 && data1.result && Array.isArray(data1.result)) order = data1.result[0].Order || data1.result[0];
    else if (Array.isArray(data1)) order = data1[0].Order || data1[0];
    
    if (!order) {
      report.push("Falha: Pedido não encontrado buscando diretamente por external=" + extId);
      return res.status(200).json({ report });
    }

    report.push(`Pedido encontrado diretamente! ID Interno: ${order.id}, Status: ${order.status}`);
    
    // 2. Busca nas páginas do buffered
    let foundInBuffered = false;
    let page = 1;
    let maxPages = 10;
    
    report.push(`Procurando o pedido nas primeiras ${maxPages} páginas do endpoint /orders?status=shipping_informed,buffered,approved`);

    while (page <= maxPages) {
      const resp2 = await fetch(`${API_BASE}/orders?status=approved,in_separation,invoiced,shipping_informed,buffered,shipped&sort=-created&limit=100&page=${page}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data2 = await resp2.json();
      const results = data2.result || data2.Order || [];
      
      if (results.length === 0) {
        report.push(`Página ${page}: Vazia. Fim da busca.`);
        break;
      }
      
      report.push(`Página ${page}: ${results.length} pedidos. Do dia ${results[0].Order?.created} até ${results[results.length-1].Order?.created}`);
      
      const found = results.find(r => {
        const o = r.Order || r;
        return String(o.id) === String(order.id) || 
               String(o.external) === String(extId) || 
               String(o.original_id) === String(extId) ||
               (o.other_ids && o.other_ids.some(i => String(i.code) === String(extId)));
      });

      if (found) {
        foundInBuffered = true;
        report.push(`SUCESSO! Pedido encontrado na página ${page} do /orders!`);
        
        // Verifica os filtros de buffered.js
        const o = found.Order || found;
        const rootBuffered = !!o.buffering_date;
        const shipmentBuffered = o.shipments && o.shipments.some(s => s.buffering_date);
        report.push(`Filtro buffering_date raiz: ${rootBuffered}`);
        report.push(`Filtro buffering_date shipments: ${shipmentBuffered}`);
        if (!rootBuffered && !shipmentBuffered) {
          report.push(`MOTIVO DA FALHA: O pedido não passou no filtro do buffered.js pois buffering_date é nulo em todos os lugares.`);
        } else {
          report.push(`Passou em todos os filtros. Deveria estar aparecendo!`);
        }
        break;
      }
      
      page++;
    }

    if (!foundInBuffered) {
      report.push(`MOTIVO DA FALHA: O pedido não foi retornado pela Pluggto nas primeiras ${maxPages} páginas da busca com status=shipping_informed,buffered,approved. Verifique se a Pluggto suporta filtros separados por vírgula ou se ele está muito antigo.`);
    }

    return res.status(200).json({ report });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
