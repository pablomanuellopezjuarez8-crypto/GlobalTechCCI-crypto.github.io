import crypto from 'node:crypto';
import { query } from './db.js';
import { verifyPassword } from './lib/password.js';

const COOKIE_NAME = 'pyrsid';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

const SECRET =
  process.env.SESSION_SECRET ||
  (process.env.NODE_ENV === 'production' ? '' : 'piensa-y-resuelve-dev-session-secret');

if (!SECRET) {
  throw new Error('SESSION_SECRET es obligatorio para firmar las sesiones.');
}

function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

export function createSessionToken(userId) {
  const payload = `${userId}.${Date.now() + MAX_AGE_SECONDS * 1000}`;
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token) {
  if (!token) return null;
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  const [rawId, rawExpiry, signature] = parts;
  const expected = sign(`${rawId}.${rawExpiry}`);
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }
  if (Number(rawExpiry) < Date.now()) return null;
  const id = Number(rawId);
  return Number.isInteger(id) ? id : null;
}

export function parseCookies(header = '') {
  const out = {};
  for (const part of String(header).split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

export function setSessionCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`,
  );
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export async function attachUser(req, res, next) {
  try {
    const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
    const userId = readSessionToken(token);
    req.user = null;
    if (userId) {
      const { rows } = await query(
        'SELECT id, name, email, role, grade, is_demo FROM users WHERE id = $1',
        [userId],
      );
      req.user = rows[0] || null;
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
  return next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Tu perfil no tiene acceso a esta información.' });
    }
    return next();
  };
}

export async function login(email, password) {
  const { rows } = await query('SELECT * FROM users WHERE lower(email) = lower($1)', [
    String(email || '').trim(),
  ]);
  const user = rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) return null;
  return user;
}
