import { FastifyPluginAsync } from 'fastify'
import supabase from '../lib/supabase.js'
import { sendError, handleSupabaseError } from '../lib/errors.js'
import { parsePagination, paginateResponse } from '../lib/utils.js'

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

const evaluacionesRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = { preHandler: [fastify.authenticate] }

  fastify.get('/', auth, async (request, reply) => {
    const { page, size } = parsePagination(request)
    const { id_alumno_evaluador } = request.query as { id_alumno_evaluador?: string }

    let query = supabase
      .from('evaluacion')
      .select(EVAL_SELECT, { count: 'exact' })
      .order('id_evaluacion')
      .range(page * size, (page + 1) * size - 1)

    if (id_alumno_evaluador) query = query.eq('id_alumno_evaluador', id_alumno_evaluador)

    const { data, count, error } = await query
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.send(paginateResponse((data ?? []).map(buildEvaluacion as never), count ?? 0, page, size))
  })

  fastify.post('/', auth, async (request, reply) => {
    const body = request.body as {
      id_exposicion: number
      id_alumno_evaluador: number
      detalles: Array<{ id_criterio: number; calificacion: number }>
    }

    // RN-05: verificar que el evaluador no pertenezca al equipo que expone
    const { data: expo } = await supabase
      .from('exposicion')
      .select('id_equipo')
      .eq('id_exposicion', body.id_exposicion)
      .single()

    if (!expo) return sendError(reply, 404, 'Not Found', `Exposición ${body.id_exposicion} no encontrada`, request.url)

    const { data: enEquipo } = await supabase
      .from('equipo_alumno')
      .select('id_alumno')
      .eq('id_equipo', expo.id_equipo)
      .eq('id_alumno', body.id_alumno_evaluador)
      .maybeSingle()

    if (enEquipo) {
      return sendError(reply, 409, 'Conflict',
        'El evaluador pertenece al equipo que expone — no puede evaluarse a sí mismo (RN-05)', request.url)
    }

    // Crear evaluacion
    const { data: ev, error: evErr } = await supabase
      .from('evaluacion')
      .insert({ id_exposicion: body.id_exposicion, id_alumno_evaluador: body.id_alumno_evaluador })
      .select('id_evaluacion')
      .single()

    if (evErr) return handleSupabaseError(evErr, reply, request.url)

    // Insertar detalles
    const { error: detErr } = await supabase.from('detalle_evaluacion').insert(
      body.detalles.map((d) => ({ id_evaluacion: ev.id_evaluacion, id_criterio: d.id_criterio, calificacion: d.calificacion }))
    )
    if (detErr) return handleSupabaseError(detErr, reply, request.url)

    // Retornar evaluacion completa
    const { data: full, error: fullErr } = await supabase
      .from('evaluacion')
      .select(EVAL_SELECT)
      .eq('id_evaluacion', ev.id_evaluacion)
      .single()

    if (fullErr) return handleSupabaseError(fullErr, reply, request.url)
    return reply.status(201).send(buildEvaluacion(full as never))
  })

  fastify.get('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { data, error } = await supabase.from('evaluacion').select(EVAL_SELECT).eq('id_evaluacion', id).single()
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.send(buildEvaluacion(data as never))
  })

  fastify.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { error } = await supabase.from('evaluacion').delete().eq('id_evaluacion', id)
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.status(204).send()
  })
}

export default evaluacionesRoutes
