const { Redis } = require('@upstash/redis');
const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.STORAGE_URL || process.env.STORAGE_REST_API_URL || 'https://dummy.upstash.io';
const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.STORAGE_TOKEN || process.env.STORAGE_REST_API_TOKEN || 'dummy';
const kv = new Redis({ url: kvUrl, token: kvToken });
const { requireAuth } = require('./_lib/auth');
const bcrypt = require('bcryptjs');

module.exports = async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem gerenciar usuários.' });
  }

  const action = req.query.action;
  const urlPath = req.url.split('?')[0];
  
  if (req.method === 'GET' && (urlPath.endsWith('/list') || action === 'list')) {
    try {
      const users = [];
      if (process.env.APP_EMAIL) {
        users.push({
          email: process.env.APP_EMAIL.toLowerCase(),
          role: 'admin',
          isMain: true
        });
      }
      let cursor = 0;
      do {
        const result = await kv.scan(cursor, { match: 'user:*', count: 100 });
        cursor = result[0];
        const keys = result[1] || [];
        for (const key of keys) {
          const data = await kv.get(key);
          if (data && data.email) {
            users.push({
              email: data.email,
              role: data.role || 'user',
              isMain: false
            });
          }
        }
      } while (cursor !== 0 && cursor !== '0');
      return res.status(200).json({ users });
    } catch (err) {
      console.error('[users/list] Erro:', err.message);
      return res.status(500).json({ error: 'Erro ao conectar ao Vercel KV.' });
    }
  }

  if (req.method === 'POST' && (urlPath.endsWith('/create') || action === 'create')) {
    const { email, password, role } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    const userRole = ['admin', 'user'].includes(role) ? role : 'user';
    const normalizedEmail = email.toLowerCase().trim();
    if (process.env.APP_EMAIL && normalizedEmail === process.env.APP_EMAIL.toLowerCase().trim()) {
      return res.status(400).json({ error: 'Este email é reservado.' });
    }
    try {
      const existing = await kv.get(`user:${normalizedEmail}`);
      if (existing) return res.status(400).json({ error: 'Usuário já existe.' });
      const passwordHash = await bcrypt.hash(password, 12);
      await kv.set(`user:${normalizedEmail}`, { email: normalizedEmail, passwordHash, role: userRole, createdAt: Date.now() });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao conectar ao Vercel KV.' });
    }
  }

  if (req.method === 'POST' && (urlPath.endsWith('/update') || action === 'update')) {
    const { email, password, role } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email é obrigatório.' });
    const userRole = ['admin', 'user'].includes(role) ? role : 'user';
    const normalizedEmail = email.toLowerCase().trim();
    if (process.env.APP_EMAIL && normalizedEmail === process.env.APP_EMAIL.toLowerCase().trim()) {
      return res.status(400).json({ error: 'Não é possível alterar o administrador principal por aqui.' });
    }
    try {
      const existing = await kv.get(`user:${normalizedEmail}`);
      if (!existing) return res.status(404).json({ error: 'Usuário não encontrado.' });
      const updatedData = { ...existing, role: userRole };
      if (password) updatedData.passwordHash = await bcrypt.hash(password, 12);
      await kv.set(`user:${normalizedEmail}`, updatedData);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao conectar ao Vercel KV.' });
    }
  }

  if (req.method === 'POST' && (urlPath.endsWith('/delete') || action === 'delete')) {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'O email é obrigatório.' });
    const normalizedEmail = email.toLowerCase().trim();
    if (process.env.APP_EMAIL && normalizedEmail === process.env.APP_EMAIL.toLowerCase().trim()) {
      return res.status(400).json({ error: 'Não é possível excluir o administrador principal.' });
    }
    try {
      const result = await kv.del(`user:${normalizedEmail}`);
      if (result === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao conectar ao Vercel KV.' });
    }
  }

  return res.status(404).json({ error: 'Endpoint ou método não permitido' });
};
