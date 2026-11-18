export function toOffset({ page, limit }) {
  return (page - 1) * limit;
}

export function paginationMeta({ page, limit }, total) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
