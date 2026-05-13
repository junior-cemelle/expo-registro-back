import { FastifyPluginAsync } from 'fastify'
import supabase from '../lib/supabase.js'
import { sendError, handleSupabaseError } from '../lib/errors.js'
import { parsePagination, paginateResponse } from '../lib/utils.js'

const EXPOSICION_SELECT = 'id_exposicion, tema, fecha, id_equipo, equipo(nombre_equipo)'

function flattenExposicion(e: Record<string, unknown> & { equipo: { nombre_equipo: string } | null }) {
  const { equipo, ...rest } = e
  return { ...rest, nombre_equipo: equipo?.nombre_equipo ?? null }
}

const EVAL_SELECT = `
  id_evaluacion, id_exposicion, id_alumno_evaluador, fecha_evaluacion,
  detalle_evaluacion(id_criterio, calificacion, criterio(nombre_criterio))
`

function buildEvaluacion(ev: Record<string, unknown> & {
  detalle_evaluacion: Array<{ id_criterio: number; calificacion: number; criterio: { nombre_criterio: string } | null }>
}) {
  const { detalle_evaluacion, ...rest } = ev
  const detalles = (detalle_evaluacion ?? []).map((d) => ({
    id_criterio: d.id_criterio,
    nombre_criterio: d.criterio?.nombre_criterio ?? null,
    calificacion: Number(d.calificacion),
  }))
  const promedio = detalles.length
    ? Math.round((detalles.reduce((s, d) => s + d.calificacion, 0) / detalles.length) * 100) / 100
    : 0
  return { ...rest, detalles, promedio }
}

const exposicionesRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = { preHandler: [fastify.authenticate] }

  fastify.get('/', auth, async (request, reply) => {
    const { page, size } = parsePagination(request)
    const { id_equipo, tema } = request.query as { id_equipo?: string; tema?: string }

    let query = supabase
      .from('exposicion')
      .select(EXPOSICION_SELECT, { count: 'exact' })
      .order('id_exposicion')
      .range(page * size, (page + 1) * size - 1)

    if (id_equipo) query = query.eq('id_equipo', id_equipo)
    if (tema) query = query.ilike('tema', `%${tema}%`)

    const { data, count, error } = await query
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.send(paginateResponse((data ?? []).map(flattenExposicion as never), count ?? 0, page, size))
  })

  fastify.post('/', auth, async (request, reply) => {
    const body = request.body as { tema: string; fecha: string; id_equipo: number }
    const { data, error } = await supabase.from('exposicion').insert(body).select(EXPOSICION_SELECT).single()
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.status(201).send(flattenExposicion(data as never))
  })

  fastify.get('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { data, error } = await supabase.from('exposicion').select(EXPOSICION_SELECT).eq('id_exposicion', id).single()
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.send(flattenExposicion(data as never))
  })

  fastify.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as { tema: string; fecha: string; id_equipo: number }
    const { data, error } = await supabase.from('exposicion').update(body).eq('id_exposicion', id).select(EXPOSICION_SELECT).single()
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.send(flattenExposicion(data as never))
  })

  fastify.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { error } = await supabase.from('exposicion').delete().eq('id_exposicion', id)
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.status(204).send()
  })

  fastify.get('/:id/evaluaciones', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { data: expo } = await supabase.from('exposicion').select('id_exposicion').eq('id_exposicion', id).single()
    if (!expo) return sendError(reply, 404, 'Not Found', `Exposición con id ${id} no encontrada`, request.url)

    const { data, error } = await supabase.from('evaluacion').select(EVAL_SELECT).eq('id_exposicion', id)
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.send((data ?? []).map(buildEvaluacion as never))
  })
}

export default exposicionesRoutes
