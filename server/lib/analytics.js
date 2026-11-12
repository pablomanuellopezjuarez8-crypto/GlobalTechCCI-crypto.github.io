import { query } from '../db.js';
import { CRITERIA, SKILL_KEYS, levelForScore, rubricMean } from './rubric.js';
import { REINFORCE } from './grading.js';

const skillLabel = (key) => CRITERIA.find((c) => c.key === key)?.label || key;

export async function visibleAssignments(studentId) {
  const { rows } = await query(
    `SELECT a.id, a.kind, a.due_date, a.instructions, a.is_demo,
            r.title AS reading_title, p.title AS problem_title,
            r.topic AS reading_topic, p.topic AS problem_topic,
            r.grade AS reading_grade, p.grade AS problem_grade,
            c.name AS classroom_name,
            s.id AS submission_id, s.status, s.final_score, s.suggested_score,
            s.submitted_at, s.updated_at
       FROM assignments a
       LEFT JOIN readings r ON r.id = a.reading_id
       LEFT JOIN problems p ON p.id = a.problem_id
       LEFT JOIN classrooms c ON c.id = a.classroom_id
       LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = $1
      WHERE a.student_id = $1
         OR a.classroom_id IN (SELECT classroom_id FROM classroom_students WHERE student_id = $1)
      ORDER BY a.due_date NULLS LAST, a.id DESC`,
    [studentId],
  );
  return rows.map((row) => {
    const done = row.status === 'entregado' || row.status === 'revisado';
    const rawScore = row.final_score ?? row.suggested_score;
    const score = done && rawScore !== null ? Number(rawScore) : null;
    return {
      assignmentId: row.id,
      kind: row.kind,
      title: row.kind === 'reading' ? row.reading_title : row.problem_title,
      topic: row.kind === 'reading' ? row.reading_topic : row.problem_topic,
      grade: row.kind === 'reading' ? row.reading_grade : row.problem_grade,
      classroomName: row.classroom_name,
      dueDate: row.due_date,
      instructions: row.instructions,
      isDemo: row.is_demo,
      submissionId: row.submission_id,
      status: row.submission_id ? row.status : 'pendiente',
      score,
      confirmed: row.status === 'revisado',
      submittedAt: row.submitted_at,
      updatedAt: row.updated_at,
    };
  });
}

export async function completedSubmissions(studentId) {
  const { rows } = await query(
    `SELECT s.id, s.status, s.objective_score, s.suggested_rubric, s.suggested_score,
            s.rubric, s.final_score, s.submitted_at, s.strengths, s.improvements,
            s.teacher_note, s.is_demo, a.kind, coalesce(r.title, p.title) AS title,
            coalesce(r.topic, p.topic) AS topic
       FROM submissions s
       JOIN assignments a ON a.id = s.assignment_id
       LEFT JOIN readings r ON r.id = a.reading_id
       LEFT JOIN problems p ON p.id = a.problem_id
      WHERE s.student_id = $1 AND s.status IN ('entregado','revisado')
      ORDER BY s.submitted_at ASC NULLS FIRST, s.id ASC`,
    [studentId],
  );
  return rows.map((row) => {
    const rubric = row.rubric || row.suggested_rubric || {};
    const score = Number(row.final_score ?? row.suggested_score ?? 0);
    return {
      id: row.id,
      title: row.title,
      topic: row.topic,
      kind: row.kind,
      status: row.status,
      confirmed: row.status === 'revisado',
      score,
      level: levelForScore(score),
      rubric,
      objectiveScore: Number(row.objective_score || 0),
      submittedAt: row.submitted_at,
      strengths: row.strengths,
      improvements: row.improvements,
      teacherNote: row.teacher_note,
      isDemo: row.is_demo,
    };
  });
}

function averageRubric(items) {
  const out = {};
  for (const key of SKILL_KEYS) {
    if (!items.length) {
      out[key] = null;
      continue;
    }
    const values = items.map((item) => Number(item.rubric[key] || 0)).filter((n) => n > 0);
    out[key] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  }
  return out;
}

export function buildSkills(history) {
  const latest = history.length ? history[history.length - 1] : null;
  const previousItems = history.slice(0, -1);
  const previous = averageRubric(previousItems);
  return CRITERIA.map((criterion) => {
    const currentValue = latest ? Number(latest.rubric[criterion.key] || 0) : null;
    const previousValue = previous[criterion.key];
    return {
      key: criterion.key,
      label: criterion.label,
      hint: criterion.hint,
      current: currentValue,
      previous: previousValue === null ? null : Math.round(previousValue * 10) / 10,
      change:
        currentValue && previousValue ? Math.round((currentValue - previousValue) * 10) / 10 : null,
    };
  });
}

export function computeBadges(history, pendingCount) {
  const badges = [];
  if (history.length >= 1) {
    badges.push({
      key: 'primer-paso',
      label: 'Primer paso',
      detail: 'Completó su primera actividad.',
      icon: '🌱',
    });
  }
  if (history.length >= 3) {
    badges.push({
      key: 'esfuerzo',
      label: 'Esfuerzo sostenido',
      detail: 'Completó 3 actividades o más.',
      icon: '💪',
    });
  }
  const days = new Set(
    history.map((item) => (item.submittedAt ? new Date(item.submittedAt).toISOString().slice(0, 10) : null)).filter(Boolean),
  );
  if (days.size >= 3) {
    badges.push({
      key: 'constancia',
      label: 'Constancia',
      detail: 'Entregó actividades en 3 días distintos.',
      icon: '📅',
    });
  }
  if (history.length >= 2) {
    const last = history[history.length - 1].score;
    const previousAverage =
      history.slice(0, -1).reduce((sum, item) => sum + item.score, 0) / (history.length - 1);
    if (last - previousAverage >= 8) {
      badges.push({
        key: 'mejora',
        label: 'Mejora continua',
        detail: 'Su última entrega superó su promedio anterior.',
        icon: '📈',
      });
    }
  }
  const evidenceAverage = averageRubric(history).evidencias;
  if (evidenceAverage && evidenceAverage >= 3) {
    badges.push({
      key: 'evidencias',
      label: 'Detective de evidencias',
      detail: 'Usa datos del texto en sus respuestas.',
      icon: '🔎',
    });
  }
  if (history.length && pendingCount === 0) {
    badges.push({
      key: 'al-dia',
      label: 'Al día',
      detail: 'No tiene tareas pendientes.',
      icon: '✅',
    });
  }
  return badges;
}

export async function studentResults(studentId) {
  const { rows: studentRows } = await query(
    'SELECT id, name, grade, is_demo FROM users WHERE id = $1 AND role = $2',
    [studentId, 'estudiante'],
  );
  const student = studentRows[0];
  if (!student) return null;

  const assignments = await visibleAssignments(studentId);
  const history = await completedSubmissions(studentId);

  const done = assignments.filter((a) => a.status === 'entregado' || a.status === 'revisado');
  const pending = assignments.filter((a) => a.status === 'pendiente' || a.status === 'en_progreso');

  const scores = history.map((item) => item.score);
  const overall = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const latest = history.length ? history[history.length - 1] : null;
  const previousScores = history.slice(0, -1).map((item) => item.score);
  const previousAverage = previousScores.length
    ? Math.round(previousScores.reduce((a, b) => a + b, 0) / previousScores.length)
    : null;

  const skills = buildSkills(history);
  const weakest = [...skills]
    .filter((s) => s.current !== null)
    .sort((a, b) => a.current - b.current)
    .slice(0, 2);

  return {
    student: { id: student.id, name: student.name, grade: student.grade, isDemo: student.is_demo },
    summary: {
      activitiesCompleted: done.length,
      activitiesPending: pending.length,
      overall,
      level: overall === null ? levelForScore(null) : levelForScore(overall),
      latestScore: latest ? latest.score : null,
      previousAverage,
      hasDemoData: history.some((item) => item.isDemo) || assignments.some((a) => a.isDemo),
    },
    skills,
    history: history.slice().reverse(),
    pending,
    completed: done.map((item) => ({
      ...item,
      level: item.score === null ? null : levelForScore(item.score),
    })),
    badges: computeBadges(history, pending.length),
    strengths: latest?.strengths ?? null,
    improvements: latest?.improvements ?? null,
    recommendations: weakest.map((s) => REINFORCE[s.key]),
  };
}

export async function classroomResults(classroomId) {
  const { rows: classroomRows } = await query(
    'SELECT id, name, grade, teacher_id FROM classrooms WHERE id = $1',
    [classroomId],
  );
  const classroom = classroomRows[0];
  if (!classroom) return null;

  const { rows: students } = await query(
    `SELECT u.id, u.name, u.grade, u.is_demo,
            COALESCE(st.completed, 0)::int AS completed,
            COALESCE(p.pending, 0)::int AS pending,
            COALESCE(st.needs_review, 0)::int AS needs_review,
            st.avg_score, st.last_submitted_at
       FROM classroom_students cs
       JOIN users u ON u.id = cs.student_id
       LEFT JOIN LATERAL (
         SELECT
           count(*) FILTER (WHERE s.status IN ('entregado','revisado')) AS completed,
           count(*) FILTER (WHERE s.status = 'entregado') AS needs_review,
           avg(COALESCE(s.final_score, s.suggested_score)) FILTER (WHERE s.status IN ('entregado','revisado')) AS avg_score,
           max(s.submitted_at) AS last_submitted_at
         FROM submissions s
         JOIN assignments a ON a.id = s.assignment_id
        WHERE s.student_id = u.id AND a.classroom_id = $1
       ) st ON true
       LEFT JOIN LATERAL (
         SELECT count(*) AS pending
         FROM assignments a
         WHERE a.classroom_id = $1
           AND (a.student_id IS NULL OR a.student_id = u.id)
           AND NOT EXISTS (
             SELECT 1 FROM submissions s
             WHERE s.assignment_id = a.id AND s.student_id = u.id
               AND s.status IN ('entregado','revisado')
           )
       ) p ON true
      WHERE cs.classroom_id = $1
      ORDER BY u.name`,
    [classroomId],
  );

  const { rows: rubricRows } = await query(
    `SELECT s.rubric, s.suggested_rubric
       FROM submissions s
       JOIN assignments a ON a.id = s.assignment_id
       JOIN classroom_students cs ON cs.student_id = s.student_id AND cs.classroom_id = $1
      WHERE a.classroom_id = $1 AND s.status IN ('entregado','revisado')`,
    [classroomId],
  );

  const rubrics = rubricRows.map((row) => row.rubric || row.suggested_rubric || {});
  const skillAverages = CRITERIA.map((criterion) => {
    const values = rubrics.map((r) => Number(r[criterion.key] || 0)).filter((n) => n > 0);
    return {
      key: criterion.key,
      label: criterion.label,
      hint: criterion.hint,
      average: values.length
        ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
        : null,
    };
  });

  const withScores = students
    .map((s) => ({ ...s, average: s.avg_score === null ? null : Math.round(Number(s.avg_score)) }))
    .filter((s) => s.average !== null);
  const classroomAverage = withScores.length
    ? Math.round(withScores.reduce((sum, s) => sum + s.average, 0) / withScores.length)
    : null;

  const distribution = { inicio: 0, proceso: 0, logrado: 0, destacado: 0 };
  for (const s of withScores) {
    distribution[levelForScore(s.average).key] += 1;
  }

  return {
    classroom: { id: classroom.id, name: classroom.name, grade: classroom.grade },
    summary: {
      students: students.length,
      average: classroomAverage,
      completed: students.reduce((sum, s) => sum + s.completed, 0),
      pending: students.reduce((sum, s) => sum + s.pending, 0),
      needsReview: students.reduce((sum, s) => sum + s.needs_review, 0),
      distribution,
    },
    skills: skillAverages,
    students: students.map((s) => ({
      id: s.id,
      name: s.name,
      grade: s.grade,
      isDemo: s.is_demo,
      completed: s.completed,
      pending: s.pending,
      needsReview: s.needs_review,
      average: s.average,
      level: s.average === null ? null : levelForScore(s.average),
      lastSubmittedAt: s.last_submitted_at,
    })),
  };
}

export async function pendingReviews(teacherId) {
  const { rows } = await query(
    `SELECT s.id, s.submitted_at, s.suggested_score, s.objective_score, s.is_demo,
            u.name AS student_name, u.id AS student_id,
            a.kind, coalesce(r.title, p.title) AS title,
            c.name AS classroom_name
       FROM submissions s
       JOIN assignments a ON a.id = s.assignment_id
       JOIN classrooms c ON c.id = a.classroom_id
       JOIN users u ON u.id = s.student_id
       LEFT JOIN readings r ON r.id = a.reading_id
       LEFT JOIN problems p ON p.id = a.problem_id
      WHERE c.teacher_id = $1 AND s.status = 'entregado'
      ORDER BY s.submitted_at ASC`,
    [teacherId],
  );
  return rows.map((row) => ({
    submissionId: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    title: row.title,
    kind: row.kind,
    classroomName: row.classroom_name,
    submittedAt: row.submitted_at,
    suggestedScore: Number(row.suggested_score || 0),
    objectiveScore: Number(row.objective_score || 0),
    isDemo: row.is_demo,
  }));
}

export { skillLabel, rubricMean };
