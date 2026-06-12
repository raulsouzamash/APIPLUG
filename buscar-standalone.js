const fs = require('fs');

const API_BASE = 'https://api.plugg.to';

const PLUGGTO_CLIENT_ID = '898b908d05496851194edcedda8f2850';
const PLUGGTO_CLIENT_SECRET = '415c1061da6493a908458ab8236025a1';
const PLUGGTO_USERNAME = '1723678201880';
const PLUGGTO_PASSWORD = 'd2xpc3Nlcy5nb2RveUBtYXNoLmNvbS5icjAuMzc0OTUyMjY2MzgyMjM3MzMxNzIzNjc4MjAxODgw';

async function getPluggtoToken() {
  const params = new URLSearchParams({
    client_id: PLUGGTO_CLIENT_ID,
    client_secret: PLUGGTO_CLIENT_SECRET,
    grant_type: 'password',
    username: PLUGGTO_USERNAME,
    password: PLUGGTO_PASSWORD
  });

  const resp = await fetch(`${API_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  const data = await resp.json();
  if (!data.access_token) {
    throw new Error('Retorno da API de login: ' + JSON.stringify(data));
  }
  return data.access_token;
}

async function exportar() {
  console.log('\n=======================================');
  console.log('🚀 BUSCANDO PEDIDOS NA PLUGGTO...');
  console.log('=======================================\n');
  
  let token;
  try {
    token = await getPluggtoToken();
    console.log('✅ Token obtido com sucesso!');
  } catch (e) {
    console.error('❌ Falha ao logar na Pluggto:', e.message);
    return;
  }
  
  let allScheduled = [];
  let page = 1;
  const LIMIT = 100;
  
  // Vamos buscar as primeiras 50 páginas de trás pra frente!
  while (page <= 50) {
    process.stdout.write(`⏳ Lendo página ${page}... `);
    
    // Sort=-created para trazer os mais recentes e não os de 2021
    const resp = await fetch(`${API_BASE}/orders?status=shipping_informed,buffered,approved&sort=-created&limit=${LIMIT}&page=${page}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!resp.ok) {
      console.log(`❌ Erro da API (Status ${resp.status})`);
      break;
    }
    
    const data = await resp.json();
    const results = data.result || data.Order || [];
    
    if (page === 1 && results.length > 0) {
       console.log('\n🔍 DEBUG DO PRIMEIRO PEDIDO DA LISTA:');
       console.log('Campos disponíveis:', Object.keys(results[0]).join(', '));
       console.log('O campo buffering_date existe?', 'buffering_date' in results[0] ? results[0].buffering_date : 'NÃO');
       console.log('O campo shipments existe?', 'shipments' in results[0] ? 'SIM, tamanho: ' + results[0].shipments.length : 'NÃO');
       console.log('---------------------------------------\n');
    }
    
    if (results.length === 0) {
      console.log('Fim absoluto dos pedidos (nenhum resultado).');
      break;
    }
    
    const pageScheduled = results.map(item => item.Order ? item.Order : item)
      .filter(o => {
        const rootBuffered = !!o.buffering_date;
        const shipmentBuffered = o.shipments && o.shipments.some(s => s.buffering_date);
        return rootBuffered || shipmentBuffered;
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
    
    if (pageScheduled.length > 0) {
      console.log(`Encontrou ${pageScheduled.length} agendados!!`);
    } else {
      console.log('Nenhum agendado nesta página.');
    }
    
    allScheduled = allScheduled.concat(pageScheduled);
    page++;
  }
  
  console.log(`\n✅ CONCLUÍDO! Total de ${allScheduled.length} pedidos agendados encontrados.`);
  
  if (allScheduled.length > 0) {
      const csvLines = ['ID Pluggto,ID Mercado Livre,Status,Data Agendamento,Data Criacao Pedido'];
      for (const o of allScheduled) {
        csvLines.push(`${o.id},${o.original_id},${o.status},${o.buffering_date},${o.created}`);
      }
      
      fs.writeFileSync('agendados_resultado.csv', csvLines.join('\n'), 'utf8');
      console.log('-> Arquivo "agendados_resultado.csv" gerado com sucesso na pasta do projeto!');
  } else {
      console.log('❌ Nenhum agendamento encontrado para exportar.');
  }
}

exportar().catch(console.error);
