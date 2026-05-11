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

  // Registro público — no requiere JWT, siempre crea con rol 'alumno'
  fastify.post('/register', async (request, reply) => {
    const body = request.body as {
      numero_control: string; nombre: string; apellido: string
      email: string; password: string
    }
    if (!body.numero_control || !body.nombre || !body.apellido || !body.email || !body.password) {
      return sendError(reply, 400, 'Bad Request', 'Todos los campos son obligatorios', request.url)
    }
    if (body.password.length < 8) {
      return sendError(reply, 400, 'Bad Request', 'La contraseña debe tener al menos 8 caracteres', request.url)
    }
    const hashed = await bcrypt.hash(body.password, 10)
    const { data, error } = await supabase
      .from('alumno')
      .insert({ ...body, password: hashed, rol: 'alumno' })
      .select('id_alumno, numero_control, nombre, apellido, email, rol')
      .single()

    if (error) {
      if (error.code === '23505') {
        return sendError(reply, 409, 'Conflict', 'El número de control o correo ya están registrados', request.url)
      }
      return sendError(reply, 500, 'Internal Server Error', error.message, request.url)
    }
    return reply.status(201).send(data)
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
