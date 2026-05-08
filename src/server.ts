import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import authPlugin from './plugins/auth.js'
import authRoutes from './routes/auth.js'
import materiasRoutes from './routes/materias.js'
import gruposRoutes from './routes/grupos.js'
import alumnosRoutes from './routes/alumnos.js'
import equiposRoutes from './routes/equipos.js'
import exposicionesRoutes from './routes/exposiciones.js'
import criteriosRoutes from './routes/criterios.js'
import evaluacionesRoutes from './routes/evaluaciones.js'

const fastify = Fastify({ logger: true })

const start = async () => {
  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL ?? true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })

  await fastify.register(authPlugin)

  const PREFIX = '/api/v1'
  fastify.register(authRoutes,        { prefix: `${PREFIX}/auth` })
  fastify.register(materiasRoutes,    { prefix: `${PREFIX}/materias` })
  fastify.register(gruposRoutes,      { prefix: `${PREFIX}/grupos` })
  fastify.register(alumnosRoutes,     { prefix: `${PREFIX}/alumnos` })
  fastify.register(equiposRoutes,     { prefix: `${PREFIX}/equipos` })
  fastify.register(exposicionesRoutes,{ prefix: `${PREFIX}/exposiciones` })
  fastify.register(criteriosRoutes,   { prefix: `${PREFIX}/criterios` })
  fastify.register(evaluacionesRoutes,{ prefix: `${PREFIX}/evaluaciones` })

  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error)
    const status = error.statusCode ?? 500
    reply.status(status).send({
      timestamp: new Date().toISOString(),
      status,
      error: error.name,
      message: error.message,
      path: request.url,
    })
  })

  const port = parseInt(process.env.PORT ?? '8080', 10)
  await fastify.listen({ port, host: '0.0.0.0' })
}

start()
