// Funciones de validación para formularios

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Validar email
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim() === '') {
    return { isValid: true }; // Email opcional
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'El email no es válido' };
  }
  
  return { isValid: true };
}

// Validar teléfono (formato flexible)
export function validatePhone(phone: string): ValidationResult {
  if (!phone || phone.trim() === '') {
    return { isValid: true }; // Teléfono opcional
  }
  
  // Permitir números, espacios, guiones, paréntesis y +
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  if (!phoneRegex.test(phone)) {
    return { isValid: false, error: 'El teléfono contiene caracteres inválidos' };
  }
  
  // Debe tener al menos 7 dígitos
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length < 7) {
    return { isValid: false, error: 'El teléfono debe tener al menos 7 dígitos' };
  }
  
  return { isValid: true };
}

// Validar campo requerido
export function validateRequired(value: string | number | undefined | null, fieldName: string): ValidationResult {
  if (value === undefined || value === null || value === '' || (typeof value === 'string' && value.trim() === '')) {
    return { isValid: false, error: `${fieldName} es requerido` };
  }
  
  return { isValid: true };
}

// Validar fecha (no puede ser futura para incidencias)
export function validateDateNotFuture(date: string, fieldName: string = 'La fecha'): ValidationResult {
  if (!date) {
    return { isValid: false, error: `${fieldName} es requerida` };
  }
  
  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // Fin del día de hoy
  
  if (selectedDate > today) {
    return { isValid: false, error: `${fieldName} no puede ser futura` };
  }
  
  return { isValid: true };
}

// Validar edad (debe ser un número positivo razonable)
export function validateAge(age: string | number | undefined | null): ValidationResult {
  if (age === undefined || age === null || age === '') {
    return { isValid: true }; // Edad opcional
  }
  
  const ageNum = typeof age === 'string' ? parseInt(age, 10) : age;
  
  if (isNaN(ageNum)) {
    return { isValid: false, error: 'La edad debe ser un número' };
  }
  
  if (ageNum < 1 || ageNum > 150) {
    return { isValid: false, error: 'La edad debe estar entre 1 y 150 años' };
  }
  
  return { isValid: true };
}

// Validar nombre (solo letras, espacios y algunos caracteres especiales)
export function validateName(name: string, fieldName: string = 'El nombre'): ValidationResult {
  if (!name || name.trim() === '') {
    return { isValid: false, error: `${fieldName} es requerido` };
  }
  
  if (name.trim().length < 2) {
    return { isValid: false, error: `${fieldName} debe tener al menos 2 caracteres` };
  }
  
  // Permitir letras, espacios, guiones, apóstrofes y acentos
  const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-\']+$/;
  if (!nameRegex.test(name)) {
    return { isValid: false, error: `${fieldName} contiene caracteres inválidos` };
  }
  
  return { isValid: true };
}

// Validar descripción (mínimo de caracteres)
export function validateDescription(description: string, minLength: number = 10): ValidationResult {
  if (!description || description.trim() === '') {
    return { isValid: false, error: 'La descripción es requerida' };
  }
  
  if (description.trim().length < minLength) {
    return { isValid: false, error: `La descripción debe tener al menos ${minLength} caracteres` };
  }
  
  return { isValid: true };
}

// Validar que haya al menos un estudiante con asistencia registrada
export function validateAsistenciaEntries(entries: Record<string, any>): ValidationResult {
  if (!entries || Object.keys(entries).length === 0) {
    return { isValid: false, error: 'Debe registrar la asistencia de al menos un estudiante' };
  }
  
  return { isValid: true };
}

