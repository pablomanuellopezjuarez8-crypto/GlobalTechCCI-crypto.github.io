// Rúbrica única para lecturas y retos de pensamiento crítico.
// Se usa para la valoración sugerida (automática) y para la confirmación docente.

export const CRITERIA = [
  {
    key: 'comprension',
    label: 'Comprensión',
    hint: 'Entiende la información y las ideas centrales del texto o de la situación.',
    strong: 'Comprende bien la información explícita y las ideas centrales.',
    improve: 'Conviene releer el texto y ubicar la información clave antes de responder.',
  },
  {
    key: 'analisis',
    label: 'Análisis',
    hint: 'Relaciona datos, distingue hechos de opiniones e infiere causas o consecuencias.',
    strong: 'Relaciona datos y distingue hechos de opiniones con soltura.',
    improve: 'Le cuesta separar hechos de opiniones o explicar causas y consecuencias.',
  },
  {
    key: 'evidencias',
    label: 'Uso de evidencias',
    hint: 'Sostiene sus respuestas con datos, cifras o pasajes del texto.',
    strong: 'Sostiene sus respuestas con datos y pasajes del texto.',
    improve: 'Necesita apoyar sus respuestas con datos concretos del texto.',
  },
  {
    key: 'argumentacion',
    label: 'Argumentación',
    hint: 'Explica y justifica con razones ordenadas y reconoce otras posturas.',
    strong: 'Justifica con razones ordenadas y reconoce otros puntos de vista.',
    improve: 'Debe ampliar sus razones y conectar las ideas con conectores.',
  },
  {
    key: 'soluciones',
    label: 'Propuesta de soluciones',
    hint: 'Propone alternativas viables y evalúa riesgos o mejoras.',
    strong: 'Propone varias alternativas viables y evalúa sus riesgos.',
    improve: 'Conviene proponer más de una alternativa y revisar sus riesgos.',
  },
];

export const LEVEL_SCALE = [
  { value: 1, label: 'Inicio' },
  { value: 2, label: 'En proceso' },
  { value: 3, label: 'Logrado' },
  { value: 4, label: 'Destacado' },
];

export const SKILL_KEYS = CRITERIA.map((c) => c.key);

export function emptyRubric() {
  return Object.fromEntries(SKILL_KEYS.map((key) => [key, 1]));
}

export function rubricMean(rubric) {
  if (!rubric) return 0;
  const values = SKILL_KEYS.map((key) => Number(rubric[key]) || 0);
  return values.reduce((a, b) => a + b, 0) / SKILL_KEYS.length;
}

export function rubricTotal(rubric) {
  return Math.round(rubricMean(rubric) * 25);
}

export function levelForScore(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return { key: 'sin', label: 'Sin calificar' };
  if (value >= 90) return { key: 'destacado', label: 'Destacado' };
  if (value >= 70) return { key: 'logrado', label: 'Logrado' };
  if (value >= 50) return { key: 'proceso', label: 'En proceso' };
  return { key: 'inicio', label: 'Inicio' };
}

export function sanitizeRubric(input) {
  const out = {};
  for (const key of SKILL_KEYS) {
    const raw = input ? Number(input[key]) : NaN;
    out[key] = Number.isFinite(raw) ? Math.min(4, Math.max(1, Math.round(raw))) : 1;
  }
  return out;
}

export function isCompleteRubric(rubric) {
  return rubric && SKILL_KEYS.every((key) => Number(rubric[key]) >= 1);
}
