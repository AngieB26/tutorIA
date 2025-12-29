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
      orderBy: { nombre: 'asc' }
    });

    return estudiantes.map(est => ({
      nombre: est.nombre,
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
      asistencias: est.asistencias ?? undefined,
      ausencias: est.ausencias ?? undefined,
      tardanzas: est.tardanzas ?? undefined,
    }));
  } catch (error) {
    console.error('Error obteniendo estudiantes:', error);
    return [];
  }
}

export async function getEstudianteInfo(nombre: string): Promise<EstudianteInfo | null> {
  try {
    const estudiante = await prisma.estudiante.findFirst({
      where: { nombre }
    });

    if (!estudiante) return null;

    return {
      nombre: estudiante.nombre,
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
    // Si se proporciona nombreOriginal, buscar por ese nombre (para actualizaciones)
    // Si no, buscar por el nombre actual
    const nombreBusqueda = nombreOriginal || estudiante.nombre;
    
    const existente = await prisma.estudiante.findFirst({
      where: { nombre: nombreBusqueda }
    });

    const data = {
      nombre: estudiante.nombre,
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
      const historial: EstadoIncidenciaHistorial[] = inc.historialEstado 
        ? JSON.parse(inc.historialEstado) 
        : [];

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
        historialEstado: historial.length > 0 ? historial : undefined,
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
    
    for (const inc of incidencias) {
      await prisma.incidencia.create({
        data: {
          id: inc.id,
          studentName: inc.studentName,
          tipo: inc.tipo,
          subtipo: inc.subtipo ?? null,
          gravedad: inc.gravedad,
          descripcion: inc.descripcion,
          fecha: inc.fecha,
          profesor: inc.profesor,
          tutorNombre: inc.tutor ?? null,
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

    console.log('📝 Guardando nueva incidencia:', {
      id: newIncidencia.id,
      estudiante: newIncidencia.studentName,
      derivacionOriginal: newIncidencia.derivacion,
      derivacionGuardada: derivacionValue,
      timestamp: newIncidencia.timestamp
    });

    await prisma.incidencia.create({
      data: {
        id: newIncidencia.id,
        studentName: newIncidencia.studentName,
        tipo: newIncidencia.tipo,
        subtipo: newIncidencia.subtipo ?? null,
        gravedad: newIncidencia.gravedad,
        descripcion: newIncidencia.descripcion,
        fecha: newIncidencia.fecha,
        profesor: newIncidencia.profesor,
        tutorNombre: newIncidencia.tutor ?? null,
        lugar: newIncidencia.lugar ?? null,
        timestamp: BigInt(newIncidencia.timestamp),
        derivacion: derivacionValue,
        resuelta: newIncidencia.resuelta ?? false,
        fechaResolucion: newIncidencia.fechaResolucion ?? null,
        resueltaPor: newIncidencia.resueltaPor ?? null,
        estado: newIncidencia.estado ?? 'Pendiente',
        historialEstado: newIncidencia.historialEstado ? JSON.stringify(newIncidencia.historialEstado) : null,
      },
    });

    console.log('✅ Incidencia guardada exitosamente:', {
      id: newIncidencia.id,
      derivacion: derivacionValue
    });

    return newIncidencia;
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
      const dias: DiaSemana[] = clase.dias ? JSON.parse(clase.dias) : [];
      const periodos: number[] = clase.periodos ? JSON.parse(clase.periodos) : [];

      return {
        id: clase.id,
        nombre: clase.nombre,
        grado: clase.grado,
        seccion: clase.seccion,
        profesor: clase.profesor,
        dias,
        periodos,
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

    for (const clase of clases) {
      await prisma.clase.create({
        data: {
          id: clase.id,
          nombre: clase.nombre,
          grado: clase.grado,
          seccion: clase.seccion,
          profesor: clase.profesor,
          dias: JSON.stringify(clase.dias),
          periodos: JSON.stringify(clase.periodos),
        },
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

    await prisma.clase.create({
      data: {
        id: newClase.id,
        nombre: newClase.nombre,
        grado: newClase.grado,
        seccion: newClase.seccion,
        profesor: newClase.profesor,
        dias: JSON.stringify(newClase.dias),
        periodos: JSON.stringify(newClase.periodos),
      },
    });

    return newClase;
  } catch (error) {
    console.error('Error agregando clase:', error);
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
  tipo?: 'ausencia' | 'tardanza' | 'conducta' | 'academica' | 'positivo' | 'todas'
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
  
  const derivadas = incidencias
    .filter(inc => {
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

    for (const reg of registros) {
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
            create: Object.entries(reg.entries || {}).map(([studentName, estado]) => ({
              studentName,
              estado,
            })),
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
            create: Object.entries(rec.entries || {}).map(([studentName, estado]) => ({
              studentName,
              estado,
            })),
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
            create: Object.entries(rec.entries || {}).map(([studentName, estado]) => ({
              studentName,
              estado,
            })),
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

