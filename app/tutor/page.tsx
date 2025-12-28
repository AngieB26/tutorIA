'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Plus, Eye, AlertTriangle, ArrowRight, Users, Calendar, MapPin, User, X, ClipboardList } from 'lucide-react';
import { addIncidencia, getIncidencias, getIncidenciasByStudent, seedInitialData, getEstudiantesByGrado, getEstudiantesInfo, getTutores, getTutoresGradoSeccion, getTutorGradoSeccion, marcarEstudianteAtendido, getAsistenciaClasesByFilters } from '@/lib/storage';
import { TipoIncidencia, Incidencia, TipoDerivacion, SubtipoConducta, SubtipoPositivo, EstudianteInfo, Gravedad } from '@/lib/types';
import { getTipoColor, getTipoLabel } from '@/lib/utils';

type ViewMode = 'lista' | 'asistencia' | 'incidencia';

export default function TutorPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('lista');
  const [selectedStudent, setSelectedStudent] = useState<EstudianteInfo | null>(null);
  const [seccionSeleccionada, setSeccionSeleccionada] = useState<{grado: string, seccion: string} | null>(null);
  const [busquedaTutor, setBusquedaTutor] = useState<string>('');
  const [filtroGradoSeccion, setFiltroGradoSeccion] = useState<string>('');
  const [filtroSeccionSeccion, setFiltroSeccionSeccion] = useState<string>('');
  const [busquedaEstudiante, setBusquedaEstudiante] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
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

  const estudiantes = getEstudiantesInfo();
  const tutores = getTutores();
  const asignacionesTutores = getTutoresGradoSeccion();
  const gradosUnicos = [...new Set(estudiantes.map(e => e.grado))].sort();
  const seccionesUnicas = [...new Set(estudiantes.map(e => e.seccion))].sort();

  useEffect(() => {
    seedInitialData();
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

  // Filtrar estudiantes de la sección seleccionada
  const estudiantesFiltrados = seccionSeleccionada 
    ? estudiantes.filter(est => {
        const matchSeccion = est.grado === seccionSeleccionada.grado && 
                            est.seccion === seccionSeleccionada.seccion;
        const matchBusqueda = !busquedaEstudiante || 
                             est.nombre.toLowerCase().includes(busquedaEstudiante.toLowerCase());
        return matchSeccion && matchBusqueda;
      })
    : [];

  const handleRegistrarAsistencia = (estudiante: EstudianteInfo) => {
    setSelectedStudent(estudiante);
    setViewMode('asistencia');
    setFormData({
      ...formData,
      grado: estudiante.grado,
      estudiante: estudiante.nombre,
      tipo: 'ausencia',
    });
  };

  const handleRegistrarIncidencia = (estudiante: EstudianteInfo) => {
    setSelectedStudent(estudiante);
    setViewMode('incidencia');
    setFormData({
      ...formData,
      grado: estudiante.grado,
      estudiante: estudiante.nombre,
      tipo: '' as TipoIncidencia | '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
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
      const incidenciaGuardada = addIncidencia({
        studentName: formData.estudiante,
        tipo: formData.tipo as TipoIncidencia,
        subtipo: formData.subtipo ? (formData.subtipo as SubtipoConducta | SubtipoPositivo) : undefined,
        gravedad: formData.gravedad,
        descripcion: formData.descripcion,
        fecha: formData.fecha,
        profesor: formData.tutor,
        tutor: formData.tutor,
        lugar: formData.lugar,
        derivacion: formData.derivacion,
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
          marcarEstudianteAtendido(formData.estudiante, hoy, formData.tutor);
          console.log('✅ Estudiante marcado como atendido en notificaciones:', formData.estudiante);
          
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
              <div className="overflow-x-auto">
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
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vista de Estudiantes de una Sección
  if (viewMode === 'lista' && seccionSeleccionada) {
    // Determinar si hay un tutor asignado a esta sección
    const tutorAsignado = getTutorGradoSeccion(seccionSeleccionada.grado, seccionSeleccionada.seccion);
    const esTutorDeLaSeccion = !!tutorAsignado;

    // Calcular estadísticas para el bloque REPORTE (solo si es tutor)
    let resumenData = null;
    if (esTutorDeLaSeccion) {
      const totalEstudiantes = estudiantesFiltrados.length;
      
      // Calcular asistencia promedio
      const registrosAsistencia = getAsistenciaClasesByFilters({
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
      const incidencias = getIncidencias();
      const incidenciasActivas = incidencias.filter(inc => {
        const estudiante = estudiantesFiltrados.find(e => e.nombre === inc.studentName);
        return estudiante && (inc.estado === 'Pendiente' || inc.estado === 'En revisión');
      }).length;

      resumenData = {
        totalEstudiantes,
        asistenciaPromedio,
        incidenciasActivas
      };
    }

    // Calcular estado y resumen IA para cada estudiante (solo si es tutor)
    const estudiantesConEstado = estudiantesFiltrados.map(est => {
      if (!esTutorDeLaSeccion) {
        return { ...est, estado: null, iaResumen: null };
      }

      const incidenciasEst = getIncidenciasByStudent(est.nombre);
      const incidenciasRecientes = incidenciasEst.filter(inc => {
        const fechaInc = new Date(inc.fecha);
        const hace30Dias = new Date();
        hace30Dias.setDate(hace30Dias.getDate() - 30);
        return fechaInc >= hace30Dias;
      });

      // Separar incidencias positivas y negativas
      const incidenciasNegativas = incidenciasRecientes.filter(inc => 
        inc.tipo === 'ausencia' || inc.tipo === 'tardanza' || inc.tipo === 'conducta' || inc.tipo === 'academica'
      );
      const incidenciasPositivas = incidenciasRecientes.filter(inc => inc.tipo === 'positivo');
      
      const incidenciasGraves = incidenciasNegativas.filter(inc => inc.gravedad === 'grave');
      const ausencias = incidenciasNegativas.filter(inc => inc.tipo === 'ausencia').length;
      const totalIncidenciasNegativas = incidenciasNegativas.length;
      const totalIncidenciasPositivas = incidenciasPositivas.length;

      // Determinar estado: Normal, Atención o Riesgo (solo basado en incidencias negativas)
      // Las incidencias positivas mejoran el estado
      let estado: 'normal' | 'atencion' | 'riesgo' = 'normal';
      
      // Si hay muchas incidencias positivas, favorece estado normal
      const balance = totalIncidenciasPositivas - totalIncidenciasNegativas;
      
      if (incidenciasGraves.length > 0 || ausencias >= 5 || (totalIncidenciasNegativas >= 8 && balance < -3)) {
        estado = 'riesgo';
      } else if ((totalIncidenciasNegativas >= 3 && balance < 0) || (ausencias >= 2 && balance < 0)) {
        estado = 'atencion';
      } else if (totalIncidenciasNegativas >= 5 && balance <= 0) {
        estado = 'atencion';
      }
      // Si balance >= 0 (más positivas que negativas), mantener normal

      // Resumen IA simple (una línea) - incluir tanto positivas como negativas
      let iaResumen = '';
      if (totalIncidenciasNegativas === 0 && totalIncidenciasPositivas === 0) {
        iaResumen = 'Sin incidencias recientes. Rendimiento normal.';
      } else if (totalIncidenciasPositivas > 0 && totalIncidenciasNegativas === 0) {
        iaResumen = `${totalIncidenciasPositivas} comportamiento(s) positivo(s) registrado(s). Buen desempeño.`;
      } else if (incidenciasGraves.length > 0) {
        const contextoPositivo = totalIncidenciasPositivas > 0 ? ` (${totalIncidenciasPositivas} positivo(s))` : '';
        iaResumen = `${incidenciasGraves.length} incidencia(s) grave(s)${contextoPositivo} en el último mes. Requiere atención inmediata.`;
      } else if (ausencias >= 3) {
        const contextoPositivo = totalIncidenciasPositivas > 0 ? `, ${totalIncidenciasPositivas} positivo(s)` : '';
        iaResumen = `${ausencias} ausencia(s)${contextoPositivo} en el último mes. Se recomienda seguimiento de asistencia.`;
      } else if (totalIncidenciasNegativas >= 5) {
        const contextoPositivo = totalIncidenciasPositivas > 0 ? ` (${totalIncidenciasPositivas} positivo(s))` : '';
        iaResumen = `${totalIncidenciasNegativas} incidencia(s) negativa(s)${contextoPositivo} en el último mes. Monitorear comportamiento.`;
      } else if (totalIncidenciasNegativas > 0) {
        const contextoPositivo = totalIncidenciasPositivas > 0 ? `, ${totalIncidenciasPositivas} positivo(s)` : '';
        iaResumen = `${totalIncidenciasNegativas} incidencia(s) negativa(s)${contextoPositivo} reciente(s). Seguimiento regular.`;
      } else {
        iaResumen = `${totalIncidenciasPositivas} comportamiento(s) positivo(s). Buen desempeño.`;
      }

      return { ...est, estado, iaResumen };
    });

    return (
      <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8 max-w-6xl">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 flex items-center gap-2">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                Estudiantes - {seccionSeleccionada.grado} {seccionSeleccionada.seccion}
              </h1>
              <p className="text-sm sm:text-base text-gray-900 mt-1">Lista de estudiantes de la sección</p>
            </div>
            <Button variant="outline" onClick={() => {
              setSeccionSeleccionada(null);
              setBusquedaEstudiante('');
            }}>
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
                        <TableHead className="text-sm font-semibold">Estudiante</TableHead>
                        <TableHead className="text-sm font-semibold">Grado</TableHead>
                        <TableHead className="text-sm font-semibold">Sección</TableHead>
                        {esTutorDeLaSeccion && (
                          <TableHead className="text-sm font-semibold">Estado</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {estudiantesConEstado.map((estudiante) => (
                        <TableRow key={estudiante.nombre} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-900">{estudiante.nombre}</TableCell>
                          <TableCell className="text-gray-900">{estudiante.grado}</TableCell>
                          <TableCell className="text-gray-900">{estudiante.seccion}</TableCell>
                          {esTutorDeLaSeccion && (
                            <TableCell>
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
                      <CardTitle className="text-base !text-gray-900">IA – Resumen</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {estudiantesConEstado.map(est => (
                          <div key={est.nombre} className="text-sm text-gray-700">
                            <span className="font-semibold">{est.nombre}:</span> {est.iaResumen || 'Sin análisis disponible'}
                          </div>
                        ))}
                      </div>
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
            Estudiante: <span className="font-semibold">{selectedStudent?.nombre}</span> - {selectedStudent?.grado} {selectedStudent?.seccion}
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
                        <SelectItem key={est.nombre} value={est.nombre}>{est.nombre}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {viewMode === 'asistencia' && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900">Tipo de Incidencia</label>
                <Select
                  value="ausencia"
                  disabled
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ausencia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ausencia">Ausencia</SelectItem>
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
                      <SelectItem value="ausencia">Ausencia</SelectItem>
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
              <label className="text-sm font-semibold text-gray-900">Descripci├│n</label>
              <Textarea
                placeholder={viewMode === 'asistencia' ? 'Describe la situación de Asistencia...' : 'Describe la incidencia de manera clara y concisa...'}
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={4}
                required
              />
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

            <div className="flex gap-4">
              <Button type="submit" className="flex-1" disabled={loading}>
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
              }}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
