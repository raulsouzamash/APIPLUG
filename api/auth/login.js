const bcrypt = require('bcryptjs');
const { setAuthCookie } = require('../_lib/auth');

// Rate limiter em memória (por instância de função — suficiente para ferramenta interna)
const _attempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

function isRateLimited(ip) {
  const now = Date.now();
  let record = _attempts.get(ip);

  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + WINDOW_MS };
  }

  if (record.count >= MAX_ATTEMPTS) {
    _attempts.set(ip, record);
    return true;
  }

  record.count += 1;
  _attempts.set(ip, record);
  return false;
}

const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Identifica o IP real (Vercel adiciona o header x-forwarded-for)
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  if (isRateLimited(ip)) {
    return res.status(429).json({
      error: 'Muitas tentativas de login. Aguarde 15 minutos.',
    });
  }

  const { email, password } = req.body || {};

  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }

  const appEmail = process.env.APP_EMAIL;
  const passwordHash = process.env.APP_PASSWORD_HASH;

  if (!appEmail || !passwordHash) {
    console.error('[login] APP_EMAIL ou APP_PASSWORD_HASH não configurados');
    return res.status(500).json({ error: 'Configuração de autenticação ausente.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  let role = null;
  let validPassword = false;

  // Verifica se é o Admin Principal (via .env)
  if (normalizedEmail === appEmail.toLowerCase().trim()) {
    validPassword = await bcrypt.compare(password, passwordHash);
    if (validPassword) role = 'admin';
  } else {
    // Se não for o Admin Principal, procura no Vercel KV
    try {
      const kvUser = await kv.get(`user:${normalizedEmail}`);
      if (kvUser && kvUser.passwordHash) {
        validPassword = await bcrypt.compare(password, kvUser.passwordHash);
        if (validPassword) role = kvUser.role || 'user';
      }
    } catch (err) {
      console.error('[login] Erro ao consultar KV:', err.message);
    }
  }

  // Delay artificial para evitar timing attacks
  if (!validPassword) {
    await new Promise(r => setTimeout(r, 400 + Math.random() * 200));
    return res.status(401).json({ error: 'Email ou senha incorretos.' });
  }

  setAuthCookie(res, { email: normalizedEmail, role });
  return res.status(200).json({ ok: true, role });
};
