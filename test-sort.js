require('dotenv').config();
const { getPluggtoToken } = require('./api/_lib/pluggto');

(async () => {
  try {
    const token = await getPluggtoToken();
    console.log('Token obtido');
    const resp = await fetch('https://api.plugg.to/orders?limit=3', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await resp.json();
    const results = data.result || data.Order || [];
    console.log('Total de resultados na p1:', results.length);
    if(results.length > 0) {
      console.log('Primeiro pedido (created):', results[0].created);
      console.log('Último pedido (created):', results[results.length - 1].created);
    }
  } catch (err) {
    console.error(err);
  }
})();
