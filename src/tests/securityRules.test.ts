import { describe, it, expect } from 'vitest';
import {
  validatePublicPreachingParticipants,
  validateCongregationIsolation,
  canManageUsers,
  canManageCongregation,
  canManagePreachingOperations,
  canRecordPreachingProgress,
  detectWeeklyConflicts,
  detectPublicConflicts,
  isMasterUser,
} from '../services/securityRules';
import { PublicParticipant, WeeklyAssignment, PublicPreachingAssignment } from '../types';

describe('Reglas de Seguridad y Autorizaciones Críticas', () => {
  describe('Validación de Participantes en Predicación Pública (Obligatorio 2 a 3)', () => {
    it('debe rechazar una asignación con menos de 2 participantes', () => {
      const singleParticipant: PublicParticipant[] = [
        { userId: 'user-01', userName: 'Hno. Pérez' },
      ];
      const result = validatePublicPreachingParticipants(singleParticipant);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('al menos 2 participantes');
    });

    it('debe rechazar una asignación con lista vacía', () => {
      const result = validatePublicPreachingParticipants([]);
      expect(result.valid).toBe(false);
    });

    it('debe rechazar una asignación con más de 3 participantes', () => {
      const fourParticipants: PublicParticipant[] = [
        { userId: 'user-01', userName: 'Hno. 1' },
        { userId: 'user-02', userName: 'Hno. 2' },
        { userId: 'user-03', userName: 'Hno. 3' },
        { userId: 'user-04', userName: 'Hno. 4' },
      ];
      const result = validatePublicPreachingParticipants(fourParticipants);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('no puede exceder los 3 participantes');
    });

    it('debe aceptar exactamente 2 participantes', () => {
      const twoParticipants: PublicParticipant[] = [
        { userId: 'user-01', userName: 'Hno. 1' },
        { userId: 'user-02', userName: 'Hno. 2' },
      ];
      const result = validatePublicPreachingParticipants(twoParticipants);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('debe aceptar exactamente 3 participantes', () => {
      const threeParticipants: PublicParticipant[] = [
        { userId: 'user-01', userName: 'Hno. 1' },
        { userId: 'user-02', userName: 'Hno. 2' },
        { userId: 'user-03', userName: 'Hno. 3' },
      ];
      const result = validatePublicPreachingParticipants(threeParticipants);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('debe rechazar si un participante está duplicado en el mismo turno', () => {
      const duplicateParticipants: PublicParticipant[] = [
        { userId: 'user-01', userName: 'Hno. 1' },
        { userId: 'user-01', userName: 'Hno. 1' },
      ];
      const result = validatePublicPreachingParticipants(duplicateParticipants);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('misma persona');
    });
  });

  describe('Aislamiento Estricto por Congregación', () => {
    it('debe permitir acceso si los IDs de congregación coinciden', () => {
      const result = validateCongregationIsolation('cong-01', 'cong-01');
      expect(result.valid).toBe(true);
    });

    it('debe denegar acceso si los IDs de congregación son distintos', () => {
      const result = validateCongregationIsolation('cong-01', 'cong-otra-99');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('otra congregación');
    });

    it('debe permitir acceso entre congregaciones si el usuario es Usuario Maestro (isMasterAdmin: true)', () => {
      const result = validateCongregationIsolation('cong-01', 'cong-otra-99', true);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('debe identificar correctamente al Usuario Maestro', () => {
      expect(isMasterUser({ isMasterAdmin: true } as any)).toBe(true);
      expect(isMasterUser({ isMasterAdmin: false } as any)).toBe(false);
      expect(isMasterUser(null)).toBe(false);
    });
  });

  describe('Control de Acceso Basado en Roles (RBAC)', () => {
    it('solo el COORDINADOR puede administrar usuarios', () => {
      expect(canManageUsers('COORDINADOR')).toBe(true);
      expect(canManageUsers('SUPERINTENDENTE_DE_SERVICIO')).toBe(false);
      expect(canManageUsers('ASISTENTE_SUPERINTENDENTE_SERVICIO')).toBe(false);
      expect(canManageUsers('PUBLICADOR')).toBe(false);
    });

    it('solo el COORDINADOR puede administrar ajustes de congregación y respaldo', () => {
      expect(canManageCongregation('COORDINADOR')).toBe(true);
      expect(canManageCongregation('SUPERINTENDENTE_DE_SERVICIO')).toBe(false);
      expect(canManageCongregation('ASISTENTE_SUPERINTENDENTE_SERVICIO')).toBe(false);
      expect(canManageCongregation('PUBLICADOR')).toBe(false);
    });

    it('Coordinador, Superintendente y Asistente pueden gestionar predicación (Programa, Territorios)', () => {
      expect(canManagePreachingOperations('COORDINADOR')).toBe(true);
      expect(canManagePreachingOperations('SUPERINTENDENTE_DE_SERVICIO')).toBe(true);
      expect(canManagePreachingOperations('ASISTENTE_SUPERINTENDENTE_SERVICIO')).toBe(true);
      expect(canManagePreachingOperations('PUBLICADOR')).toBe(false);
    });
  });

  describe('Detección de Conflictos de Horario', () => {
    const existingWeekly: WeeklyAssignment[] = [
      {
        id: 'w-1',
        congregationId: 'c1',
        date: '2026-10-15',
        time: '09:00',
        placeId: 'p1',
        placeName: 'Salón',
        leaderId: 'leader-01',
        leaderName: 'Hno. Carlos',
        createdAt: '2026-10-01',
      },
    ];

    it('debe detectar conflicto si el mismo encargado tiene otra reunión a la misma hora y fecha', () => {
      const hasConflict = detectWeeklyConflicts(
        { date: '2026-10-15', time: '09:00', leaderId: 'leader-01' },
        existingWeekly
      );
      expect(hasConflict).toBe(true);
    });

    it('no debe reportar conflicto si es en fecha u hora distinta', () => {
      const hasConflict = detectWeeklyConflicts(
        { date: '2026-10-15', time: '15:00', leaderId: 'leader-01' },
        existingWeekly
      );
      expect(hasConflict).toBe(false);
    });

    it('debe detectar conflicto en predicación pública si un participante ya está en otro carrito', () => {
      const existingPublic: PublicPreachingAssignment[] = [
        {
          id: 'pub-1',
          congregationId: 'c1',
          placeId: 'spot-1',
          placeName: 'Parque',
          date: '2026-10-18',
          time: '10:00',
          duration: 90,
          participants: [
            { userId: 'user-01', userName: 'Hno. Samuel' },
            { userId: 'user-02', userName: 'Hno. David' },
          ],
          createdAt: '2026-10-01',
        },
      ];

      const check = detectPublicConflicts(
        {
          date: '2026-10-18',
          time: '10:00',
          participantIds: ['user-01', 'user-03'],
        },
        existingPublic
      );

      expect(check.hasConflict).toBe(true);
      expect(check.conflictedUserNames).toContain('Hno. Samuel');
    });
  });

  describe('Permisos para Registro de Predicación (Privilegio de dirigir reuniones)', () => {
    it('debe denegar permiso a un publicador que no tiene el privilegio de dirigir', () => {
      const publisher = {
        id: 'u1',
        congregationId: 'c1',
        firstName: 'Juan',
        lastName: 'Pérez',
        fullName: 'Juan Pérez',
        email: 'juan@test.com',
        role: 'PUBLICADOR' as const,
        canLeadPreaching: false,
        canPublicPreaching: true,
        active: true,
        createdAt: '2026-01-01',
      };
      expect(canRecordPreachingProgress(publisher)).toBe(false);
    });

    it('debe conceder permiso a un publicador que tiene el privilegio de dirigir la predicación', () => {
      const leader = {
        id: 'u2',
        congregationId: 'c1',
        firstName: 'Carlos',
        lastName: 'Gómez',
        fullName: 'Carlos Gómez',
        email: 'carlos@test.com',
        role: 'PUBLICADOR' as const,
        canLeadPreaching: true,
        canPublicPreaching: true,
        active: true,
        createdAt: '2026-01-01',
      };
      expect(canRecordPreachingProgress(leader)).toBe(true);
    });

    it('debe conceder permiso al coordinador o superintendente de servicio', () => {
      const coordinator = {
        id: 'u3',
        congregationId: 'c1',
        firstName: 'Marcos',
        lastName: 'Ruiz',
        fullName: 'Marcos Ruiz',
        email: 'marcos@test.com',
        role: 'COORDINADOR' as const,
        canLeadPreaching: false,
        canPublicPreaching: false,
        active: true,
        createdAt: '2026-01-01',
      };
      expect(canRecordPreachingProgress(coordinator)).toBe(true);
    });
  });

  describe('Modalidades de Predicación y Tarjeta de Territorio', () => {
    it('debe reconocer que GIRA, CALLES, ZOOM y CARTAS no requieren tarjeta de territorio', () => {
      const modalitiesWithoutTerritory: string[] = ['CALLES', 'ZOOM', 'CARTAS', 'GIRA'];
      const hasTerritory = (type: string) => type === 'TERRITORIO' || type === 'RURAL';

      modalitiesWithoutTerritory.forEach((modality) => {
        expect(hasTerritory(modality)).toBe(false);
      });
      expect(hasTerritory('TERRITORIO')).toBe(true);
      expect(hasTerritory('RURAL')).toBe(true);
    });
  });
});
