import { Incidencia, Nota, EstudianteInfo, TipoDerivacion, Tutor } from './types';

const STORAGE_KEY = 'tutoria_incidencias';
const NOTAS_STORAGE_KEY = 'tutoria_notas';
const ESTUDIANTES_STORAGE_KEY = 'tutoria_estudiantes';
const TUTORES_STORAGE_KEY = 'tutoria_tutores';

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
  tipo?: 'ausencia' | 'conducta' | 'academica' | 'positivo' | 'todas'
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
      const tieneDerivacion = inc.derivacion && inc.derivacion !== 'ninguna';
      const noResuelta = !inc.resuelta;
      const coincideTipo = !tipoDerivacion || inc.derivacion === tipoDerivacion;
      const cumple = tieneDerivacion && noResuelta && coincideTipo;
      if (tieneDerivacion && !cumple) {
        console.log('Incidencia con derivación filtrada:', {
          id: inc.id,
          derivacion: inc.derivacion,
          resuelta: inc.resuelta,
          tipoFiltro: tipoDerivacion,
          tieneDerivacion,
          noResuelta,
          coincideTipo
        });
      }
      return cumple;
    })
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
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
      const periodoDiff = (periodoOrder[a.periodo as keyof typeof periodoOrder] || 0) - 
                          (periodoOrder[b.periodo as keyof typeof periodoOrder] || 0);
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
    { id: 'n1', studentName: 'Juan Pérez', materia: 'Matemáticas', periodo: 'Q1', nota: 85, fecha: '2024-10-15', profesor: 'Prof. López', comentario: 'Buen desempeño' },
    { id: 'n2', studentName: 'Juan Pérez', materia: 'Matemáticas', periodo: 'Q2', nota: 78, fecha: '2024-11-20', profesor: 'Prof. López', comentario: 'Necesita mejorar' },
    { id: 'n3', studentName: 'Juan Pérez', materia: 'Ciencias', periodo: 'Q1', nota: 92, fecha: '2024-10-18', profesor: 'Prof. Fernández', comentario: 'Excelente' },
    { id: 'n4', studentName: 'Juan Pérez', materia: 'Ciencias', periodo: 'Q2', nota: 88, fecha: '2024-11-22', profesor: 'Prof. Fernández' },
    { id: 'n5', studentName: 'Juan Pérez', materia: 'Lengua', periodo: 'Q1', nota: 75, fecha: '2024-10-20', profesor: 'Prof. García' },
    { id: 'n6', studentName: 'Juan Pérez', materia: 'Lengua', periodo: 'Q2', nota: 80, fecha: '2024-11-25', profesor: 'Prof. García' },
    // María López
    { id: 'n7', studentName: 'María López', materia: 'Matemáticas', periodo: 'Q1', nota: 90, fecha: '2024-10-15', profesor: 'Prof. López', comentario: 'Muy buena' },
    { id: 'n8', studentName: 'María López', materia: 'Matemáticas', periodo: 'Q2', nota: 88, fecha: '2024-11-20', profesor: 'Prof. López' },
    { id: 'n9', studentName: 'María López', materia: 'Ciencias', periodo: 'Q1', nota: 65, fecha: '2024-10-18', profesor: 'Prof. Fernández', comentario: 'Requiere apoyo' },
    { id: 'n10', studentName: 'María López', materia: 'Ciencias', periodo: 'Q2', nota: 70, fecha: '2024-11-22', profesor: 'Prof. Fernández' },
    { id: 'n11', studentName: 'María López', materia: 'Lengua', periodo: 'Q1', nota: 95, fecha: '2024-10-20', profesor: 'Prof. García', comentario: 'Destacada' },
    { id: 'n12', studentName: 'María López', materia: 'Lengua', periodo: 'Q2', nota: 93, fecha: '2024-11-25', profesor: 'Prof. García' },
    // Carlos Ruiz
    { id: 'n13', studentName: 'Carlos Ruiz', materia: 'Matemáticas', periodo: 'Q1', nota: 82, fecha: '2024-10-15', profesor: 'Prof. López' },
    { id: 'n14', studentName: 'Carlos Ruiz', materia: 'Matemáticas', periodo: 'Q2', nota: 85, fecha: '2024-11-20', profesor: 'Prof. López', comentario: 'Mejorando' },
    { id: 'n15', studentName: 'Carlos Ruiz', materia: 'Ciencias', periodo: 'Q1', nota: 88, fecha: '2024-10-18', profesor: 'Prof. Fernández' },
    { id: 'n16', studentName: 'Carlos Ruiz', materia: 'Ciencias', periodo: 'Q2', nota: 90, fecha: '2024-11-22', profesor: 'Prof. Fernández', comentario: 'Excelente progreso' },
    { id: 'n17', studentName: 'Carlos Ruiz', materia: 'Lengua', periodo: 'Q1', nota: 79, fecha: '2024-10-20', profesor: 'Prof. García' },
    { id: 'n18', studentName: 'Carlos Ruiz', materia: 'Lengua', periodo: 'Q2', nota: 81, fecha: '2024-11-25', profesor: 'Prof. García' },
    ];
    
    saveNotas(notasData);
  }
}

