require('dotenv').config();
const { getPluggtoToken } = require('./api/_lib/pluggto');

async function test() {
  try {
    const token = await getPluggtoToken();
    console.log('Token obtido:', token ? 'SIM' : 'NAO');

    const API_BASE = 'https://api.plugg.to';

    // Tentativa 1: status=shipping_informed
    console.log('\n--- Buscando status=shipping_informed ---');
    const res1 = await fetch(`${API_BASE}/orders?status=shipping_informed&limit=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const d1 = await res1.json();
    console.log('Total recebido:', d1.result?.length || d1.Order?.length || 0);

    // Tentativa 2: sub_status=waiting_expedition
    console.log('\n--- Buscando sub_status=waiting_expedition ---');
    const res2 = await fetch(`${API_BASE}/orders?sub_status=waiting_expedition&limit=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const d2 = await res2.json();
    console.log('Total recebido:', d2.result?.length || d2.Order?.length || 0);
    
    // Mostra um pedido com buffering_date da d1
    const found = (d1.result || d1.Order || []).find(o => o.shipments && o.shipments.some(s => s.buffering_date));
    if (found) {
        console.log('\nExemplo encontrado na tentativa 1:', found.id);
    } else {
        console.log('\nNenhum com buffering_date nos 10 primeiros da tentativa 1');
    }

  } catch (err) {
    console.error(err);
  }
}
test();
