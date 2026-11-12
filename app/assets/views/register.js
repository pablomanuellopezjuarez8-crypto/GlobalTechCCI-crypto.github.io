import { api } from '../api.js';
import { esc } from '../ui.js';

const ROLES = [
  { value: 'estudiante', label: 'Estudiante' },
  { value: 'docente', label: 'Docente' },
  { value: 'familia', label: 'Familia' },
];

export async function render(view, ctx) {
  let providers = { google: false };
  try {
    providers = await api('/auth/providers');
  } catch (error) {
    providers = { google: false };
  }

  view.innerHTML = `
    <section class="auth auth--single">
      <div class="auth__card panel">
        <h2>Crear cuenta</h2>
        <p class="muted small">Elige tu perfil para ver solo la información que te corresponde.</p>
        <form id="register-form" novalidate>
          <label for="name">Nombre completo</label>
          <input id="name" name="name" type="text" autocomplete="name" required placeholder="Ana Quispe" />
          <label for="email">Correo electrónico</label>
          <input id="email" name="email" type="email" autocomplete="email" required
                 placeholder="nombre@colegio.pe" />
          <label for="password">Contraseña</label>
          <input id="password" name="password" type="password" autocomplete="new-password" required
                 minlength="6" placeholder="Al menos 6 caracteres" />
          <label for="role">Perfil</label>
          <select id="role" name="role">
            ${ROLES.map((role) => `<option value="${role.value}">${esc(role.label)}</option>`).join('')}
          </select>
          <p id="register-error" class="form-error" role="alert" hidden></p>
          <button class="btn btn--primary btn--block" type="submit" id="register-submit">Crear cuenta</button>
        </form>

        ${
          providers.google
            ? `<div class="auth__divider"><span>o</span></div>
               <a class="btn btn--ghost btn--block auth__google" href="/api/auth/google/start">Ingresar con Google</a>`
            : ''
        }

        <p class="auth__links">
          <a href="#/login">Ya tengo cuenta: ingresar</a>
        </p>
      </div>
    </section>
  `;

  const form = view.querySelector('#register-form');
  const error = view.querySelector('#register-error');
  const submit = view.querySelector('#register-submit');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.hidden = true;
    submit.disabled = true;
    submit.textContent = 'Creando cuenta…';
    try {
      const data = await api('/auth/register', {
        method: 'POST',
        body: {
          name: view.querySelector('#name').value,
          email: view.querySelector('#email').value,
          password: view.querySelector('#password').value,
          role: view.querySelector('#role').value,
        },
      });
      ctx.setSession(data.user, data.profile);
    } catch (requestError) {
      error.textContent = requestError.message;
      error.hidden = false;
      submit.disabled = false;
      submit.textContent = 'Crear cuenta';
    }
  });
}
