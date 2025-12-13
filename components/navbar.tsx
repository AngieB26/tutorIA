'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isDirector, setIsDirector] = useState(pathname === '/director');

  useEffect(() => {
    setIsDirector(pathname === '/director');
  }, [pathname]);

  const handleSwitchChange = (checked: boolean) => {
    setIsDirector(checked);
    if (checked) {
      router.push('/director');
    } else {
      router.push('/profesor');
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-blue-200 bg-white shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center space-x-2">
          <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <span className="text-lg sm:text-xl font-semibold text-gray-900">TutorIA</span>
        </Link>
        
        <div className="flex items-center space-x-3 sm:space-x-4">
          <span className="text-xs sm:text-sm font-medium text-gray-700">Profesor</span>
          <Switch
            checked={isDirector}
            onCheckedChange={handleSwitchChange}
            aria-label="Cambiar entre Profesor y Director"
          />
          <span className="text-xs sm:text-sm font-medium text-gray-700">Director</span>
        </div>
      </div>
    </nav>
  );
}

