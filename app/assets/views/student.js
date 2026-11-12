import { api } from '../api.js';
import {
  esc,
  paragraphs,
  fmtDate,
  fmtDateTime,
  kindLabel,
  scoreChip,
  levelPill,
  statusPill,
  demoTag,
  demoNotice,
  assignmentList,
  skillBars,
  badgeGrid,
  resultsPanel,
  rubricRows,
  bindDownloads,
  toast,
} from '../ui.js';

const LEVELS = [
  ['literal', 'Comprensión literal'],
  ['inferencial', 'Comprensión inferencial'],
  ['critica', 'Lectura crítica'],
];

export async function home(view, ctx) {
  const data = await api('/learning/overview');
  const firstName = data.student.name.split(' ')[0];
  const pending = data.pending;

  view.innerHTML = `
    <section class="page-head">
      <div>
        <p class="eyebrow">Tu espacio de aprendizaje</p>
        <h1>Hola, ${esc(firstName)}</h1>
        <p class="muted">${esc(String(data.student.grade ?? ''))}° grado · ${
          pending.length ? `${pending.length} tarea${pending.length === 1 ? '' : 's'} por hacer` : 'sin tareas pendientes'
        }</p>
      </div>
      <a class="btn" href="#/mis-resultados">Ver mis resultados</a>
    </section>
    ${data.summary.hasDemoData ? demoNotice() : ''}

    <div class="grid grid--two">
      <section class="panel">
        <h2>Tus tareas</h2>
        <p class="muted small">Abrir una lectura no cuenta como entrega: la actividad se registra cuando la envías.</p>
        ${assignmentList(pending, { emptyText: '¡Estás al día! No tienes tareas pendientes.' })}
        <h3 class="spaced">Actividades entregadas</h3>
        ${
          data.completed.length
            ? `<ul class="list">${data.completed
                .slice(0, 5)
                .map(
                  (item) => `<li class="list__item">
                    <div class="list__main">
                      <strong>${esc(item.title)}</strong>
                      <span class="muted small">${esc(kindLabel(item.kind))} · ${esc(fmtDate(item.submittedAt))} ${
                        item.confirmed ? '· revisado' : '· valoración sugerida'
                      }</span>
                    </div>
                    <div class="list__side">
                      ${scoreChip(item.score, { suggested: !item.confirmed })}
                      ${statusPill(item.status)}
                      ${demoTag(item.isDemo)}
                    </div>
                  </li>`,
                )
                .join('')}</ul>`
            : '<p class="muted">Todavía no tienes entregas.</p>'
        }
      </section>

      <div class="stack">
        <section class="panel">
          <h2>Tu avance</h2>
          <div class="stats stats--compact">
            <div class="stat">
              <span class="stat__label">Promedio</span>
              <span class="stat__value">${data.summary.overall === null ? '—' : data.summary.overall}<small>/100</small></span>
            </div>
            <div class="stat">
              <span class="stat__label">Nivel</span>
              <span class="stat__value stat__value--text">${levelPill(data.summary.level)}</span>
            </div>
          </div>
          ${skillBars(data.skills)}
          <p class="muted small">Las habilidades se calculan con la rúbrica de tus entregas, no solo con la respuesta final.</p>
        </section>

        <section class="panel">
          <h2>Insignias</h2>
          ${badgeGrid(data.badges)}
        </section>

        <section class="panel panel--accent">
          <h2>¿Cómo se valora tu trabajo?</h2>
          <p class="muted small">
            Cada entrega se mira con cinco criterios: comprensión, análisis, uso de evidencias, argumentación y
            propuesta de soluciones. Las preguntas objetivas se califican solas; las respuestas abiertas reciben una
            valoración sugerida que tu docente revisa y confirma.
          </p>
        </section>
      </div>
    </div>
  `;
}

export async function results(view) {
  const data = await api('/learning/results');
  view.innerHTML = `<section class="panel">${resultsPanel(data)}</section>`;
  bindDownloads(view);
}

function contentPanel(data) {
  const { assignment, reading, problem } = data;
  const chips = `
    <span class="chip chip--soft">${esc(kindLabel(assignment.kind))}</span>
    ${demoTag(reading?.is_demo || problem?.is_demo || assignment.is_demo)}
    <span class="chip chip--muted">${esc((reading || problem).topic)}</span>
    <span class="chip chip--muted">${(reading || problem).grade}° grado</span>
  `;

  if (assignment.kind === 'reading') {
    return `<article class="panel reading">
      <div class="chips">${chips}${reading.difficulty ? `<span class="chip chip--muted">${esc(reading.difficulty)}</span>` : ''}</div>
      <h1>${esc(reading.title)}</h1>
      <div class="prose">${paragraphs(reading.body)}</div>
      ${assignment.instructions ? `<p class="instructions"><strong>Indicaciones del docente:</strong> ${esc(assignment.instructions)}</p>` : ''}
      <p class="muted small">Entrega: ${esc(fmtDate(assignment.dueDate))} · Docente: ${esc(assignment.teacher_name || '')}</p>
    </article>`;
  }

  return `<article class="panel reading">
    <div class="chips">${chips}</div>
    <h1>${esc(problem.title)}</h1>
    <div class="prose">${paragraphs(problem.scenario)}</div>
    ${problem.context ? `<p class="instructions"><strong>Ten en cuenta:</strong> ${esc(problem.context)}</p>` : ''}
    <p class="big-question">${esc(problem.question)}</p>
    ${assignment.instructions ? `<p class="instructions"><strong>Indicaciones del docente:</strong> ${esc(assignment.instructions)}</p>` : ''}
    <p class="muted small">Entrega: ${esc(fmtDate(assignment.dueDate))} · Docente: ${esc(assignment.teacher_name || '')}</p>
  </article>`;
}

export async function activity(view, ctx, params) {
  const assignmentId = Number(params[0]);
  const load = () => api(`/learning/assignments/${assignmentId}`);
  let data = await load();

  function paint() {
    if (data.submission && data.submission.submittedAt) paintResult();
    else paintForm();
  }

  function paintForm() {
    const { assignment, questions, problem } = data;
    const answers = data.submission?.answers || {};
    const isReading = assignment.kind === 'reading';

    const questionsHtml = isReading
      ? LEVELS.map(([level, label]) => {
          const list = questions
            .map((question, index) => ({ question, index }))
            .filter((entry) => entry.question.level === level);
          if (!list.length) return '';
          return `<section class="qgroup">
            <h3>${label}</h3>
            ${list.map(({ question, index }) => questionField(question, index + 1, answers)).join('')}
          </section>`;
        }).join('') +
        `<section class="qgroup">
          <h3>Conexión con la vida cotidiana</h3>
          <fieldset class="question">
            <legend><span class="q-num">Actividad final</span> ${esc(data.reading.real_life_prompt)}</legend>
            <label class="sr-only" for="real-life">Tu respuesta a la actividad final</label>
            <textarea id="real-life" rows="5" placeholder="Relaciona la lectura con algo de tu vida y explica qué harías.">${esc(
              answers.real_life || '',
            )}</textarea>
          </fieldset>
        </section>`
      : problemFormHtml(problem, answers);

    view.innerHTML = `
      <div class="activity">
        <div class="activity__top">
          <a class="link-back" href="#/estudiante">← Volver a mis tareas</a>
          <span class="muted small">Puedes guardar tu avance y continuar después.</span>
        </div>
        <div class="activity__grid">
          ${contentPanel(data)}
          <form class="panel work" id="work-form" novalidate>
            <h2>${isReading ? 'Responde' : 'Resuelve paso a paso'}</h2>
            <p class="muted small">Explica tus ideas con tus propias palabras. Una respuesta razonada vale más que una respuesta corta.</p>
            ${questionsHtml}
            <div class="confirm" id="submit-confirm" hidden>
              <p>
                <strong>¿Entregar la actividad?</strong>
                Después de entregarla ya no podrás editarla. Abrir la actividad no cuenta como entrega.
              </p>
              <div class="actions">
                <button type="button" class="btn btn--primary" id="confirm-submit">Sí, entregar</button>
                <button type="button" class="btn btn--ghost" id="cancel-submit">Cancelar</button>
              </div>
            </div>
            <div class="savebar">
              <span id="save-status" class="muted small">${
                data.submission ? `Avance guardado ${esc(fmtDateTime(data.submission.savedAt))}` : 'Aún sin guardar.'
              }</span>
              <div class="actions">
                <button type="button" class="btn btn--ghost" id="save-progress">Guardar avance</button>
                <button type="submit" class="btn btn--primary" id="submit-work">Entregar actividad</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;

    const form = view.querySelector('#work-form');
    const status = view.querySelector('#save-status');

    const collect = () => {
      const result = {};
      if (isReading) {
        questions.forEach((question) => {
          if (question.type === 'multiple') {
            const checked = form.querySelector(`input[name="q-${question.id}"]:checked`);
            if (checked) result[question.id] = checked.value;
          } else {
            const field = form.querySelector(`#q-${question.id}`);
            if (field) result[question.id] = field.value.trim();
          }
        });
        const realLife = form.querySelector('#real-life');
        if (realLife) result.real_life = realLife.value.trim();
      } else {
        const identify = form.querySelector('input[name="identify"]:checked');
        if (identify) result.identify = identify.value;
        const facts = {};
        problem.fact_opinions.forEach((_, index) => {
          const checked = form.querySelector(`input[name="fact-${index}"]:checked`);
          if (checked) facts[index] = checked.value;
        });
        result.facts = facts;
        problem.open_steps.forEach((step) => {
          const field = form.querySelector(`#step-${step.key}`);
          if (field) result[step.key] = field.value.trim();
        });
      }
      return result;
    };

    view.querySelector('#save-progress').addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        const response = await api(`/learning/assignments/${assignmentId}/progress`, {
          method: 'PUT',
          body: { answers: collect() },
        });
        status.textContent = `Avance guardado ${fmtDateTime(response.savedAt)}`;
        toast('Avance guardado. Puedes continuar después.', 'ok');
      } catch (error) {
        toast(error.message, 'error');
      } finally {
        button.disabled = false;
      }
    });

    const confirmBox = view.querySelector('#submit-confirm');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      confirmBox.hidden = false;
      confirmBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      view.querySelector('#confirm-submit').focus();
    });
    view.querySelector('#cancel-submit').addEventListener('click', () => {
      confirmBox.hidden = true;
      view.querySelector('#submit-work').focus();
    });

    view.querySelector('#confirm-submit').addEventListener('click', async () => {
      const button = view.querySelector('#confirm-submit');
      button.disabled = true;
      button.textContent = 'Entregando…';
      try {
        await api(`/learning/assignments/${assignmentId}/submit`, {
          method: 'POST',
          body: { answers: collect() },
        });
        toast('Actividad entregada. Lee tu retroalimentación.', 'ok');
        data = await load();
        paint();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (error) {
        toast(error.message, 'error');
        button.disabled = false;
        button.textContent = 'Sí, entregar';
      }
    });
  }

  function paintResult() {
    const { assignment, reading, problem, submission } = data;
    const confirmed = submission.status === 'revisado';
    const score = confirmed ? submission.finalScore : submission.suggestedScore;
    const rubric = confirmed ? submission.rubric : submission.suggestedRubric;
    const title = (reading || problem).title;

    view.innerHTML = `
      <div class="activity">
        <div class="activity__top">
          <a class="link-back" href="#/estudiante">← Volver a mis tareas</a>
          <span class="muted small">Entregada el ${esc(fmtDateTime(submission.submittedAt))}</span>
        </div>
        <section class="panel">
          <div class="panel__head">
            <div>
              <p class="eyebrow">${esc(kindLabel(assignment.kind))} · ${confirmed ? 'revisada por tu docente' : 'pendiente de revisión'}</p>
              <h1>${esc(title)}</h1>
              <p class="muted">${demoTag((reading || problem).is_demo || assignment.is_demo)}</p>
            </div>
            <div class="result-score">
              ${scoreChip(score, { suggested: !confirmed })}
              ${levelPill(
                submission.level
                  ? {
                      key:
                        score >= 90
                          ? 'destacado'
                          : score >= 70
                            ? 'logrado'
                            : score >= 50
                              ? 'proceso'
                              : 'inicio',
                      label: submission.level,
                    }
                  : null,
              )}
            </div>
          </div>

          ${
            confirmed
              ? '<div class="notice notice--ok" role="note"><strong>Calificación confirmada.</strong> Tu docente revisó la valoración sugerida y dejó sus comentarios.</div>'
              : '<div class="notice notice--info" role="note"><strong>Valoración sugerida.</strong> Todavía no es la calificación final: tu docente puede revisarla y ajustarla.</div>'
          }

          <div class="stats">
            <div class="stat">
              <span class="stat__label">Preguntas objetivas</span>
              <span class="stat__value">${submission.objectiveScore ?? 0}<small>/100</small></span>
            </div>
            <div class="stat">
              <span class="stat__label">Valoración de la rúbrica</span>
              <span class="stat__value">${score}${confirmed ? '' : '<small> sugerida</small>'}</span>
            </div>
            <div class="stat">
              <span class="stat__label">Estado</span>
              <span class="stat__value stat__value--text">${statusPill(submission.status)}</span>
            </div>
          </div>

          <h3>Rúbrica</h3>
          ${rubricRows(rubric)}
          ${submission.teacherNote ? `<div class="callout callout--good"><h4>Comentario del docente</h4><p>${esc(submission.teacherNote)}</p></div>` : ''}

          <h3>Retroalimentación pregunta por pregunta</h3>
          <ul class="feedback-list">
            ${(submission.feedback || [])
              .map(
                (item) => `<li class="feedback ${item.correct === false ? 'feedback--bad' : item.correct === true ? 'feedback--ok' : ''}">
                  <p class="feedback__label">${esc(item.label)}</p>
                  <p class="feedback__prompt">${esc(item.prompt)}</p>
                  ${
                    item.type === 'open'
                      ? `<p class="feedback__answer"><strong>Tu respuesta:</strong> ${
                          item.answerText ? esc(item.answerText) : '<em>Sin respuesta</em>'
                        }</p>
                         <p class="feedback__guide"><strong>Respuesta orientativa:</strong> ${esc(item.guidance)}</p>
                         <p class="muted small">${esc(item.note || '')}</p>`
                      : `<p class="feedback__answer"><strong>Tu respuesta:</strong> ${
                          item.selectedText ? esc(item.selectedText) : '<em>Sin respuesta</em>'
                        }</p>
                         <p class="feedback__guide"><strong>Respuesta correcta:</strong> ${esc(item.answerText)}</p>
                         <p class="muted small">${esc(item.guidance)}</p>`
                  }
                </li>`,
              )
              .join('')}
          </ul>

          <div class="two-col">
            <div class="callout callout--good"><h4>Fortalezas</h4><p>${esc(submission.strengths || '')}</p></div>
            <div class="callout callout--warn"><h4>Para mejorar</h4><p>${esc(submission.improvements || '')}</p></div>
          </div>

          <div class="actions">
            <a class="btn btn--primary" href="#/estudiante">Volver a mis tareas</a>
            <a class="btn btn--ghost" href="#/mis-resultados">Ver mis resultados</a>
          </div>
        </section>
      </div>
    `;
  }

  paint();
}

function questionField(question, number, answers) {
  const value = answers[String(question.id)];
  if (question.type === 'multiple') {
    return `<fieldset class="question">
      <legend><span class="q-num">Pregunta ${number}</span> ${esc(question.prompt)}</legend>
      <div class="options">
        ${(question.options || [])
          .map(
            (option, index) => `<label class="option">
              <input type="radio" name="q-${question.id}" value="${index}"
                ${Number(value) === index ? 'checked' : ''} />
              <span>${esc(option)}</span>
            </label>`,
          )
          .join('')}
      </div>
    </fieldset>`;
  }
  return `<fieldset class="question">
    <legend><span class="q-num">Pregunta ${number}</span> ${esc(question.prompt)}</legend>
    <label class="sr-only" for="q-${question.id}">Tu respuesta a la pregunta ${number}</label>
    <textarea id="q-${question.id}" rows="4" placeholder="Escribe tu respuesta y explica por qué.">${esc(
      value || '',
    )}</textarea>
  </fieldset>`;
}

function problemFormHtml(problem, answers) {
  const factAnswers = answers.facts && typeof answers.facts === 'object' ? answers.facts : {};
  return `
    <section class="qgroup">
      <h3>Paso 1 · Identificar el problema</h3>
      <fieldset class="question">
        <legend>${esc(problem.identify.prompt)}</legend>
        <div class="options">
          ${(problem.identify.options || [])
            .map(
              (option, index) => `<label class="option">
                <input type="radio" name="identify" value="${index}" ${
                  Number(answers.identify) === index ? 'checked' : ''
                } />
                <span>${esc(option)}</span>
              </label>`,
            )
            .join('')}
        </div>
      </fieldset>
    </section>

    <section class="qgroup">
      <h3>Paso 2 · Diferenciar hechos de opiniones</h3>
      <p class="muted small">Marca si cada afirmación es un hecho (se puede comprobar) o una opinión (expresa un punto de vista).</p>
      ${(problem.fact_opinions || [])
        .map(
          (fact, index) => `<fieldset class="question">
            <legend><span class="q-num">Frase ${index + 1}</span> ${esc(fact.text)}</legend>
            <div class="options options--inline">
              <label class="option"><input type="radio" name="fact-${index}" value="hecho" ${
                factAnswers[index] === 'hecho' ? 'checked' : ''
              } /> <span>Hecho</span></label>
              <label class="option"><input type="radio" name="fact-${index}" value="opinion" ${
                factAnswers[index] === 'opinion' ? 'checked' : ''
              } /> <span>Opinión</span></label>
            </div>
          </fieldset>`,
        )
        .join('')}
    </section>

    ${(problem.open_steps || [])
      .map(
        (step, index) => `<section class="qgroup">
          <h3>Paso ${index + 3} · ${esc(step.label)}</h3>
          <fieldset class="question">
            <legend>${esc(step.prompt)}</legend>
            <label class="sr-only" for="step-${step.key}">Tu respuesta a ${esc(step.label)}</label>
            <textarea id="step-${step.key}" rows="5" placeholder="Escribe tu respuesta con detalle.">${esc(
              answers[step.key] || '',
            )}</textarea>
          </fieldset>
        </section>`,
      )
      .join('')}
  `;
}
