import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { waitForDb, migrate, seedDemoData } from './db.js';
import { attachUser } from './auth.js';
import authRoutes from './routes/auth.js';
import authoringRoutes from './routes/authoring.js';
import learningRoutes from './routes/learning.js';
import resultsRoutes from './routes/results.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

app.use(express.json({ limit: '1mb' }));
app.use(attachUser);

app.use('/api/auth', authRoutes);
app.use('/api', authoringRoutes);
app.use('/api', learningRoutes);
app.use('/api', resultsRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

app.use(
  '/app',
  express.static(path.join(root, 'app'), {
    extensions: ['html'],
    setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache'),
  }),
);

// La aplicación educativa se sirve en la raíz del sitio.
app.get('/', (req, res) => res.sendFile(path.join(root, 'app/index.html')));

// El sitio anterior del repositorio sigue disponible en sus mismas rutas.
const legacyPages = [
  'index.html',
  'registro.html',
  'contacto.html',
  'certificaciones.html',
  'quienes-somos.html',
];
for (const page of legacyPages) {
  app.get(`/${page}`, (req, res) => res.sendFile(path.join(root, page)));
}

app.use((req, res) => {
  if (req.accepts('html')) {
    return res
      .status(404)
      .send(
        '<!doctype html><meta charset="utf-8"><title>Página no encontrada</title>' +
          '<p style="font-family:system-ui;padding:2rem">Página no encontrada. ' +
          '<a href="/">Volver a Piensa y Resuelve</a></p>',
      );
  }
  return res.status(404).json({ error: 'Ruta no encontrada.' });
});

app.use((error, req, res, next) => {
  console.error('Error en la solicitud:', error);
  if (res.headersSent) return next(error);
  return res.status(500).json({ error: 'Ocurrió un error en el servidor. Intenta de nuevo.' });
});

const port = Number(process.env.PORT || 3000);

async function start() {
  await waitForDb();
  await migrate();
  await seedDemoData();
  app.listen(port, '0.0.0.0', () => {
    console.log(`Piensa y Resuelve escuchando en http://0.0.0.0:${port}`);
  });
}

start().catch((error) => {
  console.error('No se pudo iniciar la aplicación:', error);
  process.exit(1);
});
