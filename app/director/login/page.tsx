'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Shield, Lock } from 'lucide-react';

export default function DirectorLoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recordarCredenciales, setRecordarCredenciales] = useState(false);

  // Cargar credenciales guardadas al montar el componente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const usuarioGuardado = localStorage.getItem('director_usuario_recordado');
      const passwordGuardado = localStorage.getItem('director_password_recordada');
      
      if (usuarioGuardado && passwordGuardado) {
        setUsuario(usuarioGuardado);
        setPassword(passwordGuardado);
        setRecordarCredenciales(true);
      }
    }
  }, []);

  // Credenciales del director (en producción, esto debería estar en el backend)
  // Usuario: director
  // Contraseña: admin123
  const DIRECTOR_USERNAME = 'director';
  const DIRECTOR_PASSWORD = 'admin123';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validar credenciales
    if (usuario === DIRECTOR_USERNAME && password === DIRECTOR_PASSWORD) {
      // Guardar sesión en localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('director_authenticated', 'true');
        localStorage.setItem('director_session_time', Date.now().toString());
        
        // Guardar credenciales si se marcó "Recordar contraseña"
        if (recordarCredenciales) {
          localStorage.setItem('director_usuario_recordado', usuario);
          localStorage.setItem('director_password_recordada', password);
        } else {
          // Eliminar credenciales guardadas si no se marcó el checkbox
          localStorage.removeItem('director_usuario_recordado');
          localStorage.removeItem('director_password_recordada');
        }
      }
      // Redirigir al dashboard del director
      router.push('/director');
    } else {
      setError('Usuario o contraseña incorrectos');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 sm:px-6 py-8 bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center text-gray-900">
            Acceso de Director
          </CardTitle>
          <CardDescription className="text-center text-gray-600">
            Ingresa tus credenciales para acceder al panel de director
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="usuario" className="text-sm font-semibold text-gray-900">
                Usuario
              </label>
              <Input
                id="usuario"
                type="text"
                placeholder="Ingresa tu usuario"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                required
                disabled={loading}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-semibold text-gray-900">
                Contraseña
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="recordar"
                checked={recordarCredenciales}
                onChange={(e) => setRecordarCredenciales(e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                disabled={loading}
              />
              <label htmlFor="recordar" className="ml-2 text-sm text-gray-700 cursor-pointer">
                Recordar contraseña
              </label>
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                'Iniciando sesión...'
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Iniciar Sesión
                </>
              )}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Volver al inicio
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

