export type TipoIncidencia = 'ausencia' | 'tardanza' | 'conducta' | 'academica' | 'positivo' | 'asistencia';
export type TipoDerivacion = 'ninguna' | 'director' | 'psicologia' | 'enfermeria' | 'coordinacion' | 'orientacion';
export type SubtipoConducta = 'agresion' | 'falta_respeto' | 'interrupcion' | 'desobediencia' | 'otra';
export type SubtipoPositivo = 'ayuda_companero' | 'participacion' | 'liderazgo' | 'creatividad' | 'otro';
export type Gravedad = 'grave' | 'moderada' | 'leve';

export type EstadoIncidencia = 'Pendiente' | 'En revisión' | 'Resuelta' | 'Cerrada' | 'normal';

export interface EstadoIncidenciaHistorial {
  estado: EstadoIncidencia;
  fecha: string; // ISO
  usuario: string;
}

export interface Incidencia {
  id: string;
  studentName: string;
  tipo: TipoIncidencia;
  subtipo?: SubtipoConducta | SubtipoPositivo; // Subtipo si es conducta o positivo
  gravedad: Gravedad; // Gravedad de la incidencia
  descripcion: string;
  fecha: string;
  profesor: string;
  tutor?: string; // Tutor que reporta
  lugar?: string; // Lugar donde se generó la incidencia
  timestamp: number;
  derivacion?: TipoDerivacion; // Tipo de derivación
  resuelta?: boolean; // Si ya fue resuelta
  fechaResolucion?: string; // Fecha en que se resolvió
  resueltaPor?: string; // Quién la resolvió
  estado: EstadoIncidencia;
  historialEstado?: EstadoIncidenciaHistorial[];
}

export interface Nota {
  id: string;
  studentName: string;
  materia: string;
    estado?: 'pendiente' | 'normal' | 'resuelta';
  nota: number;
  fecha: string;
  profesor: string;
  comentario?: string;
}

export interface EstudianteInfo {
  nombre: string;
  nombres?: string;
  apellidos?: string;
  grado: string;
  seccion: string;
  edad?: number;
  fechaNacimiento?: string;
  fotoPerfil?: string; // URL de la foto de perfil o data URL
  contacto?: {
    telefono?: string;
    email?: string;
    tutor?: string;
    nombre?: string;
  };
  tutor?: {
    nombre?: string;
    telefono?: string;
    email?: string;
  };
  apoderado?: {
    nombre?: string;
    parentesco?: string; // Ej: Madre, Padre, Abuelo, Tío, etc.
    telefono?: string;
    telefonoAlternativo?: string;
    email?: string;
    direccion?: string;
  };
  asistencias?: number;
  ausencias?: number;
  tardanzas?: number;
}

export interface Tutor {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
}

export interface TutorGradoSeccion {
  grado: string;
  seccion: string;
  tutorId: string;
  tutorNombre: string;
}

export interface ReporteIA {
  report: string;
  timestamp: string;
  demo?: boolean;
  note?: string;
  originalError?: string;
  truncated?: boolean; // Indica si el reporte fue cortado por límite de tokens
  resumen?: string; // Resumen del análisis (opcional)
  analisisPatrones?: string; // Análisis de patrones (opcional)
  fortalezas?: string; // Fortalezas y áreas de mejora (opcional)
  factoresRiesgo?: string; // Factores de riesgo (opcional)
  recomendaciones?: string; // Recomendaciones del análisis (opcional)
  planSeguimiento?: string; // Plan de seguimiento (opcional)
}

// Nuevos tipos para asistencia por clase
export type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes';
export type EstadoAsistencia = 'presente' | 'tardanza' | 'ausente';

export interface Clase {
  id: string;
  nombre: string; // Ej: Matemáticas
  grado: string;  // Ej: 3ro
  seccion: string; // Ej: A
  profesor: string; // Nombre del profesor asignado
  dias: DiaSemana[]; // Días en los que ocurre la clase
}

export interface RegistroAsistenciaClase {
  id: string;
  fecha: string; // YYYY-MM-DD
  dia: DiaSemana;
  claseId: string;
  grado: string;
  seccion: string;
  profesor: string; // redundante para fácil consulta
  periodo: number;
  lugar?: string;
  entries: Record<string, EstadoAsistencia>; // clave: nombre del estudiante
  timestamp: number;
}

