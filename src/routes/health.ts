import { FastifyPluginAsync } from 'fastify'
import supabase from '../lib/supabase.js'

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (_request, reply) => {
    // Consulta liviana para verificar conectividad con la BD
    const { error } = await supabase.from('materia').select('id_materia').limit(1)

    const db = error ? 'error' : 'ok'

    return reply.status(db === 'ok' ? 200 : 503).send({
      status: db === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: db,
      ...(error && { database_error: error.message }),
    })
  })
}

export default healthRoutes
