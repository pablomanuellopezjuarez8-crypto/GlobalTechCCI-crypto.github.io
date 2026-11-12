import crypto from 'node:crypto';
import { Router } from 'express';
import { query } from '../db.js';
import { hashPassword } from '../lib/password.js';
import { createSessionToken, setSessionCookie } from '../auth.js';
import { asyncHandler } from '../lib/http.js';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const STATE_COOKIE = 'pirgstate';

export const googleEnabled = Boolean(CLIENT_ID && CLIENT_SECRET);

const router = Router();

function redirectUri(req) {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  return `${req.protocol}://${req.get('host')}/api/auth/google/callback`;
}

function clearStateCookie() {
  return `${STATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

router.get('/start', (req, res) => {
  if (!googleEnabled) {
    return res.status(503).json({ error: 'El ingreso con Google todavía no está configurado.' });
  }
  const state = crypto.randomBytes(16).toString('hex');
  res.setHeader(
    'Set-Cookie',
    `${STATE_COOKIE}=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
  );
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri(req));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');
  res.redirect(url.toString());
});

router.get(
  '/callback',
  asyncHandler(async (req, res) => {
    if (!googleEnabled) return res.redirect('/?google=no-configurado');
    const { code, state } = req.query;
    const cookies = Object.fromEntries(
      String(req.headers.cookie || '')
        .split(';')
        .map((part) => part.trim().split('='))
        .filter((pair) => pair.length === 2),
    );
    if (!code || !state || state !== cookies[STATE_COOKIE]) {
      return res.redirect('/?google=error');
    }
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: redirectUri(req),
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenResponse.ok) return res.redirect('/?google=error');
    const tokens = await tokenResponse.json();
    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileResponse.ok) return res.redirect('/?google=error');
    const profile = await profileResponse.json();
    const email = String(profile.email || '').trim().toLowerCase();
    if (!email) return res.redirect('/?google=error');

    const existing = await query('SELECT id FROM users WHERE lower(email) = $1', [email]);
    let userId = existing.rows[0]?.id;
    if (!userId) {
      const inserted = await query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'estudiante') RETURNING id`,
        [
          profile.name || email.split('@')[0],
          email,
          // La cuenta de Google no usa contraseña: se guarda un valor aleatorio.
          hashPassword(crypto.randomBytes(24).toString('hex')),
        ],
      );
      userId = inserted.rows[0].id;
    }
    setSessionCookie(res, createSessionToken(userId));
    res.append('Set-Cookie', clearStateCookie());
    res.redirect('/');
  }),
);

export default router;
