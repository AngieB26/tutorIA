'use client';


import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, User, AlertTriangle, CheckCircle, Calendar, BarChart3, CheckCircle2, X, Eye, FileText, TrendingUp, Shield, Target, AlertCircle, Download, Users, Upload, Plus, Trash2, Edit2, Bell, RefreshCw, Phone, Mail, GraduationCap, UserCircle, MapPin } from 'lucide-react';
import { 
  fetchIncidencias,
  getIncidenciasDerivadas,
  getListaEstudiantes,
  getIncidenciasCompletasByStudent,
  marcarIncidenciaResuelta,
  fetchNotas,
  fetchEstudiante,
  fetchEstudianteById,
  fetchEstudiantes,
  saveEstudiantes,
  saveEstudiantesInfo,
  saveEstudiante as saveEstudianteInfo,
  fetchTutores,
  saveTutores,
  updateTutor,
  deleteTutor,
  deleteEstudiante,
  getGrados,
  saveGrados,
  getSecciones,
  saveSecciones,
  fetchClases,
  saveClases,
  addClase,
  fetchTutoresGradoSeccion,
  setTutorGradoSeccion,
  removeTutorGradoSeccion,
  getTutorGradoSeccion,
  getIncidenciasVistas,
  marcarIncidenciaVista,
  marcarIncidenciasVistas,
  recalcularContadoresAsistencia,
} from '@/lib/api';
import { Incidencia, ReporteIA, TipoDerivacion, Gravedad, TipoIncidencia, EstudianteInfo, Tutor, Clase, DiaSemana } from '@/lib/types';
import { getTipoColor, getTipoLabel, getGravedadColor, getGravedadLabel } from '@/lib/utils';
import { validateEmail, validatePhone, validateRequired, validateName, validateAge } from '@/lib/validation';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';


export default function DirectorPage() {
  // Helper function para obtener el nombre completo desde nombres y apellidos
  const getNombreCompleto = (estudiante: EstudianteInfo): string => {
    if (estudiante.nombres && estudiante.apellidos) {
      return `${estudiante.nombres} ${estudiante.apellidos}`.trim();
    }
    // Fallback: si no hay nombres y apellidos, intentar construir desde nombre (si existe en runtime)
    const nombre = (estudiante as any).nombre;
    if (nombre) return nombre;
    return estudiante.nombres || estudiante.apellidos || 'Sin nombre';
  };
  const router = useRouter();
  
  // Verificar autenticación al montar (solo en cliente)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = localStorage.getItem('director_authenticated') === 'true';
      if (!auth) {
        router.push('/director/login');
      }
    }
  }, [router]);

  // --- Función para formatear fechas a dd/mm/yyyy ---
  function formatFecha(fecha: string | undefined): string {
    if (!fecha) return '-';
    try {
      const date = new Date(fecha);
      if (isNaN(date.getTime())) {
        // Si ya está en formato válido pero no es Date válida, intentar parsear manualmente
        const partes = fecha.split(/[\/-]/);
        if (partes.length === 3) {
          // Asumir formato YYYY-MM-DD o DD/MM/YYYY
          if (partes[0].length === 4) {
            // Formato YYYY-MM-DD
            return `${partes[2].padStart(2, '0')}/${partes[1].padStart(2, '0')}/${partes[0]}`;
          } else {
            // Ya está en DD/MM/YYYY o similar
            return fecha;
          }
        }
        return fecha;
      }
      const dia = String(date.getDate()).padStart(2, '0');
      const mes = String(date.getMonth() + 1).padStart(2, '0');
      const año = date.getFullYear();
      return `${dia}/${mes}/${año}`;
    } catch {
      return fecha;
    }
  }

  // --- Función para formatear fecha y hora de incidencias ---
  function formatFechaHora(incidencia: Incidencia): string {
    try {
      // Usar timestamp si está disponible (más preciso)
      if (incidencia.timestamp) {
        const date = new Date(incidencia.timestamp);
        if (!isNaN(date.getTime())) {
          const dia = String(date.getDate()).padStart(2, '0');
          const mes = String(date.getMonth() + 1).padStart(2, '0');
          const año = date.getFullYear();
          const horas = String(date.getHours()).padStart(2, '0');
          const minutos = String(date.getMinutes()).padStart(2, '0');
          return `${dia}/${mes}/${año} ${horas}:${minutos}`;
        }
      }
      // Fallback: usar el campo fecha
      if (incidencia.fecha) {
        const date = new Date(incidencia.fecha);
        if (!isNaN(date.getTime())) {
          const dia = String(date.getDate()).padStart(2, '0');
          const mes = String(date.getMonth() + 1).padStart(2, '0');
          const año = date.getFullYear();
          const horas = String(date.getHours()).padStart(2, '0');
          const minutos = String(date.getMinutes()).padStart(2, '0');
          return `${dia}/${mes}/${año} ${horas}:${minutos}`;
        }
        // Si la fecha es solo YYYY-MM-DD sin hora, mostrar solo fecha
        return formatFecha(incidencia.fecha);
      }
      return '-';
    } catch {
      return formatFecha(incidencia.fecha);
    }
  }


  // --- Utilidad para formatear texto de reporte IA (simple: saltos de línea a <br>, listas, etc.) ---
  function formatReportText(text: string): string {
    if (!text) return '';
    // Convertir listas numeradas y bullets a <ul><li>
    let html = text
      .replace(/\r?\n/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .replace(/\n/g, '<br>');
    // Opcional: mejorar para listas, encabezados, etc.
    return html;
  }

  // --- Función para formatear recomendaciones del reporte general de forma clara ---
  function formatRecomendacionesGeneral(text: string): JSX.Element {
    if (!text || typeof text !== 'string') {
      return <p className="text-gray-900 text-sm italic">No hay recomendaciones disponibles</p>;
    }
    
    let cleanText = text.trim();
    
    // Remover encabezados innecesarios
    cleanText = cleanText.replace(/^RECOMENDACIONES?:?\s*/i, '');
    cleanText = cleanText.replace(/^RECOMENDACIONES\s*[:\-]?\s*/i, '');
    
    // Separar por líneas
    const lines = cleanText.split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (lines.length === 0) {
      return <p className="text-gray-900 text-sm italic">No hay recomendaciones disponibles</p>;
    }
    
    // Procesar líneas para identificar items
    const items: string[] = [];
    let currentItem = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detectar inicio de nueva recomendación (número, bullet, o línea que empieza con mayúscula después de punto)
      const isNumbered = /^\d+[.)]\s*/.test(line);
      const isBulleted = /^[-•*]\s*/.test(line);
      const isNewSentence = /^[A-ZÁÉÍÓÚÑ]/.test(line) && currentItem && currentItem.trim().endsWith('.');
      
      // Limpiar marcadores
      const cleanedLine = line.replace(/^(\d+[.)]\s*|[-•*]\s*)/, '').trim();
      
      if (cleanedLine.length === 0) continue;
      
      if ((isNumbered || isBulleted || isNewSentence) && currentItem) {
        // Guardar item anterior
        items.push(currentItem.trim());
        currentItem = cleanedLine;
      } else {
        // Continuar con el item actual
        if (currentItem) {
          currentItem += ' ' + cleanedLine;
        } else {
          currentItem = cleanedLine;
        }
      }
    }
    
    // Agregar último item
    if (currentItem) {
      items.push(currentItem.trim());
    }
    
    // Si no se identificaron items claros, tratar cada línea como item
    if (items.length === 0) {
      items.push(...lines.filter(line => line.length > 10)); // Solo líneas con contenido sustancial
    }
    
    // Si aún no hay items, usar el texto completo
    if (items.length === 0 && cleanText.length > 0) {
      items.push(cleanText);
    }
    
    return (
      <ul className="list-disc list-inside space-y-2.5 text-gray-900 text-sm">
        {items.map((item, idx) => {
          // Asegurar que el item tenga una estructura clara
          const formattedItem = item.trim();
          if (!formattedItem) return null;
          
          // Capitalizar primera letra si es necesario
          const finalItem = formattedItem.charAt(0).toUpperCase() + formattedItem.slice(1);
          
          return (
            <li key={idx} className="leading-relaxed text-sm" style={{ lineHeight: '1.6' }}>
              {finalItem}
            </li>
          );
        })}
      </ul>
    );
  }



  function ModalDetalleIncidencia({ incidencia, onClose }: { incidencia: Incidencia, onClose: () => void }) {
    // Formatea recomendaciones como lista con bullets
    function formatRecomendaciones(text: string): JSX.Element {
      if (!text || typeof text !== 'string') return <span className="italic text-gray-500">No hay texto disponible de IA.</span>;
      
      // Limpiar el texto
      let cleanText = text.trim();
      
      // Separar por líneas
      const lines = cleanText.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      
      // Filtrar encabezados
      const filteredLines = lines.filter(line => 
        !/^RESUMEN:?$/i.test(line) && 
        !/^RECOMENDACIONES:?$/i.test(line)
      );
      
      // Si no hay líneas, mostrar el texto completo como un solo punto
      if (filteredLines.length === 0) {
        return (
          <ul className="list-disc list-inside space-y-2 text-gray-900">
            <li className="text-gray-900" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
              {cleanText}
            </li>
          </ul>
        );
      }
      
      // Procesar: dividir en items basado en números, bullets, o líneas que parecen ser nuevas recomendaciones
      const items: string[] = [];
      let currentItem = '';
      
      for (let i = 0; i < filteredLines.length; i++) {
        const line = filteredLines[i];
        const cleanedLine = line.replace(/^((\d+\s*[.)-]+\s*)|[-•*]\s*)/, '');
        
        // Detectar inicio de nueva recomendación (número o bullet al inicio de la línea original)
        const isNewItemStart = /^(\d+\s*[.)-]+\s*|[-•*]\s*)/.test(line);
        
        if (isNewItemStart && currentItem) {
          // Guardar recomendación anterior
          items.push(currentItem.trim());
          currentItem = cleanedLine;
        } else {
          // Continuar con la recomendación actual (unir líneas)
          if (currentItem) {
            currentItem += ' ' + cleanedLine;
          } else {
            currentItem = cleanedLine;
          }
        }
      }
      
      // Agregar última recomendación
      if (currentItem.trim()) {
        items.push(currentItem.trim());
      }
      
      // Si no se pudieron dividir en items, usar el texto completo como un solo punto
      if (items.length === 0) {
      return (
          <ul className="list-disc list-inside space-y-2 text-gray-900">
            <li className="text-gray-900" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
              {cleanText}
            </li>
          </ul>
        );
      }
      
      // Mostrar siempre como lista con puntos
      return (
        <ul className="list-disc list-inside space-y-2 text-gray-900">
          {items.map((item, idx) => (
            <li key={idx} className="text-gray-900" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
              {item}
            </li>
          ))}
        </ul>
      );
    }

    const [localDetalleIA, setLocalDetalleIA] = useState<{ resumen: string; recomendaciones: string; raw: string }>({ resumen: '', recomendaciones: '', raw: '' });
    const [localLoadingIA, setLocalLoadingIA] = useState(false);

    useEffect(() => {
      if (!incidencia) return;
      setLocalLoadingIA(true);
      setLocalDetalleIA({ resumen: '', recomendaciones: '', raw: '' });
      fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidencia })
      })
        .then(async res => {
          if (!res.ok) throw new Error('Error al obtener análisis de IA');
          const data = await res.json();
          console.log('Respuesta IA:', data);
          // Validar que los campos sean string
          const resumen = typeof data.resumen === 'string' ? data.resumen.trim() : '';
          const recomendaciones = typeof data.recomendaciones === 'string' ? data.recomendaciones.trim() : '';
          const raw = typeof data.raw === 'string' ? data.raw.trim() : '';
          setLocalDetalleIA({ resumen, recomendaciones, raw });
        })
        .catch(() => {
          setLocalDetalleIA({ resumen: '', recomendaciones: '', raw: '' });
        })
        .finally(() => setLocalLoadingIA(false));
    }, [incidencia]);

    if (!incidencia) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-lg w-full max-w-3xl p-6 relative overflow-y-auto" style={{ maxHeight: '90vh' }}>
          <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-900 text-xl">×</button>
          <h2 className="text-xl font-bold mb-4 text-primary">Información de la Incidencia</h2>
          {/* Datos principales */}
          <div className="mb-4">
            <h3 className="font-semibold text-gray-800 mb-2 text-base">Datos del registro</h3>
            <div className="space-y-1">
              <div className="text-sm"><span className="font-semibold text-gray-700">Tipo:</span> <span className="text-gray-700">{getTipoLabel(incidencia.tipo)}</span></div>
              <div className="text-sm"><span className="font-semibold text-gray-700">Estudiante:</span> <span className="text-gray-700">{incidencia.studentName}</span></div>
              <div className="text-sm"><span className="font-semibold text-gray-700">Profesor:</span> <span className="text-gray-700">{incidencia.profesor}</span></div>
              <div className="text-sm"><span className="font-semibold text-gray-700">Descripción:</span> <span className="text-gray-700">{incidencia.descripcion}</span></div>
              <div className="text-sm"><span className="font-semibold text-gray-700">Fecha y hora:</span> <span className="text-gray-700">{formatFecha(incidencia.fecha)}</span></div>
              {incidencia.gravedad && <div className="text-sm"><span className="font-semibold text-gray-700">Gravedad:</span> <span className="text-gray-700">{getGravedadLabel ? getGravedadLabel(incidencia.gravedad) : incidencia.gravedad}</span></div>}
              {incidencia.derivacion && incidencia.derivacion !== 'ninguna' && (
                <div className="text-sm">
                  <span className="font-semibold text-gray-700">Derivación:</span>{' '}
                  <Badge className="bg-yellow-400 text-black">
                    {incidencia.derivacion === 'director' ? 'Director' :
                     incidencia.derivacion === 'psicologia' ? 'Psicología' :
                     incidencia.derivacion === 'enfermeria' ? 'Enfermería' :
                     incidencia.derivacion === 'coordinacion' ? 'Coordinación' :
                     incidencia.derivacion === 'orientacion' ? 'Orientación' :
                     incidencia.derivacion}
                  </Badge>
                </div>
              )}
              {incidencia.resuelta !== undefined && (
                <div className="text-sm">
                  <span className="font-semibold text-gray-700">Estado:</span>{' '}
                  {incidencia.resuelta ? (
                    <Badge className="bg-primary text-white">Resuelta</Badge>
                  ) : (
                    <Badge className="bg-yellow-400 text-black">Pendiente</Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="mb-4">
            <h3 className="font-semibold text-gray-800 mb-2">Archivos adjuntos</h3>
            {/* Fotos y videos adjuntos (placeholder) */}
            <div className="text-sm text-gray-900 italic">No hay evidencias adjuntas.</div>
          </div>
          {/* Análisis Inteligente */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">Análisis Inteligente</h3>
            {/* Resumen automático y recomendaciones rápidas */}
            {localLoadingIA ? (
              <div className="text-sm text-gray-900 italic">Cargando análisis de IA...</div>
            ) : (
              <>
                <div className="text-sm text-gray-900 mb-4">
                  <span className="font-semibold block mb-1 text-gray-900">Resumen:</span>
                {(localDetalleIA.resumen)
                    ? <div className="bg-gray-50 rounded p-3 border border-gray-200 text-gray-900" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7', wordWrap: 'break-word', overflowWrap: 'break-word', maxWidth: '100%' }}>{localDetalleIA.resumen}</div>
                  : (localDetalleIA.raw)
                      ? <div className="bg-gray-50 rounded p-3 border border-gray-200 text-gray-900" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7', wordWrap: 'break-word', overflowWrap: 'break-word', maxWidth: '100%' }}>{localDetalleIA.raw}</div>
                    : <span className="italic text-gray-500">No hay texto disponible de IA.</span>}
                </div>
                <div className="text-sm text-gray-900">
                  <span className="font-semibold block mb-1 text-gray-900">Recomendaciones rápidas:</span>
                  {(localDetalleIA.recomendaciones)
                    ? <div className="bg-gray-50 rounded p-3 border border-gray-200 text-gray-900" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                        {formatRecomendaciones(localDetalleIA.recomendaciones)}
                      </div>
                    : (localDetalleIA.raw)
                      ? <div className="bg-gray-50 rounded p-3 border border-gray-200 text-gray-900" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                          {formatRecomendaciones(localDetalleIA.raw)}
                        </div>
                      : <span className="italic text-gray-500">No hay texto disponible de IA.</span>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Orden deseado de grados
  const gradosOrdenados = ['1ro', '2do', '3ro', '4to', '5to'];

  // Estados para incidencias derivadas
  const [incidenciasDerivadas, setIncidenciasDerivadas] = useState<Incidencia[]>([]);
  const [reporteGeneralTab, setReporteGeneralTab] = useState<'resumen' | 'detallado' | 'graficos'>('resumen');
  const [filtroDerivacion, setFiltroDerivacion] = useState<TipoDerivacion | 'todas'>('todas');

  // Estado y handler para mostrar el modal de detalle de incidencia
  const [incidenciaDetalle, setIncidenciaDetalle] = useState<Incidencia | null>(null);
  const handleVerDetalleIncidencia = (inc: Incidencia) => {
    setIncidenciaDetalle(inc);
  };
  // Handler para generar análisis con IA en perfil de estudiante
  const handleGenerateReport = async () => {
    if (!selectedStudentId || !selectedStudentName || incidenciasEstudiante.length === 0) return;
    setGeneratingReport(true);
    setReporte(null);
    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          incidencias: incidenciasEstudiante, 
          estudiante: selectedStudentName,
          estudianteId: selectedStudentId // Incluir ID para identificación precisa
        })
      });
      if (!res.ok) throw new Error('Error al generar el reporte');
      const data = await res.json();
      
      // Construir el reporte combinando resumen y recomendaciones
      let reportText = '';
      if (data.resumen) {
        reportText += 'RESUMEN:\n' + data.resumen;
      }
      if (data.recomendaciones) {
        if (reportText) reportText += '\n\n';
        reportText += 'RECOMENDACIONES:\n' + data.recomendaciones;
      }
      
      setReporte({
        report: reportText || (data.report || ''),
        resumen: data.resumen || undefined,
        analisisPatrones: data.analisisPatrones || undefined,
        fortalezas: data.fortalezas || undefined,
        factoresRiesgo: data.factoresRiesgo || undefined,
        recomendaciones: data.recomendaciones || undefined,
        planSeguimiento: data.planSeguimiento || undefined,
        timestamp: data.timestamp || new Date().toISOString(),
        truncated: !!data.truncated,
      } as ReporteIA);
    } catch (e) {
      setReporte({ report: '(No disponible)', timestamp: new Date().toISOString() });
    } finally {
      setGeneratingReport(false);
    }
  };
        // Handler para marcar incidencia como resuelta
        const handleMarcarResuelta = async (id: string) => {
          try {
            await marcarIncidenciaResuelta(id);
            // Recargar incidencias desde la API
            const todasIncidencias = await fetchIncidencias();
            setIncidencias(todasIncidencias);
            // Recargar incidencias derivadas también
            const derivadas = await getIncidenciasDerivadas(filtroDerivacion === 'todas' ? undefined : filtroDerivacion);
            setIncidenciasDerivadas(derivadas);
            // Disparar evento para que otros componentes se actualicen
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('incidenciaActualizada', { detail: { id } }));
            }
            // Actualizar refreshKey para forzar actualización en otros tabs
            setRefreshKey(prev => prev + 1);
            toast.success('Incidencia marcada como resuelta');
          } catch (error) {
            console.error('Error marcando incidencia como resuelta:', error);
            toast.error('No se pudo marcar como resuelta');
          }
        };
      // Handler para ver el perfil de un estudiante
      const handleVerPerfil = async (nombre: string, estudianteId?: string) => {
        setActiveTab('estudiantes');
        let idFinal = estudianteId;
        let nombreFinal = nombre;
        
        // Si tenemos el ID, usarlo directamente (más confiable)
        if (estudianteId) {
          console.log('📝 Usando ID del estudiante para ver perfil:', estudianteId);
          setSelectedStudentId(estudianteId);
          setSelectedStudentName(nombre);
          idFinal = estudianteId;
          nombreFinal = nombre;
        } else {
          // Buscar el estudiante por nombre para obtener su ID
          console.log('🔍 Buscando estudiante por nombre:', nombre);
          const estudiante = await fetchEstudiante(nombre);
          if (estudiante?.id) {
            console.log('✅ Estudiante encontrado por nombre, ID:', estudiante.id);
            setSelectedStudentId(estudiante.id);
            setSelectedStudentName(getNombreCompleto(estudiante));
            idFinal = estudiante.id;
            nombreFinal = getNombreCompleto(estudiante);
          } else {
            console.warn('⚠️ Estudiante no encontrado por nombre:', nombre);
            // Intentar buscar en estudiantesInfo local
            // Primero intentar buscar por ID si el nombre parece ser un UUID, si no por nombre
            const esUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nombre);
            const estudianteLocal = estudiantesInfo.find(e => {
              if (esUUID && e.id) {
                return e.id === nombre;
              }
              return getNombreCompleto(e) === nombre;
            });
            if (estudianteLocal?.id) {
              console.log('✅ Estudiante encontrado en lista local, ID:', estudianteLocal.id);
              setSelectedStudentId(estudianteLocal.id);
            setSelectedStudentName(getNombreCompleto(estudianteLocal));
            idFinal = estudianteLocal.id;
            nombreFinal = getNombreCompleto(estudianteLocal);
            } else {
              setSelectedStudentId(null);
              setSelectedStudentName(nombre);
            }
          }
        }
        try {
          // Usar el ID si está disponible, si no usar el nombre
          if (idFinal) {
            console.log(`🔍 Buscando incidencias para estudiante ID: ${idFinal}, nombre: ${nombreFinal}`);
            const incidencias = await getIncidenciasCompletasByStudent(idFinal);
            console.log(`📊 Incidencias recibidas del API: ${incidencias.length}`);
            console.log(`📋 Detalles de incidencias:`, incidencias);
          setIncidenciasEstudiante(incidencias);
          } else {
            // Fallback: intentar buscar por ID en estudiantesInfo primero, luego por nombre
            const estudianteLocal = estudiantesInfo.find(e => getNombreCompleto(e) === nombreFinal);
            if (estudianteLocal?.id) {
              console.log(`🔍 Buscando incidencias para estudiante ID (desde lista local): ${estudianteLocal.id}`);
              const incidencias = await getIncidenciasCompletasByStudent(estudianteLocal.id);
              console.log(`📊 Incidencias recibidas del API: ${incidencias.length}`);
              setIncidenciasEstudiante(incidencias);
            } else {
              console.log(`🔍 Buscando incidencias para estudiante nombre: ${nombreFinal}`);
              const incidencias = await getIncidenciasCompletasByStudent(nombreFinal);
              console.log(`📊 Incidencias recibidas del API: ${incidencias.length}`);
              setIncidenciasEstudiante(incidencias);
            }
          }
        } catch (error) {
          console.error('❌ Error cargando incidencias del estudiante:', error);
          setIncidenciasEstudiante([]);
        }
        setReporte(null);
        setMostrarNotas(false);
      };

      // Handler para volver a la lista de estudiantes
      const handleVolverALista = () => {
        setSelectedStudentId(null);
        setSelectedStudentName(null);
        setIncidenciasEstudiante([]);
        setReporte(null);
        setMostrarNotas(false);
      };
    // Filtros para estudiantes
    const [filtroGrado, setFiltroGrado] = useState('');
    const [filtroSeccion, setFiltroSeccion] = useState('');
    const [busquedaEstudiante, setBusquedaEstudiante] = useState('');
  type TabType = 'derivadas' | 'estudiantes' | 'general' | 'incidencias' | 'administracion';
  const [activeTab, setActiveTab] = useState<TabType>('derivadas');
  const [refreshKey, setRefreshKey] = useState(0); // Para forzar re-render después de importar
  
  const [adminSubTab, setAdminSubTab] = useState<'estudiantes' | 'profesores' | 'grados' | 'cursos'>('estudiantes');
  const [estudiantesInfo, setEstudiantesInfo] = useState<EstudianteInfo[]>([]);
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [grados, setGrados] = useState<string[]>([]);
  const [secciones, setSecciones] = useState<string[]>([]);

  // OPTIMIZACIÓN: Cargar todos los datos en paralelo en un solo useEffect
  useEffect(() => {
    const loadAllData = async () => {
      try {
        // Cargar todos los datos independientes en paralelo
        const [
          estudiantesData,
          tutoresData,
          clasesData,
          gradosData,
          seccionesData,
          asignacionesData,
          incidenciasData
        ] = await Promise.all([
          fetchEstudiantes(),
          fetchTutores(),
          fetchClases(),
          getGrados(),
          getSecciones(),
          fetchTutoresGradoSeccion(), // OPTIMIZACIÓN: Cargar todas las asignaciones de una vez
          getListaEstudiantes()
        ]);

        // Si no hay estudiantes, ejecutar seed
        if (estudiantesData.length === 0) {
          console.log('No hay estudiantes, ejecutando seed...');
          try {
            const seedResponse = await fetch('/api/seed', { method: 'POST' });
            const seedData = await seedResponse.json();
            if (seedData.success) {
              // Recargar estudiantes después del seed
              const estudiantesAfterSeed = await fetchEstudiantes();
              const incidenciasAfterSeed = await getListaEstudiantes();
              
              const listaCompleta = estudiantesAfterSeed.map((est: any) => {
                // Buscar incidencia SOLO por ID (no usar nombre)
                const inc = incidenciasAfterSeed.find(i => {
                  // REQUERIDO: Tanto el estudiante como la incidencia deben tener ID
                  if (est.id && i.studentId) {
                    return i.studentId === est.id;
                  }
                  // Si no hay ID en alguno, no hacer match (usar ID, no nombre)
                  return false;
                });
                
                const nombreEst = getNombreCompleto(est as EstudianteInfo);
                console.log(`🔍 Estudiante: ${nombreEst} (ID: ${est.id || 'null'}) - Incidencias encontradas: ${inc ? inc.totalIncidencias : 0} (búsqueda por ID)`);
                
                return {
                  id: est.id,
                  nombre: nombreEst,
                  grado: est.grado || '',
                  seccion: est.seccion || '',
                  totalIncidencias: inc ? inc.totalIncidencias : 0,
                  ultimaIncidencia: inc ? inc.ultimaIncidencia : 'N/A',
                };
              });
              setListaEstudiantes(listaCompleta);
              setEstudiantesInfo(estudiantesAfterSeed);
              return;
            }
          } catch (seedError) {
            console.error('Error ejecutando seed:', seedError);
          }
        }

        // Procesar datos
        console.log('Estudiantes cargados:', estudiantesData.length);
        setEstudiantesInfo(estudiantesData);
        setTutores(tutoresData);
        setClases(clasesData);
        setGrados(gradosData);
        setSecciones(seccionesData);

        // Procesar asignaciones: convertir array a objeto Record
        const asignacionesObj: Record<string, any> = {};
        asignacionesData.forEach((asignacion: any) => {
          if (asignacion.grado && asignacion.seccion) {
            const key = `${asignacion.grado}-${asignacion.seccion}`;
            asignacionesObj[key] = asignacion;
          }
        });
        setAsignacionesTutores(asignacionesObj);

        // Procesar lista de estudiantes con incidencias
        // SOLO buscar por ID (no usar nombre)
        const listaCompleta = estudiantesData.map((est: any) => {
          // Buscar incidencia SOLO por ID (no usar nombre)
          const inc = incidenciasData.find(i => {
            // REQUERIDO: Tanto el estudiante como la incidencia deben tener ID
            if (est.id && i.studentId) {
              return i.studentId === est.id;
            }
            // Si no hay ID en alguno, no hacer match (usar ID, no nombre)
            return false;
          });
          
          const nombreEst = getNombreCompleto(est as EstudianteInfo);
          console.log(`🔍 Estudiante: ${nombreEst} (ID: ${est.id || 'null'}) - Incidencias encontradas: ${inc ? inc.totalIncidencias : 0} (búsqueda por ID)`);
          
          return {
            id: est.id,
            nombre: nombreEst,
            grado: est.grado || '',
            seccion: est.seccion || '',
            totalIncidencias: inc ? inc.totalIncidencias : 0,
            ultimaIncidencia: inc ? inc.ultimaIncidencia : 'N/A',
          };
        });
        setListaEstudiantes(listaCompleta);
      } catch (error) {
        console.error('Error cargando datos:', error);
        // Establecer valores por defecto en caso de error
        setEstudiantesInfo([]);
        setTutores([]);
        setClases([]);
        setGrados(['1ro', '2do', '3ro', '4to', '5to']);
        setSecciones(['A', 'B', 'C']);
        setAsignacionesTutores({});
        setListaEstudiantes([]);
      }
    };
    loadAllData();
  }, [refreshKey]);

  // Cargar incidencias derivadas al inicio y cuando cambie refreshKey o filtroDerivacion
  useEffect(() => {
    const loadIncidenciasDerivadas = async () => {
      try {
        const derivadas = await getIncidenciasDerivadas(filtroDerivacion === 'todas' ? undefined : filtroDerivacion);
        setIncidenciasDerivadas(derivadas);
      } catch (error) {
        console.error('Error cargando incidencias derivadas:', error);
        setIncidenciasDerivadas([]);
      }
    };
    loadIncidenciasDerivadas();
  }, [refreshKey, filtroDerivacion]);

  // Recargar incidencias derivadas cuando se cambia al tab de derivadas
  useEffect(() => {
    if (activeTab === 'derivadas') {
      const loadIncidenciasDerivadas = async () => {
        try {
          const derivadas = await getIncidenciasDerivadas(filtroDerivacion === 'todas' ? undefined : filtroDerivacion);
          setIncidenciasDerivadas(derivadas);
        } catch (error) {
          console.error('Error cargando incidencias derivadas:', error);
          setIncidenciasDerivadas([]);
        }
      };
      loadIncidenciasDerivadas();
    }
  }, [activeTab, filtroDerivacion]);

  // Actualizar automáticamente las incidencias derivadas cada 30 segundos cuando el tab está activo
  useEffect(() => {
    if (activeTab !== 'derivadas') return;

    const interval = setInterval(async () => {
      try {
        const derivadas = await getIncidenciasDerivadas(filtroDerivacion === 'todas' ? undefined : filtroDerivacion);
        setIncidenciasDerivadas(derivadas);
        console.log('🔄 Incidencias derivadas actualizadas automáticamente');
      } catch (error) {
        console.error('Error actualizando incidencias derivadas:', error);
      }
    }, 30000); // Cada 30 segundos

    return () => clearInterval(interval);
  }, [activeTab, filtroDerivacion]);

  // Recargar incidencias derivadas cuando la ventana vuelve a tener foco
  useEffect(() => {
    if (activeTab !== 'derivadas') return;

    const handleFocus = async () => {
      try {
        const derivadas = await getIncidenciasDerivadas(filtroDerivacion === 'todas' ? undefined : filtroDerivacion);
        setIncidenciasDerivadas(derivadas);
        console.log('🔄 Incidencias derivadas actualizadas al volver el foco');
      } catch (error) {
        console.error('Error actualizando incidencias derivadas:', error);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [activeTab, filtroDerivacion]);


  const [mostrarFormularioCurso, setMostrarFormularioCurso] = useState(false);
  const [formularioCurso, setFormularioCurso] = useState({
    nombre: '',
    grado: '',
    seccion: '',
    profesor: '',
    dias: [] as DiaSemana[]
  });
  const [mostrarAgregarGrado, setMostrarAgregarGrado] = useState(false);
  const [nuevoGradoInput, setNuevoGradoInput] = useState('');
  const [mostrarAgregarSeccion, setMostrarAgregarSeccion] = useState(false);
  const [nuevaSeccionInput, setNuevaSeccionInput] = useState('');
  // Estados para diálogo de información cuando hay estudiantes
  const [mostrarInfoEstudiantes, setMostrarInfoEstudiantes] = useState(false);
  const [infoTipo, setInfoTipo] = useState<'grado' | 'seccion' | null>(null);
  const [infoNombre, setInfoNombre] = useState<string>('');
  const [infoMensaje, setInfoMensaje] = useState<string>('');
  
  // Filtros para administración de estudiantes
  const [filtroAdminGrado, setFiltroAdminGrado] = useState('');
  const [filtroAdminSeccion, setFiltroAdminSeccion] = useState('');
  const [busquedaAdminEstudiante, setBusquedaAdminEstudiante] = useState('');
  const [estudianteEditandoAdmin, setEstudianteEditandoAdmin] = useState<string | null>(null); // Almacena ID cuando está disponible, si no nombre
  const [formularioCerradoKey, setFormularioCerradoKey] = useState(0); // Key para forzar re-render
  const [estudianteEditForm, setEstudianteEditForm] = useState<Partial<EstudianteInfo>>({});
  const [estudianteNombreOriginal, setEstudianteNombreOriginal] = useState<string | null>(null);
  const [estudianteIdOriginal, setEstudianteIdOriginal] = useState<string | null>(null); // ID original para tracking completo
  
  // Estados para formulario de nuevo estudiante
  const [mostrarFormularioNuevoEstudiante, setMostrarFormularioNuevoEstudiante] = useState(false);
  const [nuevoEstudianteForm, setNuevoEstudianteForm] = useState<Partial<EstudianteInfo>>({
    nombres: '',
    apellidos: '',
    grado: '',
    seccion: '',
    edad: undefined,
    fechaNacimiento: '',
    contacto: { telefono: '', email: '', nombre: '' },
    tutor: { nombre: '', telefono: '', email: '' },
    apoderado: {
      nombre: '',
      parentesco: '',
      telefono: '',
      telefonoAlternativo: '',
      email: '',
      direccion: ''
    }
  });
  
  // useEffect para asegurar que el formulario se cierre si estudianteEditandoAdmin tiene un valor pero no coincide con ningún estudiante
  // IMPORTANTE: Este useEffect debe estar DESPUÉS de todas las declaraciones de estado que usa
  useEffect(() => {
    if (estudianteEditandoAdmin !== null && estudiantesInfo.length > 0) {
      const estudianteEncontrado = estudiantesInfo.find((e: any) => {
        const identificador = e.id || getNombreCompleto(e);
        return identificador === estudianteEditandoAdmin;
      });
      
      // Si no se encuentra el estudiante que se está editando, cerrar el formulario
      // Esto puede pasar si el estudiante fue actualizado y su identificador cambió
      if (!estudianteEncontrado) {
        console.log('⚠️ Estudiante en edición no encontrado, cerrando formulario...');
        setEstudianteEditandoAdmin(null);
        setEstudianteEditForm({});
        setEstudianteNombreOriginal(null);
        setEstudianteIdOriginal(null);
      }
    }
  }, [estudiantesInfo, estudianteEditandoAdmin]);
  
  // Estados para edición de profesores
  const [profesorEditandoAdmin, setProfesorEditandoAdmin] = useState<string | null>(null);
  const [profesorEditForm, setProfesorEditForm] = useState<Partial<Tutor>>({});
  
  // Estados para mapeo de columnas Excel
  const [mostrarMapeoEstudiantes, setMostrarMapeoEstudiantes] = useState(false);
  const [mostrarMapeoProfesores, setMostrarMapeoProfesores] = useState(false);
  const [columnasExcelEstudiantes, setColumnasExcelEstudiantes] = useState<string[]>([]);
  const [columnasExcelProfesores, setColumnasExcelProfesores] = useState<string[]>([]);
  const [mapeoEstudiantes, setMapeoEstudiantes] = useState<Record<string, string>>({});
  const [mapeoProfesores, setMapeoProfesores] = useState<Record<string, string>>({});
  const [archivoExcelEstudiantes, setArchivoExcelEstudiantes] = useState<File | null>(null);
  const [archivoExcelProfesores, setArchivoExcelProfesores] = useState<File | null>(null);
  const [datosExcelEstudiantes, setDatosExcelEstudiantes] = useState<any[]>([]);
  const [datosExcelProfesores, setDatosExcelProfesores] = useState<any[]>([]);
  const [mensajeImportacion, setMensajeImportacion] = useState<{ tipo: 'success' | 'error'; mensaje: string; detalles?: string } | null>(null);
  
  // Filtros para administración de grados y secciones
  const [filtroTutoresGrado, setFiltroTutoresGrado] = useState('');
  const [filtroTutoresSeccion, setFiltroTutoresSeccion] = useState('');
  const [asignacionesTutores, setAsignacionesTutores] = useState<Record<string, any>>({});
  
  // Filtros para administración de cursos
  const [filtroCursosGrado, setFiltroCursosGrado] = useState('');
  const [filtroCursosSeccion, setFiltroCursosSeccion] = useState('');
  const [busquedaCursosNombre, setBusquedaCursosNombre] = useState('');
  
  // Estados para listado de incidencias
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);

  // Estados para notificaciones
  const [incidenciasVistas, setIncidenciasVistas] = useState<Set<string>>(new Set());
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);

  // Estados para lista de estudiantes (declarados antes del useEffect que los usa)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null); // Para mostrar en UI

  // Estados para filtros de fecha (declarados antes del useEffect que los usa)
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');

  // Cargar incidencias vistas desde la base de datos al montar
  useEffect(() => {
    const loadIncidenciasVistas = async () => {
      try {
        const ids = await getIncidenciasVistas('director');
        setIncidenciasVistas(new Set(ids));
      } catch (error) {
        console.error('Error cargando incidencias vistas:', error);
      }
    };
    loadIncidenciasVistas();
  }, []);

  // Cargar incidencias desde la API al montar, cuando cambie refreshKey, o cuando se cambie al tab de incidencias
  useEffect(() => {
    const loadIncidencias = async () => {
      try {
        const todasIncidencias = await fetchIncidencias();
        console.log('📊 Director: Incidencias cargadas desde API:', todasIncidencias.length);
        console.log('📊 Director: IDs de incidencias:', todasIncidencias.map((inc: Incidencia) => ({ id: inc.id, estudiante: inc.studentName, derivacion: inc.derivacion, resuelta: inc.resuelta, estado: inc.estado })));
        setIncidencias(todasIncidencias);
      } catch (error) {
        console.error('Error cargando incidencias:', error);
        setIncidencias([]);
      }
    };
    loadIncidencias();
  }, [refreshKey, activeTab]); // Agregar activeTab para recargar cuando se cambia al tab de incidencias
  
  // Actualizar incidencias cuando se cambia al tab de incidencias
  useEffect(() => {
    if (activeTab === 'incidencias') {
    const loadIncidencias = async () => {
      try {
        const todasIncidencias = await fetchIncidencias();
          console.log('📊 Tab Incidencias: Recargando incidencias desde BD:', todasIncidencias.length);
        setIncidencias(todasIncidencias);
        } catch (error) {
          console.error('Error recargando incidencias en tab:', error);
        }
      };
      loadIncidencias();
    }
  }, [activeTab]);

  // Actualizar incidencias periódicamente cuando se está en el tab de incidencias
  useEffect(() => {
    if (activeTab === 'incidencias') {
      const interval = setInterval(async () => {
        try {
          const todasIncidencias = await fetchIncidencias();
          setIncidencias(prev => {
            // Solo actualizar si hay cambios (comparar por IDs y estados)
            const idsPrevios = new Set(prev.map(inc => `${inc.id}-${inc.estado}-${inc.resuelta}`));
            const idsNuevos = new Set(todasIncidencias.map(inc => `${inc.id}-${inc.estado}-${inc.resuelta}`));
            if (idsPrevios.size !== idsNuevos.size || 
                !Array.from(idsNuevos).every(id => idsPrevios.has(id))) {
              console.log('🔄 Actualizando incidencias desde BD (cambios detectados)');
              return todasIncidencias;
                }
                return prev;
              });
      } catch (error) {
          console.error('Error actualizando incidencias periódicamente:', error);
      }
      }, 5000); // Actualizar cada 5 segundos

      return () => clearInterval(interval);
    }
  }, [activeTab]);
  
  // Las incidencias vistas se cargan desde la BASE DE DATOS en el useEffect de arriba (línea ~880)
  // Ya no se usa localStorage - todo se maneja desde la base de datos // Solo se ejecuta una vez al montar
  
  // Cerrar dropdown de notificaciones al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (mostrarNotificaciones && !target.closest('.notificaciones-dropdown')) {
        setMostrarNotificaciones(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mostrarNotificaciones]);
  
  // Guardar incidencias vistas en la base de datos cuando cambien
  useEffect(() => {
    const saveVistas = async () => {
    try {
      // Validar y filtrar solo IDs válidos antes de guardar
      const idsValidos = Array.from(incidenciasVistas).filter(id => id && typeof id === 'string' && id.trim() !== '');
        if (idsValidos.length > 0) {
          await marcarIncidenciasVistas(idsValidos, 'director');
        }
    } catch (error) {
      console.error('Error guardando incidencias vistas:', error);
      }
    };
    if (incidenciasVistas.size > 0) {
      saveVistas();
    }
  }, [incidenciasVistas]);

  // Escuchar eventos personalizados para actualizar notificaciones
  useEffect(() => {
    // Ya no escuchamos cambios en localStorage, solo eventos personalizados

    const handleIncidenciaRegistrada = async (e: Event) => {
      const customEvent = e as CustomEvent;
      console.log('🔔 Evento incidenciaRegistrada recibido:', customEvent.detail);
      const nuevaId = customEvent.detail?.id;
      if (nuevaId && typeof nuevaId === 'string') {
        console.log('📢 Nueva incidencia registrada, recargando lista para mostrar en notificaciones:', nuevaId);
        // NO marcar como vista automáticamente - debe aparecer en notificaciones
        // Recargar las incidencias generales inmediatamente para actualizar métricas
        try {
          // Recargar incidencias generales según los filtros actuales
          const nuevasIncidencias = fechaInicio && fechaFin
            ? await fetchIncidencias({ fechaInicio, fechaFin })
            : await fetchIncidencias();
          setIncidenciasGenerales(nuevasIncidencias);
          console.log('✅ Incidencias generales actualizadas:', nuevasIncidencias.length);
        } catch (error) {
          console.error('❌ Error recargando incidencias generales:', error);
        }
        
        setTimeout(() => {
          setRefreshKey(prev => {
            console.log('🔄 Actualizando refreshKey para mostrar nueva incidencia:', prev + 1);
            return prev + 1;
          });
        }, 200);
        
        // Si estamos viendo el perfil de un estudiante, recargar sus incidencias
        if (selectedStudentId || selectedStudentName) {
          console.log('🔄 Recargando incidencias del estudiante en perfil...');
          try {
            const idParaBuscar = selectedStudentId || selectedStudentName;
            if (idParaBuscar) {
              const incidenciasActualizadas = await getIncidenciasCompletasByStudent(idParaBuscar);
              console.log(`✅ Incidencias del estudiante actualizadas: ${incidenciasActualizadas.length} encontradas`);
              setIncidenciasEstudiante(incidenciasActualizadas);
            }
          } catch (error) {
            console.error('❌ Error recargando incidencias del estudiante:', error);
          }
        }
      } else {
        console.warn('⚠️ ID de incidencia inválido:', nuevaId);
      }
    };

    // Handler para cuando se actualiza una incidencia (cambio de estado, etc.)
    const handleIncidenciaActualizada = async (e: Event) => {
      const customEvent = e as CustomEvent;
      console.log('🔔 Evento incidenciaActualizada recibido:', customEvent.detail);
      // Recargar incidencias generales inmediatamente para actualizar métricas
      try {
        // Recargar incidencias generales según los filtros actuales
        const nuevasIncidencias = fechaInicio && fechaFin
          ? await fetchIncidencias({ fechaInicio, fechaFin })
          : await fetchIncidencias();
        setIncidenciasGenerales(nuevasIncidencias);
        console.log('✅ Incidencias generales actualizadas por cambio:', nuevasIncidencias.length);
      } catch (error) {
        console.error('❌ Error recargando incidencias generales:', error);
      }
      // Recargar incidencias cuando se actualiza una incidencia
      setTimeout(() => {
        setRefreshKey(prev => {
          console.log('🔄 Actualizando refreshKey por incidencia actualizada:', prev + 1);
          return prev + 1;
        });
      }, 200);
    };

    // Ya no escuchamos eventos de storage de localStorage
    // Escuchar evento personalizado (para cambios en la misma pestaña)
    window.addEventListener('incidenciaRegistrada', handleIncidenciaRegistrada as EventListener);
    window.addEventListener('incidenciaActualizada', handleIncidenciaActualizada as EventListener);
    
    // Escuchar evento cuando se marca una incidencia como vista desde el navbar
    const handleIncidenciaMarcadaComoVista = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const id = customEvent.detail?.id;
      if (id) {
          try {
          await marcarIncidenciaVista(id, 'director');
          setIncidenciasVistas(prev => new Set([...prev, id]));
          } catch (error) {
          console.error('Error guardando incidencia vista:', error);
          }
      }
    };
    
    // Escuchar evento cuando se marca todas como vistas desde el navbar
    const handleTodasMarcadasComoVistas = async () => {
      const todasIds = incidencias
        .map(inc => inc.id)
        .filter(id => id && typeof id === 'string' && id.trim() !== '');
      try {
        await marcarIncidenciasVistas(todasIds, 'director');
        setIncidenciasVistas(new Set(todasIds));
      } catch (error) {
        console.error('Error guardando incidencias vistas:', error);
      }
    };
    
    // Escuchar evento cuando se hace clic en una notificación del navbar
    const handleAbrirIncidenciaDesdeNavbar = (e: Event) => {
      const customEvent = e as CustomEvent;
      const incidencia = customEvent.detail?.incidencia;
      if (incidencia) {
        setIncidenciaDetalle(incidencia);
      }
    };

    window.addEventListener('incidenciaMarcadaComoVista', handleIncidenciaMarcadaComoVista as EventListener);
    window.addEventListener('todasIncidenciasMarcadasComoVistas', handleTodasMarcadasComoVistas);
    window.addEventListener('abrirIncidenciaDesdeNotificacionNavbar', handleAbrirIncidenciaDesdeNavbar as EventListener);
    window.addEventListener('incidenciaActualizada', handleIncidenciaActualizada as EventListener);

    return () => {
      window.removeEventListener('incidenciaRegistrada', handleIncidenciaRegistrada as EventListener);
      window.removeEventListener('incidenciaMarcadaComoVista', handleIncidenciaMarcadaComoVista as EventListener);
      window.removeEventListener('todasIncidenciasMarcadasComoVistas', handleTodasMarcadasComoVistas);
      window.removeEventListener('abrirIncidenciaDesdeNotificacionNavbar', handleAbrirIncidenciaDesdeNavbar as EventListener);
      window.removeEventListener('incidenciaActualizada', handleIncidenciaActualizada as EventListener);
    };
  }, [incidencias, selectedStudentId, selectedStudentName, fechaInicio, fechaFin]);
  
  // Obtener nuevas incidencias (no vistas) - usar useMemo para evitar recálculos innecesarios
  const nuevasIncidencias = useMemo(() => {
    const noVistas = incidencias.filter(inc => inc.id && !incidenciasVistas.has(inc.id));
    console.log('📊 Total incidencias:', incidencias.length, '| Vistas:', incidenciasVistas.size, '| No vistas:', noVistas.length);
    return noVistas
      .sort((a, b) => {
        const fechaA = new Date(a.timestamp || a.fecha || 0).getTime();
        const fechaB = new Date(b.timestamp || b.fecha || 0).getTime();
        return fechaB - fechaA; // Más recientes primero
      })
      .slice(0, 10); // Máximo 10 notificaciones
  }, [incidencias, incidenciasVistas]);
  
  // Marcar incidencia como vista
  const marcarComoVista = (incidenciaId: string) => {
    if (!incidenciaId || typeof incidenciaId !== 'string' || incidenciaId.trim() === '') {
      console.warn('Intento de marcar incidencia con ID inválido:', incidenciaId);
      return;
    }
    setIncidenciasVistas(prev => {
      const nuevoSet = new Set([...prev, incidenciaId]);
      // Guardar inmediatamente en la base de datos
      marcarIncidenciaVista(incidenciaId, 'director').catch(error => {
        console.error('Error guardando incidencia vista:', error);
      });
      return nuevoSet;
    });
  };
  
  // Marcar todas como vistas
  const marcarTodasComoVistas = async () => {
    // Filtrar solo IDs válidos
    const todasIds = incidencias
      .map(inc => inc.id)
      .filter(id => id && typeof id === 'string' && id.trim() !== '');
    try {
      await marcarIncidenciasVistas(todasIds, 'director');
      setIncidenciasVistas(new Set(todasIds));
      console.log('✅ Todas las incidencias marcadas como vistas y guardadas. Total:', todasIds.length);
    } catch (error) {
      console.error('Error guardando incidencias vistas:', error);
    }
  };
  const [filtroGravedad, setFiltroGravedad] = useState<Gravedad | 'todas'>('todas');
  const [filtroTipo, setFiltroTipo] = useState<TipoIncidencia | 'todas'>('todas');
  const [busquedaEstudianteIncidencias, setBusquedaEstudianteIncidencias] = useState('');
  const [ordenFecha, setOrdenFecha] = useState<'reciente' | 'antiguo'>('reciente');
  
  // Estados para lista de estudiantes
  const [listaEstudiantes, setListaEstudiantes] = useState<Array<{ id?: string; nombre: string; totalIncidencias: number; ultimaIncidencia: string; grado: string; seccion: string }>>([]);
  const [incidenciasEstudiante, setIncidenciasEstudiante] = useState<Incidencia[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reporte, setReporte] = useState<ReporteIA | null>(null);
  const [mostrarNotas, setMostrarNotas] = useState(false);
  // --- Estados de edición de estudiante ---
  const [editando, setEditando] = useState(false);
  const [infoEdit, setInfoEdit] = useState<any>(null);
  const [fotoPreview, setFotoPreview] = useState('');
  const [guardandoEstudiante, setGuardandoEstudiante] = useState(false);

  // Sincronizar infoEdit y fotoPreview cuando cambia el estudiante seleccionado o refreshKey
  // PERO solo si no estamos guardando (para evitar interferencias)
  useEffect(() => {
    // No recargar si estamos en proceso de guardado
    if (guardandoEstudiante) {
      console.log('⏸️ Guardado en progreso, omitiendo recarga automática');
      return;
    }
    
    const loadEstudianteInfo = async () => {
      if (selectedStudentId) {
        try {
          // Usar ID para buscar (más confiable)
          const estudianteInfo = await fetchEstudianteById(selectedStudentId);
          if (estudianteInfo) {
            // Actualizar también el nombre para mostrar en UI
            if (estudianteInfo.nombre) {
              setSelectedStudentName(estudianteInfo.nombre);
            }
            // Si el estudiante no tiene tutor asignado, verificar si hay un tutor general para su grado y sección
            const grado = estudianteInfo.grado;
            const seccion = estudianteInfo.seccion;
            if (!estudianteInfo.tutor && grado && seccion) {
              const tutorGradoSeccion = await getTutorGradoSeccion(grado, seccion);
              if (tutorGradoSeccion) {
                const tutores = await fetchTutores();
                const tutor = tutores.find(t => t.id === tutorGradoSeccion.tutorId);
                if (tutor) {
                  estudianteInfo.tutor = {
                    nombre: tutor.nombre,
                    telefono: tutor.telefono,
                    email: tutor.email
                  };
                }
              }
            }
            setInfoEdit(estudianteInfo);
            // Si los contadores están como null, recalcular automáticamente
            if ((estudianteInfo.asistencias === null || estudianteInfo.asistencias === undefined) &&
                (estudianteInfo.ausencias === null || estudianteInfo.ausencias === undefined) &&
                (estudianteInfo.tardanzas === null || estudianteInfo.tardanzas === undefined)) {
              try {
                await recalcularContadoresAsistencia();
                // Recargar información del estudiante después de recalcular
                const estudianteActualizado = await fetchEstudianteById(selectedStudentId);
                if (estudianteActualizado) {
                  setInfoEdit(estudianteActualizado);
                }
              } catch (error) {
                console.error('Error recalculando contadores automáticamente:', error);
              }
            }
            setFotoPreview(estudianteInfo?.fotoPerfil || '');
            setEditando(false);
          }
        } catch (error) {
          console.error('Error cargando información del estudiante:', error);
        }
      } else {
        setInfoEdit(null);
        setFotoPreview('');
        setEditando(false);
      }
    };
    loadEstudianteInfo();
  }, [selectedStudentId, refreshKey, guardandoEstudiante]);

  // --- HANDLERS DE EDICIÓN ---
  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setInfoEdit((prev: any) => ({ ...prev, [name]: value }));
  };
  const handleContactoChange = (e: any) => {
    const { name, value } = e.target;
    setInfoEdit((prev: any) => ({ ...prev, contacto: { ...prev.contacto, [name]: value } }));
  };
  const handleFotoChange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev: any) => {
        setFotoPreview(ev.target.result);
        setInfoEdit((prev: any) => ({ ...prev, fotoPerfil: ev.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };
  const handleEliminarFoto = () => {
    setFotoPreview('');
    setInfoEdit((prev: any) => ({ ...prev, fotoPerfil: '' }));
  };
  const handleGuardar = async () => {
    try {
      console.log('🔄 Iniciando guardado desde Información del Estudiante...');
      
      // Activar bandera para evitar que el useEffect interfiera
      setGuardandoEstudiante(true);
      
      if (!infoEdit || !selectedStudentId) {
        console.error('❌ Faltan datos:', { infoEdit, selectedStudentId });
        toast.error('No hay información para guardar');
        setGuardandoEstudiante(false);
        return;
      }

      // Validaciones
      if (infoEdit.nombres) {
        const nombreValidation = validateName(infoEdit.nombres, 'El nombre');
        if (!nombreValidation.isValid) {
          toast.error(nombreValidation.error);
          setGuardandoEstudiante(false);
          return;
        }
      }

      if (infoEdit.apellidos) {
        const apellidoValidation = validateName(infoEdit.apellidos, 'El apellido');
        if (!apellidoValidation.isValid) {
          toast.error(apellidoValidation.error);
          setGuardandoEstudiante(false);
          return;
        }
      }

      if (infoEdit.edad) {
        const edadValidation = validateAge(infoEdit.edad);
        if (!edadValidation.isValid) {
          toast.error(edadValidation.error);
          setGuardandoEstudiante(false);
          return;
        }
      }

      if (infoEdit.contacto?.email) {
        const emailValidation = validateEmail(infoEdit.contacto.email);
        if (!emailValidation.isValid) {
          toast.error(emailValidation.error);
          setGuardandoEstudiante(false);
          return;
        }
      }

      if (infoEdit.contacto?.telefono) {
        const phoneValidation = validatePhone(infoEdit.contacto.telefono);
        if (!phoneValidation.isValid) {
          toast.error(phoneValidation.error);
          setGuardandoEstudiante(false);
          return;
        }
      }

      if (infoEdit.tutor?.email) {
        const emailValidation = validateEmail(infoEdit.tutor.email);
        if (!emailValidation.isValid) {
          toast.error(emailValidation.error);
          setGuardandoEstudiante(false);
          return;
        }
      }

      if (infoEdit.tutor?.telefono) {
        const phoneValidation = validatePhone(infoEdit.tutor.telefono);
        if (!phoneValidation.isValid) {
          toast.error(phoneValidation.error);
          setGuardandoEstudiante(false);
          return;
        }
      }

      if (infoEdit.apoderado?.email) {
        const emailValidation = validateEmail(infoEdit.apoderado.email);
        if (!emailValidation.isValid) {
          toast.error(emailValidation.error);
          setGuardandoEstudiante(false);
          return;
        }
      }

      if (infoEdit.apoderado?.telefono) {
        const phoneValidation = validatePhone(infoEdit.apoderado.telefono);
        if (!phoneValidation.isValid) {
          toast.error(phoneValidation.error);
          setGuardandoEstudiante(false);
          return;
        }
      }

      if (infoEdit.apoderado?.telefonoAlternativo) {
        const phoneValidation = validatePhone(infoEdit.apoderado.telefonoAlternativo);
        if (!phoneValidation.isValid) {
          toast.error(phoneValidation.error);
          setGuardandoEstudiante(false);
          return;
        }
      }

      console.log('📝 Datos a guardar:', infoEdit);
      console.log('📝 Estudiante ID seleccionado:', selectedStudentId);

      // Obtener el estudiante completo desde la base de datos usando ID (más confiable)
      console.log('🔍 Buscando estudiante completo por ID...');
      const estudianteCompleto = await fetchEstudianteById(selectedStudentId);
      if (!estudianteCompleto) {
        console.error('❌ No se encontró el estudiante completo');
        toast.error('No se pudo cargar la información del estudiante');
        setGuardandoEstudiante(false);
        return;
      }
      console.log('✅ Estudiante completo encontrado:', estudianteCompleto);

      // Fusionar la información editada con la información completa existente
      // IMPORTANTE: Solo incluir campos de infoEdit que tienen valores válidos (no undefined, null, o vacíos)
      // Esto asegura que no se pierdan campos que no se están editando
      const estudianteActualizado: EstudianteInfo = {
        ...estudianteCompleto, // Empezar con todos los datos existentes
        // Solo actualizar nombres si tiene un valor válido
        nombres: (infoEdit.nombres && infoEdit.nombres.trim()) 
          ? infoEdit.nombres.trim() 
          : estudianteCompleto.nombres,
        // Solo actualizar apellidos si tiene un valor válido
        apellidos: (infoEdit.apellidos && infoEdit.apellidos.trim()) 
          ? infoEdit.apellidos.trim() 
          : estudianteCompleto.apellidos,
        // Solo actualizar grado si tiene un valor válido
        grado: (infoEdit.grado !== undefined && infoEdit.grado !== null && infoEdit.grado !== '') 
          ? infoEdit.grado 
          : estudianteCompleto.grado,
        // Solo actualizar sección si tiene un valor válido
        seccion: (infoEdit.seccion !== undefined && infoEdit.seccion !== null && infoEdit.seccion !== '') 
          ? infoEdit.seccion 
          : estudianteCompleto.seccion,
        // Solo actualizar edad si tiene un valor válido
        edad: (infoEdit.edad !== undefined && infoEdit.edad !== null) 
          ? infoEdit.edad 
          : estudianteCompleto.edad,
        // Solo actualizar fechaNacimiento si tiene un valor válido
        fechaNacimiento: (infoEdit.fechaNacimiento !== undefined && infoEdit.fechaNacimiento !== null && infoEdit.fechaNacimiento !== '') 
          ? infoEdit.fechaNacimiento 
          : estudianteCompleto.fechaNacimiento,
        // Solo actualizar fotoPerfil si tiene un valor válido
        fotoPerfil: (infoEdit.fotoPerfil !== undefined && infoEdit.fotoPerfil !== null && infoEdit.fotoPerfil !== '') 
          ? infoEdit.fotoPerfil 
          : estudianteCompleto.fotoPerfil,
        // Preservar contacto: solo actualizar campos que tienen valores válidos
        contacto: (() => {
          if (!infoEdit.contacto) return estudianteCompleto.contacto;
          const contactoEditado: any = { ...estudianteCompleto.contacto };
          if (infoEdit.contacto.telefono !== undefined && infoEdit.contacto.telefono !== null && infoEdit.contacto.telefono !== '') {
            contactoEditado.telefono = infoEdit.contacto.telefono;
          }
          if (infoEdit.contacto.email !== undefined && infoEdit.contacto.email !== null && infoEdit.contacto.email !== '') {
            contactoEditado.email = infoEdit.contacto.email;
          }
          if (infoEdit.contacto.nombre !== undefined && infoEdit.contacto.nombre !== null && infoEdit.contacto.nombre !== '') {
            contactoEditado.nombre = infoEdit.contacto.nombre;
          }
          return contactoEditado;
        })(),
        // Preservar tutor: solo actualizar campos que tienen valores válidos
        tutor: (() => {
          if (!infoEdit.tutor) return estudianteCompleto.tutor;
          const tutorEditado: any = { ...estudianteCompleto.tutor };
          if (infoEdit.tutor.nombre !== undefined && infoEdit.tutor.nombre !== null && infoEdit.tutor.nombre !== '') {
            tutorEditado.nombre = infoEdit.tutor.nombre;
          }
          if (infoEdit.tutor.telefono !== undefined && infoEdit.tutor.telefono !== null && infoEdit.tutor.telefono !== '') {
            tutorEditado.telefono = infoEdit.tutor.telefono;
          }
          if (infoEdit.tutor.email !== undefined && infoEdit.tutor.email !== null && infoEdit.tutor.email !== '') {
            tutorEditado.email = infoEdit.tutor.email;
          }
          return tutorEditado;
        })(),
        // Preservar apoderado: solo actualizar campos que tienen valores válidos
        apoderado: (() => {
          if (!infoEdit.apoderado) return estudianteCompleto.apoderado;
          const apoderadoEditado: any = { ...estudianteCompleto.apoderado };
          if (infoEdit.apoderado.nombre !== undefined && infoEdit.apoderado.nombre !== null && infoEdit.apoderado.nombre !== '') {
            apoderadoEditado.nombre = infoEdit.apoderado.nombre;
          }
          if (infoEdit.apoderado.parentesco !== undefined && infoEdit.apoderado.parentesco !== null && infoEdit.apoderado.parentesco !== '') {
            apoderadoEditado.parentesco = infoEdit.apoderado.parentesco;
          }
          if (infoEdit.apoderado.telefono !== undefined && infoEdit.apoderado.telefono !== null && infoEdit.apoderado.telefono !== '') {
            apoderadoEditado.telefono = infoEdit.apoderado.telefono;
          }
          if (infoEdit.apoderado.telefonoAlternativo !== undefined && infoEdit.apoderado.telefonoAlternativo !== null && infoEdit.apoderado.telefonoAlternativo !== '') {
            apoderadoEditado.telefonoAlternativo = infoEdit.apoderado.telefonoAlternativo;
          }
          if (infoEdit.apoderado.email !== undefined && infoEdit.apoderado.email !== null && infoEdit.apoderado.email !== '') {
            apoderadoEditado.email = infoEdit.apoderado.email;
          }
          if (infoEdit.apoderado.direccion !== undefined && infoEdit.apoderado.direccion !== null && infoEdit.apoderado.direccion !== '') {
            apoderadoEditado.direccion = infoEdit.apoderado.direccion;
          }
          return apoderadoEditado;
        })(),
      };

      // Validar que nombres y apellidos estén presentes y no estén vacíos
      console.log('✅ Estudiante actualizado preparado:', estudianteActualizado);
      if (!estudianteActualizado.nombres || !estudianteActualizado.nombres.trim() || 
          !estudianteActualizado.apellidos || !estudianteActualizado.apellidos.trim()) {
        console.error('❌ Faltan nombres o apellidos:', {
          nombres: estudianteActualizado.nombres,
          apellidos: estudianteActualizado.apellidos
        });
        toast.error('Los campos nombres y apellidos son requeridos y no pueden estar vacíos');
        setGuardandoEstudiante(false);
        return;
      }

      // Usar el ID del estudiante (más confiable que el nombre)
      const estudianteId = estudianteCompleto.id || selectedStudentId;
      
      if (!estudianteId) {
        console.error('❌ No se pudo obtener el ID del estudiante');
        toast.error('Error: No se pudo identificar al estudiante');
        setGuardandoEstudiante(false);
        return;
      }
      
      console.log('📝 Guardando estudiante con ID:', estudianteId);
      
      // Actualizar el estudiante usando saveEstudianteInfo con estudianteId
      // Esto asegura que se actualice el registro existente en lugar de crear uno nuevo
      console.log('💾 Guardando estudiante en base de datos...');
      try {
        await saveEstudianteInfo(estudianteActualizado, estudianteId);
        console.log('✅ Estudiante guardado exitosamente en la base de datos');
      } catch (error: any) {
        console.error('❌ Error al guardar en la base de datos:', error);
        toast.error(error.message || 'Error al guardar el estudiante en la base de datos');
        setGuardandoEstudiante(false);
        return;
      }

      // Recargar estudiantes desde la base de datos para reflejar cambios
      console.log('🔄 Recargando estudiantes desde la base de datos...');
      const estudiantesActualizados = await fetchEstudiantes();
      setEstudiantesInfo(estudiantesActualizados);
      setRefreshKey(prev => prev + 1);
      console.log('✅ Estudiantes recargados:', estudiantesActualizados.length);

      // Construir el nuevo nombre completo desde los datos que se guardaron
      const nombreCompletoNuevo = `${estudianteActualizado.nombres.trim()} ${estudianteActualizado.apellidos.trim()}`.trim();
      
      // Esperar un momento para asegurar que la base de datos se actualizó completamente
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Recargar el estudiante desde la base de datos usando el ID (más confiable)
      console.log(`🔄 Recargando estudiante con ID: "${estudianteId}"`);
      
      // Intentar recargar hasta 3 veces si falla (por posibles problemas de timing)
      let estudianteRecargado = null;
      for (let intento = 0; intento < 3; intento++) {
        estudianteRecargado = await fetchEstudianteById(estudianteId);
        if (estudianteRecargado) break;
        if (intento < 2) {
          console.log(`⚠️ Intento ${intento + 1} falló, reintentando...`);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      if (!estudianteRecargado) {
        console.error('❌ No se pudo recargar el estudiante después de guardar después de 3 intentos');
        toast.error('Error al recargar la información del estudiante. Por favor, recarga la página.');
        setGuardandoEstudiante(false);
        return;
      }
      
      console.log('✅ Estudiante recargado:', estudianteRecargado);
      
      // Esperar un momento adicional para asegurar que las incidencias se actualizaron en la BD
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Recargar incidencias usando el ID del estudiante (más confiable que el nombre)
      console.log(`🔄 Recargando incidencias con ID: "${estudianteId}"`);
      const nuevasIncidencias = await getIncidenciasCompletasByStudent(estudianteId);
      
      setIncidenciasEstudiante(nuevasIncidencias);
      console.log(`✅ ${nuevasIncidencias.length} incidencias recargadas`);
      
      // Actualizar TODOS los estados de una vez para evitar renders intermedios
      // Esto asegura que el useEffect no interfiera con la actualización
      console.log('🔄 Actualizando estados con datos recargados...');
      setInfoEdit(estudianteRecargado);
      setFotoPreview(estudianteRecargado.fotoPerfil || '');
      // Mantener el mismo ID (no cambia)
      setSelectedStudentId(estudianteId);
      setSelectedStudentName(nombreCompletoNuevo);
      setEditando(false);
        
        // Refrescar lista de estudiantes
        const lista = await getListaEstudiantes();
        const info = await fetchEstudiantes();
        // Unir ambas fuentes para asegurar que todos los estudiantes estén presentes
        // Usar IDs cuando estén disponibles, si no usar nombres
        const identificadoresUnicos = Array.from(new Set([
          ...info.map((i: any) => i.id || getNombreCompleto(i as EstudianteInfo)).filter(Boolean),
          ...lista.map((e: any) => e.id || getNombreCompleto(e as EstudianteInfo)).filter(Boolean)
        ]));
        const listaFinal = identificadoresUnicos.map((identificador: string) => {
          // Intentar buscar por ID primero, si no por nombre
          const esUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identificador);
          const estInfo = info.find((i: any) => {
            if (esUUID && i.id) {
              return i.id === identificador;
            }
            return i.id === identificador || i.nombre === identificador;
          });
          const inc = lista.find((e: any) => {
            // SOLO buscar por ID (no usar nombre)
            // Si el identificador es un UUID, buscar por studentId primero
            if (esUUID && e.studentId) {
              return e.studentId === identificador;
            }
            // Si el identificador es un UUID y tenemos id en la lista, buscar por id
            if (esUUID && e.id) {
              return e.id === identificador;
            }
            // Si no es UUID, buscar por id (no por nombre)
            return e.id === identificador;
          });
          const nombre = estInfo?.nombre || inc?.nombre || identificador;
          return {
            id: estInfo?.id || (inc as any)?.id,
            nombre,
            grado: estInfo?.grado || (inc as any)?.grado || '',
            seccion: estInfo?.seccion || (inc as any)?.seccion || '',
            totalIncidencias: inc ? inc.totalIncidencias : 0,
            ultimaIncidencia: inc ? inc.ultimaIncidencia : 'N/A',
          };
        });
        setListaEstudiantes(listaFinal);
      console.log('✅ Lista de estudiantes actualizada');
      
      toast.success('Información actualizada exitosamente en la base de datos');
      console.log('✅ Guardado completado exitosamente');
      
      // Desactivar bandera PRIMERO, luego actualizar refreshKey después de un momento
      // Esto asegura que el useEffect no interfiera mientras actualizamos los estados
      setTimeout(() => {
        setGuardandoEstudiante(false);
        // Actualizar refreshKey después de desactivar la bandera para forzar re-render
        setTimeout(() => {
          setRefreshKey(prev => prev + 1);
        }, 200);
      }, 300);
    } catch (error: any) {
      console.error('❌ Error guardando estudiante:', error);
      toast.error(error.message || 'Error al guardar la información del estudiante');
      setGuardandoEstudiante(false);
    }
  };
  
  // Estados para reporte general
  const [incidenciasGenerales, setIncidenciasGenerales] = useState<Incidencia[]>([]);
  const [generatingGeneralReport, setGeneratingGeneralReport] = useState(false);
  const [reporteGeneral, setReporteGeneral] = useState<ReporteIA | null>(null);

  // --- Handler para generar el reporte general por fechas ---
  const handleFilterByDate = async () => {
    try {
      // Filtrar incidencias por fechas usando la base de datos
      const filtered = fechaInicio && fechaFin
        ? await fetchIncidencias({ fechaInicio, fechaFin })
        : await fetchIncidencias();
    setIncidenciasGenerales(filtered);
    setReporteGeneral(null);
    } catch (error) {
      console.error('Error filtrando incidencias por fecha:', error);
      setIncidenciasGenerales([]);
    }
  };
  // Inicializar y actualizar incidenciasGenerales dinámicamente cuando cambian las fechas o cuando se actualiza refreshKey
  useEffect(() => {
    const loadIncidencias = async () => {
      try {
        // Si hay fechas, filtrar, si no, mostrar todo
        const nuevasIncidencias = fechaInicio && fechaFin
          ? await fetchIncidencias({ fechaInicio, fechaFin })
          : await fetchIncidencias();
        
        // Siempre actualizar para asegurar que se reflejen los cambios
        setIncidenciasGenerales(nuevasIncidencias);
        // Limpiar reporte cuando cambian las fechas o las incidencias
        setReporteGeneral(null);
      } catch (error) {
        console.error('Error cargando incidencias generales:', error);
        setIncidenciasGenerales([]);
      }
    };
    loadIncidencias();
  }, [fechaInicio, fechaFin, refreshKey]);

  // Calcular estadísticas generales
  const getGeneralStats = (incidencias: Incidencia[]) => {
    const total = incidencias.length;
    const porTipo = {
      asistencia: incidencias.filter(i => i.tipo === 'asistencia').length,
      conducta: incidencias.filter(i => i.tipo === 'conducta').length,
      academica: incidencias.filter(i => i.tipo === 'academica').length,
      positivo: incidencias.filter(i => i.tipo === 'positivo').length,
    };
    const estudiantesUnicos = new Set(incidencias.map(i => i.studentName)).size;
    
    return { total, porTipo, estudiantesUnicos };
  };

  // --- Handler para generar el análisis general con IA ---
  const generateGeneralReport = async (incidencias?: Incidencia[]) => {
    setGeneratingGeneralReport(true);
    setReporteGeneral(null);
    try {
      // Recargar incidencias desde la base de datos en tiempo real antes de generar el reporte
      // Esto asegura que el análisis use los mismos datos que los gráficos y otros componentes
      let incidenciasActualizadas: Incidencia[];
      if (fechaInicio && fechaFin) {
        // Si hay filtros de fecha, usar esos filtros
        incidenciasActualizadas = await fetchIncidencias({ fechaInicio, fechaFin });
      } else {
        // Si no hay filtros, cargar todas las incidencias
        incidenciasActualizadas = await fetchIncidencias();
      }
      
      // Actualizar el estado con las incidencias más recientes de forma síncrona
      // Esto asegura que todos los componentes (gráficos, estadísticas, etc.) usen los mismos datos
      flushSync(() => {
        setIncidenciasGenerales(incidenciasActualizadas);
      });
      
      // Usar las incidencias actualizadas para el análisis
      // Estas son exactamente las mismas que ahora están en el estado incidenciasGenerales
      // Todos los componentes (gráficos, estadísticas, etc.) usarán estos mismos datos
      const incidenciasParaAnalisis = incidenciasActualizadas;
      
      console.log('📊 Generando análisis con', incidenciasParaAnalisis.length, 'incidencias actualizadas en tiempo real');
      console.log('📊 Datos sincronizados: análisis, gráficos y componentes usan los mismos datos');
      console.log('📊 Estadísticas:', {
        total: incidenciasParaAnalisis.length,
        porTipo: {
          asistencia: incidenciasParaAnalisis.filter(i => i.tipo === 'asistencia').length,
          conducta: incidenciasParaAnalisis.filter(i => i.tipo === 'conducta').length,
          academica: incidenciasParaAnalisis.filter(i => i.tipo === 'academica').length,
          positivo: incidenciasParaAnalisis.filter(i => i.tipo === 'positivo').length,
        },
        graves: incidenciasParaAnalisis.filter(i => i.gravedad === 'grave' && i.tipo !== 'positivo').length
      });
      
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidencias: incidenciasParaAnalisis, estudiante: 'Reporte General' })
      });
      if (!res.ok) throw new Error('Error al generar el reporte');
      const data = await res.json();
      
      const report = {
        report: data.report || data.resumen || 'Análisis no disponible',
        resumen: data.resumen || '',
        alertas: data.alertas || '', // Alertas generadas por IA
        recomendaciones: data.recomendaciones || '',
        timestamp: data.timestamp || new Date().toISOString(),
        truncated: !!data.truncated,
      };
      setReporteGeneral(report);
    } catch (error) {
      console.error('Error generando reporte general:', error);
      setReporteGeneral(null);
    } finally {
      setGeneratingGeneralReport(false);
    }
  };

  // Usar useMemo para crear un hash de las incidencias y detectar cambios reales
  const incidenciasHash = useMemo(() => {
    return incidenciasGenerales.map(inc => `${inc.id || ''}-${inc.fecha || ''}-${inc.timestamp || ''}`).join('|');
  }, [incidenciasGenerales]);

  // Regenerar automáticamente el reporte con IA cuando cambien las incidencias
  useEffect(() => {
    // Solo regenerar si hay incidencias, no se está generando actualmente, y estamos en la pestaña de reporte general
    if (incidenciasGenerales.length > 0 && !generatingGeneralReport && activeTab === 'general') {
      // Pequeño delay para evitar regeneraciones muy frecuentes
      const timeoutId = setTimeout(() => {
        // Verificar que aún estamos en la pestaña correcta y no se está generando
        // No pasar parámetros, la función recargará los datos en tiempo real
        if (!generatingGeneralReport && activeTab === 'general' && typeof generateGeneralReport === 'function') {
          generateGeneralReport();
        }
      }, 1500);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidenciasHash, refreshKey, activeTab]);

  // --- Handler para exportar reporte a PDF ---
  const handleExportPDF = async () => {
    let contenedorTemporal: HTMLElement | null = null;
    
    try {
      toast.loading('Generando PDF con todas las secciones...', { id: 'export-pdf' });
      
      // Crear un contenedor temporal oculto para capturar todas las pestañas
      contenedorTemporal = document.createElement('div');
      contenedorTemporal.style.position = 'absolute';
      contenedorTemporal.style.left = '-9999px';
      contenedorTemporal.style.top = '0';
      contenedorTemporal.style.width = '800px';
      contenedorTemporal.style.backgroundColor = '#ffffff';
      document.body.appendChild(contenedorTemporal);

      // Obtener los elementos de cada pestaña
      const resumenElement = document.getElementById('reporte-resumen-export');
      const detalladoElement = document.getElementById('reporte-detallado-export');
      const graficosElement = document.getElementById('reporte-graficos-export');
      
      if (!resumenElement || !detalladoElement || !graficosElement) {
        if (contenedorTemporal && document.body.contains(contenedorTemporal)) {
          document.body.removeChild(contenedorTemporal);
        }
        toast.error('No se encontró el contenido para exportar', { id: 'export-pdf' });
        return;
      }

      // Guardar estados originales de display para restaurarlos después
      const originalDisplays = {
        resumen: resumenElement.style.display,
        detallado: detalladoElement.style.display,
        graficos: graficosElement.style.display
      };

      // Temporalmente mostrar todos los elementos para que html2canvas los capture
      resumenElement.style.display = 'block';
      detalladoElement.style.display = 'block';
      graficosElement.style.display = 'block';

      // Clonar y mostrar todos los elementos en el contenedor temporal
      const clones = [
        { element: resumenElement.cloneNode(true) as HTMLElement, titulo: 'RESUMEN EJECUTIVO' },
        { element: detalladoElement.cloneNode(true) as HTMLElement, titulo: 'ANÁLISIS DETALLADO' },
        { element: graficosElement.cloneNode(true) as HTMLElement, titulo: 'GRÁFICOS Y TENDENCIAS' }
      ];

      clones.forEach(clone => {
        clone.element.style.display = 'block';
        clone.element.style.visibility = 'visible';
        clone.element.style.opacity = '1';
        clone.element.style.position = 'relative';
        if (contenedorTemporal) {
          contenedorTemporal.appendChild(clone.element);
        }
      });

      // Restaurar estados originales de display
      resumenElement.style.display = originalDisplays.resumen || '';
      detalladoElement.style.display = originalDisplays.detallado || '';
      graficosElement.style.display = originalDisplays.graficos || '';

      // Esperar un momento para que se rendericen los elementos
      await new Promise(resolve => setTimeout(resolve, 500));

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = 297; // A4 height in mm
      const margin = 10; // Margen en mm
      const contentWidth = pdfWidth - (2 * margin);
      const contentHeight = pdfHeight - (2 * margin);

      let yPosition = margin;
      let isFirstPage = true;

      for (const seccion of clones) {
        // Agregar título de sección
        if (!isFirstPage || yPosition > margin + 20) {
          pdf.addPage();
          yPosition = margin;
        }
        
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text(seccion.titulo, margin, yPosition);
        yPosition += 10;

        // Capturar la sección
        const canvas = await html2canvas(seccion.element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/png', 1.0);
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const pixelsPerMm = canvas.height / imgHeight;
        const contentHeightInPixels = contentHeight * pixelsPerMm;
        const totalPages = Math.ceil(imgHeight / contentHeight);

        // Si la sección cabe en la página actual
        if (yPosition + imgHeight <= pdfHeight - margin) {
          pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 10;
        } else {
          // Dividir en múltiples páginas
          for (let page = 0; page < totalPages; page++) {
            if (page > 0 || yPosition > margin + 20) {
              pdf.addPage();
              yPosition = margin;
            }
            
            const sourceYInPixels = page * contentHeightInPixels;
            const sourceHeightInPixels = Math.min(contentHeightInPixels, canvas.height - sourceYInPixels);
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = sourceHeightInPixels;
            const tempCtx = tempCanvas.getContext('2d');
            
            if (tempCtx) {
              tempCtx.drawImage(
                canvas,
                0, sourceYInPixels,
                canvas.width, sourceHeightInPixels,
                0, 0,
                canvas.width, sourceHeightInPixels
              );
              
              const pageImgData = tempCanvas.toDataURL('image/png', 1.0);
              const pageImgHeight = (sourceHeightInPixels * imgWidth) / canvas.width;
              pdf.addImage(pageImgData, 'PNG', margin, yPosition, imgWidth, pageImgHeight);
              yPosition += pageImgHeight + 10;
            }
          }
        }
        
        isFirstPage = false;
      }

      // Generar nombre del archivo con fecha
      const fecha = new Date().toISOString().split('T')[0];
      const nombreArchivo = `Reporte_General_Completo_${fecha}.pdf`;
      
      // Descargar PDF
      pdf.save(nombreArchivo);
      
      toast.success('PDF generado exitosamente con todas las secciones', { id: 'export-pdf' });
    } catch (error) {
      console.error('Error generando PDF:', error);
      toast.error('Error al generar el PDF. Verifica la consola para más detalles.', { id: 'export-pdf' });
    } finally {
      // Siempre limpiar el contenedor temporal
      if (contenedorTemporal && document.body.contains(contenedorTemporal)) {
        document.body.removeChild(contenedorTemporal);
      }
      // Asegurar que los elementos originales vuelvan a su estado correcto
      const resumenElement = document.getElementById('reporte-resumen-export');
      const detalladoElement = document.getElementById('reporte-detallado-export');
      const graficosElement = document.getElementById('reporte-graficos-export');
      if (resumenElement) resumenElement.style.display = reporteGeneralTab === 'resumen' ? 'block' : 'none';
      if (detalladoElement) detalladoElement.style.display = reporteGeneralTab === 'detallado' ? 'block' : 'none';
      if (graficosElement) graficosElement.style.display = reporteGeneralTab === 'graficos' ? 'block' : 'none';
    }
  };

  return (
    <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-2">Dashboard Director</h1>
        <p className="text-sm sm:text-base text-gray-900">Gestiona incidencias derivadas, busca estudiantes y genera reportes inteligentes</p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto space-x-2 mb-6 border-b border-gray-200 -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          onClick={() => setActiveTab('derivadas')}
          className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'derivadas'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-900 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-1 sm:gap-2">
            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Incidencias Derivadas</span>
            <span className="sm:hidden">Derivadas</span>
            {incidenciasDerivadas.length > 0 && (
              <span className="bg-primary text-white text-xs px-1.5 sm:px-2 py-0.5 rounded-full">
                {incidenciasDerivadas.length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => {
            setActiveTab('estudiantes');
            setSelectedStudentId(null);
            setSelectedStudentName(null);
            setReporte(null);
            setFiltroGrado('');
            setFiltroSeccion('');
            setBusquedaEstudiante('');
          }}
          className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'estudiantes'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-900 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-1 sm:gap-2">
            <User className="h-3 w-3 sm:h-4 sm:w-4" />
            Estudiantes
          </div>
        </button>
        <button
          onClick={() => setActiveTab('incidencias')}
          className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'incidencias'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-900 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-1 sm:gap-2">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
            Incidencias
            {incidencias.length > 0 && (
              <span className="bg-primary text-white text-xs px-1.5 sm:px-2 py-0.5 rounded-full">
                {incidencias.length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'general'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-900 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Reporte General
          </div>
        </button>
        <button
          onClick={() => {
            setActiveTab('administracion');
            setAdminSubTab('estudiantes');
          }}
          className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'administracion'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-900 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-1 sm:gap-2">
            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Administración</span>
            <span className="sm:hidden">Admin</span>
          </div>
        </button>
      </div>

      {/* Modal de Detalle de Incidencia */}
      {incidenciaDetalle && (
        <ModalDetalleIncidencia incidencia={incidenciaDetalle as Incidencia} onClose={() => setIncidenciaDetalle(null)} />
      )}

      {/* Modal de Mapeo de Columnas - Estudiantes */}
      {mostrarMapeoEstudiantes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900">Mapear Columnas del Excel - Estudiantes</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setMostrarMapeoEstudiantes(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription className="text-sm text-gray-600">
                Selecciona qué columna del Excel corresponde a cada campo del sistema. Los campos marcados con * son obligatorios.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {/* Nombres */}
                <div className="flex items-center gap-3">
                  <label className="w-40 text-sm font-semibold text-gray-700">Nombres *</label>
                  <Select value={mapeoEstudiantes['nombres'] || 'none'} onValueChange={(value) => setMapeoEstudiantes({...mapeoEstudiantes, nombres: value === 'none' ? '' : value})}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecciona una columna" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Ninguna --</SelectItem>
                      {columnasExcelEstudiantes.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Apellidos */}
                <div className="flex items-center gap-3">
                  <label className="w-40 text-sm font-semibold text-gray-700">Apellidos *</label>
                  <Select value={mapeoEstudiantes['apellidos'] || 'none'} onValueChange={(value) => setMapeoEstudiantes({...mapeoEstudiantes, apellidos: value === 'none' ? '' : value})}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecciona una columna" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Ninguna --</SelectItem>
                      {columnasExcelEstudiantes.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Grado */}
                <div className="flex items-center gap-3">
                  <label className="w-40 text-sm font-semibold text-gray-700">Grado</label>
                  <Select value={mapeoEstudiantes['grado'] || 'none'} onValueChange={(value) => setMapeoEstudiantes({...mapeoEstudiantes, grado: value === 'none' ? '' : value})}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecciona una columna" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Ninguna --</SelectItem>
                      {columnasExcelEstudiantes.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Sección */}
                <div className="flex items-center gap-3">
                  <label className="w-40 text-sm font-semibold text-gray-700">Sección</label>
                  <Select value={mapeoEstudiantes['seccion'] || ''} onValueChange={(value) => setMapeoEstudiantes({...mapeoEstudiantes, seccion: value})}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecciona una columna" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Ninguna --</SelectItem>
                      {columnasExcelEstudiantes.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Edad */}
                <div className="flex items-center gap-3">
                  <label className="w-40 text-sm font-semibold text-gray-700">Edad</label>
                  <Select value={mapeoEstudiantes['edad'] || 'none'} onValueChange={(value) => setMapeoEstudiantes({...mapeoEstudiantes, edad: value === 'none' ? '' : value})}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Ninguna --</SelectItem>
                      {columnasExcelEstudiantes.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Fecha de Nacimiento */}
                <div className="flex items-center gap-3">
                  <label className="w-40 text-sm font-semibold text-gray-700">Fecha Nacimiento</label>
                  <Select value={mapeoEstudiantes['fechaNacimiento'] || 'none'} onValueChange={(value) => setMapeoEstudiantes({...mapeoEstudiantes, fechaNacimiento: value === 'none' ? '' : value})}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Ninguna --</SelectItem>
                      {columnasExcelEstudiantes.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Email */}
                <div className="flex items-center gap-3">
                  <label className="w-40 text-sm font-semibold text-gray-700">Email</label>
                  <Select value={mapeoEstudiantes['email'] || 'none'} onValueChange={(value) => setMapeoEstudiantes({...mapeoEstudiantes, email: value === 'none' ? '' : value})}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Ninguna --</SelectItem>
                      {columnasExcelEstudiantes.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Teléfono */}
                <div className="flex items-center gap-3">
                  <label className="w-40 text-sm font-semibold text-gray-700">Teléfono</label>
                  <Select value={mapeoEstudiantes['telefono'] || 'none'} onValueChange={(value) => setMapeoEstudiantes({...mapeoEstudiantes, telefono: value === 'none' ? '' : value})}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Ninguna --</SelectItem>
                      {columnasExcelEstudiantes.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Apoderado - Nombre */}
                <div className="flex items-center gap-3">
                  <label className="w-40 text-sm font-semibold text-gray-700">Apoderado - Nombre</label>
                  <Select value={mapeoEstudiantes['apoderadoNombre'] || ''} onValueChange={(value) => setMapeoEstudiantes({...mapeoEstudiantes, apoderadoNombre: value})}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Ninguna --</SelectItem>
                      {columnasExcelEstudiantes.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Apoderado - Parentesco */}
                <div className="flex items-center gap-3">
                  <label className="w-40 text-sm font-semibold text-gray-700">Apoderado - Parentesco</label>
                  <Select value={mapeoEstudiantes['apoderadoParentesco'] || 'none'} onValueChange={(value) => setMapeoEstudiantes({...mapeoEstudiantes, apoderadoParentesco: value === 'none' ? '' : value})}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Ninguna --</SelectItem>
                      {columnasExcelEstudiantes.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Apoderado - Teléfono */}
                <div className="flex items-center gap-3">
                  <label className="w-40 text-sm font-semibold text-gray-700">Apoderado - Teléfono</label>
                  <Select value={mapeoEstudiantes['apoderadoTelefono'] || 'none'} onValueChange={(value) => setMapeoEstudiantes({...mapeoEstudiantes, apoderadoTelefono: value === 'none' ? '' : value})}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Ninguna --</SelectItem>
                      {columnasExcelEstudiantes.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Apoderado - Teléfono Alternativo */}
                <div className="flex items-center gap-3">
                  <label className="w-40 text-sm font-semibold text-gray-700">Apoderado - Tel. Alternativo</label>
                  <Select value={mapeoEstudiantes['apoderadoTelefonoAlt'] || 'none'} onValueChange={(value) => setMapeoEstudiantes({...mapeoEstudiantes, apoderadoTelefonoAlt: value === 'none' ? '' : value})}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Ninguna --</SelectItem>
                      {columnasExcelEstudiantes.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Apoderado - Email */}
                <div className="flex items-center gap-3">
                  <label className="w-40 text-sm font-semibold text-gray-700">Apoderado - Email</label>
                  <Select value={mapeoEstudiantes['apoderadoEmail'] || 'none'} onValueChange={(value) => setMapeoEstudiantes({...mapeoEstudiantes, apoderadoEmail: value === 'none' ? '' : value})}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Ninguna --</SelectItem>
                      {columnasExcelEstudiantes.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Apoderado - Dirección */}
                <div className="flex items-center gap-3">
                  <label className="w-40 text-sm font-semibold text-gray-700">Apoderado - Dirección</label>
                  <Select value={mapeoEstudiantes['apoderadoDireccion'] || 'none'} onValueChange={(value) => setMapeoEstudiantes({...mapeoEstudiantes, apoderadoDireccion: value === 'none' ? '' : value})}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Ninguna --</SelectItem>
                      {columnasExcelEstudiantes.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setMostrarMapeoEstudiantes(false)}>
                  Cancelar
                </Button>
                  <Button 
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🔵 Botón Importar clickeado');
                      console.log('Mapeo actual:', mapeoEstudiantes);
                      console.log('Datos Excel:', datosExcelEstudiantes.length, 'filas');
                    
                  // Validar solo campos obligatorios: Nombres y Apellidos
                  const camposFaltantes: string[] = [];
                  if (!mapeoEstudiantes['nombres'] || mapeoEstudiantes['nombres'] === 'none') {
                    camposFaltantes.push('Nombres');
                  }
                  if (!mapeoEstudiantes['apellidos'] || mapeoEstudiantes['apellidos'] === 'none') {
                    camposFaltantes.push('Apellidos');
                  }
                  
                  if (camposFaltantes.length > 0) {
                    console.log('❌ Validación fallida - campos obligatorios no mapeados:', camposFaltantes);
                    toast.error(
                      `Debes mapear los siguientes campos obligatorios: ${camposFaltantes.join(', ')}`,
                      { duration: 5000 }
                    );
                    return;
                  }
                  
                  try {
                    console.log('✅ Validación pasada, iniciando importación...');
                    toast.loading('Importando estudiantes...', { id: 'import-estudiantes' });
                    const estudiantesImportados: EstudianteInfo[] = datosExcelEstudiantes.map((row: any, idx: number) => {
                      const nombres = mapeoEstudiantes['nombres'] && mapeoEstudiantes['nombres'] !== 'none' && row[mapeoEstudiantes['nombres']] ? String(row[mapeoEstudiantes['nombres']]).trim() : '';
                      const apellidos = mapeoEstudiantes['apellidos'] && mapeoEstudiantes['apellidos'] !== 'none' && row[mapeoEstudiantes['apellidos']] ? String(row[mapeoEstudiantes['apellidos']]).trim() : '';
                      const grado = mapeoEstudiantes['grado'] && mapeoEstudiantes['grado'] !== 'none' && row[mapeoEstudiantes['grado']] ? String(row[mapeoEstudiantes['grado']]).trim() : undefined;
                      const seccion = mapeoEstudiantes['seccion'] && mapeoEstudiantes['seccion'] !== 'none' && row[mapeoEstudiantes['seccion']] ? String(row[mapeoEstudiantes['seccion']]).trim() : undefined;
                      
                      // Solo validar nombres y apellidos como obligatorios
                      if (!nombres || !apellidos) {
                        throw new Error(`Fila ${idx + 2}: Faltan datos obligatorios (Nombres y Apellidos son requeridos)`);
                      }
                      
                      // Combinar nombres y apellidos para el campo nombre (compatibilidad)
                      const nombreCompleto = `${nombres} ${apellidos}`.trim();
                      
                      return {
                        nombre: nombreCompleto,
                        nombres,
                        apellidos,
                        grado: grado || '',
                        seccion: seccion || '',
                        edad: mapeoEstudiantes['edad'] && mapeoEstudiantes['edad'] !== 'none' && row[mapeoEstudiantes['edad']] ? parseInt(String(row[mapeoEstudiantes['edad']])) : undefined,
                        fechaNacimiento: mapeoEstudiantes['fechaNacimiento'] && mapeoEstudiantes['fechaNacimiento'] !== 'none' ? String(row[mapeoEstudiantes['fechaNacimiento']] || '') : undefined,
                        contacto: {
                          email: mapeoEstudiantes['email'] && mapeoEstudiantes['email'] !== 'none' ? String(row[mapeoEstudiantes['email']] || '') : undefined,
                          telefono: mapeoEstudiantes['telefono'] && mapeoEstudiantes['telefono'] !== 'none' ? String(row[mapeoEstudiantes['telefono']] || '') : undefined,
                        },
                        apoderado: (mapeoEstudiantes['apoderadoNombre'] && mapeoEstudiantes['apoderadoNombre'] !== 'none') || 
                                   (mapeoEstudiantes['apoderadoParentesco'] && mapeoEstudiantes['apoderadoParentesco'] !== 'none') || 
                                   (mapeoEstudiantes['apoderadoTelefono'] && mapeoEstudiantes['apoderadoTelefono'] !== 'none') || 
                                   (mapeoEstudiantes['apoderadoTelefonoAlt'] && mapeoEstudiantes['apoderadoTelefonoAlt'] !== 'none') || 
                                   (mapeoEstudiantes['apoderadoEmail'] && mapeoEstudiantes['apoderadoEmail'] !== 'none') || 
                                   (mapeoEstudiantes['apoderadoDireccion'] && mapeoEstudiantes['apoderadoDireccion'] !== 'none') ? {
                          nombre: mapeoEstudiantes['apoderadoNombre'] && mapeoEstudiantes['apoderadoNombre'] !== 'none' ? String(row[mapeoEstudiantes['apoderadoNombre']] || '') : undefined,
                          parentesco: mapeoEstudiantes['apoderadoParentesco'] && mapeoEstudiantes['apoderadoParentesco'] !== 'none' ? String(row[mapeoEstudiantes['apoderadoParentesco']] || '') : undefined,
                          telefono: mapeoEstudiantes['apoderadoTelefono'] && mapeoEstudiantes['apoderadoTelefono'] !== 'none' ? String(row[mapeoEstudiantes['apoderadoTelefono']] || '') : undefined,
                          telefonoAlternativo: mapeoEstudiantes['apoderadoTelefonoAlt'] && mapeoEstudiantes['apoderadoTelefonoAlt'] !== 'none' ? String(row[mapeoEstudiantes['apoderadoTelefonoAlt']] || '') : undefined,
                          email: mapeoEstudiantes['apoderadoEmail'] && mapeoEstudiantes['apoderadoEmail'] !== 'none' ? String(row[mapeoEstudiantes['apoderadoEmail']] || '') : undefined,
                          direccion: mapeoEstudiantes['apoderadoDireccion'] && mapeoEstudiantes['apoderadoDireccion'] !== 'none' ? String(row[mapeoEstudiantes['apoderadoDireccion']] || '') : undefined,
                        } : undefined
                      };
                    });
                    
                    // Obtener estudiantes existentes para verificar cuáles son nuevos y cuáles actualizados
                    const estudiantesExistentes = await fetchEstudiantes();
                    const mapaEstudiantesExistentes = new Map(estudiantesExistentes.map(e => [getNombreCompleto(e), e]));
                    
                    let nuevos = 0;
                    let actualizados = 0;
                    
                    // Guardar cada estudiante importado individualmente
                    // Esto permite que saveEstudianteInfo determine si debe crear o actualizar
                    console.log('💾 Guardando estudiantes en la base de datos...');
                    for (const est of estudiantesImportados) {
                      try {
                        const nombreCompletoEstudiante = getNombreCompleto(est);
                        const estudianteExistente = mapaEstudiantesExistentes.get(nombreCompletoEstudiante);
                        if (estudianteExistente) {
                          // El estudiante existe, actualizarlo usando su nombre como nombreOriginal
                          console.log(`🔄 Actualizando estudiante: ${nombreCompletoEstudiante}`);
                          await saveEstudianteInfo(est, nombreCompletoEstudiante);
                        actualizados++;
                      } else {
                          // El estudiante no existe, crearlo
                          console.log(`✨ Creando nuevo estudiante: ${nombreCompletoEstudiante}`);
                          await saveEstudianteInfo(est);
                        nuevos++;
                      }
                      } catch (error) {
                        const nombreCompletoEstudiante = getNombreCompleto(est);
                        console.error(`❌ Error guardando estudiante ${nombreCompletoEstudiante}:`, error);
                        // Continuar con los demás estudiantes aunque uno falle
                      }
                    }
                    console.log(`✅ Guardado completado: ${nuevos} nuevos, ${actualizados} actualizados`);
                    
                    // Refrescar la lista de estudiantes desde la base de datos
                    const estudiantesActualizados = await fetchEstudiantes();
                    setEstudiantesInfo(estudiantesActualizados);
                    setRefreshKey(prev => prev + 1);
                    
                    // Cerrar el modal
                    setMostrarMapeoEstudiantes(false);
                    setMapeoEstudiantes({});
                    setColumnasExcelEstudiantes([]);
                    setDatosExcelEstudiantes([]);
                    setArchivoExcelEstudiantes(null);
                    
                    // Mostrar mensaje de confirmación detallado
                    const totalImportados = nuevos + actualizados;
                    if (totalImportados > 0) {
                      // Mostrar mensaje en la página
                      setMensajeImportacion({
                        tipo: 'success',
                        mensaje: `Importación completada exitosamente. Se procesaron ${totalImportados} estudiantes.`,
                        detalles: `✨ Nuevos estudiantes: ${nuevos} | 🔄 Estudiantes actualizados: ${actualizados}`
                      });
                      
                      // También mostrar toast
                      toast.success(
                        `✅ Importación completada exitosamente\n\n📊 Total de estudiantes procesados: ${totalImportados}\n✨ Nuevos estudiantes: ${nuevos}\n🔄 Estudiantes actualizados: ${actualizados}`,
                        { 
                          id: 'import-estudiantes',
                          duration: 5000,
                          description: `Se importaron ${totalImportados} estudiantes correctamente`
                        }
                      );
                      
                      // Ocultar el mensaje después de 10 segundos
                      setTimeout(() => {
                        setMensajeImportacion(null);
                      }, 10000);
                    } else {
                      setMensajeImportacion({
                        tipo: 'error',
                        mensaje: 'No se importaron estudiantes. Verifica que los datos sean correctos.',
                        detalles: 'Asegúrate de que todos los campos obligatorios estén mapeados correctamente.'
                      });
                      toast.warning('No se importaron estudiantes. Verifica que los datos sean correctos.', { id: 'import-estudiantes' });
                    }
                  } catch (error: any) {
                    console.error('Error importando estudiantes:', error);
                    const mensajeError = error.message || 'Error desconocido al procesar el archivo Excel';
                    
                    // Mostrar mensaje de error en la página
                    setMensajeImportacion({
                      tipo: 'error',
                      mensaje: 'Error al importar estudiantes',
                      detalles: mensajeError
                    });
                    
                    // También mostrar toast
                    toast.error(
                      `❌ Error al importar estudiantes\n\n${mensajeError}`,
                      { 
                        id: 'import-estudiantes',
                        duration: 6000
                      }
                    );
                  }
                }}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                  Importar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Mapeo de Columnas - Profesores */}
      {mostrarMapeoProfesores && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900">Mapear Columnas del Excel - Profesores</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setMostrarMapeoProfesores(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription className="text-sm text-gray-600">
                Selecciona qué columna del Excel corresponde a cada campo del sistema. El campo marcado con * es obligatorio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {/* Nombre */}
                <div className="flex items-center gap-3">
                  <label className="w-40 text-sm font-semibold text-gray-700">Nombre *</label>
                  <Select value={mapeoProfesores['nombre'] || 'none'} onValueChange={(value) => setMapeoProfesores({...mapeoProfesores, nombre: value === 'none' ? '' : value})}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecciona una columna" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Ninguna --</SelectItem>
                      {columnasExcelProfesores.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Email */}
                <div className="flex items-center gap-3">
                  <label className="w-40 text-sm font-semibold text-gray-700">Email</label>
                  <Select value={mapeoProfesores['email'] || 'none'} onValueChange={(value) => setMapeoProfesores({...mapeoProfesores, email: value === 'none' ? '' : value})}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Ninguna --</SelectItem>
                      {columnasExcelProfesores.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Teléfono */}
                <div className="flex items-center gap-3">
                  <label className="w-40 text-sm font-semibold text-gray-700">Teléfono</label>
                  <Select value={mapeoProfesores['telefono'] || 'none'} onValueChange={(value) => setMapeoProfesores({...mapeoProfesores, telefono: value === 'none' ? '' : value})}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Ninguna --</SelectItem>
                      {columnasExcelProfesores.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setMostrarMapeoProfesores(false)}>
                  Cancelar
                </Button>
                <Button onClick={async () => {
                  if (!mapeoProfesores['nombre']) {
                    toast.error('Debes mapear el campo obligatorio: Nombre');
                    return;
                  }
                  
                  try {
                    toast.loading('Importando profesores...', { id: 'import-profesores' });
                    const profesoresImportados: Tutor[] = datosExcelProfesores.map((row: any, idx: number) => {
                      const nombre = row[mapeoProfesores['nombre']] ? String(row[mapeoProfesores['nombre']]).trim() : '';
                      
                      if (!nombre) {
                        throw new Error(`Fila ${idx + 2}: Falta el nombre del profesor`);
                      }
                      
                      return {
                        id: `prof_${Date.now()}_${idx}`,
                        nombre,
                        email: mapeoProfesores['email'] && mapeoProfesores['email'] !== 'none' ? String(row[mapeoProfesores['email']] || '') : undefined,
                        telefono: mapeoProfesores['telefono'] && mapeoProfesores['telefono'] !== 'none' ? String(row[mapeoProfesores['telefono']] || '') : undefined,
                      };
                    });
                    
                    const profesoresExistentes = await fetchTutores();
                    const profesoresActualizados = [...profesoresExistentes];
                    let nuevos = 0;
                    let actualizados = 0;
                    
                    profesoresImportados.forEach(prof => {
                      const idx = profesoresActualizados.findIndex(p => p.nombre === prof.nombre);
                      if (idx >= 0) {
                        profesoresActualizados[idx] = { ...profesoresActualizados[idx], ...prof, id: profesoresActualizados[idx].id };
                        actualizados++;
                      } else {
                        profesoresActualizados.push(prof);
                        nuevos++;
                      }
                    });
                    
                    saveTutores(profesoresActualizados);
                    setRefreshKey(prev => prev + 1);
                    setMostrarMapeoProfesores(false);
                    setMapeoProfesores({});
                    setColumnasExcelProfesores([]);
                    setDatosExcelProfesores([]);
                    setArchivoExcelProfesores(null);
                    toast.success(`Importación exitosa: ${nuevos} nuevos, ${actualizados} actualizados`, { id: 'import-profesores' });
                  } catch (error: any) {
                    console.error('Error importando profesores:', error);
                    toast.error(error.message || 'Error al importar el archivo Excel', { id: 'import-profesores' });
                  }
                }}>
                  Importar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Incidencias Derivadas Tab */}
      {activeTab === 'derivadas' && (
        <div className="space-y-6">
          {/* Filtros de derivación */}
          <div className="flex flex-wrap gap-2 mb-2">
            <Button
              variant={filtroDerivacion === 'todas' ? 'default' : 'outline'}
              onClick={() => setFiltroDerivacion('todas')}
              size="sm"
            >
              Todas
            </Button>
            <Button
              variant={filtroDerivacion === 'director' ? 'default' : 'outline'}
              onClick={() => setFiltroDerivacion('director')}
              size="sm"
            >
              Director
            </Button>
            <Button
              variant={filtroDerivacion === 'psicologia' ? 'default' : 'outline'}
              onClick={() => setFiltroDerivacion('psicologia')}
              size="sm"
            >
              Psicología
            </Button>
            <Button
              variant={filtroDerivacion === 'enfermeria' ? 'default' : 'outline'}
              onClick={() => setFiltroDerivacion('enfermeria')}
              size="sm"
            >
              Enfermería
            </Button>
            <Button
              variant={filtroDerivacion === 'coordinacion' ? 'default' : 'outline'}
              onClick={() => setFiltroDerivacion('coordinacion')}
              size="sm"
            >
              Coordinación
            </Button>
            <Button
              variant={filtroDerivacion === 'orientacion' ? 'default' : 'outline'}
              onClick={() => setFiltroDerivacion('orientacion')}
              size="sm"
            >
              Orientación
            </Button>
          </div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Incidencias Derivadas</h2>
          </div>
          {incidenciasDerivadas.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  Incidencias que Requieren tu Atención
                </CardTitle>
                <CardDescription className="text-sm text-gray-900">
                  {incidenciasDerivadas.length} {incidenciasDerivadas.length === 1 ? 'incidencia pendiente' : 'incidencias pendientes'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {incidenciasDerivadas.map((inc) => (
                    <div
                      key={inc.id}
                      className="p-4 border border-gray-300 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={inc.tipo === 'asistencia' ? 'bg-cyan-600 text-white hover:bg-cyan-700' : getTipoColor(inc.tipo)}>
                              {getTipoLabel(inc.tipo)}
                            </Badge>
                            <span className="text-sm font-semibold text-gray-900">{inc.studentName}</span>
                          </div>
                          <p className="text-sm text-gray-900 mb-2">{inc.descripcion}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-900">
                            <span className="flex items-center gap-1"><Calendar className="inline h-3 w-3 mr-1" />{formatFecha(inc.fecha)}</span>
                            <span className="flex items-center gap-1"><User className="inline h-3 w-3 mr-1" />{inc.profesor}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end ml-4 gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleMarcarResuelta(inc.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Marcar Resuelta
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVerDetalleIncidencia(inc)}
                          >
                            Ver Detalle
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
                <p className="text-gray-900 font-medium">No hay incidencias derivadas pendientes</p>
                <p className="text-sm text-gray-900 mt-2">Todas las incidencias han sido resueltas</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tab de Incidencias */}
      {activeTab === 'incidencias' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900">
                <FileText className="h-5 w-5 text-primary" />
                Todas las Incidencias
              </CardTitle>
              <CardDescription className="text-sm text-gray-900">
                {(() => {
                  console.log('🔍 Tab Incidencias: Estado actual de incidencias:', incidencias.length, 'incidencias');
                  const incidenciasFiltradas = incidencias.filter(inc =>
                    (filtroGravedad === 'todas' || inc.gravedad === filtroGravedad) &&
                    (filtroTipo === 'todas' || inc.tipo === filtroTipo) &&
                    (!busquedaEstudianteIncidencias || inc.studentName.toLowerCase().includes(busquedaEstudianteIncidencias.toLowerCase()))
                  );
                  const incidenciasOrdenadas = [...incidenciasFiltradas].sort((a, b) => {
                    const fechaA = a.timestamp || new Date(a.fecha).getTime();
                    const fechaB = b.timestamp || new Date(b.fecha).getTime();
                    return ordenFecha === 'reciente' ? fechaB - fechaA : fechaA - fechaB;
                  });
                  console.log('🔍 Tab Incidencias: Después de filtros:', incidenciasOrdenadas.length, 'incidencias');
                  return `${incidenciasOrdenadas.length} ${incidenciasOrdenadas.length === 1 ? 'incidencia registrada' : 'incidencias registradas'}`;
                })()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <div className="flex flex-wrap gap-3 items-end mb-4">
                <div className="flex flex-col flex-1 min-w-[180px]">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Buscar Estudiante</label>
                  <Input
                    type="text"
                    placeholder="Buscar por nombre de estudiante..."
                    value={busquedaEstudianteIncidencias}
                    onChange={e => setBusquedaEstudianteIncidencias(e.target.value)}
                    className="h-9 text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-primary focus:border-primary transition outline-none shadow-sm"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo</label>
                  <Select value={filtroTipo} onValueChange={(value) => setFiltroTipo(value as TipoIncidencia | 'todas')}>
                    <SelectTrigger className="w-[140px] h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      <SelectItem value="asistencia">Asistencia</SelectItem>
                      <SelectItem value="conducta">Conducta</SelectItem>
                      <SelectItem value="academica">Académica</SelectItem>
                      <SelectItem value="positivo">Positivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Gravedad</label>
                  <Select value={filtroGravedad} onValueChange={(value) => setFiltroGravedad(value as Gravedad | 'todas')}>
                    <SelectTrigger className="w-[140px] h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      <SelectItem value="leve">Leve</SelectItem>
                      <SelectItem value="moderada">Moderada</SelectItem>
                      <SelectItem value="grave">Grave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Ordenar por</label>
                  <Select value={ordenFecha} onValueChange={(value) => setOrdenFecha(value as 'reciente' | 'antiguo')}>
                    <SelectTrigger className="w-[140px] h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reciente">Más reciente</SelectItem>
                      <SelectItem value="antiguo">Más antiguo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(() => {
                const incidenciasFiltradas = incidencias.filter(inc =>
                  (filtroGravedad === 'todas' || inc.gravedad === filtroGravedad) &&
                  (filtroTipo === 'todas' || inc.tipo === filtroTipo) &&
                  (!busquedaEstudianteIncidencias || inc.studentName.toLowerCase().includes(busquedaEstudianteIncidencias.toLowerCase()))
                );

                // Ordenar por fecha según el filtro seleccionado
                const incidenciasOrdenadas = [...incidenciasFiltradas].sort((a, b) => {
                  const fechaA = a.timestamp || new Date(a.fecha).getTime();
                  const fechaB = b.timestamp || new Date(b.fecha).getTime();
                  return ordenFecha === 'reciente' ? fechaB - fechaA : fechaA - fechaB;
                });

                if (incidenciasOrdenadas.length === 0) {
                  return (
                    <div className="py-12 text-center">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-900 font-medium">
                        {incidencias.length === 0
                          ? 'No hay incidencias registradas'
                          : 'No hay incidencias que coincidan con los filtros seleccionados'
                        }
                      </p>
                      <p className="text-sm text-gray-900 mt-2">
                        {incidencias.length === 0
                          ? 'Las incidencias aparecerán aquí cuando se registren.'
                          : 'Intenta ajustar los filtros de búsqueda.'
                        }
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-sm font-semibold">Fecha</TableHead>
                          <TableHead className="text-sm font-semibold">Estudiante</TableHead>
                          <TableHead className="text-sm font-semibold">Tipo</TableHead>
                          <TableHead className="text-sm font-semibold">Gravedad</TableHead>
                          <TableHead className="text-sm font-semibold">Descripción</TableHead>
                          <TableHead className="text-sm font-semibold hidden sm:table-cell">Profesor</TableHead>
                          <TableHead className="text-sm font-semibold hidden sm:table-cell">Lugar</TableHead>
                          <TableHead className="text-sm font-semibold hidden sm:table-cell">Estado</TableHead>
                          <TableHead className="text-sm font-semibold">Acción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incidenciasOrdenadas.map((inc) => (
                          <TableRow key={inc.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap text-gray-900">{formatFechaHora(inc)}</TableCell>
                            <TableCell className="text-xs sm:text-sm font-medium text-gray-900">{inc.studentName}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge className={`${getTipoColor(inc.tipo)} text-xs`}>
                                {getTipoLabel(inc.tipo)}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge className={`${getGravedadColor(inc.gravedad)} text-xs`}>
                                {getGravedadLabel(inc.gravedad)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm max-w-xs sm:max-w-none text-gray-900">{inc.descripcion}</TableCell>
                            <TableCell className="text-gray-900 text-xs sm:text-sm hidden sm:table-cell">{inc.profesor}</TableCell>
                            <TableCell className="text-gray-900 text-xs sm:text-sm hidden sm:table-cell">{inc.lugar || '-'}</TableCell>
                            <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                              {inc.estado === 'Resuelta' ? (
                                <Badge className="bg-primary text-white">Resuelta</Badge>
                              ) : inc.estado === 'Pendiente' ? (
                                <Badge className="bg-yellow-400 text-black">Pendiente</Badge>
                              ) : inc.estado === 'normal' ? (
                                <Badge variant="secondary" className="bg-gray-100 text-gray-900">Normal</Badge>
                              ) : inc.estado === 'En revisión' ? (
                                <Badge className="bg-orange-400 text-white">En revisión</Badge>
                              ) : inc.estado === 'Cerrada' ? (
                                <Badge className="bg-gray-600 text-white">Cerrada</Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-gray-100 text-gray-900">{inc.estado || 'Normal'}</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIncidenciaDetalle(inc)}
                                className="gap-1"
                              >
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                                <span className="hidden sm:inline">Ver</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de Estudiantes Tab */}
      {activeTab === 'estudiantes' && !selectedStudentId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900">
              <User className="h-5 w-5 text-primary" />
              Lista de Estudiantes
            </CardTitle>
            <CardDescription className="text-sm text-gray-900">
              {listaEstudiantes.length} {listaEstudiantes.length === 1 ? 'estudiante registrado' : 'estudiantes registrados'}
            </CardDescription>
            {/* Filtros y búsqueda */}
            <div className="flex flex-wrap gap-3 mt-4 items-end">
              <div className="flex flex-row flex-wrap gap-3 w-full items-end">
                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Grado</label>
                  <Select 
                    key={`select-filtro-grado-${refreshKey}`}
                    value={filtroGrado || 'todas'} 
                    onValueChange={(value) => setFiltroGrado(value === 'todas' ? '' : value)}
                  >
                    <SelectTrigger className="w-[140px] h-9 text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todos</SelectItem>
                      {(() => {
                        const todosLosGrados = grados;
                        // Orden deseado de grados
                        const ordenGrados = ['1ro', '2do', '3ro', '4to', '5to'];
                        // Ordenar grados según el orden deseado, luego agregar los que no están en la lista
                        const gradosOrdenados = [
                          ...ordenGrados.filter(g => todosLosGrados.includes(g)),
                          ...todosLosGrados.filter(g => !ordenGrados.includes(g))
                        ];
                        return gradosOrdenados.map(grado => (
                          <SelectItem key={grado} value={grado}>{grado}</SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Sección</label>
                  <Select 
                    key={`select-filtro-seccion-${refreshKey}`}
                    value={filtroSeccion || 'todas'} 
                    onValueChange={(value) => setFiltroSeccion(value === 'todas' ? '' : value)}
                  >
                    <SelectTrigger className="w-[140px] h-9 text-sm">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {secciones.map(seccion => (
                        <SelectItem key={seccion} value={seccion}>{seccion}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col flex-1 min-w-[180px]">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Buscar</label>
                  <Input
                    type="text"
                    placeholder="Buscar estudiante..."
                    value={busquedaEstudiante}
                    onChange={e => setBusquedaEstudiante(e.target.value)}
                    className="h-9 text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-primary focus:border-primary transition outline-none shadow-sm"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {listaEstudiantes.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-sm font-semibold">Nombres</TableHead>
                      <TableHead className="text-sm font-semibold">Apellidos</TableHead>
                      <TableHead className="text-sm font-semibold">Grado</TableHead>
                      <TableHead className="text-sm font-semibold">Sección</TableHead>
                      <TableHead className="text-sm font-semibold">Total Incidencias</TableHead>
                      <TableHead className="text-sm font-semibold">Última Incidencia</TableHead>
                      <TableHead className="text-sm font-semibold text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listaEstudiantes
                      .filter(e => {
                        // Priorizar búsqueda por ID si está disponible, si no por nombre
                        const estudianteConId = e as any;
                        const estudianteCompleto = estudiantesInfo.find(est => {
                          if (estudianteConId.id && est.id) {
                            return est.id === estudianteConId.id;
                          }
                          return getNombreCompleto(est) === getNombreCompleto(e as EstudianteInfo);
                        });
                        const nombreCompleto = getNombreCompleto(e as EstudianteInfo).toLowerCase();
                        const nombres = estudianteCompleto?.nombres?.toLowerCase() || '';
                        const apellidos = estudianteCompleto?.apellidos?.toLowerCase() || '';
                        return (!filtroGrado || e.grado === filtroGrado) && 
                               (!filtroSeccion || e.seccion === filtroSeccion) && 
                               (!busquedaEstudiante || 
                                 nombreCompleto.includes(busquedaEstudiante.toLowerCase()) ||
                                 nombres.includes(busquedaEstudiante.toLowerCase()) ||
                                 apellidos.includes(busquedaEstudiante.toLowerCase())
                               );
                      })
                      .map((estudiante) => {
                        // Buscar el estudiante completo en estudiantesInfo para obtener nombres, apellidos e ID
                        // Priorizar búsqueda por ID si está disponible, si no por nombre
                        const estudianteConId = estudiante as any; // Type assertion para acceder a id si existe
                        const estudianteCompleto = estudiantesInfo.find(e => {
                          // Si ambos tienen ID, comparar por ID
                          if (estudianteConId.id && e.id) {
                            return e.id === estudianteConId.id;
                          }
                          // Si no, comparar por nombre (fallback)
                          return getNombreCompleto(e) === getNombreCompleto(estudiante as EstudianteInfo);
                        });
                        const nombres = estudianteCompleto?.nombres || (estudiante as any).nombre?.split(' ').slice(0, -1).join(' ') || '-';
                        const apellidos = estudianteCompleto?.apellidos || (estudiante as any).nombre?.split(' ').slice(-1).join(' ') || '-';
                        const estudianteId = estudianteCompleto?.id || estudianteConId.id; // Obtener el ID del estudiante completo
                        
                        return (
                        <TableRow key={estudianteId || getNombreCompleto(estudiante)} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-900">{nombres}</TableCell>
                          <TableCell className="font-medium text-gray-900">{apellidos}</TableCell>
                          <TableCell className="text-gray-900">{estudiante.grado || '-'}</TableCell>
                          <TableCell className="text-gray-900">{estudiante.seccion || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-semibold">
                              {estudiante.totalIncidencias}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-900">{estudiante.ultimaIncidencia ? formatFecha(estudiante.ultimaIncidencia) : 'N/A'}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handleVerPerfil(getNombreCompleto(estudiante), estudianteId)}
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              Ver Perfil
                            </Button>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-12 text-center">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-900">No hay estudiantes registrados aún</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Perfil del Estudiante */}
      {activeTab === 'estudiantes' && selectedStudentId && selectedStudentName && (
        <div className="space-y-6">
          {/* Información del Estudiante editable */}
          {infoEdit && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900">
                  <User className="h-5 w-5 text-primary" />
                  Información del Estudiante
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
                  {/* Estudiante */}
                  <div className="flex-1 flex flex-col items-center py-5 px-3">
                    <span className="block text-sm font-bold text-primary mb-3">Estudiante</span>
                    {fotoPreview ? (
                      <img src={fotoPreview} alt="Foto de perfil" className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 shadow-sm mb-2" />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200 shadow-sm mb-2">
                        <User className="w-10 h-10 text-gray-400" />
                      </div>
                    )}
                    {/* Nombres y Apellidos del estudiante */}
                    {editando ? (
                      <div className="mt-2 w-full flex flex-col gap-2">
                      <Input
                          className="text-base font-semibold text-gray-900 text-center"
                          name="nombres"
                          value={infoEdit.nombres || ''}
                        onChange={handleInputChange}
                          placeholder="Nombres"
                        autoComplete="off"
                      />
                        <Input
                          className="text-base font-semibold text-gray-900 text-center"
                          name="apellidos"
                          value={infoEdit.apellidos || ''}
                          onChange={handleInputChange}
                          placeholder="Apellidos"
                          autoComplete="off"
                        />
                      </div>
                    ) : (
                      <span className="mt-2 text-base font-semibold text-gray-900">{infoEdit.nombre || (infoEdit.nombres && infoEdit.apellidos ? `${infoEdit.nombres} ${infoEdit.apellidos}` : '-')}</span>
                    )}
                    {!editando && fotoPreview && (
                      <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={() => setEditando(true)}>Cambiar foto</Button>
                    )}
                    {editando && (
                      <div className="mt-2 flex flex-col gap-1.5">
                        <Button size="sm" variant="outline" className="text-xs" onClick={handleEliminarFoto}>Eliminar foto</Button>
                        <label className="cursor-pointer text-primary hover:text-primary/80 underline text-xs text-center transition-colors">
                          Subir foto
                          <input type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
                        </label>
                      </div>
                    )}
                    <div className="mt-4 w-full flex flex-col items-center space-y-2.5">
                      <div className="w-full">
                        <div className="flex items-center justify-center gap-1.5 mb-1.5">
                          <GraduationCap className="h-3.5 w-3.5 text-primary/70" />
                          <span className="text-xs font-semibold text-gray-700">Grado y Sección</span>
                        </div>
                      {editando ? (
                          <div className="flex gap-2 justify-center">
                          <Input name="grado" value={infoEdit.grado || ''} onChange={handleInputChange} className="w-16 text-center" placeholder="Grado" />
                          <Input name="seccion" value={infoEdit.seccion || ''} onChange={handleInputChange} className="w-16 text-center" placeholder="Sección" />
                        </div>
                      ) : (
                          <span className="text-sm text-gray-900 font-medium block text-center">{infoEdit.grado} - {infoEdit.seccion}</span>
                      )}
                      </div>
                      <div className="w-full">
                        <div className="flex items-center justify-center gap-1.5 mb-1.5">
                          <User className="h-3.5 w-3.5 text-primary/70" />
                          <span className="text-xs font-semibold text-gray-700">Edad</span>
                        </div>
                      {editando ? (
                          <Input name="edad" value={infoEdit.edad || ''} onChange={handleInputChange} className="w-16 text-center mx-auto" type="number" min="1" placeholder="Edad" />
                      ) : (
                          <span className="text-sm text-gray-900 block text-center">{infoEdit.edad ? `${infoEdit.edad} años` : <span className="text-gray-400">-</span>}</span>
                      )}
                      </div>
                      <div className="w-full">
                        <div className="flex items-center justify-center gap-1.5 mb-1.5">
                          <Calendar className="h-3.5 w-3.5 text-primary/70" />
                          <span className="text-xs font-semibold text-gray-700">Fecha de Nacimiento</span>
                        </div>
                      {editando ? (
                        <Input 
                          name="fechaNacimiento" 
                          type="date"
                          value={infoEdit.fechaNacimiento ? new Date(infoEdit.fechaNacimiento).toISOString().split('T')[0] : ''} 
                          onChange={handleInputChange} 
                            className="w-32 text-center text-xs mx-auto" 
                          placeholder="Fecha Nac." 
                        />
                      ) : (
                          <span className="text-sm text-gray-900 block text-center">{infoEdit.fechaNacimiento ? formatFecha(infoEdit.fechaNacimiento) : <span className="text-gray-400">-</span>}</span>
                      )}
                      </div>
                    </div>
                  </div>
                  {/* Contacto del Estudiante */}
                  <div className="flex-1 flex flex-col items-center py-5 px-3">
                    <span className="block text-sm font-bold text-primary mb-3">Contacto del Estudiante</span>
                    <div className="mt-2 w-full flex flex-col items-center space-y-3">
                      <div className="w-full">
                        <div className="flex items-center justify-center gap-1.5 mb-1.5">
                          <Phone className="h-3.5 w-3.5 text-primary/70" />
                          <span className="text-xs font-semibold text-gray-700">Teléfono</span>
                        </div>
                        {editando ? (
                          <Input name="contactoTelefono" value={infoEdit.contacto?.telefono || ''} onChange={e => setInfoEdit((prev: any) => ({ ...prev, contacto: { ...prev.contacto, telefono: e.target.value } }))} className="w-full text-center text-sm" placeholder="Teléfono" />
                        ) : (
                          <span className="text-sm text-gray-900 block text-center">{infoEdit.contacto?.telefono || <span className="text-gray-400">-</span>}</span>
                        )}
                      </div>
                      <div className="w-full">
                        <div className="flex items-center justify-center gap-1.5 mb-1.5">
                          <Mail className="h-3.5 w-3.5 text-primary/70" />
                          <span className="text-xs font-semibold text-gray-700">Email</span>
                        </div>
                        {editando ? (
                          <Input name="contactoEmail" value={infoEdit.contacto?.email || ''} onChange={e => setInfoEdit((prev: any) => ({ ...prev, contacto: { ...prev.contacto, email: e.target.value } }))} className="w-full text-center text-sm" placeholder="Email" />
                        ) : (
                          <span className="text-sm text-gray-900 break-all block text-center">{infoEdit.contacto?.email || <span className="text-gray-400">-</span>}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Familiar / Apoderado */}
                  <div className="flex-1 flex flex-col items-center py-5 px-3">
                    <span className="block text-sm font-bold text-primary mb-3">Familiar / Apoderado</span>
                    <div className="mt-2 w-full flex flex-col items-center space-y-3">
                      <div className="w-full">
                        <div className="flex items-center justify-center gap-1.5 mb-1.5">
                          <UserCircle className="h-3.5 w-3.5 text-primary/70" />
                          <span className="text-xs font-semibold text-gray-700">Nombre</span>
                        </div>
                      {editando ? (
                          <Input name="apoderadoNombre" value={infoEdit.apoderado?.nombre || ''} onChange={e => setInfoEdit((prev: any) => ({ ...prev, apoderado: { ...prev.apoderado, nombre: e.target.value } }))} className="w-full text-center text-sm" placeholder="Nombre del apoderado" />
                      ) : (
                          <span className="text-sm text-gray-900 block text-center">{infoEdit.apoderado?.nombre || <span className="text-gray-400">-</span>}</span>
                      )}
                      </div>
                      <div className="w-full">
                        <div className="flex items-center justify-center gap-1.5 mb-1.5">
                          <Users className="h-3.5 w-3.5 text-primary/70" />
                          <span className="text-xs font-semibold text-gray-700">Parentesco</span>
                        </div>
                      {editando ? (
                          <Input name="apoderadoParentesco" value={infoEdit.apoderado?.parentesco || ''} onChange={e => setInfoEdit((prev: any) => ({ ...prev, apoderado: { ...prev.apoderado, parentesco: e.target.value } }))} className="w-full text-center text-sm" placeholder="Ej: Madre, Padre, etc." />
                      ) : (
                          <span className="text-sm text-gray-900 block text-center">{infoEdit.apoderado?.parentesco || <span className="text-gray-400">-</span>}</span>
                      )}
                      </div>
                      <div className="w-full">
                        <div className="flex items-center justify-center gap-1.5 mb-1.5">
                          <Phone className="h-3.5 w-3.5 text-primary/70" />
                          <span className="text-xs font-semibold text-gray-700">Teléfono</span>
                        </div>
                      {editando ? (
                          <Input name="apoderadoTelefono" value={infoEdit.apoderado?.telefono || ''} onChange={e => setInfoEdit((prev: any) => ({ ...prev, apoderado: { ...prev.apoderado, telefono: e.target.value } }))} className="w-full text-center text-sm" placeholder="Teléfono" />
                        ) : (
                          <span className="text-sm text-gray-900 block text-center">{infoEdit.apoderado?.telefono || <span className="text-gray-400">-</span>}</span>
                        )}
                      </div>
                      <div className="w-full">
                        <div className="flex items-center justify-center gap-1.5 mb-1.5">
                          <Phone className="h-3.5 w-3.5 text-primary/70" />
                          <span className="text-xs font-semibold text-gray-700">Teléfono Alternativo</span>
                        </div>
                        {editando ? (
                          <Input name="apoderadoTelefonoAlt" value={infoEdit.apoderado?.telefonoAlternativo || ''} onChange={e => setInfoEdit((prev: any) => ({ ...prev, apoderado: { ...prev.apoderado, telefonoAlternativo: e.target.value } }))} className="w-full text-center text-sm" placeholder="Teléfono alternativo" />
                        ) : (
                          <span className="text-sm text-gray-900 block text-center">{infoEdit.apoderado?.telefonoAlternativo || <span className="text-gray-400">-</span>}</span>
                        )}
                      </div>
                      <div className="w-full">
                        <div className="flex items-center justify-center gap-1.5 mb-1.5">
                          <Mail className="h-3.5 w-3.5 text-primary/70" />
                          <span className="text-xs font-semibold text-gray-700">Email</span>
                        </div>
                        {editando ? (
                          <Input name="apoderadoEmail" value={infoEdit.apoderado?.email || ''} onChange={e => setInfoEdit((prev: any) => ({ ...prev, apoderado: { ...prev.apoderado, email: e.target.value } }))} className="w-full text-center text-sm" placeholder="Email" />
                        ) : (
                          <span className="text-sm text-gray-900 break-all block text-center">{infoEdit.apoderado?.email || <span className="text-gray-400">-</span>}</span>
                        )}
                      </div>
                      <div className="w-full">
                        <div className="flex items-center justify-center gap-1.5 mb-1.5">
                          <MapPin className="h-3.5 w-3.5 text-primary/70" />
                          <span className="text-xs font-semibold text-gray-700">Dirección</span>
                        </div>
                        {editando ? (
                          <Input name="apoderadoDireccion" value={infoEdit.apoderado?.direccion || ''} onChange={e => setInfoEdit((prev: any) => ({ ...prev, apoderado: { ...prev.apoderado, direccion: e.target.value } }))} className="w-full text-center text-sm" placeholder="Dirección" />
                        ) : (
                          <span className="text-sm text-gray-900 block text-center">{infoEdit.apoderado?.direccion || <span className="text-gray-400">-</span>}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Tutor */}
                  <div className="flex-1 flex flex-col items-center py-5 px-3">
                    <span className="block text-sm font-bold text-primary mb-3">Tutor</span>
                    <div className="mt-2 w-full flex flex-col items-center space-y-3">
                      <div className="w-full">
                        <div className="flex items-center justify-center gap-1.5 mb-1.5">
                          <UserCircle className="h-3.5 w-3.5 text-primary/70" />
                          <span className="text-xs font-semibold text-gray-700">Nombre</span>
                        </div>
                      {editando ? (
                          <Input name="nombre" value={infoEdit.tutor?.nombre || ''} onChange={e => setInfoEdit((prev: any) => ({ ...prev, tutor: { ...prev.tutor, nombre: e.target.value } }))} className="w-full text-center text-sm" placeholder="Nombre" autoComplete="off" />
                      ) : (
                          <span className="text-sm text-gray-900 block text-center">{infoEdit.tutor?.nombre || <span className="text-gray-400">-</span>}</span>
                      )}
                      </div>
                      <div className="w-full">
                        <div className="flex items-center justify-center gap-1.5 mb-1.5">
                          <Phone className="h-3.5 w-3.5 text-primary/70" />
                          <span className="text-xs font-semibold text-gray-700">Teléfono</span>
                        </div>
                      {editando ? (
                          <Input name="telefono" value={infoEdit.tutor?.telefono || ''} onChange={e => setInfoEdit((prev: any) => ({ ...prev, tutor: { ...prev.tutor, telefono: e.target.value } }))} className="w-full text-center text-sm" placeholder="Teléfono" autoComplete="off" />
                      ) : (
                          <span className="text-sm text-gray-900 block text-center">{infoEdit.tutor?.telefono || <span className="text-gray-400">-</span>}</span>
                      )}
                      </div>
                      <div className="w-full">
                        <div className="flex items-center justify-center gap-1.5 mb-1.5">
                          <Mail className="h-3.5 w-3.5 text-primary/70" />
                          <span className="text-xs font-semibold text-gray-700">Email</span>
                        </div>
                      {editando ? (
                          <Input name="email" value={infoEdit.tutor?.email || ''} onChange={e => setInfoEdit((prev: any) => ({ ...prev, tutor: { ...prev.tutor, email: e.target.value } }))} className="w-full text-center text-sm" placeholder="Email" autoComplete="off" />
                      ) : (
                          <span className="text-sm text-gray-900 break-all block text-center">{infoEdit.tutor?.email || <span className="text-gray-400">-</span>}</span>
                      )}
                    </div>
                  </div>
                </div>
                </div>
                <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100">
                  {editando ? (
                    <>
                      <Button size="sm" onClick={handleGuardar} className="transition-all">Guardar</Button>
                      <Button size="sm" variant="outline" onClick={async () => {
                        if (!selectedStudentId) return;
                        const original = await fetchEstudianteById(selectedStudentId);
                        if (original) {
                          setInfoEdit({
                            ...original,
                            contacto: original.contacto ? { ...original.contacto } : undefined,
                            tutor: original.tutor ? { ...original.tutor } : undefined,
                            apoderado: original.apoderado ? { ...original.apoderado } : undefined
                          });
                          setFotoPreview(original.fotoPerfil || '');
                        } else {
                          setInfoEdit({});
                          setFotoPreview('');
                        }
                        setEditando(false);
                      }} className="transition-all">Cancelar</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setEditando(true)} className="transition-all">Editar información</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900">
                    <User className="h-5 w-5 text-primary" />
                    Perfil de {selectedStudentName}
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-900 mt-1">
                    {incidenciasEstudiante.length} {incidenciasEstudiante.length === 1 ? 'incidencia registrada' : 'incidencias registradas'}
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={handleVolverALista}>
                  <X className="h-4 w-4 mr-2" />
                  Volver a Lista
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Estadísticas del Estudiante */}
              {(() => {
                // Debug: ver qué tipos tienen las incidencias
                console.log('📊 Calculando estadísticas para:', incidenciasEstudiante.length, 'incidencias');
                incidenciasEstudiante.forEach((inc, idx) => {
                  console.log(`  Incidencia ${idx + 1}:`, {
                    id: inc.id,
                    tipo: inc.tipo,
                    tipoTipo: typeof inc.tipo,
                    gravedad: inc.gravedad,
                    gravedadTipo: typeof inc.gravedad
                  });
                });
                
                const stats = {
                  total: incidenciasEstudiante.length,
                  porTipo: {
                    asistencia: incidenciasEstudiante.filter(i => {
                      const tipo = String(i.tipo || '').toLowerCase();
                      return tipo === 'asistencia';
                    }).length,
                    conducta: incidenciasEstudiante.filter(i => {
                      const tipo = String(i.tipo || '').toLowerCase();
                      return tipo === 'conducta';
                    }).length,
                    academica: incidenciasEstudiante.filter(i => {
                      const tipo = String(i.tipo || '').toLowerCase();
                      return tipo === 'academica' || tipo === 'académica';
                    }).length,
                    positivo: incidenciasEstudiante.filter(i => {
                      const tipo = String(i.tipo || '').toLowerCase();
                      return tipo === 'positivo';
                    }).length,
                  },
                  porGravedad: {
                    grave: incidenciasEstudiante.filter(i => {
                      const gravedad = String(i.gravedad || '').toLowerCase();
                      return gravedad === 'grave';
                    }).length,
                    moderada: incidenciasEstudiante.filter(i => {
                      const gravedad = String(i.gravedad || '').toLowerCase();
                      return gravedad === 'moderada';
                    }).length,
                    leve: incidenciasEstudiante.filter(i => {
                      const gravedad = String(i.gravedad || '').toLowerCase();
                      return gravedad === 'leve';
                    }).length,
                  }
                };
                
                console.log('📊 Estadísticas calculadas:', stats);
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
                      <p className="text-2xl font-bold text-primary">{stats.total}</p>
                      <p className="text-xs text-gray-900 font-semibold mt-1">Total</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
                      <p className="text-2xl font-bold text-orange-500">{stats.porTipo.asistencia}</p>
                      <p className="text-xs text-gray-900 font-semibold mt-1">Asistencias</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
                      <p className="text-2xl font-bold text-red-600">{stats.porTipo.conducta}</p>
                      <p className="text-xs text-gray-900 font-semibold mt-1">Conducta</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
                      <p className="text-2xl font-bold text-blue-600">{stats.porTipo.academica}</p>
                      <p className="text-xs text-gray-900 font-semibold mt-1">Académicas</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
                      <p className="text-2xl font-bold text-green-600">{stats.porTipo.positivo}</p>
                      <p className="text-xs text-gray-900 font-semibold mt-1">Positivos</p>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
          
          {/* Tabla de Incidencias del Estudiante */}
          {(() => {
            const tieneIncidencias = Array.isArray(incidenciasEstudiante) && incidenciasEstudiante.length > 0;
            return tieneIncidencias ? (
                <Card className="mt-6">
                  <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900">
                    <FileText className="h-5 w-5 text-primary" />
                    Incidencias
                    </CardTitle>
                  <CardDescription className="text-sm text-gray-900">
                    {incidenciasEstudiante.length} {incidenciasEstudiante.length === 1 ? 'incidencia registrada' : 'incidencias registradas'}
                        {filtroGravedad !== 'todas' && ` - Gravedad: ${getGravedadLabel(filtroGravedad as Gravedad)}`}
                        {filtroTipo !== 'todas' && ` - Tipo: ${getTipoLabel(filtroTipo as TipoIncidencia)}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-sm font-semibold">Fecha</TableHead>
                          <TableHead className="text-sm font-semibold">Estudiante</TableHead>
                          <TableHead className="text-sm font-semibold">Tipo</TableHead>
                          <TableHead className="text-sm font-semibold">Gravedad</TableHead>
                          <TableHead className="text-sm font-semibold">Descripción</TableHead>
                          <TableHead className="text-sm font-semibold hidden sm:table-cell">Profesor</TableHead>
                          <TableHead className="text-sm font-semibold hidden sm:table-cell">Lugar</TableHead>
                          <TableHead className="text-sm font-semibold hidden sm:table-cell">Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(Array.isArray(incidenciasEstudiante) ? incidenciasEstudiante.filter(inc =>
                          (filtroGravedad === 'todas' || inc.gravedad === filtroGravedad) &&
                          (filtroTipo === 'todas' || inc.tipo === filtroTipo)
                        ) : []).map((inc) => (
                          <TableRow key={inc.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap text-gray-900">{formatFechaHora(inc)}</TableCell>
                            <TableCell className="text-xs sm:text-sm font-medium text-gray-900">{inc.studentName}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge className={`${getTipoColor(inc.tipo)} text-xs`}>
                                {getTipoLabel(inc.tipo)}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge className={`${getGravedadColor(inc.gravedad)} text-xs`}>
                                {getGravedadLabel(inc.gravedad)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm max-w-xs sm:max-w-none text-gray-900">{inc.descripcion}</TableCell>
                            <TableCell className="text-gray-900 text-xs sm:text-sm hidden sm:table-cell">{inc.profesor}</TableCell>
                            <TableCell className="text-gray-900 text-xs sm:text-sm hidden sm:table-cell">{inc.lugar || '-'}</TableCell>
                            <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                              {inc.resuelta ? (
                                <Badge className="bg-primary text-white">Resuelta</Badge>
                              ) : inc.derivacion && inc.derivacion !== 'ninguna' ? (
                                <Badge className="bg-yellow-400 text-black">Pendiente</Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-gray-100 text-gray-900">Normal</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="mt-6">
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-900 font-medium">No hay incidencias registradas</p>
                  <p className="text-sm text-gray-900 mt-2">
                    {(filtroGravedad !== 'todas' || filtroTipo !== 'todas')
                      ? `No hay incidencias que coincidan con los filtros seleccionados${filtroGravedad !== 'todas' ? ` (Gravedad: ${getGravedadLabel(filtroGravedad as Gravedad)})` : ''}${filtroTipo !== 'todas' ? ` (Tipo: ${getTipoLabel(filtroTipo as TipoIncidencia)})` : ''}`
                      : 'Las incidencias aparecerán aquí cuando se registren.'}
                  </p>
                </CardContent>
              </Card>
            );
          })()}

          {/* Botón para Generar Análisis con IA */}
          {incidenciasEstudiante.length > 0 && !generatingReport && !reporte && (
            <div className="mt-6">
              <Button
                onClick={handleGenerateReport}
                size="lg"
                className="w-full gap-2"
              >
                <Sparkles className="h-5 w-5" />
                Generar Análisis con IA
              </Button>
        </div>
      )}

          {/* Loading state */}
          {generatingReport && (
            <Card className="mt-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Generando Análisis...
              </CardTitle>
            </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              </CardContent>
          </Card>
          )}

          {/* Reporte IA del estudiante - Versión simplificada */}
          {reporte && (() => {
            return (
              <Card className="mt-6 border-primary/20 bg-gradient-to-br from-primary/5 to-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Análisis Generado por IA
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {reporte.timestamp ? (
                      <>Generado el {new Date(reporte.timestamp).toLocaleString('es-ES')}</>
                    ) : null}
                    {reporte.truncated && (
                      <span className="ml-2 text-amber-600 font-medium">
                        ⚠️ Reporte truncado
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Indicador de Rendimiento Visual */}
                  {incidenciasEstudiante.length > 0 && (() => {
                    const stats = {
                      total: incidenciasEstudiante.length,
                      positivos: incidenciasEstudiante.filter(i => i.tipo === 'positivo').length,
                      negativos: incidenciasEstudiante.filter(i => i.tipo !== 'positivo').length,
                      graves: incidenciasEstudiante.filter(i => i.gravedad === 'grave').length,
                    };
                    
                    // Calcular score de rendimiento (0-100)
                    // Más positivos = mejor score, más graves = peor score
                    const totalPositivos = stats.positivos;
                    const totalNegativos = stats.negativos;
                    const pesoGraves = stats.graves * 2;
                    const score = Math.max(0, Math.min(100, ((totalPositivos * 20) - (totalNegativos * 10) - (pesoGraves * 15) + 50)));
                    const nivelRendimiento = score >= 70 ? 'Excelente' : score >= 50 ? 'Bueno' : score >= 30 ? 'Regular' : 'Requiere Atención';
                    const colorScore = score >= 70 ? 'text-green-600' : score >= 50 ? 'text-blue-600' : score >= 30 ? 'text-yellow-600' : 'text-red-600';
                    const bgColorScore = score >= 70 ? 'bg-green-100' : score >= 50 ? 'bg-blue-100' : score >= 30 ? 'bg-yellow-100' : 'bg-red-100';
                    
                    return (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                          <BarChart3 className="h-4 w-4 text-primary" />
                          <h4 className="font-semibold text-gray-900 text-sm">Indicador de Rendimiento</h4>
                        </div>
                        <div className={`${bgColorScore} rounded-lg p-4 border border-gray-300`}>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-2xl font-bold text-gray-900">{Math.round(score)}</p>
                              <p className="text-xs text-gray-700 font-medium">Score de Rendimiento</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-bold ${colorScore}`}>{nivelRendimiento}</p>
                              <p className="text-xs text-gray-700">{stats.total} incidencias</p>
                            </div>
                          </div>
                          {/* Barra de progreso visual */}
                          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                            <div
                              className={`h-4 rounded-full transition-all duration-500 ${score >= 70 ? 'bg-green-600' : score >= 50 ? 'bg-blue-600' : score >= 30 ? 'bg-yellow-600' : 'bg-red-600'}`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-gray-700">
                            <div className="text-center">
                              <span className="font-bold text-green-600">{stats.positivos}</span> Positivos
                            </div>
                            <div className="text-center">
                              <span className="font-bold text-orange-600">{stats.negativos}</span> Negativos
                            </div>
                            <div className="text-center">
                              <span className="font-bold text-red-600">{stats.graves}</span> Graves
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Todas las secciones del análisis - Grid completo */}
                  <div className="space-y-4">
                    {/* Primera fila: Resumen y Análisis de Patrones */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Resumen */}
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <h4 className="font-semibold text-gray-900 text-sm">Resumen</h4>
                        </div>
                        <p className="text-gray-900 text-sm leading-relaxed">
                          {reporte.resumen || 'Análisis no disponible'}
                        </p>
                      </div>
                      
                      {/* Análisis de Patrones */}
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-purple-600" />
                          <h4 className="font-semibold text-gray-900 text-sm">Análisis de Patrones</h4>
                        </div>
                        <p className="text-gray-900 text-sm leading-relaxed">
                          {reporte.analisisPatrones || 'No se identificaron patrones específicos'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Segunda fila: Fortalezas y Factores de Riesgo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Fortalezas y Áreas de Mejora */}
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-4 w-4 text-green-600" />
                          <h4 className="font-semibold text-gray-900 text-sm">Fortalezas y Áreas de Mejora</h4>
                        </div>
                        <p className="text-gray-900 text-sm leading-relaxed">
                          {reporte.fortalezas || 'No se identificaron fortalezas específicas'}
                        </p>
                      </div>
                      
                      {/* Factores de Riesgo */}
                      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <h4 className="font-semibold text-gray-900 text-sm">Factores de Riesgo</h4>
                        </div>
                        <p className="text-gray-900 text-sm leading-relaxed">
                          {reporte.factoresRiesgo || 'No se identificaron factores de riesgo relevantes'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Tercera fila: Recomendaciones y Plan de Seguimiento */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Recomendaciones */}
                      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-4 w-4 text-yellow-600" />
                          <h4 className="font-semibold text-gray-900 text-sm">Recomendaciones</h4>
                        </div>
                        {reporte.recomendaciones ? (
                          <ul className="list-disc list-inside space-y-1.5 text-gray-900 text-sm">
                            {reporte.recomendaciones.split(/\n+/).filter((line: string) => line.trim().length > 0).map((line: string, idx: number) => {
                              const cleanedLine = line.replace(/^(\d+[.)]\s*|[-•*]\s*)/, '').trim();
                              return cleanedLine ? (
                                <li key={idx} className="leading-relaxed">{cleanedLine}</li>
                              ) : null;
                            })}
                          </ul>
                        ) : (
                          <p className="text-gray-900 text-sm italic">No hay recomendaciones disponibles</p>
                        )}
                      </div>
                      
                      {/* Plan de Seguimiento */}
                      <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-cyan-600" />
                          <h4 className="font-semibold text-gray-900 text-sm">Plan de Seguimiento</h4>
                        </div>
                        {reporte.planSeguimiento ? (
                          <ul className="list-disc list-inside space-y-1.5 text-gray-900 text-sm">
                            {reporte.planSeguimiento.split(/\n+/).filter((line: string) => line.trim().length > 0).map((line: string, idx: number) => {
                              const cleanedLine = line.replace(/^(\d+[.)]\s*|[-•*]\s*)/, '').trim();
                              return cleanedLine ? (
                                <li key={idx} className="leading-relaxed">{cleanedLine}</li>
                              ) : null;
                            })}
                          </ul>
                        ) : (
                          <p className="text-gray-900 text-sm italic">No hay plan de seguimiento disponible</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}

      {/* Reporte General Tab */}
      {typeof activeTab !== 'undefined' && activeTab === 'general' && (
        <div id="reporte-general-export" style={{ backgroundColor: '#ffffff' }}>
          {/* DASHBOARD CON MÉTRICAS */}
          <div className="mb-6 sm:mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Métricas Generales
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Resumen general del sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-center">
                      <p className="text-2xl sm:text-3xl font-bold text-blue-600">{estudiantesInfo.length}</p>
                      <p className="text-xs sm:text-sm text-gray-700 font-semibold mt-1">Total Estudiantes</p>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-center">
                      <p className="text-2xl sm:text-3xl font-bold text-green-600">{tutores.length}</p>
                      <p className="text-xs sm:text-sm text-gray-700 font-semibold mt-1">Total Profesores</p>
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="text-center">
                      <p className="text-2xl sm:text-3xl font-bold text-purple-600">{incidencias.length}</p>
                      <p className="text-xs sm:text-sm text-gray-700 font-semibold mt-1">Total Incidencias</p>
                    </div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div className="text-center">
                      <p className="text-2xl sm:text-3xl font-bold text-orange-600">{incidenciasDerivadas.length}</p>
                      <p className="text-xs sm:text-sm text-gray-700 font-semibold mt-1">Pendientes</p>
                    </div>
                  </div>
                  <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                    <div className="text-center">
                      <p className="text-2xl sm:text-3xl font-bold text-teal-600">{incidencias.filter(i => i.resuelta).length}</p>
                      <p className="text-xs sm:text-sm text-gray-700 font-semibold mt-1">Resueltas</p>
                    </div>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <div className="text-center">
                      <p className="text-2xl sm:text-3xl font-bold text-indigo-600">{grados.length}</p>
                      <p className="text-xs sm:text-sm text-gray-700 font-semibold mt-1">Grados</p>
                    </div>
                  </div>
                  <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
                    <div className="text-center">
                      <p className="text-2xl sm:text-3xl font-bold text-pink-600">{secciones.length}</p>
                      <p className="text-xs sm:text-sm text-gray-700 font-semibold mt-1">Secciones</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SECCIÓN 1: FILTROS Y BÚSQUEDA */}
          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl !text-gray-900">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                Reporte General
              </CardTitle>
              <CardDescription className="text-sm text-gray-900">
                Filtra incidencias por rango de fechas y explora el reporte general del colegio.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-700 mb-1">Fecha de inicio</label>
                  <Input 
                    type="date" 
                    value={fechaInicio} 
                    onChange={e => setFechaInicio(e.target.value)}
                    className="min-w-[140px]"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-700 mb-1">Fecha de fin</label>
                  <Input 
                    type="date" 
                    value={fechaFin} 
                    onChange={e => setFechaFin(e.target.value)}
                    className="min-w-[140px]"
                  />
                </div>
                <Button 
                  onClick={async () => {
                    setFechaInicio('');
                    setFechaFin('');
                    try {
                      const todasIncidencias = await fetchIncidencias();
                      setIncidenciasGenerales(todasIncidencias);
                    setReporteGeneral(null);
                    } catch (error) {
                      console.error('Error cargando incidencias:', error);
                      setIncidenciasGenerales([]);
                    }
                  }}
                  variant="outline"
                  className="h-10 px-6 mt-2 sm:mt-0"
                >
                  Ver Todo
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {fechaInicio && fechaFin 
                  ? `Mostrando datos del ${formatFecha(fechaInicio)} al ${formatFecha(fechaFin)}. Los datos se actualizan automáticamente.`
                  : 'Los datos se actualizan automáticamente al seleccionar fechas. Selecciona un rango para filtrar.'}
              </p>
            </CardContent>
          </Card>

          {/* TABS DE NAVEGACIÓN DEL REPORTE */}
          <div className="flex gap-2 border-b border-gray-200 mb-6 overflow-x-auto">
            <button
              onClick={() => setReporteGeneralTab('resumen')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                reporteGeneralTab === 'resumen'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Resumen Ejecutivo
            </button>
            <button
              onClick={() => setReporteGeneralTab('detallado')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                reporteGeneralTab === 'detallado'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Análisis Detallado
            </button>
            <button
              onClick={() => setReporteGeneralTab('graficos')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                reporteGeneralTab === 'graficos'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Gráficos y Tendencias
            </button>
          </div>

          {/* CONTENIDO SEGÚN TAB SELECCIONADO */}
          {/* Todos los elementos deben estar en el DOM para la exportación PDF */}
          <div id="reporte-resumen-export" style={{ backgroundColor: '#ffffff', display: reporteGeneralTab === 'resumen' ? 'block' : 'none' }}>
          {/* SECCIÓN 2: INDICADORES CLAVE */}
                  {(() => {
                    const stats = typeof getGeneralStats === 'function' ? getGeneralStats(incidenciasGenerales) : { total: 0, porTipo: { asistencia: 0, conducta: 0, academica: 0, positivo: 0 }, estudiantesUnicos: 0 };
            
            // Calcular total de incidencias (si hay filtro de fechas, mostrar total del rango; si no, total general)
            // Como incidenciasGenerales ya está filtrado por fechaInicio/fechaFin, solo contamos las que hay
            const totalIncidencias = incidenciasGenerales.length;
            
            // Separar incidencias positivas y negativas
            const incidenciasPositivas = incidenciasGenerales.filter((inc: Incidencia) => inc.tipo === 'positivo');
            const incidenciasNegativas = incidenciasGenerales.filter((inc: Incidencia) => inc.tipo !== 'positivo');
            const totalPositivas = incidenciasPositivas.length;
            const totalNegativas = incidenciasNegativas.length;
            
            // Calcular incidencias graves (excluyendo las positivas, ya que no requieren atención urgente)
            const incidenciasGraves = incidenciasNegativas.filter((inc: Incidencia) => 
              inc.gravedad === 'grave'
            ).length;
            
            // Top estudiantes con más incidencias
            const porEstudiante: Record<string, number> = {};
            incidenciasGenerales.forEach((inc: Incidencia) => {
              // Usar studentId si está disponible, si no usar studentName como clave
              const claveEstudiante = inc.studentId || inc.studentName;
              porEstudiante[claveEstudiante] = (porEstudiante[claveEstudiante] || 0) + 1;
            });
            const topEstudiante = Object.entries(porEstudiante).sort((a, b) => b[1] - a[1])[0];
            
            // Top profesor
            const porProfesor: Record<string, number> = {};
            incidenciasGenerales.forEach((inc: Incidencia) => {
              if (inc.profesor) {
                porProfesor[inc.profesor] = (porProfesor[inc.profesor] || 0) + 1;
              }
            });
            const topProfesor = Object.entries(porProfesor).sort((a, b) => b[1] - a[1])[0];
            
            // Áreas más saturadas (por derivación)
            const porDerivacion: Record<string, number> = {};
            incidenciasGenerales.forEach((inc: Incidencia) => {
              if (inc.derivacion && inc.derivacion !== 'ninguna') {
                porDerivacion[inc.derivacion] = (porDerivacion[inc.derivacion] || 0) + 1;
              }
            });
            const topDerivacion = Object.entries(porDerivacion).sort((a, b) => b[1] - a[1])[0];
            const labelDerivacion: Record<string, string> = {
              psicologia: 'Psicología',
              director: 'Director',
              enfermeria: 'Enfermería',
              coordinacion: 'Coordinación',
              orientacion: 'Orientación'
            };
            
            return (
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-red-600">{incidenciasGraves}</p>
                        <p className="text-xs text-gray-700 font-semibold mt-1">Requieren Atención Urgente</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {totalIncidencias > 0 ? ((incidenciasGraves / totalIncidencias) * 100).toFixed(1) : 0}% del total
                        </p>
                        {fechaInicio && fechaFin && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            ({totalIncidencias} en período)
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-orange-600">
                          {incidenciasGenerales.filter((inc: Incidencia) => inc.gravedad === 'moderada').length}
                        </p>
                        <p className="text-xs text-gray-700 font-semibold mt-1">Moderadas</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {totalIncidencias > 0 ? ((incidenciasGenerales.filter((inc: Incidencia) => inc.gravedad === 'moderada').length / totalIncidencias) * 100).toFixed(1) : 0}% del total
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-green-600">
                          {incidenciasGenerales.filter((inc: Incidencia) => inc.tipo === 'positivo').length}
                        </p>
                        <p className="text-xs text-gray-700 font-semibold mt-1">Aspectos Positivos</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {totalIncidencias > 0 ? ((incidenciasGenerales.filter((inc: Incidencia) => inc.tipo === 'positivo').length / totalIncidencias) * 100).toFixed(1) : 0}% del total
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-blue-600">
                          {incidenciasGenerales.filter((inc: Incidencia) => inc.gravedad === 'leve').length}
                        </p>
                        <p className="text-xs text-gray-700 font-semibold mt-1">Leves</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {totalIncidencias > 0 ? ((incidenciasGenerales.filter((inc: Incidencia) => inc.gravedad === 'leve').length / totalIncidencias) * 100).toFixed(1) : 0}% del total
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Resumen de Positivas vs Negativas */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg text-gray-900">Distribución de Incidencias</CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-gray-600">
                      Desglose de incidencias positivas (reconocimientos) y negativas (problemas)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-900">Incidencias Positivas</span>
                          <span className="text-lg font-bold text-green-600">{totalPositivas}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className="bg-green-600 h-3 rounded-full transition-all" 
                            style={{ width: `${totalIncidencias > 0 ? ((totalPositivas / totalIncidencias) * 100) : 0}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          {totalIncidencias > 0 ? ((totalPositivas / totalIncidencias) * 100).toFixed(1) : 0}% del total - Reconocimientos y aspectos destacables
                        </p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-900">Incidencias Negativas</span>
                          <span className="text-lg font-bold text-red-600">{totalNegativas}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className="bg-red-600 h-3 rounded-full transition-all" 
                            style={{ width: `${totalIncidencias > 0 ? ((totalNegativas / totalIncidencias) * 100) : 0}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          {totalIncidencias > 0 ? ((totalNegativas / totalIncidencias) * 100).toFixed(1) : 0}% del total - Problemas que requieren atención
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                        {/* SECCIÓN 3: TOP 10 ESTUDIANTES DESTACADOS */}
                        {(() => {
                          // Calcular sistema de puntuación balanceado mejorado
                          // Considera: incidencias positivas y gravedad de incidencias negativas
                          const puntuacionPorEstudiante = {} as Record<string, { 
                            puntos: number; 
                            positivos: number; 
                            negativos: number;
                            graves: number;
                            moderadas: number;
                            leves: number;
                            estudiante: any 
                          }>;
                          
                          incidenciasGenerales.forEach(inc => {
                            // Usar studentId si está disponible, si no usar studentName como clave
                            const claveEstudiante = inc.studentId || inc.studentName;
                            if (!puntuacionPorEstudiante[claveEstudiante]) {
                              // Buscar estudiante por ID si está disponible, si no por nombre
                              const estInfo = inc.studentId 
                                ? estudiantesInfo.find((e: any) => e.id === inc.studentId) 
                                : estudiantesInfo.find((e: any) => getNombreCompleto(e) === inc.studentName);
                              puntuacionPorEstudiante[claveEstudiante] = { 
                                puntos: 0, 
                                positivos: 0, 
                                negativos: 0,
                                graves: 0,
                                moderadas: 0,
                                leves: 0,
                                estudiante: estInfo 
                              };
                            }
                            
                            // Calcular puntos según tipo y gravedad
                            if (inc.tipo === 'positivo') {
                              // Incidencias positivas: +5 puntos cada una (mayor peso)
                              puntuacionPorEstudiante[claveEstudiante].puntos += 5;
                              puntuacionPorEstudiante[claveEstudiante].positivos += 1;
                            } else {
                              // Incidencias negativas: puntos negativos según gravedad
                              // Las graves tienen mayor penalización
                              let puntosNegativos = 0;
                              if (inc.gravedad === 'leve') {
                                puntosNegativos = -1;
                                puntuacionPorEstudiante[claveEstudiante].leves += 1;
                              } else if (inc.gravedad === 'moderada') {
                                puntosNegativos = -3; // Penalización moderada
                                puntuacionPorEstudiante[claveEstudiante].moderadas += 1;
                              } else if (inc.gravedad === 'grave') {
                                puntosNegativos = -6; // Mayor penalización para graves
                                puntuacionPorEstudiante[claveEstudiante].graves += 1;
                              }
                              puntuacionPorEstudiante[claveEstudiante].puntos += puntosNegativos;
                              puntuacionPorEstudiante[claveEstudiante].negativos += 1;
                            }
                          });
                          
                          // Filtrar y ordenar estudiantes destacados
                          // Solo incluir estudiantes con balance positivo neto (puntos > 0)
                          // Un estudiante destacado debe tener más puntos positivos que negativos
                          const estudiantesDestacados = Object.entries(puntuacionPorEstudiante)
                            .filter(([_, data]) => {
                              // Debe tener puntos positivos netos Y al menos una incidencia positiva
                              return data.puntos > 0 && data.positivos > 0;
                            })
                            .sort((a, b) => {
                              // Primero por puntos totales (mayor a menor)
                              if (b[1].puntos !== a[1].puntos) {
                                return b[1].puntos - a[1].puntos;
                              }
                              // Si tienen los mismos puntos, priorizar quien tiene más positivos
                              if (b[1].positivos !== a[1].positivos) {
                                return b[1].positivos - a[1].positivos;
                              }
                              // Si tienen los mismos positivos, priorizar quien tiene menos graves
                              if (a[1].graves !== b[1].graves) {
                                return a[1].graves - b[1].graves;
                              }
                              // Si tienen las mismas graves, priorizar quien tiene menos moderadas
                              return a[1].moderadas - b[1].moderadas;
                            })
                            .slice(0, 10);
                          
                          if (estudiantesDestacados.length === 0) return null;
                          
                          return (
                            <Card className="mb-6">
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-green-700">
                                  <Sparkles className="h-5 w-5 text-green-600" />
                                  Top 10 Estudiantes Destacados
                                </CardTitle>
                                <CardDescription className="text-sm text-gray-900">
                                  Estudiantes con mejor balance entre aspectos positivos y negativos, evaluando gravedad y tipo de incidencias.
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                  {estudiantesDestacados.map(([nombre, { puntos, positivos, negativos, graves, moderadas, leves, estudiante }], idx) => (
                                    <div key={nombre} className="flex flex-col items-center bg-green-50 rounded-lg p-4 border border-green-200 shadow-sm">
                                      <div className="relative mb-2">
                                        {estudiante.fotoPerfil ? (
                                          <img src={estudiante.fotoPerfil} alt={nombre} className="w-16 h-16 rounded-full object-cover border-2 border-green-400" />
                                        ) : (
                                          <div className="w-16 h-16 rounded-full bg-green-200 flex items-center justify-center text-2xl font-bold text-green-700 border-2 border-green-400">
                                            {nombre.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                                          </div>
                                        )}
                                        <span className="absolute -top-2 -right-2 bg-green-600 text-white text-xs rounded-full px-2 py-0.5 font-bold shadow">#{idx+1}</span>
                                      </div>
                                      <div className="text-base font-semibold text-green-900 text-center mb-1">{nombre}</div>
                                      <div className={`text-lg font-bold mb-1 ${puntos >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                        {puntos >= 0 ? '+' : ''}{puntos} puntos
                                      </div>
                                      <div className="text-xs text-gray-600 text-center space-y-0.5">
                                        <div>
                                          <span className="text-green-700 font-semibold">+{positivos} positivos</span>
                                        </div>
                                        {negativos > 0 && (
                                          <div className="flex items-center justify-center gap-1 flex-wrap">
                                            <span className="text-gray-600">-{negativos} negativas:</span>
                                            {graves > 0 && <span className="text-red-600 font-semibold">{graves}G</span>}
                                            {moderadas > 0 && <span className="text-yellow-600">{moderadas}M</span>}
                                            {leves > 0 && <span className="text-orange-600">{leves}L</span>}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })()}

                        {/* SECCIÓN 4: CASOS QUE REQUIEREN ATENCIÓN */}
                        {(() => {
                          // Calcular estudiantes con 3+ incidencias graves (excluyendo las positivas)
                          const gravesPorEstudiante: Record<string, { count: number; ultima: string; estudiante: any }> = {};
                          incidenciasGenerales.forEach(inc => {
                            if (inc.gravedad === 'grave' && inc.tipo !== 'positivo') {
                              // Usar studentId si está disponible, si no usar studentName como clave
                              const claveEstudiante = inc.studentId || inc.studentName;
                              if (!gravesPorEstudiante[claveEstudiante]) {
                                // Buscar estudiante por ID si está disponible, si no por nombre
                                const estInfo = inc.studentId 
                                  ? estudiantesInfo.find((e: any) => e.id === inc.studentId) 
                                  : estudiantesInfo.find((e: any) => getNombreCompleto(e) === inc.studentName);
                                gravesPorEstudiante[claveEstudiante] = { count: 1, ultima: inc.fecha, estudiante: estInfo || {} };
                              } else {
                                gravesPorEstudiante[claveEstudiante].count++;
                                // Actualizar última si la fecha es más reciente
                                if (new Date(inc.fecha) > new Date(gravesPorEstudiante[claveEstudiante].ultima)) {
                                  gravesPorEstudiante[claveEstudiante].ultima = inc.fecha;
                                }
                              }
                            }
                          });
                          const casosAtencion = Object.entries(gravesPorEstudiante)
                            .filter(([_, v]) => v.count >= 3)
                            .sort((a, b) => b[1].count - a[1].count);
                          if (casosAtencion.length === 0) return null;
                          return (
                            <Card className="mb-6">
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-red-700">
                                  <AlertTriangle className="h-5 w-5 text-red-600" />
                                  Casos que Requieren Atención (3+ graves)
                                </CardTitle>
                                <CardDescription className="text-sm text-gray-900">
                                  Estudiantes con 3 o más incidencias graves en el período seleccionado.
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="text-xs sm:text-sm">Estudiante</TableHead>
                                        <TableHead className="text-xs sm:text-sm">Total graves</TableHead>
                                        <TableHead className="text-xs sm:text-sm">Última incidencia</TableHead>
                                        <TableHead className="text-xs sm:text-sm">Acción</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {casosAtencion.map(([nombre, { count, ultima, estudiante }]) => (
                                        <TableRow key={nombre}>
                                          <TableCell className="flex items-center gap-2 py-2">
                                            {estudiante.fotoPerfil ? (
                                              <img src={estudiante.fotoPerfil} alt={nombre} className="w-8 h-8 rounded-full object-cover border border-red-400" />
                                            ) : (
                                              <div className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center text-base font-bold text-red-700 border border-red-400">
                                                {nombre.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
                                              </div>
                                            )}
                                            <span className="font-semibold text-red-900">{nombre}</span>
                                          </TableCell>
                                          <TableCell className="text-center font-bold text-red-700">{count}</TableCell>
                                  <TableCell className="text-xs text-gray-900">{formatFecha(ultima)}</TableCell>
                                          <TableCell>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="border-red-400 text-red-700 hover:bg-red-100"
                                              onClick={() => handleVerPerfil(nombre)}
                                            >
                                              <User className="h-4 w-4 mr-1 text-red-600" />
                                              Ver Perfil
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })()}

                {/* Reporte General con IA - Solo en Resumen */}
                {generatingGeneralReport && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Generando Análisis General...
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-4/6" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Render reporteGeneral card safely */}
                {!generatingGeneralReport && reporteGeneral && (() => {
            const { timestamp, truncated, report, resumen, alertas, recomendaciones } = reporteGeneral as any;
                  return (
                    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-white">
                      <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                          <Sparkles className="h-5 w-5 text-primary" />
                          Análisis General Generado por IA
                        </CardTitle>
                  <CardDescription className="text-sm">
                          {timestamp ? (
                            <>Generado el {new Date(timestamp).toLocaleString('es-ES')}</>
                          ) : null}
                          {truncated ? (
                            <span className="ml-2 text-amber-600 font-medium">
                        ⚠️ Reporte truncado
                            </span>
                          ) : null}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                  <div className="space-y-6">
                    {/* Resumen Automático */}
                    {resumen && (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <h4 className="font-semibold text-gray-900 text-sm">Resumen Automático</h4>
                        </div>
                        <p className="text-gray-900 text-sm leading-relaxed">{resumen}</p>
                      </div>
                    )}
                    
                    {/* Alertas Inteligentes - Generadas por IA */}
                    {(() => {
                      const alertasIA = (reporteGeneral as any)?.alertas;
                      
                      // Si hay alertas generadas por IA, mostrarlas
                      if (alertasIA && alertasIA.trim()) {
                        // Determinar el color según el contenido (positivo o alerta)
                        const esPositivo = alertasIA.toLowerCase().includes('no se detectaron') || 
                                          alertasIA.toLowerCase().includes('estado general es positivo') ||
                                          alertasIA.toLowerCase().includes('rangos normales') ||
                                          alertasIA.toLowerCase().includes('ninguna alerta');
                        
                        if (esPositivo) {
                        return (
                          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                                <h4 className="font-semibold text-gray-900 text-base">Alertas Inteligentes</h4>
                            </div>
                              <p className="text-gray-900 text-sm leading-relaxed whitespace-pre-line">{alertasIA}</p>
                          </div>
                        );
                        } else {
                      return (
                        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                          <div className="flex items-center gap-2 mb-3">
                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                            <h4 className="font-semibold text-gray-900 text-base">Alertas Inteligentes</h4>
                          </div>
                              <div className="text-gray-900 text-sm leading-relaxed whitespace-pre-line">
                                {alertasIA}
                              </div>
                              </div>
                          );
                        }
                      }
                      
                      // Si no hay alertas de IA, mostrar mensaje por defecto
                      return (
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="h-4 w-4 text-gray-600" />
                            <h4 className="font-semibold text-gray-900 text-sm">Alertas Inteligentes</h4>
                              </div>
                          <p className="text-gray-900 text-sm italic">
                            Las alertas se generarán automáticamente al crear el análisis con IA.
                          </p>
                        </div>
                      );
                    })()}
                    
                    {/* Recomendaciones */}
                    {recomendaciones && (
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-4 w-4 text-green-600" />
                          <h4 className="font-semibold text-gray-900 text-sm">Recomendaciones</h4>
                        </div>
                        <div className="pl-1">
                          {formatRecomendacionesGeneral(recomendaciones)}
                        </div>
                      </div>
                    )}
                    
                    {/* Fallback: Reporte completo */}
                    {!resumen && !recomendaciones && report && (
                      <div className="text-gray-900 leading-relaxed text-sm">
                            <div
                              className="space-y-2"
                              dangerouslySetInnerHTML={{
                                __html: formatReportText(report)
                              }}
                            />
                      </div>
                    )}
                        </div>
                      </CardContent>
                    </Card>
                  );
          })()}
              </div>
            );
          })()}

          {/* Botones al final del Resumen */}
          {typeof incidenciasGenerales !== 'undefined' && Array.isArray(incidenciasGenerales) && incidenciasGenerales.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
              {/* Botón para Generar/Regenerar Análisis con IA */}
              {!generatingGeneralReport && (
                <Button
                  onClick={() => {
                    if (typeof generateGeneralReport === 'function') {
                      // No pasar parámetros, la función recargará los datos en tiempo real
                      generateGeneralReport();
                    }
                  }}
                  size="lg"
                  className="w-full gap-2"
                >
                  <Sparkles className="h-5 w-5" />
                  {reporteGeneral ? 'Regenerar Análisis con IA' : 'Generar Análisis con IA'}
                </Button>
              )}
              
              {/* Botón Exportar a PDF */}
              <Button
                onClick={handleExportPDF}
                size="lg"
                variant="outline"
                className="w-full gap-2"
              >
                <Download className="h-5 w-5" />
                Exportar a PDF
              </Button>
            </div>
          )}
          </div>

          {/* Contenido Detallado - Siempre en DOM para exportación PDF */}
          <div id="reporte-detallado-export" style={{ backgroundColor: '#ffffff', display: reporteGeneralTab === 'detallado' ? 'block' : 'none' }}>
              {/* Análisis por Derivación */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900">
                    <FileText className="h-5 w-5 text-primary" />
                    Incidencias por Área de Derivación
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    Distribución de incidencias según el área a la que fueron derivadas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(
                      incidenciasGenerales.reduce((acc: Record<string, number>, inc: Incidencia) => {
                        const deriv = inc.derivacion || 'ninguna';
                        acc[deriv] = (acc[deriv] || 0) + 1;
                        return acc;
                      }, {})
                    )
                      .sort((a, b) => b[1] - a[1])
                      .map(([deriv, count]) => {
                        const porcentaje = incidenciasGenerales.length > 0 ? ((count / incidenciasGenerales.length) * 100).toFixed(1) : 0;
                        const label = deriv === 'ninguna' ? 'Sin derivación' : 
                                     deriv === 'director' ? 'Director' :
                                     deriv === 'psicologia' ? 'Psicología' :
                                     deriv === 'enfermeria' ? 'Enfermería' :
                                     deriv === 'coordinacion' ? 'Coordinación' :
                                     deriv === 'orientacion' ? 'Orientación' : deriv;
                        return (
                          <div key={deriv} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-semibold text-gray-900">{label}</span>
                                <span className="text-sm font-bold text-gray-900">{count} incidencias</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className="bg-primary h-2.5 rounded-full transition-all" 
                                  style={{ width: `${porcentaje}%` }}
                                />
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{porcentaje}% del total</p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>

              {/* Top Estudiantes por Tipo de Incidencia */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Top 5 Estudiantes con más incidencias negativas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg text-gray-900">Estudiantes con Más Incidencias Negativas</CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-gray-600">
                      Top 5 estudiantes que requieren mayor seguimiento
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(
                        incidenciasGenerales
                          .filter((inc: Incidencia) => inc.tipo !== 'positivo')
                          .reduce((acc: Record<string, { count: number; nombre: string }>, inc: Incidencia) => {
                            // Usar studentId si está disponible, si no usar studentName como clave
                            const claveEstudiante = inc.studentId || inc.studentName;
                            if (!acc[claveEstudiante]) {
                              acc[claveEstudiante] = { count: 0, nombre: inc.studentName };
                            }
                            acc[claveEstudiante].count += 1;
                            return acc;
                          }, {})
                      )
                        .sort((a, b) => b[1].count - a[1].count)
                        .slice(0, 5)
                        .map(([clave, data], idx) => (
                          <div key={clave} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                                <span className="text-xs font-bold text-red-600">#{idx + 1}</span>
                              </div>
                              <span className="text-sm font-medium text-gray-900 truncate">{data.nombre}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-red-600">{data.count}</span>
                              <p className="text-xs text-gray-500">negativas</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top 5 Estudiantes con más incidencias positivas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg text-gray-900">Estudiantes con Más Incidencias Positivas</CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-gray-600">
                      Top 5 estudiantes con más reconocimientos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(
                        incidenciasGenerales
                          .filter((inc: Incidencia) => inc.tipo === 'positivo')
                          .reduce((acc: Record<string, { count: number; nombre: string }>, inc: Incidencia) => {
                            // Usar studentId si está disponible, si no usar studentName como clave
                            const claveEstudiante = inc.studentId || inc.studentName;
                            if (!acc[claveEstudiante]) {
                              acc[claveEstudiante] = { count: 0, nombre: inc.studentName };
                            }
                            acc[claveEstudiante].count += 1;
                            return acc;
                          }, {})
                      )
                        .sort((a, b) => b[1].count - a[1].count)
                        .slice(0, 5)
                        .map(([clave, data], idx) => (
                          <div key={clave} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                <span className="text-xs font-bold text-green-600">#{idx + 1}</span>
                              </div>
                              <span className="text-sm font-medium text-gray-900 truncate">{data.nombre}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-green-600">{data.count}</span>
                              <p className="text-xs text-gray-500">positivas</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top 5 Profesores */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg text-gray-900">Profesores Más Activos</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-gray-600">
                    Top 5 profesores que registran más incidencias
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(
                      incidenciasGenerales.reduce((acc: Record<string, number>, inc: Incidencia) => {
                        if (inc.profesor) {
                          acc[inc.profesor] = (acc[inc.profesor] || 0) + 1;
                        }
                        return acc;
                      }, {})
                    )
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([profesor, count], idx) => (
                        <div key={profesor} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-bold text-primary">#{idx + 1}</span>
                            </div>
                            <span className="text-sm font-medium text-gray-900 truncate">{profesor}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-primary">{count}</span>
                            <p className="text-xs text-gray-500">registradas</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
          </div>

          {/* Contenido Gráficos - Siempre en DOM para exportación PDF */}
          <div id="reporte-graficos-export" style={{ backgroundColor: '#ffffff', display: reporteGeneralTab === 'graficos' ? 'block' : 'none' }}>
          {/* SECCIÓN: Evolución Temporal */}
          {incidenciasGenerales.length > 0 && (() => {
            // Agrupar incidencias por mes
            const incidenciasPorMes: Record<string, number> = {};
            incidenciasGenerales.forEach((inc: Incidencia) => {
              try {
                const fecha = new Date(inc.fecha);
                if (!isNaN(fecha.getTime())) {
                  const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
                  incidenciasPorMes[mesKey] = (incidenciasPorMes[mesKey] || 0) + 1;
                }
              } catch (e) {
                // Ignorar fechas inválidas
              }
            });
            
            const meses = Object.keys(incidenciasPorMes)
              .sort()
              .slice(-6)
              .map(mes => {
                const [año, mesNum] = mes.split('-');
                const nombreMes = new Date(parseInt(año), parseInt(mesNum) - 1).toLocaleString('es-ES', { month: 'short' });
                // Incluir el año para diferenciar meses duplicados
                const label = `${nombreMes} ${año}`;
                return { key: mes, label: label, count: incidenciasPorMes[mes] };
              });
            
            const maxValue = Math.max(...meses.map(m => m.count), 1);
            const alturaMaxima = 150;
            
            if (meses.length === 0) return null;
            
            return (
                          <Card className="mb-6">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Evolución Temporal
                              </CardTitle>
                              <CardDescription className="text-sm text-gray-900">
                    Tendencias de incidencias en los últimos meses
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="relative h-64">
                      <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="xMidYMid meet">
                        {/* Líneas de referencia horizontales */}
                        {[0, 1, 2, 3, 4].map(i => {
                          const y = 20 + (i * 40);
                          return (
                            <line
                              key={`grid-${i}`}
                              x1="40"
                              y1={y}
                              x2="560"
                              y2={y}
                              stroke="#e5e7eb"
                              strokeWidth="1"
                              strokeDasharray="2,2"
                            />
                          );
                        })}
                        
                        {/* Línea del gráfico */}
                        {meses.length > 1 && (
                          <polyline
                            points={meses.map((mes, index) => {
                              const x = 40 + (index * (520 / Math.max(1, meses.length - 1)));
                              const y = 180 - ((mes.count / maxValue) * 140);
                              return `${x},${y}`;
                            }).join(' ')}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}
                        
                        {/* Puntos del gráfico */}
                        {meses.map((mes, index) => {
                          const x = 40 + (index * (520 / Math.max(1, meses.length - 1)));
                          const y = 180 - ((mes.count / maxValue) * 140);
                          return (
                            <g key={mes.key}>
                              <circle
                                cx={x}
                                cy={y}
                                r="6"
                                fill="#3b82f6"
                                stroke="white"
                                strokeWidth="2"
                              />
                              {/* Etiqueta con el valor */}
                              <text
                                x={x}
                                y={y - 12}
                                textAnchor="middle"
                                className="text-xs font-bold fill-gray-900"
                                fontSize="12"
                              >
                                {mes.count}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                      
                      {/* Etiquetas de los meses en la parte inferior */}
                      <div className="absolute bottom-0 left-0 right-0 h-8 flex items-center justify-between px-4">
                        {meses.map((mes, index) => {
                          // Calcular posición basada en la posición del punto en el SVG
                          const svgX = 40 + (index * (520 / Math.max(1, meses.length - 1)));
                          const leftPercent = (svgX / 600) * 100;
                          return (
                            <div 
                              key={mes.key} 
                              className="absolute text-center"
                              style={{ left: `${leftPercent}%`, transform: 'translateX(-50%)', minWidth: '60px' }}
                            >
                              <span className="text-xs text-gray-900 font-medium whitespace-nowrap">{mes.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                              </div>
                            </CardContent>
                          </Card>
                    );
                  })()}


          {/* GRÁFICOS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Gráfico: Incidencias por Tipo */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base text-gray-900">Distribución por Tipo de Incidencia</CardTitle>
                        <CardDescription className="text-xs text-gray-600">
                          Cantidad de incidencias según su categoría
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const stats = getGeneralStats(incidenciasGenerales);
                          const total = incidenciasGenerales.length;
                          const maxValue = Math.max(...Object.values(stats.porTipo).map(Number), 1);
                          const tipos = [
                            { key: 'conducta', label: 'Conducta', color: 'bg-red-600', textColor: 'text-red-600' },
                            { key: 'asistencia', label: 'Asistencia', color: 'bg-orange-500', textColor: 'text-orange-600' },
                            { key: 'academica', label: 'Académica', color: 'bg-blue-600', textColor: 'text-blue-600' },
                            { key: 'positivo', label: 'Aspectos Positivos', color: 'bg-green-600', textColor: 'text-green-600' },
                          ];
                          return (
                            <div className="space-y-4">
                              {tipos.map((tipo) => {
                                const value = stats.porTipo[tipo.key as keyof typeof stats.porTipo];
                                const porcentaje = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                const barWidth = maxValue > 0 ? (value / maxValue) * 100 : 0;
                                return (
                                  <div key={tipo.key}>
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="text-sm font-semibold text-gray-900">{tipo.label}</span>
                                      <div className="text-right">
                                        <span className={`text-sm font-bold ${tipo.textColor}`}>{value}</span>
                                        <span className="text-xs text-gray-500 ml-1">({porcentaje}%)</span>
                                      </div>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                                      <div
                                        className={`${tipo.color} h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                                        style={{ width: `${barWidth}%` }}
                                      >
                                        {barWidth > 15 && (
                                          <span className="text-xs text-white font-medium">{value}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>

            {/* Gráfico: Incidencias por Grado/Sección */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base text-gray-900">Incidencias por Grado y Sección</CardTitle>
                        <CardDescription className="text-xs text-gray-600">
                          Top 5 grados/secciones con más incidencias registradas
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                  const porGradoSeccion: Record<string, number> = {};
                  
                  incidenciasGenerales.forEach((inc: Incidencia) => {
                    // Buscar estudiante por ID si está disponible, si no por nombre
                    const estudiante = inc.studentId 
                      ? estudiantesInfo.find((e: any) => e.id === inc.studentId) 
                      : estudiantesInfo.find((e: any) => e.nombre === inc.studentName);
                    if (estudiante && estudiante.grado && estudiante.seccion) {
                      const key = `${estudiante.grado}° - ${estudiante.seccion}`;
                      porGradoSeccion[key] = (porGradoSeccion[key] || 0) + 1;
                    }
                  });
                  
                  const topGrados = Object.entries(porGradoSeccion)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);
                  
                  const maxValue = topGrados.length > 0 ? Math.max(...topGrados.map(([_, v]) => v), 1) : 1;
                  
                  if (topGrados.length === 0) {
                    return <p className="text-sm text-gray-500 text-center py-4">No hay datos disponibles de grado/sección</p>;
                  }
                  
                          return (
                            <div className="space-y-4">
                      {topGrados.map(([gradoSeccion, count], idx) => {
                        const barWidth = maxValue > 0 ? (count / maxValue) * 100 : 0;
                                return (
                          <div key={gradoSeccion}>
                                    <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500">#{idx + 1}</span>
                                <span className="text-sm font-semibold text-gray-900">{gradoSeccion}</span>
                              </div>
                              <span className="text-sm font-bold text-primary">{count} incidencias</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                                      <div
                                className="bg-primary h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                                        style={{ width: `${barWidth}%` }}
                                      >
                                        {barWidth > 20 && (
                                          <span className="text-xs text-white font-medium">{count}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </div>

            {/* Gráfico: Distribución por Gravedad */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-gray-900">Distribución por Nivel de Gravedad</CardTitle>
                <CardDescription className="text-xs text-gray-600">
                  Cantidad de incidencias según su nivel de gravedad
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const porGravedad = {
                    grave: incidenciasGenerales.filter((inc: Incidencia) => inc.gravedad === 'grave').length,
                    moderada: incidenciasGenerales.filter((inc: Incidencia) => inc.gravedad === 'moderada').length,
                    leve: incidenciasGenerales.filter((inc: Incidencia) => inc.gravedad === 'leve').length,
                  };
                  const total = porGravedad.grave + porGravedad.moderada + porGravedad.leve;
                  const maxValue = Math.max(porGravedad.grave, porGravedad.moderada, porGravedad.leve, 1);
                  
                  if (total === 0) {
                    return <p className="text-sm text-gray-500 text-center py-4">No hay incidencias registradas</p>;
                  }
                  
                  return (
                    <div className="space-y-4">
                      {[
                        { key: 'grave', label: 'Graves', count: porGravedad.grave, color: 'bg-red-600', textColor: 'text-red-600' },
                        { key: 'moderada', label: 'Moderadas', count: porGravedad.moderada, color: 'bg-yellow-500', textColor: 'text-yellow-600' },
                        { key: 'leve', label: 'Leves', count: porGravedad.leve, color: 'bg-green-600', textColor: 'text-green-600' },
                      ].map((item) => {
                        const porcentaje = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
                        const barWidth = maxValue > 0 ? (item.count / maxValue) * 100 : 0;
                        return (
                          <div key={item.key}>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-semibold text-gray-900">{item.label}</span>
                              <div className="text-right">
                                <span className={`text-sm font-bold ${item.textColor}`}>{item.count}</span>
                                <span className="text-xs text-gray-500 ml-1">({porcentaje}%)</span>
                            </div>
                                </div>
                            <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                                <div
                                className={`${item.color} h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                                style={{ width: `${barWidth}%` }}
                                >
                                {barWidth > 15 && (
                                  <span className="text-xs text-white font-medium">{item.count}</span>
                                  )}
                                </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Administración Tab */}
      {activeTab === 'administracion' && (
        <div className="space-y-6">
          {/* Sub-tabs para administración */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setAdminSubTab('estudiantes')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                adminSubTab === 'estudiantes'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-900 hover:text-gray-900'
              }`}
            >
              Estudiantes
            </button>
            <button
              onClick={() => setAdminSubTab('profesores')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                adminSubTab === 'profesores'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-900 hover:text-gray-900'
              }`}
            >
              Profesores
            </button>
            <button
              onClick={() => setAdminSubTab('grados')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                adminSubTab === 'grados'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-900 hover:text-gray-900'
              }`}
            >
              Grados y Secciones
            </button>
            <button
              onClick={() => setAdminSubTab('cursos')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                adminSubTab === 'cursos'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-900 hover:text-gray-900'
              }`}
            >
              Asignación de Cursos
            </button>
          </div>

          {/* Sub-tab: Estudiantes */}
          {adminSubTab === 'estudiantes' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900">
                <Users className="h-5 w-5 text-primary" />
                Administración de Estudiantes
              </CardTitle>
              <CardDescription className="text-sm text-gray-900">
                Importa y gestiona la información de estudiantes desde archivos Excel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Formulario para ingresar estudiante manualmente */}
              <div className="border-2 border-primary/20 rounded-lg p-6 bg-primary/5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    Ingresar Estudiante Manualmente
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMostrarFormularioNuevoEstudiante(!mostrarFormularioNuevoEstudiante);
                      if (!mostrarFormularioNuevoEstudiante) {
                        // Limpiar formulario al abrir
                        setNuevoEstudianteForm({
                          nombres: '',
                          apellidos: '',
                          grado: '',
                          seccion: '',
                          edad: undefined,
                          fechaNacimiento: '',
                          contacto: { telefono: '', email: '', nombre: '' },
                          tutor: { nombre: '', telefono: '', email: '' },
                          apoderado: {
                            nombre: '',
                            parentesco: '',
                            telefono: '',
                            telefonoAlternativo: '',
                            email: '',
                            direccion: ''
                          }
                        });
                      }
                    }}
                  >
                    {mostrarFormularioNuevoEstudiante ? (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Cerrar
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Estudiante
                      </>
                    )}
                  </Button>
                </div>
                
                {mostrarFormularioNuevoEstudiante && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Nombres <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={nuevoEstudianteForm.nombres || ''}
                          onChange={(e) => setNuevoEstudianteForm({...nuevoEstudianteForm, nombres: e.target.value})}
                          placeholder="Ingrese nombres"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Apellidos <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={nuevoEstudianteForm.apellidos || ''}
                          onChange={(e) => setNuevoEstudianteForm({...nuevoEstudianteForm, apellidos: e.target.value})}
                          placeholder="Ingrese apellidos"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Grado <span className="text-red-500">*</span>
                        </label>
                        <Select
                          value={nuevoEstudianteForm.grado || ''}
                          onValueChange={(value) => setNuevoEstudianteForm({...nuevoEstudianteForm, grado: value})}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Seleccione grado" />
                          </SelectTrigger>
                          <SelectContent>
                            {grados.map(grado => (
                              <SelectItem key={grado} value={grado}>{grado}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Sección <span className="text-red-500">*</span>
                        </label>
                        <Select
                          value={nuevoEstudianteForm.seccion || ''}
                          onValueChange={(value) => setNuevoEstudianteForm({...nuevoEstudianteForm, seccion: value})}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Seleccione sección" />
                          </SelectTrigger>
                          <SelectContent>
                            {secciones.map(seccion => (
                              <SelectItem key={seccion} value={seccion}>{seccion}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Edad</label>
                        <Input
                          type="number"
                          value={nuevoEstudianteForm.edad || ''}
                          onChange={(e) => setNuevoEstudianteForm({...nuevoEstudianteForm, edad: e.target.value ? parseInt(e.target.value) : undefined})}
                          placeholder="Edad"
                          className="h-9 text-sm"
                          min="1"
                          max="150"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha de Nacimiento</label>
                        <Input
                          type="date"
                          value={nuevoEstudianteForm.fechaNacimiento || ''}
                          onChange={(e) => setNuevoEstudianteForm({...nuevoEstudianteForm, fechaNacimiento: e.target.value})}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Información de Contacto</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono</label>
                          <Input
                            value={nuevoEstudianteForm.contacto?.telefono || ''}
                            onChange={(e) => setNuevoEstudianteForm({
                              ...nuevoEstudianteForm,
                              contacto: {...nuevoEstudianteForm.contacto, telefono: e.target.value}
                            })}
                            placeholder="Teléfono"
                            className="h-9 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                          <Input
                            type="email"
                            value={nuevoEstudianteForm.contacto?.email || ''}
                            onChange={(e) => setNuevoEstudianteForm({
                              ...nuevoEstudianteForm,
                              contacto: {...nuevoEstudianteForm.contacto, email: e.target.value}
                            })}
                            placeholder="Email"
                            className="h-9 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre Contacto</label>
                          <Input
                            value={nuevoEstudianteForm.contacto?.nombre || ''}
                            onChange={(e) => setNuevoEstudianteForm({
                              ...nuevoEstudianteForm,
                              contacto: {...nuevoEstudianteForm.contacto, nombre: e.target.value}
                            })}
                            placeholder="Nombre del contacto"
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Información del Apoderado</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre</label>
                          <Input
                            value={nuevoEstudianteForm.apoderado?.nombre || ''}
                            onChange={(e) => setNuevoEstudianteForm({
                              ...nuevoEstudianteForm,
                              apoderado: {...nuevoEstudianteForm.apoderado, nombre: e.target.value}
                            })}
                            placeholder="Nombre del apoderado"
                            className="h-9 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Parentesco</label>
                          <Input
                            value={nuevoEstudianteForm.apoderado?.parentesco || ''}
                            onChange={(e) => setNuevoEstudianteForm({
                              ...nuevoEstudianteForm,
                              apoderado: {...nuevoEstudianteForm.apoderado, parentesco: e.target.value}
                            })}
                            placeholder="Ej: Padre, Madre, Tío, etc."
                            className="h-9 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono</label>
                          <Input
                            value={nuevoEstudianteForm.apoderado?.telefono || ''}
                            onChange={(e) => setNuevoEstudianteForm({
                              ...nuevoEstudianteForm,
                              apoderado: {...nuevoEstudianteForm.apoderado, telefono: e.target.value}
                            })}
                            placeholder="Teléfono"
                            className="h-9 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono Alternativo</label>
                          <Input
                            value={nuevoEstudianteForm.apoderado?.telefonoAlternativo || ''}
                            onChange={(e) => setNuevoEstudianteForm({
                              ...nuevoEstudianteForm,
                              apoderado: {...nuevoEstudianteForm.apoderado, telefonoAlternativo: e.target.value}
                            })}
                            placeholder="Teléfono alternativo"
                            className="h-9 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                          <Input
                            type="email"
                            value={nuevoEstudianteForm.apoderado?.email || ''}
                            onChange={(e) => setNuevoEstudianteForm({
                              ...nuevoEstudianteForm,
                              apoderado: {...nuevoEstudianteForm.apoderado, email: e.target.value}
                            })}
                            placeholder="Email"
                            className="h-9 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Dirección</label>
                          <Input
                            value={nuevoEstudianteForm.apoderado?.direccion || ''}
                            onChange={(e) => setNuevoEstudianteForm({
                              ...nuevoEstudianteForm,
                              apoderado: {...nuevoEstudianteForm.apoderado, direccion: e.target.value}
                            })}
                            placeholder="Dirección"
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                      <Button
                        onClick={async () => {
                          // Validaciones
                          if (!nuevoEstudianteForm.nombres || !nuevoEstudianteForm.nombres.trim()) {
                            toast.error('Los nombres son requeridos');
                            return;
                          }
                          if (!nuevoEstudianteForm.apellidos || !nuevoEstudianteForm.apellidos.trim()) {
                            toast.error('Los apellidos son requeridos');
                            return;
                          }
                          if (!nuevoEstudianteForm.grado) {
                            toast.error('El grado es requerido');
                            return;
                          }
                          if (!nuevoEstudianteForm.seccion) {
                            toast.error('La sección es requerida');
                            return;
                          }

                          // Validar email si está presente
                          if (nuevoEstudianteForm.contacto?.email) {
                            const emailValidation = validateEmail(nuevoEstudianteForm.contacto.email);
                            if (!emailValidation.isValid) {
                              toast.error(emailValidation.error);
                              return;
                            }
                          }

                          // Validar teléfono si está presente
                          if (nuevoEstudianteForm.contacto?.telefono) {
                            const phoneValidation = validatePhone(nuevoEstudianteForm.contacto.telefono);
                            if (!phoneValidation.isValid) {
                              toast.error(phoneValidation.error);
                              return;
                            }
                          }

                          // Validar edad si está presente
                          if (nuevoEstudianteForm.edad) {
                            const edadValidation = validateAge(nuevoEstudianteForm.edad);
                            if (!edadValidation.isValid) {
                              toast.error(edadValidation.error);
                              return;
                            }
                          }

                          try {
                            // Construir el objeto estudiante completo
                            const estudianteCompleto: EstudianteInfo = {
                              nombres: nuevoEstudianteForm.nombres.trim(),
                              apellidos: nuevoEstudianteForm.apellidos.trim(),
                              grado: nuevoEstudianteForm.grado,
                              seccion: nuevoEstudianteForm.seccion,
                              edad: nuevoEstudianteForm.edad,
                              fechaNacimiento: nuevoEstudianteForm.fechaNacimiento || undefined,
                              contacto: nuevoEstudianteForm.contacto || undefined,
                              tutor: nuevoEstudianteForm.tutor || undefined,
                              apoderado: nuevoEstudianteForm.apoderado || undefined
                            };

                            await saveEstudianteInfo(estudianteCompleto);
                            toast.success('Estudiante agregado exitosamente');
                            
                            // Limpiar formulario
                            setNuevoEstudianteForm({
                              nombres: '',
                              apellidos: '',
                              grado: '',
                              seccion: '',
                              edad: undefined,
                              fechaNacimiento: '',
                              contacto: { telefono: '', email: '', nombre: '' },
                              tutor: { nombre: '', telefono: '', email: '' },
                              apoderado: {
                                nombre: '',
                                parentesco: '',
                                telefono: '',
                                telefonoAlternativo: '',
                                email: '',
                                direccion: ''
                              }
                            });
                            
                            // Recargar estudiantes
                            setRefreshKey(prev => prev + 1);
                            setMostrarFormularioNuevoEstudiante(false);
                          } catch (error: any) {
                            console.error('Error guardando estudiante:', error);
                            toast.error(error.message || 'Error al guardar el estudiante');
                          }
                        }}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Guardar Estudiante
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setNuevoEstudianteForm({
                            nombres: '',
                            apellidos: '',
                            grado: '',
                            seccion: '',
                            edad: undefined,
                            fechaNacimiento: '',
                            contacto: { telefono: '', email: '', nombre: '' },
                            tutor: { nombre: '', telefono: '', email: '' },
                            apoderado: {
                              nombre: '',
                              parentesco: '',
                              telefono: '',
                              telefonoAlternativo: '',
                              email: '',
                              direccion: ''
                            }
                          });
                        }}
                      >
                        Limpiar
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mensaje de confirmación de importación */}
              {mensajeImportacion && (
                <div className={`rounded-lg p-4 border-2 ${
                  mensajeImportacion.tipo === 'success' 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      {mensajeImportacion.tipo === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <h4 className={`font-semibold text-base mb-1 ${
                          mensajeImportacion.tipo === 'success' ? 'text-green-900' : 'text-red-900'
                        }`}>
                          {mensajeImportacion.tipo === 'success' ? '✅ Importación Completada' : '❌ Error en la Importación'}
                        </h4>
                        <p className={`text-sm ${
                          mensajeImportacion.tipo === 'success' ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {mensajeImportacion.mensaje}
                        </p>
                        {mensajeImportacion.detalles && (
                          <p className={`text-xs mt-2 ${
                            mensajeImportacion.tipo === 'success' ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {mensajeImportacion.detalles}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMensajeImportacion(null)}
                      className={`h-6 w-6 p-0 ${
                        mensajeImportacion.tipo === 'success' ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'
                      }`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Botón de importación */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Importar Estudiantes desde Excel</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Selecciona un archivo Excel (.xlsx, .xls). Podrás mapear las columnas del archivo a los campos del sistema.
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    try {
                      toast.loading('Leyendo archivo Excel...', { id: 'import-estudiantes' });
                      const data = await file.arrayBuffer();
                      const workbook = XLSX.read(data, { type: 'array' });
                      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                      const jsonData = XLSX.utils.sheet_to_json(firstSheet) as any[];
                      
                      // Obtener columnas del Excel
                      const columnas = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
                      setColumnasExcelEstudiantes(columnas);
                      setDatosExcelEstudiantes(jsonData);
                      setArchivoExcelEstudiantes(file);
                      
                      // Inicializar mapeo automático si encuentra coincidencias
                      const mapeoInicial: Record<string, string> = {};
                      columnas.forEach(col => {
                        const colLower = col.toLowerCase().trim();
                        if ((colLower.includes('nombre') || colLower.includes('nombres')) && !colLower.includes('apellido') && !colLower.includes('apoderado') && !colLower.includes('tutor') && !mapeoInicial['nombres']) {
                          mapeoInicial['nombres'] = col;
                        } else if ((colLower.includes('apellido') || colLower.includes('apellidos')) && !mapeoInicial['apellidos']) {
                          mapeoInicial['apellidos'] = col;
                        } else if ((colLower.includes('grado') || colLower.includes('grade')) && !mapeoInicial['grado']) {
                          mapeoInicial['grado'] = col;
                        } else if ((colLower.includes('seccion') || colLower.includes('sección') || colLower.includes('section')) && !mapeoInicial['seccion']) {
                          mapeoInicial['seccion'] = col;
                        } else if (colLower.includes('edad') && !mapeoInicial['edad']) {
                          mapeoInicial['edad'] = col;
                        } else if (((colLower.includes('fecha') && colLower.includes('nacimiento')) || colLower.includes('birthdate')) && !mapeoInicial['fechaNacimiento']) {
                          mapeoInicial['fechaNacimiento'] = col;
                        } else if ((colLower.includes('apoderado') || colLower.includes('padre') || colLower.includes('madre') || colLower.includes('representante')) && colLower.includes('nombre') && !mapeoInicial['apoderadoNombre']) {
                          mapeoInicial['apoderadoNombre'] = col;
                        } else if ((colLower.includes('apoderado') || colLower.includes('padre') || colLower.includes('madre')) && (colLower.includes('parentesco') || colLower.includes('relacion')) && !mapeoInicial['apoderadoParentesco']) {
                          mapeoInicial['apoderadoParentesco'] = col;
                        } else if ((colLower.includes('apoderado') || colLower.includes('padre') || colLower.includes('madre')) && (colLower.includes('telefono') || colLower.includes('teléfono') || colLower.includes('phone')) && !mapeoInicial['apoderadoTelefono']) {
                          mapeoInicial['apoderadoTelefono'] = col;
                        } else if ((colLower.includes('apoderado') || colLower.includes('padre') || colLower.includes('madre')) && (colLower.includes('alternativo') || colLower.includes('alt')) && !mapeoInicial['apoderadoTelefonoAlt']) {
                          mapeoInicial['apoderadoTelefonoAlt'] = col;
                        } else if ((colLower.includes('apoderado') || colLower.includes('padre') || colLower.includes('madre')) && (colLower.includes('email') || colLower.includes('correo')) && !mapeoInicial['apoderadoEmail']) {
                          mapeoInicial['apoderadoEmail'] = col;
                        } else if ((colLower.includes('apoderado') || colLower.includes('padre') || colLower.includes('madre')) && (colLower.includes('direccion') || colLower.includes('dirección') || colLower.includes('address')) && !mapeoInicial['apoderadoDireccion']) {
                          mapeoInicial['apoderadoDireccion'] = col;
                        } else if ((colLower.includes('email') || colLower.includes('correo')) && !colLower.includes('apoderado') && !mapeoInicial['email']) {
                          mapeoInicial['email'] = col;
                        } else if ((colLower.includes('telefono') || colLower.includes('teléfono') || colLower.includes('phone')) && !colLower.includes('apoderado') && !mapeoInicial['telefono']) {
                          mapeoInicial['telefono'] = col;
                        }
                      });
                      setMapeoEstudiantes(mapeoInicial);
                      setMostrarMapeoEstudiantes(true);
                      toast.dismiss('import-estudiantes');
                      e.target.value = '';
                    } catch (error: any) {
                      console.error('Error leyendo archivo:', error);
                      toast.error(error.message || 'Error al leer el archivo Excel', { id: 'import-estudiantes' });
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                  id="file-input-estudiantes"
                />
                <Button
                  onClick={() => document.getElementById('file-input-estudiantes')?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Seleccionar Archivo Excel
                </Button>
              </div>

              {/* Filtros y búsqueda */}
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Grado</label>
                  <Select
                    key={`select-filtro-admin-grado-${refreshKey}`}
                    value={filtroAdminGrado || 'todas'}
                    onValueChange={(value) => setFiltroAdminGrado(value === 'todas' ? '' : value)}
                  >
                    <SelectTrigger className="w-[140px] h-9 text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todos</SelectItem>
                      {(() => {
                        const todosLosGrados = grados;
                        const ordenGrados = ['1ro', '2do', '3ro', '4to', '5to'];
                        const gradosOrdenados = [
                          ...ordenGrados.filter(g => todosLosGrados.includes(g)),
                          ...todosLosGrados.filter(g => !ordenGrados.includes(g))
                        ];
                        return gradosOrdenados.map(grado => (
                          <SelectItem key={grado} value={grado}>{grado}</SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Sección</label>
                  <Select
                    key={`select-filtro-admin-seccion-${refreshKey}`}
                    value={filtroAdminSeccion || 'todas'}
                    onValueChange={(value) => setFiltroAdminSeccion(value === 'todas' ? '' : value)}
                  >
                    <SelectTrigger className="w-[140px] h-9 text-sm">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {secciones.map(seccion => (
                        <SelectItem key={seccion} value={seccion}>{seccion}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col flex-1 min-w-[180px]">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Buscar</label>
                  <Input
                    type="text"
                    placeholder="Buscar estudiante..."
                    value={busquedaAdminEstudiante}
                    onChange={e => setBusquedaAdminEstudiante(e.target.value)}
                    className="h-9 text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-primary focus:border-primary transition outline-none shadow-sm"
                  />
                </div>
              </div>

              {/* Lista de estudiantes actuales */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Estudiantes Registrados ({estudiantesInfo.filter(e => 
                      (!filtroAdminGrado || e.grado === filtroAdminGrado) &&
                      (!filtroAdminSeccion || e.seccion === filtroAdminSeccion) &&
                          (!busquedaAdminEstudiante || 
                            getNombreCompleto(e).toLowerCase().includes(busquedaAdminEstudiante.toLowerCase()) ||
                            (e.nombres && e.nombres.toLowerCase().includes(busquedaAdminEstudiante.toLowerCase())) ||
                            (e.apellidos && e.apellidos.toLowerCase().includes(busquedaAdminEstudiante.toLowerCase()))
                          )
                    ).length})
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-sm font-semibold">Foto</TableHead>
                        <TableHead className="text-sm font-semibold">Nombres</TableHead>
                        <TableHead className="text-sm font-semibold">Apellidos</TableHead>
                        <TableHead className="text-sm font-semibold">Grado</TableHead>
                        <TableHead className="text-sm font-semibold">Sección</TableHead>
                        <TableHead className="text-sm font-semibold">Edad</TableHead>
                        <TableHead className="text-sm font-semibold hidden lg:table-cell">Fecha Nac.</TableHead>
                        <TableHead className="text-sm font-semibold">Contacto</TableHead>
                        <TableHead className="text-sm font-semibold hidden xl:table-cell">Apoderado - Nombre</TableHead>
                        <TableHead className="text-sm font-semibold hidden xl:table-cell">Apoderado - Parentesco</TableHead>
                        <TableHead className="text-sm font-semibold hidden xl:table-cell">Apoderado - Teléfono</TableHead>
                        <TableHead className="text-sm font-semibold hidden xl:table-cell">Apoderado - Tel. Alt.</TableHead>
                        <TableHead className="text-sm font-semibold hidden xl:table-cell">Apoderado - Email</TableHead>
                        <TableHead className="text-sm font-semibold hidden xl:table-cell">Apoderado - Dirección</TableHead>
                        <TableHead className="text-sm font-semibold text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {estudiantesInfo.filter(e => 
                          (!filtroAdminGrado || e.grado === filtroAdminGrado) &&
                          (!filtroAdminSeccion || e.seccion === filtroAdminSeccion) &&
                          (!busquedaAdminEstudiante || 
                            getNombreCompleto(e).toLowerCase().includes(busquedaAdminEstudiante.toLowerCase()) ||
                            (e.nombres && e.nombres.toLowerCase().includes(busquedaAdminEstudiante.toLowerCase())) ||
                            (e.apellidos && e.apellidos.toLowerCase().includes(busquedaAdminEstudiante.toLowerCase()))
                          )
                        ).map((estudiante) => {
                          // Usar ID para identificar qué estudiante está en edición (priorizar ID sobre nombre)
                          const identificadorEstudiante = estudiante.id || getNombreCompleto(estudiante);
                          // Verificar explícitamente si este estudiante está en modo edición
                          // También verificar si el formulario está cerrado (estudianteEditandoAdmin es null)
                          // IMPORTANTE: Si estudianteEditandoAdmin es null, el formulario está cerrado
                          const estaEditando = estudianteEditandoAdmin !== null && estudianteEditandoAdmin !== undefined && estudianteEditandoAdmin === identificadorEstudiante;
                          const formData = estaEditando ? estudianteEditForm : estudiante;
                          
                          // Usar ID como key si está disponible, si no usar nombre (para mejor rendimiento de React)
                          // Incluir formularioCerradoKey para forzar re-render cuando se cierra el formulario
                          const rowKey = `${estudiante.id || getNombreCompleto(estudiante)}-${formularioCerradoKey}`;
                          
                          return (
                            <TableRow key={rowKey}>
                              <TableCell className="text-gray-900">
                                {estudiante.fotoPerfil ? (
                                  <img 
                                    src={estudiante.fotoPerfil} 
                                    alt={getNombreCompleto(estudiante)} 
                                    className="w-10 h-10 rounded-full object-cover border border-gray-300"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 border border-gray-300">
                                    {estudiante.nombres?.[0] || getNombreCompleto(estudiante)[0] || ''}{estudiante.apellidos?.[0] || getNombreCompleto(estudiante).split(' ')[1]?.[0] || ''}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-medium text-gray-900">
                                {estaEditando ? (
                                  <Input
                                    value={formData.nombres || ''}
                                    onChange={(e) => {
                                      const nombres = e.target.value;
                                      const apellidos = formData.apellidos || '';
                                      setEstudianteEditForm({...formData, nombres});
                                    }}
                                    className="w-full h-8 text-sm"
                                    placeholder="Nombres"
                                  />
                                ) : (
                                  estudiante.nombres || getNombreCompleto(estudiante).split(' ').slice(0, -1).join(' ') || '-'
                                )}
                              </TableCell>
                              <TableCell className="font-medium text-gray-900">
                                {estaEditando ? (
                                  <Input
                                    value={formData.apellidos || ''}
                                    onChange={(e) => {
                                      const apellidos = e.target.value;
                                      setEstudianteEditForm({...formData, apellidos});
                                    }}
                                    className="w-full h-8 text-sm"
                                    placeholder="Apellidos"
                                  />
                                ) : (
                                  estudiante.apellidos || getNombreCompleto(estudiante).split(' ').slice(-1).join(' ') || '-'
                                )}
                              </TableCell>
                              <TableCell className="text-gray-900">
                                {estaEditando ? (
                                  <Input
                                    value={formData.grado || ''}
                                    onChange={(e) => setEstudianteEditForm({...formData, grado: e.target.value})}
                                    className="w-full h-8 text-sm"
                                  />
                                ) : (
                                  estudiante.grado
                                )}
                              </TableCell>
                              <TableCell className="text-gray-900">
                                {estaEditando ? (
                                  <Input
                                    value={formData.seccion || ''}
                                    onChange={(e) => setEstudianteEditForm({...formData, seccion: e.target.value})}
                                    className="w-full h-8 text-sm"
                                  />
                                ) : (
                                  estudiante.seccion
                                )}
                              </TableCell>
                              <TableCell className="text-gray-900">
                                {estaEditando ? (
                                  <Input
                                    type="number"
                                    value={formData.edad || ''}
                                    onChange={(e) => setEstudianteEditForm({...formData, edad: parseInt(e.target.value) || undefined})}
                                    className="w-20 h-8 text-sm"
                                  />
                                ) : (
                                  estudiante.edad || '-'
                                )}
                              </TableCell>
                              <TableCell className="text-gray-900 hidden lg:table-cell">
                                {estaEditando ? (
                                  <Input
                                    type="date"
                                    value={formData.fechaNacimiento ? new Date(formData.fechaNacimiento).toISOString().split('T')[0] : ''}
                                    onChange={(e) => setEstudianteEditForm({...formData, fechaNacimiento: e.target.value})}
                                    className="w-full h-8 text-sm"
                                  />
                                ) : (
                                  <span className="text-xs">{estudiante.fechaNacimiento ? formatFecha(estudiante.fechaNacimiento) : '-'}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-gray-900">
                                {estaEditando ? (
                                  <div className="space-y-1">
                                    <Input
                                      value={formData.contacto?.telefono || ''}
                                      onChange={(e) => setEstudianteEditForm({
                                        ...formData, 
                                        contacto: {...formData.contacto, telefono: e.target.value}
                                      })}
                                      className="w-full h-8 text-sm"
                                      placeholder="Teléfono"
                                    />
                                    <Input
                                      value={formData.contacto?.email || ''}
                                      onChange={(e) => setEstudianteEditForm({
                                        ...formData, 
                                        contacto: {...formData.contacto, email: e.target.value}
                                      })}
                                      className="w-full h-8 text-sm"
                                      placeholder="Email"
                                    />
    </div>
                                ) : (
                                  <div className="text-xs">
                                    <div>{estudiante.contacto?.telefono || '-'}</div>
                                    <div className="text-gray-600">{estudiante.contacto?.email || '-'}</div>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-gray-900 hidden xl:table-cell">
                                {estaEditando ? (
                                  <Input
                                    value={formData.apoderado?.nombre || ''}
                                    onChange={(e) => setEstudianteEditForm({
                                      ...formData, 
                                      apoderado: {...formData.apoderado, nombre: e.target.value}
                                    })}
                                    className="w-full h-8 text-sm"
                                    placeholder="Nombre"
                                  />
                                ) : (
                                  <span className="text-xs">{estudiante.apoderado?.nombre || '-'}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-gray-900 hidden xl:table-cell">
                                {estaEditando ? (
                                  <Input
                                    value={formData.apoderado?.parentesco || ''}
                                    onChange={(e) => setEstudianteEditForm({
                                      ...formData, 
                                      apoderado: {...formData.apoderado, parentesco: e.target.value}
                                    })}
                                    className="w-full h-8 text-sm"
                                    placeholder="Parentesco"
                                  />
                                ) : (
                                  <span className="text-xs">{estudiante.apoderado?.parentesco || '-'}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-gray-900 hidden xl:table-cell">
                                {estaEditando ? (
                                  <Input
                                    value={formData.apoderado?.telefono || ''}
                                    onChange={(e) => setEstudianteEditForm({
                                      ...formData, 
                                      apoderado: {...formData.apoderado, telefono: e.target.value}
                                    })}
                                    className="w-full h-8 text-sm"
                                    placeholder="Teléfono"
                                  />
                                ) : (
                                  <span className="text-xs">{estudiante.apoderado?.telefono || '-'}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-gray-900 hidden xl:table-cell">
                                {estaEditando ? (
                                  <Input
                                    type="email"
                                    value={formData.apoderado?.email || ''}
                                    onChange={(e) => setEstudianteEditForm({
                                      ...formData, 
                                      apoderado: {...formData.apoderado, email: e.target.value}
                                    })}
                                    className="w-full h-8 text-sm"
                                    placeholder="Email"
                                  />
                                ) : (
                                  <span className="text-xs">{estudiante.apoderado?.email || '-'}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-gray-900 hidden xl:table-cell">
                                {estaEditando ? (
                                  <Input
                                    value={formData.apoderado?.telefonoAlternativo || ''}
                                    onChange={(e) => setEstudianteEditForm({
                                      ...formData, 
                                      apoderado: {...formData.apoderado, telefonoAlternativo: e.target.value}
                                    })}
                                    className="w-full h-8 text-sm"
                                    placeholder="Tel. Alt."
                                  />
                                ) : (
                                  <span className="text-xs">{estudiante.apoderado?.telefonoAlternativo || '-'}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-gray-900 hidden xl:table-cell">
                                {estaEditando ? (
                                  <Input
                                    value={formData.apoderado?.direccion || ''}
                                    onChange={(e) => setEstudianteEditForm({
                                      ...formData, 
                                      apoderado: {...formData.apoderado, direccion: e.target.value}
                                    })}
                                    className="w-full h-8 text-sm"
                                    placeholder="Dirección"
                                  />
                                ) : (
                                  <span className="text-xs">{estudiante.apoderado?.direccion || '-'}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {estaEditando ? (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="default"
                                        onClick={async () => {
                                          try {
                                            console.log('🔄 Iniciando guardado de estudiante...');
                                            // Usar el ID del estudiante si está disponible, si no, buscar por nombre
                                            let estudianteCompleto = null;
                                            let estudianteId: string | undefined = undefined;
                                            
                                            // Intentar obtener el ID del formulario de edición primero, luego del objeto estudiante
                                            const idDelFormulario = estudianteEditForm.id;
                                            const idDelEstudiante = estudiante.id;
                                            
                                            if (idDelFormulario) {
                                              // Si tenemos el ID en el formulario, usarlo directamente (más confiable)
                                              estudianteId = idDelFormulario;
                                              console.log('📝 Usando ID del formulario:', estudianteId);
                                              estudianteCompleto = await fetchEstudianteById(estudianteId);
                                            } else if (idDelEstudiante) {
                                              // Si tenemos el ID en el objeto estudiante, usarlo
                                              estudianteId = idDelEstudiante;
                                              console.log('📝 Usando ID del estudiante:', estudianteId);
                                              estudianteCompleto = await fetchEstudianteById(estudianteId);
                                            } else {
                                              // Fallback: intentar buscar por ID en estudiantesInfo primero, luego por nombre
                                              const nombreOriginal = estudianteNombreOriginal || getNombreCompleto(estudiante);
                                              console.log('📝 Intentando buscar estudiante por ID en lista local o por nombre:', nombreOriginal);
                                              
                                              // Primero intentar buscar en estudiantesInfo por ID si el nombre parece ser un UUID
                                              const esUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nombreOriginal);
                                              if (esUUID) {
                                                const estudianteLocal = estudiantesInfo.find(e => e.id === nombreOriginal);
                                                if (estudianteLocal?.id) {
                                                  estudianteId = estudianteLocal.id;
                                                  estudianteCompleto = await fetchEstudianteById(estudianteId);
                                                  console.log('✅ Estudiante encontrado por ID en lista local:', estudianteId);
                                                }
                                              }
                                              
                                              // Si no se encontró por ID, buscar por nombre
                                              if (!estudianteCompleto) {
                                                console.log('📝 Buscando por nombre:', nombreOriginal);
                                                estudianteCompleto = await fetchEstudiante(nombreOriginal);
                                                if (estudianteCompleto?.id) {
                                                  estudianteId = estudianteCompleto.id;
                                                }
                                              }
                                            }
                                            
                                            if (!estudianteCompleto) {
                                              console.error('❌ No se encontró el estudiante completo');
                                              toast.error('No se pudo cargar la información del estudiante');
                                              return;
                                            }
                                            
                                            // Asegurar que tenemos el ID
                                            if (!estudianteId && estudianteCompleto.id) {
                                              estudianteId = estudianteCompleto.id;
                                            }
                                            
                                            if (!estudianteId) {
                                              console.error('❌ No se pudo obtener el ID del estudiante');
                                              toast.error('Error: No se pudo identificar al estudiante');
                                              return;
                                            }
                                            
                                            console.log('✅ Estudiante completo encontrado:', estudianteCompleto);
                                            console.log('📝 ID del estudiante:', estudianteId);
                                            console.log('📝 Formulario editado:', estudianteEditForm);

                                            // Fusionar la información editada con la información completa existente
                                            // IMPORTANTE: Usar los valores del formulario si están presentes, de lo contrario usar los valores existentes
                                            const estudianteActualizado: EstudianteInfo = {
                                              ...estudianteCompleto,
                                              // Usar nombres y apellidos del formulario si están presentes y no están vacíos
                                              nombres: (estudianteEditForm.nombres && estudianteEditForm.nombres.trim()) 
                                                ? estudianteEditForm.nombres.trim() 
                                                : (estudianteCompleto.nombres || ''),
                                              apellidos: (estudianteEditForm.apellidos && estudianteEditForm.apellidos.trim()) 
                                                ? estudianteEditForm.apellidos.trim() 
                                                : (estudianteCompleto.apellidos || ''),
                                              // Usar grado del formulario si está presente, de lo contrario el existente
                                              grado: estudianteEditForm.grado !== undefined && estudianteEditForm.grado !== null && estudianteEditForm.grado !== ''
                                                ? estudianteEditForm.grado
                                                : estudianteCompleto.grado,
                                              // Usar sección del formulario si está presente, de lo contrario la existente
                                              seccion: estudianteEditForm.seccion !== undefined && estudianteEditForm.seccion !== null && estudianteEditForm.seccion !== ''
                                                ? estudianteEditForm.seccion
                                                : estudianteCompleto.seccion,
                                              // Usar edad del formulario si está presente, de lo contrario la existente
                                              edad: estudianteEditForm.edad !== undefined && estudianteEditForm.edad !== null
                                                ? estudianteEditForm.edad
                                                : estudianteCompleto.edad,
                                              // Usar fecha de nacimiento del formulario si está presente
                                              fechaNacimiento: estudianteEditForm.fechaNacimiento !== undefined
                                                ? estudianteEditForm.fechaNacimiento
                                                : estudianteCompleto.fechaNacimiento,
                                              // Preservar foto de perfil
                                              fotoPerfil: estudianteEditForm.fotoPerfil !== undefined
                                                ? estudianteEditForm.fotoPerfil
                                                : estudianteCompleto.fotoPerfil,
                                              // Fusionar contacto: usar valores del formulario si están presentes
                                              contacto: {
                                                ...estudianteCompleto.contacto,
                                                ...(estudianteEditForm.contacto || {}),
                                                // Si el formulario tiene contacto, usar esos valores (incluso si son vacíos)
                                                telefono: estudianteEditForm.contacto?.telefono !== undefined
                                                  ? estudianteEditForm.contacto.telefono
                                                  : estudianteCompleto.contacto?.telefono,
                                                email: estudianteEditForm.contacto?.email !== undefined
                                                  ? estudianteEditForm.contacto.email
                                                  : estudianteCompleto.contacto?.email,
                                              },
                                              // Preservar tutor si no se está editando
                                              tutor: estudianteEditForm.tutor ? {
                                                ...estudianteCompleto.tutor,
                                                ...estudianteEditForm.tutor
                                              } : estudianteCompleto.tutor,
                                              // Preservar apoderado si no se está editando
                                              apoderado: estudianteEditForm.apoderado ? {
                                                ...estudianteCompleto.apoderado,
                                                ...estudianteEditForm.apoderado
                                              } : estudianteCompleto.apoderado,
                                              // Asegurar que el ID esté presente
                                              id: estudianteId || estudianteCompleto.id,
                                            };
                                            
                                            // Validar que nombres y apellidos estén presentes y no estén vacíos antes de guardar
                                            console.log('✅ Estudiante actualizado preparado:', estudianteActualizado);
                                            if (!estudianteActualizado.nombres || !estudianteActualizado.nombres.trim() || 
                                                !estudianteActualizado.apellidos || !estudianteActualizado.apellidos.trim()) {
                                              console.error('❌ Faltan nombres o apellidos:', {
                                                nombres: estudianteActualizado.nombres,
                                                apellidos: estudianteActualizado.apellidos
                                              });
                                              toast.error('Los campos nombres y apellidos son requeridos y no pueden estar vacíos');
                                              return;
                                            }
                                            
                                            // Usar saveEstudianteInfo con estudianteId para asegurar que actualizamos el registro correcto
                                            // Esto preserva todos los campos existentes y solo actualiza los editados
                                            console.log('💾 Guardando estudiante en base de datos con ID:', estudianteId);
                                            console.log('📦 Datos a guardar:', JSON.stringify(estudianteActualizado, null, 2));
                                            
                                            // Guardar el ID del estudiante que se está editando antes de guardar
                                            const estudianteEditadoId = estudianteId;
                                          
                                            try {
                                              await saveEstudianteInfo(estudianteActualizado, estudianteId);
                                              console.log('✅ Estudiante guardado exitosamente en la base de datos');
                                            } catch (saveError: any) {
                                              console.error('❌ Error al guardar estudiante:', saveError);
                                              console.error('❌ Detalles del error:', {
                                                message: saveError.message,
                                                stack: saveError.stack,
                                                estudianteId,
                                                estudianteActualizado
                                              });
                                              toast.error(`Error al guardar: ${saveError.message || 'Error desconocido'}`);
                                              return; // Salir temprano si hay error
                                            }
                                          
                                            // Cerrar el formulario de edición INMEDIATAMENTE después de guardar exitosamente
                                            // Esto debe hacerse ANTES de cualquier otra operación asíncrona
                                            console.log('🔄 Cerrando formulario de edición...');
                                            console.log('📝 Identificador que se estaba editando:', estudianteEditandoAdmin);
                                            console.log('📝 ID del estudiante guardado:', estudianteId);
                                            
                                            // IMPORTANTE: Cerrar el formulario basándose en el ID del estudiante guardado
                                            // Esto asegura que se cierre incluso si el identificador cambió
                                            // Primero verificar si el estudiante que se está editando coincide con el que se guardó
                                            const identificadorActual = estudianteEditandoAdmin;
                                            const debeCerrar = !identificadorActual || 
                                              identificadorActual === estudianteId || 
                                              identificadorActual === estudianteCompleto.id ||
                                              identificadorActual === estudianteCompleto.nombre ||
                                              identificadorActual === (estudianteCompleto.nombres + ' ' + estudianteCompleto.apellidos).trim();
                                            
                                            if (debeCerrar) {
                                              console.log('✅ Cerrando formulario porque coincide con el estudiante guardado');
                                              // Usar flushSync para forzar la actualización síncrona del estado
                                              // Esto asegura que React procese el cambio inmediatamente
                                              flushSync(() => {
                                                setEstudianteEditandoAdmin(null);
                                                setEstudianteEditForm({});
                                                setEstudianteNombreOriginal(null);
        setEstudianteIdOriginal(null);
                                                setFormularioCerradoKey(prev => prev + 1);
                                              });
                                              console.log('✅ Formulario cerrado');
                                            } else {
                                              console.log('⚠️ Identificador no coincide, forzando cierre de todas formas');
                                              flushSync(() => {
                                                setEstudianteEditandoAdmin(null);
                                                setEstudianteEditForm({});
                                                setEstudianteNombreOriginal(null);
        setEstudianteIdOriginal(null);
                                                setFormularioCerradoKey(prev => prev + 1);
                                              });
                                            }
                                          
                                            // Mostrar toast de éxito inmediatamente
                                            toast.success('Estudiante actualizado exitosamente');
                                          
                                            // Esperar un momento para que la base de datos se actualice completamente
                                            await new Promise(resolve => setTimeout(resolve, 500));
                                          
                                            // Recargar estudiantes desde la base de datos para obtener los datos actualizados (incluyendo nombres y apellidos)
                                            console.log('🔄 Recargando estudiantes desde la base de datos...');
                                            
                                            // Intentar recargar con retry en caso de que la base de datos aún no se haya actualizado
                                            let estudiantesActualizados = null;
                                            let intentos = 0;
                                            const maxIntentos = 3;
                                            
                                            while (!estudiantesActualizados && intentos < maxIntentos) {
                                              try {
                                                estudiantesActualizados = await fetchEstudiantes();
                                                console.log(`✅ Estudiantes recargados (intento ${intentos + 1}):`, estudiantesActualizados.length);
                                                
                                                // Verificar que el estudiante actualizado esté en la lista
                                                const estudianteEncontrado = estudiantesActualizados.find((e: any) => 
                                                  (e.id === estudianteId) || 
                                                  (e.nombres === estudianteActualizado.nombres && e.apellidos === estudianteActualizado.apellidos)
                                                );
                                                
                                                if (estudianteEncontrado) {
                                                  console.log('✅ Estudiante actualizado encontrado en la lista:', estudianteEncontrado);
                                                  break;
                                                } else if (intentos < maxIntentos - 1) {
                                                  console.log(`⏳ Estudiante aún no encontrado, esperando... (intento ${intentos + 1}/${maxIntentos})`);
                                                  await new Promise(resolve => setTimeout(resolve, 300));
                                                  estudiantesActualizados = null;
                                                }
                                              } catch (error) {
                                                console.error('❌ Error recargando estudiantes:', error);
                                                if (intentos < maxIntentos - 1) {
                                                  await new Promise(resolve => setTimeout(resolve, 300));
                                                }
                                              }
                                              intentos++;
                                            }
                                            
                                            if (!estudiantesActualizados) {
                                              console.error('❌ No se pudieron recargar los estudiantes después de varios intentos');
                                              estudiantesActualizados = await fetchEstudiantes(); // Último intento
                                            }
                                            
                                            // Crear nuevas referencias de los objetos para forzar el re-render completo
                                            // Esto asegura que React detecte los cambios incluso si los objetos tienen la misma estructura
                                            const estudiantesConNuevasReferencias = estudiantesActualizados.map(est => ({ ...est }));
                                            
                                            // Actualizar el estado con los datos frescos de la base de datos
                                            // Primero actualizar directamente el estado local con los datos que acabamos de guardar
                                            // Esto asegura una actualización inmediata mientras se recargan los datos
                                            setEstudiantesInfo(prev => {
                                              // Encontrar el índice del estudiante que se actualizó
                                              const index = prev.findIndex((e: any) => 
                                                (e.id === estudianteId) || 
                                                (e.nombres === estudianteActualizado.nombres && e.apellidos === estudianteActualizado.apellidos)
                                              );
                                              
                                              if (index !== -1) {
                                                // Actualizar el estudiante en su posición
                                                const nuevos = [...prev];
                                                nuevos[index] = { ...estudianteActualizado };
                                                return nuevos;
                                              }
                                              
                                              // Si no se encuentra, retornar el estado anterior (se actualizará con la recarga)
                                              return prev;
                                            });
                                            
                                            // Cerrar el formulario ANTES de actualizar la lista para asegurar que se cierre
                                            flushSync(() => {
                                              setEstudianteEditandoAdmin(null);
                                              setEstudianteEditForm({});
                                              setEstudianteNombreOriginal(null);
        setEstudianteIdOriginal(null);
                                            });
                                            
                                            // Luego actualizar con los datos recargados de la base de datos para asegurar consistencia
                                            // Usar una función de actualización para asegurar que React detecte el cambio
                                            setEstudiantesInfo(() => estudiantesConNuevasReferencias);
                                            
                                            // Actualizar lista de estudiantes para reflejar cambios
                                            const lista = await getListaEstudiantes();
                                            const info = estudiantesActualizados;
                                            const nombresUnicos = Array.from(new Set([
                                              ...info.map((i: any) => i.nombre),
                                              ...lista.map((e: any) => e.nombre)
                                            ]));
                                            const listaFinal = nombresUnicos.map(nombre => {
                                              const datos = (info.find((i: any) => i.nombre === nombre) || {}) as { grado?: string; seccion?: string; [key: string]: any };
                                              const base = (lista.find((e: any) => e.nombre === nombre) || {}) as { nombre?: string; totalIncidencias?: number; ultimaIncidencia?: string; grado?: string; seccion?: string; [key: string]: any };
                                              return {
                                                nombre: nombre,
                                                totalIncidencias: base.totalIncidencias ?? 0,
                                                ultimaIncidencia: base.ultimaIncidencia ?? 'N/A',
                                                grado: datos.grado ?? base.grado ?? '',
                                                seccion: datos.seccion ?? base.seccion ?? '',
                                              };
                                            });
                                            setListaEstudiantes(() => listaFinal);
                                            
                                            // Si el estudiante está seleccionado, actualizar también su información
                                            if (selectedStudentId && estudianteEditadoId === selectedStudentId) {
                                              console.log('🔄 Actualizando información del estudiante seleccionado...');
                                              const estudianteActualizadoInfo = await fetchEstudianteById(selectedStudentId);
                                              if (estudianteActualizadoInfo) {
                                                setInfoEdit(estudianteActualizadoInfo);
                                                if (estudianteActualizadoInfo.nombre) {
                                                  setSelectedStudentName(estudianteActualizadoInfo.nombre);
                                                }
                                                console.log('✅ Información del estudiante seleccionado actualizada');
                                              }
                                            }
                                            
                                            // Forzar actualización del refreshKey para recargar todos los datos
                                            // Esto asegura que cualquier componente que dependa de refreshKey se actualice
                                            setRefreshKey(prev => prev + 1);
                                            
                                            // Forzar un re-render adicional después de un breve delay para asegurar que todo se actualice
                                            setTimeout(() => {
                                              setEstudiantesInfo(prev => {
                                                // Crear una nueva referencia del array para forzar re-render
                                                return [...prev];
                                              });
                                            }, 100);
                                          } catch (error: any) {
                                            console.error('❌ Error guardando estudiante:', error);
                                            // Asegurar que el formulario se cierre incluso si hay un error
                                            setEstudianteEditandoAdmin(null);
                                            setEstudianteEditForm({});
                                            setEstudianteNombreOriginal(null);
        setEstudianteIdOriginal(null);
                                            toast.error(error.message || 'Error al guardar el estudiante');
                                          }
                                        }}
                                      >
                                        Guardar
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEstudianteEditandoAdmin(null);
                                          setEstudianteEditForm({});
                                        }}
                                      >
                                        Cancelar
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          // Usar ID si está disponible, si no usar nombre (para compatibilidad)
                                          const identificador = estudiante.id || getNombreCompleto(estudiante);
                                          setEstudianteEditandoAdmin(identificador);
                                          setEstudianteNombreOriginal(getNombreCompleto(estudiante));
                                          setEstudianteIdOriginal(estudiante.id || null);
                                          // Si no tiene nombres y apellidos separados, intentar separarlos del nombre
                                          let nombres = estudiante.nombres;
                                          let apellidos = estudiante.apellidos;
                                          if (!nombres && !apellidos) {
                                            const nombreCompleto = getNombreCompleto(estudiante);
                                            const partes = nombreCompleto.trim().split(/\s+/);
                                            if (partes.length > 1) {
                                              apellidos = partes[partes.length - 1];
                                              nombres = partes.slice(0, -1).join(' ');
                                            } else {
                                              nombres = nombreCompleto;
                                              apellidos = '';
                                            }
                                          }
                                          // Asegurar que el ID esté incluido en el formulario de edición
                                          setEstudianteEditForm({...estudiante, nombres, apellidos, id: estudiante.id});
                                        }}
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={async () => {
                                          if (confirm(`¿Estás seguro de eliminar a ${getNombreCompleto(estudiante)}?`)) {
                                            try {
                                              // Usar ID si está disponible (más confiable), si no usar nombre
                                              const identificador = estudiante.id || getNombreCompleto(estudiante);
                                              const usarId = !!estudiante.id;
                                              await deleteEstudiante(identificador, usarId);
                                              // Filtrar por ID si está disponible, si no por nombre
                                              const estudiantesFiltrados = estudiantesInfo.filter(e => {
                                                if (estudiante.id && e.id) {
                                                  return e.id !== estudiante.id;
                                                }
                                                return getNombreCompleto(e) !== getNombreCompleto(estudiante);
                                              });
                                              setEstudiantesInfo(estudiantesFiltrados);
                                              setRefreshKey(prev => prev + 1);
                                              toast.success('Estudiante eliminado exitosamente de la base de datos');
                                            } catch (error: any) {
                                              console.error('Error eliminando estudiante:', error);
                                              toast.error(error.message || 'Error al eliminar estudiante');
                                            }
                                          }
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4 text-red-600" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Sub-tab: Profesores */}
          {adminSubTab === 'profesores' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900">
                <User className="h-5 w-5 text-primary" />
                Administración de Profesores
              </CardTitle>
              <CardDescription className="text-sm text-gray-900">
                Importa y gestiona la información de profesores/tutores desde archivos Excel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Botón de importación */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Importar Profesores desde Excel</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Selecciona un archivo Excel (.xlsx, .xls). Podrás mapear las columnas del archivo a los campos del sistema.
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    try {
                      toast.loading('Leyendo archivo Excel...', { id: 'import-profesores' });
                      const data = await file.arrayBuffer();
                      const workbook = XLSX.read(data, { type: 'array' });
                      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                      const jsonData = XLSX.utils.sheet_to_json(firstSheet) as any[];
                      
                      // Obtener columnas del Excel
                      const columnas = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
                      setColumnasExcelProfesores(columnas);
                      setDatosExcelProfesores(jsonData);
                      setArchivoExcelProfesores(file);
                      
                      // Inicializar mapeo automático si encuentra coincidencias
                      const mapeoInicial: Record<string, string> = {};
                      columnas.forEach(col => {
                        const colLower = col.toLowerCase().trim();
                        if (colLower.includes('nombre') && !mapeoInicial['nombre']) {
                          mapeoInicial['nombre'] = col;
                        } else if ((colLower.includes('email') || colLower.includes('correo')) && !mapeoInicial['email']) {
                          mapeoInicial['email'] = col;
                        } else if ((colLower.includes('telefono') || colLower.includes('teléfono') || colLower.includes('phone')) && !mapeoInicial['telefono']) {
                          mapeoInicial['telefono'] = col;
                        }
                      });
                      setMapeoProfesores(mapeoInicial);
                      setMostrarMapeoProfesores(true);
                      toast.dismiss('import-profesores');
                      e.target.value = '';
                    } catch (error: any) {
                      console.error('Error leyendo archivo:', error);
                      toast.error(error.message || 'Error al leer el archivo Excel', { id: 'import-profesores' });
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                  id="file-input-profesores"
                />
                <Button
                  onClick={() => document.getElementById('file-input-profesores')?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Seleccionar Archivo Excel
                </Button>
              </div>

              {/* Lista de profesores actuales */}
              <div key={`profesores-${refreshKey}`}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Profesores Registrados ({tutores.length})</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-sm font-semibold">Nombre</TableHead>
                        <TableHead className="text-sm font-semibold">Email</TableHead>
                        <TableHead className="text-sm font-semibold">Teléfono</TableHead>
                        <TableHead className="text-sm font-semibold text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tutores.map((profesor) => {
                        const estaEditando = profesorEditandoAdmin === profesor.id;
                        const formData = estaEditando ? profesorEditForm : profesor;
                        
                        return (
                          <TableRow key={profesor.id}>
                            <TableCell className="font-medium text-gray-900">
                              {estaEditando ? (
                                <Input
                                  value={formData.nombre || ''}
                                  onChange={(e) => setProfesorEditForm({...formData, nombre: e.target.value})}
                                  className="w-full h-8 text-sm"
                                />
                              ) : (
                                profesor.nombre
                              )}
                            </TableCell>
                            <TableCell className="text-gray-900">
                              {estaEditando ? (
                                <Input
                                  type="email"
                                  value={formData.email || ''}
                                  onChange={(e) => setProfesorEditForm({...formData, email: e.target.value})}
                                  className="w-full h-8 text-sm"
                                  placeholder="Email (opcional)"
                                />
                              ) : (
                                profesor.email || '-'
                              )}
                            </TableCell>
                            <TableCell className="text-gray-900">
                              {estaEditando ? (
                                <Input
                                  type="tel"
                                  value={formData.telefono || ''}
                                  onChange={(e) => setProfesorEditForm({...formData, telefono: e.target.value})}
                                  className="w-full h-8 text-sm"
                                  placeholder="Teléfono (opcional)"
                                />
                              ) : (
                                profesor.telefono || '-'
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {estaEditando ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={async () => {
                                          if (!profesorEditForm.nombre || !profesorEditForm.nombre.trim()) {
                                            toast.error('El nombre es obligatorio');
                                            return;
                                          }
                                        
                                        // Actualizar el profesor con todos los campos del formulario
                                        const profesorActualizado = {...profesor, ...profesorEditForm} as Tutor;
                                        
                                        // Actualizar directamente en la base de datos
                                        await updateTutor(profesorActualizado);
                                        
                                        // Actualizar el estado local
                                        const profesores = [...tutores];
                                        const idx = profesores.findIndex(p => p.id === profesor.id);
                                        if (idx >= 0) {
                                          profesores[idx] = profesorActualizado;
                                          setTutores(profesores);
                                        }
                                        
                                          setRefreshKey(prev => prev + 1);
                                          setProfesorEditandoAdmin(null);
                                          setProfesorEditForm({});
                                          toast.success('Profesor actualizado exitosamente');
                                      }}
                                    >
                                      Guardar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setProfesorEditandoAdmin(null);
                                        setProfesorEditForm({});
                                      }}
                                    >
                                      Cancelar
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setProfesorEditandoAdmin(profesor.id);
                                        setProfesorEditForm({
                                          nombre: profesor.nombre,
                                          email: profesor.email,
                                          telefono: profesor.telefono
                                        });
                                      }}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={async () => {
                                        if (confirm(`¿Estás seguro de eliminar al profesor "${profesor.nombre}"?`)) {
                                          try {
                                            await deleteTutor(profesor.id);
                                            const profesoresFiltrados = tutores.filter(p => p.id !== profesor.id);
                                            setTutores(profesoresFiltrados);
                                          setRefreshKey(prev => prev + 1);
                                            toast.success('Profesor eliminado exitosamente de la base de datos');
                                          } catch (error) {
                                            console.error('Error eliminando profesor:', error);
                                            toast.error('Error al eliminar profesor');
                                          }
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Sub-tab: Grados y Secciones */}
          {adminSubTab === 'grados' && (
            <div key={`grados-secciones-${refreshKey}`} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Administración de Grados */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900">
                      <Calendar className="h-5 w-5 text-primary" />
                      Grados
                    </CardTitle>
                    <Button
                      size="sm"
                      type="button"
                      className="gap-1"
                      onClick={() => {
                        setMostrarAgregarGrado(true);
                        setNuevoGradoInput('');
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Agregar
                    </Button>
                  </div>
                  <CardDescription className="text-sm text-gray-900">
                    Gestiona los grados disponibles en el sistema
                  </CardDescription>
                </CardHeader>
                <CardContent key={`grados-list-${refreshKey}`}>
                  {/* Formulario para agregar grado */}
                  {mostrarAgregarGrado && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex gap-2 items-center">
                        <Input
                          value={nuevoGradoInput}
                          onChange={(e) => setNuevoGradoInput(e.target.value)}
                          placeholder="Nombre del grado"
                          className="flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (nuevoGradoInput.trim()) {
                                if (!grados.includes(nuevoGradoInput.trim())) {
                                  const nuevosGrados = [...grados, nuevoGradoInput.trim()];
                                  saveGrados(nuevosGrados).then(() => {
                                    setGrados(nuevosGrados);
                                  setMostrarAgregarGrado(false);
                                  setNuevoGradoInput('');
                                  setRefreshKey(prev => prev + 1);
                                  toast.success('Grado agregado exitosamente');
                                  }).catch(error => {
                                    console.error('Error guardando grados:', error);
                                    toast.error('Error al guardar grado');
                                  });
                                } else {
                                  toast.error('Este grado ya existe');
                                }
                              }
                            } else if (e.key === 'Escape') {
                              setMostrarAgregarGrado(false);
                              setNuevoGradoInput('');
                            }
                          }}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (nuevoGradoInput.trim()) {
                              if (!grados.includes(nuevoGradoInput.trim())) {
                                const nuevosGrados = [...grados, nuevoGradoInput.trim()];
                                await saveGrados(nuevosGrados);
                                setGrados(nuevosGrados);
                                setMostrarAgregarGrado(false);
                                setNuevoGradoInput('');
                                setRefreshKey(prev => prev + 1);
                                toast.success('Grado agregado exitosamente');
                              } else {
                                toast.error('Este grado ya existe');
                              }
                            }
                          }}
                        >
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setMostrarAgregarGrado(false);
                            setNuevoGradoInput('');
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    {grados.map((grado, idx) => (
                      <div key={`grado-${grado}-${idx}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="font-medium text-gray-900">{grado}</span>
                        <button
                          type="button"
                          onClick={async () => {
                            console.log('🔄 Click en eliminar grado:', grado);
                            console.log('📊 Grados actuales:', grados);
                            
                            // Verificar primero si tiene estudiantes antes de mostrar el diálogo
                            const estudiantesDelGrado = estudiantesInfo.filter(e => e.grado === grado);
                            if (estudiantesDelGrado.length > 0) {
                              // Agrupar estudiantes por sección
                              const estudiantesPorSeccion: Record<string, number> = {};
                              estudiantesDelGrado.forEach(e => {
                                const seccion = e.seccion || 'Sin sección';
                                estudiantesPorSeccion[seccion] = (estudiantesPorSeccion[seccion] || 0) + 1;
                              });
                              
                              const totalEstudiantes = estudiantesDelGrado.length;
                              const seccionesList = Object.entries(estudiantesPorSeccion)
                                .map(([seccion, count]) => `${count} en sección ${seccion}`)
                                .join(', ');
                              
                              // Mostrar diálogo de información
                              setInfoTipo('grado');
                              setInfoNombre(grado);
                              setInfoMensaje(`No se puede eliminar el grado "${grado}": hay ${totalEstudiantes} estudiante(s) (${seccionesList})`);
                              setMostrarInfoEstudiantes(true);
                              return;
                            }
                            
                            // Si no tiene estudiantes, mostrar el diálogo de confirmación
                            if (!window.confirm(`¿Estás seguro de eliminar el grado "${grado}"?`)) {
                              return;
                            }
                            
                            try {
                              const nuevosGrados = grados.filter(g => g !== grado);
                              await saveGrados(nuevosGrados);
                              setGrados(nuevosGrados);
                              setTimeout(() => {
                                setRefreshKey(prev => prev + 1);
                              }, 500);
                                toast.success('Grado eliminado exitosamente');
                            } catch (error) {
                              console.error('❌ Error eliminando grado:', error);
                              toast.error(`Error al eliminar el grado: ${error instanceof Error ? error.message : 'Error desconocido'}`);
                            }
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded hover:bg-opacity-10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Administración de Secciones */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900">
                      <Users className="h-5 w-5 text-primary" />
                      Secciones
                    </CardTitle>
                    <Button
                      size="sm"
                      type="button"
                      className="gap-1"
                      onClick={() => {
                        setMostrarAgregarSeccion(true);
                        setNuevaSeccionInput('');
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Agregar
                    </Button>
                  </div>
                  <CardDescription className="text-sm text-gray-900">
                    Gestiona las secciones disponibles en el sistema
                  </CardDescription>
                </CardHeader>
                <CardContent key={`secciones-list-${refreshKey}`}>
                  {/* Formulario para agregar sección */}
                  {mostrarAgregarSeccion && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex gap-2 items-center">
                        <Input
                          value={nuevaSeccionInput}
                          onChange={(e) => setNuevaSeccionInput(e.target.value)}
                          placeholder="Nombre de la sección"
                          className="flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (nuevaSeccionInput.trim()) {
                                const nuevaSeccion = nuevaSeccionInput.trim().toUpperCase();
                                if (!secciones.includes(nuevaSeccion)) {
                                  const nuevasSecciones = [...secciones, nuevaSeccion];
                                  saveSecciones(nuevasSecciones).then(() => {
                                    setSecciones(nuevasSecciones);
                                  setMostrarAgregarSeccion(false);
                                  setNuevaSeccionInput('');
                                  setRefreshKey(prev => prev + 1);
                                  toast.success('Sección agregada exitosamente');
                                  }).catch(error => {
                                    console.error('Error guardando secciones:', error);
                                    toast.error('Error al guardar sección');
                                  });
                                } else {
                                  toast.error('Esta sección ya existe');
                                }
                              }
                            } else if (e.key === 'Escape') {
                              setMostrarAgregarSeccion(false);
                              setNuevaSeccionInput('');
                            }
                          }}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (nuevaSeccionInput.trim()) {
                              const nuevaSeccion = nuevaSeccionInput.trim().toUpperCase();
                              if (!secciones.includes(nuevaSeccion)) {
                                const nuevasSecciones = [...secciones, nuevaSeccion];
                                await saveSecciones(nuevasSecciones);
                                setSecciones(nuevasSecciones);
                                  setMostrarAgregarSeccion(false);
                                  setNuevaSeccionInput('');
                                  setRefreshKey(prev => prev + 1);
                                  toast.success('Sección agregada exitosamente');
                              } else {
                                toast.error('Esta sección ya existe');
                              }
                            }
                          }}
                        >
                          Guardar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setMostrarAgregarSeccion(false);
                            setNuevaSeccionInput('');
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    {secciones.map((seccion, idx) => (
                      <div key={`seccion-${seccion}-${idx}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="font-medium text-gray-900">{seccion}</span>
                        <button
                          type="button"
                          onClick={async () => {
                            console.log('🔄 Click en eliminar sección:', seccion);
                            console.log('📊 Secciones actuales:', secciones);
                            
                            // Verificar primero si tiene estudiantes antes de mostrar el diálogo
                            const estudiantesDeLaSeccion = estudiantesInfo.filter(e => e.seccion === seccion);
                            if (estudiantesDeLaSeccion.length > 0) {
                              // Agrupar estudiantes por grado
                              const estudiantesPorGrado: Record<string, number> = {};
                              estudiantesDeLaSeccion.forEach(e => {
                                const grado = e.grado || 'Sin grado';
                                estudiantesPorGrado[grado] = (estudiantesPorGrado[grado] || 0) + 1;
                              });
                              
                              const totalEstudiantes = estudiantesDeLaSeccion.length;
                              const gradosList = Object.entries(estudiantesPorGrado)
                                .map(([grado, count]) => `${count} en grado ${grado}`)
                                .join(', ');
                              
                              // Mostrar diálogo de información
                              setInfoTipo('seccion');
                              setInfoNombre(seccion);
                              setInfoMensaje(`No se puede eliminar la sección "${seccion}": hay ${totalEstudiantes} estudiante(s) (${gradosList})`);
                              setMostrarInfoEstudiantes(true);
                              return;
                            }
                            
                            // Si no tiene estudiantes, mostrar el diálogo de confirmación
                            if (!window.confirm(`¿Estás seguro de eliminar la sección "${seccion}"?`)) {
                              return;
                            }
                            
                            try {
                              const nuevasSecciones = secciones.filter(s => s !== seccion);
                              await saveSecciones(nuevasSecciones);
                              setSecciones(nuevasSecciones);
                              setTimeout(() => {
                                setRefreshKey(prev => prev + 1);
                              }, 500);
                                toast.success('Sección eliminada exitosamente');
                            } catch (error) {
                              console.error('❌ Error eliminando sección:', error);
                              toast.error(`Error al eliminar la sección: ${error instanceof Error ? error.message : 'Error desconocido'}`);
                            }
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded hover:bg-opacity-10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              </div>

              {/* Tabla de Asignación de Tutores por Grado y Sección */}
              <Card key={`tutores-grado-seccion-${refreshKey}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900">
                    <User className="h-5 w-5 text-primary" />
                    Asignación de Tutores por Grado y Sección
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-900">
                    Asigna un tutor responsable para cada combinación de grado y sección
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Filtros */}
                  <div className="flex flex-wrap gap-3 items-end mb-4">
                    <div className="flex flex-col">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Grado</label>
                      <Select 
                        key={`select-filtro-tutores-grado-${refreshKey}`}
                        value={filtroTutoresGrado || 'todas'} 
                        onValueChange={(value) => setFiltroTutoresGrado(value === 'todas' ? '' : value)}
                      >
                        <SelectTrigger className="w-[140px] h-9 text-sm">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todas">Todos</SelectItem>
                          {(() => {
                            const todosLosGrados = grados;
                            const ordenGrados = ['1ro', '2do', '3ro', '4to', '5to'];
                            const gradosOrdenados = [
                              ...ordenGrados.filter(g => todosLosGrados.includes(g)),
                              ...todosLosGrados.filter(g => !ordenGrados.includes(g))
                            ];
                            return gradosOrdenados.map(grado => (
                              <SelectItem key={grado} value={grado}>{grado}</SelectItem>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Sección</label>
                      <Select 
                        key={`select-filtro-tutores-seccion-${refreshKey}`}
                        value={filtroTutoresSeccion || 'todas'} 
                        onValueChange={(value) => setFiltroTutoresSeccion(value === 'todas' ? '' : value)}
                      >
                        <SelectTrigger className="w-[140px] h-9 text-sm">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todas">Todas</SelectItem>
                          {secciones.map(seccion => (
                            <SelectItem key={seccion} value={seccion}>{seccion}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-sm font-semibold">Grado</TableHead>
                          <TableHead className="text-sm font-semibold">Sección</TableHead>
                          <TableHead className="text-sm font-semibold">Tutor Asignado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          // Usar estados de grados y secciones
                          const combinaciones: Array<{grado: string, seccion: string}> = [];
                          grados.forEach(grado => {
                            secciones.forEach(seccion => {
                              combinaciones.push({ grado, seccion });
                            });
                          });
                          
                          // Aplicar filtros
                          const combinacionesFiltradas = combinaciones.filter(combo =>
                            (!filtroTutoresGrado || combo.grado === filtroTutoresGrado) &&
                            (!filtroTutoresSeccion || combo.seccion === filtroTutoresSeccion)
                          );
                          
                          return combinacionesFiltradas.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                                {combinaciones.length === 0 
                                  ? 'No hay grados o secciones registrados. Agrega grados y secciones primero.'
                                  : 'No hay combinaciones que coincidan con los filtros seleccionados.'
                                }
                              </TableCell>
                            </TableRow>
                          ) : (
                            combinacionesFiltradas.map((combo) => {
                              const key = `${combo.grado}-${combo.seccion}`;
                              const asignacion = asignacionesTutores[key];
                              return (
                                <TableRow key={`${combo.grado}-${combo.seccion}-${refreshKey}`}>
                                  <TableCell className="font-medium text-gray-900">{combo.grado}</TableCell>
                                  <TableCell className="text-gray-900">{combo.seccion}</TableCell>
                                  <TableCell>
                                    <Select
                                      key={`select-${combo.grado}-${combo.seccion}-${asignacion?.tutorId || 'none'}-${refreshKey}`}
                                      value={asignacion?.tutorId || 'none'}
                                      onValueChange={async (tutorId) => {
                                        try {
                                          if (tutorId === 'none') {
                                            await removeTutorGradoSeccion(combo.grado, combo.seccion);
                                            
                                            // Actualizar estudiantes: remover tutor de todos los estudiantes de este grado y sección
                                            const estudiantes = [...estudiantesInfo];
                                            let estudiantesActualizados = false;
                                            estudiantes.forEach((estudiante) => {
                                              if (estudiante.grado === combo.grado && estudiante.seccion === combo.seccion) {
                                                estudiante.tutor = undefined;
                                                estudiantesActualizados = true;
                                              }
                                            });
                                            if (estudiantesActualizados) {
                                              await saveEstudiantesInfo(estudiantes);
                                              setEstudiantesInfo(estudiantes);
                                            }
                                            
                                            toast.success(`Tutor removido de ${combo.grado} ${combo.seccion}`);
                                          } else {
                                            const tutores = await fetchTutores();
                                            const tutor = tutores.find(t => t.id === tutorId);
                                            if (tutor) {
                                              await setTutorGradoSeccion(combo.grado, combo.seccion, tutor.id, tutor.nombre);
                                              
                                              // Actualizar estudiantes: asignar tutor a todos los estudiantes de este grado y sección
                                              const estudiantes = [...estudiantesInfo];
                                              let estudiantesActualizados = false;
                                              estudiantes.forEach((estudiante) => {
                                                if (estudiante.grado === combo.grado && estudiante.seccion === combo.seccion) {
                                                  estudiante.tutor = {
                                                    nombre: tutor.nombre,
                                                    telefono: tutor.telefono,
                                                    email: tutor.email
                                                  };
                                                  estudiantesActualizados = true;
                                                }
                                              });
                                              if (estudiantesActualizados) {
                                                await saveEstudiantesInfo(estudiantes);
                                                setEstudiantesInfo(estudiantes);
                                              }
                                              
                                              toast.success(`Tutor asignado a ${combo.grado} ${combo.seccion} y actualizado en estudiantes`);
                                            } else {
                                              toast.error('Tutor no encontrado');
                                            }
                                          }
                                          setRefreshKey(prev => prev + 1);
                                        } catch (error) {
                                          console.error('Error al asignar tutor:', error);
                                          toast.error('Error al asignar tutor');
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="w-[200px] h-8 text-xs">
                                        <SelectValue placeholder="Sin tutor asignado" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">Sin tutor asignado</SelectItem>
                                        {tutores.map((tutor) => (
                                          <SelectItem key={tutor.id} value={tutor.id}>{tutor.nombre}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          );
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Sub-tab: Asignación de Cursos */}
          {adminSubTab === 'cursos' && (
            <Card key={`cursos-${refreshKey}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg sm:text-xl text-gray-900">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Asignación de Profesores a Cursos
                  </span>
                  <Button
                    size="sm"
                    onClick={() => {
                      setFormularioCurso({ nombre: '', grado: '', seccion: '', profesor: '', dias: [] });
                      setMostrarFormularioCurso(true);
                    }}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Nueva Asignación
                  </Button>
                </CardTitle>
                <CardDescription className="text-sm text-gray-900">
                  Gestiona las asignaciones de profesores a cursos por grado y sección
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Formulario para nueva asignación */}
                {mostrarFormularioCurso && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader>
                      <CardTitle className="text-base text-gray-900">Nueva Asignación de Curso</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <label className="text-xs font-semibold text-gray-700 mb-1">Nombre del Curso/Materia</label>
                          <Input
                            value={formularioCurso.nombre}
                            onChange={(e) => setFormularioCurso({ ...formularioCurso, nombre: e.target.value })}
                            placeholder="Ej: Matemáticas"
                            className="text-sm"
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-xs font-semibold text-gray-700 mb-1">Grado</label>
                          <Select
                            value={formularioCurso.grado}
                            onValueChange={(value) => setFormularioCurso({ ...formularioCurso, grado: value })}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Selecciona grado" />
                            </SelectTrigger>
                          <SelectContent>
                            {grados.map((grado) => (
                              <SelectItem key={grado} value={grado}>{grado}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-700 mb-1">Sección</label>
                        <Select
                          key={`select-seccion-${refreshKey}`}
                          value={formularioCurso.seccion}
                          onValueChange={(value) => setFormularioCurso({ ...formularioCurso, seccion: value })}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Selecciona sección" />
                          </SelectTrigger>
                          <SelectContent>
                            {secciones.map((seccion) => (
                              <SelectItem key={seccion} value={seccion}>{seccion}</SelectItem>
                            ))}
                          </SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-col">
                          <label className="text-xs font-semibold text-gray-700 mb-1">Profesor</label>
                          <Select
                            value={formularioCurso.profesor}
                            onValueChange={(value) => setFormularioCurso({ ...formularioCurso, profesor: value })}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Selecciona profesor" />
                            </SelectTrigger>
                            <SelectContent>
                              {tutores.map((profesor) => (
                                <SelectItem key={profesor.id} value={profesor.nombre}>{profesor.nombre}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-700 mb-2">Días de la semana</label>
                        <div className="flex flex-wrap gap-3">
                          {(['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] as DiaSemana[]).map((dia) => (
                            <label key={dia} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formularioCurso.dias.includes(dia)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormularioCurso({
                                      ...formularioCurso,
                                      dias: [...formularioCurso.dias, dia]
                                    });
                                  } else {
                                    setFormularioCurso({
                                      ...formularioCurso,
                                      dias: formularioCurso.dias.filter(d => d !== dia)
                                    });
                                  }
                                }}
                                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                              />
                              <span className="text-sm text-gray-700 capitalize">{dia}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setMostrarFormularioCurso(false);
                            setFormularioCurso({ nombre: '', grado: '', seccion: '', profesor: '', dias: [] });
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={async () => {
                            if (!formularioCurso.nombre.trim() || !formularioCurso.grado || !formularioCurso.seccion || !formularioCurso.profesor) {
                              toast.error('Por favor completa todos los campos');
                              return;
                            }
                            
                            if (formularioCurso.dias.length === 0) {
                              toast.error('Por favor selecciona al menos un día de la semana');
                              return;
                            }
                            
                            const todasLasClases = await fetchClases();
                            const existe = todasLasClases.some(c => 
                              c.nombre.toLowerCase() === formularioCurso.nombre.trim().toLowerCase() &&
                              c.grado === formularioCurso.grado &&
                              c.seccion === formularioCurso.seccion
                            );
                            
                            if (existe) {
                              toast.error('Ya existe una asignación para este curso, grado y sección');
                              return;
                            }
                            
                            try {
                              console.log('📝 Intentando crear clase:', formularioCurso);
                              await addClase({
                                nombre: formularioCurso.nombre.trim(),
                                grado: formularioCurso.grado,
                                seccion: formularioCurso.seccion,
                                profesor: formularioCurso.profesor,
                                dias: formularioCurso.dias
                              });
                              console.log('✅ Clase creada exitosamente');
                              // Recargar las clases directamente
                              const clasesActualizadas = await fetchClases();
                              setClases(clasesActualizadas);
                              setRefreshKey(prev => prev + 1);
                              setMostrarFormularioCurso(false);
                              setFormularioCurso({ nombre: '', grado: '', seccion: '', profesor: '', dias: [] });
                              toast.success('Asignación creada exitosamente');
                            } catch (error) {
                              console.error('❌ Error al crear la asignación:', error);
                              toast.error(`Error al crear la asignación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
                            }
                          }}
                        >
                          Guardar Asignación
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Filtros */}
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex flex-col">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Grado</label>
                    <Select 
                      key={`select-filtro-cursos-grado-${refreshKey}`}
                      value={filtroCursosGrado || 'todas'} 
                      onValueChange={(value) => setFiltroCursosGrado(value === 'todas' ? '' : value)}
                    >
                      <SelectTrigger className="w-[140px] h-9 text-sm">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todos</SelectItem>
                        {(() => {
                          const todosLosGrados = grados;
                          const ordenGrados = ['1ro', '2do', '3ro', '4to', '5to'];
                          const gradosOrdenados = [
                            ...ordenGrados.filter(g => todosLosGrados.includes(g)),
                            ...todosLosGrados.filter(g => !ordenGrados.includes(g))
                          ];
                          return gradosOrdenados.map(grado => (
                            <SelectItem key={grado} value={grado}>{grado}</SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Sección</label>
                    <Select 
                      key={`select-filtro-cursos-seccion-${refreshKey}`}
                      value={filtroCursosSeccion || 'todas'} 
                      onValueChange={(value) => setFiltroCursosSeccion(value === 'todas' ? '' : value)}
                    >
                      <SelectTrigger className="w-[140px] h-9 text-sm">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas</SelectItem>
                        {secciones.map(seccion => (
                          <SelectItem key={seccion} value={seccion}>{seccion}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col flex-1 min-w-[180px]">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Buscar Curso</label>
                    <Input
                      type="text"
                      placeholder="Buscar por nombre de curso..."
                      value={busquedaCursosNombre}
                      onChange={e => setBusquedaCursosNombre(e.target.value)}
                      className="h-9 text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-primary focus:border-primary transition outline-none shadow-sm"
                    />
                  </div>
                </div>

                {/* Tabla de asignaciones */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-sm font-semibold">Curso/Materia</TableHead>
                        <TableHead className="text-sm font-semibold">Grado</TableHead>
                        <TableHead className="text-sm font-semibold">Sección</TableHead>
                        <TableHead className="text-sm font-semibold">Profesor</TableHead>
                        <TableHead className="text-sm font-semibold">Días</TableHead>
                        <TableHead className="text-sm font-semibold text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const clasesFiltradas = clases.filter(clase =>
                          (!filtroCursosGrado || clase.grado === filtroCursosGrado) &&
                          (!filtroCursosSeccion || clase.seccion === filtroCursosSeccion) &&
                          (!busquedaCursosNombre || clase.nombre.toLowerCase().includes(busquedaCursosNombre.toLowerCase()))
                        );
                        
                        if (clasesFiltradas.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                                {clases.length === 0
                                  ? 'No hay asignaciones registradas. Crea una nueva asignación.'
                                  : 'No hay asignaciones que coincidan con los filtros seleccionados.'
                                }
                              </TableCell>
                            </TableRow>
                          );
                        }
                        
                        return clasesFiltradas.map((clase) => (
                          <TableRow key={clase.id}>
                            <TableCell className="font-medium text-gray-900">{clase.nombre}</TableCell>
                            <TableCell className="text-gray-900">{clase.grado}</TableCell>
                            <TableCell className="text-gray-900">{clase.seccion}</TableCell>
                            <TableCell>
                              <Select
                                value={clase.profesor}
                                onValueChange={async (nuevoProfesor) => {
                                  const todasLasClases = await fetchClases();
                                  const idx = todasLasClases.findIndex(c => c.id === clase.id);
                                  if (idx >= 0) {
                                    todasLasClases[idx].profesor = nuevoProfesor;
                                    await saveClases(todasLasClases);
                                    // Actualizar el estado directamente
                                    setClases(todasLasClases);
                                    setRefreshKey(prev => prev + 1);
                                    toast.success('Profesor actualizado exitosamente');
                                  }
                                }}
                              >
                                <SelectTrigger className="w-[180px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {tutores.map((profesor) => (
                                    <SelectItem key={profesor.id} value={profesor.nombre}>{profesor.nombre}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-gray-900">
                              {clase.dias && Array.isArray(clase.dias) && clase.dias.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {clase.dias.map((dia, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs capitalize bg-blue-100 text-blue-800">
                                      {dia}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">Sin días</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  if (confirm(`¿Estás seguro de eliminar la asignación de ${clase.nombre} (${clase.grado} ${clase.seccion})?`)) {
                                    const todasLasClases = await fetchClases();
                                    const clasesActualizadas = todasLasClases.filter(c => c.id !== clase.id);
                                    await saveClases(clasesActualizadas);
                                    // Actualizar el estado directamente
                                    setClases(clasesActualizadas);
                                    setRefreshKey(prev => prev + 1);
                                    toast.success('Asignación eliminada exitosamente');
                                  }
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                              >
                                <Trash2 className="h-3 w-3" />
                                Eliminar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ));
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Diálogo de información cuando hay estudiantes */}
      {mostrarInfoEstudiantes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                No se puede eliminar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                {infoMensaje}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Para poder eliminar {infoTipo === 'grado' ? 'el grado' : 'la sección'} <strong>"{infoNombre}"</strong>, primero debes reasignar o eliminar los estudiantes asociados.
              </p>
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    setMostrarInfoEstudiantes(false);
                    setInfoTipo(null);
                    setInfoNombre('');
                    setInfoMensaje('');
                  }}
                >
                  Entendido
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
