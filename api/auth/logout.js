const { clearAuthCookie } = require('../_lib/auth');

module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  clearAuthCookie(res);
  return res.status(200).json({ ok: true });
};
