const { Redis } = require('@upstash/redis');
const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.STORAGE_URL || process.env.STORAGE_REST_API_URL || 'https://dummy.upstash.io';
const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.STORAGE_TOKEN || process.env.STORAGE_REST_API_TOKEN || 'dummy';
const kv = new Redis({ url: kvUrl, token: kvToken });
const { requireAuth } = require('../_lib/auth');
const bcrypt = require('bcryptjs');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const user = requireAuth(req, res);
  if (!user) return;

  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem atualizar usuários.' });
  }

  const { email, password, role } = req.body || {};

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email é obrigatório.' });
  }

  const validRoles = ['admin', 'user'];
  const userRole = validRoles.includes(role) ? role : 'user';

  const normalizedEmail = email.toLowerCase().trim();

  if (process.env.APP_EMAIL && normalizedEmail === process.env.APP_EMAIL.toLowerCase().trim()) {
    return res.status(400).json({ error: 'Não é possível alterar o administrador principal por aqui.' });
  }

  try {
    const existing = await kv.get(`user:${normalizedEmail}`);
    if (!existing) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const updatedData = { ...existing, role: userRole };

    // Se uma nova senha for fornecida, atualiza o hash
    if (password && typeof password === 'string' && password.length > 0) {
      updatedData.passwordHash = await bcrypt.hash(password, 12);
    }

    await kv.set(`user:${normalizedEmail}`, updatedData);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[users/update] Erro ao atualizar usuário:', err.message);
    return res.status(500).json({ error: 'Erro ao conectar ao Vercel KV.' });
  }
};
