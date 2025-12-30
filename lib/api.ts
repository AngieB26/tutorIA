/**
 * Helpers para llamar a las API routes
 * Reemplazan las llamadas directas a storage.ts
 */

// ============================================
// ESTUDIANTES
// ============================================

export async function fetchEstudiantes(grado?: string): Promise<any[]> {
  const url = grado 
    ? `/api/estudiantes?grado=${encodeURIComponent(grado)}`
    : '/api/estudiantes';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener estudiantes');
  return res.json();
}

export async function fetchEstudiante(nombre: string): Promise<any | null> {
  const res = await fetch(`/api/estudiantes?nombre=${encodeURIComponent(nombre)}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Error al obtener estudiante');
  }
  return res.json();
}

export async function fetchEstudianteById(id: string): Promise<any | null> {
  const res = await fetch(`/api/estudiantes?id=${encodeURIComponent(id)}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Error al obtener estudiante');
  }
  return res.json();
}

export async function saveEstudiante(estudiante: any, estudianteId?: string): Promise<void> {
  const url = estudianteId 
    ? `/api/estudiantes?estudianteId=${encodeURIComponent(estudianteId)}`
    : '/api/estudiantes';
  
  console.log('📤 Enviando petición a:', url);
  console.log('📦 Datos del estudiante:', JSON.stringify(estudiante, null, 2));
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(estudiante),
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error('❌ Error en respuesta del servidor:', {
      status: res.status,
      statusText: res.statusText,
      body: errorText
    });
    let errorMessage = 'Error al guardar estudiante';
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorMessage;
    } catch (e) {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  
  const result = await res.json();
  console.log('✅ Respuesta del servidor:', result);
}

export async function saveEstudiantes(estudiantes: any[]): Promise<void> {
  const res = await fetch('/api/estudiantes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(estudiantes),
  });
  if (!res.ok) throw new Error('Error al guardar estudiantes');
}

// Alias para compatibilidad
export async function saveEstudiantesInfo(estudiantes: any[]): Promise<void> {
  return saveEstudiantes(estudiantes);
}

export async function deleteEstudiante(nombre: string): Promise<void> {
  const res = await fetch(`/api/estudiantes?nombre=${encodeURIComponent(nombre)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Error al eliminar estudiante');
}

// ============================================
// INCIDENCIAS
// ============================================

export async function fetchIncidencias(params?: {
  studentName?: string;
  fechaInicio?: string;
  fechaFin?: string;
  gravedad?: string;
  tipo?: string;
  tipoDerivacion?: string;
  completas?: boolean;
}): Promise<any[]> {
  const searchParams = new URLSearchParams();
  if (params?.studentName) searchParams.set('studentName', params.studentName);
  if (params?.fechaInicio) searchParams.set('fechaInicio', params.fechaInicio);
  if (params?.fechaFin) searchParams.set('fechaFin', params.fechaFin);
  if (params?.gravedad) searchParams.set('gravedad', params.gravedad);
  if (params?.tipo) searchParams.set('tipo', params.tipo);
  if (params?.tipoDerivacion) searchParams.set('tipoDerivacion', params.tipoDerivacion);
  if (params?.completas) searchParams.set('completas', 'true');

  const url = `/api/incidencias${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener incidencias');
  return res.json();
}

export async function addIncidencia(incidencia: Omit<any, 'id' | 'timestamp'>): Promise<any> {
  const res = await fetch('/api/incidencias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(incidencia),
  });
  if (!res.ok) throw new Error('Error al agregar incidencia');
  return res.json();
}

export async function saveIncidencias(incidencias: any[]): Promise<void> {
  const res = await fetch('/api/incidencias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(incidencias),
  });
  if (!res.ok) throw new Error('Error al guardar incidencias');
}

export async function cambiarEstadoIncidencia(
  id: string,
  nuevoEstado: string,
  usuario: string
): Promise<void> {
  const res = await fetch(`/api/incidencias?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nuevoEstado, usuario }),
  });
  if (!res.ok) throw new Error('Error al cambiar estado de incidencia');
}

export async function marcarIncidenciaResuelta(id: string, resueltaPor: string = 'Director'): Promise<void> {
  const res = await fetch(`/api/incidencias?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resuelta: true, resueltaPor }),
  });
  if (!res.ok) throw new Error('Error al marcar incidencia como resuelta');
}

// ============================================
// TUTORES
// ============================================

export async function fetchTutores(): Promise<any[]> {
  const res = await fetch('/api/tutores');
  if (!res.ok) throw new Error('Error al obtener tutores');
  return res.json();
}

export async function saveTutores(tutores: any[]): Promise<void> {
  const res = await fetch('/api/tutores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tutores),
  });
  if (!res.ok) throw new Error('Error al guardar tutores');
}

export async function updateTutor(tutor: any): Promise<void> {
  const res = await fetch('/api/tutores', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tutor),
  });
  if (!res.ok) throw new Error('Error al actualizar profesor');
}

export async function deleteTutor(id: string): Promise<void> {
  const res = await fetch(`/api/tutores?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Error al eliminar profesor');
}

// ============================================
// NOTAS
// ============================================

export async function fetchNotas(studentName?: string): Promise<any[]> {
  const url = studentName
    ? `/api/notas?studentName=${encodeURIComponent(studentName)}`
    : '/api/notas';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener notas');
  return res.json();
}

export async function saveNotas(notas: any[]): Promise<void> {
  const res = await fetch('/api/notas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notas),
  });
  if (!res.ok) throw new Error('Error al guardar notas');
}

// ============================================
// CLASES
// ============================================

export async function fetchClases(params?: {
  profesor?: string;
  grado?: string;
  seccion?: string;
}): Promise<any[]> {
  const searchParams = new URLSearchParams();
  if (params?.profesor) searchParams.set('profesor', params.profesor);
  if (params?.grado) searchParams.set('grado', params.grado);
  if (params?.seccion) searchParams.set('seccion', params.seccion);

  const url = `/api/clases${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener clases');
  return res.json();
}

export async function saveClases(clases: any[]): Promise<void> {
  const res = await fetch('/api/clases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clases),
  });
  if (!res.ok) throw new Error('Error al guardar clases');
}

export async function addClase(clase: Omit<any, 'id'>): Promise<any> {
  const res = await fetch('/api/clases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clase),
  });
  if (!res.ok) throw new Error('Error al agregar clase');
  return res.json();
}

// ============================================
// TUTORES GRADO SECCIÓN
// ============================================

export async function fetchTutoresGradoSeccion(params?: {
  grado?: string;
  seccion?: string;
  tutorId?: string;
}): Promise<any[]> {
  const searchParams = new URLSearchParams();
  if (params?.grado) searchParams.set('grado', params.grado);
  if (params?.seccion) searchParams.set('seccion', params.seccion);
  if (params?.tutorId) searchParams.set('tutorId', params.tutorId);

  const url = `/api/tutores-grado-seccion${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener tutores grado sección');
  const data = await res.json();
  // Si es un objeto único, retornar en array
  return Array.isArray(data) ? data : (data ? [data] : []);
}

export async function getTutorGradoSeccion(grado: string, seccion: string): Promise<any | null> {
  const res = await fetch(`/api/tutores-grado-seccion?grado=${encodeURIComponent(grado)}&seccion=${encodeURIComponent(seccion)}`);
  if (!res.ok) throw new Error('Error al obtener tutor grado sección');
  return res.json();
}

export async function getSeccionByTutorId(tutorId: string): Promise<any | null> {
  const res = await fetch(`/api/tutores-grado-seccion?tutorId=${encodeURIComponent(tutorId)}`);
  if (!res.ok) throw new Error('Error al obtener sección por tutor ID');
  return res.json();
}

export async function setTutorGradoSeccion(
  grado: string,
  seccion: string,
  tutorId: string,
  tutorNombre: string
): Promise<void> {
  const res = await fetch('/api/tutores-grado-seccion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'set',
      grado,
      seccion,
      tutorId,
      tutorNombre,
    }),
  });
  if (!res.ok) throw new Error('Error al asignar tutor a grado/sección');
}

export async function removeTutorGradoSeccion(grado: string, seccion: string): Promise<void> {
  const res = await fetch('/api/tutores-grado-seccion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'remove',
      grado,
      seccion,
    }),
  });
  if (!res.ok) throw new Error('Error al remover tutor de grado/sección');
}

export async function saveTutoresGradoSeccion(tutores: any[]): Promise<void> {
  const res = await fetch('/api/tutores-grado-seccion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tutores),
  });
  if (!res.ok) throw new Error('Error al guardar tutores grado sección');
}

export async function getTutoresGradoSeccion(): Promise<any[]> {
  return fetchTutoresGradoSeccion();
}

// ============================================
// ASISTENCIA
// ============================================

export async function fetchAsistenciaClases(): Promise<any[]> {
  const res = await fetch('/api/asistencia');
  if (!res.ok) throw new Error('Error al obtener asistencia');
  return res.json();
}

export async function getAsistenciaClasesByFilters(params: {
  fecha?: string;
  claseId?: string;
  profesor?: string;
  grado?: string;
  seccion?: string;
  dia?: string;
  periodo?: number;
}): Promise<any[]> {
  const searchParams = new URLSearchParams();
  if (params.fecha) searchParams.set('fecha', params.fecha);
  if (params.claseId) searchParams.set('claseId', params.claseId);
  if (params.profesor) searchParams.set('profesor', params.profesor);
  if (params.grado) searchParams.set('grado', params.grado);
  if (params.seccion) searchParams.set('seccion', params.seccion);
  if (params.dia) searchParams.set('dia', params.dia);
  if (typeof params.periodo === 'number') searchParams.set('periodo', params.periodo.toString());

  const url = `/api/asistencia${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener asistencia por filtros');
  return res.json();
}

export async function addRegistroAsistenciaClase(registro: Omit<any, 'id' | 'timestamp'>): Promise<any> {
  const res = await fetch('/api/asistencia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registro),
  });
  if (!res.ok) throw new Error('Error al guardar asistencia');
  return res.json();
}

export async function saveAsistenciaClases(registros: any[]): Promise<void> {
  const res = await fetch('/api/asistencia', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registros),
  });
  if (!res.ok) throw new Error('Error al guardar asistencias');
}

export async function findRegistroAsistencia(fecha: string, claseId: string, periodo: number): Promise<any | undefined> {
  const res = await fetch(`/api/asistencia?fecha=${encodeURIComponent(fecha)}&claseId=${encodeURIComponent(claseId)}&periodo=${periodo}`);
  if (!res.ok) {
    if (res.status === 404) return undefined;
    throw new Error('Error al buscar registro de asistencia');
  }
  const registros = await res.json();
  return registros.length > 0 ? registros[0] : undefined;
}

// ============================================
// HELPERS DE INCIDENCIAS
// ============================================

export async function getIncidenciasDerivadas(tipoDerivacion?: string): Promise<any[]> {
  const url = tipoDerivacion
    ? `/api/incidencias/helpers?action=derivadas&tipo=${encodeURIComponent(tipoDerivacion)}`
    : '/api/incidencias/helpers?action=derivadas';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener incidencias derivadas');
  return res.json();
}

export async function getListaEstudiantes(): Promise<any[]> {
  const res = await fetch('/api/incidencias/helpers?action=lista-estudiantes');
  if (!res.ok) throw new Error('Error al obtener lista de estudiantes');
  return res.json();
}

export async function getIncidenciasCompletasByStudent(studentName: string): Promise<any[]> {
  const url = `/api/incidencias/helpers?action=completas&studentName=${encodeURIComponent(studentName)}`;
  console.log(`🌐 Frontend: Llamando a API: ${url}`);
  const res = await fetch(url);
  console.log(`🌐 Frontend: Respuesta de API - status: ${res.status}, ok: ${res.ok}`);
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`❌ Frontend: Error en respuesta de API:`, errorText);
    throw new Error('Error al obtener incidencias completas del estudiante');
  }
  const data = await res.json();
  console.log(`🌐 Frontend: Datos recibidos de API:`, data);
  console.log(`🌐 Frontend: Tipo de datos:`, Array.isArray(data) ? 'Array' : typeof data);
  console.log(`🌐 Frontend: Cantidad de incidencias:`, Array.isArray(data) ? data.length : 'No es array');
  return data;
}

export async function corregirIncidenciasEstudiantes(): Promise<{ actualizadas: number; errores: number }> {
  const res = await fetch('/api/incidencias/corregir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Error al corregir incidencias');
  const data = await res.json();
  return { actualizadas: data.actualizadas, errores: data.errores };
}

// ============================================
// GRADOS Y SECCIONES
// ============================================

export async function getGrados(): Promise<string[]> {
  try {
    const res = await fetch('/api/grados');
    if (!res.ok) {
      // Valores por defecto si hay error
      return ['1ro', '2do', '3ro', '4to', '5to'];
    }
    return res.json();
  } catch (error) {
    console.error('Error obteniendo grados:', error);
    // Valores por defecto si hay error
    return ['1ro', '2do', '3ro', '4to', '5to'];
  }
}

export async function saveGrados(grados: string[]): Promise<void> {
  try {
    const res = await fetch('/api/grados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(grados),
    });
    if (!res.ok) throw new Error('Error al guardar grados');
  } catch (error) {
    console.error('Error guardando grados:', error);
    throw error;
  }
}

export async function getSecciones(): Promise<string[]> {
  try {
    const res = await fetch('/api/secciones');
    if (!res.ok) {
      // Valores por defecto si hay error
      return ['A', 'B', 'C'];
    }
    return res.json();
  } catch (error) {
    console.error('Error obteniendo secciones:', error);
    // Valores por defecto si hay error
    return ['A', 'B', 'C'];
  }
}

export async function saveSecciones(secciones: string[]): Promise<void> {
  try {
    const res = await fetch('/api/secciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(secciones),
    });
    if (!res.ok) throw new Error('Error al guardar secciones');
  } catch (error) {
    console.error('Error guardando secciones:', error);
    throw error;
  }
}

// ============================================
// ESTUDIANTES ATENDIDOS
// ============================================

export async function getEstudiantesAtendidos(): Promise<any[]> {
  const res = await fetch('/api/estudiantes-atendidos');
  if (!res.ok) throw new Error('Error al obtener estudiantes atendidos');
  return res.json();
}

export async function marcarEstudianteAtendido(nombre: string, fecha: string, profesor: string): Promise<void> {
  const res = await fetch('/api/estudiantes-atendidos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, fecha, profesor }),
  });
  if (!res.ok) throw new Error('Error al marcar estudiante como atendido');
}

export async function esEstudianteAtendido(nombre: string, profesor: string, fecha?: string): Promise<boolean> {
  const queryParams = new URLSearchParams();
  queryParams.append('nombre', nombre);
  queryParams.append('profesor', profesor);
  if (fecha) queryParams.append('fecha', fecha);
  
  const res = await fetch(`/api/estudiantes-atendidos/verificar?${queryParams.toString()}`);
  if (!res.ok) return false;
  const data = await res.json();
  return data.atendido || false;
}

export async function getEstudiantesAtendidosByProfesor(profesor: string, fecha?: string): Promise<any[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('profesor', profesor);
  if (fecha) queryParams.append('fecha', fecha);
  
  const res = await fetch(`/api/estudiantes-atendidos?${queryParams.toString()}`);
  if (!res.ok) throw new Error('Error al obtener estudiantes atendidos por profesor');
  return res.json();
}

