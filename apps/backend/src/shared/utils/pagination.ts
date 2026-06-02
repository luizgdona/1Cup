export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export function paginate(page = 1, perPage = 20) {
  const skip = (page - 1) * perPage;
  return { skip, take: perPage };
}

export function paginationMeta(total: number, page: number, perPage: number): PaginationMeta {
  return {
    page,
    perPage,
    total,
    totalPages: Math.ceil(total / perPage),
  };
}
