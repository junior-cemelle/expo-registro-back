import { FastifyPluginAsync } from 'fastify'
import supabase from '../lib/supabase.js'
import { sendError, handleSupabaseError } from '../lib/errors.js'
import { parsePagination, paginateResponse } from '../lib/utils.js'

const EQUIPO_SELECT = `
  id_equipo, nombre_equipo, id_grupo,
  grupo(nombre_grupo),
  equipo_alumno(alumno(id_alumno, numero_control, nombre, apellido, email, rol))
`

function flattenEquipo(e: Record<string, unknown> & {
  grupo: { nombre_grupo: string } | null
  equipo_alumno: Array<{ alumno: unknown }>
}) {
  const { grupo, equipo_alumno, ...rest } = e
  return {
    ...rest,
    nombre_grupo: grupo?.nombre_grupo ?? null,
    alumnos: (equipo_alumno ?? []).map((r) => r.alumno),
  }
}

const equiposRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = { preHandler: [fastify.authenticate] }

  fastify.get('/', auth, async (request, reply) => {
    const { page, size } = parsePagination(request)
    const { id_grupo } = request.query as { id_grupo?: string }

    let query = supabase
      .from('equipo')
      .select(EQUIPO_SELECT, { count: 'exact' })
      .order('id_equipo')
      .range(page * size, (page + 1) * size - 1)

    if (id_grupo) query = query.eq('id_grupo', id_grupo)

    const { data, count, error } = await query
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.send(paginateResponse((data ?? []).map(flattenEquipo as never), count ?? 0, page, size))
  })

  fastify.post('/', auth, async (request, reply) => {
    const body = request.body as { nombre_equipo: string; id_grupo: number }
    const { data, error } = await supabase.from('equipo').insert(body).select(EQUIPO_SELECT).single()
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.status(201).send(flattenEquipo(data as never))
  })

  fastify.get('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { data, error } = await supabase.from('equipo').select(EQUIPO_SELECT).eq('id_equipo', id).single()
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.send(flattenEquipo(data as never))
  })

  fastify.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as { nombre_equipo: string; id_grupo: number }
    const { data, error } = await supabase.from('equipo').update(body).eq('id_equipo', id).select(EQUIPO_SELECT).single()
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.send(flattenEquipo(data as never))
  })

  fastify.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { error } = await supabase.from('equipo').delete().eq('id_equipo', id)
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.status(204).send()
  })

  fastify.post('/:id/alumnos', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { id_alumno } = request.body as { id_alumno: number }

    // Verificar que el equipo existe
    const { data: equipo } = await supabase.from('equipo').select('id_equipo').eq('id_equipo', id).single()
    if (!equipo) return sendError(reply, 404, 'Not Found', `Equipo con id ${id} no encontrado`, request.url)

    const { error } = await supabase.from('equipo_alumno').insert({ id_equipo: parseInt(id), id_alumno })
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.status(201).send()
  })
}

export default equiposRoutes
