import pg from 'pg';
import { hashPassword } from './lib/password.js';
import { gradeWork, confirmedScore } from './lib/grading.js';
import { sanitizeRubric } from './lib/rubric.js';
import {
  readings as demoReadings,
  problems as demoProblems,
  demoPassword,
  demoClassrooms,
  demoStudents,
  demoGuardians,
} from './seed/content.js';

const { Pool } = pg;

// Las columnas DATE se devuelven como 'YYYY-MM-DD' para no mezclar zonas horarias.
pg.types.setTypeParser(1082, (value) => value);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 8,
});

export const query = (text, params) => pool.query(text, params);

const SEED_VERSION = 5;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (
  key text PRIMARY KEY,
  value text NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('docente','estudiante','familia','admin')),
  grade int,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS classrooms (
  id serial PRIMARY KEY,
  teacher_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  grade int NOT NULL,
  section text
);

CREATE TABLE IF NOT EXISTS classroom_students (
  classroom_id int NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (classroom_id, student_id)
);

CREATE TABLE IF NOT EXISTS student_guardians (
  guardian_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (guardian_id, student_id)
);

CREATE TABLE IF NOT EXISTS readings (
  id serial PRIMARY KEY,
  title text NOT NULL,
  grade int NOT NULL,
  difficulty text NOT NULL,
  topic text NOT NULL,
  body text NOT NULL,
  real_life_prompt text NOT NULL,
  author_id int REFERENCES users(id) ON DELETE SET NULL,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reading_questions (
  id serial PRIMARY KEY,
  reading_id int NOT NULL REFERENCES readings(id) ON DELETE CASCADE,
  level text NOT NULL CHECK (level IN ('literal','inferencial','critica')),
  type text NOT NULL CHECK (type IN ('multiple','open')),
  skill text NOT NULL,
  prompt text NOT NULL,
  options jsonb,
  correct_index int,
  guidance text NOT NULL,
  position int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS problems (
  id serial PRIMARY KEY,
  title text NOT NULL,
  grade int NOT NULL,
  topic text NOT NULL,
  scenario text NOT NULL,
  question text NOT NULL,
  context text,
  identify jsonb NOT NULL,
  fact_opinions jsonb NOT NULL,
  open_steps jsonb NOT NULL,
  rubric_hint text,
  author_id int REFERENCES users(id) ON DELETE SET NULL,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignments (
  id serial PRIMARY KEY,
  teacher_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('reading','problem')),
  reading_id int REFERENCES readings(id) ON DELETE CASCADE,
  problem_id int REFERENCES problems(id) ON DELETE CASCADE,
  classroom_id int REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id int REFERENCES users(id) ON DELETE CASCADE,
  due_date date,
  instructions text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submissions (
  id serial PRIMARY KEY,
  assignment_id int NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'en_progreso' CHECK (status IN ('en_progreso','entregado','revisado')),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  objective_score numeric,
  suggested_rubric jsonb,
  suggested_score numeric,
  rubric jsonb,
  final_score numeric,
  level text,
  feedback jsonb,
  strengths text,
  improvements text,
  teacher_note text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by int REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_demo boolean NOT NULL DEFAULT false,
  UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS submissions_student_idx ON submissions (student_id);
CREATE INDEX IF NOT EXISTS submissions_assignment_idx ON submissions (assignment_id);
CREATE INDEX IF NOT EXISTS assignments_classroom_idx ON assignments (classroom_id);
`;

export async function waitForDb(attempts = 45) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (error) {
      if (i === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

export async function migrate() {
  await query(SCHEMA);
  // Bases creadas antes del perfil de administrador: se amplía la restricción.
  await query(`
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('docente','estudiante','familia','admin'));
  `);
}

function addDays(days) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

async function insertUser({ name, email, role, grade = null }) {
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, role, grade, is_demo)
     VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
    [name, email, hashPassword(demoPassword), role, grade],
  );
  return rows[0];
}

async function insertReading(reading, authorId) {
  const { rows } = await query(
    `INSERT INTO readings (title, grade, difficulty, topic, body, real_life_prompt, author_id, is_demo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,true) RETURNING *`,
    [
      reading.title,
      reading.grade,
      reading.difficulty,
      reading.topic,
      reading.body,
      reading.realLifePrompt,
      authorId,
    ],
  );
  const created = rows[0];
  const questions = [];
  for (let index = 0; index < reading.questions.length; index += 1) {
    const q = reading.questions[index];
    const result = await query(
      `INSERT INTO reading_questions
         (reading_id, level, type, skill, prompt, options, correct_index, guidance, position)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        created.id,
        q.level,
        q.type,
        q.skill,
        q.prompt,
        q.options ? JSON.stringify(q.options) : null,
        q.correctIndex ?? null,
        q.guidance,
        index,
      ],
    );
    questions.push(result.rows[0]);
  }
  return { reading: created, questions };
}

async function insertProblem(problem, authorId) {
  const { rows } = await query(
    `INSERT INTO problems
       (title, grade, topic, scenario, question, context, identify, fact_opinions, open_steps, rubric_hint, author_id, is_demo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true) RETURNING *`,
    [
      problem.title,
      problem.grade,
      problem.topic,
      problem.scenario,
      problem.question,
      problem.context ?? null,
      JSON.stringify(problem.identify),
      JSON.stringify(problem.factOpinions),
      JSON.stringify(problem.openSteps),
      problem.rubricHint ?? null,
      authorId,
    ],
  );
  return rows[0];
}

async function insertAssignment({ teacherId, kind, refId, classroomId, days, instructions }) {
  const { rows } = await query(
    `INSERT INTO assignments
       (teacher_id, kind, reading_id, problem_id, classroom_id, due_date, instructions, is_demo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,true) RETURNING *`,
    [
      teacherId,
      kind,
      kind === 'reading' ? refId : null,
      kind === 'problem' ? refId : null,
      classroomId,
      addDays(days),
      instructions,
    ],
  );
  return rows[0];
}

async function insertDemoSubmission({ assignment, studentId, kind, reading, questions, problem, answers, reviewedRubric, teacherNote }) {
  const graded = gradeWork({ kind, reading, questions, problem }, answers);
  const reviewed = reviewedRubric ? sanitizeRubric(reviewedRubric) : null;
  const finalScore = reviewed ? confirmedScore(graded.objectiveScore, reviewed) : null;
  const { rows } = await query(
    `INSERT INTO submissions
       (assignment_id, student_id, status, answers, objective_score, suggested_rubric, suggested_score,
        rubric, final_score, level, feedback, strengths, improvements, teacher_note,
        opened_at, submitted_at, reviewed_at, reviewed_by, is_demo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, now() - interval '2 days',
             now() - interval '1 day', CASE WHEN $9::numeric IS NULL THEN NULL ELSE now() END, $15, true)
     RETURNING *`,
    [
      assignment.id,
      studentId,
      reviewed ? 'revisado' : 'entregado',
      JSON.stringify(answers),
      graded.objectiveScore,
      JSON.stringify(graded.suggestedRubric),
      graded.suggestedScore,
      reviewed ? JSON.stringify(reviewed) : null,
      finalScore,
      finalScore ? (finalScore >= 90 ? 'Destacado' : finalScore >= 70 ? 'Logrado' : finalScore >= 50 ? 'En proceso' : 'Inicio') : graded.level.label,
      JSON.stringify(graded.feedback),
      graded.strengths,
      graded.improvements,
      teacherNote ?? null,
      reviewed ? assignment.teacher_id : null,
    ],
  );
  return rows[0];
}

// Cuenta de administrador: revisa los correos registrados en la aplicación.
// Se puede cambiar con las variables ADMIN_EMAIL y ADMIN_PASSWORD.
export async function ensureAdmin() {
  const { rows } = await query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (rows.length) return;
  const email = (process.env.ADMIN_EMAIL || 'admin@piensayresuelve.pe').trim();
  const password = process.env.ADMIN_PASSWORD || demoPassword;
  await query(
    `INSERT INTO users (name, email, password_hash, role, grade)
     VALUES ($1, $2, $3, 'admin', NULL)
     ON CONFLICT (email) DO UPDATE SET role = 'admin'`,
    ['Administrador', email, hashPassword(password)],
  );
}

export async function seedDemoData() {
  const { rows: metaRows } = await query("SELECT value FROM meta WHERE key = 'seed_version'");
  if (metaRows[0] && Number(metaRows[0].value) >= SEED_VERSION) return;

  await query('DELETE FROM submissions WHERE is_demo = true');
  await query('DELETE FROM assignments WHERE is_demo = true');
  await query('DELETE FROM reading_questions WHERE reading_id IN (SELECT id FROM readings WHERE is_demo)');
  await query('DELETE FROM readings WHERE is_demo = true');
  await query('DELETE FROM problems WHERE is_demo = true');
  await query(
    `DELETE FROM classroom_students WHERE student_id IN (SELECT id FROM users WHERE is_demo)
       OR classroom_id IN (SELECT id FROM classrooms WHERE teacher_id IN (SELECT id FROM users WHERE is_demo))`,
  );
  await query(
    `DELETE FROM student_guardians WHERE guardian_id IN (SELECT id FROM users WHERE is_demo)
       OR student_id IN (SELECT id FROM users WHERE is_demo)`,
  );
  await query('DELETE FROM classrooms WHERE teacher_id IN (SELECT id FROM users WHERE is_demo)');
  await query('DELETE FROM users WHERE is_demo = true');

  const teacher = await insertUser({
    name: 'Carla Rojas',
    email: 'docente@demo.com',
    role: 'docente',
  });

  const classrooms = {};
  for (const classroom of demoClassrooms) {
    const { rows } = await query(
      'INSERT INTO classrooms (teacher_id, name, grade) VALUES ($1,$2,$3) RETURNING *',
      [teacher.id, classroom.name, classroom.grade],
    );
    classrooms[classroom.name] = rows[0];
  }

  const students = {};
  for (const student of demoStudents) {
    const created = await insertUser({
      name: student.name,
      email: student.email,
      role: 'estudiante',
      grade: student.grade,
    });
    students[student.email] = created;
    await query('INSERT INTO classroom_students (classroom_id, student_id) VALUES ($1,$2)', [
      classrooms[student.classroom].id,
      created.id,
    ]);
  }

  for (const guardian of demoGuardians) {
    const created = await insertUser({ name: guardian.name, email: guardian.email, role: 'familia' });
    for (const childEmail of guardian.children) {
      await query('INSERT INTO student_guardians (guardian_id, student_id) VALUES ($1,$2)', [
        created.id,
        students[childEmail].id,
      ]);
    }
  }

  const readingBySlug = {};
  for (const reading of demoReadings) {
    const inserted = await insertReading(reading, teacher.id);
    readingBySlug[reading.slug] = inserted;
  }

  const problemBySlug = {};
  for (const problem of demoProblems) {
    problemBySlug[problem.slug] = await insertProblem(problem, teacher.id);
  }

  const readingAssignments = {};
  for (const reading of demoReadings) {
    const classroom = Object.values(classrooms).find((c) => c.grade === reading.grade);
    const assignment = await insertAssignment({
      teacherId: teacher.id,
      kind: 'reading',
      refId: readingBySlug[reading.slug].reading.id,
      classroomId: classroom.id,
      days: 4,
      instructions:
        'Lee con calma. Puedes guardar tu avance y continuar después, pero la actividad solo cuenta como entregada cuando la envías.',
    });
    readingAssignments[reading.slug] = { assignment, ...readingBySlug[reading.slug] };
  }

  const problemAssignments = {};
  for (const problem of demoProblems) {
    const classroom = Object.values(classrooms).find((c) => c.grade === problem.grade);
    const assignment = await insertAssignment({
      teacherId: teacher.id,
      kind: 'problem',
      refId: problemBySlug[problem.slug].id,
      classroomId: classroom.id,
      days: 7,
      instructions: 'Responde paso a paso. Explica tus ideas con tus propias palabras.',
    });
    problemAssignments[problem.slug] = { assignment, problem: problemBySlug[problem.slug] };
  }

  // Dos entregas de demostración: una ya revisada y otra pendiente de revisión.
  const agua = readingAssignments['fuga-de-agua'];
  const aguaQuestions = agua.questions;
  const aguaAnswers = {};
  aguaAnswers[aguaQuestions[0].id] = '1';
  aguaAnswers[aguaQuestions[1].id] =
    'Menciona que los baños tenían una fuga de agua y que la factura subió de 80 a 120 soles.';
  aguaAnswers[aguaQuestions[2].id] = '1';
  aguaAnswers[aguaQuestions[3].id] =
    'Si no se arreglan los tubos, la factura va a seguir subiendo porque en una mañana se juntan 12 litros en el balde; por eso cada mes pagarán más soles.';
  aguaAnswers[aguaQuestions[4].id] = '2';
  aguaAnswers[aguaQuestions[5].id] =
    'Debería arreglar los tubos porque se pierden 12 litros en una mañana y la factura subió 40 soles. Sin embargo, los libros también son importantes, así que podría pedir apoyo a las familias para los libros después.';
  aguaAnswers.real_life =
    'En mi casa el caño del baño gotea. Propongo poner una jarra debajo y avisar al gasfitero; primero revisaría el caño principal porque se pierde más agua.';

  const celular = readingAssignments['celular-recreo'];
  const celularQuestions = celular.questions;
  const celularAnswers = {};
  celularAnswers[celularQuestions[0].id] = '1';
  celularAnswers[celularQuestions[1].id] =
    'Prohibir el celular en todo el colegio y crear zonas de uso en una banca del patio.';
  celularAnswers[celularQuestions[2].id] = '1';
  celularAnswers[celularQuestions[3].id] =
    'El dato del 40 % se relaciona con la propuesta de zonas porque si los estudiantes se aíslan mirando la pantalla, una zona de uso permite que el resto del patio siga siendo para jugar.';
  celularAnswers[celularQuestions[4].id] = '2';
  celularAnswers[celularQuestions[5].id] =
    'Apoyaría las zonas de uso porque el 65 % ya usa el celular y el 40 % se quedó sin jugar. Los estudiantes que necesitan llamar a su familia seguirían teniendo un lugar, aunque el quiosco podría perder algo de venta.';
  celularAnswers.real_life =
    'Uso el celular en la cena. Propongo dejarlo en una caja durante la comida y anotar cada día si lo cumplimos para saber si funciona.';

  const fila = problemAssignments['fila-quiosco'];
  const filaAnswers = {
    identify: '1',
    facts: { 0: 'hecho', 1: 'hecho', 2: 'opinion', 3: 'opinion' },
    alternativas:
      'Una alternativa es abrir una segunda caja con la ayuda de una madre de familia y otra es preparar combos listos para que cada pedido sea más rápido.',
    justificacion:
      'Mi mejor alternativa es la segunda caja porque hay 150 estudiantes y la señora Rosa demora 6 segundos por pedido; con dos cajas la espera sería de la mitad y nadie llegaría tarde.',
    reflexion:
      'Podría salir mal que la segunda caja no tenga espacio. Lo mejoraría colocando una mesa afuera con combos ya preparados y un cartel con los precios.',
  };

  await insertDemoSubmission({
    assignment: agua.assignment,
    studentId: students['estudiante@demo.com'].id,
    kind: 'reading',
    reading: agua.reading,
    questions: aguaQuestions,
    answers: aguaAnswers,
    reviewedRubric: { comprension: 4, analisis: 3, evidencias: 4, argumentacion: 3, soluciones: 3 },
    teacherNote: 'Revisado en clase: usa datos del texto y reconoce la otra necesidad.',
  });

  await insertDemoSubmission({
    assignment: celular.assignment,
    studentId: students['lucia.vega@demo.com'].id,
    kind: 'reading',
    reading: celular.reading,
    questions: celularQuestions,
    answers: celularAnswers,
  });

  await insertDemoSubmission({
    assignment: fila.assignment,
    studentId: students['ana.quispe@demo.com'].id,
    kind: 'problem',
    problem: fila.problem,
    answers: filaAnswers,
    reviewedRubric: { comprension: 4, analisis: 4, evidencias: 3, argumentacion: 3, soluciones: 4 },
    teacherNote: 'Revisado: propone dos alternativas y justifica con datos.',
  });

  await query(
    `INSERT INTO meta (key, value) VALUES ('seed_version', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [String(SEED_VERSION)],
  );
}
