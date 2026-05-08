import { FastifyPluginAsync } from 'fastify'
import supabase from '../lib/supabase.js'
import { sendError, handleSupabaseError } from '../lib/errors.js'
import { parsePagination, paginateResponse } from '../lib/utils.js'

const materiasRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = { preHandler: [fastify.authenticate] }

  fastify.get('/', auth, async (request, reply) => {
    const { page, size } = parsePagination(request)
    const { nombre } = request.query as { nombre?: string }

    let query = supabase
      .from('materia')
      .select('id_materia, clave_materia, nombre_materia', { count: 'exact' })
      .order('id_materia')
      .range(page * size, (page + 1) * size - 1)

    if (nombre) query = query.ilike('nombre_materia', `%${nombre}%`)

    const { data, count, error } = await query
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.send(paginateResponse(data ?? [], count ?? 0, page, size))
  })

  fastify.post('/', auth, async (request, reply) => {
    const body = request.body as { clave_materia: string; nombre_materia: string }
    const { data, error } = await supabase
      .from('materia')
      .insert(body)
      .select('id_materia, clave_materia, nombre_materia')
      .single()

    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.status(201).send(data)
  })

  fastify.get('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { data, error } = await supabase
      .from('materia')
      .select('id_materia, clave_materia, nombre_materia')
      .eq('id_materia', id)
      .single()

    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.send(data)
  })

  fastify.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as { clave_materia: string; nombre_materia: string }
    const { data, error } = await supabase
      .from('materia')
      .update(body)
      .eq('id_materia', id)
      .select('id_materia, clave_materia, nombre_materia')
      .single()

    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.send(data)
  })

  fastify.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { error } = await supabase.from('materia').delete().eq('id_materia', id)
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.status(204).send()
  })
}

export default materiasRoutes
