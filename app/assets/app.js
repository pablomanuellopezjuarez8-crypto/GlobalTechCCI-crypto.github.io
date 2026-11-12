import { api } from './api.js';
import { ROLE_LABEL, esc, toast } from './ui.js';
import * as loginView from './views/login.js';
import * as student from './views/student.js';
import * as teacher from './views/teacher.js';
import * as family from './views/family.js';

const state = { user: null, profile: null };

const view = document.getElementById('view');
const nav = document.getElementById('main-nav');
const sessionBox = document.getElementById('session-box');

const NAV_BY_ROLE = {
  estudiante: [
    { href: '#/estudiante', label: 'Mis tareas' },
    { href: '#/mis-resultados', label: 'Mis resultados' },
  ],
  docente: [
    { href: '#/docente', label: 'Panel' },
    { href: '#/docente/crear', label: 'Crear actividad' },
    { href: '#/docente/asignar', label: 'Asignar' },
  ],
  familia: [{ href: '#/familia', label: 'Mi familia' }],
};

const routes = [
  { pattern: /^#\/login$/, view: loginView.render },
  { pattern: /^#\/estudiante$/, role: 'estudiante', view: student.home },
  { pattern: /^#\/actividad\/(\d+)$/, role: 'estudiante', view: student.activity },
  { pattern: /^#\/mis-resultados$/, role: 'estudiante', view: student.results },
  { pattern: /^#\/docente$/, role: 'docente', view: teacher.home },
  { pattern: /^#\/docente\/crear$/, role: 'docente', view: teacher.create },
  { pattern: /^#\/docente\/asignar$/, role: 'docente', view: teacher.assign },
  { pattern: /^#\/docente\/aula\/(\d+)$/, role: 'docente', view: teacher.classroom },
  { pattern: /^#\/docente\/estudiante\/(\d+)$/, role: 'docente', view: teacher.student },
  { pattern: /^#\/docente\/revisar\/(\d+)$/, role: 'docente', view: teacher.review },
  { pattern: /^#\/familia$/, role: 'familia', view: family.home },
  { pattern: /^#\/familia\/hijo\/(\d+)$/, role: 'familia', view: family.child },
];

export function homeFor(role) {
  if (role === 'docente') return '#/docente';
  if (role === 'familia') return '#/familia';
  if (role === 'estudiante') return '#/estudiante';
  return '#/login';
}

function navigate(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

const ctx = {
  get user() {
    return state.user;
  },
  get profile() {
    return state.profile;
  },
  setSession(user, profile) {
    state.user = user;
    state.profile = profile;
    paintChrome();
    navigate(homeFor(user.role));
  },
  async logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch (error) {
      /* la sesión local se limpia igual */
    }
    state.user = null;
    state.profile = null;
    paintChrome();
    navigate('#/login');
    toast('Sesión cerrada.');
  },
  navigate,
  reload: render,
};

function paintChrome() {
  const role = state.user?.role;
  nav.innerHTML = '';
  if (role && NAV_BY_ROLE[role]) {
    nav.innerHTML = NAV_BY_ROLE[role]
      .map((item) => {
        const active = location.hash.startsWith(item.href);
        return `<a class="nav__link${active ? ' is-active' : ''}" href="${item.href}"
                   ${active ? 'aria-current="page"' : ''}>${esc(item.label)}</a>`;
      })
      .join('');
  }
  if (state.user) {
    sessionBox.innerHTML = `
      <span class="session__name">${esc(state.user.name)}</span>
      <span class="session__role">${esc(ROLE_LABEL[state.user.role] || '')}</span>
      <button type="button" class="btn btn--ghost btn--small" data-logout>Salir</button>`;
    sessionBox.querySelector('[data-logout]').addEventListener('click', () => ctx.logout());
  } else {
    sessionBox.innerHTML = '';
  }
}

function errorPanel(message) {
  return `<section class="panel">
    <h2>No pudimos mostrar esta pantalla</h2>
    <p class="muted">${esc(message || 'Intenta de nuevo en un momento.')}</p>
    <p><a class="btn" href="${homeFor(state.user?.role)}">Volver al inicio</a></p>
  </section>`;
}

async function render() {
  const hash = location.hash || '#/';

  if (!state.user) {
    await loginView.render(view, ctx);
    return;
  }
  if (hash === '#/' || hash === '#/login' || hash === '' || hash === '#') {
    location.replace(homeFor(state.user.role));
    return;
  }

  const route = routes.find((candidate) => candidate.pattern.test(hash));
  if (!route || !route.view) {
    view.innerHTML = errorPanel('La página que buscas no existe.');
    return;
  }
  if (route.role && route.role !== state.user.role) {
    location.replace(homeFor(state.user.role));
    return;
  }

  const params = hash.match(route.pattern).slice(1);
  view.innerHTML = '<p class="loading" role="status">Cargando…</p>';
  try {
    await route.view(view, ctx, params);
  } catch (error) {
    view.innerHTML = errorPanel(error.message);
  }
  if (location.hash.includes('#')) {
    const current = location.hash;
    nav.querySelectorAll('.nav__link').forEach((link) => {
      const active = current.startsWith(link.getAttribute('href'));
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }
}

// ---- Accesibilidad: tamaño de texto y alto contraste ----
function applyFont(value) {
  document.documentElement.dataset.font = value;
  localStorage.setItem('py-font', value);
}

function applyContrast(enabled) {
  document.documentElement.dataset.contrast = enabled ? 'alto' : 'normal';
  localStorage.setItem('py-contrast', enabled ? 'alto' : 'normal');
  const button = document.querySelector('[data-contrast-toggle]');
  if (button) button.setAttribute('aria-pressed', String(enabled));
}

function setupA11y() {
  const sizes = ['normal', 'grande', 'muy-grande'];
  const stored = localStorage.getItem('py-font');
  applyFont(sizes.includes(stored) ? stored : 'normal');
  applyContrast(localStorage.getItem('py-contrast') === 'alto');

  document.querySelectorAll('[data-font-step]').forEach((button) => {
    button.addEventListener('click', () => {
      const current = document.documentElement.dataset.font || 'normal';
      const index = sizes.indexOf(current);
      const next = button.dataset.fontStep === 'up' ? Math.min(sizes.length - 1, index + 1) : Math.max(0, index - 1);
      applyFont(sizes[next]);
    });
  });
  const contrastButton = document.querySelector('[data-contrast-toggle]');
  if (contrastButton) {
    contrastButton.addEventListener('click', () => {
      applyContrast(document.documentElement.dataset.contrast !== 'alto');
    });
  }
}

async function boot() {
  setupA11y();
  try {
    const data = await api('/auth/me');
    state.user = data.user;
    state.profile = data.profile;
  } catch (error) {
    state.user = null;
    state.profile = null;
  }
  paintChrome();
  window.addEventListener('hashchange', () => {
    paintChrome();
    view.innerHTML = '';
    view.focus({ preventScroll: true });
    render();
  });
  await render();
}

boot();
