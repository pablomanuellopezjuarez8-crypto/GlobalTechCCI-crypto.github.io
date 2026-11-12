export function render(view) {
  view.innerHTML = `
    <section class="welcome">
      <span class="welcome__mark" aria-hidden="true">✦</span>
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
      <div class="welcome__actions">
        <a class="btn btn--primary" href="#/login">Comenzar</a>
        <a class="btn btn--ghost" href="#/registro">Crear cuenta</a>
      </div>
      <p class="muted small">
        Cada perfil ve solo la información que le corresponde. No hay clasificaciones públicas entre estudiantes.
      </p>
    </section>
  `;
}
