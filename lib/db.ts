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
      // Construir nombre completo desde nombres y apellidos
      const nombreCompleto = `${est.nombres} ${est.apellidos}`.trim();
      
      return {
        id: est.id, // Incluir ID
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

// Nueva función para buscar por ID (más confiable)
export async function getEstudianteInfoById(id: string): Promise<EstudianteInfo | null> {
  try {
    const estudiante = await prisma.estudiante.findUnique({
      where: { id }
    });

    if (!estudiante) return null;

    // Construir nombre completo desde nombres y apellidos
    const nombreCompleto = `${estudiante.nombres} ${estudiante.apellidos}`.trim();

    return {
      id: estudiante.id,
      nombre: nombreCompleto,
      nombres: estudiante.nombres,
      apellidos: estudiante.apellidos,
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
    console.error('Error obteniendo estudiante por ID:', error);
    return null;
  }
}

export async function getEstudianteInfo(nombre: string): Promise<EstudianteInfo | null> {
  try {
    // Buscar por nombres y apellidos separados
    let estudiante = null;
    if (nombre.includes(' ')) {
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

    // Construir nombre completo desde nombres y apellidos
    const nombreCompleto = `${estudiante.nombres} ${estudiante.apellidos}`.trim();

    return {
      id: estudiante.id, // Incluir ID
      nombre: nombreCompleto,
      nombres: estudiante.nombres, // Incluir nombres separado
      apellidos: estudiante.apellidos, // Incluir apellidos separado
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

export async function saveEstudianteInfo(estudiante: EstudianteInfo, estudianteId?: string): Promise<void> {
  try {
    // Asegurar que nombres y apellidos estén presentes (campos principales)
    if (!estudiante.nombres || !estudiante.apellidos) {
      throw new Error('Los campos nombres y apellidos son requeridos');
    }

    // Construir nombre completo nuevo
    const nombreCompletoNuevo = `${estudiante.nombres.trim()} ${estudiante.apellidos.trim()}`.trim();

    // Si hay estudianteId, buscar directamente por ID (más confiable)
    let existente = null;
    if (estudianteId) {
      console.log(`🔍 Buscando estudiante por ID: "${estudianteId}"`);
      existente = await prisma.estudiante.findUnique({
        where: { id: estudianteId }
      });
      if (existente) {
        console.log(`✅ Estudiante encontrado por ID: ${existente.id}`);
      }
    }
    
    // Si no se encuentra por ID, buscar por nombres y apellidos (fallback para compatibilidad)
    if (!existente) {
      console.log(`🔍 Buscando estudiante por nombres: "${estudiante.nombres}" "${estudiante.apellidos}"`);
      existente = await prisma.estudiante.findFirst({
        where: {
          nombres: estudiante.nombres,
          apellidos: estudiante.apellidos
        }
      });
      if (existente) {
        console.log(`✅ Estudiante encontrado por nombres (ID: ${existente.id})`);
      }
    }

    // Construir nombre completo desde nombres y apellidos
    const nombreCompleto = `${estudiante.nombres.trim()} ${estudiante.apellidos.trim()}`.trim();

    if (existente) {
      // Construir nombre completo para comparación
      const nombreCompletoNuevo = `${estudiante.nombres.trim()} ${estudiante.apellidos.trim()}`.trim();
      
      // Crear objeto de datos que preserve TODOS los valores existentes
      // Solo actualizar campos que están explícitamente presentes en el objeto estudiante
      // Esto garantiza que NUNCA se elimine información existente
      const dataToUpdate: any = {
        nombres: estudiante.nombres.trim(),
        apellidos: estudiante.apellidos.trim(),
        // Actualizar grado si está presente y no está vacío, de lo contrario preservar el existente
        grado: (estudiante.grado !== undefined && estudiante.grado !== null && estudiante.grado !== '') 
          ? estudiante.grado 
          : existente.grado,
        // Actualizar sección si está presente y no está vacía, de lo contrario preservar la existente
        seccion: (estudiante.seccion !== undefined && estudiante.seccion !== null && estudiante.seccion !== '') 
          ? estudiante.seccion 
          : existente.seccion,
        // Actualizar edad si está presente, de lo contrario preservar la existente
        edad: estudiante.edad !== undefined && estudiante.edad !== null
          ? estudiante.edad 
          : existente.edad,
        fechaNacimiento: estudiante.fechaNacimiento !== undefined ? (estudiante.fechaNacimiento ?? null) : existente.fechaNacimiento,
        fotoPerfil: estudiante.fotoPerfil !== undefined ? (estudiante.fotoPerfil ?? null) : existente.fotoPerfil,
        // Actualizar contacto si está presente en el objeto estudiante
        contactoTelefono: estudiante.contacto !== undefined 
          ? (estudiante.contacto?.telefono !== undefined ? estudiante.contacto.telefono : existente.contactoTelefono)
          : existente.contactoTelefono,
        contactoEmail: estudiante.contacto !== undefined 
          ? (estudiante.contacto?.email !== undefined ? estudiante.contacto.email : existente.contactoEmail)
          : existente.contactoEmail,
        contactoNombre: estudiante.contacto !== undefined 
          ? (estudiante.contacto?.nombre !== undefined ? estudiante.contacto.nombre : existente.contactoNombre)
          : existente.contactoNombre,
        // Preservar tutor existente si no se está editando
        tutorNombre: estudiante.tutor !== undefined 
          ? (estudiante.tutor?.nombre ?? estudiante.contacto?.tutor ?? null) 
          : existente.tutorNombre,
        tutorTelefono: estudiante.tutor !== undefined 
          ? (estudiante.tutor?.telefono ?? null) 
          : existente.tutorTelefono,
        tutorEmail: estudiante.tutor !== undefined 
          ? (estudiante.tutor?.email ?? null) 
          : existente.tutorEmail,
        // Preservar apoderado existente si no se está editando
        apoderadoNombre: estudiante.apoderado !== undefined 
          ? (estudiante.apoderado?.nombre ?? null) 
          : existente.apoderadoNombre,
        apoderadoParentesco: estudiante.apoderado !== undefined 
          ? (estudiante.apoderado?.parentesco ?? null) 
          : existente.apoderadoParentesco,
        apoderadoTelefono: estudiante.apoderado !== undefined 
          ? (estudiante.apoderado?.telefono ?? null) 
          : existente.apoderadoTelefono,
        apoderadoTelefonoAlt: estudiante.apoderado !== undefined 
          ? (estudiante.apoderado?.telefonoAlternativo ?? null) 
          : existente.apoderadoTelefonoAlt,
        apoderadoEmail: estudiante.apoderado !== undefined 
          ? (estudiante.apoderado?.email ?? null) 
          : existente.apoderadoEmail,
        apoderadoDireccion: estudiante.apoderado !== undefined 
          ? (estudiante.apoderado?.direccion ?? null) 
          : existente.apoderadoDireccion,
        // Preservar estadísticas de asistencia existentes si no se están editando
        asistencias: estudiante.asistencias !== undefined 
          ? (estudiante.asistencias ?? null) 
          : existente.asistencias,
        ausencias: estudiante.ausencias !== undefined 
          ? (estudiante.ausencias ?? null) 
          : existente.ausencias,
        tardanzas: estudiante.tardanzas !== undefined 
          ? (estudiante.tardanzas ?? null) 
          : existente.tardanzas,
      };
      
      // Actualizar el estudiante
      await prisma.estudiante.update({
        where: { id: existente.id },
        data: dataToUpdate,
      });

      // SIEMPRE actualizar las incidencias, notas y registros relacionados para mantener la consistencia
      // Esto asegura que las relaciones se mantengan incluso si el nombre cambió
      const nombreAnterior = `${existente.nombres} ${existente.apellidos}`.trim();
      const nombreCambio = nombreAnterior !== nombreCompletoNuevo;
      console.log(`🔄 Actualizando registros relacionados para estudiante ID: ${existente.id}`);
      console.log(`   Nombre anterior: ${nombreAnterior}`);
      console.log(`   Nombre nuevo: ${nombreCompletoNuevo}`);
      
      // Actualizar TODAS las incidencias relacionadas con este estudiante (por estudianteId)
      // Esto preserva todas las incidencias independientemente del nombre
      const incidenciasActualizadas = await prisma.incidencia.updateMany({
        where: {
          estudianteId: existente.id
        },
        data: {
          studentName: nombreCompletoNuevo,
          estudianteId: existente.id, // Asegurar que la relación se mantenga
        },
      });
      
      // También actualizar por nombre anterior por si acaso hay incidencias sin estudianteId
      if (nombreCambio && nombreAnterior !== nombreCompletoNuevo) {
        await prisma.incidencia.updateMany({
          where: {
            studentName: nombreAnterior,
            estudianteId: null // Solo las que no tienen estudianteId asignado
          },
          data: {
            studentName: nombreCompletoNuevo,
            estudianteId: existente.id, // Asignar el estudianteId
          },
        });
      }
      
      console.log(`✅ ${incidenciasActualizadas.count} incidencias actualizadas`);

      // Actualizar TODAS las notas relacionadas con este estudiante (por estudianteId)
      const notasActualizadas = await prisma.nota.updateMany({
        where: {
          estudianteId: existente.id
        },
        data: {
          studentName: nombreCompletoNuevo,
          estudianteId: existente.id, // Asegurar que la relación se mantenga
        },
      });
      
      // También actualizar por nombre anterior por si acaso hay notas sin estudianteId
      // nombreAnterior ya está definido arriba (línea 318)
      if (nombreAnterior && nombreAnterior !== nombreCompletoNuevo) {
        await prisma.nota.updateMany({
          where: {
            studentName: nombreAnterior,
            estudianteId: null
          },
          data: {
            studentName: nombreCompletoNuevo,
            estudianteId: existente.id,
          },
        });
      }
      
      console.log(`✅ ${notasActualizadas.count} notas actualizadas`);

      // Actualizar TODOS los registros de asistencia relacionados con este estudiante (por estudianteId)
      const asistenciasActualizadas = await prisma.registroAsistenciaEntry.updateMany({
        where: {
          estudianteId: existente.id
        },
        data: {
          studentName: nombreCompletoNuevo,
          estudianteId: existente.id, // Asegurar que la relación se mantenga
        },
      });
      
      // También actualizar por nombre anterior por si acaso hay registros sin estudianteId
      if (nombreCambio && nombreAnterior !== nombreCompletoNuevo) {
        await prisma.registroAsistenciaEntry.updateMany({
          where: {
            studentName: nombreAnterior,
            estudianteId: null
          },
          data: {
            studentName: nombreCompletoNuevo,
            estudianteId: existente.id,
          },
        });
      }
      
      console.log(`✅ ${asistenciasActualizadas.count} registros de asistencia actualizados`);
      console.log(`✅ Todos los registros relacionados actualizados para ${nombreCompletoNuevo}`);
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
    // Buscar por nombres y apellidos separados
    let estudiante = null;
    if (nombre.includes(' ')) {
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
    
    todosEstudiantes.forEach(est => {
      const nombreCompleto = `${est.nombres} ${est.apellidos}`.trim();
      mapEstudianteId.set(nombreCompleto, est.id);
    });
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
        const nombreCompleto = `${est.nombres} ${est.apellidos}`.trim();
        mapEstudianteGradoSeccion.set(nombreCompleto, { grado: est.grado, seccion: est.seccion });
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

    // Buscar estudianteId por nombres y apellidos
    let estudiante = null;
    console.log(`🔍 Buscando estudiante para incidencia: "${newIncidencia.studentName}"`);
    
    if (newIncidencia.studentName && newIncidencia.studentName.trim()) {
      const partes = newIncidencia.studentName.trim().split(/\s+/);
      if (partes.length >= 2) {
        const apellidos = partes[partes.length - 1];
        const nombres = partes.slice(0, -1).join(' ');
        console.log(`  - Nombres: "${nombres}", Apellidos: "${apellidos}"`);
        
        // Buscar con coincidencia exacta primero
        estudiante = await prisma.estudiante.findFirst({
          where: {
            nombres: nombres,
            apellidos: apellidos
          }
        });
        
        // Si no se encuentra con coincidencia exacta, buscar con contains (insensitive)
        if (!estudiante) {
          console.log(`  - No encontrado con coincidencia exacta, buscando con contains...`);
          estudiante = await prisma.estudiante.findFirst({
            where: {
              nombres: { contains: nombres, mode: 'insensitive' },
              apellidos: { contains: apellidos, mode: 'insensitive' }
            }
          });
        }
        
        // Si aún no se encuentra, buscar solo por nombres o apellidos
        if (!estudiante) {
          console.log(`  - No encontrado con contains, buscando por nombres o apellidos...`);
          estudiante = await prisma.estudiante.findFirst({
            where: {
              OR: [
                { nombres: { contains: nombres, mode: 'insensitive' } },
                { apellidos: { contains: apellidos, mode: 'insensitive' } },
                { nombres: { contains: newIncidencia.studentName, mode: 'insensitive' } },
                { apellidos: { contains: newIncidencia.studentName, mode: 'insensitive' } }
              ]
            }
          });
        }
      } else {
        // Si solo hay una parte, buscar en nombres o apellidos
        console.log(`  - Solo una parte, buscando en nombres o apellidos: "${partes[0]}"`);
        estudiante = await prisma.estudiante.findFirst({
          where: {
            OR: [
              { nombres: { contains: partes[0], mode: 'insensitive' } },
              { apellidos: { contains: partes[0], mode: 'insensitive' } }
            ]
          }
        });
      }
    }
    
    if (estudiante) {
      console.log(`✅ Estudiante encontrado: ID=${estudiante.id}, Nombre completo: ${estudiante.nombres} ${estudiante.apellidos}`);
    } else {
      console.log(`⚠️ Estudiante NO encontrado para: "${newIncidencia.studentName}"`);
    }
    
    const estudianteId = estudiante?.id ?? null;
    
    // Normalizar el nombre del estudiante: si encontramos al estudiante, usar su nombre completo normalizado
    // Esto asegura que el studentName en la incidencia coincida con el formato usado en la BD
    const studentNameNormalizado = estudiante 
      ? `${estudiante.nombres} ${estudiante.apellidos}`.trim()
      : newIncidencia.studentName.trim();
    
    console.log(`📝 Nombre normalizado para incidencia: "${studentNameNormalizado}" (original: "${newIncidencia.studentName}")`);

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
      estudiante: studentNameNormalizado,
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
        studentName: studentNameNormalizado, // Usar el nombre normalizado
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

export async function getIncidenciasCompletasByStudent(studentNameOrId: string): Promise<Incidencia[]> {
  try {
    console.log(`🔍 getIncidenciasCompletasByStudent llamado con: "${studentNameOrId}"`);
    
    // Detectar si el parámetro es un ID (UUID) o un nombre
    // Los UUIDs tienen el formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 caracteres con guiones)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentNameOrId);
    console.log(`📋 Es UUID: ${isUUID}`);
    
    let estudiante = null;
    let estudianteIdFinal: string | null = null;
    
    if (isUUID) {
      // Si es un ID, buscar directamente por ID
      console.log(`🔍 Buscando estudiante por ID: "${studentNameOrId}"`);
      try {
        estudiante = await prisma.estudiante.findUnique({
          where: { id: studentNameOrId }
        });
        if (estudiante) {
          console.log(`✅ Estudiante encontrado por ID: ${estudiante.id}`);
          estudianteIdFinal = estudiante.id;
        } else {
          console.log(`⚠️ Estudiante no encontrado por ID: "${studentNameOrId}"`);
          // Aún así, intentar buscar incidencias por este ID
          estudianteIdFinal = studentNameOrId;
        }
      } catch (error) {
        console.error(`❌ Error buscando estudiante por ID:`, error);
        throw error;
      }
    } else {
      // Si es un nombre, buscar por nombre para obtener el ID
      console.log(`🔍 Buscando estudiante por nombre: "${studentNameOrId}"`);
      try {
        const partes = studentNameOrId.trim().split(/\s+/);
        const nombresSearch = partes.length > 0 ? partes[0] : '';
        const apellidosSearch = partes.length > 1 ? partes.slice(1).join(' ') : '';
        
        const whereConditions: any[] = [];
        if (nombresSearch) {
          whereConditions.push({ nombres: { contains: nombresSearch, mode: 'insensitive' } });
        }
        if (apellidosSearch) {
          whereConditions.push({ apellidos: { contains: apellidosSearch, mode: 'insensitive' } });
        }
        
        if (whereConditions.length === 0) {
          // Si no hay condiciones, buscar por cualquier parte del nombre
          estudiante = await prisma.estudiante.findFirst({
            where: {
              OR: [
                { nombres: { contains: studentNameOrId, mode: 'insensitive' } },
                { apellidos: { contains: studentNameOrId, mode: 'insensitive' } }
              ]
            }
          });
        } else {
          estudiante = await prisma.estudiante.findFirst({
            where: {
              AND: whereConditions
            }
          });
        }
        
        if (estudiante) {
          console.log(`✅ Estudiante encontrado por nombre (ID: ${estudiante.id})`);
          estudianteIdFinal = estudiante.id;
        } else {
          console.log(`⚠️ Estudiante no encontrado por nombre: "${studentNameOrId}"`);
        }
      } catch (error) {
        console.error(`❌ Error buscando estudiante por nombre:`, error);
        throw error;
      }
    }

    // PRIORIDAD: Buscar incidencias PRIMERO por estudianteId (más confiable)
    let incidencias: any[] = [];
    
    try {
      // Si tenemos el ID del estudiante, buscar directamente por estudianteId
      if (estudianteIdFinal) {
        console.log(`🔍 Buscando incidencias por estudianteId: ${estudianteIdFinal}`);
        console.log(`🔍 Tipo de estudianteIdFinal: ${typeof estudianteIdFinal}`);
        console.log(`🔍 Longitud de estudianteIdFinal: ${estudianteIdFinal.length}`);
        
        // Buscar primero con el ID exacto
        incidencias = await prisma.incidencia.findMany({
          where: { estudianteId: estudianteIdFinal },
          orderBy: { timestamp: 'desc' }
        });
        console.log(`📊 Encontradas ${incidencias.length} incidencias por estudianteId`);
        
        // Si no encontramos, verificar si hay algún problema con el tipo de dato
        if (incidencias.length === 0) {
          console.log(`⚠️ No se encontraron incidencias. Verificando todas las incidencias con estudianteId...`);
          const todasConEstudianteId = await prisma.incidencia.findMany({
            where: { estudianteId: { not: null } },
            take: 5
          });
          console.log(`📋 Primeras 5 incidencias con estudianteId no null:`, todasConEstudianteId.map(inc => ({
            id: inc.id,
            studentName: inc.studentName,
            estudianteId: inc.estudianteId,
            tipoEstudianteId: typeof inc.estudianteId
          })));
        }
        
        // Si no encontramos incidencias por ID, buscar también por nombre como fallback
        // (para incidencias antiguas que no tienen estudianteId asignado)
        if (incidencias.length === 0 && estudiante) {
          const nombreCompletoEstudiante = `${estudiante.nombres} ${estudiante.apellidos}`.trim();
          console.log(`⚠️ No se encontraron incidencias por ID, buscando por nombre como fallback: "${nombreCompletoEstudiante}"`);
          const incidenciasPorNombre = await prisma.incidencia.findMany({
            where: {
              OR: [
                { studentName: nombreCompletoEstudiante },
                { studentName: { contains: estudiante.nombres, mode: 'insensitive' } },
                { studentName: { contains: estudiante.apellidos, mode: 'insensitive' } }
              ]
            },
            orderBy: { timestamp: 'desc' }
          });
          console.log(`📊 Encontradas ${incidenciasPorNombre.length} incidencias por nombre (fallback)`);
          incidencias = incidenciasPorNombre;
        }
      } else if (estudiante) {
        // Si encontramos al estudiante pero no tenemos el ID (caso raro), buscar por nombre
        const nombreCompletoEstudiante = `${estudiante.nombres} ${estudiante.apellidos}`.trim();
        console.log(`🔍 Buscando incidencias por nombre: "${nombreCompletoEstudiante}"`);
        incidencias = await prisma.incidencia.findMany({
          where: {
            OR: [
              { studentName: nombreCompletoEstudiante },
              { studentName: { contains: estudiante.nombres, mode: 'insensitive' } },
              { studentName: { contains: estudiante.apellidos, mode: 'insensitive' } }
            ]
          },
          orderBy: { timestamp: 'desc' }
        });
        console.log(`📊 Encontradas ${incidencias.length} incidencias por nombre`);
      } else {
        // Si no encontramos al estudiante, buscar por el nombre original pasado
        console.log(`⚠️ Estudiante no encontrado, buscando por nombre original: "${studentNameOrId}"`);
        incidencias = await prisma.incidencia.findMany({
          where: {
            OR: [
              { studentName: studentNameOrId },
              { studentName: { contains: studentNameOrId, mode: 'insensitive' } }
            ]
          },
          orderBy: { timestamp: 'desc' }
        });
        console.log(`📊 Encontradas ${incidencias.length} incidencias por nombre original`);
      }
      
      console.log(`📊 Total incidencias encontradas: ${incidencias.length}`);
      if (incidencias.length > 0) {
        console.log(`📋 Primeras incidencias encontradas:`, incidencias.slice(0, 3).map(inc => ({
          id: inc.id,
          studentName: inc.studentName,
          estudianteId: inc.estudianteId
        })));
      } else {
        console.log(`⚠️ No se encontraron incidencias. Verificando todas las incidencias en BD...`);
        const todasIncidencias = await prisma.incidencia.findMany({ take: 10 });
        console.log(`📋 Primeras 10 incidencias en BD:`, todasIncidencias.map(inc => ({
          id: inc.id,
          studentName: inc.studentName,
          estudianteId: inc.estudianteId
        })));
        
        // Si encontramos al estudiante, buscar específicamente por su nombre
        if (estudiante) {
          const nombreCompletoEstudiante = `${estudiante.nombres} ${estudiante.apellidos}`.trim();
          console.log(`🔍 Buscando específicamente por nombre: "${nombreCompletoEstudiante}"`);
          const incidenciasPorNombre = await prisma.incidencia.findMany({
            where: { studentName: nombreCompletoEstudiante }
          });
          console.log(`📊 Incidencias encontradas por nombre exacto: ${incidenciasPorNombre.length}`);
          
          // También buscar por estudianteId
          console.log(`🔍 Buscando específicamente por estudianteId: "${estudiante.id}"`);
          const incidenciasPorId = await prisma.incidencia.findMany({
            where: { estudianteId: estudiante.id }
          });
          console.log(`📊 Incidencias encontradas por estudianteId: ${incidenciasPorId.length}`);
          
          // Buscar todas las incidencias que contengan el nombre o apellido
          console.log(`🔍 Buscando por contains en studentName...`);
          const incidenciasPorContains = await prisma.incidencia.findMany({
            where: {
              OR: [
                { studentName: { contains: estudiante.nombres, mode: 'insensitive' } },
                { studentName: { contains: estudiante.apellidos, mode: 'insensitive' } }
              ]
            }
          });
          console.log(`📊 Incidencias encontradas por contains: ${incidenciasPorContains.length}`);
          if (incidenciasPorContains.length > 0) {
            console.log(`📋 Incidencias encontradas por contains:`, incidenciasPorContains.map(inc => ({
              id: inc.id,
              studentName: inc.studentName,
              estudianteId: inc.estudianteId
            })));
            // Agregar estas incidencias a los resultados
            incidenciasPorContains.forEach(inc => {
              if (!incidencias.find(i => i.id === inc.id)) {
                incidencias.push(inc);
              }
            });
          }
          
          // Buscar también incidencias con estudianteId null pero que coincidan con el nombre
          console.log(`🔍 Buscando incidencias con estudianteId null pero nombre coincidente...`);
          const incidenciasSinId = await prisma.incidencia.findMany({
            where: {
              AND: [
                { estudianteId: null },
                {
                  OR: [
                    { studentName: { contains: estudiante.nombres, mode: 'insensitive' } },
                    { studentName: { contains: estudiante.apellidos, mode: 'insensitive' } },
                    { studentName: nombreCompletoEstudiante }
                  ]
                }
              ]
            }
          });
          console.log(`📊 Incidencias encontradas sin estudianteId pero con nombre coincidente: ${incidenciasSinId.length}`);
          if (incidenciasSinId.length > 0) {
            console.log(`📋 Incidencias sin estudianteId:`, incidenciasSinId.map(inc => ({
              id: inc.id,
              studentName: inc.studentName,
              estudianteId: inc.estudianteId
            })));
            // Agregar estas incidencias también
            incidenciasSinId.forEach(inc => {
              if (!incidencias.find(i => i.id === inc.id)) {
                incidencias.push(inc);
              }
            });
          }
          
          // Actualizar el contador después de las búsquedas adicionales
          console.log(`📊 Total incidencias después de búsquedas adicionales: ${incidencias.length}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error buscando incidencias:`, error);
      throw error;
    }

    // Mapear a formato Incidencia
    try {
      const incidenciasMapeadas = incidencias.map(inc => ({
        id: inc.id,
        studentName: inc.studentName || '',
        tipo: inc.tipo as any,
        subtipo: inc.subtipo as any,
        gravedad: inc.gravedad as any,
        descripcion: inc.descripcion || '',
        fecha: inc.fecha.toISOString().split('T')[0],
        timestamp: inc.timestamp?.getTime(),
        profesor: inc.profesor || '',
        tutor: inc.tutorNombre || undefined,
        lugar: inc.lugar || undefined,
        derivacion: inc.derivacion as any,
        resuelta: inc.resuelta || false,
        fechaResolucion: inc.fechaResolucion?.toISOString().split('T')[0],
        resueltaPor: inc.resueltaPor || undefined,
        estado: inc.estado as any,
        historialEstado: (inc.historialEstado as any) || [],
      })).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      
      console.log(`✅ Retornando ${incidenciasMapeadas.length} incidencias mapeadas`);
      return incidenciasMapeadas;
    } catch (error) {
      console.error(`❌ Error mapeando incidencias:`, error);
      throw error;
    }
  } catch (error) {
    console.error('❌ Error obteniendo incidencias completas del estudiante:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    
    // Fallback: buscar solo por nombre o ID usando getIncidencias
    try {
      console.log(`🔄 Intentando fallback para: "${studentNameOrId}"`);
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentNameOrId);
      const incidencias = await getIncidencias();
      const filtradas = incidencias.filter(inc => {
        if (isUUID) {
          // Si es un ID, buscar por estudianteId si está disponible
          return (inc as any).estudianteId === studentNameOrId;
        } else {
          // Si es un nombre, buscar por studentName
          return inc.studentName === studentNameOrId;
        }
      });
      console.log(`✅ Fallback: encontradas ${filtradas.length} incidencias`);
      return filtradas.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    } catch (fallbackError) {
      console.error('❌ Error en fallback:', fallbackError);
      // Si el fallback también falla, retornar array vacío
      return [];
    }
  }
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

// Función para corregir incidencias existentes: actualizar estudianteId y normalizar studentName
export async function corregirIncidenciasEstudiantes(): Promise<{ actualizadas: number; errores: number }> {
  try {
    console.log('🔧 Iniciando corrección de incidencias...');
    
    // Obtener todas las incidencias
    const todasIncidencias = await prisma.incidencia.findMany({
      orderBy: { timestamp: 'desc' }
    });
    
    console.log(`📊 Total de incidencias a revisar: ${todasIncidencias.length}`);
    
    let actualizadas = 0;
    let errores = 0;
    
    for (const incidencia of todasIncidencias) {
      try {
        // Si ya tiene estudianteId, verificar que el estudiante existe y el nombre está correcto
        let estudiante = null;
        
        if (incidencia.estudianteId) {
          estudiante = await prisma.estudiante.findUnique({
            where: { id: incidencia.estudianteId }
          });
          
          if (estudiante) {
            const nombreCompletoCorrecto = `${estudiante.nombres} ${estudiante.apellidos}`.trim();
            // Si el nombre no coincide, actualizarlo
            if (incidencia.studentName !== nombreCompletoCorrecto) {
              await prisma.incidencia.update({
                where: { id: incidencia.id },
                data: { studentName: nombreCompletoCorrecto }
              });
              console.log(`✅ Actualizada incidencia ${incidencia.id}: nombre "${incidencia.studentName}" -> "${nombreCompletoCorrecto}"`);
              actualizadas++;
            }
            continue; // Ya está correcta
          } else {
            // El estudianteId no existe, buscar por nombre
            console.log(`⚠️ EstudianteId ${incidencia.estudianteId} no encontrado para incidencia ${incidencia.id}, buscando por nombre...`);
          }
        }
        
        // Buscar estudiante por nombre
        if (incidencia.studentName && incidencia.studentName.trim()) {
          const partes = incidencia.studentName.trim().split(/\s+/);
          
          if (partes.length >= 2) {
            const apellidos = partes[partes.length - 1];
            const nombres = partes.slice(0, -1).join(' ');
            
            // Buscar con coincidencia exacta
            estudiante = await prisma.estudiante.findFirst({
              where: {
                nombres: nombres,
                apellidos: apellidos
              }
            });
            
            // Si no se encuentra, buscar con contains
            if (!estudiante) {
              estudiante = await prisma.estudiante.findFirst({
                where: {
                  nombres: { contains: nombres, mode: 'insensitive' },
                  apellidos: { contains: apellidos, mode: 'insensitive' }
                }
              });
            }
          } else {
            // Solo una parte, buscar en nombres o apellidos
            estudiante = await prisma.estudiante.findFirst({
              where: {
                OR: [
                  { nombres: { contains: partes[0], mode: 'insensitive' } },
                  { apellidos: { contains: partes[0], mode: 'insensitive' } }
                ]
              }
            });
          }
        }
        
        if (estudiante) {
          const nombreCompletoCorrecto = `${estudiante.nombres} ${estudiante.apellidos}`.trim();
          await prisma.incidencia.update({
            where: { id: incidencia.id },
            data: {
              estudianteId: estudiante.id,
              studentName: nombreCompletoCorrecto
            }
          });
          console.log(`✅ Corregida incidencia ${incidencia.id}: estudianteId=${estudiante.id}, nombre="${nombreCompletoCorrecto}"`);
          actualizadas++;
        } else {
          console.log(`⚠️ No se encontró estudiante para incidencia ${incidencia.id} con nombre: "${incidencia.studentName}"`);
          errores++;
        }
      } catch (error) {
        console.error(`❌ Error procesando incidencia ${incidencia.id}:`, error);
        errores++;
      }
    }
    
    console.log(`✅ Corrección completada: ${actualizadas} actualizadas, ${errores} errores`);
    return { actualizadas, errores };
  } catch (error) {
    console.error('❌ Error en corregirIncidenciasEstudiantes:', error);
    throw error;
  }
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
    // Mapear por nombre completo (nombres + apellidos)
    todosEstudiantes.forEach(est => {
      const nombreCompleto = `${est.nombres} ${est.apellidos}`.trim();
      mapEstudianteId.set(nombreCompleto, est.id);
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
    // Mapear por nombre completo (nombres + apellidos)
    todosEstudiantes.forEach(est => {
      const nombreCompleto = `${est.nombres} ${est.apellidos}`.trim();
      mapEstudianteId.set(nombreCompleto, est.id);
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

