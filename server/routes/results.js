import { Router } from 'express';
import { asyncHandler, notFound, forbidden } from '../lib/http.js';
import { requireAuth, requireRole } from '../auth.js';
import { studentResults, classroomResults } from '../lib/analytics.js';
import { teacherClassroom, canTeacherSeeStudent, isGuardianOf } from '../lib/access.js';
import { classroomCsv, studentCsv, classroomPdf, studentPdf } from '../lib/reports.js';

const router = Router();

async function canSeeStudent(user, studentId) {
  if (!user) return false;
  if (user.role === 'estudiante') return user.id === studentId;
  if (user.role === 'familia') return isGuardianOf(user.id, studentId);
  if (user.role === 'docente') return canTeacherSeeStudent(user.id, studentId);
  return false;
}

router.get(
  '/results/student/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const studentId = Number(req.params.id);
    if (!(await canSeeStudent(req.user, studentId))) {
      return forbidden(res, 'No puedes consultar los resultados de este estudiante.');
    }
    const results = await studentResults(studentId);
    if (!results) return notFound(res, 'No encontramos a ese estudiante.');
    res.json(results);
  }),
);

router.get(
  '/results/classroom/:id',
  requireRole('docente'),
  asyncHandler(async (req, res) => {
    const classroom = await teacherClassroom(Number(req.params.id), req.user.id);
    if (!classroom) return forbidden(res, 'Ese aula no pertenece a tu cuenta.');
    const results = await classroomResults(classroom.id);
    if (!results) return notFound(res, 'No encontramos ese aula.');
    res.json(results);
  }),
);

router.get(
  '/reports/classroom/:id/csv',
  requireRole('docente'),
  asyncHandler(async (req, res) => {
    const classroom = await teacherClassroom(Number(req.params.id), req.user.id);
    if (!classroom) return forbidden(res, 'Ese aula no pertenece a tu cuenta.');
    const data = await classroomResults(classroom.id);
    if (!data) return notFound(res, 'No encontramos ese aula.');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="reporte-aula-${classroom.id}.csv"`,
    );
    res.send(classroomCsv(data));
  }),
);

router.get(
  '/reports/classroom/:id/pdf',
  requireRole('docente'),
  asyncHandler(async (req, res) => {
    const classroom = await teacherClassroom(Number(req.params.id), req.user.id);
    if (!classroom) return forbidden(res, 'Ese aula no pertenece a tu cuenta.');
    const data = await classroomResults(classroom.id);
    if (!data) return notFound(res, 'No encontramos ese aula.');
    classroomPdf(res, data);
  }),
);

router.get(
  '/reports/student/:id/csv',
  requireAuth,
  asyncHandler(async (req, res) => {
    const studentId = Number(req.params.id);
    if (!(await canSeeStudent(req.user, studentId))) {
      return forbidden(res, 'No puedes descargar el reporte de este estudiante.');
    }
    const data = await studentResults(studentId);
    if (!data) return notFound(res, 'No encontramos a ese estudiante.');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="reporte-estudiante-${studentId}.csv"`,
    );
    res.send(studentCsv(data));
  }),
);

router.get(
  '/reports/student/:id/pdf',
  requireAuth,
  asyncHandler(async (req, res) => {
    const studentId = Number(req.params.id);
    if (!(await canSeeStudent(req.user, studentId))) {
      return forbidden(res, 'No puedes descargar el reporte de este estudiante.');
    }
    const data = await studentResults(studentId);
    if (!data) return notFound(res, 'No encontramos a ese estudiante.');
    studentPdf(res, data);
  }),
);

export default router;
