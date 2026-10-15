/**
 * Tipos de datos estrictos para el Organizador de la Predicación Congregacional
 */

export type UserRole =
  | 'COORDINADOR'
  | 'SUPERINTENDENTE_DE_SERVICIO'
  | 'ASISTENTE_SUPERINTENDENTE_SERVICIO'
  | 'PUBLICADOR';

export type TerritoryStatus =
  | 'DISPONIBLE'
  | 'ASIGNADO'
  | 'EN_PROCESO'
  | 'COMPLETADO'
  | 'INACTIVO';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface Congregation {
  id: string;
  name: string;
  circuit?: string;
  timezone: string; // ej: 'America/El_Salvador'
  createdAt: string;
  createdBy?: string;
}

export interface UserProfile {
  id: string; // ID único del publicador
  uid?: string; // Firebase Auth UID
  congregationId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: UserRole;
  isMasterAdmin?: boolean; // Usuario Maestro: puede alternar y administrar múltiples congregaciones
  canLeadPreaching: boolean; // Elegible para dirigir reuniones para el servicio del campo
  canPublicPreaching: boolean; // Elegible para carritos / predicación pública
  active: boolean;
  hasPassword?: boolean;
  createdAt: string;
}

export interface PreachingPlace {
  id: string;
  congregationId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  description?: string;
  active: boolean;
  createdAt: string;
}

export interface Territory {
  id: string;
  congregationId: string;
  number: string;
  name?: string;
  description?: string;
  status: TerritoryStatus;
  polygon: GeoPoint[];
  active: boolean;
  observations?: string;
  lastAssignedDate?: string;
  lastAssignedToId?: string;
  lastAssignedToName?: string;
  lastCompletedDate?: string;
  createdAt: string;
}

export interface TerritoryHistoryRecord {
  id: string;
  territoryId: string;
  territoryNumber: string;
  congregationId: string;
  assignedToId: string;
  assignedToName: string;
  assignedDate: string;
  completedDate?: string;
  notes?: string;
}

export interface WeeklyAssignment {
  id: string;
  congregationId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  placeId: string;
  placeName: string;
  leaderId: string;
  leaderName: string;
  territoryId?: string;
  territoryNumber?: string;
  notes?: string;
  hasConflict?: boolean;
  createdAt: string;
  createdBy?: string;
}

export interface PublicPreachingPlace {
  id: string;
  congregationId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  day: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  time: string; // HH:mm
  duration: number; // minutos, ej: 60, 90, 120
  description?: string;
  active: boolean;
  fixedMemberIds: string[]; // Participantes fijos asignados a este punto
  createdAt: string;
}

export interface PublicParticipant {
  userId: string;
  userName: string;
  isFixed?: boolean;
}

export interface PublicPreachingAssignment {
  id: string;
  congregationId: string;
  placeId: string;
  placeName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  duration: number; // minutos
  participants: PublicParticipant[]; // Obligatoriamente entre 2 y 3 participantes
  notes?: string;
  createdAt: string;
}

export interface NotificationPreference {
  userId: string;
  congregationId: string;
  remind7Days: boolean;
  remind2Days: boolean;
  remindSameDay7Am: boolean;
  fcmToken?: string;
}

export interface AuditLog {
  id: string;
  congregationId: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  details?: string;
  timestamp: string;
}

export interface CongregationBackupData {
  version: string;
  exportedAt: string;
  congregation: Congregation;
  users: UserProfile[];
  preachingPlaces: PreachingPlace[];
  territories: Territory[];
  territoryHistory: TerritoryHistoryRecord[];
  weeklyAssignments: WeeklyAssignment[];
  publicPlaces: PublicPreachingPlace[];
  publicAssignments: PublicPreachingAssignment[];
  auditLogs: AuditLog[];
}

export type ViewTab =
  | 'inicio'
  | 'programa'
  | 'calendario'
  | 'territorios'
  | 'lugares'
  | 'publica'
  | 'publicadores'
  | 'configuracion';
