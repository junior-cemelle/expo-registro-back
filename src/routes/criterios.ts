import { FastifyPluginAsync } from 'fastify'
import supabase from '../lib/supabase.js'
import { handleSupabaseError } from '../lib/errors.js'
import { parsePagination, paginateResponse } from '../lib/utils.js'

const CRITERIO_SELECT = 'id_criterio, nombre_criterio, descripcion, puntaje_maximo'

const criteriosRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = { preHandler: [fastify.authenticate] }

  fastify.get('/', auth, async (request, reply) => {
    const { page, size } = parsePagination(request)
    const { data, count, error } = await supabase
      .from('criterio')
      .select(CRITERIO_SELECT, { count: 'exact' })
      .order('id_criterio')
      .range(page * size, (page + 1) * size - 1)

    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.send(paginateResponse(data ?? [], count ?? 0, page, size))
  })

  fastify.post('/', auth, async (request, reply) => {
    const body = request.body as { nombre_criterio: string; descripcion?: string; puntaje_maximo: number }
    const { data, error } = await supabase.from('criterio').insert(body).select(CRITERIO_SELECT).single()
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.status(201).send(data)
  })

  fastify.get('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { data, error } = await supabase.from('criterio').select(CRITERIO_SELECT).eq('id_criterio', id).single()
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.send(data)
  })

  fastify.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as { nombre_criterio: string; descripcion?: string; puntaje_maximo: number }
    const { data, error } = await supabase.from('criterio').update(body).eq('id_criterio', id).select(CRITERIO_SELECT).single()
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.send(data)
  })

  fastify.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { error } = await supabase.from('criterio').delete().eq('id_criterio', id)
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.status(204).send()
  })
}

export default criteriosRoutes
