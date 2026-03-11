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
    <div className="flex min-h-screen items-center justify-center px-4 sm:px-6 py-6 sm:py-8 bg-white">
      <div className="w-full max-w-4xl space-y-4 sm:space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-1 sm:space-y-4">
          <div className="flex justify-center mb-2 sm:mb-4">
            <GraduationCap className="h-10 w-10 sm:h-16 sm:w-16 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-900">
            TutorIA
          </h1>
          <p className="text-sm sm:text-xl text-gray-900 max-w-2xl mx-auto px-2 font-medium">
            Gestión Inteligente de Incidencias Estudiantiles
          </p>
          <p className="text-xs sm:text-base text-gray-600 max-w-xl mx-auto px-2">
            Digitaliza el registro de incidencias y genera reportes automáticos con IA
          </p>
        </div>

        {/* Role Selector Cards */}
        <div className="grid gap-3 sm:gap-6 grid-cols-1 sm:grid-cols-3 mt-4 sm:mt-12">
          <Card 
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 border-blue-400 hover:border-primary"
            onClick={() => router.push('/tutor')}
          >
            <CardHeader className="pb-1 sm:pb-4 pt-3 sm:pt-6 px-3 sm:px-6">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-2">
                <div className="p-1.5 sm:p-3 bg-primary/10 rounded-lg shrink-0">
                  <User className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
                </div>
                <CardTitle className="text-base sm:text-2xl !text-gray-900">Eres Tutor</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-base text-gray-900 font-medium">
                Gestiona el seguimiento de tus estudiantes
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-3 sm:pb-6 px-3 sm:px-6 pt-0 sm:pt-0">
              <p className="text-xs sm:text-sm text-gray-600">
                Registra asistencia e incidencias de tus estudiantes de forma rápida y organizada.
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 border-blue-400 hover:border-primary"
            onClick={() => router.push('/profesor')}
          >
            <CardHeader className="pb-1 sm:pb-4 pt-3 sm:pt-6 px-3 sm:px-6">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-2">
                <div className="p-1.5 sm:p-3 bg-primary/10 rounded-lg shrink-0">
                  <User className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
                </div>
                <CardTitle className="text-base sm:text-2xl !text-gray-900">Eres Profesor</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-base text-gray-900 font-medium">
                Registra incidencias estudiantiles de forma rápida y sencilla
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-3 sm:pb-6 px-3 sm:px-6 pt-0 sm:pt-0">
              <p className="text-xs sm:text-sm text-gray-600">
                Completa el formulario en menos de 30 segundos y mantén un registro organizado de todas las incidencias.
              </p>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 border-blue-400 hover:border-primary"
            onClick={() => router.push('/director/login')}
          >
            <CardHeader className="pb-1 sm:pb-4 pt-3 sm:pt-6 px-3 sm:px-6">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-2">
                <div className="p-1.5 sm:p-3 bg-primary/10 rounded-lg shrink-0">
                  <Shield className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
                </div>
                <CardTitle className="text-base sm:text-2xl !text-gray-900">Eres Director</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-base text-gray-900 font-medium">
                Busca estudiantes y genera reportes inteligentes con IA
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-3 sm:pb-6 px-3 sm:px-6 pt-0 sm:pt-0">
              <p className="text-xs sm:text-sm text-gray-600">
                Accede a toda la información de un estudiante y obtén análisis automáticos con patrones y recomendaciones.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
