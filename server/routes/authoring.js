import { Router } from 'express';
import { pool, query } from '../db.js';
import { asyncHandler, badRequest, notFound, forbidden } from '../lib/http.js';
import { requireRole } from '../auth.js';
import { teacherClassroom, canTeacherSeeStudent, assignmentContext } from '../lib/access.js';
import { pendingReviews } from '../lib/analytics.js';
import { sanitizeRubric, rubricTotal, levelForScore } from '../lib/rubric.js';
import { confirmedScore } from '../lib/grading.js';

const router = Router();

const DEFAULT_STEPS = [
  {
    key: 'alternativas',
    label: 'Alternativas de solución',
    skill: 'soluciones',
    prompt: 'Propón al menos dos alternativas diferentes para resolver el problema.',
    guidance: 'Se esperan dos o más alternativas viables y distintas entre sí.',
  },
  {
    key: 'justificacion',
    label: 'Justifica con evidencias',
    skill: 'evidencias',
    prompt: 'Explica por qué tu propuesta funcionaría usando datos de la situación.',
    guidance: 'Se valora que cite al menos un dato del problema y lo relacione con su propuesta.',
  },
  {
    key: 'reflexion',
    label: 'Revisa y mejora tu solución',
    skill: 'argumentacion',
    prompt: '¿Qué podría salir mal con tu propuesta? ¿Cómo la mejorarías?',
    guidance: 'Se valora que reconozca un riesgo real y proponga un ajuste concreto.',
  },
];

function teacherOnly(req, res, next) {
  return requireRole('docente')(req, res, next);
}

router.get(
  '/teacher/overview',
  teacherOnly,
  asyncHandler(async (req, res) => {
    const { rows: classrooms } = await query(
      `SELECT c.id, c.name, c.grade, count(cs.student_id)::int AS students
         FROM classrooms c
         LEFT JOIN classroom_students cs ON cs.classroom_id = c.id
        WHERE c.teacher_id = $1
        GROUP BY c.id
        ORDER BY c.grade`,
      [req.user.id],
    );
    const reviews = await pendingReviews(req.user.id);
    const { rows: authored } = await query(
      `SELECT
         (SELECT count(*) FROM readings WHERE author_id = $1)::int AS readings,
         (SELECT count(*) FROM problems WHERE author_id = $1)::int AS problems`,
      [req.user.id],
    );
    const { rows: recent } = await query(
      `SELECT a.id, a.kind, a.due_date, c.name AS classroom_name,
              coalesce(r.title, p.title) AS title
         FROM assignments a
         LEFT JOIN readings r ON r.id = a.reading_id
         LEFT JOIN problems p ON p.id = a.problem_id
         LEFT JOIN classrooms c ON c.id = a.classroom_id
        WHERE a.teacher_id = $1
        ORDER BY a.id DESC
        LIMIT 6`,
      [req.user.id],
    );
    res.json({
      classrooms,
      reviews,
      authored: authored[0],
      recentAssignments: recent,
    });
  }),
);

router.get(
  '/catalog',
  requireRole('docente'),
  asyncHandler(async (req, res) => {
    const grade = Number(req.query.grade) || null;
    const readingParams = [];
    const problemParams = [];
    let readingWhere = '';
    let problemWhere = '';
    if (grade) {
      readingParams.push(grade);
      problemParams.push(grade);
      readingWhere = 'WHERE grade = $1';
      problemWhere = 'WHERE grade = $1';
    }
    const { rows: readings } = await query(
      `SELECT id, title, grade, difficulty, topic, is_demo FROM readings ${readingWhere} ORDER BY grade, title`,
      readingParams,
    );
    const { rows: problems } = await query(
      `SELECT id, title, grade, topic, is_demo FROM problems ${problemWhere} ORDER BY grade, title`,
      problemParams,
    );
    res.json({ readings, problems });
  }),
);

router.get(
  '/readings/:id',
  asyncHandler(async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
    const { rows } = await query('SELECT * FROM readings WHERE id = $1', [req.params.id]);
    const reading = rows[0];
    if (!reading) return notFound(res, 'La lectura no existe.');
    const { rows: questions } = await query(
      'SELECT * FROM reading_questions WHERE reading_id = $1 ORDER BY position, id',
      [reading.id],
    );
    res.json({ reading, questions });
  }),
);

function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return 'Agrega al menos una pregunta a la lectura.';
  }
  for (const [index, question] of questions.entries()) {
    const number = index + 1;
    if (!['literal', 'inferencial', 'critica'].includes(question.level)) {
      return `La pregunta ${number} necesita un tipo de comprensión.`;
    }
    if (!['multiple', 'open'].includes(question.type)) {
      return `La pregunta ${number} debe ser de opción múltiple o abierta.`;
    }
    if (!String(question.prompt || '').trim()) {
      return `La pregunta ${number} necesita un enunciado.`;
    }
    if (question.type === 'multiple') {
      const options = Array.isArray(question.options)
        ? question.options.map((o) => String(o || '').trim()).filter(Boolean)
        : [];
      if (options.length < 2) return `La pregunta ${number} necesita al menos dos opciones.`;
      const correct = Number(question.correctIndex);
      if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) {
        return `Marca cuál es la opción correcta de la pregunta ${number}.`;
      }
    }
  }
  return null;
}

router.post(
  '/readings',
  teacherOnly,
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const title = String(body.title || '').trim();
    const grade = Number(body.grade);
    const difficulty = String(body.difficulty || '').trim() || 'Intermedia';
    const topic = String(body.topic || '').trim();
    const text = String(body.body || '').trim();
    const realLifePrompt = String(body.realLifePrompt || '').trim();
    const questions = Array.isArray(body.questions) ? body.questions : [];

    if (title.length < 4) return badRequest(res, 'Escribe un título para la lectura.');
    if (!Number.isInteger(grade) || grade < 1 || grade > 11) {
      return badRequest(res, 'Indica el grado escolar (1 a 11).');
    }
    if (!topic) return badRequest(res, 'Indica el tema de la lectura.');
    if (text.length < 80) return badRequest(res, 'El texto debe tener al menos 80 caracteres.');
    if (realLifePrompt.length < 10) {
      return badRequest(res, 'Escribe la actividad para relacionar la lectura con la vida cotidiana.');
    }
    const questionError = validateQuestions(questions);
    if (questionError) return badRequest(res, questionError);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO readings (title, grade, difficulty, topic, body, real_life_prompt, author_id, is_demo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,false) RETURNING *`,
        [title, grade, difficulty, topic, text, realLifePrompt, req.user.id],
      );
      const reading = rows[0];
      for (let index = 0; index < questions.length; index += 1) {
        const q = questions[index];
        await client.query(
          `INSERT INTO reading_questions
             (reading_id, level, type, skill, prompt, options, correct_index, guidance, position)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            reading.id,
            q.level,
            q.type,
            q.skill || (q.level === 'literal' ? 'comprension' : q.level === 'inferencial' ? 'evidencias' : 'argumentacion'),
            String(q.prompt).trim(),
            q.type === 'multiple' ? JSON.stringify(q.options.map((o) => String(o).trim()).filter(Boolean)) : null,
            q.type === 'multiple' ? Number(q.correctIndex) : null,
            String(q.guidance || '').trim() ||
              'Respuesta orientativa: se valora que el estudiante explique su idea con sus propias palabras.',
            index,
          ],
        );
      }
      await client.query('COMMIT');
      res.status(201).json({ reading });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }),
);

router.post(
  '/problems',
  teacherOnly,
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const title = String(body.title || '').trim();
    const grade = Number(body.grade);
    const topic = String(body.topic || '').trim();
    const scenario = String(body.scenario || '').trim();
    const question = String(body.question || '').trim();
    const context = String(body.context || '').trim();
    const identify = body.identify || {};
    const facts = Array.isArray(body.facts) ? body.facts : [];

    if (title.length < 4) return badRequest(res, 'Escribe un título para el reto.');
    if (!Number.isInteger(grade) || grade < 1 || grade > 11) {
      return badRequest(res, 'Indica el grado escolar (1 a 11).');
    }
    if (!topic) return badRequest(res, 'Indica el tema del reto.');
    if (scenario.length < 80) return badRequest(res, 'La situación debe tener al menos 80 caracteres.');
    if (question.length < 10) return badRequest(res, 'Escribe la pregunta principal del reto.');
    const options = Array.isArray(identify.options)
      ? identify.options.map((o) => String(o || '').trim()).filter(Boolean)
      : [];
    if (options.length < 2) {
      return badRequest(res, 'Agrega al menos dos opciones para identificar el problema.');
    }
    const correctIndex = Number(identify.correctIndex);
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      return badRequest(res, 'Marca la opción correcta de «identificar el problema».');
    }
    if (facts.length < 2) {
      return badRequest(res, 'Agrega al menos dos afirmaciones para clasificar hechos y opiniones.');
    }

    const factOpinions = facts.map((fact) => ({
      text: String(fact.text || '').trim(),
      isFact: Boolean(fact.isFact),
      explanation:
        String(fact.explanation || '').trim() ||
        (fact.isFact ? 'Es un dato que se puede comprobar.' : 'Es una opinión: expresa un punto de vista.'),
    }));
    if (factOpinions.some((fact) => fact.text.length < 3)) {
      return badRequest(res, 'Cada afirmación necesita un texto.');
    }

    const { rows } = await query(
      `INSERT INTO problems
         (title, grade, topic, scenario, question, context, identify, fact_opinions, open_steps, rubric_hint, author_id, is_demo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false) RETURNING *`,
      [
        title,
        grade,
        topic,
        scenario,
        question,
        context || null,
        JSON.stringify({
          prompt: String(identify.prompt || '¿Cuál es el problema principal?').trim(),
          options,
          correctIndex,
          guidance:
            String(identify.guidance || '').trim() ||
            'Vuelve a leer la situación y distingue el problema central de sus causas.',
        }),
        JSON.stringify(factOpinions),
        JSON.stringify(DEFAULT_STEPS),
        'Hay varias soluciones válidas. Valora la variedad de alternativas, el uso de datos y la reflexión sobre riesgos.',
        req.user.id,
      ],
    );
    res.status(201).json({ problem: rows[0] });
  }),
);

router.post(
  '/assignments',
  teacherOnly,
  asyncHandler(async (req, res) => {
    const { kind, refId, classroomId, dueDate, instructions, studentId } = req.body || {};
    if (!['reading', 'problem'].includes(kind)) return badRequest(res, 'Elige el tipo de actividad.');
    const classroom = await teacherClassroom(Number(classroomId), req.user.id);
    if (!classroom) return forbidden(res, 'Ese aula no pertenece a tu cuenta.');

    const table = kind === 'reading' ? 'readings' : 'problems';
    const { rows: items } = await query(`SELECT id, title FROM ${table} WHERE id = $1`, [Number(refId)]);
    if (!items[0]) return notFound(res, 'No encontramos esa actividad.');

    if (studentId) {
      const allowed = await canTeacherSeeStudent(req.user.id, Number(studentId));
      if (!allowed) return forbidden(res, 'Ese estudiante no está en tus aulas.');
    }

    const date = String(dueDate || '').trim();
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return badRequest(res, 'La fecha de entrega debe tener el formato AAAA-MM-DD.');
    }

    const { rows } = await query(
      `INSERT INTO assignments
         (teacher_id, kind, reading_id, problem_id, classroom_id, student_id, due_date, instructions, is_demo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false) RETURNING *`,
      [
        req.user.id,
        kind,
        kind === 'reading' ? Number(refId) : null,
        kind === 'problem' ? Number(refId) : null,
        classroom.id,
        studentId ? Number(studentId) : null,
        date || null,
        String(instructions || '').trim() || null,
      ],
    );
    res.status(201).json({ assignment: { ...rows[0], title: items[0].title } });
  }),
);

router.get(
  '/classrooms',
  teacherOnly,
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT c.id, c.name, c.grade,
              count(cs.student_id)::int AS students
         FROM classrooms c
         LEFT JOIN classroom_students cs ON cs.classroom_id = c.id
        WHERE c.teacher_id = $1
        GROUP BY c.id
        ORDER BY c.grade, c.name`,
      [req.user.id],
    );
    res.json({ classrooms: rows });
  }),
);

router.get(
  '/classrooms/:id/students',
  teacherOnly,
  asyncHandler(async (req, res) => {
    const classroom = await teacherClassroom(Number(req.params.id), req.user.id);
    if (!classroom) return forbidden(res, 'Ese aula no pertenece a tu cuenta.');
    const { rows } = await query(
      `SELECT u.id, u.name, u.grade
         FROM classroom_students cs
         JOIN users u ON u.id = cs.student_id
        WHERE cs.classroom_id = $1
        ORDER BY u.name`,
      [classroom.id],
    );
    res.json({ classroom, students: rows });
  }),
);

router.get(
  '/teacher/reviews',
  teacherOnly,
  asyncHandler(async (req, res) => {
    res.json({ reviews: await pendingReviews(req.user.id) });
  }),
);

router.get(
  '/submissions/:id',
  asyncHandler(async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
    const { rows } = await query(
      `SELECT s.*, u.name AS student_name, a.teacher_id, a.kind,
              coalesce(r.title, p.title) AS title, c.name AS classroom_name
         FROM submissions s
         JOIN assignments a ON a.id = s.assignment_id
         JOIN users u ON u.id = s.student_id
         JOIN classrooms c ON c.id = a.classroom_id
         LEFT JOIN readings r ON r.id = a.reading_id
         LEFT JOIN problems p ON p.id = a.problem_id
        WHERE s.id = $1`,
      [req.params.id],
    );
    const submission = rows[0];
    if (!submission) return notFound(res, 'No encontramos esa entrega.');
    const allowed =
      (req.user.role === 'docente' && submission.teacher_id === req.user.id) ||
      (req.user.role === 'estudiante' && submission.student_id === req.user.id);
    if (!allowed) return forbidden(res);
    res.json({
      submission,
      context: await assignmentContext(submission.assignment_id),
    });
  }),
);

router.patch(
  '/submissions/:id/review',
  teacherOnly,
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT s.*, a.teacher_id, a.id AS assignment_db_id
         FROM submissions s
         JOIN assignments a ON a.id = s.assignment_id
        WHERE s.id = $1`,
      [req.params.id],
    );
    const submission = rows[0];
    if (!submission) return notFound(res, 'No encontramos esa entrega.');
    if (submission.teacher_id !== req.user.id) return forbidden(res);

    const rubric = sanitizeRubric(req.body?.rubric || submission.suggested_rubric);
    const teacherNote = String(req.body?.teacherNote || '').trim();
    const finalScore = confirmedScore(submission.objective_score, rubric);
    const level = levelForScore(finalScore).label;

    const { rows: updated } = await query(
      `UPDATE submissions
          SET rubric = $1, final_score = $2, level = $3, teacher_note = $4,
              status = 'revisado', reviewed_at = now(), reviewed_by = $5, updated_at = now()
        WHERE id = $6 RETURNING *`,
      [JSON.stringify(rubric), finalScore, level, teacherNote || null, req.user.id, submission.id],
    );
    res.json({
      submission: updated[0],
      rubricTotal: rubricTotal(rubric),
      finalScore,
      level: levelForScore(finalScore),
    });
  }),
);

export default router;
