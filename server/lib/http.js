export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    grade: user.grade,
    isDemo: user.is_demo,
  };
}

export function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

export function notFound(res, message = 'No encontramos lo que buscas.') {
  return res.status(404).json({ error: message });
}

export function forbidden(res, message = 'Tu perfil no tiene acceso a esta información.') {
  return res.status(403).json({ error: message });
}
