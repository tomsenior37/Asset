export function paginateParams(req, defaults = { page: 1, limit: 50 }) {
  const page = Math.max(1, parseInt(req.query.page || defaults.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || defaults.limit, 10) || 50));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
