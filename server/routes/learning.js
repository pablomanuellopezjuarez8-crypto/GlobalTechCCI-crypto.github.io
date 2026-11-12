import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler, badRequest, notFound, forbidden } from '../lib/http.js';
import { requireRole } from '../auth.js';
import { assignmentContext, studentClassroomIds, isGuardianOf } from '../lib/access.js';
import { gradeWork } from '../lib/grading.js';
import { studentResults } from '../lib/analytics.js';
import { levelForScore, rubricMean } from '../lib/rubric.js';

const router = Router();

async function loadAssignmentForStudent(assignmentId, studentId) {
  const context = await assignmentContext(assignmentId);
  if (!context) return { status: 404 };
  const classrooms = await studentClassroomIds(studentId);
  const visible =
    context.assignment.student_id === studentId ||
    classrooms.includes(context.assignment.classroom_id);
  if (!visible) return { status: 403 };

  const { rows } = await query(
    'SELECT * FROM submissions WHERE assignment_id = $1 AND student_id = $2',
    [assignmentId, studentId],
  );
  return { context, submission: rows[0] || null };
}

function assignmentForStudent(context, submitted) {
  const { assignment, reading, questions, problem } = context;
  const payload = {
    assignment,
    reading,
    questions: questions.map((q) => ({
      id: q.id,
      level: q.level,
      type: q.type,
      skill: q.skill,
      prompt: q.prompt,
      options: q.options,
    })),
    problem: problem
      ? {
          id: problem.id,
          title: problem.title,
          grade: problem.grade,
          topic: problem.topic,
          scenario: problem.scenario,
          question: problem.question,
          context: problem.context,
          identify: {
            prompt: problem.identify.prompt,
            options: problem.identify.options,
          },
          fact_opinions: problem.fact_opinions.map((fact) => ({ text: fact.text })),
          open_steps: problem.open_steps.map((step) => ({
            key: step.key,
            label: step.label,
            prompt: step.prompt,
          })),
          is_demo: problem.is_demo,
        }
      : null,
  };
  if (submitted) {
    // Una vez entregada, se muestran las respuestas correctas y la retroalimentación.
    return { ...payload, questions, problem };
  }
  return payload;
}

router.get(
  '/learning/overview',
  requireRole('estudiante'),
  asyncHandler(async (req, res) => {
    const results = await studentResults(req.user.id);
    res.json(results);
  }),
);

router.get(
  '/learning/assignments/:id',
  requireRole('estudiante'),
  asyncHandler(async (req, res) => {
    const loaded = await loadAssignmentForStudent(Number(req.params.id), req.user.id);
    if (loaded.status === 404) return notFound(res, 'No encontramos esa actividad.');
    if (loaded.status === 403) return forbidden(res, 'Esa actividad no está asignada a ti.');

    const { context, submission } = loaded;
    const submitted = Boolean(submission && submission.submitted_at);
    res.json({
      ...assignmentForStudent(context, submitted),
      submission: submission
        ? {
            id: submission.id,
            status: submission.status,
            answers: submission.answers,
            savedAt: submission.updated_at,
            submittedAt: submission.submitted_at,
            objectiveScore: submission.objective_score === null ? null : Number(submission.objective_score),
            suggestedScore:
              submission.suggested_score === null ? null : Number(submission.suggested_score),
            suggestedRubric: submission.suggested_rubric,
            rubric: submission.rubric,
            finalScore: submission.final_score === null ? null : Number(submission.final_score),
            level: submission.level,
            feedback: submission.feedback,
            strengths: submission.strengths,
            improvements: submission.improvements,
            teacherNote: submission.teacher_note,
            reviewedAt: submission.reviewed_at,
          }
        : null,
    });
  }),
);

function normalizeAnswers(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = {};
      for (const [k, v] of Object.entries(value)) {
        if (typeof v === 'string' || typeof v === 'number') nested[k] = v;
      }
      out[key] = nested;
    }
  }
  if (JSON.stringify(out).length > 60000) return null;
  return out;
}

router.put(
  '/learning/assignments/:id/progress',
  requireRole('estudiante'),
  asyncHandler(async (req, res) => {
    const loaded = await loadAssignmentForStudent(Number(req.params.id), req.user.id);
    if (loaded.status === 404) return notFound(res, 'No encontramos esa actividad.');
    if (loaded.status === 403) return forbidden(res, 'Esa actividad no está asignada a ti.');
    if (loaded.submission?.submitted_at) {
      return res.status(409).json({ error: 'Esta actividad ya fue entregada.' });
    }
    const answers = normalizeAnswers(req.body?.answers);
    if (!answers) return badRequest(res, 'No pudimos guardar tus respuestas.');

    const { rows } = await query(
      `INSERT INTO submissions (assignment_id, student_id, status, answers, is_demo)
       VALUES ($1,$2,'en_progreso',$3,false)
       ON CONFLICT (assignment_id, student_id)
       DO UPDATE SET answers = EXCLUDED.answers, updated_at = now()
       WHERE submissions.submitted_at IS NULL
       RETURNING *`,
      [loaded.context.assignment.id, req.user.id, JSON.stringify(answers)],
    );
    res.json({
      ok: true,
      savedAt: rows[0]?.updated_at ?? new Date().toISOString(),
      status: 'en_progreso',
    });
  }),
);

router.post(
  '/learning/assignments/:id/submit',
  requireRole('estudiante'),
  asyncHandler(async (req, res) => {
    const loaded = await loadAssignmentForStudent(Number(req.params.id), req.user.id);
    if (loaded.status === 404) return notFound(res, 'No encontramos esa actividad.');
    if (loaded.status === 403) return forbidden(res, 'Esa actividad no está asignada a ti.');
    if (loaded.submission?.submitted_at) {
      return res.status(409).json({ error: 'Esta actividad ya fue entregada.' });
    }
    const answers = normalizeAnswers(req.body?.answers);
    if (!answers || Object.keys(answers).length === 0) {
      return badRequest(res, 'Responde al menos una pregunta antes de entregar.');
    }

    const { context } = loaded;
    const graded = gradeWork(
      {
        kind: context.assignment.kind,
        reading: context.reading,
        questions: context.questions,
        problem: context.problem,
      },
      answers,
    );

    const { rows } = await query(
      `INSERT INTO submissions
         (assignment_id, student_id, status, answers, objective_score, suggested_rubric,
          suggested_score, level, feedback, strengths, improvements, is_demo, submitted_at, updated_at)
       VALUES ($1,$2,'entregado',$3,$4,$5,$6,$7,$8,$9,$10,false,now(),now())
       ON CONFLICT (assignment_id, student_id)
       DO UPDATE SET
         status = 'entregado',
         answers = EXCLUDED.answers,
         objective_score = EXCLUDED.objective_score,
         suggested_rubric = EXCLUDED.suggested_rubric,
         suggested_score = EXCLUDED.suggested_score,
         level = EXCLUDED.level,
         feedback = EXCLUDED.feedback,
         strengths = EXCLUDED.strengths,
         improvements = EXCLUDED.improvements,
         is_demo = false,
         submitted_at = now(),
         updated_at = now()
       WHERE submissions.submitted_at IS NULL
       RETURNING *`,
      [
        context.assignment.id,
        req.user.id,
        JSON.stringify(answers),
        graded.objectiveScore,
        JSON.stringify(graded.suggestedRubric),
        graded.suggestedScore,
        graded.level.label,
        JSON.stringify(graded.feedback),
        graded.strengths,
        graded.improvements,
      ],
    );
    if (!rows[0]) {
      return res.status(409).json({ error: 'Esta actividad ya fue entregada.' });
    }
    res.json({
      submission: {
        id: rows[0].id,
        status: rows[0].status,
        objectiveScore: graded.objectiveScore,
        suggestedScore: graded.suggestedScore,
        suggestedRubric: graded.suggestedRubric,
        finalScore: null,
        level: graded.level,
        rubricMean: Math.round(rubricMean(graded.suggestedRubric) * 10) / 10,
        feedback: graded.feedback,
        strengths: graded.strengths,
        improvements: graded.improvements,
        submittedAt: rows[0].submitted_at,
      },
      levelFromScore: levelForScore(graded.suggestedScore),
    });
  }),
);

router.get(
  '/family/overview',
  requireRole('familia'),
  asyncHandler(async (req, res) => {
    const { rows: children } = await query(
      `SELECT u.id, u.name, u.grade
         FROM student_guardians sg
         JOIN users u ON u.id = sg.student_id
        WHERE sg.guardian_id = $1
        ORDER BY u.name`,
      [req.user.id],
    );
    const summaries = [];
    for (const child of children) {
      const results = await studentResults(child.id);
      if (!results) continue;
      summaries.push({
        child,
        summary: results.summary,
        pending: results.pending.slice(0, 5),
        skills: results.skills,
        badges: results.badges,
        latest: results.history.slice(0, 3),
      });
    }
    res.json({ children: summaries });
  }),
);

router.get(
  '/family/children/:id',
  requireRole('familia'),
  asyncHandler(async (req, res) => {
    const studentId = Number(req.params.id);
    if (!(await isGuardianOf(req.user.id, studentId))) {
      return forbidden(res, 'Solo puedes ver la información de tus hijos o hijas.');
    }
    const results = await studentResults(studentId);
    if (!results) return notFound(res, 'No encontramos a ese estudiante.');
    res.json(results);
  }),
);

router.get(
  '/learning/results',
  requireRole('estudiante'),
  asyncHandler(async (req, res) => {
    res.json(await studentResults(req.user.id));
  }),
);

export default router;
