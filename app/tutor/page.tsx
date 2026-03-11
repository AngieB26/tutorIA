'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Plus, Eye, AlertTriangle, ArrowRight, Users, Calendar, MapPin, User, X, ClipboardList } from 'lucide-react';
import { 
  addIncidencia, 
  fetchIncidencias, 
  getIncidenciasCompletasByStudent, 
  fetchEstudiantes, 
  fetchTutores, 
  getTutoresGradoSeccion, 
  getTutorGradoSeccion,
  getAsistenciaClasesByFilters 
} from '@/lib/api';
import { TipoIncidencia, Incidencia, TipoDerivacion, SubtipoConducta, SubtipoPositivo, EstudianteInfo, Gravedad } from '@/lib/types';
import { getTipoColor, getTipoLabel } from '@/lib/utils';

type ViewMode = 'lista' | 'asistencia' | 'incidencia';

export default function TutorPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('lista');
  const [selectedStudent, setSelectedStudent] = useState<EstudianteInfo | null>(null);

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
  const [seccionSeleccionada, setSeccionSeleccionada] = useState<{grado: string, seccion: string} | null>(null);
  const [busquedaTutor, setBusquedaTutor] = useState<string>('');
  const [filtroGradoSeccion, setFiltroGradoSeccion] = useState<string>('');
  const [filtroSeccionSeccion, setFiltroSeccionSeccion] = useState<string>('');
  const [busquedaEstudiante, setBusquedaEstudiante] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [iaResumenGeneral, setIaResumenGeneral] = useState<string>('');
  const [iaCargandoGeneral, setIaCargandoGeneral] = useState<boolean>(false);
  const resumenGeneralCargado = useRef<boolean>(false);
  
  const [formData, setFormData] = useState({
    grado: '',
    estudiante: '',
    tipo: '' as TipoIncidencia | '',
    subtipo: '' as SubtipoConducta | SubtipoPositivo | '',
    gravedad: 'moderada' as Gravedad,
    descripcion: '',
    fecha: new Date().toISOString().split('T')[0],
    tutor: '',
    lugar: '',
    derivacion: '' as TipoDerivacion | '',
  });

  const [estudiantes, setEstudiantes] = useState<EstudianteInfo[]>([]);
  const [tutores, setTutores] = useState<any[]>([]);
  const [asignacionesTutores, setAsignacionesTutores] = useState<any[]>([]);
  const gradosUnicos = [...new Set(estudiantes.map(e => e.grado))].sort();
  const seccionesUnicas = [...new Set(estudiantes.map(e => e.seccion))].sort();

  // Cargar estudiantes, tutores y asignaciones
  useEffect(() => {
    const loadData = async () => {
      try {
        const estudiantesData = await fetchEstudiantes();
        const tutoresData = await fetchTutores();
        const asignacionesData = await getTutoresGradoSeccion();
        setEstudiantes(estudiantesData);
        setTutores(tutoresData);
        setAsignacionesTutores(asignacionesData);
      } catch (error) {
        console.error('Error cargando datos:', error);
      }
    };
    loadData();
  }, []);

  // Obtener secciones asignadas con información del tutor y cantidad de estudiantes
  const seccionesAsignadas = asignacionesTutores.map(asignacion => {
    const tutor = tutores.find(t => t.id === asignacion.tutorId);
    const cantidadEstudiantes = estudiantes.filter(
      e => e.grado === asignacion.grado && e.seccion === asignacion.seccion
    ).length;
    
    return {
      tutorNombre: tutor?.nombre || 'Tutor no encontrado',
      tutorId: asignacion.tutorId,
      grado: asignacion.grado,
      seccion: asignacion.seccion,
      cantidadEstudiantes
    };
  }).filter(seccion => {
    // Filtrar por búsqueda de tutor
    if (busquedaTutor) {
      const busqueda = busquedaTutor.toLowerCase();
      if (!seccion.tutorNombre.toLowerCase().includes(busqueda)) {
        return false;
      }
    }
    
    // Filtrar por grado
    if (filtroGradoSeccion && filtroGradoSeccion !== 'all' && seccion.grado !== filtroGradoSeccion) {
      return false;
    }
    
    // Filtrar por sección
    if (filtroSeccionSeccion && filtroSeccionSeccion !== 'all' && seccion.seccion !== filtroSeccionSeccion) {
      return false;
    }
    
    return true;
  });

  // Filtrar estudiantes de la sección seleccionada (usar useMemo para evitar recreaciones)
  const estudiantesFiltrados = useMemo(() => {
    if (!seccionSeleccionada) return [];
    return estudiantes.filter(est => {
      const matchSeccion = est.grado === seccionSeleccionada.grado && 
                          est.seccion === seccionSeleccionada.seccion;
      const matchBusqueda = !busquedaEstudiante || 
                            getNombreCompleto(est).toLowerCase().includes(busquedaEstudiante.toLowerCase());
      return matchSeccion && matchBusqueda;
    });
  }, [estudiantes, seccionSeleccionada, busquedaEstudiante]);

  // Estado para tutor asignado
  const [tutorAsignado, setTutorAsignado] = useState<any>(null);
  const [estudiantesConEstado, setEstudiantesConEstado] = useState<any[]>([]);
  const esTutorDeLaSeccion = !!tutorAsignado;

  // Cargar tutor asignado cuando cambia la sección seleccionada
  useEffect(() => {
    const loadTutorAsignado = async () => {
      if (seccionSeleccionada) {
        try {
          const tutor = await getTutorGradoSeccion(seccionSeleccionada.grado, seccionSeleccionada.seccion);
          setTutorAsignado(tutor);
        } catch (error) {
          console.error('Error cargando tutor asignado:', error);
          setTutorAsignado(null);
        }
      } else {
        setTutorAsignado(null);
      }
    };
    loadTutorAsignado();
  }, [seccionSeleccionada]);

  // Cargar resumen de IA para toda la sección
  useEffect(() => {
    if (!esTutorDeLaSeccion || !seccionSeleccionada || estudiantesFiltrados.length === 0) {
      setIaResumenGeneral('');
      resumenGeneralCargado.current = false;
      return;
    }

    // Si ya se cargó para esta sección, no repetir
    if (resumenGeneralCargado.current) return;

    const loadResumenGeneral = async () => {
      setIaCargandoGeneral(true);
      try {
        console.log(`🔄 Cargando resumen general para la sección: ${seccionSeleccionada.grado} ${seccionSeleccionada.seccion}`);
        
        // Obtener todas las incidencias de todos los estudiantes en paralelo
        const todasLasIncidencias = await Promise.all(
          estudiantesFiltrados.map(async (est) => {
            const nombreEst = getNombreCompleto(est);
            try {
              const incidenciasEst = await fetchIncidencias({ studentName: nombreEst });
              return incidenciasEst.map(inc => ({ ...inc, studentName: nombreEst }));
            } catch (error) {
              console.error(`Error cargando incidencias para ${nombreEst}:`, error);
              return [];
            }
          })
        );

        const incidenciasAplanadas = todasLasIncidencias.flat();
        const incidenciasRecientes = incidenciasAplanadas.filter(inc => {
          const fechaInc = new Date(inc.fecha);
          const hace30Dias = new Date();
          hace30Dias.setDate(hace30Dias.getDate() - 30);
          return fechaInc >= hace30Dias;
        });

        console.log(`📊 Sección: ${incidenciasRecientes.length} incidencias totales en los últimos 30 días`);

        // Llamar a la API para generar un solo reporte para el salón
        const res = await fetch('/api/generate-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            estudiante: `Salón ${seccionSeleccionada.grado} ${seccionSeleccionada.seccion}`,
            incidencias: incidenciasRecientes
          })
        });

        if (!res.ok) throw new Error('Error al generar resumen general');

        const data = await res.json();
        setIaResumenGeneral(data.resumen || data.report || 'Sin análisis disponible para el salón.');
        resumenGeneralCargado.current = true;
      } catch (error) {
        console.error('❌ Error generando resumen general de IA:', error);
        setIaResumenGeneral('Error al generar el resumen general del salón.');
      } finally {
        setIaCargandoGeneral(false);
      }
    };

    loadResumenGeneral();
  }, [esTutorDeLaSeccion, seccionSeleccionada, estudiantesFiltrados.length]);

  // Estado para incidencias por estudiante (para calcular estados)
  const [incidenciasPorEstudiante, setIncidenciasPorEstudiante] = useState<Record<string, any[]>>({});

  // Cargar incidencias para calcular estados (solo cuando cambia la sección)
  useEffect(() => {
    const loadIncidencias = async () => {
      if (!seccionSeleccionada || estudiantesFiltrados.length === 0 || !esTutorDeLaSeccion) {
        setIncidenciasPorEstudiante({});
        return;
      }

      const incidenciasMap: Record<string, any[]> = {};
      await Promise.all(
        estudiantesFiltrados.map(async (est) => {
          try {
            const nombreEst = getNombreCompleto(est);
            const incidenciasEst = await fetchIncidencias({ studentName: nombreEst });
            const incidenciasRecientes = incidenciasEst.filter(inc => {
              const fechaInc = new Date(inc.fecha);
              const hace30Dias = new Date();
              hace30Dias.setDate(hace30Dias.getDate() - 30);
              return fechaInc >= hace30Dias;
            });
            incidenciasMap[nombreEst] = incidenciasRecientes;
          } catch (error) {
            const nombreEst = getNombreCompleto(est);
            console.error(`Error cargando incidencias para ${nombreEst}:`, error);
            incidenciasMap[nombreEst] = [];
          }
        })
      );
      setIncidenciasPorEstudiante(incidenciasMap);
    };

    loadIncidencias();
  }, [seccionSeleccionada?.grado || '', seccionSeleccionada?.seccion || '', estudiantesFiltrados.length, esTutorDeLaSeccion]);

  // Calcular estudiantes con estado (se actualiza cuando cambian iaResumenes, iaCargando o incidenciasPorEstudiante)
  useEffect(() => {
    if (!seccionSeleccionada || estudiantesFiltrados.length === 0) {
      setEstudiantesConEstado([]);
      return;
    }

    if (!esTutorDeLaSeccion) {
      setEstudiantesConEstado(estudiantesFiltrados.map(est => ({ ...est, estado: null, iaResumen: null, estaCargandoIA: false })));
      return;
    }

    const estudiantesConEstadoData = estudiantesFiltrados.map((est) => {
      const nombreEst = getNombreCompleto(est);
      const incidenciasRecientes = incidenciasPorEstudiante[nombreEst] || [];
      const estado = incidenciasRecientes.length === 0 
        ? 'normal' 
        : incidenciasRecientes.length <= 2 
          ? 'atencion' 
          : 'alerta';

      return {
        ...est,
        estado,
        iaResumen: null,
        estaCargandoIA: false
      };
    });

    setEstudiantesConEstado(estudiantesConEstadoData);
  }, [estudiantesFiltrados, seccionSeleccionada, esTutorDeLaSeccion, incidenciasPorEstudiante]);

  // Estados para resumen de datos
  const [resumenData, setResumenData] = useState<any>(null);

  // Cargar resumen de datos cuando cambia la sección
  useEffect(() => {
    const loadResumenData = async () => {
      if (!seccionSeleccionada || !esTutorDeLaSeccion) {
        setResumenData(null);
        return;
      }

      const totalEstudiantes = estudiantesFiltrados.length;
      
      // Calcular asistencia promedio
      const registrosAsistencia = await getAsistenciaClasesByFilters({
        grado: seccionSeleccionada.grado,
        seccion: seccionSeleccionada.seccion
      });
      
      let totalAsistencias = 0;
      let totalRegistros = 0;
      registrosAsistencia.forEach(reg => {
        Object.values(reg.entries).forEach(estado => {
          totalRegistros++;
          if (estado === 'presente') totalAsistencias++;
        });
      });
      const asistenciaPromedio = totalRegistros > 0 ? Math.round((totalAsistencias / totalRegistros) * 100) : 0;

      // Calcular incidencias activas (pendientes o en revisión)
      const todasIncidencias = await Promise.all(
        estudiantesFiltrados.map(est => fetchIncidencias({ studentName: getNombreCompleto(est) }))
      );
      const incidenciasActivas = todasIncidencias.flat().filter(inc => 
        inc.estado === 'Pendiente' || inc.estado === 'En revisión'
      );

      setResumenData({
        totalEstudiantes,
        asistenciaPromedio,
        incidenciasActivas: incidenciasActivas.length
      });
    };

    loadResumenData();
  }, [seccionSeleccionada?.grado || '', seccionSeleccionada?.seccion || '', estudiantesFiltrados.length, esTutorDeLaSeccion]);

  const handleRegistrarAsistencia = (estudiante: EstudianteInfo) => {
    setSelectedStudent(estudiante);
    setViewMode('asistencia');
    setFormData({
      ...formData,
      grado: estudiante.grado,
      estudiante: getNombreCompleto(estudiante),
      tipo: 'asistencia',
    });
  };

  const handleRegistrarIncidencia = (estudiante: EstudianteInfo) => {
    setSelectedStudent(estudiante);
    setViewMode('incidencia');
    setFormData({
      ...formData,
      grado: estudiante.grado,
      estudiante: getNombreCompleto(estudiante),
      tipo: '' as TipoIncidencia | '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.estudiante || !formData.tipo || !formData.descripcion || !formData.tutor || !formData.lugar) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    if ((formData.tipo === 'conducta' || formData.tipo === 'positivo') && !formData.subtipo) {
      alert('Por favor selecciona el subtipo de ' + (formData.tipo === 'conducta' ? 'conducta negativa' : 'comportamiento positivo'));
      return;
    }

    if (!formData.derivacion || formData.derivacion === 'ninguna') {
      alert('Debes seleccionar a quién derivar la incidencia');
      return;
    }

    setLoading(true);
    
    try {
      // Validar y preparar derivación
      // Ya validamos antes que derivacion no sea vacía ni 'ninguna'
      const derivacionStr: string = formData.derivacion || '';
      const derivacionValue: TipoDerivacion | undefined = 
        derivacionStr && derivacionStr !== '' && derivacionStr !== 'ninguna'
          ? (derivacionStr as TipoDerivacion)
          : undefined;

      const incidenciaGuardada = await addIncidencia({
        studentName: formData.estudiante,
        tipo: formData.tipo as TipoIncidencia,
        subtipo: formData.subtipo ? (formData.subtipo as SubtipoConducta | SubtipoPositivo) : undefined,
        gravedad: formData.gravedad,
        descripcion: formData.descripcion,
        fecha: formData.fecha,
        profesor: formData.tutor,
        tutor: formData.tutor,
        lugar: formData.lugar,
        derivacion: derivacionValue,
        estado: 'Pendiente',
        historialEstado: [
          { estado: 'Pendiente', fecha: new Date().toISOString(), usuario: formData.tutor }
        ]
      });
      
      // Marcar al estudiante como atendido en notificaciones cuando se registra una incidencia
      // (Esto solo afecta las notificaciones de asistencia del profesor, NO las del director)
      if (incidenciaGuardada && incidenciaGuardada.id && typeof window !== 'undefined') {
        try {
          const hoy = new Date().toISOString().split('T')[0];
          // Nota: marcarEstudianteAtendido ya no está disponible, se puede implementar después si es necesario
          console.log('✅ Incidencia guardada:', incidenciaGuardada.id);
          
          // Disparar evento para actualizar notificaciones en el navbar
          // Usar setTimeout para asegurar que el storage se haya actualizado
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('asistenciaActualizada'));
            console.log('✅ Evento asistenciaActualizada disparado para actualizar notificaciones');
          }, 150);
        } catch (e) {
          console.error('❌ Error al marcar estudiante como atendido:', e);
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
      }
      
      // Reset form
      setFormData({
        grado: '',
        estudiante: '',
        tipo: '' as TipoIncidencia | '',
        subtipo: '' as SubtipoConducta | SubtipoPositivo | '',
        gravedad: 'moderada' as Gravedad,
        descripcion: '',
        fecha: new Date().toISOString().split('T')[0],
        tutor: '',
        lugar: '',
        derivacion: 'ninguna',
      });
      
      setSelectedStudent(null);
      setViewMode('lista');
      setSeccionSeleccionada(null);
      alert('Incidencia registrada exitosamente');
    } catch (error) {
      console.error('Error al registrar incidencia:', error);
      alert('Error al registrar la incidencia');
    } finally {
      setLoading(false);
    }
  };

  const getSubtipoLabel = (subtipo: string): string => {
    const labels: Record<string, string> = {
      agresion: 'Agresi├│n',
      falta_respeto: 'Falta de Respeto',
      interrupcion: 'Interrupci├│n',
      desobediencia: 'Desobediencia',
      ayuda_companero: 'Ayuda a Compa├▒ero',
      participacion: 'Participaci├│n Destacada',
      liderazgo: 'Liderazgo',
      creatividad: 'Creatividad',
      otra: 'Otra',
      otro: 'Otro',
    };
    return labels[subtipo] || subtipo;
  };

  // Vista de Lista de Secciones Asignadas
  if (viewMode === 'lista' && !seccionSeleccionada) {
    return (
      <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8 max-w-6xl">
        <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            Mis Secciones Asignadas
            </h1>
          <p className="text-sm sm:text-base text-gray-900 mt-1">Secciones a tu cargo con la cantidad de estudiantes</p>
        </div>

        {/* Búsqueda y Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl !text-gray-900">Búsqueda y Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900">Buscar Tutor</label>
                <Input
                  placeholder="Buscar por nombre del tutor..."
                  value={busquedaTutor}
                  onChange={(e) => setBusquedaTutor(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900">Filtrar por Grado</label>
                <Select value={filtroGradoSeccion || 'all'} onValueChange={(value) => setFiltroGradoSeccion(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los grados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los grados</SelectItem>
                    {gradosUnicos.map(grado => (
                      <SelectItem key={grado} value={grado}>{grado}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900">Filtrar por Sección</label>
                <Select value={filtroSeccionSeccion || 'all'} onValueChange={(value) => setFiltroSeccionSeccion(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las secciones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las secciones</SelectItem>
                    {seccionesUnicas.map(seccion => (
                      <SelectItem key={seccion} value={seccion}>{seccion}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Secciones Asignadas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl !text-gray-900">
              Secciones ({seccionesAsignadas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {seccionesAsignadas.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-900">
                  No tienes secciones asignadas. Contacta al director para que te asigne una sección.
                </p>
              </div>
            ) : (
              <>
                {/* Vista de Cards para móvil */}
                <div className="grid grid-cols-1 gap-4 sm:hidden">
                  {seccionesAsignadas.map((seccion) => (
                    <Card key={`${seccion.grado}-${seccion.seccion}-${seccion.tutorId}`} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">{seccion.grado} {seccion.seccion}</h3>
                            <p className="text-sm text-gray-600">Tutor: {seccion.tutorNombre}</p>
                          </div>
                          <Badge variant="outline" className="font-semibold">
                            {seccion.cantidadEstudiantes} estudiantes
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setSeccionSeleccionada({ grado: seccion.grado, seccion: seccion.seccion })}
                          className="w-full gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          Ver Estudiantes
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Vista de Tabla para desktop */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-sm font-semibold">Tutor</TableHead>
                        <TableHead className="text-sm font-semibold">Grado</TableHead>
                        <TableHead className="text-sm font-semibold">Sección</TableHead>
                        <TableHead className="text-sm font-semibold">Cantidad de Estudiantes</TableHead>
                        <TableHead className="text-sm font-semibold text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {seccionesAsignadas.map((seccion, index) => (
                        <TableRow key={`${seccion.grado}-${seccion.seccion}-${seccion.tutorId}`} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-900">{seccion.tutorNombre}</TableCell>
                          <TableCell className="text-gray-900">{seccion.grado}</TableCell>
                          <TableCell className="text-gray-900">{seccion.seccion}</TableCell>
                          <TableCell className="text-gray-900">
                            <Badge variant="outline" className="font-semibold">
                              {seccion.cantidadEstudiantes}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => setSeccionSeleccionada({ grado: seccion.grado, seccion: seccion.seccion })}
                              className="gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              Ver Estudiantes
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vista de Estudiantes de una Sección
  if (viewMode === 'lista' && seccionSeleccionada) {

    return (
      <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8 max-w-6xl">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                <span className="break-words">Estudiantes - {seccionSeleccionada.grado} {seccionSeleccionada.seccion}</span>
              </h1>
              <p className="text-sm sm:text-base text-gray-900 mt-1">Lista de estudiantes de la sección</p>
            </div>
            <Button variant="outline" onClick={() => {
              setSeccionSeleccionada(null);
              setBusquedaEstudiante('');
            }} className="w-full sm:w-auto">
              <X className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>
        </div>

        {/* Bloque REPORTE - Solo para tutor asignado */}
        {esTutorDeLaSeccion && resumenData && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl !text-gray-900 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Resumen de la Sección
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{resumenData.totalEstudiantes}</div>
                  <div className="text-sm text-gray-600 mt-1">Total Estudiantes</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{resumenData.asistenciaPromedio}%</div>
                  <div className="text-sm text-gray-600 mt-1">Asistencia Promedio</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{resumenData.incidenciasActivas}</div>
                  <div className="text-sm text-gray-600 mt-1">Incidencias Activas</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Búsqueda de Estudiantes */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Buscar Estudiante</label>
              <Input
                placeholder="Buscar por nombre del estudiante..."
                value={busquedaEstudiante}
                onChange={(e) => setBusquedaEstudiante(e.target.value)}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Estudiantes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl !text-gray-900">
              Lista de Estudiantes ({estudiantesConEstado.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {estudiantesConEstado.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-900">No hay estudiantes registrados en esta sección.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm font-semibold">Estudiante</TableHead>
                        <TableHead className="text-xs sm:text-sm font-semibold hidden sm:table-cell">Grado</TableHead>
                        <TableHead className="text-xs sm:text-sm font-semibold hidden sm:table-cell">Sección</TableHead>
                        {esTutorDeLaSeccion && (
                          <TableHead className="text-xs sm:text-sm font-semibold">Estado</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {estudiantesConEstado.map((estudiante) => (
                        <TableRow key={estudiante.nombre} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-900 text-xs sm:text-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <span>{getNombreCompleto(estudiante)}</span>
                              <span className="text-gray-500 text-xs sm:hidden">{estudiante.grado} {estudiante.seccion}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-900 text-xs sm:text-sm hidden sm:table-cell">{estudiante.grado}</TableCell>
                          <TableCell className="text-gray-900 text-xs sm:text-sm hidden sm:table-cell">{estudiante.seccion}</TableCell>
                          {esTutorDeLaSeccion && (
                            <TableCell className="text-xs sm:text-sm">
                              {estudiante.estado === 'normal' && (
                                <Badge className="bg-green-100 text-green-800 border-green-300">Normal</Badge>
                              )}
                              {estudiante.estado === 'atencion' && (
                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Atención</Badge>
                              )}
                              {estudiante.estado === 'riesgo' && (
                                <Badge className="bg-red-100 text-red-800 border-red-300">Riesgo</Badge>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Resumen IA - Solo para tutor asignado */}
                {esTutorDeLaSeccion && (
                  <Card className="bg-gray-50 border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-base !text-gray-900">IA – Resumen General del Salón</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {iaCargandoGeneral ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          <span className="text-sm text-gray-500 italic">Generando resumen general del salón...</span>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                          {iaResumenGeneral || 'Sin análisis disponible para el salón.'}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vista de Formulario (Asistencia o Incidencia)
  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 flex items-center gap-2">
            {viewMode === 'asistencia' ? (
              <>
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                Registro de Asistencia
              </>
            ) : (
              <>
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                Registro de Incidencia
              </>
            )}
          </h1>
          <p className="text-sm sm:text-base text-gray-900 mt-1">
            Estudiante: <span className="font-semibold">{selectedStudent ? getNombreCompleto(selectedStudent) : ''}</span> - {selectedStudent?.grado} {selectedStudent?.seccion}
          </p>
        </div>
        <Button variant="outline" onClick={() => {
          // Resetear formulario
          setFormData({
            grado: '',
            estudiante: '',
            tipo: '' as TipoIncidencia | '',
            subtipo: '' as SubtipoConducta | SubtipoPositivo | '',
            gravedad: 'moderada' as Gravedad,
            descripcion: '',
            fecha: new Date().toISOString().split('T')[0],
            tutor: '',
            lugar: '',
            derivacion: '' as TipoDerivacion | '',
          });
          setViewMode('lista');
          setSelectedStudent(null);
        }}>
          <X className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 !text-gray-900">
            <Plus className="h-5 w-5" />
            {viewMode === 'asistencia' ? 'Nueva Asistencia' : 'Nueva Incidencia'}
          </CardTitle>
          <CardDescription className="text-gray-900">
            Completa el formulario para registrar {viewMode === 'asistencia' ? 'la Asistencia' : 'la incidencia'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900">Grado</label>
                <Select
                  value={formData.grado}
                  onValueChange={(value) => {
                    setFormData({ ...formData, grado: value, estudiante: '' });
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el grado" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradosUnicos.map(grado => (
                      <SelectItem key={grado} value={grado}>{grado}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900">Estudiante</label>
                <Select
                  value={formData.estudiante}
                  onValueChange={(value) => setFormData({ ...formData, estudiante: value })}
                  required
                  disabled={!formData.grado}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el estudiante" />
                  </SelectTrigger>
                  <SelectContent>
                    {estudiantes
                      .filter(e => e.grado === formData.grado)
                      .map(est => (
                        <SelectItem key={getNombreCompleto(est)} value={getNombreCompleto(est)}>{getNombreCompleto(est)}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {viewMode === 'asistencia' && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900">Tipo de Incidencia</label>
                <Select
                  value="asistencia"
                  disabled
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ausencia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asistencia">Ausencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {viewMode === 'incidencia' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-900">Tipo de Incidencia</label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => {
                      setFormData({ ...formData, tipo: value as TipoIncidencia, subtipo: '' });
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asistencia">Ausencia</SelectItem>
                      <SelectItem value="conducta">Conducta Negativa</SelectItem>
                      <SelectItem value="academica">Académica</SelectItem>
                      <SelectItem value="positivo">Comportamiento Positivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Select condicional para subtipos */}
                {formData.tipo === 'conducta' && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-900">Tipo de Conducta Negativa</label>
                    <Select
                      value={formData.subtipo}
                      onValueChange={(value) => setFormData({ ...formData, subtipo: value as SubtipoConducta })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo de conducta" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agresion">Agresi├│n</SelectItem>
                        <SelectItem value="falta_respeto">Falta de Respeto</SelectItem>
                        <SelectItem value="interrupcion">Interrupci├│n</SelectItem>
                        <SelectItem value="desobediencia">Desobediencia</SelectItem>
                        <SelectItem value="otra">Otra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.tipo === 'positivo' && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-900">Tipo de Comportamiento Positivo</label>
                    <Select
                      value={formData.subtipo}
                      onValueChange={(value) => setFormData({ ...formData, subtipo: value as SubtipoPositivo })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo de comportamiento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ayuda_companero">Ayuda a Compa├▒ero</SelectItem>
                        <SelectItem value="participacion">Participaci├│n Destacada</SelectItem>
                        <SelectItem value="liderazgo">Liderazgo</SelectItem>
                        <SelectItem value="creatividad">Creatividad</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {viewMode === 'incidencia' && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900">Gravedad</label>
                <Select
                  value={formData.gravedad}
                  onValueChange={(value) => setFormData({ ...formData, gravedad: value as Gravedad })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona la gravedad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leve">Leve</SelectItem>
                    <SelectItem value="moderada">Moderada</SelectItem>
                    <SelectItem value="grave">Grave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {viewMode === 'asistencia' && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900">Gravedad</label>
                <Select
                  value={formData.gravedad}
                  onValueChange={(value) => setFormData({ ...formData, gravedad: value as Gravedad })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona la gravedad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leve">Leve</SelectItem>
                    <SelectItem value="moderada">Moderada</SelectItem>
                    <SelectItem value="grave">Grave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">
                Descripción
                <span className="text-xs text-gray-500 font-normal ml-2">(mínimo 10 caracteres)</span>
              </label>
              <Textarea
                placeholder={viewMode === 'asistencia' ? 'Describe la situación de Asistencia...' : 'Describe la incidencia de manera clara y concisa...'}
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={4}
                required
              />
              {formData.descripcion.length > 0 && (
                <p className={`text-xs mt-1 ${formData.descripcion.trim().length < 10 ? 'text-red-600' : 'text-gray-500'}`}>
                  {formData.descripcion.trim().length} / 10 caracteres mínimo
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900">Fecha</label>
                <Input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900">Tutor/Profesor</label>
                <Select
                  value={formData.tutor}
                  onValueChange={(value) => setFormData({ ...formData, tutor: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tutor" />
                  </SelectTrigger>
                  <SelectContent>
                    {tutores.map(tutor => (
                      <SelectItem key={tutor.id} value={tutor.nombre}>{tutor.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Lugar donde se gener├│ la incidencia
              </label>
              <Input
                placeholder="Ej: Aula 301, Patio, Laboratorio, etc."
                value={formData.lugar}
                onChange={(e) => setFormData({ ...formData, lugar: e.target.value })}
                required
              />
            </div>

            {viewMode === 'incidencia' && (
              <div className="space-y-2 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  Derivar Incidencia <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-900 mt-1 mb-2">
                  Selecciona a qué departamento se debe derivar esta incidencia (obligatorio).
                </p>
                <Select
                  value={formData.derivacion}
                  onValueChange={(value) => setFormData({ ...formData, derivacion: value as TipoDerivacion })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona a quién derivar (obligatorio)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="director">Director</SelectItem>
                    <SelectItem value="psicologia">Psicología</SelectItem>
                    <SelectItem value="enfermeria">Enfermería</SelectItem>
                    <SelectItem value="coordinacion">Coordinación Académica</SelectItem>
                    <SelectItem value="orientacion">Orientación Estudiantil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <Button type="submit" className="flex-1 w-full sm:w-auto" disabled={loading}>
                {loading ? 'Registrando...' : viewMode === 'asistencia' ? 'Registrar Asistencia' : 'Registrar Incidencia'}
              </Button>
              <Button type="button" variant="outline" onClick={() => {
                // Resetear formulario
                setFormData({
                  grado: '',
                  estudiante: '',
                  tipo: '' as TipoIncidencia | '',
                  subtipo: '' as SubtipoConducta | SubtipoPositivo | '',
                  gravedad: 'moderada' as Gravedad,
                  descripcion: '',
                  fecha: new Date().toISOString().split('T')[0],
                  tutor: '',
                  lugar: '',
                  derivacion: 'ninguna' as TipoDerivacion,
                });
                setViewMode('lista');
                setSelectedStudent(null);
              }} className="w-full sm:w-auto">
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
