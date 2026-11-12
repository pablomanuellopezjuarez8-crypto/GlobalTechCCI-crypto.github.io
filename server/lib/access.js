import { query } from '../db.js';

export async function profileFor(user) {
  if (!user) return null;
  if (user.role === 'docente') {
    const { rows } = await query(
      `SELECT c.id, c.name, c.grade, count(cs.student_id)::int AS students
         FROM classrooms c
         LEFT JOIN classroom_students cs ON cs.classroom_id = c.id
        WHERE c.teacher_id = $1
        GROUP BY c.id
        ORDER BY c.grade`,
      [user.id],
    );
    return { classrooms: rows };
  }
  if (user.role === 'estudiante') {
    const { rows } = await query(
      `SELECT c.id, c.name, c.grade, t.name AS teacher_name
         FROM classroom_students cs
         JOIN classrooms c ON c.id = cs.classroom_id
         JOIN users t ON t.id = c.teacher_id
        WHERE cs.student_id = $1
        ORDER BY c.grade`,
      [user.id],
    );
    return { classrooms: rows };
  }
  const { rows } = await query(
    `SELECT u.id, u.name, u.grade
       FROM student_guardians sg
       JOIN users u ON u.id = sg.student_id
      WHERE sg.guardian_id = $1
      ORDER BY u.name`,
    [user.id],
  );
  return { children: rows };
}

export async function teacherClassroom(classroomId, teacherId) {
  const { rows } = await query('SELECT * FROM classrooms WHERE id = $1 AND teacher_id = $2', [
    classroomId,
    teacherId,
  ]);
  return rows[0] || null;
}

export async function classroomStudentIds(classroomId) {
  const { rows } = await query(
    'SELECT student_id FROM classroom_students WHERE classroom_id = $1',
    [classroomId],
  );
  return rows.map((row) => row.student_id);
}

export async function teacherStudents(teacherId) {
  const { rows } = await query(
    `SELECT DISTINCT u.id, u.name, u.grade, c.id AS classroom_id, c.name AS classroom_name
       FROM users u
       JOIN classroom_students cs ON cs.student_id = u.id
       JOIN classrooms c ON c.id = cs.classroom_id
      WHERE u.role = 'estudiante' AND c.teacher_id = $1
      ORDER BY c.grade, u.name`,
    [teacherId],
  );
  return rows;
}

export async function studentClassroomIds(studentId) {
  const { rows } = await query(
    'SELECT classroom_id FROM classroom_students WHERE student_id = $1',
    [studentId],
  );
  return rows.map((row) => row.classroom_id);
}

export async function canTeacherSeeStudent(teacherId, studentId) {
  const { rows } = await query(
    `SELECT 1
       FROM classroom_students cs
       JOIN classrooms c ON c.id = cs.classroom_id
      WHERE cs.student_id = $1 AND c.teacher_id = $2
      LIMIT 1`,
    [studentId, teacherId],
  );
  return rows.length > 0;
}

export async function isGuardianOf(guardianId, studentId) {
  const { rows } = await query(
    'SELECT 1 FROM student_guardians WHERE guardian_id = $1 AND student_id = $2',
    [guardianId, studentId],
  );
  return rows.length > 0;
}

export async function assignmentContext(assignmentId) {
  const { rows } = await query(
    `SELECT a.*,
            r.id AS r_id, r.title AS r_title, r.grade AS r_grade, r.difficulty AS r_difficulty,
            r.topic AS r_topic, r.body AS r_body, r.real_life_prompt AS r_real_life_prompt,
            r.is_demo AS r_is_demo,
            p.id AS p_id, p.title AS p_title, p.grade AS p_grade, p.topic AS p_topic,
            p.scenario AS p_scenario, p.question AS p_question, p.context AS p_context,
            p.identify AS p_identify, p.fact_opinions AS p_fact_opinions,
            p.open_steps AS p_open_steps, p.rubric_hint AS p_rubric_hint, p.is_demo AS p_is_demo,
            c.name AS classroom_name, t.name AS teacher_name
       FROM assignments a
       LEFT JOIN readings r ON r.id = a.reading_id
       LEFT JOIN problems p ON p.id = a.problem_id
       LEFT JOIN classrooms c ON c.id = a.classroom_id
       LEFT JOIN users t ON t.id = a.teacher_id
      WHERE a.id = $1`,
    [assignmentId],
  );
  const row = rows[0];
  if (!row) return null;

  let questions = [];
  if (row.kind === 'reading') {
    const result = await query(
      'SELECT * FROM reading_questions WHERE reading_id = $1 ORDER BY position, id',
      [row.reading_id],
    );
    questions = result.rows;
  }

  return {
    assignment: {
      id: row.id,
      kind: row.kind,
      due_date: row.due_date,
      instructions: row.instructions,
      classroom_id: row.classroom_id,
      classroom_name: row.classroom_name,
      teacher_id: row.teacher_id,
      teacher_name: row.teacher_name,
      student_id: row.student_id,
      is_demo: row.is_demo,
    },
    reading:
      row.kind === 'reading'
        ? {
            id: row.r_id,
            title: row.r_title,
            grade: row.r_grade,
            difficulty: row.r_difficulty,
            topic: row.r_topic,
            body: row.r_body,
            real_life_prompt: row.r_real_life_prompt,
            is_demo: row.r_is_demo,
          }
        : null,
    questions,
    problem:
      row.kind === 'problem'
        ? {
            id: row.p_id,
            title: row.p_title,
            grade: row.p_grade,
            topic: row.p_topic,
            scenario: row.p_scenario,
            question: row.p_question,
            context: row.p_context,
            identify: row.p_identify,
            fact_opinions: row.p_fact_opinions,
            open_steps: row.p_open_steps,
            rubric_hint: row.p_rubric_hint,
            is_demo: row.p_is_demo,
          }
        : null,
  };
}
