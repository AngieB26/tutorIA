'use client';

  // Limpiar formulario de incidencia al entrar (hook siempre al tope, después de los useState)
  // (El hook debe ir dentro del componente, no fuera)


import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  fetchTutores,
  fetchEstudiantes,
  fetchClases,
  addRegistroAsistenciaClase,
  findRegistroAsistencia,
  getGrados,
  getSecciones,
  marcarEstudianteAtendido,
  getPrellenadoIncidencia,
  deletePrellenadoIncidencia,
  getAsistenciaClasesByFilters,
} from '@/lib/api';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/Combobox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

import { Calendar, FileText, Upload, AlertTriangle, Bell } from 'lucide-react';
import { validateRequired, validateDateNotFuture, validateDescription, validateAsistenciaEntries, validateEmail, validatePhone } from '@/lib/validation';
import { EstudianteInfo } from '@/lib/types';

/* =====================================================
   COMPONENTE
===================================================== */
export default function ProfesorPage() {
  // Buscador de estudiantes
  const [estudianteSearch, setEstudianteSearch] = useState('');

  // Helper function para obtener el nombre completo desde nombres y apellidos
  const getNombreCompleto = (estudiante: EstudianteInfo): string => {
    if (estudiante.nombres && estudiante.apellidos) {
      return `${estudiante.nombres} ${estudiante.apellidos}`.trim();
    }
    // Fallback: si no hay nombres y apellidos, intentar usar nombre (si existe en runtime)
    const nombre = (estudiante as any).nombre;
    if (nombre) return nombre;
    return estudiante.nombres || estudiante.apellidos || 'Sin nombre';
  };
  /* ---------- navegación ---------- */
  const [viewMode, setViewMode] =
    useState<'inicio' | 'asistencia' | 'incidencia'>('inicio');

  // Cargar prellenado de incidencia al entrar (hook después de declarar viewMode)
  useEffect(() => {
    const loadPrellenado = async () => {
      if (viewMode === 'incidencia' && !incEstudiante) {
        // Buscar prellenado para cualquier estudiante (el más reciente)
        // Nota: Necesitamos buscar por estudiante, pero no sabemos cuál es
        // Por ahora, solo limpiamos si no hay estudiante seleccionado
        setIncProfesor('');
        setIncEstudiante('');
        setIncTipo('');
        setIncGravedad('');
        setIncDerivar('');
        setIncDescripcion('');
        setIncArchivos([]);
      }
    };
    loadPrellenado();
  }, [viewMode]);

  // Limpiar formulario de asistencia al entrar desde el panel
  useEffect(() => {
    if (viewMode === 'asistencia') {
      // Limpiar todos los campos del formulario de asistencia
      setProfesor('');
      setGrado('');
      setSeccion('');
      setCurso('');
      setLugar('');
      setAsistencia({});
      setRegistroId(null);
      // Resetear fecha a hoy
      setFecha(getTodayStr());
    }
  }, [viewMode]);

  const [loading, setLoading] = useState(false);


  // ---------- asistencia (states SIEMPRE ARRIBA) ----------
  const [profesor, setProfesor] = useState('');
  const [grado, setGrado] = useState('');
  const [seccion, setSeccion] = useState('');
  const [curso, setCurso] = useState('');
  // Siempre inicializa la fecha con la fecha de hoy del sistema
  function getTodayStr() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const [fecha, setFecha] = useState(getTodayStr());
  const [lugar, setLugar] = useState('');

  // Estado de asistencia por estudiante
  const [asistencia, setAsistencia] = useState<Record<string, 'presente' | 'tardanza' | 'ausente'>>({});
  const [registroId, setRegistroId] = useState<string | null>(null);

  /* ---------- datos ---------- */
  const [profesores, setProfesores] = useState<string[]>([]);
  const [estudiantes, setEstudiantes] = useState<any[]>([]);
  const [clases, setClases] = useState<any[]>([]);
  const [grados, setGrados] = useState<string[]>([]);
  const [secciones, setSecciones] = useState<string[]>([]);

  // Determinar si la fecha seleccionada es hoy (robusto, ignora zona horaria y ceros a la izquierda)
  const isToday = (() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    return fecha === todayStr;
  })();

  // Buscar claseId y periodo para el curso seleccionado
  const claseObj = clases.find(
    c => c.grado === grado && c.seccion === seccion && c.nombre === curso
  );
  const claseId = claseObj?.id || '';
  // Para simplicidad, periodo = 1 (puedes ajustar si hay varios periodos)
  const periodo = 1;

  // Cargar profesores, estudiantes, clases, grados y secciones desde la base de datos
  useEffect(() => {
    const loadData = async () => {
      try {
        const tutoresData = await fetchTutores();
        const estudiantesData = await fetchEstudiantes();
        const clasesData = await fetchClases();
        const gradosData = await getGrados();
        const seccionesData = await getSecciones();
        setProfesores(tutoresData.map(t => t.nombre) || []);
        setEstudiantes(estudiantesData || []);
        setClases(clasesData || []);
        setGrados(gradosData || []);
        setSecciones(seccionesData || []);
      } catch (error) {
        console.error('Error cargando datos:', error);
        setProfesores([]);
        setEstudiantes([]);
        setClases([]);
        setGrados([]);
        setSecciones([]);
      }
    };
    loadData();
  }, []);

  // Cargar notificaciones de asistencia (estudiantes con múltiples tardanzas/ausencias)
  useEffect(() => {
    const cargarNotificaciones = async () => {
      if (profesores.length === 0 || estudiantes.length === 0) return;
      
      setCargandoNotificaciones(true);
      try {
        // Calcular fecha de hace 30 días
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - 30);
        const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];
        
        // Obtener todas las asistencias de los últimos 30 días
        const registrosAsistencia = await getAsistenciaClasesByFilters({
          fecha: fechaLimiteStr
        });

        // Contar tardanzas y ausencias por estudiante
        const conteoTardanzas: Record<string, number> = {};
        const conteoAusencias: Record<string, number> = {};
        const estudianteInfo: Record<string, { grado: string; seccion: string }> = {};

        // Mapear información de estudiantes
        estudiantes.forEach(est => {
          const nombreEst = getNombreCompleto(est);
          estudianteInfo[nombreEst] = {
            grado: est.grado || '',
            seccion: est.seccion || ''
          };
        });

        // Contar en todos los registros
        registrosAsistencia.forEach((registro: any) => {
          if (registro.entries) {
            Object.entries(registro.entries).forEach(([nombreEstudiante, estado]: [string, any]) => {
              if (estado === 'tardanza') {
                conteoTardanzas[nombreEstudiante] = (conteoTardanzas[nombreEstudiante] || 0) + 1;
              } else if (estado === 'ausente') {
                conteoAusencias[nombreEstudiante] = (conteoAusencias[nombreEstudiante] || 0) + 1;
              }
            });
          }
        });

        // Crear notificaciones para estudiantes que superan los límites
        const notificaciones: Array<{
          estudiante: string;
          tipo: 'tardanza' | 'ausencia';
          cantidad: number;
          grado: string;
          seccion: string;
        }> = [];

        // Notificaciones por tardanzas
        Object.entries(conteoTardanzas).forEach(([nombre, cantidad]) => {
          if (cantidad >= LIMITE_TARDANZAS) {
            const info = estudianteInfo[nombre];
            if (info) {
              notificaciones.push({
                estudiante: nombre,
                tipo: 'tardanza',
                cantidad,
                grado: info.grado,
                seccion: info.seccion
              });
            }
          }
        });

        // Notificaciones por ausencias
        Object.entries(conteoAusencias).forEach(([nombre, cantidad]) => {
          if (cantidad >= LIMITE_AUSENCIAS) {
            const info = estudianteInfo[nombre];
            if (info) {
              notificaciones.push({
                estudiante: nombre,
                tipo: 'ausencia',
                cantidad,
                grado: info.grado,
                seccion: info.seccion
              });
            }
          }
        });

        setNotificacionesAsistencia(notificaciones);
      } catch (error) {
        console.error('Error cargando notificaciones de asistencia:', error);
        setNotificacionesAsistencia([]);
      } finally {
        setCargandoNotificaciones(false);
      }
    };

    cargarNotificaciones();
  }, [profesores, estudiantes]);


  // Escuchar evento para abrir incidencia desde notificación del navbar
  useEffect(() => {
    const handleAbrirIncidencia = async (event: CustomEvent) => {
      const estudianteNombre = event.detail?.estudiante;
      
      if (estudianteNombre) {
        // Buscar prellenado en la base de datos
        const prellenado = await getPrellenadoIncidencia(estudianteNombre);
        
        const tipoPrellenado = event.detail?.tipo || prellenado?.tipo || 'asistencia';
        const gravedadPrellenada = event.detail?.gravedad || prellenado?.gravedad || 'moderada';
        
        // Primero establecer los valores (SIN prellenar profesor), luego cambiar el viewMode
        setIncProfesor(prellenado?.profesor || ''); // Profesor puede venir del prellenado
        setIncEstudiante(estudianteNombre);
        setIncTipo(tipoPrellenado);
        setIncGravedad(gravedadPrellenada);
        setIncDerivar(''); // Debe seleccionarse obligatoriamente
        setIncDescripcion(`Estudiante con problemas de asistencia.`);
        
        // Cambiar viewMode después de un pequeño delay para asegurar que los valores se establezcan primero
        setTimeout(() => {
          setViewMode('incidencia');
        }, 50);
        
        // Eliminar prellenado después de usarlo
        if (prellenado) {
          await deletePrellenadoIncidencia(estudianteNombre);
        }
      }
    };

    const handleAbrirIncidenciaWrapper = (e: Event) => {
      handleAbrirIncidencia(e as CustomEvent);
    };

    window.addEventListener('abrirIncidenciaDesdeNotificacion' as any, handleAbrirIncidenciaWrapper);
    
    return () => {
      window.removeEventListener('abrirIncidenciaDesdeNotificacion' as any, handleAbrirIncidenciaWrapper);
    };
  }, [profesor, viewMode]);

  // Cargar asistencia existente al cambiar filtros
  useEffect(() => {
    const loadAsistencia = async () => {
    if (profesor && grado && seccion && curso && fecha && claseId) {
        try {
          const registro = await findRegistroAsistencia(fecha, claseId, periodo);
      if (registro) {
        setAsistencia(registro.entries || {});
        setLugar(registro.lugar || '');
        setRegistroId(registro.id);
      } else {
            setAsistencia({});
            setLugar('');
            setRegistroId(null);
          }
        } catch (error) {
          console.error('Error cargando asistencia:', error);
        setAsistencia({});
        setLugar('');
        setRegistroId(null);
      }
    } else {
      setAsistencia({});
      setLugar('');
      setRegistroId(null);
    }
    };
    loadAsistencia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profesor, grado, seccion, curso, fecha, claseId, periodo]);

  /* ---------- incidencia ---------- */
  const [incProfesor, setIncProfesor] = useState('');
  const [incEstudiante, setIncEstudiante] = useState('');
  const [incEstudianteId, setIncEstudianteId] = useState<string | null>(null); // ID del estudiante seleccionado
  const [incTipo, setIncTipo] = useState('');
  const [incGravedad, setIncGravedad] = useState('');
  const [incDerivar, setIncDerivar] = useState('');
  const [incDescripcion, setIncDescripcion] = useState('');
  // Archivos multimedia de incidencia
  const [incArchivos, setIncArchivos] = useState<File[]>([]);
  // Estado para mensaje de confirmación de incidencia
  const [incidenciaConfirm, setIncidenciaConfirm] = useState(false);

  // Estados para notificaciones de asistencia
  const [notificacionesAsistencia, setNotificacionesAsistencia] = useState<Array<{
    estudiante: string;
    tipo: 'tardanza' | 'ausencia';
    cantidad: number;
    grado: string;
    seccion: string;
  }>>([]);
  const [cargandoNotificaciones, setCargandoNotificaciones] = useState(false);

  // Límites configurados (puedes ajustar estos valores)
  const LIMITE_TARDANZAS = 3;
  const LIMITE_AUSENCIAS = 5;


  // Filtrar clases del profesor seleccionado
  const clasesDelProfesor = profesor 
    ? clases.filter(c => c.profesor === profesor)
    : [];

  // Filtrar grados únicos disponibles según las clases del profesor
  const gradosDisponibles = profesor
    ? Array.from(new Set(clasesDelProfesor.map(c => c.grado))).sort()
    : [];

  // Filtrar secciones únicas disponibles según el profesor y grado seleccionado
  const seccionesDisponibles = profesor && grado
    ? Array.from(
        new Set(clasesDelProfesor.filter(c => c.grado === grado).map(c => c.seccion))
      ).sort()
    : [];

  // Filtrar cursos únicos disponibles según el profesor, grado y sección seleccionados
  const cursosDisponibles = profesor && grado && seccion
    ? Array.from(
    new Set(
          clasesDelProfesor
        .filter(c => c.grado === grado && c.seccion === seccion)
        .map(c => c.nombre)
    )
      ).sort()
    : [];

  const estudiantesClase = estudiantes.filter(
    e => e.grado === grado && e.seccion === seccion
  );

  /* ---------- submit ---------- */

  // Guardar asistencia
  const handleSubmit = async () => {
    // Validaciones
    const profesorValidation = validateRequired(profesor, 'El profesor');
    if (!profesorValidation.isValid) {
      toast.error(profesorValidation.error);
      return;
    }

    const gradoValidation = validateRequired(grado, 'El grado');
    if (!gradoValidation.isValid) {
      toast.error(gradoValidation.error);
      return;
    }

    const seccionValidation = validateRequired(seccion, 'La sección');
    if (!seccionValidation.isValid) {
      toast.error(seccionValidation.error);
      return;
    }

    const cursoValidation = validateRequired(curso, 'El curso');
    if (!cursoValidation.isValid) {
      toast.error(cursoValidation.error);
      return;
    }

    const fechaValidation = validateDateNotFuture(fecha, 'La fecha');
    if (!fechaValidation.isValid) {
      toast.error(fechaValidation.error);
      return;
    }

    const asistenciaValidation = validateAsistenciaEntries(asistencia);
    if (!asistenciaValidation.isValid) {
      toast.error(asistenciaValidation.error);
      return;
    }

    if (!claseId) {
      toast.error('No se encontró la clase seleccionada');
      return;
    }

    setLoading(true);
    try {
    const diaSemana = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'][new Date(fecha + 'T00:00:00').getDay()] as any;
    const registro = {
      fecha,
      dia: diaSemana,
      claseId,
      grado,
      seccion,
      profesor,
      periodo,
      lugar,
      entries: asistencia,
    };
    // Detectar si ya existe ANTES de guardar (más robusto que usar registroId, que puede resetearse)
      const registroExistente = await findRegistroAsistencia(fecha, claseId, periodo);
      const yaExiste = !!registroExistente;
      await addRegistroAsistenciaClase(registro);
    // Disparar evento para actualizar notificaciones en el navbar
    window.dispatchEvent(new CustomEvent('asistenciaActualizada'));
      setLoading(false);
      setViewMode('inicio');
      alert(yaExiste ? 'Asistencia actualizada correctamente' : 'Registro guardado correctamente');
    } catch (error) {
      console.error('Error guardando asistencia:', error);
      setLoading(false);
      alert('Error al guardar la asistencia. Por favor, intenta nuevamente.');
    }
  };

  // Función para guardar incidencia en la base de datos
  async function saveIncidenciaLocal(inc: {
    profesor: string;
    estudiante: string;
    estudianteId?: string | null;
    tipo: string;
    gravedad: string;
    derivar: string;
    descripcion: string;
    fecha: string;
    archivos: { name: string; type: string; size: number }[];
  }): Promise<boolean> {
    // Validaciones
    const profesorValidation = validateRequired(inc.profesor, 'El profesor');
    if (!profesorValidation.isValid) {
      toast.error(profesorValidation.error);
      return false;
    }

    const estudianteValidation = validateRequired(inc.estudiante, 'El estudiante');
    if (!estudianteValidation.isValid) {
      toast.error(estudianteValidation.error);
      return false;
    }

    const tipoValidation = validateRequired(inc.tipo, 'El tipo de incidencia');
    if (!tipoValidation.isValid) {
      toast.error(tipoValidation.error);
      return false;
    }

    const gravedadValidation = validateRequired(inc.gravedad, 'La gravedad');
    if (!gravedadValidation.isValid) {
      toast.error(gravedadValidation.error);
      return false;
    }

    const descripcionValidation = validateDescription(inc.descripcion, 10);
    if (!descripcionValidation.isValid) {
      toast.error(descripcionValidation.error);
      return false;
    }

    const fechaValidation = validateDateNotFuture(inc.fecha, 'La fecha');
    if (!fechaValidation.isValid) {
      toast.error(fechaValidation.error);
      return false;
    }

    // Guardar incidencia en la base de datos usando la API
    try {
      // Importar addIncidencia de la API (guarda en base de datos)
      const { addIncidencia } = await import('@/lib/api');
      // Guardar en la base de datos
      // Si es una incidencia positiva, el estado debe ser 'Resuelta' ya que no requiere seguimiento
      const estadoIncidencia = inc.tipo === 'positivo' ? 'Resuelta' : 'Pendiente';
      const resuelta = inc.tipo === 'positivo' ? true : false;
      
      const incidenciaGuardada = await addIncidencia({
        studentName: inc.estudiante,
        studentId: incEstudianteId || undefined, // Incluir ID si está disponible
        tipo: inc.tipo,
        gravedad: inc.gravedad,
        descripcion: inc.descripcion,
        fecha: inc.fecha.split('T')[0],
        profesor: inc.profesor,
        derivacion: inc.derivar && inc.derivar !== '' && inc.derivar !== 'ninguna' ? inc.derivar : undefined,
        resuelta: resuelta,
        estado: estadoIncidencia,
      });
      // Verificar que se guardó correctamente
      if (incidenciaGuardada && incidenciaGuardada.id) {
        console.log('✅ Incidencia guardada con ID:', incidenciaGuardada.id);
        
        // Marcar al estudiante como atendido en notificaciones cuando se registra una incidencia
        // (Esto solo afecta las notificaciones de asistencia del profesor, NO las del director)
        if (typeof window !== 'undefined') {
          try {
            const hoy = new Date().toISOString().split('T')[0];
            // Usar el profesor de la incidencia
            const profesorParaMarcar = inc.profesor;
            if (profesorParaMarcar) {
              marcarEstudianteAtendido(inc.estudiante, hoy, profesorParaMarcar);
              console.log('✅ Estudiante marcado como atendido en notificaciones:', {
                estudiante: inc.estudiante,
                profesor: profesorParaMarcar,
                fecha: hoy
              });
              
              // Disparar evento para actualizar notificaciones en el navbar
              // Usar setTimeout para asegurar que el storage se haya actualizado
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('asistenciaActualizada'));
                console.log('✅ Evento asistenciaActualizada disparado para actualizar notificaciones');
              }, 150);
            } else {
              console.warn('⚠️ No se pudo determinar el profesor para marcar estudiante como atendido');
            }
          } catch (e) {
            console.error('❌ Error al marcar estudiante como atendido:', e);
          }
        }
        
        // NO marcar la incidencia como vista automáticamente
        // Las nuevas incidencias deben aparecer en las notificaciones del director
        // Solo se marcarán como vistas cuando el director las vea
        if (typeof window !== 'undefined') {
          // Disparar evento para que el director actualice sus notificaciones
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('incidenciaRegistrada', {
              detail: { id: incidenciaGuardada.id }
            }));
            console.log('✅ Evento incidenciaRegistrada disparado con ID:', incidenciaGuardada.id);
            console.log('📢 Nueva incidencia disponible para notificaciones del director');
          }, 100);
        }
        return true; // Guardado exitoso
      } else {
        console.error('❌ Error: La incidencia no se guardó correctamente o no tiene ID');
        console.error('Incidencia guardada:', incidenciaGuardada);
      }
      return false; // Error al guardar
    } catch (e) {
      let errorMsg = 'Error al guardar la incidencia';
      if (e instanceof Error) {
        errorMsg += ': ' + e.message;
      } else if (typeof e === 'string') {
        errorMsg += ': ' + e;
      } else if (e && typeof e === 'object' && 'message' in e) {
        errorMsg += ': ' + (e as any).message;
      }
      alert(errorMsg);
      return false; // Error al guardar
    }
  }

  /* =====================================================
     VISTA INICIO
  ===================================================== */
  if (viewMode === 'inicio') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-12 px-4 sm:py-16">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-3 text-gray-900">
              Dashboard del Profesor
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Selecciona el tipo de registro que deseas realizar
            </p>
          </div>

          {/* Notificaciones de Asistencia */}
          {notificacionesAsistencia.length > 0 && (
            <Card className="mb-8 border-orange-200 bg-orange-50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-lg text-orange-900">
                    Estudiantes que Requieren Atención
                  </CardTitle>
                </div>
                <p className="text-sm text-orange-700 mt-1">
                  Los siguientes estudiantes han acumulado múltiples tardanzas o ausencias y pueden requerir una incidencia.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {notificacionesAsistencia.map((notif, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200 hover:border-orange-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="font-semibold text-gray-900">{notif.estudiante}</p>
                          <p className="text-sm text-gray-600">
                            {notif.grado} - {notif.seccion} • {notif.cantidad} {notif.tipo === 'tardanza' ? 'tardanza(s)' : 'ausencia(s)'} en los últimos 30 días
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-orange-300 text-orange-700 hover:bg-orange-100"
                        onClick={() => {
                          setIncProfesor(profesores[0] || '');
                          setIncEstudiante(notif.estudiante);
                          setIncTipo(notif.tipo === 'tardanza' ? 'tardanza' : 'asistencia');
                          setIncGravedad(notif.cantidad >= (notif.tipo === 'tardanza' ? LIMITE_TARDANZAS + 2 : LIMITE_AUSENCIAS + 2) ? 'grave' : 'moderada');
                          setIncDerivar('');
                          setIncDescripcion(
                            `Estudiante con ${notif.cantidad} ${notif.tipo === 'tardanza' ? 'tardanza(s)' : 'ausencia(s)'} en los últimos 30 días. ${notif.tipo === 'tardanza' ? 'Llega tarde frecuentemente a clase.' : 'Ha faltado a clase en múltiples ocasiones.'}`
                          );
                          setIncArchivos([]);
                          setViewMode('incidencia');
                        }}
                      >
                        Registrar Incidencia
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cards Grid */}
          <div className="grid md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
            {/* Card: Tomar Asistencia */}
            <Card
              className="cursor-pointer group relative overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-white"
              onClick={() => setViewMode('asistencia')}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="text-center pb-4 relative z-10">
                <div className="mx-auto mb-4 p-4 bg-blue-50 rounded-full w-20 h-20 flex items-center justify-center group-hover:bg-blue-100 transition-colors duration-300">
                  <Calendar className="h-10 w-10 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                  Tomar Asistencia
                </CardTitle>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Registra la asistencia diaria de tus estudiantes de forma rápida y eficiente.
                </p>
              </CardHeader>
              <CardContent className="pt-2 pb-6 relative z-10">
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-base shadow-lg hover:shadow-xl transition-all duration-300"
                  size="lg"
                >
                  Ingresar
                </Button>
              </CardContent>
            </Card>

            {/* Card: Registrar Incidencia */}
            <Card
              className="cursor-pointer group relative overflow-hidden border-2 border-gray-200 hover:border-indigo-500 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 bg-white"
              onClick={() => {
                // Limpiar formulario antes de cambiar a vista de incidencia
                setIncProfesor('');
                setIncEstudiante('');
                setIncTipo('');
                setIncGravedad('');
                setIncDerivar('');
                setIncDescripcion('');
                setIncArchivos([]);
                setViewMode('incidencia');
              }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="text-center pb-4 relative z-10">
                <div className="mx-auto mb-4 p-4 bg-indigo-50 rounded-full w-20 h-20 flex items-center justify-center group-hover:bg-indigo-100 transition-colors duration-300">
                  <FileText className="h-10 w-10 text-indigo-600 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                  Registrar Incidencia
                </CardTitle>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Reporta incidencias académicas o de conducta de manera detallada y organizada.
                </p>
              </CardHeader>
              <CardContent className="pt-2 pb-6 relative z-10">
                <Button 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-6 text-base shadow-lg hover:shadow-xl transition-all duration-300"
                  size="lg"
                >
                  Ingresar
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     FORMULARIO ASISTENCIA
  ===================================================== */
  if (viewMode === 'asistencia') {
    return (
      <div className="min-h-screen bg-gray-50 py-4 sm:py-10 px-3 sm:px-4">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Tomar Asistencia</CardTitle>
              <p className="text-xs sm:text-sm text-gray-500">
                Selecciona primero el profesor para habilitar el resto.
              </p>
            </CardHeader>

            <CardContent className="space-y-4 sm:space-y-6">
              {/* filtros */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-800">Profesor</label>
                  <Combobox
                    options={profesores}
                    value={profesor}
                    onChange={(value) => {
                      setProfesor(value);
                      // Limpiar grado, sección y curso cuando cambia el profesor
                      setGrado('');
                      setSeccion('');
                      setCurso('');
                    }}
                    placeholder="Buscar o seleccionar profesor"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-800">Grado</label>
                  <Select
                    value={grado}
                    onValueChange={v => {
                      setGrado(v);
                      setSeccion('');
                      setCurso('');
                    }}
                  >
                    <SelectTrigger disabled={!profesor}>
                      <SelectValue placeholder="Selecciona el grado" />
                    </SelectTrigger>
                    <SelectContent>
                      {gradosDisponibles.map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-800">Sección</label>
                  <Select
                    value={seccion}
                    onValueChange={v => {
                      setSeccion(v);
                      setCurso('');
                    }}
                  >
                    <SelectTrigger disabled={!profesor || !grado}>
                      <SelectValue placeholder="Selecciona la sección" />
                    </SelectTrigger>
                    <SelectContent>
                      {seccionesDisponibles.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-800">Curso</label>
                  <Select value={curso} onValueChange={setCurso}>
                    <SelectTrigger disabled={!profesor || !grado || !seccion}>
                      <SelectValue placeholder="Selecciona el curso" />
                    </SelectTrigger>
                    <SelectContent>
                      {cursosDisponibles.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-800">Lugar</label>
                  <Input placeholder="Ej: Aula 101" value={lugar} onChange={e => setLugar(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-800">Fecha</label>
                  <div className="flex items-center gap-2">
                    <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
                    <span className="text-xs text-gray-500 font-semibold">
                      {fecha ? new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long' }) : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* estudiantes */}
              <div className="pt-4" style={{ borderTop: '2px solid #3b82f6' }}>
                {/* Buscador alineado izquierda con título */}
                <div className="flex items-center mb-2 gap-4">
                  <span className="font-semibold text-gray-700 text-sm min-w-fit">Buscar estudiante:</span>
                  <input
                    type="text"
                    placeholder="Nombre..."
                    className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={estudianteSearch || ''}
                    onChange={e => setEstudianteSearch(e.target.value)}
                    style={{ maxWidth: 220 }}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-4 font-semibold text-gray-600 text-xs w-full mb-1">
                    <span className="text-xs">Estudiante</span>
                    <span className="text-center text-xs">Presente</span>
                    <span className="text-center text-xs">Tardanza</span>
                    <span className="text-center text-xs">Ausente</span>
                  </div>
                  {!profesor || !grado || !seccion || !curso ? (
                    <p className="text-center text-gray-500 py-6">
                      Selecciona profesor, grado, sección y curso.
                    </p>
                  ) : (
                    estudiantesClase
                      .filter(est =>
                        !estudianteSearch || getNombreCompleto(est).toLowerCase().includes(estudianteSearch.toLowerCase())
                      )
                      .map((est, idx, arr) => {
                        const nombreEst = getNombreCompleto(est);
                        const estado = asistencia[nombreEst] || '';
                        return (
                          <div
                            key={nombreEst}
                            className={`grid grid-cols-4 items-center py-2 ${idx !== arr.length - 1 ? 'border-b border-gray-200' : ''}`}
                          >
                            <span className="truncate pr-2 text-xs text-gray-700">{nombreEst}</span>
                            <div className="flex justify-center">
                              <input
                                type="radio"
                                id={`presente-${nombreEst}`}
                                name={`a-${nombreEst}`}
                                className="hidden peer/presente"
                                checked={estado === 'presente'}
                                disabled={!isToday}
                                onChange={() => setAsistencia(a => ({ ...a, [nombreEst]: 'presente' }))}
                              />
                              <label htmlFor={`presente-${nombreEst}`} className={`cursor-pointer px-4 py-1 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-blue-100 transition peer-checked/presente:bg-blue-600 peer-checked/presente:text-white peer-checked/presente:border-blue-600 font-medium shadow-sm text-xs ${!isToday ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                Presente
                              </label>
                            </div>
                            <div className="flex justify-center">
                              <input
                                type="radio"
                                id={`tardanza-${nombreEst}`}
                                name={`a-${nombreEst}`}
                                className="hidden peer/tardanza"
                                checked={estado === 'tardanza'}
                                disabled={!isToday}
                                onChange={() => setAsistencia(a => ({ ...a, [nombreEst]: 'tardanza' }))}
                              />
                              <label htmlFor={`tardanza-${nombreEst}`} className={`cursor-pointer px-4 py-1 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-yellow-100 transition peer-checked/tardanza:bg-yellow-400 peer-checked/tardanza:text-white peer-checked/tardanza:border-yellow-400 font-medium shadow-sm text-xs ${!isToday ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                Tardanza
                              </label>
                            </div>
                            <div className="flex justify-center">
                              <input
                                type="radio"
                                id={`ausente-${nombreEst}`}
                                name={`a-${nombreEst}`}
                                className="hidden peer/ausente"
                                checked={estado === 'ausente'}
                                disabled={!isToday}
                                onChange={() => setAsistencia(a => ({ ...a, [nombreEst]: 'ausente' }))}
                              />
                              <label htmlFor={`ausente-${nombreEst}`} className={`cursor-pointer px-4 py-1 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-red-100 transition peer-checked/ausente:bg-red-400 peer-checked/ausente:text-white peer-checked/ausente:border-red-400 font-medium shadow-sm text-xs ${!isToday ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                Ausente
                              </label>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Resetear formulario de asistencia
                    setProfesor('');
                    setGrado('');
                    setSeccion('');
                    setCurso('');
                    setFecha(getTodayStr());
                    setLugar('');
                    setAsistencia({});
                    setRegistroId(null);
                    setEstudianteSearch('');
                    setViewMode('inicio');
                  }}
                >
                  Volver
                </Button>
                <Button
                  className="bg-blue-600"
                  disabled={!profesor || !grado || !seccion || !curso || loading || !isToday}
                  onClick={handleSubmit}
                  title={!isToday ? 'Solo puedes registrar o editar asistencia del día actual' : ''}
                >
                  {registroId ? (isToday ? 'Actualizar Asistencia' : 'Ver Asistencia') : 'Guardar Asistencia'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  /* =====================================================
     FORMULARIO INCIDENCIA
  ===================================================== */
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Registrar Incidencia</CardTitle>
            <p className="text-gray-600 text-base mt-1 mb-2">
              Completa los datos para registrar una incidencia.
            </p>
          </CardHeader>
          <CardContent>
            <form 
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault(); // Prevenir envío por defecto del formulario
              }}
            >
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Profesor</label>
                  <Combobox
                    options={profesores}
                    value={incProfesor}
                    onChange={setIncProfesor}
                    placeholder="Buscar o seleccionar profesor"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Estudiante</label>
                  <Combobox
                    options={estudiantes.map(e => getNombreCompleto(e)).filter(n => n && n.trim() !== '')}
                    value={incEstudiante}
                    onChange={(nombre) => {
                      setIncEstudiante(nombre);
                      // Buscar el ID del estudiante cuando se selecciona
                      const estudianteSeleccionado = estudiantes.find(e => getNombreCompleto(e) === nombre);
                      setIncEstudianteId(estudianteSeleccionado?.id || null);
                    }}
                    placeholder="Buscar o seleccionar estudiante"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Gravedad</label>
                  <Select value={incGravedad} onValueChange={setIncGravedad} disabled={!incProfesor || !incEstudiante}>
                    <SelectTrigger disabled={!incProfesor || !incEstudiante}>
                      <SelectValue placeholder="Selecciona la gravedad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leve">Leve</SelectItem>
                      <SelectItem value="moderada">Moderada</SelectItem>
                      <SelectItem value="grave">Grave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Tipo</label>
                  <Select value={incTipo} onValueChange={setIncTipo} disabled={!incProfesor || !incEstudiante}>
                    <SelectTrigger disabled={!incProfesor || !incEstudiante}>
                      <SelectValue placeholder="Selecciona el tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conducta">Conducta</SelectItem>
                      <SelectItem value="academica">Académica</SelectItem>
                      <SelectItem value="asistencia">Asistencia</SelectItem>
                      <SelectItem value="positivo">Positivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-800 mb-1">
                    Derivar a <span className="text-red-500">*</span>
                  </label>
                  <Select value={incDerivar} onValueChange={setIncDerivar} disabled={!incProfesor || !incEstudiante}>
                    <SelectTrigger disabled={!incProfesor || !incEstudiante}>
                      <SelectValue placeholder="Selecciona a quién derivar (obligatorio)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="director">Director</SelectItem>
                      <SelectItem value="psicologia">Psicología</SelectItem>
                      <SelectItem value="enfermeria">Enfermería</SelectItem>
                      <SelectItem value="coordinacion">Coordinación</SelectItem>
                      <SelectItem value="orientacion">Orientación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-800 mb-1">
                    Descripción
                    <span className="text-xs text-gray-500 font-normal ml-2">(mínimo 10 caracteres)</span>
                  </label>
                  <Textarea
                    placeholder="Describe brevemente la incidencia..."
                    value={incDescripcion}
                    onChange={e => setIncDescripcion(e.target.value)}
                    disabled={!incProfesor || !incEstudiante}
                  />
                  {incDescripcion.length > 0 && (
                    <p className={`text-xs mt-1 ${incDescripcion.trim().length < 10 ? 'text-red-600' : 'text-gray-500'}`}>
                      {incDescripcion.trim().length} / 10 caracteres mínimo
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-800 mb-1">Fotos/Videos (Opcional)</label>
                  <div
                    className={`border-2 border-dashed border-indigo-300 rounded-lg p-6 text-center flex flex-col items-center ${!incProfesor || !incEstudiante ? 'opacity-60 pointer-events-none' : ''}`}
                    onClick={e => {
                      if (!incProfesor || !incEstudiante || incArchivos.length >= 10) return;
                      const input = document.getElementById('inc-upload-input') as HTMLInputElement | null;
                      if (input) input.click();
                    }}
                    onDragOver={e => {
                      e.preventDefault();
                      if (!incProfesor || !incEstudiante || incArchivos.length >= 10) return;
                      e.currentTarget.classList.add('ring-2', 'ring-indigo-400');
                    }}
                    onDragLeave={e => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('ring-2', 'ring-indigo-400');
                    }}
                    onDrop={e => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('ring-2', 'ring-indigo-400');
                      if (!incProfesor || !incEstudiante || incArchivos.length >= 10) return;
                      const files = Array.from(e.dataTransfer.files).filter(f =>
                        [
                          'image/jpeg',
                          'image/png',
                          'video/mp4',
                          'video/quicktime',
                        ].includes(f.type)
                      );
                      if (files.length > 0) {
                        setIncArchivos(prev => {
                          const total = prev.length + files.length;
                          if (total > 10) {
                            return [...prev, ...files.slice(0, 10 - prev.length)];
                          }
                          return [...prev, ...files];
                        });
                      }
                    }}
                    style={{ cursor: (!incProfesor || !incEstudiante || incArchivos.length >= 10) ? 'not-allowed' : 'pointer' }}
                  >
                    <Upload className="mx-auto mb-2 text-indigo-500 w-10 h-10" />
                    <p className="text-indigo-600 font-medium mb-1">
                      Arrastra o haz clic para subir
                    </p>
                    <p className="text-xs text-gray-500 mb-1">
                      Formatos permitidos: JPG, PNG, MP4, MOV. Máx 10 archivos.
                    </p>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,video/mp4,video/quicktime"
                      multiple
                      disabled={!incProfesor || !incEstudiante || incArchivos.length >= 10}
                      style={{ display: 'none' }}
                      id="inc-upload-input"
                      onChange={e => {
                        if (!e.target.files) return;
                        const files = Array.from(e.target.files);
                        setIncArchivos(prev => {
                          const total = prev.length + files.length;
                          if (total > 10) {
                            return [...prev, ...files.slice(0, 10 - prev.length)];
                          }
                          return [...prev, ...files];
                        });
                        e.target.value = '';
                      }}
                    />
                    {/* Previsualización de archivos */}
                    <div className="flex flex-wrap gap-3 mt-4 justify-center">
                      {incArchivos.length === 0 && (
                        <span className="text-xs text-gray-400">No se eligió ningún archivo</span>
                      )}
                      {incArchivos.map((file, idx) => (
                        <div key={idx} className="relative group border rounded p-2 bg-white shadow-sm flex flex-col items-center w-28">
                          {file.type.startsWith('image') ? (
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="w-20 h-20 object-cover rounded mb-1"
                            />
                          ) : file.type.startsWith('video') ? (
                            <video
                              src={URL.createObjectURL(file)}
                              className="w-20 h-20 object-cover rounded mb-1"
                              controls
                            />
                          ) : (
                            <span className="text-xs text-gray-500">Archivo</span>
                          )}
                          <span className="block text-xs truncate max-w-full" title={file.name}>{file.name}</span>
                          <button
                            type="button"
                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-80 hover:opacity-100"
                            title="Eliminar archivo"
                            onClick={e => {
                              e.stopPropagation();
                              setIncArchivos(archs => archs.filter((_, i) => i !== idx));
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => {
                    // Resetear formulario de incidencia
                    setIncProfesor('');
                    setIncEstudiante('');
                    setIncEstudianteId(null);
                    setIncTipo('');
                    setIncGravedad('');
                    setIncDerivar('');
                    setIncDescripcion('');
                    setIncArchivos([]);
                    setViewMode('inicio');
                  }}
                >
                  Volver
                </Button>
                <Button
                  type="button"
                  className="bg-indigo-600"
                  disabled={loading}
                  onClick={async (e) => {
                    e.preventDefault();
                    if (!incProfesor || !incEstudiante || !incTipo || !incGravedad || !incDescripcion) {
                      alert('Completa todos los campos obligatorios');
                      return;
                    }
                    if (!incDerivar || incDerivar === 'ninguna') {
                      alert('Debes seleccionar a quién derivar la incidencia');
                      return;
                    }
                    setLoading(true);
                    // Guardar incidencia en la base de datos
                    const incidencia = {
                      profesor: incProfesor,
                      estudiante: incEstudiante,
                      estudianteId: incEstudianteId, // Incluir ID del estudiante si está disponible
                      tipo: incTipo,
                      gravedad: incGravedad,
                      derivar: incDerivar,
                      descripcion: incDescripcion,
                      fecha: new Date().toISOString(),
                      archivos: incArchivos.map(f => ({ name: f.name, type: f.type, size: f.size })),
                    };
                    // Guardar incidencia - verificar que se guardó correctamente
                    const guardadoExitoso = await saveIncidenciaLocal(incidencia);
                    if (guardadoExitoso) {
                      setTimeout(() => {
                        setLoading(false);
                        // Reiniciar formulario de incidencia (solo los campos, los datos ya están guardados)
                        setIncProfesor('');
                        setIncEstudiante('');
                        setIncTipo('');
                        setIncGravedad('');
                        setIncDerivar('');
                        setIncDescripcion('');
                        setIncArchivos([]);
                        setIncidenciaConfirm(false);
                        // Volver al panel
                        setViewMode('inicio');
                        alert('Incidencia registrada correctamente');
                      }, 700);
                    } else {
                      setLoading(false);
                      alert('Error al guardar la incidencia. Por favor, intenta nuevamente.');
                    }
                  }}
                >
                  Registrar Incidencia
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}