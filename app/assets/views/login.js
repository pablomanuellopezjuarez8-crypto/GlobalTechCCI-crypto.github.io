import { api } from '../api.js';
import { esc } from '../ui.js';

export async function render(view, ctx) {
  let demo = { accounts: [], password: '' };
  try {
    demo = await api('/auth/demo-accounts');
  } catch (error) {
    demo = { accounts: [], password: '' };
  }

  view.innerHTML = `
    <section class="auth">
      <div class="auth__intro">
        <p class="eyebrow">Aprender a pensar, no solo a responder</p>
        <h1 class="display">Piensa y Resuelve</h1>
        <p class="lead">
          Lecturas guiadas, retos de la vida cotidiana y una rúbrica que valora el razonamiento:
          comprensión, análisis, uso de evidencias, argumentación y propuesta de soluciones.
        </p>
        <ul class="feature-list">
          <li><strong>Docentes:</strong> crean actividades, asignan lecturas con fecha de entrega y revisan los resultados del aula.</li>
          <li><strong>Estudiantes:</strong> leen, resuelven retos, guardan su avance y reciben retroalimentación.</li>
          <li><strong>Familias:</strong> consultan las tareas pendientes y el progreso de sus hijos o hijas.</li>
        </ul>
        <p class="muted small">
          Cada perfil ve solo la información que le corresponde. No hay clasificaciones públicas entre estudiantes.
        </p>
      </div>

      <div class="auth__card panel">
        <h2>Iniciar sesión</h2>
        <form id="login-form" novalidate>
          <label for="email">Correo electrónico</label>
          <input id="email" name="email" type="email" autocomplete="username" required
                 placeholder="nombre@colegio.pe" />
          <label for="password">Contraseña</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required />
          <p id="login-error" class="form-error" role="alert" hidden></p>
          <button class="btn btn--primary btn--block" type="submit" id="login-submit">Ingresar</button>
        </form>

        ${
          demo.accounts.length
            ? `<div class="demo-accounts">
                <h3>Cuentas de demostración</h3>
                <p class="muted small">
                  Primera versión de prueba. Contraseña para todas:
                  <strong>${esc(demo.password)}</strong>. Los datos que verás están marcados como demostración.
                </p>
                <div class="demo-accounts__list">
                  ${demo.accounts
                    .map(
                      (account) => `<button type="button" class="demo-account" data-email="${esc(account.email)}">
                        <span class="demo-account__role">${esc(account.label)}</span>
                        <span class="demo-account__name">${esc(account.name)}</span>
                        <small>${esc(account.email)}</small>
                      </button>`,
                    )
                    .join('')}
                </div>
              </div>`
            : ''
        }
      </div>
    </section>
  `;

  const form = view.querySelector('#login-form');
  const email = view.querySelector('#email');
  const password = view.querySelector('#password');
  const error = view.querySelector('#login-error');
  const submit = view.querySelector('#login-submit');

  view.querySelectorAll('.demo-account').forEach((button) => {
    button.addEventListener('click', () => {
      email.value = button.dataset.email;
      password.value = demo.password;
      error.hidden = true;
      submit.focus();
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.hidden = true;
    submit.disabled = true;
    submit.textContent = 'Ingresando…';
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: { email: email.value, password: password.value },
      });
      ctx.setSession(data.user, data.profile);
    } catch (requestError) {
      error.textContent = requestError.message;
      error.hidden = false;
      submit.disabled = false;
      submit.textContent = 'Ingresar';
      password.focus();
      password.select();
    }
  });
}
