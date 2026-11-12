import PDFDocument from 'pdfkit';

const BOM = '\uFEFF';

function csvCell(value) {
  const text = String(value ?? '');
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvRows(rows) {
  return BOM + rows.map((row) => row.map(csvCell).join(';')).join('\r\n') + '\r\n';
}

export function classroomCsv(data, generatedAt = new Date()) {
  const rows = [
    ['Reporte de aula', data.classroom.name],
    ['Grado', String(data.classroom.grade)],
    ['Generado', generatedAt.toISOString().slice(0, 10)],
    ['Estudiantes', String(data.summary.students)],
    ['Promedio del aula', data.summary.average === null ? 'Sin datos' : String(data.summary.average)],
    ['Entregas pendientes', String(data.summary.pending)],
    ['Por revisar', String(data.summary.needsReview)],
    [],
    ['Estudiante', 'Actividades entregadas', 'Pendientes', 'Por revisar', 'Promedio', 'Nivel'],
    ...data.students.map((student) => [
      student.name,
      String(student.completed),
      String(student.pending),
      String(student.needsReview),
      student.average === null ? 'Sin datos' : String(student.average),
      student.level ? student.level.label : 'Sin datos',
    ]),
    [],
    ['Habilidad', 'Promedio del aula (1 a 4)'],
    ...data.skills.map((skill) => [
      skill.label,
      skill.average === null ? 'Sin datos' : String(skill.average),
    ]),
    [],
    ['Nota', 'Los resultados incluyen entregas de demostración marcadas en la aplicación. No son resultados reales.'],
  ];
  return csvRows(rows);
}

export function studentCsv(data, generatedAt = new Date()) {
  const rows = [
    ['Reporte individual', data.student.name],
    ['Grado', data.student.grade === null ? 'Sin grado' : String(data.student.grade)],
    ['Generado', generatedAt.toISOString().slice(0, 10)],
    ['Promedio general', data.summary.overall === null ? 'Sin datos' : String(data.summary.overall)],
    ['Nivel de logro', data.summary.level.label],
    ['Actividades completadas', String(data.summary.activitiesCompleted)],
    ['Tareas pendientes', String(data.summary.activitiesPending)],
    [],
    ['Actividad', 'Tipo', 'Estado', 'Puntaje', 'Nivel', 'Confirmado por el docente'],
    ...data.completed.map((item) => [
      item.title,
      item.kind === 'reading' ? 'Lectura' : 'Reto',
      item.confirmed ? 'Revisado' : 'Entregado (valoración sugerida)',
      String(item.score),
      item.level.label,
      item.confirmed ? 'Sí' : 'No',
    ]),
    ...data.pending.map((item) => [
      item.title,
      item.kind === 'reading' ? 'Lectura' : 'Reto',
      item.status === 'en_progreso' ? 'En progreso' : 'Pendiente',
      '',
      '',
      '',
    ]),
    [],
    ['Habilidad', 'Nivel actual (1 a 4)', 'Promedio anterior (1 a 4)'],
    ...data.skills.map((skill) => [
      skill.label,
      skill.current === null ? 'Sin datos' : String(skill.current),
      skill.previous === null ? 'Sin datos' : String(skill.previous),
    ]),
    [],
    ['Fortalezas', data.strengths || ''],
    ['Aspectos por mejorar', data.improvements || ''],
    [],
    ['Nota', data.summary.hasDemoData ? 'Incluye datos de demostración. No son resultados reales.' : 'Datos registrados en la aplicación.'],
  ];
  return csvRows(rows);
}

function newPdf(res, filename) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
  return doc;
}

function title(doc, text, subtitle) {
  doc.fillColor('#123c3a').font('Helvetica-Bold').fontSize(20).text(text);
  if (subtitle) {
    doc.moveDown(0.2).fillColor('#4a5c5a').font('Helvetica').fontSize(10).text(subtitle);
  }
  doc.moveDown(0.8);
}

function sectionTitle(doc, text) {
  doc.moveDown(0.6).fillColor('#123c3a').font('Helvetica-Bold').fontSize(12).text(text);
  doc.moveDown(0.3);
}

function table(doc, columns, rows) {
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colWidth = width / columns.length;
  const ensureSpace = () => {
    if (doc.y > doc.page.height - doc.page.margins.bottom - 40) doc.addPage();
  };
  ensureSpace();
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#123c3a');
  columns.forEach((column, index) => {
    doc.text(column, doc.page.margins.left + index * colWidth, doc.y, {
      width: colWidth - 4,
    });
  });
  doc.moveDown(0.2);
  doc.font('Helvetica').fontSize(9).fillColor('#2b3a39');
  for (const row of rows) {
    ensureSpace();
    const startY = doc.y;
    row.forEach((cell, index) => {
      doc.text(String(cell ?? ''), doc.page.margins.left + index * colWidth, startY, {
        width: colWidth - 4,
      });
    });
    doc.moveDown(0.35);
  }
  doc.moveDown(0.4);
}

export function classroomPdf(res, data, generatedAt = new Date()) {
  const doc = newPdf(res, `reporte-aula-${data.classroom.id}.pdf`);
  title(
    doc,
    `Reporte del aula ${data.classroom.name}`,
    `Piensa y Resuelve · Generado el ${generatedAt.toISOString().slice(0, 10)}`,
  );

  doc.font('Helvetica').fontSize(10).fillColor('#2b3a39');
  const summary = [
    `Estudiantes: ${data.summary.students}`,
    `Promedio del aula: ${data.summary.average === null ? 'sin datos' : data.summary.average}`,
    `Entregas pendientes: ${data.summary.pending}`,
    `Entregas por revisar: ${data.summary.needsReview}`,
  ].join('    ·    ');
  doc.text(summary);

  sectionTitle(doc, 'Resultados por estudiante');
  table(
    doc,
    ['Estudiante', 'Entregadas', 'Pendientes', 'Promedio', 'Nivel'],
    data.students.map((student) => [
      student.name,
      student.completed,
      student.pending,
      student.average === null ? 'Sin datos' : student.average,
      student.level ? student.level.label : 'Sin datos',
    ]),
  );

  sectionTitle(doc, 'Promedio por habilidad (1 a 4)');
  table(
    doc,
    ['Habilidad', 'Promedio', 'Qué observa'],
    data.skills.map((skill) => [
      skill.label,
      skill.average === null ? 'Sin datos' : skill.average,
      skill.hint,
    ]),
  );

  doc
    .moveDown(0.6)
    .font('Helvetica-Oblique')
    .fontSize(8)
    .fillColor('#6b7a78')
    .text(
      'Los reportes incluyen entregas de demostración creadas para esta primera versión. No son resultados de estudiantes reales. Los resultados individuales no se publican entre estudiantes.',
    );
  doc.end();
}

export function studentPdf(res, data, generatedAt = new Date()) {
  const doc = newPdf(res, `reporte-estudiante-${data.student.id}.pdf`);
  title(
    doc,
    `Reporte de ${data.student.name}`,
    `Piensa y Resuelve · Grado ${data.student.grade ?? 'sin grado'} · Generado el ${generatedAt
      .toISOString()
      .slice(0, 10)}`,
  );

  doc.font('Helvetica').fontSize(10).fillColor('#2b3a39');
  doc.text(
    `Promedio general: ${data.summary.overall === null ? 'sin datos' : data.summary.overall}   ·   Nivel: ${
      data.summary.level.label
    }   ·   Completadas: ${data.summary.activitiesCompleted}   ·   Pendientes: ${data.summary.activitiesPending}`,
  );

  sectionTitle(doc, 'Habilidades');
  table(
    doc,
    ['Habilidad', 'Actual', 'Promedio anterior', 'Cambio'],
    data.skills.map((skill) => [
      skill.label,
      skill.current === null ? 'Sin datos' : skill.current,
      skill.previous === null ? 'Sin datos' : skill.previous,
      skill.change === null ? '—' : skill.change > 0 ? `+${skill.change}` : String(skill.change),
    ]),
  );

  sectionTitle(doc, 'Actividades entregadas');
  if (data.completed.length === 0) {
    doc.font('Helvetica').fontSize(10).text('Todavía no hay entregas registradas.');
  } else {
    table(
      doc,
      ['Actividad', 'Puntaje', 'Nivel', 'Revisión'],
      data.completed.map((item) => [
        item.title,
        item.score,
        item.level.label,
        item.confirmed ? 'Confirmado por el docente' : 'Valoración sugerida',
      ]),
    );
  }

  sectionTitle(doc, 'Tareas pendientes');
  if (data.pending.length === 0) {
    doc.font('Helvetica').fontSize(10).text('No hay tareas pendientes.');
  } else {
    table(
      doc,
      ['Actividad', 'Tipo', 'Entrega'],
      data.pending.map((item) => [
        item.title,
        item.kind === 'reading' ? 'Lectura' : 'Reto',
        item.dueDate || 'Sin fecha',
      ]),
    );
  }

  sectionTitle(doc, 'Fortalezas y aspectos por mejorar');
  doc
    .font('Helvetica')
    .fontSize(10)
    .text(`Fortalezas: ${data.strengths || 'Aún sin datos suficientes.'}`)
    .moveDown(0.3)
    .text(`Aspectos por mejorar: ${data.improvements || 'Aún sin datos suficientes.'}`);

  if (data.recommendations.length) {
    sectionTitle(doc, 'Recomendaciones de refuerzo');
    data.recommendations.forEach((item) => {
      doc.font('Helvetica').fontSize(10).text(`• ${item}`);
    });
  }

  doc
    .moveDown(0.8)
    .font('Helvetica-Oblique')
    .fontSize(8)
    .fillColor('#6b7a78')
    .text(
      data.summary.hasDemoData
        ? 'Este reporte incluye datos de demostración creados para esta primera versión. No son resultados reales.'
        : 'Reporte generado con los datos registrados en la aplicación.',
    );
  doc.end();
}
