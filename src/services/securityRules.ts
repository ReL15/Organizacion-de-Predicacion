/**
 * Reglas de seguridad y validaciones de negocio del sistema
 * Estas validaciones se aplican en el cliente y de forma estricta en el backend
 */

import {
  UserProfile,
  UserRole,
  PublicParticipant,
  WeeklyAssignment,
  PublicPreachingAssignment,
} from '../types';

/**
 * Verifica si un rol tiene permiso para administrar usuarios y roles
 */
export function canManageUsers(role?: UserRole): boolean {
  return role === 'COORDINADOR';
}

/**
 * Verifica si un rol tiene permiso para administrar congregación y respaldo
 */
export function canManageCongregation(role?: UserRole): boolean {
  return role === 'COORDINADOR';
}

/**
 * Verifica si un rol puede crear y editar programas, territorios, lugares y predicación pública
 */
export function canManagePreachingOperations(role?: UserRole): boolean {
  if (!role) return false;
  return (
    role === 'COORDINADOR' ||
    role === 'SUPERINTENDENTE_DE_SERVICIO' ||
    role === 'ASISTENTE_SUPERINTENDENTE_SERVICIO'
  );
}

/**
 * Valida estrictamente el número de participantes de predicación pública (entre 2 y 3)
 */
export function validatePublicPreachingParticipants(
  participants: PublicParticipant[]
): { valid: boolean; error?: string } {
  if (!participants || !Array.isArray(participants)) {
    return {
      valid: false,
      error: 'Se requiere una lista válida de participantes.',
    };
  }

  if (participants.length < 2) {
    return {
      valid: false,
      error: 'La asignación de predicación pública debe tener al menos 2 participantes (norma de seguridad y compañía).',
    };
  }

  if (participants.length > 3) {
    return {
      valid: false,
      error: 'La asignación de predicación pública no puede exceder los 3 participantes.',
    };
  }

  // Verificar que no haya participantes duplicados
  const userIds = participants.map((p) => p.userId);
  const uniqueIds = new Set(userIds);
  if (uniqueIds.size !== userIds.length) {
    return {
      valid: false,
      error: 'No se puede asignar a la misma persona más de una vez en el mismo turno.',
    };
  }

  return { valid: true };
}

/**
 * Verifica si un usuario tiene privilegios de Usuario Maestro (Superadmin)
 */
export function isMasterUser(user?: UserProfile | null): boolean {
  return Boolean(user?.isMasterAdmin);
}

/**
 * Valida aislamiento estricto por congregación (con bypass para Usuario Maestro)
 */
export function validateCongregationIsolation(
  userCongregationId: string,
  targetCongregationId: string,
  isMasterAdmin: boolean = false
): { valid: boolean; error?: string } {
  if (isMasterAdmin) {
    return { valid: true };
  }

  if (!userCongregationId || !targetCongregationId) {
    return {
      valid: false,
      error: 'Identificador de congregación no provisto.',
    };
  }

  if (userCongregationId !== targetCongregationId) {
    return {
      valid: false,
      error: 'Acceso denegado: Los datos pertenecen a otra congregación.',
    };
  }

  return { valid: true };
}

/**
 * Detecta conflictos de horario en el programa semanal
 */
export function detectWeeklyConflicts(
  newAssignment: {
    id?: string;
    date: string;
    time: string;
    leaderId: string;
  },
  existingAssignments: WeeklyAssignment[]
): boolean {
  return existingAssignments.some(
    (a) =>
      a.id !== newAssignment.id &&
      a.date === newAssignment.date &&
      a.time === newAssignment.time &&
      a.leaderId === newAssignment.leaderId
  );
}

/**
 * Detecta conflictos de horario en predicación pública
 */
export function detectPublicConflicts(
  newAssignment: {
    id?: string;
    date: string;
    time: string;
    participantIds: string[];
  },
  existingAssignments: PublicPreachingAssignment[]
): { hasConflict: boolean; conflictedUserNames: string[] } {
  const conflictedUserNames: string[] = [];

  for (const existing of existingAssignments) {
    if (existing.id === newAssignment.id) continue;
    if (existing.date !== newAssignment.date) continue;

    // Si coincide la fecha y hora
    if (existing.time === newAssignment.time) {
      for (const p of existing.participants) {
        if (newAssignment.participantIds.includes(p.userId)) {
          if (!conflictedUserNames.includes(p.userName)) {
            conflictedUserNames.push(p.userName);
          }
        }
      }
    }
  }

  return {
    hasConflict: conflictedUserNames.length > 0,
    conflictedUserNames,
  };
}

/**
 * Verifica si un usuario tiene permiso para hacer registro de predicación en un territorio
 * Regla de negocio: Los publicadores estándar no pueden hacer registro;
 * solo quienes tienen el privilegio de dirigir la predicación (canLeadPreaching: true),
 * los superintendentes/coordinadores o el usuario maestro.
 */
export function canRecordPreachingProgress(user?: UserProfile | null): boolean {
  if (!user) return false;
  return (
    canManagePreachingOperations(user.role) ||
    Boolean(user.canLeadPreaching) ||
    Boolean(user.isMasterAdmin)
  );
}
