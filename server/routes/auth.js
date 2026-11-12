import { Router } from 'express';
import { asyncHandler, publicUser, badRequest } from '../lib/http.js';
import { createSessionToken, setSessionCookie, clearSessionCookie, login } from '../auth.js';
import { profileFor } from '../lib/access.js';
import { demoAccounts, demoPassword } from '../seed/content.js';

const router = Router();

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return badRequest(res, 'Escribe tu correo y tu contraseña.');
    }
    const user = await login(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }
    setSessionCookie(res, createSessionToken(user.id));
    return res.json({ user: publicUser(user), profile: await profileFor(user) });
  }),
);

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
