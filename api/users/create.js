const { kv } = require('@vercel/kv');
const { requireAuth } = require('../_lib/auth');
const bcrypt = require('bcryptjs');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const user = requireAuth(req, res);
  if (!user) return;

  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem criar usuários.' });
  }

  const { email, password } = req.body || {};

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Verifica se tenta criar com o mesmo email do admin mestre
  if (process.env.APP_EMAIL && normalizedEmail === process.env.APP_EMAIL.toLowerCase().trim()) {
    return res.status(400).json({ error: 'Este email é reservado para o administrador principal.' });
  }

  try {
    const existing = await kv.get(`user:${normalizedEmail}`);
    if (existing) {
      return res.status(400).json({ error: 'Usuário já existe.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await kv.set(`user:${normalizedEmail}`, {
      email: normalizedEmail,
      passwordHash,
      role: 'user', // For now, all created users are standard 'user'
      createdAt: Date.now()
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[users/create] Erro ao salvar usuário:', err.message);
    return res.status(500).json({ error: 'Erro ao conectar ao Vercel KV.' });
  }
};
