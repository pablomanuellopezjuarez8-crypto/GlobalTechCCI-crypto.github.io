export async function api(path, options = {}) {
  const init = { method: 'GET', credentials: 'same-origin', ...options };
  init.headers = { ...(options.headers || {}) };
  if (init.body && typeof init.body !== 'string') {
    init.body = JSON.stringify(init.body);
    init.headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(`/api${path}`, init);
  const type = response.headers.get('content-type') || '';
  if (!type.includes('application/json')) {
    if (!response.ok) throw new Error('No pudimos completar la acción.');
    return null;
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No pudimos completar la acción.');
  return data;
}

export function downloadReport(path) {
  const link = document.createElement('a');
  link.href = `/api${path}`;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
