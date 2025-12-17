'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Sparkles, User, AlertCircle, CheckCircle, Calendar, BarChart3, AlertTriangle, CheckCircle2, X, Eye, Trophy, BookOpen, Phone, Mail, GraduationCap, Brain, Heart, Users, FileText } from 'lucide-react';
import { getIncidenciasByDateRange, getIncidenciasDerivadas, getListaEstudiantes, getIncidenciasCompletasByStudent, marcarIncidenciaResuelta, seedInitialData, getNotasByStudent, getEstudianteInfo, getIncidencias, getIncidenciasByGravedad, getIncidenciasByFiltros } from '@/lib/storage';
import { Incidencia, ReporteIA, TipoDerivacion, Gravedad, TipoIncidencia } from '@/lib/types';
import { getTipoColor, getTipoLabel, getGravedadColor, getGravedadLabel } from '@/lib/utils';

// Función para formatear el texto del reporte
function formatReportText(text: string): string {
  // Convertir markdown básico a HTML
  let formatted = text
    // Títulos con ##
    .replace(/##\s+(.+)/g, '<h3 class="font-semibold text-lg mt-4 mb-2 text-gray-900">$1</h3>')
    // Negritas con **
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    // Listas numeradas
    .replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 mb-1">$1</li>')
    // Saltos de línea dobles (párrafos)
    .split('\n\n')
    .map(para => para.trim())
    .filter(para => para.length > 0)
    .map(para => {
      // Si ya tiene etiquetas HTML, no agregar <p>
      if (para.startsWith('<')) {
        return para;
      }
      return `<p class="mb-3">${para}</p>`;
    })
    .join('');

  // Envolver listas
  formatted = formatted.replace(/(<li[\s\S]*?<\/li>)/g, '<ul class="list-disc ml-6 mb-3 space-y-1">$1</ul>');

  return formatted;
}

export default function DirectorPage() {
  // Estados para incidencias derivadas
  const [incidenciasDerivadas, setIncidenciasDerivadas] = useState<Incidencia[]>([]);
  const [filtroDerivacion, setFiltroDerivacion] = useState<TipoDerivacion | 'todas'>('todas');
  const [activeTab, setActiveTab] = useState<'derivadas' | 'estudiantes' | 'general' | 'incidencias'>('derivadas');
  
  // Estados para listado de incidencias
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [filtroGravedad, setFiltroGravedad] = useState<Gravedad | 'todas'>('todas');
  const [filtroTipo, setFiltroTipo] = useState<TipoIncidencia | 'todas'>('todas');
  
  // Estados para lista de estudiantes
  const [listaEstudiantes, setListaEstudiantes] = useState<Array<{ nombre: string; totalIncidencias: number; ultimaIncidencia: string }>>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [incidenciasEstudiante, setIncidenciasEstudiante] = useState<Incidencia[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reporte, setReporte] = useState<ReporteIA | null>(null);
  const [mostrarNotas, setMostrarNotas] = useState(false);
  
  // Estados para reporte general
  const [showGeneralReport, setShowGeneralReport] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [incidenciasGenerales, setIncidenciasGenerales] = useState<Incidencia[]>([]);
  const [generatingGeneralReport, setGeneratingGeneralReport] = useState(false);
  const [reporteGeneral, setReporteGeneral] = useState<ReporteIA | null>(null);

  useEffect(() => {
    seedInitialData();
    loadIncidenciasDerivadas();
    loadListaEstudiantes();
    loadIncidencias();
  }, []);

  const loadIncidencias = () => {
    const todas = getIncidenciasByFiltros(filtroGravedad, filtroTipo);
    setIncidencias(todas);
  };

  useEffect(() => {
    loadIncidencias();
  }, [filtroGravedad, filtroTipo]);

  const loadIncidenciasDerivadas = () => {
    const tipoFiltro = filtroDerivacion === 'todas' ? undefined : filtroDerivacion;
    const derivadas = getIncidenciasDerivadas(tipoFiltro);
    console.log('Incidencias derivadas cargadas:', derivadas.length, derivadas);
    setIncidenciasDerivadas(derivadas);
  };

  useEffect(() => {
    loadIncidenciasDerivadas();
  }, [filtroDerivacion]);

  const loadListaEstudiantes = () => {
    const estudiantes = getListaEstudiantes();
    setListaEstudiantes(estudiantes);
  };

  const handleMarcarResuelta = (id: string, resueltaPor: string = 'Director') => {
    marcarIncidenciaResuelta(id, resueltaPor);
    loadIncidenciasDerivadas();
    // Si estamos viendo un estudiante, recargar sus incidencias
    if (selectedStudent) {
      const incidencias = getIncidenciasCompletasByStudent(selectedStudent);
      setIncidenciasEstudiante(incidencias);
    }
  };

  const handleVerPerfil = (nombreEstudiante: string) => {
    setSelectedStudent(nombreEstudiante);
    const incidencias = getIncidenciasCompletasByStudent(nombreEstudiante);
    setIncidenciasEstudiante(incidencias);
    setReporte(null); // Limpiar reporte anterior
  };

  const handleVolverALista = () => {
    setSelectedStudent(null);
    setIncidenciasEstudiante([]);
    setReporte(null);
    loadListaEstudiantes();
  };

  const handleGenerateReport = async () => {
    if (!selectedStudent || incidenciasEstudiante.length === 0) return;

    setGeneratingReport(true);
    setReporte(null);

    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentName: selectedStudent,
          incidencias: incidenciasEstudiante.map(inc => ({
            tipo: inc.tipo,
            descripcion: inc.descripcion,
            fecha: inc.fecha,
            profesor: inc.profesor,
            derivada: inc.derivacion && inc.derivacion !== 'ninguna',
            resuelta: inc.resuelta,
          })),
          reportType: 'individual',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || 'Error al generar el reporte';
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setReporte(data);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al generar el reporte. Verifica que la API key esté configurada.';
      alert(errorMessage);
    } finally {
      setGeneratingReport(false);
    }
  };

  // Función para filtrar por fechas
  const handleFilterByDate = () => {
    if (!fechaInicio || !fechaFin) {
      alert('Por favor selecciona ambas fechas');
      return;
    }

    const filtered = getIncidenciasByDateRange(fechaInicio, fechaFin);
    setIncidenciasGenerales(filtered);
    setShowGeneralReport(true);
    setReporteGeneral(null); // Limpiar reporte anterior cuando se filtran nuevas fechas
  };

  const generateGeneralReport = async (incidenciasData: Incidencia[]) => {
    if (incidenciasData.length === 0) return;

    setGeneratingGeneralReport(true);
    setReporteGeneral(null);

    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentName: 'Reporte General',
          incidencias: incidenciasData.map(inc => ({
            tipo: inc.tipo,
            descripcion: inc.descripcion,
            fecha: inc.fecha,
            profesor: inc.profesor,
            studentName: inc.studentName, // Agregar studentName para reportes generales
          })),
          isGeneral: true,
          fechaInicio: fechaInicio,
          fechaFin: fechaFin,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || 'Error al generar el reporte';
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setReporteGeneral(data);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al generar el reporte. Verifica que la API key esté configurada.';
      alert(errorMessage);
    } finally {
      setGeneratingGeneralReport(false);
    }
  };

  // Calcular estadísticas generales
  const getGeneralStats = (incidencias: Incidencia[]) => {
    const total = incidencias.length;
    const porTipo = {
      ausencia: incidencias.filter(i => i.tipo === 'ausencia').length,
      conducta: incidencias.filter(i => i.tipo === 'conducta').length,
      academica: incidencias.filter(i => i.tipo === 'academica').length,
      positivo: incidencias.filter(i => i.tipo === 'positivo').length,
    };
    const estudiantesUnicos = new Set(incidencias.map(i => i.studentName)).size;
    
    return { total, porTipo, estudiantesUnicos };
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
            setSelectedStudent(null);
            setReporte(null);
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
      </div>

      {/* Incidencias Derivadas Tab */}
      {activeTab === 'derivadas' && (
        <div className="space-y-6">
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
                            <Badge className={getTipoColor(inc.tipo)}>
                              {getTipoLabel(inc.tipo)}
                            </Badge>
                            <span className="text-sm font-semibold text-gray-900">{inc.studentName}</span>
                          </div>
                          <p className="text-sm text-gray-900 mb-2">{inc.descripcion}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-900">
                            <span>📅 {inc.fecha}</span>
                            <span>👤 {inc.profesor}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleMarcarResuelta(inc.id)}
                          className="ml-4"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Marcar Resuelta
                        </Button>
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

      {/* Lista de Estudiantes Tab */}
      {activeTab === 'estudiantes' && !selectedStudent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900">
              <User className="h-5 w-5 text-primary" />
              Lista de Estudiantes
            </CardTitle>
            <CardDescription className="text-sm text-gray-900">
              {listaEstudiantes.length} {listaEstudiantes.length === 1 ? 'estudiante registrado' : 'estudiantes registrados'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {listaEstudiantes.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-sm font-semibold">Estudiante</TableHead>
                      <TableHead className="text-sm font-semibold">Total Incidencias</TableHead>
                      <TableHead className="text-sm font-semibold">Última Incidencia</TableHead>
                      <TableHead className="text-sm font-semibold text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listaEstudiantes.map((estudiante) => (
                      <TableRow key={estudiante.nombre} className="hover:bg-gray-50">
                        <TableCell className="font-medium text-gray-900">{estudiante.nombre}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-semibold">
                            {estudiante.totalIncidencias}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-900">{estudiante.ultimaIncidencia || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleVerPerfil(estudiante.nombre)}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Ver Perfil
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
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
      {activeTab === 'estudiantes' && selectedStudent && (() => {
        const estudianteInfo = getEstudianteInfo(selectedStudent);
        const notas = getNotasByStudent(selectedStudent);
        const promedioGeneral = notas.length > 0 
          ? (notas.reduce((sum, n) => sum + n.nota, 0) / notas.length).toFixed(1)
          : 'N/A';
        
        return (
        <div className="space-y-6">
          {/* Información del Estudiante */}
          {estudianteInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900">
                  <User className="h-5 w-5 text-primary" />
                  Información del Estudiante
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Grado y Sección</p>
                    <p className="text-lg text-gray-900">{estudianteInfo.grado} - {estudianteInfo.seccion}</p>
                  </div>
                  {estudianteInfo.edad && (
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Edad</p>
                      <p className="text-lg text-gray-900">{estudianteInfo.edad} años</p>
                    </div>
                  )}
                  {estudianteInfo.contacto?.telefono && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-900" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Teléfono</p>
                        <p className="text-sm text-gray-900">{estudianteInfo.contacto.telefono}</p>
                      </div>
                    </div>
                  )}
                  {estudianteInfo.contacto?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-900" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Email</p>
                        <p className="text-sm text-gray-900">{estudianteInfo.contacto.email}</p>
                      </div>
                    </div>
                  )}
                  {estudianteInfo.contacto?.tutor && (
                    <div className="sm:col-span-2">
                      <p className="text-sm font-semibold text-gray-900">Tutor/Responsable</p>
                      <p className="text-sm text-gray-900">{estudianteInfo.contacto.tutor}</p>
                    </div>
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
                    Perfil de {selectedStudent}
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
                const stats = getGeneralStats(incidenciasEstudiante);
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                      <p className="text-xs text-gray-900 font-medium">Total</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-2xl font-bold text-gray-900">{stats.porTipo.ausencia}</p>
                      <p className="text-xs text-gray-900 font-medium">Ausencias</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-2xl font-bold text-gray-900">{stats.porTipo.conducta}</p>
                      <p className="text-xs text-gray-900 font-medium">Conducta</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-2xl font-bold text-gray-900">{stats.porTipo.positivo}</p>
                      <p className="text-xs text-gray-900 font-medium">Positivos</p>
                    </div>
                  </div>
                );
              })()}

              {/* Tabla de Incidencias */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Historial de Incidencias</h3>
                <div className="overflow-x-auto -mx-6 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-6 sm:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">Fecha</TableHead>
                          <TableHead className="text-xs sm:text-sm">Tipo</TableHead>
                          <TableHead className="text-xs sm:text-sm">Descripción</TableHead>
                          <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Profesor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incidenciasEstudiante.map((inc) => (
                          <TableRow key={inc.id}>
                            <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">{inc.fecha}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge className={`${getTipoColor(inc.tipo)} text-xs`}>
                                {getTipoLabel(inc.tipo)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm max-w-xs sm:max-w-none">{inc.descripcion}</TableCell>
                            <TableCell className="text-gray-900 text-xs sm:text-sm hidden sm:table-cell">{inc.profesor}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              {/* Botón para Generar Reporte */}
              <div className="flex justify-center">
                <Button
                  onClick={handleGenerateReport}
                  disabled={generatingReport || incidenciasEstudiante.length === 0}
                  size="lg"
                  className="gap-2"
                >
                  {generatingReport ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generando Análisis...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Generar Análisis con IA
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Reporte Generado */}
          {generatingReport && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 !text-gray-900">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Generando Análisis...
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

          {reporte && !generatingReport && (
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Análisis Generado por IA
                </CardTitle>
                <CardDescription className="text-gray-900">
                  Generado el {new Date(reporte.timestamp).toLocaleString('es-ES')}
                  {reporte.truncated && (
                    <span className="ml-2 text-amber-600 font-medium">
                      ⚠️ El reporte fue truncado por límite de longitud
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-gray-900 leading-relaxed">
                  <div 
                    className="space-y-2"
                    dangerouslySetInnerHTML={{
                      __html: formatReportText(reporte.report)
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sección de Notas */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Reporte de Notas
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-900 mt-1">
                    Promedio General: <span className="font-semibold text-gray-900">{promedioGeneral}</span>
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setMostrarNotas(!mostrarNotas)}
                >
                  {mostrarNotas ? (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Ocultar
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Notas
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            {mostrarNotas && (
              <CardContent>
                {notas.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">Materia</TableHead>
                          <TableHead className="text-xs sm:text-sm">Período</TableHead>
                          <TableHead className="text-xs sm:text-sm">Nota</TableHead>
                          <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Profesor</TableHead>
                          <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Comentario</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {notas.map((nota) => (
                          <TableRow key={nota.id}>
                            <TableCell className="font-medium text-xs sm:text-sm">{nota.materia}</TableCell>
                            <TableCell className="text-xs sm:text-sm">
                              <Badge variant="outline">{nota.periodo}</Badge>
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">
                              <span className={`font-bold ${
                                nota.nota >= 90 ? 'text-primary' :
                                nota.nota >= 80 ? 'text-gray-900' :
                                nota.nota >= 70 ? 'text-gray-700' :
                                'text-gray-900'
                              }`}>
                                {nota.nota}
                              </span>
                            </TableCell>
                            <TableCell className="text-gray-900 text-xs sm:text-sm hidden sm:table-cell">{nota.profesor}</TableCell>
                            <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{nota.comentario || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-900">No hay notas registradas para este estudiante</p>
                    <p className="text-sm text-gray-900 mt-2">Las notas se cargarán próximamente</p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
        );
      })()}

      {/* Incidencias Tab */}
      {activeTab === 'incidencias' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl !text-gray-900">
                  <FileText className="h-5 w-5 text-primary" />
                  Filtrar por Gravedad
                </CardTitle>
                <CardDescription className="text-gray-900">
                  Selecciona la gravedad para filtrar las incidencias.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={filtroGravedad === 'todas' ? 'default' : 'outline'}
                    onClick={() => setFiltroGravedad('todas')}
                    size="sm"
                  >
                    Todas ({getIncidencias().length})
                  </Button>
                  <Button
                    variant={filtroGravedad === 'grave' ? 'default' : 'outline'}
                    onClick={() => setFiltroGravedad('grave')}
                    size="sm"
                    className={filtroGravedad === 'grave' ? `${getGravedadColor('grave')} text-white` : ''}
                  >
                    {getGravedadLabel('grave')} ({getIncidenciasByGravedad('grave').length})
                  </Button>
                  <Button
                    variant={filtroGravedad === 'moderada' ? 'default' : 'outline'}
                    onClick={() => setFiltroGravedad('moderada')}
                    size="sm"
                    className={filtroGravedad === 'moderada' ? `${getGravedadColor('moderada')} text-white` : ''}
                  >
                    {getGravedadLabel('moderada')} ({getIncidenciasByGravedad('moderada').length})
                  </Button>
                  <Button
                    variant={filtroGravedad === 'leve' ? 'default' : 'outline'}
                    onClick={() => setFiltroGravedad('leve')}
                    size="sm"
                    className={filtroGravedad === 'leve' ? `${getGravedadColor('leve')} text-white` : ''}
                  >
                    {getGravedadLabel('leve')} ({getIncidenciasByGravedad('leve').length})
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl !text-gray-900">
                  <FileText className="h-5 w-5 text-primary" />
                  Filtrar por Tipo
                </CardTitle>
                <CardDescription className="text-gray-900">
                  Selecciona el tipo de incidencia para filtrar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={filtroTipo === 'todas' ? 'default' : 'outline'}
                    onClick={() => setFiltroTipo('todas')}
                    size="sm"
                  >
                    Todas ({getIncidencias().length})
                  </Button>
                  <Button
                    variant={filtroTipo === 'ausencia' ? 'default' : 'outline'}
                    onClick={() => setFiltroTipo('ausencia')}
                    size="sm"
                    className={filtroTipo === 'ausencia' ? `${getTipoColor('ausencia')} text-white` : ''}
                  >
                    {getTipoLabel('ausencia')} ({getIncidenciasByFiltros('todas', 'ausencia').length})
                  </Button>
                  <Button
                    variant={filtroTipo === 'conducta' ? 'default' : 'outline'}
                    onClick={() => setFiltroTipo('conducta')}
                    size="sm"
                    className={filtroTipo === 'conducta' ? `${getTipoColor('conducta')} text-white` : ''}
                  >
                    {getTipoLabel('conducta')} ({getIncidenciasByFiltros('todas', 'conducta').length})
                  </Button>
                  <Button
                    variant={filtroTipo === 'academica' ? 'default' : 'outline'}
                    onClick={() => setFiltroTipo('academica')}
                    size="sm"
                    className={filtroTipo === 'academica' ? `${getTipoColor('academica')} text-white` : ''}
                  >
                    {getTipoLabel('academica')} ({getIncidenciasByFiltros('todas', 'academica').length})
                  </Button>
                  <Button
                    variant={filtroTipo === 'positivo' ? 'default' : 'outline'}
                    onClick={() => setFiltroTipo('positivo')}
                    size="sm"
                    className={filtroTipo === 'positivo' ? `${getTipoColor('positivo')} text-white` : ''}
                  >
                    {getTipoLabel('positivo')} ({getIncidenciasByFiltros('todas', 'positivo').length})
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {incidencias.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl !text-gray-900">
                  <FileText className="h-5 w-5 text-primary" />
                  Listado de Incidencias
                </CardTitle>
                <CardDescription className="text-gray-900">
                  {incidencias.length} {incidencias.length === 1 ? 'incidencia encontrada' : 'incidencias encontradas'}
                  {(filtroGravedad !== 'todas' || filtroTipo !== 'todas') && (
                    <>
                      {filtroGravedad !== 'todas' && ` - Gravedad: ${getGravedadLabel(filtroGravedad as Gravedad)}`}
                      {filtroTipo !== 'todas' && ` - Tipo: ${getTipoLabel(filtroTipo as TipoIncidencia)}`}
                    </>
                  )}
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
                      {incidencias.map((inc) => (
                        <TableRow key={inc.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">{inc.fecha}</TableCell>
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
                              <Badge className="bg-destructive text-white">Pendiente</Badge>
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
            <Card>
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
          )}
        </div>
      )}

      {/* Reporte General Tab */}
      {activeTab === 'general' && (
        <>
          <Card className="mb-6 sm:mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl !text-gray-900">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                Reporte General por Fechas
              </CardTitle>
              <CardDescription className="text-sm text-gray-900">
                Filtra incidencias por rango de fechas y genera un reporte general con IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-900 block mb-1">Desde</label>
                  <Input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-900 block mb-1">Hasta</label>
                  <Input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                💡 Sugerencia: Para ver datos de ejemplo, usa fechas entre 2024-12-01 y 2024-12-31
              </p>
              <Button
                onClick={handleFilterByDate}
                className="w-full"
                disabled={!fechaInicio || !fechaFin}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Generar Reporte General
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* Reporte General Section */}
      {showGeneralReport && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900">
                    <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    Reporte General
                  </CardTitle>
                  <CardDescription className="text-sm mt-1 text-gray-900">
                    Período: {fechaInicio} al {fechaFin}
                    {generatingGeneralReport && (
                      <span className="ml-2 inline-flex items-center gap-1 text-primary">
                        <Sparkles className="h-3 w-3 animate-pulse" />
                        Generando análisis con IA...
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowGeneralReport(false);
                    setFechaInicio('');
                    setFechaFin('');
                    setReporteGeneral(null);
                  }}
                >
                  Cerrar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {incidenciasGenerales.length > 0 ? (
                <>
                  {/* Estadísticas */}
                  {(() => {
                    const stats = getGeneralStats(incidenciasGenerales);
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                          <p className="text-xs text-gray-900 font-medium">Total</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <p className="text-2xl font-bold text-gray-900">{stats.porTipo.ausencia}</p>
                          <p className="text-xs text-gray-900 font-medium">Ausencias</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <p className="text-2xl font-bold text-gray-900">{stats.porTipo.conducta}</p>
                          <p className="text-xs text-gray-900 font-medium">Conducta</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <p className="text-2xl font-bold text-gray-900">{stats.porTipo.academica}</p>
                          <p className="text-xs text-gray-900 font-medium">Académicas</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <p className="text-2xl font-bold text-gray-900">{stats.porTipo.positivo}</p>
                          <p className="text-xs text-gray-900 font-medium">Positivos</p>
                        </div>
                      </div>
                    );
                  })()}

                  <p className="text-sm text-gray-900 mb-6">
                    <strong>{getGeneralStats(incidenciasGenerales).estudiantesUnicos}</strong> estudiantes únicos en este período
                  </p>

                  {/* Gráficos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Gráfico de Barras - Por Tipo */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base text-gray-900">Distribución por Tipo</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const stats = getGeneralStats(incidenciasGenerales);
                          const maxValue = Math.max(...Object.values(stats.porTipo), 1);
                          const tipos = [
                            { key: 'ausencia', label: 'Ausencias', color: 'bg-orange-500' },
                            { key: 'conducta', label: 'Conducta', color: 'bg-red-600' },
                            { key: 'academica', label: 'Académicas', color: 'bg-blue-600' },
                            { key: 'positivo', label: 'Positivos', color: 'bg-green-600' },
                          ];
                          return (
                            <div className="space-y-3">
                              {tipos.map((tipo) => {
                                const value = stats.porTipo[tipo.key as keyof typeof stats.porTipo];
                                const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
                                return (
                                  <div key={tipo.key}>
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-sm text-gray-900 font-medium">{tipo.label}</span>
                                      <span className="text-sm text-gray-900 font-bold">{value}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                                      <div
                                        className={`${tipo.color} h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                                        style={{ width: `${percentage}%` }}
                                      >
                                        {percentage > 10 && (
                                          <span className="text-xs text-white font-medium">{Math.round(percentage)}%</span>
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

                    {/* Gráfico de Barras - Por Gravedad */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base text-gray-900">Distribución por Gravedad</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const porGravedad = {
                            grave: incidenciasGenerales.filter(i => i.gravedad === 'grave').length,
                            moderada: incidenciasGenerales.filter(i => i.gravedad === 'moderada').length,
                            leve: incidenciasGenerales.filter(i => i.gravedad === 'leve').length,
                          };
                          const maxValue = Math.max(...Object.values(porGravedad), 1);
                          const gravedades = [
                            { key: 'grave', label: 'Grave', color: 'bg-red-600' },
                            { key: 'moderada', label: 'Moderada', color: 'bg-blue-500' },
                            { key: 'leve', label: 'Leve', color: 'bg-green-600' },
                          ];
                          return (
                            <div className="space-y-3">
                              {gravedades.map((g) => {
                                const value = porGravedad[g.key as keyof typeof porGravedad];
                                const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
                                return (
                                  <div key={g.key}>
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-sm text-gray-900 font-medium">{g.label}</span>
                                      <span className="text-sm text-gray-900 font-bold">{value}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                                      <div
                                        className={`${g.color} h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                                        style={{ width: `${percentage}%` }}
                                      >
                                        {percentage > 10 && (
                                          <span className="text-xs text-white font-medium">{Math.round(percentage)}%</span>
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

                  {/* Tabla de incidencias */}
                  <div className="overflow-x-auto -mx-6 sm:mx-0">
                    <div className="inline-block min-w-full align-middle px-6 sm:px-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm">Fecha</TableHead>
                            <TableHead className="text-xs sm:text-sm">Estudiante</TableHead>
                            <TableHead className="text-xs sm:text-sm">Tipo</TableHead>
                            <TableHead className="text-xs sm:text-sm">Descripción</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Profesor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {incidenciasGenerales.map((inc) => (
                            <TableRow key={inc.id}>
                              <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">{inc.fecha}</TableCell>
                              <TableCell className="text-xs sm:text-sm font-medium">{inc.studentName}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                <Badge className={`${getTipoColor(inc.tipo)} text-xs`}>
                                  {getTipoLabel(inc.tipo)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm max-w-xs sm:max-w-none">{inc.descripcion}</TableCell>
                              <TableCell className="text-gray-900 text-xs sm:text-sm hidden sm:table-cell">{inc.profesor}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center text-gray-900 py-8">
                  No hay incidencias en el rango de fechas seleccionado
                </p>
              )}
              
              {/* Botón para Generar Análisis con IA */}
              {incidenciasGenerales.length > 0 && !generatingGeneralReport && !reporteGeneral && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <Button
                    onClick={() => generateGeneralReport(incidenciasGenerales)}
                    size="lg"
                    className="w-full gap-2"
                  >
                    <Sparkles className="h-5 w-5" />
                    Generar Análisis con IA
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reporte General con IA */}
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

          {reporteGeneral && !generatingGeneralReport && (
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Análisis General Generado por IA
                </CardTitle>
                <CardDescription>
                  Generado el {new Date(reporteGeneral.timestamp).toLocaleString('es-ES')}
                  {reporteGeneral.truncated && (
                    <span className="ml-2 text-amber-600 font-medium">
                      ⚠️ El reporte fue truncado por límite de longitud
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-gray-900 leading-relaxed">
                  <div 
                    className="space-y-2"
                    dangerouslySetInnerHTML={{
                      __html: formatReportText(reporteGeneral.report)
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

