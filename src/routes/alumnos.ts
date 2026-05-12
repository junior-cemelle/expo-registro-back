import { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import supabase from '../lib/supabase.js'
import { sendError, handleSupabaseError } from '../lib/errors.js'
import { parsePagination, paginateResponse } from '../lib/utils.js'

const ALUMNO_SELECT = 'id_alumno, numero_control, nombre, apellido, email, rol'

const alumnosRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = { preHandler: [fastify.authenticate] }

  fastify.get('/', auth, async (request, reply) => {
    const { page, size } = parsePagination(request)
    const { nombre, rol } = request.query as { nombre?: string; rol?: string }

    let query = supabase
      .from('alumno')
      .select(ALUMNO_SELECT, { count: 'exact' })
      .order('id_alumno')
      .range(page * size, (page + 1) * size - 1)

    if (nombre) query = query.or(`nombre.ilike.%${nombre}%,apellido.ilike.%${nombre}%`)
    if (rol) query = query.eq('rol', rol)

    const { data, count, error } = await query
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.send(paginateResponse(data ?? [], count ?? 0, page, size))
  })

  fastify.post('/', auth, async (request, reply) => {
    const body = request.body as {
      numero_control: string; nombre: string; apellido: string
      email: string; password: string; rol?: string
    }
    const hashed = await bcrypt.hash(body.password, 10)
    const { data, error } = await supabase
      .from('alumno')
      .insert({ ...body, password: hashed })
      .select(ALUMNO_SELECT)
      .single()

    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.status(201).send(data)
  })

  fastify.get('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { data, error } = await supabase.from('alumno').select(ALUMNO_SELECT).eq('id_alumno', id).single()
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.send(data)
  })

  fastify.put('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as {
      numero_control?: string; nombre?: string; apellido?: string
      email?: string; password?: string; rol?: string
    }
    const updates: Record<string, unknown> = { ...body }
    if (body.password) updates.password = await bcrypt.hash(body.password, 10)

    const { data, error } = await supabase
      .from('alumno')
      .update(updates)
      .eq('id_alumno', id)
      .select(ALUMNO_SELECT)
      .single()

    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.send(data)
  })

  fastify.delete('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { error } = await supabase.from('alumno').delete().eq('id_alumno', id)
    if (error) return handleSupabaseError(error, reply, request.url)
    return reply.status(204).send()
  })

  // Grupos a los que pertenece un alumno (incluye materia)
  fastify.get('/:id/grupos', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { data, error } = await supabase
      .from('grupo_alumno')
      .select('grupo(id_grupo, nombre_grupo, ciclo_escolar, id_materia, materia(nombre_materia, clave_materia))')
      .eq('id_alumno', id)
    if (error) return handleSupabaseError(error, reply, request.url)
    const grupos = (data ?? []).map((r: Record<string, unknown>) => {
      const g = r.grupo as Record<string, unknown>
      const m = g.materia as Record<string, unknown>
      return { ...g, nombre_materia: m?.nombre_materia, clave_materia: m?.clave_materia, materia: undefined }
    })
    return reply.send(grupos)
  })

  // Equipos a los que pertenece un alumno (incluye grupo, materia y miembros)
  fastify.get('/:id/equipos', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { data, error } = await supabase
      .from('equipo_alumno')
      .select(`equipo(
        id_equipo, nombre_equipo, id_grupo,
        grupo(nombre_grupo, ciclo_escolar, id_materia, materia(nombre_materia, clave_materia)),
        equipo_alumno(alumno(id_alumno, nombre, apellido, numero_control, email))
      )`)
      .eq('id_alumno', id)
    if (error) return handleSupabaseError(error, reply, request.url)
    const equipos = (data ?? []).map((r: Record<string, unknown>) => {
      const e = r.equipo as Record<string, unknown>
      const g = e.grupo as Record<string, unknown>
      const m = g?.materia as Record<string, unknown>
      const miembros = (e.equipo_alumno as Record<string, unknown>[])?.map(ea => ea.alumno) ?? []
      return {
        id_equipo:      e.id_equipo,
        nombre_equipo:  e.nombre_equipo,
        id_grupo:       e.id_grupo,
        nombre_grupo:   g?.nombre_grupo,
        ciclo_escolar:  g?.ciclo_escolar,
        id_materia:     g?.id_materia,
        nombre_materia: m?.nombre_materia,
        clave_materia:  m?.clave_materia,
        alumnos:        miembros,
      }
    })
    return reply.send(equipos)
  })
}

export default alumnosRoutes
