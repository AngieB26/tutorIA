import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Gravedad } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getTipoColor(tipo: string): string {
  switch (tipo) {
    case 'positivo':
      return 'bg-primary text-white';
    case 'ausencia':
      return 'bg-gray-600 text-white';
    case 'conducta':
      return 'bg-gray-800 text-white';
    case 'academica':
      return 'bg-primary text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

export function getTipoLabel(tipo: string): string {
  switch (tipo) {
    case 'positivo':
      return 'Comportamiento Positivo';
    case 'ausencia':
      return 'Ausencia';
    case 'conducta':
      return 'Conducta Negativa';
    case 'academica':
      return 'Académica';
    default:
      return tipo;
  }
}

export function getGravedadColor(gravedad: Gravedad): string {
  switch (gravedad) {
    case 'grave':
      return 'bg-red-600 text-white';
    case 'moderada':
      return 'bg-yellow-500 text-white';
    case 'leve':
      return 'bg-green-600 text-white';
    default:
      return 'bg-gray-500 text-white';
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

