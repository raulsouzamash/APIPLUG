const { Redis } = require('@upstash/redis');
const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.STORAGE_URL || process.env.STORAGE_REST_API_URL || '';
const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.STORAGE_TOKEN || process.env.STORAGE_REST_API_TOKEN || '';
const kv = new Redis({ url: kvUrl, token: kvToken });
const { requireAuth } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const user = requireAuth(req, res);
  if (!user) return;

  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem listar usuários.' });
  }

  try {
    const users = [];
    
    // Adiciona o admin principal (do .env) na lista
    if (process.env.APP_EMAIL) {
      users.push({
        email: process.env.APP_EMAIL.toLowerCase(),
        role: 'admin',
        isMain: true
      });
    }

    // Busca todos os usuários do KV usando SCAN iterativo ou chaves
    // Como a Vercel KV no pacote novo usa node-redis por baixo:
    let cursor = 0;
    do {
      const result = await kv.scan(cursor, { match: 'user:*', count: 100 });
      // O result pode vir como [cursorString, [chaves]] dependendo da versão do @vercel/kv
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
    console.error('[users/list] Erro ao buscar usuários no KV:', err.message);
    return res.status(500).json({ error: 'Erro ao conectar ao Vercel KV.' });
  }
};
