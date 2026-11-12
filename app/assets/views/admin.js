import { api } from '../api.js';
import { ROLE_LABEL, esc } from '../ui.js';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function renderLogin(view, ctx) {
  view.innerHTML = `
    <section class="auth auth--single">
      <div class="auth__card panel">
        <p class="eyebrow">Acceso de administrador</p>
        <h2>Ingresar como administrador</h2>
        <p class="muted small">Desde aquí se revisan las cuentas registradas en la aplicación.</p>
        <form id="admin-form" novalidate>
          <label for="email">Correo electrónico</label>
          <input id="email" name="email" type="email" autocomplete="username" required
                 placeholder="admin@piensayresuelve.pe" />
          <label for="password">Contraseña</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required />
          <p id="admin-error" class="form-error" role="alert" hidden></p>
          <button class="btn btn--primary btn--block" type="submit" id="admin-submit">
            Ingresar como administrador
          </button>
        </form>
        <p class="auth__links"><a href="#/login">Volver al ingreso de usuarios</a></p>
      </div>
    </section>
  `;

  const form = view.querySelector('#admin-form');
  const error = view.querySelector('#admin-error');
  const submit = view.querySelector('#admin-submit');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.hidden = true;
    submit.disabled = true;
    submit.textContent = 'Ingresando…';
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: {
          email: view.querySelector('#email').value,
          password: view.querySelector('#password').value,
          expectedRole: 'admin',
        },
      });
      ctx.setSession(data.user, data.profile);
    } catch (requestError) {
      error.textContent = requestError.message;
      error.hidden = false;
      submit.disabled = false;
      submit.textContent = 'Ingresar como administrador';
    }
  });
}

export async function render(view, ctx) {
  if (!ctx.user) return renderLogin(view, ctx);

  if (ctx.user.role !== 'admin') {
    view.innerHTML = `
      <section class="panel">
        <h2>Sección de administrador</h2>
        <p class="muted">Esta sección es solo para administradores. Tu cuenta no tiene ese acceso.</p>
        <p><a class="btn" href="#/login">Ingresar con otra cuenta</a></p>
      </section>
    `;
    return;
  }

  view.innerHTML = '<p class="loading" role="status">Cargando cuentas…</p>';
  const data = await api('/admin/users');
  const users = data.users || [];
  const count = (role) => users.filter((user) => user.role === role).length;

  view.innerHTML = `
    <section class="panel">
      <p class="eyebrow">Administración</p>
      <h1>Cuentas registradas</h1>
      <p class="muted small">
        ${users.length} ${users.length === 1 ? 'cuenta registrada' : 'cuentas registradas'} en la aplicación.
      </p>

      <div class="stats admin-stats">
        <div class="stat">
          <span class="stat__label">Docentes</span>
          <strong class="stat__value">${count('docente')}</strong>
        </div>
        <div class="stat">
          <span class="stat__label">Estudiantes</span>
          <strong class="stat__value">${count('estudiante')}</strong>
        </div>
        <div class="stat">
          <span class="stat__label">Familias</span>
          <strong class="stat__value">${count('familia')}</strong>
        </div>
        <div class="stat">
          <span class="stat__label">Administradores</span>
          <strong class="stat__value">${count('admin')}</strong>
        </div>
      </div>

      <div class="table-wrap spaced">
        <table class="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Perfil</th>
              <th>Grado</th>
              <th>Registro</th>
            </tr>
          </thead>
          <tbody>
            ${users
              .map(
                (user) => `<tr>
                  <td>${esc(user.name)}${user.isDemo ? ' <span class="chip chip--muted">Demo</span>' : ''}</td>
                  <td>${esc(user.email)}</td>
                  <td>${esc(ROLE_LABEL[user.role] || user.role)}</td>
                  <td>${user.grade === null ? '—' : esc(user.grade)}</td>
                  <td>${esc(formatDate(user.createdAt))}</td>
                </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </div>
      <p class="muted small spaced">
        Los correos se muestran solo en esta sección. No hay clasificaciones públicas entre estudiantes.
      </p>
    </section>
  `;
}
