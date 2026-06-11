const { verifyAuth } = require('../_lib/auth');

module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  const payload = verifyAuth(req);
  if (payload) {
    return res.status(200).json({ authenticated: true, email: payload.email, role: payload.role });
  }
  return res.status(401).json({ authenticated: false });
};
