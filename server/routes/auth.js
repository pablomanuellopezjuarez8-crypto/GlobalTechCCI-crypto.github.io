import { Router } from 'express';
import { asyncHandler, publicUser, badRequest } from '../lib/http.js';
import { createSessionToken, setSessionCookie, clearSessionCookie, login } from '../auth.js';
import { profileFor } from '../lib/access.js';
import { hashPassword } from '../lib/password.js';
import { query } from '../db.js';
import { demoAccounts, demoPassword } from '../seed/content.js';
import { googleEnabled } from './google.js';

const router = Router();

const SIGNUP_ROLES = ['estudiante', 'docente', 'familia'];

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password, expectedRole } = req.body || {};
    if (!email || !password) {
      return badRequest(res, 'Escribe tu correo y tu contraseña.');
    }
    const user = await login(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }
    if (expectedRole && user.role !== expectedRole) {
      return res.status(401).json({ error: 'Esta cuenta no corresponde a esta sección.' });
    }
    setSessionCookie(res, createSessionToken(user.id));
    return res.json({ user: publicUser(user), profile: await profileFor(user) });
  }),
);

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const role = String(req.body?.role || 'estudiante');
    if (name.length < 2) return badRequest(res, 'Escribe tu nombre completo.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return badRequest(res, 'Escribe un correo electrónico válido.');
    }
    if (password.length < 6) return badRequest(res, 'La contraseña debe tener al menos 6 caracteres.');
    if (!SIGNUP_ROLES.includes(role)) return badRequest(res, 'Elige un perfil válido.');
    try {
      const { rows } = await query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [name, email, hashPassword(password), role],
      );
      const user = rows[0];
      setSessionCookie(res, createSessionToken(user.id));
      return res.status(201).json({ user: publicUser(user), profile: await profileFor(user) });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Ese correo ya tiene una cuenta. Inicia sesión.' });
      }
      throw error;
    }
  }),
);

// Permite mostrar u ocultar el botón de Google según la configuración del servidor.
router.get('/providers', (req, res) => {
  res.json({ google: googleEnabled });
});

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    if (!req.user) return res.json({ user: null, profile: null });
    return res.json({ user: publicUser(req.user), profile: await profileFor(req.user) });
  }),
);

// Cuentas de demostración: existen solo en esta versión de prueba y se muestran
// en la pantalla de ingreso para poder recorrer los tres perfiles.
router.get('/demo-accounts', (req, res) => {
  res.json({
    password: demoPassword,
    accounts: demoAccounts.map((account) => ({
      role: account.role,
      label: account.label,
      name: account.name,
      email: account.email,
    })),
  });
});

export default router;
