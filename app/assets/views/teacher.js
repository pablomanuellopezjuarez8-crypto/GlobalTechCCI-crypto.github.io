import { api } from '../api.js';
import {
  esc,
  fmtDate,
  fmtDateTime,
  kindLabel,
  scoreChip,
  levelPill,
  statusPill,
  demoTag,
  demoNotice,
  toReviewNotice,
  skillBars,
  resultsPanel,
  rubricRows,
  CRITERIA,
  bindDownloads,
  toast,
} from '../ui.js';

const RUBRIC_LEVELS = [
  [1, 'Inicio'],
  [2, 'En proceso'],
  [3, 'Logrado'],
  [4, 'Destacado'],
];

export async function home(view, ctx) {
  const data = await api('/teacher/overview');
  const firstName = ctx.user.name.split(' ')[0];
  const totalStudents = data.classrooms.reduce((sum, classroom) => sum + classroom.students, 0);

  view.innerHTML = `
    <section class="page-head">
      <div>
        <p class="eyebrow">Panel docente</p>
        <h1>Hola, ${esc(firstName)}</h1>
        <p class="muted">${data.classrooms.length} aulas · ${totalStudents} estudiantes · ${data.reviews.length} ${
          data.reviews.length === 1 ? 'entrega por revisar' : 'entregas por revisar'
        }</p>
      </div>
      <div class="actions">
        <a class="btn btn--primary" href="#/docente/crear">Crear actividad</a>
        <a class="btn btn--ghost" href="#/docente/asignar">Asignar</a>
      </div>
    </section>

    ${toReviewNotice(data.reviews.length)}

    <div class="stats">
      <div class="stat"><span class="stat__label">Aulas</span><span class="stat__value">${data.classrooms.length}</span></div>
      <div class="stat"><span class="stat__label">Estudiantes</span><span class="stat__value">${totalStudents}</span></div>
      <div class="stat"><span class="stat__label">Por revisar</span><span class="stat__value">${data.reviews.length}</span></div>
      <div class="stat"><span class="stat__label">Actividades creadas</span><span class="stat__value">${data.authored.readings + data.authored.problems}</span><span class="muted small">${data.authored.readings} lecturas · ${data.authored.problems} retos</span></div>
    </div>

    <div class="grid grid--two">
      <section class="panel">
        <h2>Entregas por revisar</h2>
        <p class="muted small">Las respuestas abiertas tienen una valoración sugerida: revísala y confírmala.</p>
        ${
          data.reviews.length
            ? `<ul class="list">${data.reviews
                .map(
                  (review) => `<li class="list__item">
                    <div class="list__main">
                      <strong>${esc(review.studentName)} ${demoTag(review.isDemo)}</strong>
                      <span class="muted small">${esc(review.title)} · ${esc(review.classroomName)} · ${esc(fmtDateTime(review.submittedAt))}</span>
                    </div>
                    <div class="list__side">
                      ${scoreChip(review.suggestedScore, { suggested: true })}
                      <a class="btn btn--small btn--primary" href="#/docente/revisar/${review.submissionId}">Revisar</a>
                    </div>
                  </li>`,
                )
                .join('')}</ul>`
            : '<p class="muted">No hay entregas pendientes de revisión.</p>'
        }
      </section>

      <section class="panel">
        <h2>Tus aulas</h2>
        <div class="cards">
          ${data.classrooms
            .map(
              (classroom) => `<a class="card" href="#/docente/aula/${classroom.id}">
                <span class="card__title">${esc(classroom.name)}</span>
                <span class="muted small">${classroom.grade}° grado · ${classroom.students} ${
                  classroom.students === 1 ? 'estudiante' : 'estudiantes'
                }</span>
                <span class="card__cta">Ver resultados del aula →</span>
              </a>`,
            )
            .join('')}
        </div>
        <h3 class="spaced">Últimas asignaciones</h3>
        ${
          data.recentAssignments.length
            ? `<ul class="list">${data.recentAssignments
                .map(
                  (assignment) => `<li class="list__item">
                    <div class="list__main">
                      <strong>${esc(assignment.title)}</strong>
                      <span class="muted small">${esc(kindLabel(assignment.kind))} · ${esc(assignment.classroom_name || '')} · ${esc(fmtDate(assignment.due_date))}</span>
                    </div>
                    <div class="list__side">${demoTag(assignment.is_demo)}</div>
                  </li>`,
                )
                .join('')}</ul>`
            : '<p class="muted">Todavía no asignaste actividades.</p>'
        }
      </section>
    </div>
  `;
}

function questionBlock(level = 'literal') {
  return `<div class="question-block" data-question>
    <div class="row row--3">
      <label>Tipo de comprensión
        <select data-field="level">
          <option value="literal" ${level === 'literal' ? 'selected' : ''}>Literal</option>
          <option value="inferencial" ${level === 'inferencial' ? 'selected' : ''}>Inferencial</option>
          <option value="critica" ${level === 'critica' ? 'selected' : ''}>Crítica</option>
        </select>
      </label>
      <label>Formato
        <select data-field="type">
          <option value="multiple">Opción múltiple</option>
          <option value="open">Respuesta abierta</option>
        </select>
      </label>
      <button type="button" class="btn btn--ghost btn--small" data-remove>Quitar</button>
    </div>
    <label>Pregunta<textarea data-field="prompt" rows="2" placeholder="¿Qué información del texto...?"></textarea></label>
    <div data-options-block>
      <label>Opciones (una por línea, mínimo 2)<textarea data-field="options" rows="3" placeholder="Primera opción&#10;Segunda opción&#10;Tercera opción"></textarea></label>
      <label>Número de la opción correcta<input data-field="correctIndex" type="number" min="1" value="1" /></label>
    </div>
    <label>Respuesta orientativa / explicación<textarea data-field="guidance" rows="2" placeholder="Explica cuál es la respuesta esperada y por qué."></textarea></label>
  </div>`;
}

export async function create(view) {
  view.innerHTML = `
    <section class="page-head">
      <div>
        <p class="eyebrow">Docente</p>
        <h1>Crear actividad</h1>
        <p class="muted">Prepara una lectura guiada con preguntas o un reto de pensamiento crítico.</p>
      </div>
      <a class="btn btn--ghost" href="#/docente/asignar">Asignar una actividad</a>
    </section>

    <div class="tabs" role="tablist" aria-label="Tipo de actividad">
      <button type="button" class="tab is-active" role="tab" aria-selected="true" data-tab="reading">Lectura guiada</button>
      <button type="button" class="tab" role="tab" aria-selected="false" data-tab="problem">Reto de pensamiento</button>
    </div>

    <section class="panel" id="tab-reading" role="tabpanel">
      <h2>Nueva lectura guiada</h2>
      <form id="reading-form" novalidate>
        <label>Título<input name="title" required maxlength="120" placeholder="El agua que se escapa" /></label>
        <div class="row row--3">
          <label>Grado escolar
            <select name="grade">${Array.from({ length: 11 }, (_, i) => i + 1)
              .map((grade) => `<option value="${grade}" ${grade === 4 ? 'selected' : ''}>${grade}° grado</option>`)
              .join('')}</select>
          </label>
          <label>Dificultad
            <select name="difficulty">
              <option>Básica</option><option selected>Intermedia</option><option>Avanzada</option>
            </select>
          </label>
          <label>Tema<input name="topic" required placeholder="Medio ambiente" /></label>
        </div>
        <label>Texto de la lectura<textarea name="body" rows="9" required placeholder="Escribe o pega el texto. Separa los párrafos con una línea en blanco."></textarea></label>
        <label>Actividad para relacionar con la vida cotidiana<textarea name="realLifePrompt" rows="3" required placeholder="¿Dónde ocurre algo parecido en tu casa o colegio?"></textarea></label>

        <fieldset class="builder">
          <legend>Preguntas de comprensión</legend>
          <p class="muted small">Incluye preguntas literales, inferenciales y críticas, con opción múltiple y abiertas.</p>
          <div id="question-list"></div>
          <button type="button" class="btn btn--ghost btn--small" id="add-question">+ Agregar pregunta</button>
        </fieldset>

        <p id="reading-error" class="form-error" role="alert" hidden></p>
        <div class="actions">
          <button type="submit" class="btn btn--primary">Guardar lectura</button>
        </div>
      </form>
    </section>

    <section class="panel" id="tab-problem" role="tabpanel" hidden>
      <h2>Nuevo reto de pensamiento</h2>
      <form id="problem-form" novalidate>
        <label>Título<input name="title" required maxlength="120" placeholder="La fila del quiosco" /></label>
        <div class="row row--3">
          <label>Grado escolar
            <select name="grade">${Array.from({ length: 11 }, (_, i) => i + 1)
              .map((grade) => `<option value="${grade}" ${grade === 4 ? 'selected' : ''}>${grade}° grado</option>`)
              .join('')}</select>
          </label>
          <label>Tema<input name="topic" required placeholder="Convivencia escolar" /></label>
          <label>Contexto o datos extra (opcional)<input name="context" placeholder="Datos que ayudan a decidir" /></label>
        </div>
        <label>Situación de la vida cotidiana<textarea name="scenario" rows="6" required placeholder="Describe la situación con datos concretos."></textarea></label>
        <label>Pregunta principal<textarea name="question" rows="2" required placeholder="¿Cómo podrían...?"></textarea></label>

        <fieldset class="builder">
          <legend>Paso 1 · Identificar el problema</legend>
          <label>Enunciado<input name="identifyPrompt" value="¿Cuál es el problema principal del relato?" /></label>
          <label>Opciones (una por línea)<textarea name="identifyOptions" rows="4" required placeholder="Primera opción&#10;Segunda opción&#10;Tercera opción"></textarea></label>
          <label>Número de la opción correcta<input name="identifyCorrect" type="number" min="1" value="1" /></label>
          <label>Explicación de la respuesta<textarea name="identifyGuidance" rows="2" placeholder="Explica por qué esa es la mejor respuesta."></textarea></label>
        </fieldset>

        <fieldset class="builder">
          <legend>Paso 2 · Hechos y opiniones</legend>
          <p class="muted small">Escribe entre 2 y 4 afirmaciones y marca si son hecho u opinión.</p>
          ${[0, 1, 2, 3]
            .map(
              (index) => `<div class="row row--3 fact-row">
                <label>Afirmación ${index + 1}<input name="factText${index}" placeholder="El recreo dura 25 minutos." /></label>
                <label>Clasificación
                  <select name="factType${index}">
                    <option value="hecho">Hecho</option>
                    <option value="opinion">Opinión</option>
                  </select>
                </label>
                <label>Explicación<input name="factWhy${index}" placeholder="Es un dato que se puede comprobar." /></label>
              </div>`,
            )
            .join('')}
        </fieldset>

        <p class="muted small">Los pasos de alternativas, justificación con evidencias y reflexión se agregan automáticamente.</p>
        <p id="problem-error" class="form-error" role="alert" hidden></p>
        <div class="actions">
          <button type="submit" class="btn btn--primary">Guardar reto</button>
        </div>
      </form>
    </section>
  `;

  view.querySelectorAll('[data-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      view.querySelectorAll('[data-tab]').forEach((other) => {
        const active = other === tab;
        other.classList.toggle('is-active', active);
        other.setAttribute('aria-selected', String(active));
        view.querySelector(`#tab-${other.dataset.tab}`).hidden = !active;
      });
    });
  });

  const list = view.querySelector('#question-list');
  const addQuestion = (level = 'literal') => {
    list.insertAdjacentHTML('beforeend', questionBlock(level));
    const block = list.lastElementChild;
    block.querySelector('[data-remove]').addEventListener('click', () => block.remove());
    block.querySelector('[data-field="type"]').addEventListener('change', (event) => {
      block.querySelector('[data-options-block]').hidden = event.target.value !== 'multiple';
    });
  };
  addQuestion('literal');
  addQuestion('inferencial');
  addQuestion('critica');
  view.querySelector('#add-question').addEventListener('click', () => addQuestion());

  const readingForm = view.querySelector('#reading-form');
  const readingError = view.querySelector('#reading-error');
  readingForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    readingError.hidden = true;
    const formData = new FormData(readingForm);
    const questions = [...list.querySelectorAll('[data-question]')]
      .map((block) => {
        const level = block.querySelector('[data-field="level"]').value;
        const type = block.querySelector('[data-field="type"]').value;
        const prompt = block.querySelector('[data-field="prompt"]').value.trim();
        if (!prompt) return null;
        const question = {
          level,
          type,
          prompt,
          skill: level === 'literal' ? 'comprension' : level === 'inferencial' ? 'analisis' : 'argumentacion',
          guidance: block.querySelector('[data-field="guidance"]').value.trim(),
        };
        if (type === 'multiple') {
          question.options = block
            .querySelector('[data-field="options"]')
            .value.split('\n')
            .map((option) => option.trim())
            .filter(Boolean);
          question.correctIndex = Number(block.querySelector('[data-field="correctIndex"]').value) - 1;
        }
        return question;
      })
      .filter(Boolean);

    const submit = readingForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Guardando…';
    try {
      await api('/readings', {
        method: 'POST',
        body: {
          title: formData.get('title'),
          grade: Number(formData.get('grade')),
          difficulty: formData.get('difficulty'),
          topic: formData.get('topic'),
          body: formData.get('body'),
          realLifePrompt: formData.get('realLifePrompt'),
          questions,
        },
      });
      toast('Lectura guardada. Ya puedes asignarla a un aula.', 'ok');
      readingForm.reset();
      list.innerHTML = '';
      addQuestion('literal');
      addQuestion('inferencial');
      addQuestion('critica');
    } catch (error) {
      readingError.textContent = error.message;
      readingError.hidden = false;
    } finally {
      submit.disabled = false;
      submit.textContent = 'Guardar lectura';
    }
  });

  const problemForm = view.querySelector('#problem-form');
  const problemError = view.querySelector('#problem-error');
  problemForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    problemError.hidden = true;
    const formData = new FormData(problemForm);
    const facts = [0, 1, 2, 3]
      .map((index) => ({
        text: String(formData.get(`factText${index}`) || '').trim(),
        isFact: formData.get(`factType${index}`) === 'hecho',
        explanation: String(formData.get(`factWhy${index}`) || '').trim(),
      }))
      .filter((fact) => fact.text);

    const submit = problemForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Guardando…';
    try {
      await api('/problems', {
        method: 'POST',
        body: {
          title: formData.get('title'),
          grade: Number(formData.get('grade')),
          topic: formData.get('topic'),
          scenario: formData.get('scenario'),
          question: formData.get('question'),
          context: formData.get('context'),
          identify: {
            prompt: formData.get('identifyPrompt'),
            options: String(formData.get('identifyOptions') || '')
              .split('\n')
              .map((option) => option.trim())
              .filter(Boolean),
            correctIndex: Number(formData.get('identifyCorrect')) - 1,
            guidance: formData.get('identifyGuidance'),
          },
          facts,
        },
      });
      toast('Reto guardado. Ya puedes asignarlo a un aula.', 'ok');
      problemForm.reset();
    } catch (error) {
      problemError.textContent = error.message;
      problemError.hidden = false;
    } finally {
      submit.disabled = false;
      submit.textContent = 'Guardar reto';
    }
  });
}

export async function assign(view) {
  const [catalog, classroomsData] = await Promise.all([api('/catalog'), api('/classrooms')]);
  const classrooms = classroomsData.classrooms;

  if (!classrooms.length) {
    view.innerHTML = `<section class="panel"><h1>Asignar actividad</h1>
      <p class="muted">Todavía no tienes aulas asignadas.</p></section>`;
    return;
  }

  view.innerHTML = `
    <section class="page-head">
      <div>
        <p class="eyebrow">Docente</p>
        <h1>Asignar actividad</h1>
        <p class="muted">Elige una lectura o un reto, el aula y la fecha de entrega.</p>
      </div>
      <a class="btn btn--ghost" href="#/docente/crear">Crear una actividad nueva</a>
    </section>

    <section class="panel">
      <form id="assign-form" novalidate>
        <div class="row row--3">
          <label>Aula
            <select name="classroomId" id="assign-classroom">
              ${classrooms
                .map((classroom) => `<option value="${classroom.id}" data-grade="${classroom.grade}">${esc(classroom.name)} · ${classroom.grade}° grado</option>`)
                .join('')}
            </select>
          </label>
          <label>Tipo de actividad
            <select name="kind" id="assign-kind">
              <option value="reading">Lectura guiada</option>
              <option value="problem">Reto de pensamiento</option>
            </select>
          </label>
          <label>Fecha de entrega
            <input type="date" name="dueDate" id="assign-date" />
          </label>
        </div>
        <label>Actividad
          <select name="refId" id="assign-item"></select>
        </label>
        <p class="muted small" id="assign-hint"></p>
        <label>Indicaciones para el aula (opcional)
          <textarea name="instructions" rows="3" placeholder="Por ejemplo: responde con tus propias palabras y guarda tu avance si no terminas."></textarea>
        </label>
        <p id="assign-error" class="form-error" role="alert" hidden></p>
        <div class="actions">
          <button type="submit" class="btn btn--primary">Asignar actividad</button>
        </div>
      </form>
    </section>
  `;

  const classroomSelect = view.querySelector('#assign-classroom');
  const kindSelect = view.querySelector('#assign-kind');
  const itemSelect = view.querySelector('#assign-item');
  const hint = view.querySelector('#assign-hint');
  const dateInput = view.querySelector('#assign-date');

  const defaultDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  dateInput.value = defaultDate.toISOString().slice(0, 10);

  function refreshItems() {
    const grade = Number(classroomSelect.selectedOptions[0]?.dataset.grade);
    const kind = kindSelect.value;
    const source = kind === 'reading' ? catalog.readings : catalog.problems;
    const filtered = source.filter((item) => item.grade === grade);
    itemSelect.innerHTML = filtered.length
      ? filtered
          .map(
            (item) => `<option value="${item.id}">${esc(item.title)}${item.is_demo ? ' · demostración' : ''}</option>`,
          )
          .join('')
      : '<option value="">No hay actividades para este grado</option>';
    hint.textContent = filtered.length
      ? `${filtered.length} ${filtered.length === 1 ? 'actividad disponible' : 'actividades disponibles'} para ${grade}° grado.`
      : 'Crea una actividad para este grado desde «Crear actividad».';
  }
  classroomSelect.addEventListener('change', refreshItems);
  kindSelect.addEventListener('change', refreshItems);
  refreshItems();

  const form = view.querySelector('#assign-form');
  const error = view.querySelector('#assign-error');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.hidden = true;
    if (!itemSelect.value) {
      error.textContent = 'Primero crea una actividad para este grado.';
      error.hidden = false;
      return;
    }
    const formData = new FormData(form);
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Asignando…';
    try {
      await api('/assignments', {
        method: 'POST',
        body: {
          kind: formData.get('kind'),
          refId: Number(formData.get('refId')),
          classroomId: Number(formData.get('classroomId')),
          dueDate: formData.get('dueDate'),
          instructions: formData.get('instructions'),
        },
      });
      toast('Actividad asignada al aula.', 'ok');
      view.querySelector('#assign-item').selectedIndex = 0;
    } catch (requestError) {
      error.textContent = requestError.message;
      error.hidden = false;
    } finally {
      submit.disabled = false;
      submit.textContent = 'Asignar actividad';
    }
  });
}

export async function classroom(view, ctx, params) {
  const classroomId = Number(params[0]);
  const data = await api(`/results/classroom/${classroomId}`);
  const { summary } = data;

  view.innerHTML = `
    <div class="activity__top">
      <a class="link-back" href="#/docente">← Volver al panel</a>
      <div class="actions">
        <button type="button" class="btn btn--ghost btn--small" data-download="/reports/classroom/${classroomId}/pdf">Descargar PDF</button>
        <button type="button" class="btn btn--ghost btn--small" data-download="/reports/classroom/${classroomId}/csv">Descargar Excel (CSV)</button>
        <a class="btn btn--small" href="#/docente/asignar">Asignar actividad</a>
      </div>
    </div>

    <section class="panel">
      <div class="panel__head">
        <div>
          <p class="eyebrow">Resultados del aula</p>
          <h1>${esc(data.classroom.name)}</h1>
          <p class="muted">${data.classroom.grade}° grado · ${summary.students} estudiantes</p>
        </div>
      </div>

      <div class="stats">
        <div class="stat"><span class="stat__label">Promedio del aula</span><span class="stat__value">${summary.average ?? '—'}<small>/100</small></span></div>
        <div class="stat"><span class="stat__label">Entregas registradas</span><span class="stat__value">${summary.completed}</span></div>
        <div class="stat"><span class="stat__label">Tareas pendientes</span><span class="stat__value">${summary.pending}</span></div>
        <div class="stat"><span class="stat__label">Por revisar</span><span class="stat__value">${summary.needsReview}</span></div>
      </div>

      <div class="two-col">
        <div>
          <h3>Promedio por habilidad</h3>
          ${skillBars(
            data.skills.map((skill) => ({
              label: skill.label,
              current: skill.average,
            })),
            { compare: false },
          )}
        </div>
        <div>
          <h3>Niveles de logro</h3>
          <ul class="distribution">
            ${[
              ['Destacado', summary.distribution.destacado],
              ['Logrado', summary.distribution.logrado],
              ['En proceso', summary.distribution.proceso],
              ['Inicio', summary.distribution.inicio],
            ]
              .map(
                ([label, count]) => `<li><span>${label}</span><span class="distribution__bar"><span style="width:${
                  summary.students ? Math.round((count / summary.students) * 100) : 0
                }%"></span></span><strong>${count}</strong></li>`,
              )
              .join('')}
          </ul>
          <p class="muted small">Los resultados se muestran solo al docente. No se publican clasificaciones entre estudiantes.</p>
        </div>
      </div>

      <h3 class="spaced">Estudiantes</h3>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr><th>Estudiante</th><th>Entregadas</th><th>Pendientes</th><th>Por revisar</th><th>Promedio</th><th>Nivel</th><th></th></tr>
          </thead>
          <tbody>
            ${data.students
              .map(
                (student) => `<tr>
                  <td><strong>${esc(student.name)}</strong> ${demoTag(student.isDemo)}</td>
                  <td>${student.completed}</td>
                  <td>${student.pending}</td>
                  <td>${student.needsReview ? `<span class="pill pill--good">${student.needsReview}</span>` : '0'}</td>
                  <td>${student.average === null ? '<span class="muted">Sin datos</span>' : `${student.average}/100`}</td>
                  <td>${levelPill(student.level)}</td>
                  <td><a class="btn btn--small" href="#/docente/estudiante/${student.id}">Ver</a></td>
                </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;

  bindDownloads(view);
}

export async function student(view, ctx, params) {
  const studentId = Number(params[0]);
  const data = await api(`/results/student/${studentId}`);
  view.innerHTML = `
    <div class="activity__top">
      <a class="link-back" href="#/docente">← Volver al panel</a>
    </div>
    <section class="panel">${resultsPanel(data)}</section>
  `;
  bindDownloads(view);
}

export async function review(view, ctx, params) {
  const submissionId = Number(params[0]);

  async function load() {
    return api(`/submissions/${submissionId}`);
  }

  let data = await load();

  function paint() {
    const { submission, context } = data;
    const rubric = submission.rubric || submission.suggested_rubric || {};
    const item = context?.reading || context?.problem;
    const feedback = submission.feedback || [];

    view.innerHTML = `
      <div class="activity__top">
        <a class="link-back" href="#/docente">← Volver al panel</a>
        <span class="muted small">${esc(submission.classroom_name || '')}</span>
      </div>

      <section class="panel">
        <div class="panel__head">
          <div>
            <p class="eyebrow">${esc(kindLabel(submission.kind))} · ${demoTag(submission.is_demo)}</p>
            <h1>${esc(item?.title || submission.title)}</h1>
            <p class="muted">${esc(submission.student_name)} · entregada el ${esc(fmtDateTime(submission.submitted_at))}</p>
          </div>
          <div class="result-score">
            ${scoreChip(submission.final_score ?? submission.suggested_score, {
              suggested: submission.status !== 'revisado',
            })}
            ${statusPill(submission.status)}
          </div>
        </div>

        ${
          submission.status === 'revisado'
            ? `<div class="notice notice--ok" role="note"><strong>Calificación confirmada.</strong> Puedes ajustarla nuevamente si lo necesitas.</div>`
            : '<div class="notice notice--info" role="note"><strong>Valoración sugerida.</strong> Revisa las respuestas abiertas, ajusta la rúbrica y confirma.</div>'
        }

        <div class="stats">
          <div class="stat"><span class="stat__label">Preguntas objetivas</span><span class="stat__value">${Number(submission.objective_score || 0)}<small>/100</small></span></div>
          <div class="stat"><span class="stat__label">Valoración sugerida</span><span class="stat__value">${Number(submission.suggested_score || 0)}<small>/100</small></span></div>
          <div class="stat"><span class="stat__label">Calificación final</span><span class="stat__value">${submission.final_score === null ? '—' : Number(submission.final_score)}</span></div>
        </div>

        <h3>Respuestas del estudiante</h3>
        <ul class="feedback-list">
          ${feedback
            .map(
              (entry) => `<li class="feedback ${
                entry.correct === false ? 'feedback--bad' : entry.correct === true ? 'feedback--ok' : ''
              }">
                <p class="feedback__label">${esc(entry.label)} · ${
                  entry.correct === true ? 'Correcto' : entry.correct === false ? 'Revisar' : 'Respuesta abierta'
                }</p>
                <p class="feedback__prompt">${esc(entry.prompt)}</p>
                <p class="feedback__answer"><strong>Respuesta:</strong> ${
                  entry.answerText && entry.type === 'open'
                    ? esc(entry.answerText)
                    : entry.selectedText
                      ? esc(entry.selectedText)
                      : '<em>Sin respuesta</em>'
                }</p>
                ${
                  entry.type !== 'open'
                    ? `<p class="feedback__guide"><strong>Respuesta correcta:</strong> ${esc(entry.answerText)}</p>`
                    : ''
                }
                <p class="feedback__guide"><strong>Respuesta orientativa:</strong> ${esc(entry.guidance)}</p>
              </li>`,
            )
            .join('')}
        </ul>

        <h3>Rúbrica y confirmación</h3>
        ${rubricRows(submission.rubric || submission.suggested_rubric)}
        <form id="review-form">
          <div class="rubric-grid">
            ${CRITERIA.map(
              (criterion) => `<label>${esc(criterion.label)}
                <select name="${criterion.key}">
                  ${RUBRIC_LEVELS.map(
                    ([value, label]) => `<option value="${value}" ${
                      Number(rubric[criterion.key] || 1) === value ? 'selected' : ''
                    }>${value} · ${label}</option>`,
                  ).join('')}
                </select>
              </label>`,
            ).join('')}
          </div>
          <label>Comentario para el estudiante (opcional)
            <textarea name="teacherNote" rows="3">${esc(submission.teacher_note || '')}</textarea>
          </label>
          <p id="review-error" class="form-error" role="alert" hidden></p>
          <div class="actions">
            <button type="submit" class="btn btn--primary">
              ${submission.status === 'revisado' ? 'Guardar cambios' : 'Confirmar calificación'}
            </button>
          </div>
        </form>
      </section>
    `;

    const form = view.querySelector('#review-form');
    const error = view.querySelector('#review-error');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      error.hidden = true;
      const formData = new FormData(form);
      const payload = { teacherNote: formData.get('teacherNote') };
      payload.rubric = Object.fromEntries(CRITERIA.map((criterion) => [criterion.key, Number(formData.get(criterion.key))]));
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.textContent = 'Guardando…';
      try {
        const response = await api(`/submissions/${submissionId}/review`, {
          method: 'PATCH',
          body: payload,
        });
        toast(`Calificación confirmada: ${response.finalScore}/100 (${response.level.label}).`, 'ok');
        data = await load();
        paint();
      } catch (requestError) {
        error.textContent = requestError.message;
        error.hidden = false;
        submit.disabled = false;
        submit.textContent = 'Confirmar calificación';
      }
    });
  }

  paint();
}
