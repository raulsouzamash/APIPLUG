const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'pt_session';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET não configurado nas variáveis de ambiente');
  return secret;
}

/**
 * Define o cookie JWT httpOnly com todas as flags de segurança.
 */
function setAuthCookie(res, payload) {
  const secret = getJwtSecret();
  const token = jwt.sign(payload, secret, { expiresIn: '8h' });
  const maxAge = 8 * 3600;
  const secure = process.env.NODE_ENV !== 'development' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=${maxAge}`
  );
}

/**
 * Limpa o cookie de sessão.
 */
function clearAuthCookie(res) {
  const secure = process.env.NODE_ENV !== 'development' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=0`
  );
}

/**
 * Verifica o JWT no cookie. Retorna o payload ou null.
 */
function verifyAuth(req) {
  try {
    const cookieHeader = req.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [k, ...v] = c.trim().split('=');
        return [k.trim(), v.join('=')];
      }).filter(([k]) => k)
    );
    const token = cookies[COOKIE_NAME];
    if (!token) return null;
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

/**
 * Middleware: verifica auth e retorna o payload, ou envia 401.
 */
function requireAuth(req, res) {
  const payload = verifyAuth(req);
  if (!payload) {
    res.status(401).json({ error: 'Não autenticado. Faça login novamente.' });
    return null;
  }
  return payload;
}

module.exports = { setAuthCookie, clearAuthCookie, verifyAuth, requireAuth };
