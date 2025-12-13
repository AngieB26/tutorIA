import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Gravedad } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getTipoColor(tipo: string): string {
  switch (tipo) {
    case 'positivo':
      return '!bg-primary !text-white hover:!bg-primary/90';
    case 'ausencia':
      return '!bg-purple-600 !text-white hover:!bg-purple-700';
    case 'conducta':
      return '!bg-red-600 !text-white hover:!bg-red-700';
    case 'academica':
      return '!bg-primary !text-white hover:!bg-primary/90';
    default:
      return '!bg-gray-500 !text-white hover:!bg-gray-600';
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
      return '!bg-red-600 !text-white hover:!bg-red-700';
    case 'moderada':
      return '!bg-yellow-500 !text-white hover:!bg-yellow-600';
    case 'leve':
      return '!bg-green-600 !text-white hover:!bg-green-700';
    default:
      return '!bg-gray-500 !text-white hover:!bg-gray-600';
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

