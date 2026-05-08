import { FastifyReply } from 'fastify'

export function sendError(
  reply: FastifyReply,
  status: number,
  error: string,
  message: string,
  path: string,
): void {
  reply.status(status).send({ timestamp: new Date().toISOString(), status, error, message, path })
}

export function handleSupabaseError(
  error: { code?: string; message: string },
  reply: FastifyReply,
  path: string,
): void {
  switch (error.code) {
    case '23505':
      return sendError(reply, 409, 'Conflict', 'Ya existe un registro con ese valor único', path)
    case '23503':
      return sendError(reply, 409, 'Conflict', 'No se puede eliminar — el registro tiene dependencias', path)
    case 'P0001': {
      const match = error.message.match(/El alumno[^.\n]+/i)
      return sendError(reply, 409, 'Conflict', match?.[0]?.trim() ?? 'Conflicto de integridad', path)
    }
    case 'PGRST116':
      return sendError(reply, 404, 'Not Found', 'Recurso no encontrado', path)
  }
  return sendError(reply, 500, 'Internal Server Error', error.message, path)
}
