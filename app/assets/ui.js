import { downloadReport } from './api.js';

export const ROLE_LABEL = {
  docente: 'Docente',
  estudiante: 'Estudiante',
  familia: 'Familia',
  admin: 'Administrador',
};

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]),
  );
}

export function paragraphs(text) {
  return String(text || '')
    .split(/\n{2,}/)
    .map((block) => `<p>${esc(block).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

export function fmtDate(value) {
  if (!value) return 'Sin fecha';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export function fmtDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function kindLabel(kind) {
  return kind === 'reading' ? 'Lectura guiada' : 'Reto de pensamiento';
}

export function scoreChip(score, { suggested = false } = {}) {
  if (score === null || score === undefined) {
    return '<span class="chip chip--muted">Sin calificar</span>';
  }
  const value = Number(score);
  const tone = value >= 90 ? 'high' : value >= 70 ? 'good' : value >= 50 ? 'mid' : 'low';
  return `<span class="chip chip--score chip--${tone}">${suggested ? 'Sugerido: ' : ''}${value}<small>/100</small></span>`;
}

export function levelPill(level) {
  if (!level || !level.label) return '<span class="pill pill--muted">Sin datos</span>';
  return `<span class="pill pill--${esc(level.key || 'none')}">${esc(level.label)}</span>`;
}

export function statusPill(status) {
  const map = {
    pendiente: ['muted', 'Pendiente'],
    en_progreso: ['mid', 'En progreso'],
    entregado: ['good', 'Entregado'],
    revisado: ['high', 'Revisado'],
  };
  const [tone, label] = map[status] || ['muted', status];
  return `<span class="pill pill--${tone}">${esc(label)}</span>`;
}

export function dots(value) {
  const number = Math.max(0, Math.min(4, Number(value) || 0));
  return `<span class="dots" aria-label="${number} de 4">${'●'.repeat(number)}${'○'.repeat(4 - number)}</span>`;
}

export function demoTag(isDemo) {
  return isDemo
    ? '<span class="tag tag--demo" title="Dato de demostración de esta primera versión">Demostración</span>'
    : '';
}

export function demoNotice(text = '') {
  return `<div class="notice notice--demo" role="note">
    <strong>Datos de demostración.</strong>
    ${esc(
      text ||
        'Esta primera versión incluye cuentas, actividades y entregas creadas como ejemplo. No son resultados reales de estudiantes.',
    )}
  </div>`;
}

export function toReviewNotice(count) {
  if (!count) return '';
  return `<div class="notice notice--info" role="note">
    ${count} entrega${count === 1 ? '' : 's'} esperando tu revisión. La valoración sugerida no es definitiva hasta que la confirmes.
  </div>`;
}

export function skillBars(skills, { compare = true } = {}) {
  const rows = skills
    .map((skill) => {
      const current = skill.current ?? skill.average ?? null;
      const value = current === null ? 0 : Number(current);
      const width = Math.max(4, Math.min(100, (value / 4) * 100));
      const previous = skill.previous ?? null;
      const change = skill.change ?? (previous !== null && current !== null ? Math.round((current - previous) * 10) / 10 : null);
      const compareText =
        compare && previous !== null
          ? `<span class="muted small">Antes: ${previous} ${change !== null ? `· ${change > 0 ? `mejora +${change}` : change < 0 ? `baja ${change}` : 'sin cambio'}` : ''}</span>`
          : '';
      return `<div class="skill">
        <div class="skill__head">
          <span>${esc(skill.label)}</span>
          <span class="skill__value">${current === null ? 'Sin datos' : `${value} / 4`}</span>
        </div>
        <div class="bar" role="img" aria-label="${esc(skill.label)}: ${current === null ? 'sin datos' : `${value} de 4`}">
          <span style="width:${current === null ? 0 : width}%"></span>
        </div>
        ${compareText}
      </div>`;
    })
    .join('');
  return `<div class="skills">${rows}</div>`;
}

export function badgeGrid(badges) {
  if (!badges || badges.length === 0) {
    return '<p class="muted">Todavía no hay insignias. Se ganan por esfuerzo, constancia y mejora.</p>';
  }
  return `<ul class="badges">${badges
    .map(
      (badge) => `<li class="badge">
        <span class="badge__icon" aria-hidden="true">${esc(badge.icon || '🏅')}</span>
        <span><strong>${esc(badge.label)}</strong><small>${esc(badge.detail || '')}</small></span>
      </li>`,
    )
    .join('')}</ul>`;
}

export function historyList(history) {
  if (!history || history.length === 0) {
    return '<p class="muted">Aún no hay actividades entregadas.</p>';
  }
  return `<ul class="list">${history
    .map(
      (item) => `<li class="list__item">
        <div class="list__main">
          <strong>${esc(item.title)}</strong>
          <span class="muted small">${esc(kindLabel(item.kind))} · ${esc(fmtDate(item.submittedAt))} ${
            item.confirmed ? '· revisado por el docente' : '· valoración sugerida'
          }</span>
        </div>
        <div class="list__side">
          ${scoreChip(item.score, { suggested: !item.confirmed })}
          ${levelPill(item.level)}
          ${demoTag(item.isDemo)}
        </div>
      </li>`,
    )
    .join('')}</ul>`;
}

export function assignmentList(items, { emptyText = 'No hay tareas aquí.', showAction = true } = {}) {
  if (!items || items.length === 0) return `<p class="muted">${esc(emptyText)}</p>`;
  return `<ul class="list">${items
    .map(
      (item) => `<li class="list__item">
        <div class="list__main">
          <strong>${esc(item.title || 'Actividad')}</strong>
          <span class="muted small">${esc(kindLabel(item.kind))} · ${esc(item.topic || '')} ${
            item.dueDate ? `· entrega ${esc(fmtDate(item.dueDate))}` : ''
          }</span>
        </div>
        <div class="list__side">
          ${statusPill(item.status)}
          ${demoTag(item.isDemo)}
          ${
            showAction
              ? `<a class="btn btn--small" href="#/actividad/${item.assignmentId}">${
                  item.status === 'pendiente' ? 'Empezar' : 'Continuar'
                }</a>`
              : ''
          }
        </div>
      </li>`,
    )
    .join('')}</ul>`;
}

export function resultsPanel(data, { downloads = true, studentName = '' } = {}) {
  const summary = data.summary;
  const demo = summary.hasDemoData ? demoNotice() : '';
  const downloadsBlock = downloads
    ? `<div class="actions actions--wrap">
        <button type="button" class="btn btn--ghost" data-download="/reports/student/${data.student.id}/pdf">
          Descargar PDF
        </button>
        <button type="button" class="btn btn--ghost" data-download="/reports/student/${data.student.id}/csv">
          Descargar Excel (CSV)
        </button>
      </div>`
    : '';

  return `
    <div class="panel__head">
      <div>
        <h2>${esc(studentName || data.student.name)}</h2>
        <p class="muted">Panel de resultados · ${esc(String(data.student.grade ?? 'sin grado'))}° grado</p>
      </div>
      ${downloadsBlock}
    </div>
    ${demo}
    <div class="stats">
      <div class="stat">
        <span class="stat__label">Promedio general</span>
        <span class="stat__value">${summary.overall === null ? '—' : summary.overall}<small>/100</small></span>
        <span class="muted small">${summary.previousAverage === null ? 'Sin entregas anteriores' : `Antes: ${summary.previousAverage}`}</span>
      </div>
      <div class="stat">
        <span class="stat__label">Nivel de logro</span>
        <span class="stat__value stat__value--text">${levelPill(summary.level)}</span>
        <span class="muted small">Según la rúbrica de 5 habilidades</span>
      </div>
      <div class="stat">
        <span class="stat__label">Actividades completadas</span>
        <span class="stat__value">${summary.activitiesCompleted}</span>
        <span class="muted small">Entregas registradas</span>
      </div>
      <div class="stat">
        <span class="stat__label">Tareas pendientes</span>
        <span class="stat__value">${summary.activitiesPending}</span>
        <span class="muted small">Incluye avances sin entregar</span>
      </div>
    </div>

    <section class="section">
      <h3>Avance por habilidad</h3>
      <p class="muted small">Comparación entre la última entrega y las entregas anteriores.</p>
      ${skillBars(data.skills)}
    </section>

    <section class="section">
      <h3>Fortalezas y aspectos por mejorar</h3>
      <div class="two-col">
        <div class="callout callout--good">
          <h4>Fortalezas</h4>
          <p>${esc(data.strengths || 'Aún no hay datos suficientes.')}</p>
        </div>
        <div class="callout callout--warn">
          <h4>Aspectos por mejorar</h4>
          <p>${esc(data.improvements || 'Aún no hay datos suficientes.')}</p>
        </div>
      </div>
    </section>

    <section class="section">
      <h3>Insignias</h3>
      ${badgeGrid(data.badges)}
    </section>

    <section class="section">
      <h3>Tareas pendientes</h3>
      ${
        data.pending.length
          ? `<ul class="list">${data.pending
              .map(
                (item) => `<li class="list__item">
                  <div class="list__main">
                    <strong>${esc(item.title)}</strong>
                    <span class="muted small">${esc(kindLabel(item.kind))} · entrega ${esc(fmtDate(item.dueDate))}</span>
                  </div>
                  <div class="list__side">
                    ${statusPill(item.status)}
                    ${demoTag(item.isDemo)}
                    <a class="btn btn--small" href="#/actividad/${item.assignmentId}">Abrir</a>
                  </div>
                </li>`,
              )
              .join('')}</ul>`
          : '<p class="muted">No hay tareas pendientes.</p>'
      }
    </section>

    <section class="section">
      <h3>Historial de entregas</h3>
      ${historyList(data.history)}
    </section>

    <section class="section">
      <h3>Recomendaciones y refuerzo</h3>
      ${
        data.recommendations && data.recommendations.length
          ? `<ul class="bullets">${data.recommendations.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`
          : '<p class="muted">Aún no hay recomendaciones. Se generan a partir de las entregas revisadas.</p>'
      }
    </section>
  `;
}

let toastTimer = null;
export function toast(message, tone = 'info') {
  const node = document.getElementById('toast');
  if (!node) return;
  node.textContent = message;
  node.className = `toast toast--visible toast--${tone}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    node.className = 'toast';
  }, 3600);
}

export function bindDownloads(container) {
  container.querySelectorAll('[data-download]').forEach((button) => {
    button.addEventListener('click', () => downloadReport(button.dataset.download));
  });
}

export const CRITERIA = [
  { key: 'comprension', label: 'Comprensión' },
  { key: 'analisis', label: 'Análisis' },
  { key: 'evidencias', label: 'Uso de evidencias' },
  { key: 'argumentacion', label: 'Argumentación' },
  { key: 'soluciones', label: 'Propuesta de soluciones' },
];

export function rubricRows(rubric) {
  if (!rubric) return '<p class="muted">Sin valoración registrada.</p>';
  return `<ul class="rubric">${CRITERIA.map((criterion) => {
    const value = Number(rubric[criterion.key] || 0);
    return `<li class="rubric__row">
      <span>${esc(criterion.label)}</span>
      ${dots(value)}
      <span class="muted small">${value === 4 ? 'Destacado' : value === 3 ? 'Logrado' : value === 2 ? 'En proceso' : 'Inicio'}</span>
    </li>`;
  }).join('')}</ul>`;
}

export function emptyState(title, text, action) {
  return `<div class="empty">
    <h3>${esc(title)}</h3>
    <p class="muted">${esc(text)}</p>
    ${action || ''}
  </div>`;
}
