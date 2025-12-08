export function getPagination(pagination: { page?: number; limit?: number }) {
  const page = pagination?.page && pagination.page > 0 ? pagination.page : 1;
  const limit = pagination?.limit && pagination.limit > 0 ? pagination.limit : 10;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}
