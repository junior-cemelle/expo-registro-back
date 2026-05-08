import fp from 'fastify-plugin'
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import fastifyJwt from '@fastify/jwt'

const authPlugin: FastifyPluginAsync = fp(async (fastify) => {
  fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? 'default-secret-change-me',
  })

  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify()
      } catch {
        reply.status(401).send({
          timestamp: new Date().toISOString(),
          status: 401,
          error: 'Unauthorized',
          message: 'Token JWT inválido o expirado',
          path: request.url,
        })
      }
    },
  )
})

export default authPlugin
