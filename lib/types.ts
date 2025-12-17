export type TipoIncidencia = 'ausencia' | 'conducta' | 'academica' | 'positivo';
export type TipoDerivacion = 'ninguna' | 'director' | 'psicologia' | 'enfermeria' | 'coordinacion' | 'orientacion';
export type SubtipoConducta = 'agresion' | 'falta_respeto' | 'interrupcion' | 'desobediencia' | 'otra';
export type SubtipoPositivo = 'ayuda_companero' | 'participacion' | 'liderazgo' | 'creatividad' | 'otro';
export type Gravedad = 'grave' | 'moderada' | 'leve';

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
}

export interface Nota {
  id: string;
  studentName: string;
  materia: string;
  periodo: string; // "Q1", "Q2", "Q3", "Q4"
  nota: number;
  fecha: string;
  profesor: string;
  comentario?: string;
}

export interface EstudianteInfo {
  nombre: string;
  grado: string;
  seccion: string;
  edad?: number;
  fechaNacimiento?: string;
  contacto?: {
    telefono?: string;
    email?: string;
    tutor?: string;
  };
}

export interface Tutor {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
}

export interface ReporteIA {
  report: string;
  timestamp: string;
  demo?: boolean;
  note?: string;
  originalError?: string;
  truncated?: boolean; // Indica si el reporte fue cortado por límite de tokens
}

