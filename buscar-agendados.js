require('dotenv').config();
const fs = require('fs');

const API_BASE = process.env.PLUGGTO_API || 'https://api.plugg.to';

async function getPluggtoToken() {
  const resp = await fetch(`${API_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.PLUGGTO_CLIENT_ID,
      client_secret: process.env.PLUGGTO_CLIENT_SECRET,
      grant_type: 'password',
      username: process.env.PLUGGTO_USERNAME,
      password: process.env.PLUGGTO_PASSWORD
    })
  });
  const data = await resp.json();
  return data.access_token;
}

async function exportar() {
  console.log('⏳ Iniciando busca direta na Pluggto (pode levar 1-2 minutos)...');
  
  let token;
  try {
    token = await getPluggtoToken();
  } catch (e) {
    console.error('Falha no login da Pluggto. Verifique se o fetch nativo está disponível na sua versão do Node.');
    return;
  }
  
  let allScheduled = [];
  let page = 1;
  const LIMIT = 100;
  
  // Vamos buscar até 100 páginas (10.000 pedidos)
  while (page <= 100) {
    process.stdout.write(`Buscando página ${page}... `);
    const resp = await fetch(`${API_BASE}/orders?status=approved,in_separation,invoiced,shipping_informed,buffered,shipped&limit=${LIMIT}&page=${page}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!resp.ok) {
      console.log('Erro na resposta da API.');
      break;
    }
    
    const data = await resp.json();
    const results = data.result || data.Order || [];
    
    if (results.length === 0) {
      console.log('Fim dos pedidos.');
      break;
    }
    
    const pageScheduled = results.filter(o => {
        const rootBuffered = !!o.buffering_date;
        const shipmentBuffered = o.shipments && o.shipments.some(s => s.buffering_date);
        if (!rootBuffered && !shipmentBuffered) return false;

        const bDateStr = o.buffering_date || (o.shipments && o.shipments.find(s => s.buffering_date)?.buffering_date);
        if (!bDateStr) return false;

        const now = new Date();
        const brTime = new Date(now.getTime() - 3 * 3600 * 1000);
        const todayStr = brTime.toISOString().substring(0, 10);

        return String(bDateStr).substring(0, 10) >= todayStr;
    }).map(o => {
        const bDate = o.buffering_date || (o.shipments && o.shipments[0]?.buffering_date) || '';
        return {
          id: o.id,
          original_id: o.original_id || o.external || 'N/A',
          status: o.status,
          buffering_date: bDate,
          created: o.created || ''
        };
    });
    
    console.log(`Encontrou ${pageScheduled.length} agendados nesta página.`);
    allScheduled = allScheduled.concat(pageScheduled);
    page++;
  }
  
  console.log(`\n✅ CONCLUÍDO! Total de ${allScheduled.length} pedidos agendados encontrados.`);
  
  const csvLines = ['ID Pluggto,ID Mercado Livre,Status,Data Agendamento,Data Criacao Pedido'];
  for (const o of allScheduled) {
    csvLines.push(`${o.id},${o.original_id},${o.status},${o.buffering_date},${o.created}`);
  }
  
  fs.writeFileSync('agendados_resultado.csv', csvLines.join('\n'), 'utf8');
  console.log('-> Arquivo "agendados_resultado.csv" foi criado com sucesso na pasta do projeto!');
}

exportar().catch(console.error);
