'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, Bell, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getTipoColor, getTipoLabel, getGravedadColor, getGravedadLabel } from '@/lib/utils';
import { fetchIncidencias, fetchEstudiantes, fetchTutores, fetchAsistenciaClases, getEstudiantesAtendidos, getIncidenciasVistas, marcarIncidenciaVista, marcarIncidenciasVistas, savePrellenadoIncidencia } from '@/lib/api';

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
  
  // Estados para notificaciones del director
  const [incidenciasVistas, setIncidenciasVistas] = useState<Set<string>>(new Set());
  const [nuevasIncidencias, setNuevasIncidencias] = useState<any[]>([]);
  const [mostrarNotificacionesDirector, setMostrarNotificacionesDirector] = useState(false);
  const [refreshKeyDirector, setRefreshKeyDirector] = useState(0);

  // Helper function para obtener el nombre completo desde nombres y apellidos
  const getNombreCompleto = (estudiante: any): string => {
    // Validar que estudiante exista
    if (!estudiante) {
      console.warn('⚠️ getNombreCompleto recibió estudiante undefined/null');
      return 'Sin nombre';
    }
    
    if (estudiante.nombres && estudiante.apellidos) {
      const nombre = `${estudiante.nombres} ${estudiante.apellidos}`.trim();
      if (nombre) return nombre;
    }
    // Fallback: si no hay nombres y apellidos, intentar usar nombre (si existe en runtime)
    if (estudiante.nombre) return estudiante.nombre;
    const fallback = estudiante.nombres || estudiante.apellidos || 'Sin nombre';
    return fallback;
  };

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
          const [registrosAsistencia, estudiantes, tutores, incidencias] = await Promise.allSettled([
            fetchAsistenciaClases(),
            fetchEstudiantes(),
            fetchTutores(),
            fetchIncidencias()
          ]);
          
          // Manejar resultados exitosos o fallidos
          const registrosAsistenciaData = registrosAsistencia.status === 'fulfilled' ? registrosAsistencia.value : [];
          const estudiantesData = estudiantes.status === 'fulfilled' ? estudiantes.value : [];
          const tutoresData = tutores.status === 'fulfilled' ? tutores.value : [];
          const incidenciasData = incidencias.status === 'fulfilled' ? incidencias.value : [];
          
          // Si alguna petición falló, loguear pero continuar
          if (registrosAsistencia.status === 'rejected') {
            console.warn('⚠️ Error al obtener asistencia:', registrosAsistencia.reason);
          }
          if (estudiantes.status === 'rejected') {
            console.warn('⚠️ Error al obtener estudiantes:', estudiantes.reason);
          }
          if (tutores.status === 'rejected') {
            console.warn('⚠️ Error al obtener tutores:', tutores.reason);
          }
          if (incidencias.status === 'rejected') {
            console.warn('⚠️ Error al obtener incidencias:', incidencias.reason);
          }
        
          console.log('📦 Datos cargados:', {
            registrosAsistencia: registrosAsistenciaData.length,
            estudiantes: estudiantesData.length,
            tutores: tutoresData.length,
            incidencias: incidenciasData.length
          });
          
          
          // Usar los contadores de la tabla Estudiante (más confiable y refleja cambios directos en BD)
          // Estos contadores se actualizan automáticamente cuando se guardan registros de asistencia
          const conteoPorEstudiante: Record<string, { ausencias: number; tardanzas: number; estudiante: any }> = {};
          
          console.log('📊 Procesando contadores de estudiantes desde la tabla Estudiante...');
          estudiantesData.forEach((estudiante: any) => {
            // Validar que el estudiante exista y tenga datos válidos
            if (!estudiante) {
              console.warn('⚠️ Estudiante undefined/null encontrado, omitiendo');
              return;
            }
            
            const nombreCompleto = getNombreCompleto(estudiante);
            
            // Validar que el nombre completo sea válido (no undefined, null, o vacío)
            if (!nombreCompleto || nombreCompleto === 'Sin nombre' || nombreCompleto.trim() === '') {
              console.warn('⚠️ Estudiante sin nombre válido, omitiendo:', estudiante);
              return;
            }
            
            // Usar los contadores de la tabla Estudiante si están disponibles
            const ausencias = estudiante.ausencias ?? 0;
            const tardanzas = estudiante.tardanzas ?? 0;
            
            // Incluir todos los estudiantes, incluso si tienen 0 ausencias/tardanzas
            // para tener el objeto estudiante disponible
            conteoPorEstudiante[nombreCompleto] = {
              ausencias,
              tardanzas,
              estudiante: estudiante
            };
            
            if (ausencias > 0 || tardanzas > 0) {
              console.log(`📊 Estudiante: ${nombreCompleto} - Ausencias: ${ausencias}, Tardanzas: ${tardanzas}`);
            }
          });
          
          console.log('📊 Total estudiantes procesados:', Object.keys(conteoPorEstudiante).length);
          
          // Debug: mostrar conteo de todos los estudiantes
          console.log('📋 Conteo de estudiantes:', Object.entries(conteoPorEstudiante).map(([nombre, conteo]) => ({
            nombre,
            ausencias: conteo.ausencias,
            tardanzas: conteo.tardanzas,
            total: conteo.ausencias + conteo.tardanzas,
            cumpleCriterio: conteo.ausencias >= 3 || conteo.tardanzas >= 3
          })));
          
          // Crear un mapa de estudiantes que ya tienen incidencias de asistencia registradas
          // Consideramos incidencias de tipo "asistencia" registradas hoy o recientemente (últimos 7 días)
          const hoy = new Date();
          const hace7Dias = new Date(hoy);
          hace7Dias.setDate(hace7Dias.getDate() - 7);
          
          const estudiantesConIncidenciaRegistrada = new Set<string>();
          
          incidenciasData.forEach((inc: any) => {
            // Solo considerar incidencias de tipo "asistencia" (que son las relacionadas con ausencias/tardanzas)
            if (inc.tipo === 'asistencia') {
              const fechaIncidencia = new Date(inc.fecha);
              // Si la incidencia es de hoy o de los últimos 7 días
              if (fechaIncidencia >= hace7Dias) {
                const nombreEstudiante = inc.studentName?.trim();
                if (nombreEstudiante) {
                  // Normalizar el nombre para comparación (case-insensitive, sin espacios extra)
                  const nombreNormalizado = nombreEstudiante.toLowerCase().trim();
                  
                  // Verificar si la incidencia está resuelta (solo hay dos estados: Pendiente o Resuelta)
                  const estaResuelta = inc.resuelta === true || inc.estado === 'Resuelta';
                  
                  // Excluir al estudiante si tiene una incidencia (resuelta o no resuelta)
                  // Si está resuelta, el estudiante no debe aparecer porque el problema ya fue atendido
                  estudiantesConIncidenciaRegistrada.add(nombreNormalizado);
                  if (estaResuelta) {
                    console.log(`✅ Estudiante con incidencia de asistencia RESUELTA: ${nombreEstudiante} (fecha: ${inc.fecha}, estado: ${inc.estado}) - Excluido de notificaciones (problema ya resuelto)`);
                  } else {
                    console.log(`✅ Estudiante con incidencia de asistencia NO resuelta: ${nombreEstudiante} (fecha: ${inc.fecha}, estado: ${inc.estado}) - Excluido de notificaciones (incidencia pendiente)`);
                  }
                }
              }
            }
          });
          
          console.log('📋 Estudiantes con incidencia de asistencia ya registrada:', Array.from(estudiantesConIncidenciaRegistrada));
          
          // Filtrar estudiantes con 3 o más ausencias o tardanzas
          // Excluir estudiantes que ya tienen una incidencia de asistencia NO resuelta registrada recientemente
          // Si una incidencia está resuelta, el estudiante puede volver a aparecer si acumula 3+ ausencias/tardanzas
          
          const problemas = Object.entries(conteoPorEstudiante)
            .filter(([nombre, conteo]) => {
              // Validar que nombre y estudiante existan
              if (!nombre || !conteo.estudiante) {
                console.warn('⚠️ Estudiante sin nombre o datos completos, excluido:', { nombre, tieneEstudiante: !!conteo.estudiante });
                return false;
              }
              
              const tieneProblemas = conteo.ausencias >= 3 || conteo.tardanzas >= 3;
              if (tieneProblemas) {
                // Normalizar el nombre para comparación (case-insensitive, sin espacios extra)
                const nombreNormalizado = (nombre || '').toLowerCase().trim();
                const yaTieneIncidencia = estudiantesConIncidenciaRegistrada.has(nombreNormalizado);
                console.log('🔔 Estudiante con problemas:', nombre, { 
                  ausencias: conteo.ausencias, 
                  tardanzas: conteo.tardanzas,
                  yaTieneIncidenciaRegistrada: yaTieneIncidencia,
                  nombreNormalizado: nombreNormalizado
                });
                
                // Si ya tiene una incidencia de asistencia registrada recientemente, excluirlo
                // Esto evita mostrar notificaciones duplicadas para el mismo problema
                if (yaTieneIncidencia) {
                  console.log(`🔕 Estudiante excluido de notificaciones (ya tiene incidencia de asistencia registrada): ${nombre}`);
                  return false;
                }
              }
              return tieneProblemas;
            })
            .map(([nombre, conteo]) => ({
              nombre: nombre || 'Sin nombre',
              ausencias: conteo.ausencias,
              tardanzas: conteo.tardanzas,
              total: conteo.ausencias + conteo.tardanzas,
              estudiante: conteo.estudiante
            }))
            .filter(item => item.estudiante) // Filtrar cualquier elemento que no tenga estudiante
            .sort((a, b) => b.total - a.total);
          
          console.log('📊 Total estudiantes con problemas:', problemas.length);
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
        const [registrosAsistencia, estudiantes, tutores, incidencias] = await Promise.allSettled([
          fetchAsistenciaClases(),
          fetchEstudiantes(),
          fetchTutores(),
          fetchIncidencias()
        ]);
        
        // Manejar resultados exitosos o fallidos
        const registrosAsistenciaData = registrosAsistencia.status === 'fulfilled' ? registrosAsistencia.value : [];
        const estudiantesData = estudiantes.status === 'fulfilled' ? estudiantes.value : [];
        const tutoresData = tutores.status === 'fulfilled' ? tutores.value : [];
        const incidenciasData = incidencias.status === 'fulfilled' ? incidencias.value : [];
        
        // Si alguna petición falló, loguear pero continuar
        if (registrosAsistencia.status === 'rejected') {
          console.warn('⚠️ Error al obtener asistencia:', registrosAsistencia.reason);
        }
        if (estudiantes.status === 'rejected') {
          console.warn('⚠️ Error al obtener estudiantes:', estudiantes.reason);
        }
        if (tutores.status === 'rejected') {
          console.warn('⚠️ Error al obtener tutores:', tutores.reason);
        }
        if (incidencias.status === 'rejected') {
          console.warn('⚠️ Error al obtener incidencias:', incidencias.reason);
        }
        
        // Usar los contadores de la tabla Estudiante (más confiable y refleja cambios directos en BD)
        // Estos contadores se actualizan automáticamente cuando se guardan registros de asistencia
        const conteoPorEstudiante: Record<string, { ausencias: number; tardanzas: number; estudiante: any }> = {};
        
        estudiantesData.forEach((estudiante: any) => {
          // Validar que el estudiante exista y tenga datos válidos
          if (!estudiante) {
            console.warn('⚠️ Estudiante undefined/null encontrado, omitiendo');
            return;
          }
          
          const nombreCompleto = getNombreCompleto(estudiante);
          
          // Validar que el nombre completo sea válido (no undefined, null, o vacío)
          if (!nombreCompleto || nombreCompleto === 'Sin nombre' || nombreCompleto.trim() === '') {
            console.warn('⚠️ Estudiante sin nombre válido, omitiendo:', estudiante);
            return;
          }
          
          // Usar los contadores de la tabla Estudiante si están disponibles
          const ausencias = estudiante.ausencias ?? 0;
          const tardanzas = estudiante.tardanzas ?? 0;
          
          // Incluir todos los estudiantes, incluso si tienen 0 ausencias/tardanzas
          // para tener el objeto estudiante disponible
          conteoPorEstudiante[nombreCompleto] = {
            ausencias,
            tardanzas,
            estudiante: estudiante
          };
        });
        
        // Crear un mapa de estudiantes que ya tienen incidencias de asistencia registradas
        // Consideramos incidencias de tipo "asistencia" registradas hoy o recientemente (últimos 7 días)
        const hoy = new Date();
        const hace7Dias = new Date(hoy);
        hace7Dias.setDate(hace7Dias.getDate() - 7);
        
        const estudiantesConIncidenciaRegistrada = new Set<string>();
        
        incidenciasData.forEach((inc: any) => {
          // Solo considerar incidencias de tipo "asistencia" (que son las relacionadas con ausencias/tardanzas)
          if (inc.tipo === 'asistencia') {
            const fechaIncidencia = new Date(inc.fecha);
            // Si la incidencia es de hoy o de los últimos 7 días
            if (fechaIncidencia >= hace7Dias) {
              const nombreEstudiante = inc.studentName?.trim();
              if (nombreEstudiante) {
                // Normalizar el nombre para comparación (case-insensitive, sin espacios extra)
                const nombreNormalizado = nombreEstudiante.toLowerCase().trim();
                
                // Excluir al estudiante si tiene una incidencia (resuelta o no resuelta)
                // Si está resuelta, el estudiante no debe aparecer porque el problema ya fue atendido
                estudiantesConIncidenciaRegistrada.add(nombreNormalizado);
              }
            }
          }
        });
        
        // Filtrar estudiantes con 3 o más ausencias o tardanzas
        // Excluir estudiantes que ya tienen una incidencia de asistencia registrada recientemente (resuelta o no)
        // Si una incidencia está resuelta, el estudiante no aparece porque el problema ya fue atendido
        
        const problemas = Object.entries(conteoPorEstudiante)
          .filter(([nombre, conteo]) => {
            // Validar que nombre y estudiante existan
            if (!nombre || !conteo.estudiante) {
              console.warn('⚠️ Estudiante sin nombre o datos completos, excluido:', { nombre, tieneEstudiante: !!conteo.estudiante });
              return false;
            }
            
            const tieneProblemas = conteo.ausencias >= 3 || conteo.tardanzas >= 3;
            if (tieneProblemas) {
              // Normalizar el nombre para comparación (case-insensitive, sin espacios extra)
              const nombreNormalizado = (nombre || '').toLowerCase().trim();
              const yaTieneIncidencia = estudiantesConIncidenciaRegistrada.has(nombreNormalizado);
              console.log('🔔 Estudiante con problemas:', nombre, { 
                ausencias: conteo.ausencias, 
                tardanzas: conteo.tardanzas,
                yaTieneIncidenciaRegistrada: yaTieneIncidencia,
                nombreNormalizado: nombreNormalizado
              });
              
              // Si ya tiene una incidencia de asistencia registrada recientemente, excluirlo
              // Esto evita mostrar notificaciones duplicadas para el mismo problema
              if (yaTieneIncidencia) {
                console.log(`🔕 Estudiante excluido de notificaciones (ya tiene incidencia de asistencia registrada): ${nombre}`);
                return false;
              }
            }
            return tieneProblemas;
          })
          .map(([nombre, conteo]) => ({
            nombre: nombre || 'Sin nombre',
            ausencias: conteo.ausencias,
            tardanzas: conteo.tardanzas,
            total: conteo.ausencias + conteo.tardanzas,
            estudiante: conteo.estudiante
          }))
          .filter(item => item.estudiante) // Filtrar cualquier elemento que no tenga estudiante
          .sort((a, b) => b.total - a.total);
        
        console.log('📊 Total estudiantes con problemas:', problemas.length);
        console.log('📋 Lista de estudiantes con problemas:', problemas.map(p => p.nombre));
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
  }, [isProfesor]);

  // Cargar notificaciones del director cuando estemos en la página del director
  useEffect(() => {
    if (isDirector && typeof window !== 'undefined') {
      const actualizarNotificaciones = async () => {
        try {
          // PRIMERO cargar incidencias vistas desde la BASE DE DATOS
          // Esta función llama a /api/incidencias-vistas que consulta la tabla IncidenciaVista con Prisma
          let idsVistas: string[] = [];
          try {
            console.log('🔍 [Navbar] Consultando base de datos para incidencias vistas...');
            idsVistas = await getIncidenciasVistas('director'); // ← LLAMADA A LA BASE DE DATOS
            console.log('✅ [Navbar] IDs vistas desde BD:', idsVistas.length, idsVistas);
            setIncidenciasVistas(new Set(idsVistas)); // Actualizar estado para futuras operaciones
          } catch (error) {
            console.error('❌ [Navbar] Error cargando incidencias vistas desde BD:', error);
          }
          
          // Crear Set local temporal (solo en memoria) para usar en el filtro inmediatamente
          // Esto evita problemas de timing con el estado de React
          const setVistas = new Set(idsVistas); // ← Datos que vienen de la BASE DE DATOS
          
          // Luego cargar incidencias desde la base de datos
          const todasIncidencias = await fetchIncidencias();
          console.log(`📊 [Navbar] Total incidencias cargadas: ${todasIncidencias.length}`);
          
          // Obtener nuevas incidencias (no vistas) usando el Set que acabamos de crear
          const noVistas = todasIncidencias
            .filter((inc: any) => {
              const tieneId = !!inc.id;
              const noEstaVista = !setVistas.has(inc.id);
              if (!tieneId) {
                console.log(`⚠️ [Navbar] Incidencia sin ID encontrada:`, inc);
              }
              return tieneId && noEstaVista;
            })
            .sort((a: any, b: any) => {
              const fechaA = new Date(a.timestamp || a.fecha || 0).getTime();
              const fechaB = new Date(b.timestamp || b.fecha || 0).getTime();
              return fechaB - fechaA; // Más recientes primero
            })
            .slice(0, 10); // Máximo 10 notificaciones
          
          console.log(`✅ [Navbar] Incidencias no vistas encontradas: ${noVistas.length}`);
          noVistas.forEach((inc: any) => {
            console.log(`  - ID: ${inc.id}, Estudiante: ${inc.studentName}, Fecha: ${inc.fecha}`);
          });
          
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
        console.log(`🔔 [Navbar] Evento incidenciaRegistrada recibido con ID:`, nuevaId);
        if (nuevaId && typeof nuevaId === 'string') {
          console.log(`✅ [Navbar] Actualizando notificaciones después de nueva incidencia...`);
          setTimeout(() => {
            setRefreshKeyDirector(prev => prev + 1);
            actualizarNotificaciones();
          }, 200);
        } else {
          console.warn(`⚠️ [Navbar] ID de incidencia inválido o faltante:`, nuevaId);
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
      marcarIncidenciaVista(incidenciaId, 'director').catch(error => {
        console.error('Error guardando incidencia vista:', error);
      });
      return nuevoSet;
    });
    // Disparar evento para que la página del director se actualice
    window.dispatchEvent(new CustomEvent('incidenciaMarcadaComoVista', { detail: { id: incidenciaId } }));
  };

  // Marcar todas como vistas
  const marcarTodasComoVistas = async () => {
    const todasIds = nuevasIncidencias
      .map((inc: any) => inc.id)
      .filter((id: any) => id && typeof id === 'string' && id.trim() !== '');
    try {
      await marcarIncidenciasVistas(todasIds, 'director');
      setIncidenciasVistas(prev => new Set([...prev, ...todasIds]));
      // Disparar evento para que la página del director se actualice
      window.dispatchEvent(new CustomEvent('todasIncidenciasMarcadasComoVistas'));
    } catch (error) {
      console.error('Error guardando incidencias vistas:', error);
    }
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

  const handleRegistrarIncidencia = async (nombreEstudiante: string) => {
    // Encontrar los datos del estudiante con problemas
    const estudianteProblema = estudiantesConProblemas.find(e => {
      if (!e.estudiante) return false;
      return getNombreCompleto(e.estudiante) === nombreEstudiante || e.nombre === nombreEstudiante;
    });
    
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
    
    // Remover el estudiante de la lista inmediatamente (antes de guardar)
    // Esto hace que desaparezca de las notificaciones de inmediato
    setEstudiantesConProblemas(prev => prev.filter(e => {
      if (!e.estudiante) return true; // Mantener elementos sin estudiante (serán filtrados después)
      const nombreCompleto = getNombreCompleto(e.estudiante);
      return nombreCompleto !== nombreEstudiante && e.nombre !== nombreEstudiante;
    }));
    
    // Guardar los datos de prellenado en la base de datos
    await savePrellenadoIncidencia({
      estudiante: nombreEstudiante,
      tipo: tipoIncidencia,
      gravedad: gravedadIncidencia
    });
    
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
                                  {(() => {
                                    if (incidencia.timestamp) {
                                      const fecha = new Date(incidencia.timestamp);
                                      return fecha.toLocaleString('es-ES', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      });
                                    }
                                    if (incidencia.fecha) {
                                      // Si la fecha incluye hora (formato ISO)
                                      const fecha = new Date(incidencia.fecha);
                                      if (!isNaN(fecha.getTime())) {
                                        return fecha.toLocaleString('es-ES', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        });
                                      }
                                      // Si solo es fecha sin hora, mostrar fecha y hora actual o por defecto
                                      return `${incidencia.fecha} - Sin hora`;
                                    }
                                    return 'Sin fecha';
                                  })()}
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
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Estudiantes que requieren atención</h3>
                      <p className="text-xs text-gray-500 mt-1">Con 3 o más ausencias o tardanzas</p>
                    </div>
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
                      <p>No hay estudiantes con 3 o más ausencias o tardanzas</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {estudiantesConProblemas
                        .filter(item => item.estudiante) // Filtrar elementos sin estudiante
                        .map((item) => {
                          const nombreCompleto = item.estudiante ? getNombreCompleto(item.estudiante) : item.nombre;
                          return (
                            <div key={nombreCompleto} className="p-4 hover:bg-gray-50 transition-colors border-l-4 border-l-red-500">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{nombreCompleto}</p>
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
                                  <p className="text-xs text-red-600 font-medium mt-2">
                                    ⚠️ Se recomienda registrar una incidencia
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="ml-2 bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                                  onClick={() => handleRegistrarIncidencia(nombreCompleto)}
                                >
                                  Registrar Incidencia
                                </Button>
                              </div>
                            </div>
                          );
                        })}
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

