import { FastifyPluginAsync } from 'fastify'
import supabase from '../lib/supabase.js'
import { sendError, handleSupabaseError } from '../lib/errors.js'
import { parsePagination, paginateResponse } from '../lib/utils.js'

const GRUPO_SELECT = 'id_grupo, nombre_grupo, ciclo_escolar, id_materia, materia(nombre_materia)'

function flattenGrupo(g: Record<string, unknown> & { materia: { nombre_materia: string } | null }) {
  const { materia, ...rest } = g
  return { ...rest, nombre_materia: materia?.nombre_materia ?? null }
}

const gruposRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = { preHandler: [fastify.authenticate] }

  fastify.get('/', auth, async (request, reply) => {
    const { page, size } = parsePagination(request)
    const { id_materia, ciclo_escolar, nombre_grupo } = request.query as { id_materia?: string; ciclo_escolar?: string; nombre_grupo?: string }

    let query = supabase
      .from('grupo')
      .select(GRUPO_SELECT, { count: 'exact' })
      .order('id_grupo')
      .range(page * size, (page + 1) * size - 1)

    if (id_materia) query = query.eq('id_materia', id_materia)
    if (ciclo_escolar) query = query.eq('ciclo_escolar', ciclo_escolar)
    if (nombre_grupo) query = query.ilike('nombre_grupo', `%${nombre_grupo}%`)

    const { data, count, error } = await query
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.send(paginateResponse((data ?? []).map(flattenGrupo as never), count ?? 0, page, size))
  })

  fastify.post('/', auth, async (request, reply) => {
    const body = request.body as { nombre_grupo: string; ciclo_escolar: string; id_materia: number }
    const { data, error } = await supabase.from('grupo').insert(body).select(GRUPO_SELECT).single()
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.status(201).send(flattenGrupo(data as never))
  })

  fastify.get('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { data, error } = await supabase.from('grupo').select(GRUPO_SELECT).eq('id_grupo', id).single()
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.send(flattenGrupo(data as never))
  })

  fastify.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as { nombre_grupo: string; ciclo_escolar: string; id_materia: number }
    const { data, error } = await supabase.from('grupo').update(body).eq('id_grupo', id).select(GRUPO_SELECT).single()
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.send(flattenGrupo(data as never))
  })

  fastify.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { error } = await supabase.from('grupo').delete().eq('id_grupo', id)
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.status(204).send()
  })

  fastify.get('/:id/alumnos', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { data: grupo } = await supabase.from('grupo').select('id_grupo').eq('id_grupo', id).single()
    if (!grupo) return sendError(reply, 404, 'Not Found', `Grupo con id ${id} no encontrado`, request.url)

    const { data, error } = await supabase
      .from('grupo_alumno')
      .select('alumno(id_alumno, numero_control, nombre, apellido, email, rol)')
      .eq('id_grupo', id)

    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.send((data ?? []).map((r: Record<string, unknown>) => r.alumno))
  })

  fastify.post('/:id/alumnos', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { id_alumno } = request.body as { id_alumno: number }
    const { error } = await supabase.from('grupo_alumno').insert({ id_grupo: parseInt(id), id_alumno })
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.status(201).send()
  })
}

export default gruposRoutes
