import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Gravedad } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function getTipoColor(tipo: string): string {
  switch (tipo) {
    case 'positivo':
      return 'bg-green-600 text-white hover:bg-green-700';
    case 'ausencia':
      return 'bg-orange-500 text-white hover:bg-orange-600';
    case 'tardanza':
      return 'bg-yellow-400 text-gray-900 hover:bg-yellow-500';
    case 'conducta':
      return 'bg-red-600 text-white hover:bg-red-700';
    case 'academica':
      return 'bg-blue-600 text-white hover:bg-blue-700';
    case 'asistencia':
      return 'bg-cyan-600 text-white hover:bg-cyan-700';
    default:
      return 'bg-gray-500 text-white hover:bg-gray-600';
  }
}

export function getTipoLabel(tipo: string): string {
  switch (tipo) {
    case 'positivo':
      return 'Comportamiento Positivo';
    case 'ausencia':
      return 'Asistencia';
    case 'tardanza':
      return 'Tardanza';
    case 'conducta':
      return 'Conducta Negativa';
    case 'academica':
      return 'Académica';
    case 'asistencia':
      return 'Asistencia';
    default:
      return tipo.charAt(0).toUpperCase() + tipo.slice(1);
  }
}

export function getGravedadColor(gravedad: Gravedad): string {
  switch (gravedad) {
    case 'grave':
      return 'bg-red-600 text-white hover:bg-red-700';
    case 'moderada':
      return 'bg-blue-500 text-white hover:bg-blue-600';
    case 'leve':
      return 'bg-green-600 text-white hover:bg-green-700';
    default:
      return 'bg-gray-500 text-white hover:bg-gray-600';
  }
}

export function getGravedadLabel(gravedad: Gravedad): string {
  switch (gravedad) {
    case 'grave':
      return 'Grave';
    case 'moderada':
      return 'Moderada';
    case 'leve':
      return 'Leve';
    default:
      return gravedad;
  }
}

