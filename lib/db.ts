/**
 * Funciones de base de datos usando Prisma
 * Reemplazan las funciones de storage.ts que usaban localStorage
 */

import { prisma } from './prisma';
import { 
  EstudianteInfo, 
  Incidencia, 
  Tutor, 
  Nota, 
  Clase, 
  RegistroAsistenciaClase,
  TipoDerivacion,
  TipoIncidencia,
  Gravedad,
  EstadoIncidencia,
  EstadoIncidenciaHistorial,
  DiaSemana,
  EstadoAsistencia,
  TutorGradoSeccion
} from './types';

// ============================================
// ESTUDIANTES
// ============================================

export async function getEstudiantesInfo(): Promise<EstudianteInfo[]> {
  try {
    const estudiantes = await prisma.estudiante.findMany({
      orderBy: [
        { apellidos: 'asc' },
        { nombres: 'asc' }
      ]
    });

    return estudiantes.map(est => {
      // Construir nombre completo desde nombres y apellidos si no existe
      const nombreCompleto = est.nombre || `${est.nombres} ${est.apellidos}`.trim();
      
      return {
        nombre: nombreCompleto,
        grado: est.grado,
        seccion: est.seccion,
        edad: est.edad ?? undefined,
        fechaNacimiento: est.fechaNacimiento ?? undefined,
        fotoPerfil: est.fotoPerfil ?? undefined,
        contacto: {
          telefono: est.contactoTelefono ?? undefined,
          email: est.contactoEmail ?? undefined,
          nombre: est.contactoNombre ?? undefined,
          tutor: est.tutorNombre ?? undefined,
        },
        tutor: {
          nombre: est.tutorNombre ?? undefined,
          telefono: est.tutorTelefono ?? undefined,
          email: est.tutorEmail ?? undefined,
        },
        apoderado: {
          nombre: est.apoderadoNombre ?? undefined,
          parentesco: est.apoderadoParentesco ?? undefined,
          telefono: est.apoderadoTelefono ?? undefined,
          telefonoAlternativo: est.apoderadoTelefonoAlt ?? undefined,
          email: est.apoderadoEmail ?? undefined,
          direccion: est.apoderadoDireccion ?? undefined,
        },
        nombres: est.nombres,
        apellidos: est.apellidos,
        asistencias: est.asistencias ?? undefined,
        ausencias: est.ausencias ?? undefined,
        tardanzas: est.tardanzas ?? undefined,
      };
    });
  } catch (error) {
    console.error('Error obteniendo estudiantes:', error);
    return [];
  }
}

export async function getEstudianteInfo(nombre: string): Promise<EstudianteInfo | null> {
  try {
    // Intentar buscar por nombre completo primero (para compatibilidad)
    let estudiante = await prisma.estudiante.findFirst({
      where: { nombre }
    });

    // Si no se encuentra, intentar buscar por nombres y apellidos separados
    if (!estudiante && nombre.includes(' ')) {
      const partes = nombre.trim().split(/\s+/);
      if (partes.length >= 2) {
        const apellidos = partes[partes.length - 1];
        const nombres = partes.slice(0, -1).join(' ');
        estudiante = await prisma.estudiante.findFirst({
          where: {
            nombres: nombres,
            apellidos: apellidos
          }
        });
      }
    }

    if (!estudiante) return null;

    // Construir nombre completo desde nombres y apellidos si no existe
    const nombreCompleto = estudiante.nombre || `${estudiante.nombres} ${estudiante.apellidos}`.trim();

    return {
      nombre: nombreCompleto,
      grado: estudiante.grado,
      seccion: estudiante.seccion,
      edad: estudiante.edad ?? undefined,
      fechaNacimiento: estudiante.fechaNacimiento ?? undefined,
      fotoPerfil: estudiante.fotoPerfil ?? undefined,
      contacto: {
        telefono: estudiante.contactoTelefono ?? undefined,
        email: estudiante.contactoEmail ?? undefined,
        nombre: estudiante.contactoNombre ?? undefined,
        tutor: estudiante.tutorNombre ?? undefined,
      },
      tutor: {
        nombre: estudiante.tutorNombre ?? undefined,
        telefono: estudiante.tutorTelefono ?? undefined,
        email: estudiante.tutorEmail ?? undefined,
      },
      apoderado: {
        nombre: estudiante.apoderadoNombre ?? undefined,
        parentesco: estudiante.apoderadoParentesco ?? undefined,
        telefono: estudiante.apoderadoTelefono ?? undefined,
        telefonoAlternativo: estudiante.apoderadoTelefonoAlt ?? undefined,
        email: estudiante.apoderadoEmail ?? undefined,
        direccion: estudiante.apoderadoDireccion ?? undefined,
      },
      nombres: estudiante.nombres,
      apellidos: estudiante.apellidos,
      asistencias: estudiante.asistencias ?? undefined,
      ausencias: estudiante.ausencias ?? undefined,
      tardanzas: estudiante.tardanzas ?? undefined,
    };
  } catch (error) {
    console.error('Error obteniendo estudiante:', error);
    return null;
  }
}

export async function saveEstudianteInfo(estudiante: EstudianteInfo, nombreOriginal?: string): Promise<void> {
  try {
    // Asegurar que nombres y apellidos estén presentes (campos principales)
    if (!estudiante.nombres || !estudiante.apellidos) {
      throw new Error('Los campos nombres y apellidos son requeridos');
    }

    // Buscar por nombres y apellidos (campos principales)
    let existente = await prisma.estudiante.findFirst({
      where: {
        nombres: estudiante.nombres,
        apellidos: estudiante.apellidos
      }
    });

    // Si no se encuentra y hay nombreOriginal, intentar buscar por nombre (compatibilidad)
    if (!existente && nombreOriginal) {
      existente = await prisma.estudiante.findFirst({
        where: { nombre: nombreOriginal }
      });
    }

    // Construir nombre completo desde nombres y apellidos
    const nombreCompleto = `${estudiante.nombres.trim()} ${estudiante.apellidos.trim()}`.trim();

    const data = {
      nombre: nombreCompleto, // Campo calculado para compatibilidad
      nombres: estudiante.nombres.trim(), // Campo principal
      apellidos: estudiante.apellidos.trim(), // Campo principal
      grado: estudiante.grado,
      seccion: estudiante.seccion,
      edad: estudiante.edad ?? null,
      fechaNacimiento: estudiante.fechaNacimiento ?? null,
      fotoPerfil: estudiante.fotoPerfil ?? null,
      contactoTelefono: estudiante.contacto?.telefono ?? null,
      contactoEmail: estudiante.contacto?.email ?? null,
      contactoNombre: estudiante.contacto?.nombre ?? null,
      tutorNombre: estudiante.tutor?.nombre ?? estudiante.contacto?.tutor ?? null,
      tutorTelefono: estudiante.tutor?.telefono ?? null,
      tutorEmail: estudiante.tutor?.email ?? null,
      apoderadoNombre: estudiante.apoderado?.nombre ?? null,
      apoderadoParentesco: estudiante.apoderado?.parentesco ?? null,
      apoderadoTelefono: estudiante.apoderado?.telefono ?? null,
      apoderadoTelefonoAlt: estudiante.apoderado?.telefonoAlternativo ?? null,
      apoderadoEmail: estudiante.apoderado?.email ?? null,
      apoderadoDireccion: estudiante.apoderado?.direccion ?? null,
      asistencias: estudiante.asistencias ?? null,
      ausencias: estudiante.ausencias ?? null,
      tardanzas: estudiante.tardanzas ?? null,
    };

    if (existente) {
      const nombreCambio = nombreOriginal && estudiante.nombre !== nombreOriginal;
      
      // Actualizar el estudiante
      await prisma.estudiante.update({
        where: { id: existente.id },
        data,
      });

      // Si el nombre cambió, actualizar todas las incidencias, notas y registros relacionados
      if (nombreCambio && nombreOriginal) {
        console.log(`🔄 Actualizando registros relacionados: ${nombreOriginal} → ${estudiante.nombre}`);
        
        // Actualizar incidencias que tienen el nombre anterior
        await prisma.incidencia.updateMany({
          where: {
            OR: [
              { studentName: nombreOriginal },
              { estudianteId: existente.id }
            ]
          },
          data: {
            studentName: estudiante.nombre,
            estudianteId: existente.id, // Asegurar que la relación se mantenga
          },
        });

        // Actualizar notas que tienen el nombre anterior
        await prisma.nota.updateMany({
          where: {
            OR: [
              { studentName: nombreOriginal },
              { estudianteId: existente.id }
            ]
          },
          data: {
            studentName: estudiante.nombre,
            estudianteId: existente.id, // Asegurar que la relación se mantenga
          },
        });

        // Actualizar registros de asistencia que tienen el nombre anterior
        await prisma.registroAsistenciaEntry.updateMany({
          where: {
            OR: [
              { studentName: nombreOriginal },
              { estudianteId: existente.id }
            ]
          },
          data: {
            studentName: estudiante.nombre,
            estudianteId: existente.id, // Asegurar que la relación se mantenga
          },
        });

        console.log(`✅ Registros relacionados actualizados para ${estudiante.nombre}`);
      }
    } else {
      await prisma.estudiante.create({
        data,
      });
    }
  } catch (error) {
    console.error('Error guardando estudiante:', error);
    throw error;
  }
}

export async function saveEstudiantesInfo(estudiantes: EstudianteInfo[], nombresOriginales?: Map<string, string>): Promise<void> {
  try {
    // Para cada estudiante, crear o actualizar
    for (const est of estudiantes) {
      // Si hay un mapa de nombres originales, usarlo para buscar el registro existente
      const nombreOriginal = nombresOriginales?.get(est.nombre);
      await saveEstudianteInfo(est, nombreOriginal);
    }
  } catch (error) {
    console.error('Error guardando estudiantes:', error);
    throw error;
  }
}

export async function deleteEstudiante(nombre: string): Promise<void> {
  try {
    const estudiante = await prisma.estudiante.findFirst({
      where: { nombre }
    });
    
    if (estudiante) {
      await prisma.estudiante.delete({
        where: { id: estudiante.id }
      });
      console.log(`✅ Estudiante ${nombre} eliminado de la base de datos`);
    }
  } catch (error) {
    console.error('Error eliminando estudiante:', error);
    throw error;
  }
}

export async function getEstudiantesByGrado(grado?: string): Promise<EstudianteInfo[]> {
  const estudiantes = await getEstudiantesInfo();
  if (!grado) return estudiantes;
  return estudiantes.filter(e => e.grado === grado);
}

// ============================================
// INCIDENCIAS
// ============================================

export async function getIncidencias(): Promise<Incidencia[]> {
  try {
    const incidencias = await prisma.incidencia.findMany({
      orderBy: { timestamp: 'desc' }
    });

    console.log(`📊 getIncidencias: Encontradas ${incidencias.length} incidencias en la base de datos`);

    return incidencias.map(inc => {
      let historial: EstadoIncidenciaHistorial[] = [];
      
      // Intentar parsear el historialEstado si existe
      if (inc.historialEstado) {
        try {
          historial = JSON.parse(inc.historialEstado);
          // Asegurar que sea un array
          if (!Array.isArray(historial)) {
            historial = [];
          }
        } catch (error) {
          console.error(`Error parseando historialEstado para incidencia ${inc.id}:`, error);
          historial = [];
        }
      }
      
      // Si el historial está vacío o es null, inicializarlo con el estado actual
      if (historial.length === 0) {
        historial = [{
          estado: inc.estado as EstadoIncidencia,
          fecha: inc.createdAt ? new Date(inc.createdAt).toISOString() : new Date().toISOString(),
          usuario: inc.profesor || 'Sistema',
        }];
      }

      return {
        id: inc.id,
        studentName: inc.studentName,
        tipo: inc.tipo as TipoIncidencia,
        subtipo: inc.subtipo as any,
        gravedad: inc.gravedad as Gravedad,
        descripcion: inc.descripcion,
        fecha: inc.fecha,
        profesor: inc.profesor,
        tutor: inc.tutorNombre ?? undefined,
        lugar: inc.lugar ?? undefined,
        timestamp: Number(inc.timestamp),
        derivacion: inc.derivacion && inc.derivacion !== 'ninguna' && inc.derivacion.trim() !== '' 
          ? (inc.derivacion as TipoDerivacion) 
          : undefined,
        resuelta: inc.resuelta,
        fechaResolucion: inc.fechaResolucion ?? undefined,
        resueltaPor: inc.resueltaPor ?? undefined,
        estado: inc.estado as EstadoIncidencia,
        historialEstado: historial, // Siempre retornar un array, nunca undefined ni null
      };
    });
  } catch (error) {
    console.error('Error obteniendo incidencias:', error);
    return [];
  }
}

export async function saveIncidencias(incidencias: Incidencia[]): Promise<void> {
  try {
    // Eliminar todas las incidencias existentes y crear las nuevas
    await prisma.incidencia.deleteMany({});
    
    // Pre-cargar todos los estudiantes y tutores para mejorar rendimiento
    const todosEstudiantes = await prisma.estudiante.findMany();
    const todosTutores = await prisma.tutor.findMany();
    const mapEstudianteId = new Map<string, string>();
    const mapTutorId = new Map<string, string>();
    
    todosEstudiantes.forEach(est => mapEstudianteId.set(est.nombre, est.id));
    todosTutores.forEach(tutor => mapTutorId.set(tutor.nombre, tutor.id));
    
    // Pre-cargar asignaciones de tutores por grado/sección
    const todasAsignaciones = await prisma.tutorGradoSeccion.findMany({
      include: { tutor: true }
    });
    const mapTutorSeccion = new Map<string, string>(); // key: "grado-seccion", value: tutorNombre
    
    todasAsignaciones.forEach(a => {
      const key = `${a.grado}-${a.seccion}`;
      mapTutorSeccion.set(key, a.tutor.nombre);
    });

    // Pre-cargar estudiantes con sus grados y secciones
    const mapEstudianteGradoSeccion = new Map<string, {grado: string, seccion: string}>();
    todosEstudiantes.forEach(est => {
      if (est.grado && est.seccion) {
        mapEstudianteGradoSeccion.set(est.nombre, { grado: est.grado, seccion: est.seccion });
      }
    });

    for (const inc of incidencias) {
      const estudianteId = mapEstudianteId.get(inc.studentName) ?? null;
      const profesorId = mapTutorId.get(inc.profesor) ?? null; // Profesor que registra
      
      // Buscar tutor de la sección del estudiante
      let tutorNombre: string | null = null;
      const estudianteInfo = mapEstudianteGradoSeccion.get(inc.studentName);
      if (estudianteInfo) {
        const key = `${estudianteInfo.grado}-${estudianteInfo.seccion}`;
        tutorNombre = mapTutorSeccion.get(key) ?? null;
      }

      await prisma.incidencia.create({
        data: {
          id: inc.id,
          studentName: inc.studentName,
          estudianteId: estudianteId, // Asignar el ID del estudiante
          tipo: inc.tipo,
          subtipo: inc.subtipo ?? null,
          gravedad: inc.gravedad,
          descripcion: inc.descripcion,
          fecha: inc.fecha,
          profesor: inc.profesor,
          profesorId: profesorId, // Asignar el ID del profesor que registra
          tutorNombre: tutorNombre, // Asignar el nombre del tutor de la sección
          lugar: inc.lugar ?? null,
          timestamp: BigInt(inc.timestamp),
          derivacion: inc.derivacion ?? null,
          resuelta: inc.resuelta ?? false,
          fechaResolucion: inc.fechaResolucion ?? null,
          resueltaPor: inc.resueltaPor ?? null,
          estado: inc.estado ?? 'Pendiente',
          historialEstado: inc.historialEstado ? JSON.stringify(inc.historialEstado) : null,
        },
      });
    }
  } catch (error) {
    console.error('Error guardando incidencias:', error);
    throw error;
  }
}

export async function addIncidencia(incidencia: Omit<Incidencia, 'id' | 'timestamp'>): Promise<Incidencia> {
  try {
    const newIncidencia: Incidencia = {
      ...incidencia,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    };

    const derivacionValue = newIncidencia.derivacion && 
                            newIncidencia.derivacion !== 'ninguna' && 
                            newIncidencia.derivacion.trim() !== '' 
      ? newIncidencia.derivacion 
      : null;

    // Determinar el estado inicial según el tipo de incidencia
    // Las incidencias positivas tienen estado 'normal', las demás 'Pendiente'
    let estadoInicial: EstadoIncidencia;
    if (newIncidencia.estado) {
      estadoInicial = newIncidencia.estado;
    } else if (newIncidencia.tipo === 'positivo') {
      estadoInicial = 'normal';
    } else {
      estadoInicial = 'Pendiente';
    }
    
    // Inicializar historialEstado con el estado inicial si no existe
    let historialEstado: EstadoIncidenciaHistorial[] = [];
    if (newIncidencia.historialEstado && Array.isArray(newIncidencia.historialEstado)) {
      historialEstado = newIncidencia.historialEstado;
    } else {
      // Si no hay historial, crear uno inicial con el estado correspondiente
      historialEstado = [{
        estado: estadoInicial,
        fecha: new Date().toISOString(),
        usuario: newIncidencia.profesor || 'Sistema',
      }];
    }

    // Buscar estudianteId por nombre (intentar por nombre completo o por nombres y apellidos)
    let estudiante = await prisma.estudiante.findFirst({
      where: { nombre: newIncidencia.studentName }
    });
    
    // Si no se encuentra, intentar buscar por nombres y apellidos separados
    if (!estudiante && newIncidencia.studentName.includes(' ')) {
      const partes = newIncidencia.studentName.trim().split(/\s+/);
      if (partes.length >= 2) {
        const apellidos = partes[partes.length - 1];
        const nombres = partes.slice(0, -1).join(' ');
        estudiante = await prisma.estudiante.findFirst({
          where: {
            nombres: nombres,
            apellidos: apellidos
          }
        });
      }
    }
    
    const estudianteId = estudiante?.id ?? null;

    // Buscar profesorId por nombre (el campo profesor contiene el nombre del profesor que registra)
    const profesorQueRegistra = await prisma.tutor.findFirst({
      where: { nombre: newIncidencia.profesor }
    });
    const profesorId = profesorQueRegistra?.id ?? null;

    // Buscar el tutor de la sección del estudiante (diferente del profesor que registra)
    let tutorNombre: string | null = null;
    if (estudiante?.grado && estudiante?.seccion) {
      const tutorSeccion = await getTutorGradoSeccion(estudiante.grado, estudiante.seccion);
      tutorNombre = tutorSeccion?.tutorNombre ?? null;
    }

    console.log('📝 Guardando nueva incidencia:', {
      id: newIncidencia.id,
      estudiante: newIncidencia.studentName,
      estudianteId,
      profesor: newIncidencia.profesor,
      profesorId,
      tutorNombre,
      derivacionOriginal: newIncidencia.derivacion,
      derivacionGuardada: derivacionValue,
      estado: estadoInicial,
      timestamp: newIncidencia.timestamp
    });

    await prisma.incidencia.create({
      data: {
        id: newIncidencia.id,
        studentName: newIncidencia.studentName,
        estudianteId: estudianteId, // Asignar el ID del estudiante
        tipo: newIncidencia.tipo,
        subtipo: newIncidencia.subtipo ?? null,
        gravedad: newIncidencia.gravedad,
        descripcion: newIncidencia.descripcion,
        fecha: newIncidencia.fecha,
        profesor: newIncidencia.profesor,
        profesorId: profesorId, // Asignar el ID del profesor/tutor
        tutorNombre: tutorNombre, // Asignar el nombre del tutor
        lugar: newIncidencia.lugar ?? null,
        timestamp: BigInt(newIncidencia.timestamp),
        derivacion: derivacionValue,
        resuelta: false, // Siempre false al crear
        fechaResolucion: null, // Siempre null al crear
        resueltaPor: null, // Siempre null al crear
        estado: estadoInicial, // 'normal' para positivas, 'Pendiente' para las demás
        historialEstado: JSON.stringify(historialEstado), // Siempre inicializar historial
      },
    });

    console.log('✅ Incidencia guardada exitosamente:', {
      id: newIncidencia.id,
      derivacion: derivacionValue,
      estado: estadoInicial,
      historialEstado: historialEstado
    });

    // Retornar la incidencia con el historialEstado y estado actualizados
    return {
      ...newIncidencia,
      estado: estadoInicial,
      historialEstado: historialEstado,
    };
  } catch (error) {
    console.error('Error agregando incidencia:', error);
    throw error;
  }
}

export async function getIncidenciasByStudent(studentName: string): Promise<Incidencia[]> {
  const incidencias = await getIncidencias();
  return incidencias
    .filter(inc => inc.studentName.toLowerCase().includes(studentName.toLowerCase()))
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

export async function getIncidenciasByDateRange(fechaInicio: string, fechaFin: string): Promise<Incidencia[]> {
  const incidencias = await getIncidencias();
  const inicio = new Date(fechaInicio + 'T00:00:00').getTime();
  const fin = new Date(fechaFin + 'T23:59:59').getTime();
  
  return incidencias
    .filter(inc => {
      const fechaInc = new Date(inc.fecha + 'T00:00:00').getTime();
      return fechaInc >= inicio && fechaInc <= fin;
    })
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

export async function cambiarEstadoIncidencia(
  id: string, 
  nuevoEstado: EstadoIncidencia, 
  usuario: string
): Promise<void> {
  try {
    const incidencia = await prisma.incidencia.findUnique({
      where: { id },
    });

    if (!incidencia) {
      throw new Error(`Incidencia con id ${id} no encontrada`);
    }

    let historial: EstadoIncidenciaHistorial[] = incidencia.historialEstado
      ? JSON.parse(incidencia.historialEstado)
      : [];

    historial.push({
      estado: nuevoEstado,
      fecha: new Date().toISOString(),
      usuario,
    });

    await prisma.incidencia.update({
      where: { id },
      data: {
        estado: nuevoEstado,
        historialEstado: JSON.stringify(historial),
      },
    });
  } catch (error) {
    console.error('Error cambiando estado de incidencia:', error);
    throw error;
  }
}

// ============================================
// TUTORES
// ============================================

export async function getTutores(): Promise<Tutor[]> {
  try {
    const tutores = await prisma.tutor.findMany({
      orderBy: { nombre: 'asc' }
    });

    return tutores.map(t => ({
      id: t.id,
      nombre: t.nombre,
      email: t.email ?? undefined,
      telefono: t.telefono ?? undefined,
    }));
  } catch (error) {
    console.error('Error obteniendo tutores:', error);
    return [];
  }
}

export async function deleteTutor(id: string): Promise<void> {
  try {
    await prisma.tutor.delete({
      where: { id }
    });
    console.log(`✅ Profesor ${id} eliminado de la base de datos`);
  } catch (error) {
    console.error('Error eliminando profesor:', error);
    throw error;
  }
}

export async function updateTutor(tutor: Tutor): Promise<void> {
  try {
    const existente = await prisma.tutor.findUnique({
      where: { id: tutor.id }
    });

    const data = {
      nombre: tutor.nombre,
      email: tutor.email ?? null,
      telefono: tutor.telefono ?? null,
    };

    if (existente) {
      await prisma.tutor.update({
        where: { id: tutor.id },
        data,
      });
      console.log(`✅ Profesor ${tutor.id} actualizado en la base de datos`);
    } else {
      await prisma.tutor.create({
        data: {
          id: tutor.id,
          ...data,
        },
      });
      console.log(`✅ Profesor ${tutor.id} creado en la base de datos`);
    }
  } catch (error) {
    console.error('Error actualizando tutor:', error);
    throw error;
  }
}

export async function saveTutores(tutores: Tutor[]): Promise<void> {
  try {
    // Actualizar individualmente cada tutor por su ID
    for (const tutor of tutores) {
      await updateTutor(tutor);
    }
  } catch (error) {
    console.error('Error guardando tutores:', error);
    throw error;
  }
}

// ============================================
// NOTAS
// ============================================

export async function getNotas(): Promise<Nota[]> {
  try {
    const notas = await prisma.nota.findMany({
      orderBy: { fecha: 'desc' }
    });

    return notas.map(nota => ({
      id: nota.id,
      studentName: nota.studentName,
      materia: nota.materia,
      nota: nota.nota,
      fecha: nota.fecha,
      profesor: nota.profesor,
      comentario: nota.comentario ?? undefined,
      estado: (nota.estado as 'pendiente' | 'normal' | 'resuelta' | undefined) ?? undefined,
    }));
  } catch (error) {
    console.error('Error obteniendo notas:', error);
    return [];
  }
}

export async function saveNotas(notas: Nota[]): Promise<void> {
  try {
    await prisma.nota.deleteMany({});

    for (const nota of notas) {
      await prisma.nota.create({
        data: {
          id: nota.id,
          studentName: nota.studentName,
          materia: nota.materia,
          nota: nota.nota,
          fecha: nota.fecha,
          profesor: nota.profesor,
          comentario: nota.comentario ?? null,
          estado: nota.estado ?? null,
        },
      });
    }
  } catch (error) {
    console.error('Error guardando notas:', error);
    throw error;
  }
}

export async function getNotasByStudent(studentName: string): Promise<Nota[]> {
  const notas = await getNotas();
  return notas
    .filter(nota => nota.studentName === studentName)
    .sort((a, b) => {
      const periodoOrder: Record<string, number> = { 'Q1': 1, 'Q2': 2, 'Q3': 3, 'Q4': 4 };
      const periodoA = (typeof a === 'object' && 'periodo' in a && typeof a.periodo === 'string') 
        ? periodoOrder[a.periodo as keyof typeof periodoOrder] || 0 
        : 0;
      const periodoB = (typeof b === 'object' && 'periodo' in b && typeof b.periodo === 'string') 
        ? periodoOrder[b.periodo as keyof typeof periodoOrder] || 0 
        : 0;
      const periodoDiff = periodoA - periodoB;
      if (periodoDiff !== 0) return periodoDiff;
      return a.materia.localeCompare(b.materia);
    });
}

// ============================================
// CLASES
// ============================================

export async function getClases(): Promise<Clase[]> {
  try {
    const clases = await prisma.clase.findMany({
      orderBy: { nombre: 'asc' }
    });

    return clases.map(clase => {
      let dias: DiaSemana[] = [];
      try {
        if (clase.dias) {
          const parsed = JSON.parse(clase.dias);
          dias = Array.isArray(parsed) ? parsed : [];
        }
      } catch (error) {
        console.error('Error parseando dias para clase', clase.id, ':', error);
        dias = [];
      }

      return {
        id: clase.id,
        nombre: clase.nombre,
        grado: clase.grado,
        seccion: clase.seccion,
        profesor: clase.profesor,
        dias,
      };
    });
  } catch (error) {
    console.error('Error obteniendo clases:', error);
    return [];
  }
}

export async function saveClases(clases: Clase[]): Promise<void> {
  try {
    await prisma.clase.deleteMany({});

    // Pre-cargar todos los tutores para mejorar rendimiento
    const todosTutores = await prisma.tutor.findMany();
    const mapTutorId = new Map<string, string>();
    todosTutores.forEach(tutor => mapTutorId.set(tutor.nombre, tutor.id));

    for (const clase of clases) {
      // Buscar profesorId por nombre
      const profesorId = mapTutorId.get(clase.profesor) ?? null;

      await prisma.clase.create({
        data: {
          id: clase.id,
          nombre: clase.nombre,
          grado: clase.grado,
          seccion: clase.seccion,
          profesor: clase.profesor,
          profesorId: profesorId,
          dias: JSON.stringify(clase.dias),
        } as any, // Temporal: periodos fue eliminado del schema pero Prisma Client aún lo espera
      });
    }
  } catch (error) {
    console.error('Error guardando clases:', error);
    throw error;
  }
}

export async function addClase(clase: Omit<Clase, 'id'>): Promise<Clase> {
  try {
    const newClase: Clase = {
      ...clase,
      id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
    };

    console.log('📝 addClase - Datos recibidos:', {
      nombre: newClase.nombre,
      grado: newClase.grado,
      seccion: newClase.seccion,
      profesor: newClase.profesor,
      dias: newClase.dias,
      diasType: typeof newClase.dias,
      diasIsArray: Array.isArray(newClase.dias)
    });

    // Buscar profesorId por nombre
    const tutor = await prisma.tutor.findFirst({
      where: { nombre: newClase.profesor }
    });
    const profesorId = tutor?.id ?? null;

    console.log('👤 Profesor encontrado:', { nombre: newClase.profesor, profesorId });

    const dataToCreate = {
      id: newClase.id,
      nombre: newClase.nombre,
      grado: newClase.grado,
      seccion: newClase.seccion,
      profesor: newClase.profesor,
      profesorId: profesorId,
      dias: JSON.stringify(newClase.dias),
    };

    console.log('💾 Datos a guardar en BD:', dataToCreate);

    await prisma.clase.create({
      data: dataToCreate as any, // Temporal: periodos fue eliminado del schema pero Prisma Client aún lo espera
    });

    console.log('✅ Clase creada exitosamente en BD');

    return newClase;
  } catch (error) {
    console.error('❌ Error agregando clase:', error);
    throw error;
  }
}

export async function getClasesByProfesor(profesor: string): Promise<Clase[]> {
  const clases = await getClases();
  if (!profesor) return clases;
  return clases.filter(c => c.profesor.toLowerCase() === profesor.toLowerCase());
}

export async function getClasesByGradoSeccion(grado: string, seccion: string): Promise<Clase[]> {
  const clases = await getClases();
  return clases.filter(c => c.grado === grado && c.seccion === seccion);
}

// ============================================
// TUTORES POR GRADO Y SECCIÓN
// ============================================

export async function getTutoresGradoSeccion(): Promise<TutorGradoSeccion[]> {
  try {
    const asignaciones = await prisma.tutorGradoSeccion.findMany({
      include: { tutor: true },
      orderBy: [{ grado: 'asc' }, { seccion: 'asc' }]
    });

    return asignaciones.map(a => ({
      grado: a.grado,
      seccion: a.seccion,
      tutorId: a.tutorId,
      tutorNombre: a.tutor.nombre,
    }));
  } catch (error) {
    console.error('Error obteniendo tutores grado sección:', error);
    return [];
  }
}

export async function saveTutoresGradoSeccion(tutores: TutorGradoSeccion[]): Promise<void> {
  try {
    await prisma.tutorGradoSeccion.deleteMany({});

    for (const tutor of tutores) {
      await prisma.tutorGradoSeccion.create({
        data: {
          grado: tutor.grado,
          seccion: tutor.seccion,
          tutorId: tutor.tutorId,
        },
      });
    }
  } catch (error) {
    console.error('Error guardando tutores grado sección:', error);
    throw error;
  }
}

export async function getTutorGradoSeccion(grado: string, seccion: string): Promise<TutorGradoSeccion | undefined> {
  try {
    const asignacion = await prisma.tutorGradoSeccion.findFirst({
      where: { grado, seccion },
      include: { tutor: true }
    });

    if (!asignacion) return undefined;

    return {
      grado: asignacion.grado,
      seccion: asignacion.seccion,
      tutorId: asignacion.tutorId,
      tutorNombre: asignacion.tutor.nombre,
    };
  } catch (error) {
    console.error('Error obteniendo tutor grado sección:', error);
    return undefined;
  }
}

export async function getSeccionByTutorId(tutorId: string): Promise<TutorGradoSeccion | undefined> {
  try {
    const asignacion = await prisma.tutorGradoSeccion.findFirst({
      where: { tutorId },
      include: { tutor: true }
    });

    if (!asignacion) return undefined;

    return {
      grado: asignacion.grado,
      seccion: asignacion.seccion,
      tutorId: asignacion.tutorId,
      tutorNombre: asignacion.tutor.nombre,
    };
  } catch (error) {
    console.error('Error obteniendo sección por tutor ID:', error);
    return undefined;
  }
}

export async function setTutorGradoSeccion(
  grado: string, 
  seccion: string, 
  tutorId: string, 
  tutorNombre: string
): Promise<void> {
  try {
    // Remover cualquier asignación previa de este tutor (un tutor solo puede estar asignado a una sección)
    await prisma.tutorGradoSeccion.deleteMany({
      where: { tutorId }
    });

    // Verificar si ya existe una asignación para esta sección y reemplazarla
    const existente = await prisma.tutorGradoSeccion.findFirst({
      where: { grado, seccion }
    });

    if (existente) {
      await prisma.tutorGradoSeccion.update({
        where: { id: existente.id },
        data: { tutorId }
      });
    } else {
      await prisma.tutorGradoSeccion.create({
        data: {
          grado,
          seccion,
          tutorId,
        },
      });
    }
  } catch (error) {
    console.error('Error asignando tutor a grado/sección:', error);
    throw error;
  }
}

export async function removeTutorGradoSeccion(grado: string, seccion: string): Promise<void> {
  try {
    await prisma.tutorGradoSeccion.deleteMany({
      where: { grado, seccion }
    });
  } catch (error) {
    console.error('Error removiendo tutor de grado/sección:', error);
    throw error;
  }
}

// ============================================
// FUNCIONES ADICIONALES PARA INCIDENCIAS
// ============================================

export async function getIncidenciasByGravedad(
  gravedad?: 'grave' | 'moderada' | 'leve' | 'todas'
): Promise<Incidencia[]> {
  const incidencias = await getIncidencias();
  if (!gravedad || gravedad === 'todas') {
    return incidencias.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }
  return incidencias
    .filter(inc => inc.gravedad === gravedad)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

export async function getIncidenciasByFiltros(
  gravedad?: 'grave' | 'moderada' | 'leve' | 'todas',
  tipo?: 'asistencia' | 'tardanza' | 'conducta' | 'academica' | 'positivo' | 'todas'
): Promise<Incidencia[]> {
  let incidencias = await getIncidencias();
  // Filtrar por gravedad
  if (gravedad && gravedad !== 'todas') {
    incidencias = incidencias.filter(inc => inc.gravedad === gravedad);
  }
  // Filtrar por tipo
  if (tipo && tipo !== 'todas') {
    incidencias = incidencias.filter(inc => inc.tipo === tipo);
  }
  return incidencias.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

export async function getIncidenciasDerivadas(tipoDerivacion?: TipoDerivacion): Promise<Incidencia[]> {
  const incidencias = await getIncidencias();
  
  // Tipos de incidencias negativas (excluir positivas)
  // Nota: 'ausencia' se cambió por 'asistencia'
  const tiposNegativos: string[] = ['asistencia', 'tardanza', 'conducta', 'academica'];
  
  const derivadas = incidencias
    .filter(inc => {
      // Excluir incidencias positivas - solo mostrar negativas
      const esNegativa = tiposNegativos.includes(inc.tipo);
      if (!esNegativa) {
        return false;
      }
      
      // Verificar que tenga derivación válida (no 'ninguna', null, undefined, o cadena vacía)
      const derivacionValida = inc.derivacion && 
                                inc.derivacion !== 'ninguna' &&
                                inc.derivacion.trim() !== '' &&
                                typeof inc.derivacion === 'string';
      const noResuelta = !inc.resuelta;
      
      if (tipoDerivacion) {
        const coincideTipo = inc.derivacion === tipoDerivacion;
        const resultado = derivacionValida && noResuelta && coincideTipo;
        if (resultado) {
          console.log('✅ Incidencia derivada encontrada:', {
            id: inc.id,
            estudiante: inc.studentName,
            tipo: inc.tipo,
            derivacion: inc.derivacion,
            tipoFiltro: tipoDerivacion,
            resuelta: inc.resuelta,
            timestamp: inc.timestamp
          });
        }
        return resultado;
      } else {
        // Sin filtro de tipo: retornar todas las que tengan derivación válida y no estén resueltas
        const resultado = derivacionValida && noResuelta;
        if (resultado) {
          console.log('✅ Incidencia derivada encontrada (sin filtro):', {
            id: inc.id,
            estudiante: inc.studentName,
            tipo: inc.tipo,
            derivacion: inc.derivacion,
            resuelta: inc.resuelta,
            timestamp: inc.timestamp
          });
        }
        return resultado;
      }
    })
    .sort((a, b) => {
      const fechaA = a.timestamp ? new Date(a.timestamp).getTime() : new Date(a.fecha).getTime();
      const fechaB = b.timestamp ? new Date(b.timestamp).getTime() : new Date(b.fecha).getTime();
      return fechaB - fechaA;
    });
  
  console.log('📊 getIncidenciasDerivadas:', {
    totalIncidencias: incidencias.length,
    derivadasEncontradas: derivadas.length,
    tipoFiltro: tipoDerivacion || 'todas',
    derivadas: derivadas.map(inc => ({
      id: inc.id,
      estudiante: inc.studentName,
      derivacion: inc.derivacion,
      resuelta: inc.resuelta
    }))
  });
  
  return derivadas;
}

export async function marcarIncidenciaResuelta(
  id: string, 
  resueltaPor: string = 'Director'
): Promise<void> {
  try {
    // Obtener la incidencia actual para preservar el historial
    const incidencia = await prisma.incidencia.findUnique({
      where: { id },
    });

    if (!incidencia) {
      throw new Error(`Incidencia con id ${id} no encontrada`);
    }

    // Obtener el historial actual o crear uno nuevo
    let historial: EstadoIncidenciaHistorial[] = incidencia.historialEstado
      ? JSON.parse(incidencia.historialEstado)
      : [];

    // Agregar el nuevo estado al historial
    historial.push({
      estado: 'Resuelta',
      fecha: new Date().toISOString(),
      usuario: resueltaPor,
    });

    // Actualizar la incidencia con el estado y el historial
    const incidenciaActualizada = await prisma.incidencia.update({
      where: { id },
      data: {
        resuelta: true,
        fechaResolucion: new Date().toISOString().split('T')[0],
        resueltaPor,
        estado: 'Resuelta',
        historialEstado: JSON.stringify(historial),
      },
    });

    console.log(`✅ Incidencia ${id} marcada como resuelta por ${resueltaPor}`);
    console.log(`📊 Estado actualizado en BD:`, {
      id: incidenciaActualizada.id,
      estado: incidenciaActualizada.estado,
      resuelta: incidenciaActualizada.resuelta,
      fechaResolucion: incidenciaActualizada.fechaResolucion,
      resueltaPor: incidenciaActualizada.resueltaPor,
    });
  } catch (error) {
    console.error('Error marcando incidencia como resuelta:', error);
    throw error;
  }
}

export async function getIncidenciasCompletasByStudent(studentName: string): Promise<Incidencia[]> {
  const incidencias = await getIncidencias();
  return incidencias
    .filter(inc => inc.studentName === studentName)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

export async function getListaEstudiantes(): Promise<Array<{ nombre: string; totalIncidencias: number; ultimaIncidencia: string }>> {
  const incidencias = await getIncidencias();
  const estudiantesMap = new Map<string, { incidencias: Incidencia[] }>();
  
  incidencias.forEach(inc => {
    if (!estudiantesMap.has(inc.studentName)) {
      estudiantesMap.set(inc.studentName, { incidencias: [] });
    }
    estudiantesMap.get(inc.studentName)!.incidencias.push(inc);
  });
  
  return Array.from(estudiantesMap.entries())
    .map(([nombre, data]) => {
      const incidenciasOrdenadas = data.incidencias.sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
      return {
        nombre,
        totalIncidencias: data.incidencias.length,
        ultimaIncidencia: incidenciasOrdenadas[0]?.fecha || '',
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

// ============================================
// ASISTENCIA POR CLASE
// ============================================

export async function getAsistenciaClases(): Promise<RegistroAsistenciaClase[]> {
  try {
    const registros = await prisma.registroAsistenciaClase.findMany({
      include: { entries: true },
      orderBy: { fecha: 'desc' }
    });

    return registros.map(reg => {
      const entries: Record<string, EstadoAsistencia> = {};
      reg.entries.forEach(entry => {
        entries[entry.studentName] = entry.estado as EstadoAsistencia;
      });

      return {
        id: reg.id,
        fecha: reg.fecha,
        dia: reg.dia as DiaSemana,
        claseId: reg.claseId,
        grado: reg.grado,
        seccion: reg.seccion,
        profesor: reg.profesor,
        periodo: reg.periodo,
        lugar: reg.lugar ?? undefined,
        timestamp: Number(reg.timestamp),
        entries,
      };
    });
  } catch (error) {
    console.error('Error obteniendo asistencia clases:', error);
    return [];
  }
}

export async function saveAsistenciaClases(registros: RegistroAsistenciaClase[]): Promise<void> {
  try {
    // Eliminar todos los registros existentes
    await prisma.registroAsistenciaEntry.deleteMany({});
    await prisma.registroAsistenciaClase.deleteMany({});

    // Pre-cargar todos los estudiantes para buscar IDs (una sola vez para todos los registros)
    const todosEstudiantes = await prisma.estudiante.findMany();
    const mapEstudianteId = new Map<string, string>();
    // Mapear tanto por nombre completo como por nombres+apellidos
    todosEstudiantes.forEach(est => {
      const nombreCompleto = est.nombre || `${est.nombres} ${est.apellidos}`.trim();
      mapEstudianteId.set(nombreCompleto, est.id);
      mapEstudianteId.set(`${est.nombres} ${est.apellidos}`.trim(), est.id);
    });

    for (const reg of registros) {
      // Preparar entries con estudianteId
      const entriesData = Object.entries(reg.entries || {}).map(([studentName, estado]) => {
        const estudianteId = mapEstudianteId.get(studentName) ?? null;
        return {
          studentName,
          estudianteId,
          estado,
        };
      });

      const registroCreado = await prisma.registroAsistenciaClase.create({
        data: {
          id: reg.id,
          fecha: reg.fecha,
          dia: reg.dia,
          claseId: reg.claseId,
          grado: reg.grado,
          seccion: reg.seccion,
          profesor: reg.profesor,
          periodo: reg.periodo,
          lugar: reg.lugar ?? null,
          timestamp: BigInt(reg.timestamp),
          entries: {
            create: entriesData,
          },
        },
      });
    }
  } catch (error) {
    console.error('Error guardando asistencia clases:', error);
    throw error;
  }
}

export async function addRegistroAsistenciaClase(
  rec: Omit<RegistroAsistenciaClase, 'id' | 'timestamp'>
): Promise<RegistroAsistenciaClase> {
  try {
    // Buscar si ya existe un registro para la misma clase, fecha y periodo
    const existente = await prisma.registroAsistenciaClase.findFirst({
      where: {
        fecha: rec.fecha,
        claseId: rec.claseId,
        periodo: rec.periodo,
      },
    });

    const registroId = existente?.id || Date.now().toString() + Math.random().toString(36).slice(2, 7);
    const timestamp = Date.now();

    // Pre-cargar todos los estudiantes para buscar IDs
    const todosEstudiantes = await prisma.estudiante.findMany();
    const mapEstudianteId = new Map<string, string>();
    // Mapear tanto por nombre completo como por nombres+apellidos
    todosEstudiantes.forEach(est => {
      const nombreCompleto = est.nombre || `${est.nombres} ${est.apellidos}`.trim();
      mapEstudianteId.set(nombreCompleto, est.id);
      mapEstudianteId.set(`${est.nombres} ${est.apellidos}`.trim(), est.id);
    });

    // Preparar entries con estudianteId
    const entriesData = Object.entries(rec.entries || {}).map(([studentName, estado]) => {
      const estudianteId = mapEstudianteId.get(studentName) ?? null;
      return {
        studentName,
        estudianteId,
        estado,
      };
    });

    if (existente) {
      // Eliminar entries existentes
      await prisma.registroAsistenciaEntry.deleteMany({
        where: { registroAsistenciaId: registroId },
      });

      // Actualizar el registro
      await prisma.registroAsistenciaClase.update({
        where: { id: registroId },
        data: {
          lugar: rec.lugar ?? null,
          timestamp: BigInt(timestamp),
          entries: {
            create: entriesData,
          },
        },
      });
    } else {
      // Crear nuevo registro
      await prisma.registroAsistenciaClase.create({
        data: {
          id: registroId,
          fecha: rec.fecha,
          dia: rec.dia,
          claseId: rec.claseId,
          grado: rec.grado,
          seccion: rec.seccion,
          profesor: rec.profesor,
          periodo: rec.periodo,
          lugar: rec.lugar ?? null,
          timestamp: BigInt(timestamp),
          entries: {
            create: entriesData,
          },
        },
      });
    }

    return {
      ...rec,
      id: registroId,
      timestamp,
    };
  } catch (error) {
    console.error('Error agregando registro de asistencia:', error);
    throw error;
  }
}

export async function findRegistroAsistencia(
  fecha: string,
  claseId: string,
  periodo: number
): Promise<RegistroAsistenciaClase | undefined> {
  try {
    const registro = await prisma.registroAsistenciaClase.findFirst({
      where: {
        fecha,
        claseId,
        periodo,
      },
      include: { entries: true },
    });

    if (!registro) return undefined;

    const entries: Record<string, EstadoAsistencia> = {};
    registro.entries.forEach(entry => {
      entries[entry.studentName] = entry.estado as EstadoAsistencia;
    });

    return {
      id: registro.id,
      fecha: registro.fecha,
      dia: registro.dia as DiaSemana,
      claseId: registro.claseId,
      grado: registro.grado,
      seccion: registro.seccion,
      profesor: registro.profesor,
      periodo: registro.periodo,
      lugar: registro.lugar ?? undefined,
      timestamp: Number(registro.timestamp),
      entries,
    };
  } catch (error) {
    console.error('Error buscando registro de asistencia:', error);
    return undefined;
  }
}

export async function getAsistenciaClasesByFilters(params: {
  fecha?: string;
  claseId?: string;
  profesor?: string;
  grado?: string;
  seccion?: string;
  dia?: DiaSemana;
  periodo?: number;
}): Promise<RegistroAsistenciaClase[]> {
  try {
    const where: any = {};
    if (params.fecha) where.fecha = params.fecha;
    if (params.claseId) where.claseId = params.claseId;
    if (params.profesor) {
      // Para búsqueda case-insensitive, usamos una expresión regular simple o búsqueda exacta
      // En producción podrías usar una búsqueda más sofisticada
      where.profesor = params.profesor;
    }
    if (params.grado) where.grado = params.grado;
    if (params.seccion) where.seccion = params.seccion;
    if (params.dia) where.dia = params.dia;
    if (typeof params.periodo === 'number') where.periodo = params.periodo;

    const registros = await prisma.registroAsistenciaClase.findMany({
      where,
      include: { entries: true },
      orderBy: [
        { periodo: 'asc' },
        { timestamp: 'asc' },
      ],
    });

    return registros.map(reg => {
      const entries: Record<string, EstadoAsistencia> = {};
      reg.entries.forEach(entry => {
        entries[entry.studentName] = entry.estado as EstadoAsistencia;
      });

      return {
        id: reg.id,
        fecha: reg.fecha,
        dia: reg.dia as DiaSemana,
        claseId: reg.claseId,
        grado: reg.grado,
        seccion: reg.seccion,
        profesor: reg.profesor,
        periodo: reg.periodo,
        lugar: reg.lugar ?? undefined,
        timestamp: Number(reg.timestamp),
        entries,
      };
    });
  } catch (error) {
    console.error('Error obteniendo asistencia por filtros:', error);
    return [];
  }
}

// ============================================
// GRADOS Y SECCIONES
// ============================================

export async function getGrados(): Promise<string[]> {
  try {
    const grados = await prisma.grado.findMany({
      orderBy: { nombre: 'asc' }
    });
    return grados.map(g => g.nombre);
  } catch (error) {
    console.error('Error obteniendo grados:', error);
    // Valores por defecto si hay error
    return ['1ro', '2do', '3ro', '4to', '5to'];
  }
}

export async function saveGrados(grados: string[]): Promise<void> {
  try {
    // Eliminar todos los grados existentes
    await prisma.grado.deleteMany({});
    
    // Crear los nuevos grados
    for (const nombre of grados) {
      await prisma.grado.create({
        data: { nombre: nombre.trim() }
      });
    }
  } catch (error) {
    console.error('Error guardando grados:', error);
    throw error;
  }
}

export async function getSecciones(): Promise<string[]> {
  try {
    const secciones = await prisma.seccion.findMany({
      orderBy: { nombre: 'asc' }
    });
    return secciones.map(s => s.nombre);
  } catch (error) {
    console.error('Error obteniendo secciones:', error);
    // Valores por defecto si hay error
    return ['A', 'B', 'C'];
  }
}

export async function saveSecciones(secciones: string[]): Promise<void> {
  try {
    // Eliminar todas las secciones existentes
    await prisma.seccion.deleteMany({});
    
    // Crear las nuevas secciones
    for (const nombre of secciones) {
      await prisma.seccion.create({
        data: { nombre: nombre.trim().toUpperCase() }
      });
    }
  } catch (error) {
    console.error('Error guardando secciones:', error);
    throw error;
  }
}

