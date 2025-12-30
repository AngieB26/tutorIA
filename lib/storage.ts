import { EstadoIncidencia } from './types';
/**
 * Cambia el estado de una incidencia y registra el cambio en el historial.
 * @param id ID de la incidencia
 * @param nuevoEstado Nuevo estado ('Pendiente', 'En revisión', 'Resuelta', 'Cerrada')
 * @param usuario Usuario que realiza el cambio
 */
export function cambiarEstadoIncidencia(id: string, nuevoEstado: EstadoIncidencia, usuario: string): void {
  const incidencias = getIncidencias();
  const index = incidencias.findIndex(inc => inc.id === id);
  if (index !== -1) {
    incidencias[index].estado = nuevoEstado;
    if (!incidencias[index].historialEstado) {
      incidencias[index].historialEstado = [];
    }
    incidencias[index].historialEstado.push({
      estado: nuevoEstado,
      fecha: new Date().toISOString(),
      usuario
    });
    saveIncidencias(incidencias);
  }
}
import { Incidencia, Nota, EstudianteInfo, TipoDerivacion, Tutor, Clase, RegistroAsistenciaClase, DiaSemana, TutorGradoSeccion } from './types';

const STORAGE_KEY = 'tutoria_incidencias';
const NOTAS_STORAGE_KEY = 'tutoria_notas';
const ESTUDIANTES_STORAGE_KEY = 'tutoria_estudiantes';
const TUTORES_STORAGE_KEY = 'tutoria_tutores';
const CLASES_STORAGE_KEY = 'tutoria_clases';
const ASISTENCIA_CLASES_STORAGE_KEY = 'tutoria_asistencia_clases';
const GRADOS_STORAGE_KEY = 'tutoria_grados';
const SECCIONES_STORAGE_KEY = 'tutoria_secciones';
const TUTORES_GRADO_SECCION_STORAGE_KEY = 'tutoria_tutores_grado_seccion';

export function getIncidencias(): Incidencia[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return [];
  }
}

export function saveIncidencias(incidencias: Incidencia[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(incidencias));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

export function addIncidencia(incidencia: Omit<Incidencia, 'id' | 'timestamp'>): Incidencia {
  const incidencias = getIncidencias();
  const newIncidencia: Incidencia = {
    ...incidencia,
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
  };
  incidencias.push(newIncidencia);
  saveIncidencias(incidencias);
  return newIncidencia;
}

export function getIncidenciasByStudent(studentName: string): Incidencia[] {
  const incidencias = getIncidencias();
  return incidencias
    .filter(inc => inc.studentName.toLowerCase().includes(studentName.toLowerCase()))
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

export function getIncidenciasByDateRange(fechaInicio: string, fechaFin: string): Incidencia[] {
  const incidencias = getIncidencias();
  // Normalizar fechas para comparar solo la parte de fecha (sin hora)
  const inicio = new Date(fechaInicio + 'T00:00:00').getTime();
  const fin = new Date(fechaFin + 'T23:59:59').getTime();
  
  return incidencias
    .filter(inc => {
      const fechaInc = new Date(inc.fecha + 'T00:00:00').getTime();
      return fechaInc >= inicio && fechaInc <= fin;
    })
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

export function getIncidenciasByGravedad(gravedad?: 'grave' | 'moderada' | 'leve' | 'todas'): Incidencia[] {
  const incidencias = getIncidencias();
  if (!gravedad || gravedad === 'todas') {
    return incidencias.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }
  return incidencias
    .filter(inc => inc.gravedad === gravedad)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

export function getIncidenciasByFiltros(
  gravedad?: 'grave' | 'moderada' | 'leve' | 'todas',
  tipo?: 'ausencia' | 'tardanza' | 'conducta' | 'academica' | 'positivo' | 'todas'
): Incidencia[] {
  let incidencias = getIncidencias();
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

export function getIncidenciasDerivadas(tipoDerivacion?: TipoDerivacion): Incidencia[] {
  const incidencias = getIncidencias();
  const derivadas = incidencias
    .filter(inc => {
      // Incluir todas las incidencias no resueltas (nuevas)
      const noResuelta = !inc.resuelta;
      
      // Si se especifica un tipo de derivación, filtrar por ese tipo
      // Si no se especifica, mostrar todas las incidencias no resueltas
      if (tipoDerivacion) {
        // Si hay filtro de tipo, solo mostrar las que coinciden con ese tipo
        const coincideTipo = inc.derivacion === tipoDerivacion;
        return noResuelta && coincideTipo;
      } else {
        // Sin filtro de tipo: mostrar todas las incidencias no resueltas
        return noResuelta;
      }
    })
    .sort((a, b) => {
      // Ordenar por fecha más reciente primero
      const fechaA = a.timestamp ? new Date(a.timestamp).getTime() : new Date(a.fecha).getTime();
      const fechaB = b.timestamp ? new Date(b.timestamp).getTime() : new Date(b.fecha).getTime();
      return fechaB - fechaA;
    });
  console.log('Total incidencias:', incidencias.length, 'Derivadas encontradas:', derivadas.length);
  return derivadas;
}

export function marcarIncidenciaResuelta(id: string, resueltaPor: string = 'Director'): void {
  const incidencias = getIncidencias();
  const index = incidencias.findIndex(inc => inc.id === id);
  if (index !== -1) {
    incidencias[index].resuelta = true;
    incidencias[index].fechaResolucion = new Date().toISOString().split('T')[0];
    incidencias[index].resueltaPor = resueltaPor;
    saveIncidencias(incidencias);
  }
}

export function getListaEstudiantes(): Array<{ nombre: string; totalIncidencias: number; ultimaIncidencia: string }> {
  const incidencias = getIncidencias();
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

export function getIncidenciasCompletasByStudent(studentName: string): Incidencia[] {
  const incidencias = getIncidencias();
  return incidencias
    .filter(inc => inc.studentName === studentName)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

// Funciones para Notas
export function getNotas(): Nota[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(NOTAS_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading notas from localStorage:', error);
    return [];
  }
}

export function saveNotas(notas: Nota[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTAS_STORAGE_KEY, JSON.stringify(notas));
  } catch (error) {
    console.error('Error saving notas to localStorage:', error);
  }
}

export function getNotasByStudent(studentName: string): Nota[] {
  const notas = getNotas();
  return notas
    .filter(nota => nota.studentName === studentName)
    .sort((a, b) => {
      const periodoOrder = { 'Q1': 1, 'Q2': 2, 'Q3': 3, 'Q4': 4 };
      const periodoA = (typeof a === 'object' && 'periodo' in a && typeof a.periodo === 'string') ? periodoOrder[a.periodo as keyof typeof periodoOrder] || 0 : 0;
      const periodoB = (typeof b === 'object' && 'periodo' in b && typeof b.periodo === 'string') ? periodoOrder[b.periodo as keyof typeof periodoOrder] || 0 : 0;
      const periodoDiff = periodoA - periodoB;
      if (periodoDiff !== 0) return periodoDiff;
      return a.materia.localeCompare(b.materia);
    });
}

// Funciones para Información de Estudiantes
export function getEstudiantesInfo(): EstudianteInfo[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(ESTUDIANTES_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading estudiantes info from localStorage:', error);
    return [];
  }
}

export function saveEstudiantesInfo(estudiantes: EstudianteInfo[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ESTUDIANTES_STORAGE_KEY, JSON.stringify(estudiantes));
  } catch (error) {
    console.error('Error saving estudiantes info to localStorage:', error);
  }
}

export function getEstudianteInfo(nombre: string): EstudianteInfo | null {
  const estudiantes = getEstudiantesInfo();
  return estudiantes.find(e => e.nombre === nombre) || null;
}

export function getEstudiantesByGrado(grado?: string): EstudianteInfo[] {
  const estudiantes = getEstudiantesInfo();
  if (!grado) return estudiantes;
  return estudiantes.filter(e => e.grado === grado);
}

// Funciones para Tutores
export function getTutores(): Tutor[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(TUTORES_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading tutores from localStorage:', error);
    return [];
  }
}

export function saveTutores(tutores: Tutor[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TUTORES_STORAGE_KEY, JSON.stringify(tutores));
  } catch (error) {
    console.error('Error saving tutores to localStorage:', error);
  }
}

export function seedInitialData(): void {
  if (typeof window === 'undefined') return;
  
  // Verificar si ya hay estudiantes
  const existingEstudiantes = getEstudiantesInfo();
  const existingIncidencias = getIncidencias();
  const existingTutores = getTutores();
  const existingNotas = getNotas();
  const existingClases = getClases();
  const existingAsistenciaClases = getAsistenciaClases();
  
  // Verificar si hay incidencias derivadas pendientes
  const incidenciasDerivadasPendientes = existingIncidencias.filter(inc => 
    inc.derivacion && inc.derivacion !== 'ninguna' && !inc.resuelta
  );
  
  // Seedear incidencias solo si no existen
  if (existingIncidencias.length === 0) {
    console.log('Ejecutando seed data de incidencias...', {
      totalIncidencias: existingIncidencias.length,
      derivadasPendientes: incidenciasDerivadasPendientes.length
    });
    const seedData: Incidencia[] = [
    // Juan Pérez - 3ro A
    {
      id: '1',
      studentName: 'Juan Pérez',
      tipo: 'ausencia',
      gravedad: 'moderada',
      descripcion: 'No asistió a clase sin justificación',
      fecha: '2024-12-02',
      profesor: 'Prof. García',
      tutor: 'Prof. García',
      lugar: 'Aula 301',
      timestamp: new Date('2024-12-02').getTime(),
      derivacion: 'director',
      resuelta: false,
      estado: 'Pendiente',
      historialEstado: [
        { estado: 'Pendiente', fecha: new Date('2024-12-02').toISOString(), usuario: 'system' }
      ]
    },
    {
      id: '2',
      studentName: 'Juan Pérez',
      tipo: 'ausencia',
      gravedad: 'grave',
      descripcion: 'Falta sin justificar por tercera vez este mes',
      fecha: '2024-12-09',
      profesor: 'Prof. García',
      tutor: 'Prof. García',
      lugar: 'Aula 301',
      timestamp: new Date('2024-12-09').getTime(),
      derivacion: 'psicologia',
      resuelta: false,
      estado: 'Pendiente',
      historialEstado: [
        { estado: 'Pendiente', fecha: new Date('2024-12-09').toISOString(), usuario: 'system' }
      ]
    },
    {
      id: '3',
      studentName: 'Juan Pérez',
      tipo: 'positivo',
      subtipo: 'ayuda_companero',
      gravedad: 'leve',
      descripcion: 'Ayudó a compañero en matemáticas durante la clase',
      fecha: '2024-12-05',
      profesor: 'Prof. López',
      tutor: 'Prof. López',
      lugar: 'Aula 205',
      timestamp: new Date('2024-12-05').getTime(),
      derivacion: 'ninguna',
      estado: 'Pendiente',
      historialEstado: [
        { estado: 'Pendiente', fecha: new Date('2024-12-05').toISOString(), usuario: 'system' }
      ]
    },
    // María López - 2do A
    {
      id: '4',
      studentName: 'María López',
      tipo: 'academica',
      gravedad: 'moderada',
      descripcion: 'No entregó tarea de ciencias',
      fecha: '2024-12-03',
      profesor: 'Prof. Fernández',
      tutor: 'Prof. Fernández',
      lugar: 'Aula 102',
      timestamp: new Date('2024-12-03').getTime(),
      derivacion: 'coordinacion',
      resuelta: false,
      estado: 'Pendiente',
      historialEstado: [
        { estado: 'Pendiente', fecha: new Date('2024-12-03').toISOString(), usuario: 'system' }
      ]
    },
    {
      id: '5',
      studentName: 'María López',
      tipo: 'academica',
      gravedad: 'leve',
      descripcion: 'Tarea incompleta',
      fecha: '2024-12-10',
      profesor: 'Prof. Fernández',
      tutor: 'Prof. Fernández',
      lugar: 'Aula 102',
      timestamp: new Date('2024-12-10').getTime(),
      derivacion: 'ninguna',
      estado: 'Pendiente',
      historialEstado: [
        { estado: 'Pendiente', fecha: new Date('2024-12-10').toISOString(), usuario: 'system' }
      ]
    },
    // Carlos Ruiz - 4to A
    {
      id: '6',
      studentName: 'Carlos Ruiz',
      tipo: 'positivo',
      subtipo: 'participacion',
      gravedad: 'leve',
      descripcion: 'Excelente participación en clase de historia',
      fecha: '2024-12-08',
      profesor: 'Prof. Torres',
      tutor: 'Prof. Torres',
      lugar: 'Aula 401',
      timestamp: new Date('2024-12-08').getTime(),
      derivacion: 'ninguna',
      estado: 'Pendiente',
      historialEstado: [
        { estado: 'Pendiente', fecha: new Date('2024-12-08').toISOString(), usuario: 'system' }
      ]
    },
    {
      id: '7',
      studentName: 'Carlos Ruiz',
      tipo: 'conducta',
      subtipo: 'interrupcion',
      gravedad: 'moderada',
      descripcion: 'Interrumpió clase repetidamente',
      fecha: '2024-12-11',
      profesor: 'Prof. Torres',
      tutor: 'Prof. Torres',
      lugar: 'Aula 401',
      timestamp: new Date('2024-12-11').getTime(),
      derivacion: 'psicologia',
      resuelta: false,
      estado: 'Pendiente',
      historialEstado: [
        { estado: 'Pendiente', fecha: new Date('2024-12-11').toISOString(), usuario: 'system' }
      ]
    },
    // Ana García - 1ro A
    {
      id: '8',
      studentName: 'Ana García',
      tipo: 'ausencia',
      gravedad: 'leve',
      descripcion: 'Ausencia justificada por enfermedad',
      fecha: '2024-12-01',
      profesor: 'Prof. Martínez',
      tutor: 'Prof. Martínez',
      lugar: 'Aula 101',
      timestamp: new Date('2024-12-01').getTime(),
      derivacion: 'enfermeria',
      resuelta: false,
      estado: 'Pendiente',
      historialEstado: [
        { estado: 'Pendiente', fecha: new Date('2024-12-01').toISOString(), usuario: 'system' }
      ]
    },
    {
      id: '9',
      studentName: 'Ana García',
      tipo: 'positivo',
      subtipo: 'liderazgo',
      gravedad: 'leve',
      descripcion: 'Lideró el proyecto grupal de manera excelente',
      fecha: '2024-12-07',
      profesor: 'Prof. Ramírez',
      tutor: 'Prof. Ramírez',
      lugar: 'Aula 103',
      timestamp: new Date('2024-12-07').getTime(),
      derivacion: 'ninguna',
      estado: 'Pendiente',
      historialEstado: [
        { estado: 'Pendiente', fecha: new Date('2024-12-07').toISOString(), usuario: 'system' }
      ]
    },
    // Diego Fernández - 2do A
    {
      id: '10',
      studentName: 'Diego Fernández',
      tipo: 'conducta',
      subtipo: 'agresion',
      gravedad: 'grave',
      descripcion: 'Agresión física hacia un compañero',
      fecha: '2024-12-04',
      profesor: 'Prof. García',
      tutor: 'Prof. García',
      lugar: 'Patio',
      timestamp: new Date('2024-12-04').getTime(),
      derivacion: 'director',
      resuelta: false,
      estado: 'Pendiente',
      historialEstado: [
        { estado: 'Pendiente', fecha: new Date('2024-12-04').toISOString(), usuario: 'system' }
      ]
    },
    // Isabella Sánchez - 3ro A
    {
      id: '11',
      studentName: 'Isabella Sánchez',
      tipo: 'academica',
      gravedad: 'moderada',
      descripcion: 'No presentó examen parcial',
      fecha: '2024-12-06',
      profesor: 'Prof. López',
      tutor: 'Prof. López',
      lugar: 'Aula 205',
      timestamp: new Date('2024-12-06').getTime(),
      derivacion: 'coordinacion',
      resuelta: false,
      estado: 'Pendiente',
      historialEstado: [
        { estado: 'Pendiente', fecha: new Date('2024-12-06').toISOString(), usuario: 'system' }
      ]
    },
    {
      id: '12',
      studentName: 'Isabella Sánchez',
      tipo: 'positivo',
      subtipo: 'creatividad',
      gravedad: 'leve',
      descripcion: 'Proyecto creativo destacado en arte',
      fecha: '2024-12-12',
      profesor: 'Prof. Ramírez',
      tutor: 'Prof. Ramírez',
      lugar: 'Aula 103',
      timestamp: new Date('2024-12-12').getTime(),
      derivacion: 'ninguna',
      estado: 'Pendiente',
      historialEstado: [
        { estado: 'Pendiente', fecha: new Date('2024-12-12').toISOString(), usuario: 'system' }
      ]
    },
    // Camila Herrera - 4to A
    {
      id: '13',
      studentName: 'Camila Herrera',
      tipo: 'conducta',
      subtipo: 'falta_respeto',
      gravedad: 'moderada',
      descripcion: 'Falta de respeto hacia el profesor',
      fecha: '2024-12-13',
      profesor: 'Prof. Torres',
      tutor: 'Prof. Torres',
      lugar: 'Aula 401',
      timestamp: new Date('2024-12-13').getTime(),
      derivacion: 'orientacion',
      resuelta: false,
      estado: 'Pendiente',
      historialEstado: [
        { estado: 'Pendiente', fecha: new Date('2024-12-13').toISOString(), usuario: 'system' }
      ]
    },
    // Natalia Jiménez - 5to A
    {
      id: '14',
      studentName: 'Natalia Jiménez',
      tipo: 'positivo',
      subtipo: 'participacion',
      gravedad: 'leve',
      descripcion: 'Participación destacada en debate escolar',
      fecha: '2024-12-14',
      profesor: 'Prof. Fernández',
      tutor: 'Prof. Fernández',
      lugar: 'Aula 102',
      timestamp: new Date('2024-12-14').getTime(),
      derivacion: 'ninguna',
      estado: 'Pendiente',
      historialEstado: [
        { estado: 'Pendiente', fecha: new Date('2024-12-14').toISOString(), usuario: 'system' }
      ]
    },
    // Andrés Castro - 5to A
    {
      id: '15',
      studentName: 'Andrés Castro',
      tipo: 'ausencia',
      gravedad: 'moderada',
      descripcion: 'Ausencia sin justificar',
      fecha: '2024-12-15',
      profesor: 'Prof. García',
      tutor: 'Prof. García',
      lugar: 'Aula 301',
      timestamp: new Date('2024-12-15').getTime(),
      derivacion: 'director',
      resuelta: false,
      estado: 'Pendiente',
      historialEstado: [
        { estado: 'Pendiente', fecha: new Date('2024-12-15').toISOString(), usuario: 'system' }
      ]
    },
  ];
  
    saveIncidencias(seedData);
  }
  
  // Seed datos de estudiantes (más estudiantes por grado)
  if (existingEstudiantes.length === 0) {
  const estudiantesInfo: EstudianteInfo[] = [
    // 1ro Grado
    { nombre: 'Ana García', grado: '1ro', seccion: 'A', edad: 12, fechaNacimiento: '2012-05-15', contacto: { tutor: 'Pedro García', telefono: '555-1001', email: 'pedro.garcia@email.com' } },
    { nombre: 'Luis Martínez', grado: '1ro', seccion: 'A', edad: 12, fechaNacimiento: '2012-08-20', contacto: { tutor: 'Carmen Martínez', telefono: '555-1002', email: 'carmen.martinez@email.com' } },
    { nombre: 'Sofía Rodríguez', grado: '1ro', seccion: 'B', edad: 12, fechaNacimiento: '2012-03-10', contacto: { tutor: 'Miguel Rodríguez', telefono: '555-1003', email: 'miguel.rodriguez@email.com' } },
    { nombre: 'Daniel Vargas', grado: '1ro', seccion: 'B', edad: 12, fechaNacimiento: '2012-11-25', contacto: { tutor: 'Elena Vargas', telefono: '555-1004', email: 'elena.vargas@email.com' } },
    // 2do Grado
    { nombre: 'María López', grado: '2do', seccion: 'A', edad: 13, fechaNacimiento: '2011-07-18', contacto: { tutor: 'Carlos López', telefono: '555-2001', email: 'carlos.lopez@email.com' } },
    { nombre: 'Diego Fernández', grado: '2do', seccion: 'A', edad: 13, fechaNacimiento: '2011-09-12', contacto: { tutor: 'Laura Fernández', telefono: '555-2002', email: 'laura.fernandez@email.com' } },
    { nombre: 'Valentina Torres', grado: '2do', seccion: 'B', edad: 13, fechaNacimiento: '2011-04-30', contacto: { tutor: 'Roberto Torres', telefono: '555-2003', email: 'roberto.torres@email.com' } },
    { nombre: 'Alejandro Silva', grado: '2do', seccion: 'B', edad: 13, fechaNacimiento: '2011-12-05', contacto: { tutor: 'Patricia Silva', telefono: '555-2004', email: 'patricia.silva@email.com' } },
    // 3ro Grado
    { nombre: 'Juan Pérez', grado: '3ro', seccion: 'A', edad: 14, fechaNacimiento: '2010-06-22', contacto: { tutor: 'María Pérez', telefono: '555-3001', email: 'maria.perez@email.com' } },
    { nombre: 'Isabella Sánchez', grado: '3ro', seccion: 'A', edad: 14, fechaNacimiento: '2010-02-14', contacto: { tutor: 'Jorge Sánchez', telefono: '555-3002', email: 'jorge.sanchez@email.com' } },
    { nombre: 'Mateo González', grado: '3ro', seccion: 'B', edad: 14, fechaNacimiento: '2010-10-08', contacto: { tutor: 'Patricia González', telefono: '555-3003', email: 'patricia.gonzalez@email.com' } },
    { nombre: 'Lucía Ramírez', grado: '3ro', seccion: 'B', edad: 14, fechaNacimiento: '2010-01-19', contacto: { tutor: 'Fernando Ramírez', telefono: '555-3004', email: 'fernando.ramirez@email.com' } },
    // 4to Grado
    { nombre: 'Carlos Ruiz', grado: '4to', seccion: 'A', edad: 15, fechaNacimiento: '2009-08-03', contacto: { tutor: 'Ana Ruiz', telefono: '555-4001', email: 'ana.ruiz@email.com' } },
    { nombre: 'Camila Herrera', grado: '4to', seccion: 'A', edad: 15, fechaNacimiento: '2009-05-17', contacto: { tutor: 'Fernando Herrera', telefono: '555-4002', email: 'fernando.herrera@email.com' } },
    { nombre: 'Sebastián Morales', grado: '4to', seccion: 'B', edad: 15, fechaNacimiento: '2009-11-28', contacto: { tutor: 'Diana Morales', telefono: '555-4003', email: 'diana.morales@email.com' } },
    { nombre: 'Gabriela Castro', grado: '4to', seccion: 'B', edad: 15, fechaNacimiento: '2009-03-09', contacto: { tutor: 'Roberto Castro', telefono: '555-4004', email: 'roberto.castro@email.com' } },
    // 5to Grado
    { nombre: 'Natalia Jiménez', grado: '5to', seccion: 'A', edad: 16, fechaNacimiento: '2008-07-21', contacto: { tutor: 'Alberto Jiménez', telefono: '555-5001', email: 'alberto.jimenez@email.com' } },
    { nombre: 'Andrés Castro', grado: '5to', seccion: 'A', edad: 16, fechaNacimiento: '2008-09-14', contacto: { tutor: 'Mónica Castro', telefono: '555-5002', email: 'monica.castro@email.com' } },
    { nombre: 'Fernanda Ortiz', grado: '5to', seccion: 'B', edad: 16, fechaNacimiento: '2008-12-01', contacto: { tutor: 'Carlos Ortiz', telefono: '555-5003', email: 'carlos.ortiz@email.com' } },
    { nombre: 'Ricardo Méndez', grado: '5to', seccion: 'B', edad: 16, fechaNacimiento: '2008-04-16', contacto: { tutor: 'Sandra Méndez', telefono: '555-5004', email: 'sandra.mendez@email.com' } },
    ];
    
    saveEstudiantesInfo(estudiantesInfo);
  }
  
  // Seed datos de tutores
  if (existingTutores.length === 0) {
  const tutoresData: Tutor[] = [
    { id: 't1', nombre: 'Prof. García', email: 'garcia@colegio.edu', telefono: '+1234567890' },
    { id: 't2', nombre: 'Prof. López', email: 'lopez@colegio.edu', telefono: '+1234567891' },
    { id: 't3', nombre: 'Prof. Fernández', email: 'fernandez@colegio.edu', telefono: '+1234567892' },
    { id: 't4', nombre: 'Prof. Torres', email: 'torres@colegio.edu', telefono: '+1234567893' },
    { id: 't5', nombre: 'Prof. Martínez', email: 'martinez@colegio.edu', telefono: '+1234567894' },
    { id: 't6', nombre: 'Prof. Ramírez', email: 'ramirez@colegio.edu', telefono: '+1234567895' },
    ];
    
    saveTutores(tutoresData);
  }
  
  // Seed notas dummy
  if (existingNotas.length === 0) {
  const notasData: Nota[] = [
    // Juan Pérez
    { id: 'n1', studentName: 'Juan Pérez', materia: 'Matemáticas', nota: 85, fecha: '2024-10-15', profesor: 'Prof. López', comentario: 'Buen desempeño' },
    { id: 'n2', studentName: 'Juan Pérez', materia: 'Matemáticas', nota: 78, fecha: '2024-11-20', profesor: 'Prof. López', comentario: 'Necesita mejorar' },
    { id: 'n3', studentName: 'Juan Pérez', materia: 'Ciencias', nota: 92, fecha: '2024-10-18', profesor: 'Prof. Fernández', comentario: 'Excelente' },
    { id: 'n4', studentName: 'Juan Pérez', materia: 'Ciencias', nota: 88, fecha: '2024-11-22', profesor: 'Prof. Fernández' },
    { id: 'n5', studentName: 'Juan Pérez', materia: 'Lengua', nota: 75, fecha: '2024-10-20', profesor: 'Prof. García' },
    { id: 'n6', studentName: 'Juan Pérez', materia: 'Lengua', nota: 80, fecha: '2024-11-25', profesor: 'Prof. García' },
    // María López
    { id: 'n7', studentName: 'María López', materia: 'Matemáticas', nota: 90, fecha: '2024-10-15', profesor: 'Prof. López', comentario: 'Muy buena' },
    { id: 'n8', studentName: 'María López', materia: 'Matemáticas', nota: 88, fecha: '2024-11-20', profesor: 'Prof. López' },
    { id: 'n9', studentName: 'María López', materia: 'Ciencias', nota: 65, fecha: '2024-10-18', profesor: 'Prof. Fernández', comentario: 'Requiere apoyo' },
    { id: 'n10', studentName: 'María López', materia: 'Ciencias', nota: 70, fecha: '2024-11-22', profesor: 'Prof. Fernández' },
    { id: 'n11', studentName: 'María López', materia: 'Lengua', nota: 95, fecha: '2024-10-20', profesor: 'Prof. García', comentario: 'Destacada' },
    { id: 'n12', studentName: 'María López', materia: 'Lengua', nota: 93, fecha: '2024-11-25', profesor: 'Prof. García' },
    // Carlos Ruiz
    { id: 'n13', studentName: 'Carlos Ruiz', materia: 'Matemáticas', nota: 82, fecha: '2024-10-15', profesor: 'Prof. López' },
    { id: 'n14', studentName: 'Carlos Ruiz', materia: 'Matemáticas', nota: 85, fecha: '2024-11-20', profesor: 'Prof. López', comentario: 'Mejorando' },
    { id: 'n15', studentName: 'Carlos Ruiz', materia: 'Ciencias', nota: 88, fecha: '2024-10-18', profesor: 'Prof. Fernández' },
    { id: 'n16', studentName: 'Carlos Ruiz', materia: 'Ciencias', nota: 90, fecha: '2024-11-22', profesor: 'Prof. Fernández', comentario: 'Excelente progreso' },
    { id: 'n17', studentName: 'Carlos Ruiz', materia: 'Lengua', nota: 79, fecha: '2024-10-20', profesor: 'Prof. García' },
    { id: 'n18', studentName: 'Carlos Ruiz', materia: 'Lengua', nota: 81, fecha: '2024-11-25', profesor: 'Prof. García' },
    ];
    
    saveNotas(notasData);
  }

  // Seed de clases (simple) si no existen
  if (existingClases.length === 0) {
    const posiblesDias: DiaSemana[] = ['lunes','martes','miercoles','jueves','viernes'];
    const clasesSeed: Omit<Clase, 'id'>[] = [
      { nombre: 'Matemáticas', grado: '3ro', seccion: 'A', profesor: 'Prof. López', dias: posiblesDias },
      { nombre: 'Ciencias', grado: '2do', seccion: 'A', profesor: 'Prof. Fernández', dias: posiblesDias },
      { nombre: 'Lengua', grado: '1ro', seccion: 'A', profesor: 'Prof. García', dias: posiblesDias },
      { nombre: 'Historia', grado: '4to', seccion: 'A', profesor: 'Prof. Torres', dias: posiblesDias },
      { nombre: 'Arte', grado: '5to', seccion: 'A', profesor: 'Prof. Ramírez', dias: posiblesDias },
    ];
    clasesSeed.forEach(c => addClase(c));
  }

  // Seed datos de asistencia - crear estudiantes con 3+ ausencias y tardanzas para pruebas
  // Contar ausencias y tardanzas de todos los registros
  const conteoAusencias: Record<string, number> = {};
  const conteoTardanzas: Record<string, number> = {};
  
  existingAsistenciaClases.forEach(reg => {
    Object.entries(reg.entries || {}).forEach(([nombre, estado]) => {
      if (estado === 'ausente') {
        conteoAusencias[nombre] = (conteoAusencias[nombre] || 0) + 1;
      } else if (estado === 'tardanza') {
        conteoTardanzas[nombre] = (conteoTardanzas[nombre] || 0) + 1;
      }
    });
  });
  
  // Verificar individualmente si cada estudiante tiene más de 3 ausencias/tardanzas (4+)
  const luisMartinezTiene4Ausencias = (conteoAusencias['Luis Martínez'] || 0) > 3;
  const juanPerezTiene4Ausencias = (conteoAusencias['Juan Pérez'] || 0) > 3;
  const mariaLopezTiene4Tardanzas = (conteoTardanzas['María López'] || 0) > 3;
  
  console.log('🔍 Verificación de datos de prueba:', {
    'Luis Martínez': { ausencias: conteoAusencias['Luis Martínez'] || 0, necesitaCrear: !luisMartinezTiene4Ausencias },
    'Juan Pérez': { ausencias: conteoAusencias['Juan Pérez'] || 0, necesitaCrear: !juanPerezTiene4Ausencias },
    'María López': { tardanzas: conteoTardanzas['María López'] || 0, necesitaCrear: !mariaLopezTiene4Tardanzas }
  });
  
  if (!luisMartinezTiene4Ausencias || !juanPerezTiene4Ausencias || !mariaLopezTiene4Tardanzas) {
    const clases = getClases();
    const claseLengua = clases.find(c => c.nombre === 'Lengua' && c.grado === '1ro' && c.seccion === 'A');
    const claseMatematicas = clases.find(c => c.nombre === 'Matemáticas' && c.grado === '3ro' && c.seccion === 'A');
    
    const diasSemana: DiaSemana[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
    const getDiaSemana = (fecha: Date): DiaSemana => {
      const dia = fecha.getDay();
      return diasSemana[dia === 0 ? 6 : dia - 1] || 'lunes';
    };
    
    const formatFecha = (fecha: Date): string => {
      const yyyy = fecha.getFullYear();
      const mm = String(fecha.getMonth() + 1).padStart(2, '0');
      const dd = String(fecha.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    
    const registrosAsistencia: Omit<RegistroAsistenciaClase, 'id' | 'timestamp'>[] = [];
    
    // Crear registros para Luis Martínez (si no tiene 4+ ausencias - necesita más de 3)
    if (!conteoAusencias['Luis Martínez'] || conteoAusencias['Luis Martínez'] < 4) {
      if (claseLengua) {
        const hoy = new Date();
        const fecha1 = new Date(hoy);
        fecha1.setDate(hoy.getDate() - 6); // Hace 6 días
        const fecha2 = new Date(hoy);
        fecha2.setDate(hoy.getDate() - 5); // Hace 5 días
        const fecha3 = new Date(hoy);
        fecha3.setDate(hoy.getDate() - 3); // Hace 3 días
        const fecha4 = new Date(hoy);
        fecha4.setDate(hoy.getDate() - 1); // Ayer
        
        registrosAsistencia.push(
          {
            fecha: formatFecha(fecha1),
            dia: getDiaSemana(fecha1),
            claseId: claseLengua.id,
            grado: '1ro',
            seccion: 'A',
            profesor: 'Prof. García',
            periodo: 1,
            lugar: 'Aula 101',
            entries: {
              'Luis Martínez': 'ausente',
              'Ana García': 'presente'
            }
          },
          {
            fecha: formatFecha(fecha2),
            dia: getDiaSemana(fecha2),
            claseId: claseLengua.id,
            grado: '1ro',
            seccion: 'A',
            profesor: 'Prof. García',
            periodo: 1,
            lugar: 'Aula 101',
            entries: {
              'Luis Martínez': 'ausente',
              'Ana García': 'presente'
            }
          },
          {
            fecha: formatFecha(fecha3),
            dia: getDiaSemana(fecha3),
            claseId: claseLengua.id,
            grado: '1ro',
            seccion: 'A',
            profesor: 'Prof. García',
            periodo: 1,
            lugar: 'Aula 101',
            entries: {
              'Luis Martínez': 'ausente',
              'Ana García': 'presente'
            }
          },
          {
            fecha: formatFecha(fecha4),
            dia: getDiaSemana(fecha4),
            claseId: claseLengua.id,
            grado: '1ro',
            seccion: 'A',
            profesor: 'Prof. García',
            periodo: 1,
            lugar: 'Aula 101',
            entries: {
              'Luis Martínez': 'ausente',
              'Ana García': 'presente'
            }
          }
        );
      }
    }
    
    // Crear registros para Juan Pérez (si no tiene 4+ ausencias - necesita más de 3)
    if (!conteoAusencias['Juan Pérez'] || conteoAusencias['Juan Pérez'] < 4) {
      if (claseMatematicas) {
        const hoy = new Date();
        const fecha1 = new Date(hoy);
        fecha1.setDate(hoy.getDate() - 6); // Hace 6 días
        const fecha2 = new Date(hoy);
        fecha2.setDate(hoy.getDate() - 4); // Hace 4 días
        const fecha3 = new Date(hoy);
        fecha3.setDate(hoy.getDate() - 2); // Hace 2 días
        const fecha4 = new Date(hoy);
        fecha4.setDate(hoy.getDate() - 1); // Ayer
        
        registrosAsistencia.push(
          {
            fecha: formatFecha(fecha1),
            dia: getDiaSemana(fecha1),
            claseId: claseMatematicas.id,
            grado: '3ro',
            seccion: 'A',
            profesor: 'Prof. López',
            periodo: 1,
            lugar: 'Aula 205',
            entries: {
              'Juan Pérez': 'ausente',
              'Isabella Sánchez': 'presente'
            }
          },
          {
            fecha: formatFecha(fecha2),
            dia: getDiaSemana(fecha2),
            claseId: claseMatematicas.id,
            grado: '3ro',
            seccion: 'A',
            profesor: 'Prof. López',
            periodo: 1,
            lugar: 'Aula 205',
            entries: {
              'Juan Pérez': 'ausente',
              'Isabella Sánchez': 'presente'
            }
          },
          {
            fecha: formatFecha(fecha3),
            dia: getDiaSemana(fecha3),
            claseId: claseMatematicas.id,
            grado: '3ro',
            seccion: 'A',
            profesor: 'Prof. López',
            periodo: 1,
            lugar: 'Aula 205',
            entries: {
              'Juan Pérez': 'ausente',
              'Isabella Sánchez': 'presente'
            }
          },
          {
            fecha: formatFecha(fecha4),
            dia: getDiaSemana(fecha4),
            claseId: claseMatematicas.id,
            grado: '3ro',
            seccion: 'A',
            profesor: 'Prof. López',
            periodo: 1,
            lugar: 'Aula 205',
            entries: {
              'Juan Pérez': 'ausente',
              'Isabella Sánchez': 'presente'
            }
          }
        );
      }
    }
    
    // Crear registros para María López con tardanzas (si no tiene 4+ tardanzas - necesita más de 3)
    if (!mariaLopezTiene4Tardanzas) {
      const claseCiencias = clases.find(c => c.nombre === 'Ciencias' && c.grado === '2do' && c.seccion === 'A');
      if (claseCiencias) {
        const hoy = new Date();
        const fecha1 = new Date(hoy);
        fecha1.setDate(hoy.getDate() - 7); // Hace 7 días
        const fecha2 = new Date(hoy);
        fecha2.setDate(hoy.getDate() - 5); // Hace 5 días
        const fecha3 = new Date(hoy);
        fecha3.setDate(hoy.getDate() - 3); // Hace 3 días
        const fecha4 = new Date(hoy);
        fecha4.setDate(hoy.getDate() - 2); // Hace 2 días
        
        registrosAsistencia.push(
          {
            fecha: formatFecha(fecha1),
            dia: getDiaSemana(fecha1),
            claseId: claseCiencias.id,
            grado: '2do',
            seccion: 'A',
            profesor: 'Prof. Fernández',
            periodo: 1,
            lugar: 'Aula 102',
            entries: {
              'María López': 'tardanza',
              'Diego Fernández': 'presente'
            }
          },
          {
            fecha: formatFecha(fecha2),
            dia: getDiaSemana(fecha2),
            claseId: claseCiencias.id,
            grado: '2do',
            seccion: 'A',
            profesor: 'Prof. Fernández',
            periodo: 1,
            lugar: 'Aula 102',
            entries: {
              'María López': 'tardanza',
              'Diego Fernández': 'presente'
            }
          },
          {
            fecha: formatFecha(fecha3),
            dia: getDiaSemana(fecha3),
            claseId: claseCiencias.id,
            grado: '2do',
            seccion: 'A',
            profesor: 'Prof. Fernández',
            periodo: 1,
            lugar: 'Aula 102',
            entries: {
              'María López': 'tardanza',
              'Diego Fernández': 'presente'
            }
          },
          {
            fecha: formatFecha(fecha4),
            dia: getDiaSemana(fecha4),
            claseId: claseCiencias.id,
            grado: '2do',
            seccion: 'A',
            profesor: 'Prof. Fernández',
            periodo: 1,
            lugar: 'Aula 102',
            entries: {
              'María López': 'tardanza',
              'Diego Fernández': 'presente'
            }
          }
        );
      }
    }
    
    if (registrosAsistencia.length > 0) {
      console.log('🔄 Creando', registrosAsistencia.length, 'registros de asistencia de prueba...');
      registrosAsistencia.forEach(reg => {
        const creado = addRegistroAsistenciaClase(reg);
        console.log('  ✓ Registro creado:', creado.fecha, '-', Object.keys(reg.entries || {}).join(', '));
      });
      
      // Recontar después de crear los registros
      const registrosActualizados = getAsistenciaClases();
      const nuevoConteoAusencias: Record<string, number> = {};
      const nuevoConteoTardanzas: Record<string, number> = {};
      
      registrosActualizados.forEach(reg => {
        Object.entries(reg.entries || {}).forEach(([nombre, estado]) => {
          if (estado === 'ausente') {
            nuevoConteoAusencias[nombre] = (nuevoConteoAusencias[nombre] || 0) + 1;
          } else if (estado === 'tardanza') {
            nuevoConteoTardanzas[nombre] = (nuevoConteoTardanzas[nombre] || 0) + 1;
          }
        });
      });
      
      console.log('✅ Datos de prueba creados. Conteo final:', {
        'Luis Martínez': { ausencias: nuevoConteoAusencias['Luis Martínez'] || 0, tardanzas: nuevoConteoTardanzas['Luis Martínez'] || 0 },
        'Juan Pérez': { ausencias: nuevoConteoAusencias['Juan Pérez'] || 0, tardanzas: nuevoConteoTardanzas['Juan Pérez'] || 0 },
        'María López': { ausencias: nuevoConteoAusencias['María López'] || 0, tardanzas: nuevoConteoTardanzas['María López'] || 0 }
      });
    } else {
      console.log('ℹ️ No se crearon nuevos registros de asistencia. Datos existentes:', {
        'Luis Martínez': { ausencias: conteoAusencias['Luis Martínez'] || 0, tardanzas: conteoTardanzas['Luis Martínez'] || 0 },
        'Juan Pérez': { ausencias: conteoAusencias['Juan Pérez'] || 0, tardanzas: conteoTardanzas['Juan Pérez'] || 0 },
        'María López': { ausencias: conteoAusencias['María López'] || 0, tardanzas: conteoTardanzas['María López'] || 0 }
      });
    }
  }
}

// ===== Clases (Materias) =====
export function getClases(): Clase[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CLASES_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading clases from localStorage:', error);
    return [];
  }
}

export function saveClases(clases: Clase[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CLASES_STORAGE_KEY, JSON.stringify(clases));
  } catch (error) {
    console.error('Error saving clases to localStorage:', error);
  }
}

export function addClase(clase: Omit<Clase, 'id'>): Clase {
  const clases = getClases();
  const newClase: Clase = { ...clase, id: Date.now().toString() + Math.random().toString(36).slice(2, 7) };
  clases.push(newClase);
  saveClases(clases);
  return newClase;
}

export function getClasesByProfesor(profesor: string): Clase[] {
  const clases = getClases();
  if (!profesor) return clases;
  return clases.filter(c => c.profesor.toLowerCase() === profesor.toLowerCase());
}

export function getClasesByGradoSeccion(grado: string, seccion: string): Clase[] {
  const clases = getClases();
  return clases.filter(c => c.grado === grado && c.seccion === seccion);
}

// ===== Asistencia por Clase =====
export function getAsistenciaClases(): RegistroAsistenciaClase[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(ASISTENCIA_CLASES_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading asistencia clases from localStorage:', error);
    return [];
  }
}

// Funciones para Grados
export function getGrados(): string[] {
  if (typeof window === 'undefined') return ['1ro', '2do', '3ro', '4to', '5to'];
  try {
    const stored = localStorage.getItem(GRADOS_STORAGE_KEY);
    if (!stored) return ['1ro', '2do', '3ro', '4to', '5to']; // Valores por defecto
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading grados from localStorage:', error);
    return ['1ro', '2do', '3ro', '4to', '5to'];
  }
}

export function saveGrados(grados: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GRADOS_STORAGE_KEY, JSON.stringify(grados));
  } catch (error) {
    console.error('Error saving grados to localStorage:', error);
  }
}

// Funciones para Secciones
export function getSecciones(): string[] {
  if (typeof window === 'undefined') return ['A', 'B', 'C'];
  try {
    const stored = localStorage.getItem(SECCIONES_STORAGE_KEY);
    if (!stored) return ['A', 'B', 'C']; // Valores por defecto
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading secciones from localStorage:', error);
    return ['A', 'B', 'C'];
  }
}

export function saveSecciones(secciones: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SECCIONES_STORAGE_KEY, JSON.stringify(secciones));
  } catch (error) {
    console.error('Error saving secciones to localStorage:', error);
  }
}

// Funciones para Tutores por Grado y Sección
export function getTutoresGradoSeccion(): TutorGradoSeccion[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(TUTORES_GRADO_SECCION_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading tutores grado seccion from localStorage:', error);
    return [];
  }
}

export function saveTutoresGradoSeccion(tutores: TutorGradoSeccion[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TUTORES_GRADO_SECCION_STORAGE_KEY, JSON.stringify(tutores));
  } catch (error) {
    console.error('Error saving tutores grado seccion to localStorage:', error);
  }
}

export function getTutorGradoSeccion(grado: string, seccion: string): TutorGradoSeccion | undefined {
  const tutores = getTutoresGradoSeccion();
  return tutores.find(t => t.grado === grado && t.seccion === seccion);
}

export function getSeccionByTutorId(tutorId: string): TutorGradoSeccion | undefined {
  const tutores = getTutoresGradoSeccion();
  return tutores.find(t => t.tutorId === tutorId);
}

export function setTutorGradoSeccion(grado: string, seccion: string, tutorId: string, tutorNombre: string): void {
  const tutores = getTutoresGradoSeccion();
  
  // Remover cualquier asignación previa de este tutor (un tutor solo puede estar asignado a una sección)
  const tutoresSinEsteTutor = tutores.filter(t => t.tutorId !== tutorId);
  
  // Verificar si ya existe una asignación para esta sección (grado, seccion)
  const idx = tutoresSinEsteTutor.findIndex(t => t.grado === grado && t.seccion === seccion);
  
  const nuevo: TutorGradoSeccion = { grado, seccion, tutorId, tutorNombre };
  
  if (idx >= 0) {
    // Ya existe una asignación para esta sección, reemplazar
    tutoresSinEsteTutor[idx] = nuevo;
  } else {
    // Nueva asignación para esta sección
    tutoresSinEsteTutor.push(nuevo);
  }
  
  saveTutoresGradoSeccion(tutoresSinEsteTutor);
}

export function removeTutorGradoSeccion(grado: string, seccion: string): void {
  const tutores = getTutoresGradoSeccion();
  saveTutoresGradoSeccion(tutores.filter(t => !(t.grado === grado && t.seccion === seccion)));
}

export function saveAsistenciaClases(registros: RegistroAsistenciaClase[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ASISTENCIA_CLASES_STORAGE_KEY, JSON.stringify(registros));
  } catch (error) {
    console.error('Error saving asistencia clases to localStorage:', error);
  }
}

export function addRegistroAsistenciaClase(rec: Omit<RegistroAsistenciaClase,'id'|'timestamp'>): RegistroAsistenciaClase {
  const registros = getAsistenciaClases();
  // Buscar si ya existe un registro para la misma clase, fecha y periodo
  const idx = registros.findIndex(r => r.fecha === rec.fecha && r.claseId === rec.claseId && r.periodo === rec.periodo);
  const nuevo: RegistroAsistenciaClase = {
    ...rec,
    id: idx !== -1 ? registros[idx].id : Date.now().toString() + Math.random().toString(36).slice(2,7),
    timestamp: Date.now()
  };
  if (idx !== -1) {
    // Actualizar el registro existente
    registros[idx] = nuevo;
  } else {
    // Agregar nuevo registro
    registros.push(nuevo);
  }
  saveAsistenciaClases(registros);
  return nuevo;
}

export function findRegistroAsistencia(fecha: string, claseId: string, periodo: number): RegistroAsistenciaClase | undefined {
  return getAsistenciaClases().find(r => r.fecha === fecha && r.claseId === claseId && r.periodo === periodo);
}

export function getAsistenciaClasesByFilters(params: { fecha?: string; claseId?: string; profesor?: string; grado?: string; seccion?: string; dia?: DiaSemana; periodo?: number }): RegistroAsistenciaClase[] {
  const registros = getAsistenciaClases();
  return registros.filter(r => (
    (params.fecha ? r.fecha === params.fecha : true) &&
    (params.claseId ? r.claseId === params.claseId : true) &&
    (params.profesor ? r.profesor.toLowerCase() === params.profesor.toLowerCase() : true) &&
    (params.grado ? r.grado === params.grado : true) &&
    (params.seccion ? r.seccion === params.seccion : true) &&
    (params.dia ? r.dia === params.dia : true) &&
    (typeof params.periodo === 'number' ? r.periodo === params.periodo : true)
  )).sort((a,b) => a.periodo - b.periodo || a.timestamp - b.timestamp);
}

// ===== Funciones para gestionar estudiantes atendidos en notificaciones =====
const ESTUDIANTES_ATENDIDOS_KEY = 'tutoria_estudiantes_atendidos';

export interface EstudianteAtendido {
  nombre: string;
  fecha: string; // Fecha en formato YYYY-MM-DD
  profesor: string;
}

export function getEstudiantesAtendidos(): EstudianteAtendido[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(ESTUDIANTES_ATENDIDOS_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading estudiantes atendidos from localStorage:', error);
    return [];
  }
}

export function saveEstudiantesAtendidos(estudiantes: EstudianteAtendido[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ESTUDIANTES_ATENDIDOS_KEY, JSON.stringify(estudiantes));
  } catch (error) {
    console.error('Error saving estudiantes atendidos to localStorage:', error);
  }
}

export function marcarEstudianteAtendido(nombre: string, fecha: string, profesor: string): void {
  const atendidos = getEstudiantesAtendidos();
  // Eliminar registros antiguos del mismo estudiante y profesor (mantener solo el más reciente)
  const filtrados = atendidos.filter(
    e => !(e.nombre === nombre && e.profesor === profesor)
  );
  // Agregar el nuevo registro
  filtrados.push({ nombre, fecha, profesor });
  saveEstudiantesAtendidos(filtrados);
  console.log('✅ Estudiante marcado como atendido:', { nombre, fecha, profesor, totalAtendidos: filtrados.length });
}

export function marcarEstudiantesAtendidos(nombres: string[], fecha: string, profesor: string): void {
  nombres.forEach(nombre => {
    marcarEstudianteAtendido(nombre, fecha, profesor);
  });
}

export function esEstudianteAtendido(nombre: string, profesor: string, fecha?: string): boolean {
  const atendidos = getEstudiantesAtendidos();
  const hoy = fecha || new Date().toISOString().split('T')[0];
  
  // Verificar si el estudiante fue atendido hoy por este profesor
  const esAtendido = atendidos.some(
    e => e.nombre === nombre && 
         e.profesor === profesor && 
         e.fecha === hoy
  );
  
  // Debug: solo loggear cuando se encuentra un estudiante atendido o cuando hay discrepancia
  if (esAtendido) {
    console.log('✅ Estudiante atendido encontrado:', { nombre, profesor, fecha: hoy });
  } else {
    // Solo loggear si hay estudiantes atendidos para este profesor pero este no está
    const atendidosDelProfesor = atendidos.filter(e => e.profesor === profesor && e.fecha === hoy);
    if (atendidosDelProfesor.length > 0) {
      console.log('⚠️ Estudiante NO encontrado en atendidos:', {
        nombre,
        profesor,
        fecha: hoy,
        atendidosDelProfesor: atendidosDelProfesor.map(e => e.nombre)
      });
    }
  }
  
  return esAtendido;
}

export function limpiarEstudiantesAtendidosAntiguos(diasAntiguedad: number = 7): void {
  const atendidos = getEstudiantesAtendidos();
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - diasAntiguedad);
  const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];
  
  const filtrados = atendidos.filter(e => e.fecha >= fechaLimiteStr);
  saveEstudiantesAtendidos(filtrados);
}

