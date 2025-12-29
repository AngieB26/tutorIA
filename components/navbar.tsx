'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, Bell, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getTipoColor, getTipoLabel, getGravedadColor, getGravedadLabel } from '@/lib/utils';
import { fetchIncidencias, fetchEstudiantes, fetchTutores, fetchAsistenciaClases } from '@/lib/api';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isDirector, setIsDirector] = useState(pathname === '/director');
  const [isProfesor, setIsProfesor] = useState(pathname === '/profesor');
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
  const [estudiantesConProblemas, setEstudiantesConProblemas] = useState<Array<{
    nombre: string;
    ausencias: number;
    tardanzas: number;
    total: number;
    estudiante: any;
  }>>([]);
  const [profesorActual, setProfesorActual] = useState<string>('');
  
  // Estados para notificaciones del director
  const [incidenciasVistas, setIncidenciasVistas] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const vistasStr = localStorage.getItem('incidencias_vistas');
        if (vistasStr) {
          const vistasArray = JSON.parse(vistasStr);
          const idsValidos = vistasArray.filter((id: any) => id && typeof id === 'string' && id.trim() !== '');
          if (idsValidos.length > 0) {
            return new Set(idsValidos);
          }
        }
      } catch (error) {
        console.error('Error inicializando incidencias vistas:', error);
      }
    }
    return new Set();
  });
  const [nuevasIncidencias, setNuevasIncidencias] = useState<any[]>([]);
  const [mostrarNotificacionesDirector, setMostrarNotificacionesDirector] = useState(false);
  const [refreshKeyDirector, setRefreshKeyDirector] = useState(0);

  useEffect(() => {
    setIsDirector(pathname === '/director');
    setIsProfesor(pathname === '/profesor');
    console.log('🔍 Navbar - pathname:', pathname, 'isProfesor:', pathname === '/profesor');
  }, [pathname]);

  // Cargar datos de estudiantes con problemas cuando estemos en la página de profesor
  useEffect(() => {
    console.log('🔍 useEffect notificaciones - isProfesor:', isProfesor, 'pathname:', pathname);
    if (isProfesor && typeof window !== 'undefined') {
      console.log('✅ Cargando datos de notificaciones...');
      const loadData = async () => {
        try {
          const [registrosAsistencia, estudiantes, tutores] = await Promise.all([
            fetchAsistenciaClases(),
            fetchEstudiantes(),
            fetchTutores()
          ]);
        
          console.log('📦 Datos cargados:', {
            registrosAsistencia: registrosAsistencia.length,
            estudiantes: estudiantes.length,
            tutores: tutores.length
          });
          
          // Obtener el profesor actual desde localStorage o el primer profesor disponible
          const profesorGuardado = localStorage.getItem('profesor_actual') || tutores[0]?.nombre || '';
          setProfesorActual(profesorGuardado);
          
          // Contar ausencias y tardanzas por estudiante (de TODOS los profesores)
          const conteoPorEstudiante: Record<string, { ausencias: number; tardanzas: number; estudiante: any }> = {};
          
          registrosAsistencia.forEach((registro: any) => {
            Object.entries(registro.entries || {}).forEach(([nombreEstudiante, estado]: [string, any]) => {
              if (!conteoPorEstudiante[nombreEstudiante]) {
                const estudianteInfo = estudiantes.find((e: any) => e.nombre === nombreEstudiante);
                conteoPorEstudiante[nombreEstudiante] = {
                  ausencias: 0,
                  tardanzas: 0,
                  estudiante: estudianteInfo
                };
              }
              
              if (estado === 'ausente') {
                conteoPorEstudiante[nombreEstudiante].ausencias++;
              } else if (estado === 'tardanza') {
                conteoPorEstudiante[nombreEstudiante].tardanzas++;
              }
            });
          });
          
          // Debug: mostrar conteo de todos los estudiantes
          console.log('📋 Conteo de estudiantes:', Object.entries(conteoPorEstudiante).map(([nombre, conteo]) => ({
            nombre,
            ausencias: conteo.ausencias,
            tardanzas: conteo.tardanzas
          })));
          
          // Obtener estudiantes atendidos hoy desde localStorage (esto sigue siendo local)
          const hoy = new Date().toISOString().split('T')[0];
          const estudiantesAtendidosStr = localStorage.getItem('tutoria_estudiantes_atendidos');
          const estudiantesAtendidos = estudiantesAtendidosStr ? JSON.parse(estudiantesAtendidosStr) : [];
          const estudiantesAtendidosHoy = new Set(
            estudiantesAtendidos
              .filter((e: any) => e.fecha === hoy)
              .map((e: any) => e.nombre)
          );
          
          console.log('👥 Estudiantes atendidos hoy:', Array.from(estudiantesAtendidosHoy));
          
          // Filtrar estudiantes con más de 3 ausencias o tardanzas
          // Y excluir estudiantes que fueron atendidos hoy (por cualquier profesor)
          const problemas = Object.entries(conteoPorEstudiante)
            .filter(([nombre, conteo]) => {
              // Excluir si fue atendido hoy por cualquier profesor
              if (estudiantesAtendidosHoy.has(nombre)) {
                console.log('🔕 Estudiante excluido de notificaciones (atendido hoy):', nombre);
                return false;
              }
              // Incluir si tiene más de 3 ausencias o más de 3 tardanzas
              const tieneProblemas = conteo.ausencias > 3 || conteo.tardanzas > 3;
              if (tieneProblemas) {
                console.log('🔔 Estudiante con problemas:', nombre, { ausencias: conteo.ausencias, tardanzas: conteo.tardanzas });
              }
              return tieneProblemas;
            })
            .map(([nombre, conteo]) => ({
              nombre,
              ausencias: conteo.ausencias,
              tardanzas: conteo.tardanzas,
              total: conteo.ausencias + conteo.tardanzas,
              estudiante: conteo.estudiante
            }))
            .sort((a, b) => b.total - a.total);
          
          console.log('📊 Total estudiantes con problemas (después de filtrar atendidos):', problemas.length);
          console.log('📋 Lista de estudiantes con problemas:', problemas.map(p => p.nombre));
          setEstudiantesConProblemas(problemas);
        } catch (error) {
          console.error('❌ Error cargando notificaciones:', error);
          setEstudiantesConProblemas([]);
        }
      };
      
      loadData();
    } else {
      console.log('⚠️ No se cargan notificaciones - isProfesor:', isProfesor, 'window:', typeof window);
    }
  }, [isProfesor, pathname]);

  // Escuchar cambios en localStorage para actualizar cuando se seleccione un profesor
  useEffect(() => {
    if (!isProfesor) return;
    
    const actualizarDatos = async () => {
      try {
        const [registrosAsistencia, estudiantes, tutores] = await Promise.all([
          fetchAsistenciaClases(),
          fetchEstudiantes(),
          fetchTutores()
        ]);
        
        const profesorGuardado = localStorage.getItem('profesor_actual') || tutores[0]?.nombre || '';
        if (profesorGuardado !== profesorActual) {
          setProfesorActual(profesorGuardado);
        }
        
        // Contar ausencias y tardanzas por estudiante (de TODOS los profesores)
        const conteoPorEstudiante: Record<string, { ausencias: number; tardanzas: number; estudiante: any }> = {};
        
        registrosAsistencia.forEach((registro: any) => {
          Object.entries(registro.entries || {}).forEach(([nombreEstudiante, estado]: [string, any]) => {
            if (!conteoPorEstudiante[nombreEstudiante]) {
              const estudianteInfo = estudiantes.find((e: any) => e.nombre === nombreEstudiante);
              conteoPorEstudiante[nombreEstudiante] = {
                ausencias: 0,
                tardanzas: 0,
                estudiante: estudianteInfo
              };
            }
            
            if (estado === 'ausente') {
              conteoPorEstudiante[nombreEstudiante].ausencias++;
            } else if (estado === 'tardanza') {
              conteoPorEstudiante[nombreEstudiante].tardanzas++;
            }
          });
        });
        
        // Obtener estudiantes atendidos hoy desde localStorage (esto sigue siendo local)
        const hoy = new Date().toISOString().split('T')[0];
        const estudiantesAtendidosStr = localStorage.getItem('tutoria_estudiantes_atendidos');
        const estudiantesAtendidos = estudiantesAtendidosStr ? JSON.parse(estudiantesAtendidosStr) : [];
        const estudiantesAtendidosHoy = new Set(
          estudiantesAtendidos
            .filter((e: any) => e.fecha === hoy)
            .map((e: any) => e.nombre)
        );
        
        // Filtrar estudiantes con más de 3 ausencias o tardanzas
        // Y excluir estudiantes que fueron atendidos hoy (por cualquier profesor)
        const problemas = Object.entries(conteoPorEstudiante)
          .filter(([nombre, conteo]) => {
            // Excluir si fue atendido hoy por cualquier profesor
            if (estudiantesAtendidosHoy.has(nombre)) {
              console.log('🔕 Estudiante excluido de notificaciones (atendido hoy):', nombre);
              return false;
            }
            // Incluir si tiene más de 3 ausencias o más de 3 tardanzas
            const tieneProblemas = conteo.ausencias > 3 || conteo.tardanzas > 3;
            if (tieneProblemas) {
              console.log('🔔 Estudiante con problemas:', nombre, { ausencias: conteo.ausencias, tardanzas: conteo.tardanzas });
            }
            return tieneProblemas;
          })
          .map(([nombre, conteo]) => ({
            nombre,
            ausencias: conteo.ausencias,
            tardanzas: conteo.tardanzas,
            total: conteo.ausencias + conteo.tardanzas,
            estudiante: conteo.estudiante
          }))
          .sort((a, b) => b.total - a.total);
        
        console.log('📊 Total estudiantes con problemas (después de filtrar atendidos):', problemas.length);
        setEstudiantesConProblemas(problemas);
      } catch (error) {
        console.error('Error actualizando notificaciones:', error);
      }
    };
    
    // Verificar periódicamente y también cuando cambie el storage
    const interval = setInterval(actualizarDatos, 1000); // Actualizar cada segundo
    actualizarDatos(); // Ejecutar inmediatamente
    
    // Escuchar cambios en el storage de asistencia y estudiantes atendidos (entre pestañas)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tutoria_asistencia_clases' || 
          e.key === 'tutoria_estudiantes_atendidos' || 
          e.key === null) {
        actualizarDatos();
      }
    };
    
    // Escuchar evento personalizado cuando se guarda asistencia o incidencia en la misma pestaña
    const handleAsistenciaActualizada = () => {
      actualizarDatos();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('asistenciaActualizada', handleAsistenciaActualizada);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('asistenciaActualizada', handleAsistenciaActualizada);
    };
  }, [isProfesor, profesorActual]);

  // Cargar notificaciones del director cuando estemos en la página del director
  useEffect(() => {
    if (isDirector && typeof window !== 'undefined') {
      const actualizarNotificaciones = async () => {
        try {
          // Cargar incidencias desde la base de datos
          const todasIncidencias = await fetchIncidencias();
          
          // Sincronizar incidencias vistas con localStorage
          try {
            const vistasStr = localStorage.getItem('incidencias_vistas');
            if (vistasStr) {
              const vistasArray = JSON.parse(vistasStr);
              const idsValidos = vistasArray.filter((id: any) => id && typeof id === 'string' && id.trim() !== '');
              setIncidenciasVistas(new Set(idsValidos));
            }
          } catch (error) {
            console.error('Error sincronizando incidencias vistas:', error);
          }
          
          // Obtener nuevas incidencias (no vistas)
          const noVistas = todasIncidencias
            .filter((inc: any) => inc.id && !incidenciasVistas.has(inc.id))
            .sort((a: any, b: any) => {
              const fechaA = new Date(a.timestamp || a.fecha || 0).getTime();
              const fechaB = new Date(b.timestamp || b.fecha || 0).getTime();
              return fechaB - fechaA; // Más recientes primero
            })
            .slice(0, 10); // Máximo 10 notificaciones
          
          setNuevasIncidencias(noVistas);
        } catch (error) {
          console.error('Error cargando notificaciones del director:', error);
          setNuevasIncidencias([]);
        }
      };
      
      actualizarNotificaciones();
      
      // Escuchar cambios en localStorage y eventos personalizados
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'incidencias_vistas' && e.newValue) {
          try {
            const vistasArray = JSON.parse(e.newValue);
            const idsValidos = vistasArray.filter((id: any) => id && typeof id === 'string' && id.trim() !== '');
            setIncidenciasVistas(new Set(idsValidos));
            actualizarNotificaciones();
          } catch (error) {
            console.error('Error procesando cambio en localStorage:', error);
          }
        }
      };

      const handleIncidenciaRegistrada = (e: Event) => {
        const customEvent = e as CustomEvent;
        const nuevaId = customEvent.detail?.id;
        if (nuevaId && typeof nuevaId === 'string') {
          setTimeout(() => {
            setRefreshKeyDirector(prev => prev + 1);
            actualizarNotificaciones();
          }, 200);
        }
      };

      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('incidenciaRegistrada', handleIncidenciaRegistrada as EventListener);
      
      const interval = setInterval(actualizarNotificaciones, 5000); // Actualizar cada 5 segundos
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('incidenciaRegistrada', handleIncidenciaRegistrada as EventListener);
      };
    }
  }, [isDirector, incidenciasVistas, refreshKeyDirector]);

  // Marcar incidencia como vista
  const marcarComoVista = (incidenciaId: string) => {
    if (!incidenciaId || typeof incidenciaId !== 'string' || incidenciaId.trim() === '') {
      return;
    }
    setIncidenciasVistas(prev => {
      const nuevoSet = new Set([...prev, incidenciaId]);
      try {
        const idsValidos = Array.from(nuevoSet).filter(id => id && typeof id === 'string' && id.trim() !== '');
        localStorage.setItem('incidencias_vistas', JSON.stringify(idsValidos));
      } catch (error) {
        console.error('Error guardando incidencias vistas:', error);
      }
      return nuevoSet;
    });
    // Disparar evento para que la página del director se actualice
    window.dispatchEvent(new CustomEvent('incidenciaMarcadaComoVista', { detail: { id: incidenciaId } }));
  };

  // Marcar todas como vistas
  const marcarTodasComoVistas = () => {
    const todasIds = nuevasIncidencias
      .map((inc: any) => inc.id)
      .filter((id: any) => id && typeof id === 'string' && id.trim() !== '');
    const nuevoSet = new Set([...incidenciasVistas, ...todasIds]);
    setIncidenciasVistas(nuevoSet);
    try {
      localStorage.setItem('incidencias_vistas', JSON.stringify(Array.from(nuevoSet)));
    } catch (error) {
      console.error('Error guardando incidencias vistas:', error);
    }
    // Disparar evento para que la página del director se actualice
    window.dispatchEvent(new CustomEvent('todasIncidenciasMarcadasComoVistas'));
  };

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (mostrarNotificaciones && !target.closest('.notificaciones-dropdown-navbar')) {
        setMostrarNotificaciones(false);
      }
      if (mostrarNotificacionesDirector && !target.closest('.notificaciones-dropdown-director')) {
        setMostrarNotificacionesDirector(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mostrarNotificaciones, mostrarNotificacionesDirector]);

  const handleSwitchChange = (checked: boolean) => {
    setIsDirector(checked);
    if (checked) {
      router.push('/director');
    } else {
      router.push('/profesor');
    }
  };

  const handleRegistrarIncidencia = (nombreEstudiante: string) => {
    // Encontrar los datos del estudiante con problemas
    const estudianteProblema = estudiantesConProblemas.find(e => e.nombre === nombreEstudiante);
    
    // Determinar tipo y gravedad automáticamente
    let tipoIncidencia = 'asistencia'; // Por defecto asistencia (para ausencias)
    let gravedadIncidencia = 'moderada';
    
    if (estudianteProblema) {
      // Si tiene más tardanzas que ausencias, tipo = asistencia y gravedad = moderada
      // Si tiene más ausencias que tardanzas, tipo = asistencia y gravedad = grave
      if (estudianteProblema.tardanzas > estudianteProblema.ausencias) {
        // Caso de tardanza: tipo asistencia y gravedad moderada
        tipoIncidencia = 'asistencia';
        gravedadIncidencia = 'moderada';
      } else {
        // Caso de ausencias: tipo asistencia y gravedad grave
        tipoIncidencia = 'asistencia';
        gravedadIncidencia = 'grave';
      }
    }
    
    // Guardar los datos en localStorage para que la página de profesor lo use
    localStorage.setItem('estudiante_para_incidencia', nombreEstudiante);
    localStorage.setItem('tipo_incidencia_prellenado', tipoIncidencia);
    localStorage.setItem('gravedad_incidencia_prellenado', gravedadIncidencia);
    
    // Cerrar notificaciones primero
    setMostrarNotificaciones(false);
    
    // Si ya estamos en la página de profesor, solo disparar el evento
    if (isProfesor) {
      // Disparar evento inmediatamente
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('abrirIncidenciaDesdeNotificacion', { 
          detail: { 
            estudiante: nombreEstudiante,
            tipo: tipoIncidencia,
            gravedad: gravedadIncidencia
          } 
        }));
      }, 100);
    } else {
      // Si no estamos en la página de profesor, redirigir primero
      router.push('/profesor');
      // Disparar evento después de un pequeño delay para que la página cargue
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('abrirIncidenciaDesdeNotificacion', { 
          detail: { 
            estudiante: nombreEstudiante,
            tipo: tipoIncidencia,
            gravedad: gravedadIncidencia
          } 
        }));
      }, 500);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-blue-200 bg-white shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <div 
          className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.href = '/';
            }
          }}
        >
          <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <span className="text-lg sm:text-xl font-semibold text-gray-900">TutorIA</span>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Campana de notificaciones del director */}
          {isDirector && (
            <div className="relative notificaciones-dropdown-director">
              <Button
                variant="outline"
                size="icon"
                className="relative"
                onClick={() => setMostrarNotificacionesDirector(!mostrarNotificacionesDirector)}
                title="Notificaciones de nuevas incidencias"
              >
                <Bell className="h-5 w-5" />
                {nuevasIncidencias.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs animate-pulse">
                    {nuevasIncidencias.length > 9 ? '9+' : nuevasIncidencias.length}
                  </Badge>
                )}
              </Button>
              
              {/* Dropdown de notificaciones del director */}
              {mostrarNotificacionesDirector && (
                <div className="notificaciones-dropdown-director absolute right-0 top-12 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
                  <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Nuevas Incidencias</h3>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      {nuevasIncidencias.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={marcarTodasComoVistas}
                          className="text-xs text-gray-700 hover:bg-gray-100 hover:text-gray-900 hidden sm:inline-flex"
                        >
                          Marcar todas como vistas
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        onClick={() => setMostrarNotificacionesDirector(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-y-auto">
                    {nuevasIncidencias.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">No hay nuevas incidencias</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {nuevasIncidencias.map((incidencia: any) => (
                          <div
                            key={incidencia.id}
                            className="p-4 hover:bg-gray-50 cursor-pointer transition-colors relative group"
                            onClick={() => {
                              marcarComoVista(incidencia.id);
                              setMostrarNotificacionesDirector(false);
                              // Disparar evento para abrir el detalle en la página del director
                              window.dispatchEvent(new CustomEvent('abrirIncidenciaDesdeNotificacionNavbar', { 
                                detail: { incidencia } 
                              }));
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className={getTipoColor(incidencia.tipo)}>
                                    {getTipoLabel(incidencia.tipo)}
                                  </Badge>
                                  <Badge variant="outline" className={getGravedadColor(incidencia.gravedad)}>
                                    {getGravedadLabel(incidencia.gravedad)}
                                  </Badge>
                                </div>
                                <p className="font-medium text-gray-900 text-sm">{incidencia.studentName}</p>
                                {incidencia.descripcion && (
                                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                    {incidencia.descripcion}
                                  </p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                  {incidencia.fecha || 'Sin fecha'}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-gray-400 hover:text-gray-900 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  marcarComoVista(incidencia.id);
                                }}
                                title="Marcar como vista"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Campana de notificaciones solo en página de profesor */}
          {isProfesor && (
            <div className="relative notificaciones-dropdown-navbar">
              <Button
                variant="outline"
                size="icon"
                className="relative"
                onClick={() => setMostrarNotificaciones(!mostrarNotificaciones)}
                title="Notificaciones de estudiantes con problemas de asistencia"
              >
                <Bell className="h-5 w-5" />
                {estudiantesConProblemas.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs animate-pulse">
                    {estudiantesConProblemas.length}
                  </Badge>
                )}
              </Button>
              
              {/* Dropdown de notificaciones */}
              {mostrarNotificaciones && (
                <div className="notificaciones-dropdown-navbar absolute right-0 top-12 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Estudiantes que requieren atención</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      onClick={() => setMostrarNotificaciones(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {estudiantesConProblemas.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <p>No hay estudiantes con más de 3 ausencias o tardanzas</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {estudiantesConProblemas.map((item) => (
                        <div key={item.nombre} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{item.nombre}</p>
                              {item.estudiante && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {item.estudiante.grado} {item.estudiante.seccion}
                                </p>
                              )}
                              <div className="flex gap-4 mt-2">
                                {item.ausencias >= 3 && (
                                  <Badge variant="destructive" className="text-xs">
                                    {item.ausencias} ausencias
                                  </Badge>
                                )}
                                {item.tardanzas >= 3 && (
                                  <Badge className="text-xs bg-yellow-500 hover:bg-yellow-600 text-white">
                                    {item.tardanzas} tardanzas
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="ml-2"
                              onClick={() => handleRegistrarIncidencia(item.nombre)}
                            >
                              Registrar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

