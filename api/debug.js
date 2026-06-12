const { getPluggtoToken } = require('./_lib/pluggto');

const API_BASE = process.env.PLUGGTO_API || 'https://api.plugg.to';

module.exports = async (req, res) => {
  try {
    const token = await getPluggtoToken();
    
    // Busca apenas 1 pedido da lista de pedidos para vermos exatamente o que a Pluggto retorna
    const resp = await fetch(`${API_BASE}/orders?status=shipping_informed&limit=1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!resp.ok) {
      return res.status(resp.status).json({ error: 'Erro na API da Pluggto' });
    }
    
    const data = await resp.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('[debug] Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
