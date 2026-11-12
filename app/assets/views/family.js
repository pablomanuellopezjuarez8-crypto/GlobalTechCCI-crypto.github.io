import { api } from '../api.js';
import {
  esc,
  fmtDate,
  kindLabel,
  statusPill,
  demoTag,
  demoNotice,
  scoreChip,
  levelPill,
  badgeGrid,
  resultsPanel,
  bindDownloads,
} from '../ui.js';

export async function home(view, ctx) {
  const data = await api('/family/overview');
  const firstName = ctx.user.name.split(' ')[0];

  if (!data.children.length) {
    view.innerHTML = `<section class="panel">
      <h1>Hola, ${esc(firstName)}</h1>
      <p class="muted">Tu cuenta todavía no está vinculada a un estudiante. Pide a la institución que complete la vinculación.</p>
    </section>`;
    return;
  }

  view.innerHTML = `
    <section class="page-head">
      <div>
        <p class="eyebrow">Espacio de familia</p>
        <h1>Hola, ${esc(firstName)}</h1>
        <p class="muted">Aquí ves las tareas pendientes y el progreso de ${
          data.children.length === 1 ? 'tu hijo o hija' : 'tus hijos o hijas'
        }. Solo tú y el docente pueden ver esta información.</p>
      </div>
    </section>
    ${data.children.some((entry) => entry.summary.hasDemoData) ? demoNotice() : ''}

    <div class="grid grid--two">
      ${data.children
        .map(
          ({ child, summary, pending, badges, latest }) => `<section class="panel">
            <div class="panel__head">
              <div>
                <h2>${esc(child.name)}</h2>
                <p class="muted small">${child.grade}° grado ${demoTag(summary.hasDemoData)}</p>
              </div>
              ${levelPill(summary.level)}
            </div>
            <div class="stats stats--compact">
              <div class="stat"><span class="stat__label">Promedio</span><span class="stat__value">${summary.overall ?? '—'}<small>/100</small></span></div>
              <div class="stat"><span class="stat__label">Completadas</span><span class="stat__value">${summary.activitiesCompleted}</span></div>
              <div class="stat"><span class="stat__label">Pendientes</span><span class="stat__value">${summary.activitiesPending}</span></div>
            </div>

            <h3 class="spaced">Tareas pendientes</h3>
            ${
              pending.length
                ? `<ul class="list">${pending
                    .map(
                      (item) => `<li class="list__item">
                        <div class="list__main">
                          <strong>${esc(item.title)}</strong>
                          <span class="muted small">${esc(kindLabel(item.kind))} · entrega ${esc(fmtDate(item.dueDate))}</span>
                        </div>
                        <div class="list__side">${statusPill(item.status)} ${demoTag(item.isDemo)}</div>
                      </li>`,
                    )
                    .join('')}</ul>`
                : '<p class="muted">No hay tareas pendientes.</p>'
            }

            <h3 class="spaced">Últimas entregas</h3>
            ${
              latest.length
                ? `<ul class="list">${latest
                    .map(
                      (item) => `<li class="list__item">
                        <div class="list__main">
                          <strong>${esc(item.title)}</strong>
                          <span class="muted small">${esc(fmtDate(item.submittedAt))} ${
                            item.confirmed ? '· revisado por el docente' : '· valoración sugerida'
                          }</span>
                        </div>
                        <div class="list__side">
                          ${scoreChip(item.score, { suggested: !item.confirmed })}
                          ${demoTag(item.isDemo)}
                        </div>
                      </li>`,
                    )
                    .join('')}</ul>`
                : '<p class="muted">Todavía no hay entregas.</p>'
            }

            <h3 class="spaced">Insignias</h3>
            ${badgeGrid(badges)}

            <div class="actions">
              <a class="btn btn--primary" href="#/familia/hijo/${child.id}">Ver progreso detallado</a>
            </div>
          </section>`,
        )
        .join('')}
    </div>

    <section class="panel panel--accent">
      <h2>Cómo leer los resultados</h2>
      <p class="muted small">
        El nivel de logro se calcula con una rúbrica de cinco habilidades: comprensión, análisis, uso de evidencias,
        argumentación y propuesta de soluciones. Las respuestas abiertas reciben una valoración sugerida que el docente
        revisa y confirma. Las actividades solo cuentan como entregadas cuando el estudiante las envía.
      </p>
    </section>
  `;
}

export async function child(view, ctx, params) {
  const data = await api(`/family/children/${Number(params[0])}`);
  view.innerHTML = `
    <div class="activity__top">
      <a class="link-back" href="#/familia">← Volver a mi familia</a>
    </div>
    <section class="panel">${resultsPanel(data)}</section>
  `;
  bindDownloads(view);
}
