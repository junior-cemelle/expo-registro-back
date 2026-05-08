import { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import supabase from '../lib/supabase.js'
import { sendError } from '../lib/errors.js'

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
        },
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string }

    const { data: alumno } = await supabase
      .from('alumno')
      .select('id_alumno, email, password, rol')
      .eq('email', email)
      .single()

    if (!alumno) return sendError(reply, 401, 'Unauthorized', 'Credenciales inválidas', request.url)

    const valid = await bcrypt.compare(password, alumno.password)
    if (!valid) return sendError(reply, 401, 'Unauthorized', 'Credenciales inválidas', request.url)

    const expiresIn = parseInt(process.env.JWT_EXPIRES_IN ?? '86400', 10)
    const token = fastify.jwt.sign({ sub: alumno.id_alumno, rol: alumno.rol }, { expiresIn })

    return reply.send({ token, expiresIn, tipo: 'Bearer', id_alumno: alumno.id_alumno, rol: alumno.rol })
  })

  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { data: alumno } = await supabase
      .from('alumno')
      .select('id_alumno, numero_control, nombre, apellido, email, rol')
      .eq('id_alumno', request.user.sub)
      .single()

    if (!alumno) return sendError(reply, 404, 'Not Found', 'Usuario no encontrado', request.url)
    return reply.send(alumno)
  })
}

export default authRoutes
