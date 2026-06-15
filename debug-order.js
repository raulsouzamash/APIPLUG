require('dotenv').config();
const { getPluggtoToken, getOrderByExternal } = require('./api/_lib/pluggto');
const fs = require('fs');

(async () => {
  try {
    const token = await getPluggtoToken();
    const order = await getOrderByExternal(token, '2000013515471907');
    fs.writeFileSync('order_debug.json', JSON.stringify(order, null, 2));
    console.log('Saved to order_debug.json');
  } catch (err) {
    console.error(err);
  }
})();
