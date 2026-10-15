import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  doublePrecision,
  jsonb,
} from 'drizzle-orm/pg-core';

// 1. Congregaciones
export const congregations = pgTable('congregations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  circuit: text('circuit'),
  city: text('city'),
  logoUrl: text('logo_url'),
  timezone: text('timezone').notNull().default('America/El_Salvador'),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: text('created_by'),
});

// 2. Usuarios / Publicadores
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID o identificador único
  congregationId: text('congregation_id').references(() => congregations.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull(),
  phoneNumber: text('phone_number'),
  role: text('role').notNull().default('PUBLICADOR'),
  isMasterAdmin: boolean('is_master_admin').default(false),
  canLeadPreaching: boolean('can_lead_preaching').default(false),
  canPublicPreaching: boolean('can_public_preaching').default(false),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Lugares de Salida a la Predicación
export const preachingPlaces = pgTable('preaching_places', {
  id: text('id').primaryKey(),
  congregationId: text('congregation_id').notNull().references(() => congregations.id),
  name: text('name').notNull(),
  address: text('address').notNull(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  description: text('description'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Territorios
export const territories = pgTable('territories', {
  id: text('id').primaryKey(),
  congregationId: text('congregation_id').notNull().references(() => congregations.id),
  number: text('number').notNull(),
  name: text('name'),
  description: text('description'),
  status: text('status').notNull().default('DISPONIBLE'),
  polygon: jsonb('polygon').$type<{ latitude: number; longitude: number }[]>().default([]),
  active: boolean('active').default(true),
  observations: text('observations'),
  lastAssignedDate: text('last_assigned_date'),
  lastAssignedToId: text('last_assigned_to_id'),
  lastAssignedToName: text('last_assigned_to_name'),
  lastCompletedDate: text('last_completed_date'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. Historial de Territorios
export const territoryHistory = pgTable('territory_history', {
  id: text('id').primaryKey(),
  territoryId: text('territory_id').notNull().references(() => territories.id),
  territoryNumber: text('territory_number').notNull(),
  congregationId: text('congregation_id').notNull().references(() => congregations.id),
  assignedToId: text('assigned_to_id').notNull(),
  assignedToName: text('assigned_to_name').notNull(),
  assignedDate: text('assigned_date').notNull(),
  completedDate: text('completed_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 6. Asignaciones Semanales de Salida
export const weeklyAssignments = pgTable('weekly_assignments', {
  id: text('id').primaryKey(),
  congregationId: text('congregation_id').notNull().references(() => congregations.id),
  date: text('date').notNull(),
  time: text('time').notNull(),
  placeId: text('place_id').notNull(),
  placeName: text('place_name').notNull(),
  leaderId: text('leader_id').notNull(),
  leaderName: text('leader_name').notNull(),
  territoryId: text('territory_id'),
  territoryNumber: text('territory_number'),
  notes: text('notes'),
  hasConflict: boolean('has_conflict').default(false),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 7. Puntos de Predicación Pública (Carritos)
export const publicPreachingPlaces = pgTable('public_preaching_places', {
  id: text('id').primaryKey(),
  congregationId: text('congregation_id').notNull().references(() => congregations.id),
  name: text('name').notNull(),
  address: text('address').notNull(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  day: text('day').notNull(),
  time: text('time').notNull(),
  duration: integer('duration').notNull().default(60),
  description: text('description'),
  active: boolean('active').default(true),
  fixedMemberIds: jsonb('fixed_member_ids').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow(),
});

// 8. Turnos de Predicación Pública
export const publicPreachingAssignments = pgTable('public_preaching_assignments', {
  id: text('id').primaryKey(),
  congregationId: text('congregation_id').notNull().references(() => congregations.id),
  placeId: text('place_id').notNull(),
  placeName: text('place_name').notNull(),
  date: text('date').notNull(),
  time: text('time').notNull(),
  duration: integer('duration').notNull(),
  participants: jsonb('participants').$type<{ userId: string; userName: string; isFixed?: boolean }[]>().default([]),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 9. Registros de Auditoría
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  congregationId: text('congregation_id').notNull(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id').notNull(),
  details: text('details'),
  timestamp: timestamp('timestamp').defaultNow(),
});
