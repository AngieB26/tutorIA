import { NextResponse } from 'next/server';
import {
  getEstudiantesInfo,
  getIncidencias,
  getTutores,
  saveEstudiantesInfo,
  saveIncidencias,
  saveTutores,
  saveNotas,
  addClase,
} from '@/lib/db';
import { EstudianteInfo, Incidencia, Tutor, Nota, Clase, DiaSemana } from '@/lib/types';

export async function POST() {
  try {
    // Verificar si ya hay datos
    const existingEstudiantes = await getEstudiantesInfo();
    const existingIncidencias = await getIncidencias();
    const existingTutores = await getTutores();

    if (existingEstudiantes.length > 0 || existingIncidencias.length > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'La base de datos ya tiene datos. No se ejecutó el seed.',
        estudiantes: existingEstudiantes.length,
        incidencias: existingIncidencias.length,
        tutores: existingTutores.length
      });
    }

    // 1. Seed Estudiantes
    const estudiantesInfo: EstudianteInfo[] = [
      // 1ro Grado
      { nombre: 'Ana García', grado: '1ro', seccion: 'A', edad: 12, fechaNacimiento: '2012-05-15', contacto: { tutor: 'Pedro García', telefono: '555-1001', email: 'pedro.garcia@email.com' } },
      { nombre: 'Luis Martínez', grado: '1ro', seccion: 'A', edad: 12, fechaNacimiento: '2012-08-20', contacto: { tutor: 'Carmen Martínez', telefono: '555-1002', email: 'carmen.martinez@email.com' } },
      { nombre: 'Sofía Rodríguez', grado: '1ro', seccion: 'B', edad: 12, fechaNacimiento: '2012-03-10', contacto: { tutor: 'Miguel Rodríguez', telefono: '555-1003', email: 'miguel.rodriguez@email.com' } },
      { nombre: 'Daniel Vargas', grado: '1ro', seccion: 'B', edad: 12, fechaNacimiento: '2012-11-25', contacto: { tutor: 'Elena Vargas', telefono: '555-1004', email: 'elena.vargas@email.com' } },
      // 2do Grado
      { nombre: 'María López', grado: '2do', seccion: 'A', edad: 13, fechaNacimiento: '2011-07-18', contacto: { tutor: 'Carlos López', telefono: '555-2001', email: 'carlos.lopez@email.com' } },
      { nombre: 'Diego Fernández', grado: '2do', seccion: 'A', edad: 13, fechaNacimiento: '2011-09-12', contacto: { tutor: 'Laura Fernández', telefono: '555-2002', email: 'laura.fernandez@email.com' } },
      { nombre: 'Valentina Torres', grado: '2do', seccion: 'B', edad: 13, fechaNacimiento: '2011-04-30', contacto: { tutor: 'Roberto Torres', telefono: '555-2003', email: 'roberto.torres@email.com' } },
      { nombre: 'Alejandro Silva', grado: '2do', seccion: 'B', edad: 13, fechaNacimiento: '2011-12-05', contacto: { tutor: 'Patricia Silva', telefono: '555-2004', email: 'patricia.silva@email.com' } },
      // 3ro Grado
      { nombre: 'Juan Pérez', grado: '3ro', seccion: 'A', edad: 14, fechaNacimiento: '2010-06-22', contacto: { tutor: 'María Pérez', telefono: '555-3001', email: 'maria.perez@email.com' } },
      { nombre: 'Isabella Sánchez', grado: '3ro', seccion: 'A', edad: 14, fechaNacimiento: '2010-02-14', contacto: { tutor: 'Jorge Sánchez', telefono: '555-3002', email: 'jorge.sanchez@email.com' } },
      { nombre: 'Mateo González', grado: '3ro', seccion: 'B', edad: 14, fechaNacimiento: '2010-10-08', contacto: { tutor: 'Patricia González', telefono: '555-3003', email: 'patricia.gonzalez@email.com' } },
      { nombre: 'Lucía Ramírez', grado: '3ro', seccion: 'B', edad: 14, fechaNacimiento: '2010-01-19', contacto: { tutor: 'Fernando Ramírez', telefono: '555-3004', email: 'fernando.ramirez@email.com' } },
      // 4to Grado
      { nombre: 'Carlos Ruiz', grado: '4to', seccion: 'A', edad: 15, fechaNacimiento: '2009-08-03', contacto: { tutor: 'Ana Ruiz', telefono: '555-4001', email: 'ana.ruiz@email.com' } },
      { nombre: 'Camila Herrera', grado: '4to', seccion: 'A', edad: 15, fechaNacimiento: '2009-05-17', contacto: { tutor: 'Fernando Herrera', telefono: '555-4002', email: 'fernando.herrera@email.com' } },
      { nombre: 'Sebastián Morales', grado: '4to', seccion: 'B', edad: 15, fechaNacimiento: '2009-11-28', contacto: { tutor: 'Diana Morales', telefono: '555-4003', email: 'diana.morales@email.com' } },
      { nombre: 'Gabriela Castro', grado: '4to', seccion: 'B', edad: 15, fechaNacimiento: '2009-03-09', contacto: { tutor: 'Roberto Castro', telefono: '555-4004', email: 'roberto.castro@email.com' } },
      // 5to Grado
      { nombre: 'Natalia Jiménez', grado: '5to', seccion: 'A', edad: 16, fechaNacimiento: '2008-07-21', contacto: { tutor: 'Alberto Jiménez', telefono: '555-5001', email: 'alberto.jimenez@email.com' } },
      { nombre: 'Andrés Castro', grado: '5to', seccion: 'A', edad: 16, fechaNacimiento: '2008-09-14', contacto: { tutor: 'Mónica Castro', telefono: '555-5002', email: 'monica.castro@email.com' } },
      { nombre: 'Fernanda Ortiz', grado: '5to', seccion: 'B', edad: 16, fechaNacimiento: '2008-12-01', contacto: { tutor: 'Carlos Ortiz', telefono: '555-5003', email: 'carlos.ortiz@email.com' } },
      { nombre: 'Ricardo Méndez', grado: '5to', seccion: 'B', edad: 16, fechaNacimiento: '2008-04-16', contacto: { tutor: 'Sandra Méndez', telefono: '555-5004', email: 'sandra.mendez@email.com' } },
    ];
    await saveEstudiantesInfo(estudiantesInfo);

    // 2. Seed Tutores
    const tutoresData: Tutor[] = [
      { id: 't1', nombre: 'Prof. García', email: 'garcia@colegio.edu', telefono: '+1234567890' },
      { id: 't2', nombre: 'Prof. López', email: 'lopez@colegio.edu', telefono: '+1234567891' },
      { id: 't3', nombre: 'Prof. Fernández', email: 'fernandez@colegio.edu', telefono: '+1234567892' },
      { id: 't4', nombre: 'Prof. Torres', email: 'torres@colegio.edu', telefono: '+1234567893' },
      { id: 't5', nombre: 'Prof. Martínez', email: 'martinez@colegio.edu', telefono: '+1234567894' },
      { id: 't6', nombre: 'Prof. Ramírez', email: 'ramirez@colegio.edu', telefono: '+1234567895' },
    ];
    await saveTutores(tutoresData);

    // 3. Seed Incidencias
    const seedData: Incidencia[] = [
      // Juan Pérez - 3ro A
      {
        id: '1',
        studentName: 'Juan Pérez',
        tipo: 'ausencia',
        gravedad: 'moderada',
        descripcion: 'No asistió a clase sin justificación',
        fecha: '2024-12-02',
        profesor: 'Prof. García',
        tutor: 'Prof. García',
        lugar: 'Aula 301',
        timestamp: new Date('2024-12-02').getTime(),
        derivacion: 'director',
        resuelta: false,
        estado: 'Pendiente',
        historialEstado: [
          { estado: 'Pendiente', fecha: new Date('2024-12-02').toISOString(), usuario: 'system' }
        ]
      },
      {
        id: '2',
        studentName: 'Juan Pérez',
        tipo: 'ausencia',
        gravedad: 'grave',
        descripcion: 'Falta sin justificar por tercera vez este mes',
        fecha: '2024-12-09',
        profesor: 'Prof. García',
        tutor: 'Prof. García',
        lugar: 'Aula 301',
        timestamp: new Date('2024-12-09').getTime(),
        derivacion: 'psicologia',
        resuelta: false,
        estado: 'Pendiente',
        historialEstado: [
          { estado: 'Pendiente', fecha: new Date('2024-12-09').toISOString(), usuario: 'system' }
        ]
      },
      {
        id: '3',
        studentName: 'Juan Pérez',
        tipo: 'positivo',
        subtipo: 'ayuda_companero',
        gravedad: 'leve',
        descripcion: 'Ayudó a compañero en matemáticas durante la clase',
        fecha: '2024-12-05',
        profesor: 'Prof. López',
        tutor: 'Prof. López',
        lugar: 'Aula 205',
        timestamp: new Date('2024-12-05').getTime(),
        derivacion: undefined,
        estado: 'Pendiente',
        historialEstado: [
          { estado: 'Pendiente', fecha: new Date('2024-12-05').toISOString(), usuario: 'system' }
        ]
      },
      // María López - 2do A
      {
        id: '4',
        studentName: 'María López',
        tipo: 'academica',
        gravedad: 'moderada',
        descripcion: 'No entregó tarea de ciencias',
        fecha: '2024-12-03',
        profesor: 'Prof. Fernández',
        tutor: 'Prof. Fernández',
        lugar: 'Aula 102',
        timestamp: new Date('2024-12-03').getTime(),
        derivacion: 'coordinacion',
        resuelta: false,
        estado: 'Pendiente',
        historialEstado: [
          { estado: 'Pendiente', fecha: new Date('2024-12-03').toISOString(), usuario: 'system' }
        ]
      },
      {
        id: '5',
        studentName: 'María López',
        tipo: 'academica',
        gravedad: 'leve',
        descripcion: 'Tarea incompleta',
        fecha: '2024-12-10',
        profesor: 'Prof. Fernández',
        tutor: 'Prof. Fernández',
        lugar: 'Aula 102',
        timestamp: new Date('2024-12-10').getTime(),
        derivacion: undefined,
        estado: 'Pendiente',
        historialEstado: [
          { estado: 'Pendiente', fecha: new Date('2024-12-10').toISOString(), usuario: 'system' }
        ]
      },
      // Carlos Ruiz - 4to A
      {
        id: '6',
        studentName: 'Carlos Ruiz',
        tipo: 'positivo',
        subtipo: 'participacion',
        gravedad: 'leve',
        descripcion: 'Excelente participación en clase de historia',
        fecha: '2024-12-08',
        profesor: 'Prof. Torres',
        tutor: 'Prof. Torres',
        lugar: 'Aula 401',
        timestamp: new Date('2024-12-08').getTime(),
        derivacion: undefined,
        estado: 'Pendiente',
        historialEstado: [
          { estado: 'Pendiente', fecha: new Date('2024-12-08').toISOString(), usuario: 'system' }
        ]
      },
      {
        id: '7',
        studentName: 'Carlos Ruiz',
        tipo: 'conducta',
        subtipo: 'interrupcion',
        gravedad: 'moderada',
        descripcion: 'Interrumpió clase repetidamente',
        fecha: '2024-12-11',
        profesor: 'Prof. Torres',
        tutor: 'Prof. Torres',
        lugar: 'Aula 401',
        timestamp: new Date('2024-12-11').getTime(),
        derivacion: 'psicologia',
        resuelta: false,
        estado: 'Pendiente',
        historialEstado: [
          { estado: 'Pendiente', fecha: new Date('2024-12-11').toISOString(), usuario: 'system' }
        ]
      },
    ];
    await saveIncidencias(seedData);

    // 4. Seed Notas
    const notasData: Nota[] = [
      { id: 'n1', studentName: 'Juan Pérez', materia: 'Matemáticas', nota: 85, fecha: '2024-10-15', profesor: 'Prof. López', comentario: 'Buen desempeño' },
      { id: 'n2', studentName: 'Juan Pérez', materia: 'Matemáticas', nota: 78, fecha: '2024-11-20', profesor: 'Prof. López', comentario: 'Necesita mejorar' },
      { id: 'n3', studentName: 'Juan Pérez', materia: 'Ciencias', nota: 92, fecha: '2024-10-18', profesor: 'Prof. Fernández', comentario: 'Excelente' },
      { id: 'n4', studentName: 'Juan Pérez', materia: 'Ciencias', nota: 88, fecha: '2024-11-22', profesor: 'Prof. Fernández' },
      { id: 'n5', studentName: 'Juan Pérez', materia: 'Lengua', nota: 75, fecha: '2024-10-20', profesor: 'Prof. García' },
      { id: 'n6', studentName: 'Juan Pérez', materia: 'Lengua', nota: 80, fecha: '2024-11-25', profesor: 'Prof. García' },
      { id: 'n7', studentName: 'María López', materia: 'Matemáticas', nota: 90, fecha: '2024-10-15', profesor: 'Prof. López', comentario: 'Muy buena' },
      { id: 'n8', studentName: 'María López', materia: 'Matemáticas', nota: 88, fecha: '2024-11-20', profesor: 'Prof. López' },
      { id: 'n9', studentName: 'María López', materia: 'Ciencias', nota: 65, fecha: '2024-10-18', profesor: 'Prof. Fernández', comentario: 'Requiere apoyo' },
      { id: 'n10', studentName: 'María López', materia: 'Ciencias', nota: 70, fecha: '2024-11-22', profesor: 'Prof. Fernández' },
      { id: 'n11', studentName: 'María López', materia: 'Lengua', nota: 95, fecha: '2024-10-20', profesor: 'Prof. García', comentario: 'Destacada' },
      { id: 'n12', studentName: 'María López', materia: 'Lengua', nota: 93, fecha: '2024-11-25', profesor: 'Prof. García' },
      { id: 'n13', studentName: 'Carlos Ruiz', materia: 'Matemáticas', nota: 82, fecha: '2024-10-15', profesor: 'Prof. López' },
      { id: 'n14', studentName: 'Carlos Ruiz', materia: 'Matemáticas', nota: 85, fecha: '2024-11-20', profesor: 'Prof. López', comentario: 'Mejorando' },
      { id: 'n15', studentName: 'Carlos Ruiz', materia: 'Ciencias', nota: 88, fecha: '2024-10-18', profesor: 'Prof. Fernández' },
      { id: 'n16', studentName: 'Carlos Ruiz', materia: 'Ciencias', nota: 90, fecha: '2024-11-22', profesor: 'Prof. Fernández', comentario: 'Excelente progreso' },
      { id: 'n17', studentName: 'Carlos Ruiz', materia: 'Lengua', nota: 79, fecha: '2024-10-20', profesor: 'Prof. García' },
      { id: 'n18', studentName: 'Carlos Ruiz', materia: 'Lengua', nota: 81, fecha: '2024-11-25', profesor: 'Prof. García' },
    ];
    await saveNotas(notasData);

    // 5. Seed Clases
    const posiblesDias: DiaSemana[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
    const clasesSeed: Omit<Clase, 'id'>[] = [
      { nombre: 'Matemáticas', grado: '3ro', seccion: 'A', profesor: 'Prof. López', dias: posiblesDias, periodos: [1, 3] },
      { nombre: 'Ciencias', grado: '2do', seccion: 'A', profesor: 'Prof. Fernández', dias: posiblesDias, periodos: [2, 4] },
      { nombre: 'Lengua', grado: '1ro', seccion: 'A', profesor: 'Prof. García', dias: posiblesDias, periodos: [1, 5] },
      { nombre: 'Historia', grado: '4to', seccion: 'A', profesor: 'Prof. Torres', dias: posiblesDias, periodos: [2, 6] },
      { nombre: 'Arte', grado: '5to', seccion: 'A', profesor: 'Prof. Ramírez', dias: posiblesDias, periodos: [3, 7] },
    ];
    for (const clase of clasesSeed) {
      await addClase(clase);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Seed ejecutado exitosamente',
      estudiantes: estudiantesInfo.length,
      incidencias: seedData.length,
      tutores: tutoresData.length,
      notas: notasData.length,
      clases: clasesSeed.length
    });
  } catch (error) {
    console.error('Error ejecutando seed:', error);
    return NextResponse.json(
      { error: 'Error ejecutando seed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

