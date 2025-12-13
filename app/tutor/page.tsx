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
import { addIncidencia, getIncidencias, seedInitialData, getEstudiantesByGrado, getEstudiantesInfo, getTutores } from '@/lib/storage';
import { TipoIncidencia, Incidencia, TipoDerivacion, SubtipoConducta, SubtipoPositivo, EstudianteInfo, Gravedad } from '@/lib/types';
import { getTipoColor, getTipoLabel } from '@/lib/utils';

type ViewMode = 'lista' | 'asistencia' | 'incidencia';

export default function TutorPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('lista');
  const [selectedStudent, setSelectedStudent] = useState<EstudianteInfo | null>(null);
  const [filtroGrado, setFiltroGrado] = useState<string>('todos');
  const [filtroNombre, setFiltroNombre] = useState<string>('');
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
    derivacion: 'ninguna' as TipoDerivacion,
  });

  const estudiantes = getEstudiantesInfo();
  const tutores = getTutores();
  const gradosUnicos = [...new Set(estudiantes.map(e => e.grado))].sort();

  useEffect(() => {
    seedInitialData();
  }, []);

  // Filtrar estudiantes
  const estudiantesFiltrados = estudiantes.filter(est => {
    const matchGrado = !filtroGrado || filtroGrado === 'todos' || est.grado === filtroGrado;
    const matchNombre = !filtroNombre || est.nombre.toLowerCase().includes(filtroNombre.toLowerCase());
    return matchGrado && matchNombre;
  });

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

    setLoading(true);
    
    try {
      addIncidencia({
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
      });
      
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
      agresion: 'Agresión',
      falta_respeto: 'Falta de Respeto',
      interrupcion: 'Interrupción',
      desobediencia: 'Desobediencia',
      ayuda_companero: 'Ayuda a Compañero',
      participacion: 'Participación Destacada',
      liderazgo: 'Liderazgo',
      creatividad: 'Creatividad',
      otra: 'Otra',
      otro: 'Otro',
    };
    return labels[subtipo] || subtipo;
  };

  // Vista de Lista de Estudiantes
  if (viewMode === 'lista') {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              Lista de Estudiantes
            </h1>
            <p className="text-sm sm:text-base text-gray-900 mt-1">Selecciona un estudiante para registrar asistencia o incidencias</p>
          </div>
          <Button variant="outline" onClick={() => router.push('/director')} className="w-full sm:w-auto">
            <Eye className="h-4 w-4 mr-2" />
            Ver Dashboard Director
          </Button>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl !text-gray-900">Filtros de Búsqueda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900">Filtrar por Grado</label>
                <Select value={filtroGrado} onValueChange={setFiltroGrado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los grados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los grados</SelectItem>
                    {gradosUnicos.map(grado => (
                      <SelectItem key={grado} value={grado}>{grado}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-900">Buscar por Nombre</label>
                <Input
                  placeholder="Ej: Juan Pérez"
                  value={filtroNombre}
                  onChange={(e) => setFiltroNombre(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Estudiantes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl !text-gray-900">
              Estudiantes ({estudiantesFiltrados.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {estudiantesFiltrados.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-900">No se encontraron estudiantes con los filtros aplicados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-sm font-semibold">Estudiante</TableHead>
                      <TableHead className="text-sm font-semibold">Grado</TableHead>
                      <TableHead className="text-sm font-semibold">Sección</TableHead>
                      <TableHead className="text-sm font-semibold text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estudiantesFiltrados.map((estudiante) => (
                      <TableRow key={estudiante.nombre} className="hover:bg-gray-50">
                        <TableCell className="font-medium text-gray-900">{estudiante.nombre}</TableCell>
                        <TableCell className="text-gray-900">{estudiante.grado}</TableCell>
                        <TableCell className="text-gray-900">{estudiante.seccion}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleRegistrarAsistencia(estudiante)}
                              className="gap-1"
                            >
                              <Calendar className="h-4 w-4" />
                              Asistencia
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleRegistrarIncidencia(estudiante)}
                              className="gap-1"
                            >
                              <FileText className="h-4 w-4" />
                              Incidencia
                            </Button>
                          </div>
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
            Completa el formulario para registrar {viewMode === 'asistencia' ? 'la asistencia' : 'la incidencia'}
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
                        <SelectItem value="agresion">Agresión</SelectItem>
                        <SelectItem value="falta_respeto">Falta de Respeto</SelectItem>
                        <SelectItem value="interrupcion">Interrupción</SelectItem>
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
                        <SelectItem value="ayuda_companero">Ayuda a Compañero</SelectItem>
                        <SelectItem value="participacion">Participación Destacada</SelectItem>
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
              <label className="text-sm font-semibold text-gray-900">Descripción</label>
              <Textarea
                placeholder={viewMode === 'asistencia' ? 'Describe la situación de asistencia...' : 'Describe la incidencia de manera clara y concisa...'}
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
                Lugar donde se generó la incidencia
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
                  Derivar Incidencia
                </label>
                <p className="text-xs text-gray-900 mt-1 mb-2">
                  Selecciona a qué departamento se debe derivar esta incidencia si requiere atención especial.
                </p>
                <Select
                  value={formData.derivacion}
                  onValueChange={(value) => setFormData({ ...formData, derivacion: value as TipoDerivacion })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No derivar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ninguna">No derivar</SelectItem>
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
