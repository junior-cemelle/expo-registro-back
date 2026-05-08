import { FastifyRequest } from 'fastify'

export function parsePagination(request: FastifyRequest): { page: number; size: number } {
  const query = request.query as Record<string, string>
  const page = Math.max(0, parseInt(query.page ?? '0', 10) || 0)
  const size = Math.min(100, Math.max(1, parseInt(query.size ?? '10', 10) || 10))
  return { page, size }
}

export function paginateResponse<T>(
  content: T[],
  total: number,
  page: number,
  size: number,
) {
  return {
    content,
    page,
    size,
    totalElements: total,
    totalPages: Math.ceil(total / size),
  }
}
