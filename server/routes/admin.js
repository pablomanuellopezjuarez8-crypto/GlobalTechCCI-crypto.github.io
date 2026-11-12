import { Router } from 'express';
import { asyncHandler } from '../lib/http.js';
import { requireRole } from '../auth.js';
import { query } from '../db.js';

const router = Router();

// Solo el administrador ve los correos y nombres de las cuentas registradas.
router.get(
  '/users',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT id, name, email, role, grade, is_demo, created_at
         FROM users
        ORDER BY created_at DESC, id DESC`,
    );
    res.json({
      users: rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        grade: row.grade,
        isDemo: row.is_demo,
        createdAt: row.created_at,
      })),
    });
  }),
);

export default router;
