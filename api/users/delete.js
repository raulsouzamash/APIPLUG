const { Redis } = require('@upstash/redis');
const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.STORAGE_URL || process.env.STORAGE_REST_API_URL || 'https://dummy.upstash.io';
const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.STORAGE_TOKEN || process.env.STORAGE_REST_API_TOKEN || 'dummy';
const kv = new Redis({ url: kvUrl, token: kvToken });
const { requireAuth } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const user = requireAuth(req, res);
  if (!user) return;

  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem excluir usuários.' });
  }

  const { email } = req.body || {};

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'O email é obrigatório.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  if (process.env.APP_EMAIL && normalizedEmail === process.env.APP_EMAIL.toLowerCase().trim()) {
    return res.status(400).json({ error: 'Não é possível excluir o administrador principal.' });
  }

  try {
    const result = await kv.del(`user:${normalizedEmail}`);
    if (result === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[users/delete] Erro ao excluir usuário:', err.message);
    return res.status(500).json({ error: 'Erro ao conectar ao Vercel KV.' });
  }
};
