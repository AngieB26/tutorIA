'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, User, Shield } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // OPTIMIZACIÓN: Solo ejecutar seed si no hay datos (verificar primero)
    const runSeedIfNeeded = async () => {
      try {
        // Verificar si ya hay estudiantes antes de ejecutar seed
        const estudiantesResponse = await fetch('/api/estudiantes');
        if (estudiantesResponse.ok) {
          const estudiantes = await estudiantesResponse.json();
          if (estudiantes.length > 0) {
            console.log('Ya hay datos, no se ejecuta seed');
            return; // Ya hay datos, no ejecutar seed
          }
        }
        
        // Solo ejecutar seed si no hay datos
        console.log('No hay datos, ejecutando seed...');
        const response = await fetch('/api/seed', { method: 'POST' });
        const data = await response.json();
        if (data.success) {
          console.log('Seed ejecutado:', data.message);
        }
      } catch (error) {
        console.error('Error ejecutando seed:', error);
      }
    };
    runSeedIfNeeded();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 sm:px-6 py-8 bg-white">
      <div className="w-full max-w-4xl space-y-6 sm:space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="flex justify-center mb-3 sm:mb-4">
            <GraduationCap className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">
            TutorIA
          </h1>
          <p className="text-lg sm:text-xl text-gray-900 max-w-2xl mx-auto px-2">
            Gestión Inteligente de Incidencias Estudiantiles
          </p>
          <p className="text-sm sm:text-base text-gray-900 max-w-xl mx-auto px-2">
            Digitaliza el registro de incidencias y genera reportes automáticos con IA
          </p>
        </div>

        {/* Role Selector Cards */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3 mt-8 sm:mt-12">
          <Card 
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 border-blue-400 hover:border-primary"
            onClick={() => router.push('/tutor')}
          >
            <CardHeader>
              <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
                <div className="p-2 sm:p-3 bg-primary/10 rounded-lg">
                  <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <CardTitle className="text-xl sm:text-2xl !text-gray-900">Eres Tutor</CardTitle>
              </div>
              <CardDescription className="text-sm sm:text-base text-gray-900">
                Gestiona el seguimiento de tus estudiantes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs sm:text-sm text-gray-900">
                Registra asistencia e incidencias de tus estudiantes de forma rápida y organizada.
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 border-blue-400 hover:border-primary"
            onClick={() => router.push('/profesor')}
          >
            <CardHeader>
              <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
                <div className="p-2 sm:p-3 bg-primary/10 rounded-lg">
                  <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <CardTitle className="text-xl sm:text-2xl !text-gray-900">Eres Profesor</CardTitle>
              </div>
              <CardDescription className="text-sm sm:text-base text-gray-900">
                Registra incidencias estudiantiles de forma rápida y sencilla
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs sm:text-sm text-gray-900">
                Completa el formulario en menos de 30 segundos y mantén un registro organizado de todas las incidencias.
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 border-blue-400 hover:border-primary"
            onClick={() => router.push('/director/login')}
          >
            <CardHeader>
              <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
                <div className="p-2 sm:p-3 bg-primary/10 rounded-lg">
                  <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <CardTitle className="text-xl sm:text-2xl !text-gray-900">Eres Director</CardTitle>
              </div>
              <CardDescription className="text-sm sm:text-base text-gray-900">
                Busca estudiantes y genera reportes inteligentes con IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs sm:text-sm text-gray-900">
                Accede a toda la información de un estudiante y obtén análisis automáticos con patrones y recomendaciones.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

