import { db } from './index.ts';
import {
  congregations,
  users,
  preachingPlaces,
  territories,
  territoryHistory,
  weeklyAssignments,
  publicPreachingPlaces,
  publicPreachingAssignments,
  auditLogs,
} from './schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import {
  Congregation,
  UserProfile,
  PreachingPlace,
  Territory,
  TerritoryHistoryRecord,
  WeeklyAssignment,
  PublicPreachingPlace,
  PublicPreachingAssignment,
  AuditLog,
} from '../types/index.ts';

// Helper seguro para serializar fechas/timestamps de PostgreSQL
export function toIsoDate(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? new Date().toISOString() : val.toISOString();
  }
  if (typeof val === 'string') {
    return val;
  }
  try {
    const d = new Date(val as any);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

// ----------------------------------------------------
// CONGREGACIONES
// ----------------------------------------------------
export async function getCongregationsList(): Promise<Congregation[]> {
  try {
    const rows = await db.select().from(congregations);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      circuit: r.circuit || undefined,
      city: r.city || undefined,
      logoUrl: r.logoUrl || undefined,
      timezone: r.timezone,
      createdAt: toIsoDate(r.createdAt),
      createdBy: r.createdBy || undefined,
    }));
  } catch (error) {
    console.error('Error fetching congregations:', error);
    throw new Error('Error al obtener las congregaciones de la base de datos', { cause: error });
  }
}

export async function getCongregationById(id: string): Promise<Congregation | null> {
  try {
    const rows = await db.select().from(congregations).where(eq(congregations.id, id));
    if (!rows.length) return null;
    const r = rows[0];
    return {
      id: r.id,
      name: r.name,
      circuit: r.circuit || undefined,
      city: r.city || undefined,
      logoUrl: r.logoUrl || undefined,
      timezone: r.timezone,
      createdAt: toIsoDate(r.createdAt),
      createdBy: r.createdBy || undefined,
    };
  } catch (error) {
    console.error(`Error fetching congregation ${id}:`, error);
    throw new Error('Error al consultar la congregación', { cause: error });
  }
}

export async function createCongregationRecord(data: {
  id: string;
  name: string;
  circuit?: string;
  city?: string;
  logoUrl?: string;
  timezone?: string;
  createdBy?: string;
}): Promise<Congregation> {
  try {
    const [inserted] = await db
      .insert(congregations)
      .values({
        id: data.id,
        name: data.name,
        circuit: data.circuit,
        city: data.city,
        logoUrl: data.logoUrl,
        timezone: data.timezone || 'America/El_Salvador',
        createdBy: data.createdBy,
      })
      .returning();

    return {
      id: inserted.id,
      name: inserted.name,
      circuit: inserted.circuit || undefined,
      city: inserted.city || undefined,
      logoUrl: inserted.logoUrl || undefined,
      timezone: inserted.timezone,
      createdAt: toIsoDate(inserted.createdAt),
      createdBy: inserted.createdBy || undefined,
    };
  } catch (error) {
    console.error('Error creating congregation:', error);
    throw new Error('Error al registrar la congregación', { cause: error });
  }
}

export async function updateCongregationRecord(
  id: string,
  data: Partial<{ name: string; circuit: string; city: string; logoUrl: string; timezone: string }>
): Promise<Congregation> {
  try {
    const payload: Record<string, any> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.circuit !== undefined) payload.circuit = data.circuit;
    if (data.city !== undefined) payload.city = data.city;
    if (data.logoUrl !== undefined) payload.logoUrl = data.logoUrl;
    if (data.timezone !== undefined) payload.timezone = data.timezone;

    const [updated] = await db
      .update(congregations)
      .set(payload)
      .where(eq(congregations.id, id))
      .returning();

    return {
      id: updated.id,
      name: updated.name,
      circuit: updated.circuit || undefined,
      city: updated.city || undefined,
      logoUrl: updated.logoUrl || undefined,
      timezone: updated.timezone,
      createdAt: toIsoDate(updated.createdAt),
      createdBy: updated.createdBy || undefined,
    };
  } catch (error) {
    console.error(`Error updating congregation ${id}:`, error);
    throw new Error('Error al actualizar la congregación', { cause: error });
  }
}

// ----------------------------------------------------
// USUARIOS / PUBLICADORES
// ----------------------------------------------------
export async function getUserByUid(uid: string): Promise<UserProfile | null> {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid));
    if (!rows.length) return null;
    const r = rows[0];
    return {
      id: r.id,
      congregationId: r.congregationId || '',
      firstName: r.firstName,
      lastName: r.lastName,
      fullName: r.fullName,
      email: r.email,
      phoneNumber: r.phoneNumber || undefined,
      role: r.role as any,
      isMasterAdmin: Boolean(r.isMasterAdmin),
      canLeadPreaching: Boolean(r.canLeadPreaching),
      canPublicPreaching: Boolean(r.canPublicPreaching),
      active: Boolean(r.active),
      createdAt: toIsoDate(r.createdAt),
    };
  } catch (error) {
    console.error(`Error fetching user by uid ${uid}:`, error);
    throw new Error('Error al buscar usuario', { cause: error });
  }
}

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  try {
    const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    if (!rows.length) return null;
    const r = rows[0];
    return {
      id: r.id,
      congregationId: r.congregationId || '',
      firstName: r.firstName,
      lastName: r.lastName,
      fullName: r.fullName,
      email: r.email,
      phoneNumber: r.phoneNumber || undefined,
      role: r.role as any,
      isMasterAdmin: Boolean(r.isMasterAdmin),
      canLeadPreaching: Boolean(r.canLeadPreaching),
      canPublicPreaching: Boolean(r.canPublicPreaching),
      active: Boolean(r.active),
      createdAt: toIsoDate(r.createdAt),
    };
  } catch (error) {
    console.error(`Error fetching user by email ${email}:`, error);
    throw new Error('Error al buscar usuario por correo', { cause: error });
  }
}

export async function getUserById(id: string): Promise<UserProfile | null> {
  try {
    const rows = await db.select().from(users).where(eq(users.id, id));
    if (!rows.length) return null;
    const r = rows[0];
    return {
      id: r.id,
      uid: r.uid,
      congregationId: r.congregationId || '',
      firstName: r.firstName,
      lastName: r.lastName,
      fullName: r.fullName,
      email: r.email,
      phoneNumber: r.phoneNumber || undefined,
      role: r.role as any,
      isMasterAdmin: Boolean(r.isMasterAdmin),
      canLeadPreaching: Boolean(r.canLeadPreaching),
      canPublicPreaching: Boolean(r.canPublicPreaching),
      active: Boolean(r.active),
      createdAt: toIsoDate(r.createdAt),
    };
  } catch (error) {
    console.error(`Error fetching user ${id}:`, error);
    throw new Error('Error al buscar publicador', { cause: error });
  }
}

export async function deleteUserRecord(id: string): Promise<void> {
  try {
    await db.delete(users).where(eq(users.id, id));
  } catch (error) {
    console.error(`Error deleting user ${id}:`, error);
    throw new Error('Error al eliminar publicador', { cause: error });
  }
}

export async function getUsersByCongregation(congregationId: string): Promise<UserProfile[]> {
  try {
    const rows = await db
      .select()
      .from(users)
      .where(and(eq(users.congregationId, congregationId), eq(users.active, true)));

    return rows.map((r) => ({
      id: r.id,
      congregationId: r.congregationId || '',
      firstName: r.firstName,
      lastName: r.lastName,
      fullName: r.fullName,
      email: r.email,
      phoneNumber: r.phoneNumber || undefined,
      role: r.role as any,
      isMasterAdmin: Boolean(r.isMasterAdmin),
      canLeadPreaching: Boolean(r.canLeadPreaching),
      canPublicPreaching: Boolean(r.canPublicPreaching),
      active: Boolean(r.active),
      createdAt: toIsoDate(r.createdAt),
    }));
  } catch (error) {
    console.error(`Error fetching users for cong ${congregationId}:`, error);
    throw new Error('Error al obtener publicadores de la congregación', { cause: error });
  }
}

export async function upsertUserRecord(userData: {
  id: string;
  uid: string;
  congregationId?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role?: string;
  isMasterAdmin?: boolean;
  canLeadPreaching?: boolean;
  canPublicPreaching?: boolean;
  active?: boolean;
}): Promise<UserProfile> {
  try {
    const [result] = await db
      .insert(users)
      .values({
        id: userData.id,
        uid: userData.uid,
        congregationId: userData.congregationId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        fullName: userData.fullName,
        email: userData.email.toLowerCase(),
        phoneNumber: userData.phoneNumber,
        role: userData.role || 'PUBLICADOR',
        isMasterAdmin: userData.isMasterAdmin ?? false,
        canLeadPreaching: userData.canLeadPreaching ?? false,
        canPublicPreaching: userData.canPublicPreaching ?? false,
        active: userData.active ?? true,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          fullName: userData.fullName,
          email: userData.email.toLowerCase(),
          phoneNumber: userData.phoneNumber,
          ...(userData.congregationId ? { congregationId: userData.congregationId } : {}),
          ...(userData.role ? { role: userData.role } : {}),
          ...(typeof userData.isMasterAdmin === 'boolean'
            ? { isMasterAdmin: userData.isMasterAdmin }
            : {}),
          ...(typeof userData.canLeadPreaching === 'boolean'
            ? { canLeadPreaching: userData.canLeadPreaching }
            : {}),
          ...(typeof userData.canPublicPreaching === 'boolean'
            ? { canPublicPreaching: userData.canPublicPreaching }
            : {}),
        },
      })
      .returning();

    return {
      id: result.id,
      congregationId: result.congregationId || '',
      firstName: result.firstName,
      lastName: result.lastName,
      fullName: result.fullName,
      email: result.email,
      phoneNumber: result.phoneNumber || undefined,
      role: result.role as any,
      isMasterAdmin: Boolean(result.isMasterAdmin),
      canLeadPreaching: Boolean(result.canLeadPreaching),
      canPublicPreaching: Boolean(result.canPublicPreaching),
      active: Boolean(result.active),
      createdAt: toIsoDate(result.createdAt),
    };
  } catch (error) {
    console.error('Error upserting user:', error);
    throw new Error('Error al guardar datos de usuario', { cause: error });
  }
}

export async function updateUserRecord(
  id: string,
  data: Partial<{
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phoneNumber?: string;
    role: string;
    congregationId: string;
    isMasterAdmin: boolean;
    canLeadPreaching: boolean;
    canPublicPreaching: boolean;
    active: boolean;
  }>
): Promise<UserProfile> {
  try {
    const updatePayload: Record<string, any> = {};
    if (data.firstName !== undefined) updatePayload.firstName = data.firstName;
    if (data.lastName !== undefined) updatePayload.lastName = data.lastName;
    if (data.fullName !== undefined) {
      updatePayload.fullName = data.fullName;
    } else if (data.firstName !== undefined || data.lastName !== undefined) {
      updatePayload.fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
    }
    if (data.email !== undefined) updatePayload.email = data.email.toLowerCase();
    if (data.phoneNumber !== undefined) updatePayload.phoneNumber = data.phoneNumber;
    if (data.role !== undefined) updatePayload.role = data.role;
    if (data.congregationId !== undefined) updatePayload.congregationId = data.congregationId;
    if (typeof data.isMasterAdmin === 'boolean') updatePayload.isMasterAdmin = data.isMasterAdmin;
    if (typeof data.canLeadPreaching === 'boolean') updatePayload.canLeadPreaching = data.canLeadPreaching;
    if (typeof data.canPublicPreaching === 'boolean') updatePayload.canPublicPreaching = data.canPublicPreaching;
    if (typeof data.active === 'boolean') updatePayload.active = data.active;

    const [updated] = await db
      .update(users)
      .set(updatePayload)
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Usuario con ID ${id} no encontrado`);
    }

    return {
      id: updated.id,
      congregationId: updated.congregationId || '',
      firstName: updated.firstName,
      lastName: updated.lastName,
      fullName: updated.fullName,
      email: updated.email,
      phoneNumber: updated.phoneNumber || undefined,
      role: updated.role as any,
      isMasterAdmin: Boolean(updated.isMasterAdmin),
      canLeadPreaching: Boolean(updated.canLeadPreaching),
      canPublicPreaching: Boolean(updated.canPublicPreaching),
      active: Boolean(updated.active),
      createdAt: toIsoDate(updated.createdAt),
    };
  } catch (error) {
    console.error(`Error updating user ${id}:`, error);
    throw new Error('Error al actualizar publicador', { cause: error });
  }
}

// ----------------------------------------------------
// LUGARES DE SALIDA
// ----------------------------------------------------
export async function getPlaces(congregationId: string): Promise<PreachingPlace[]> {
  try {
    const rows = await db
      .select()
      .from(preachingPlaces)
      .where(and(eq(preachingPlaces.congregationId, congregationId), eq(preachingPlaces.active, true)));

    return rows.map((r) => ({
      id: r.id,
      congregationId: r.congregationId,
      name: r.name,
      address: r.address,
      latitude: r.latitude,
      longitude: r.longitude,
      description: r.description || undefined,
      active: Boolean(r.active),
      createdAt: toIsoDate(r.createdAt),
    }));
  } catch (error) {
    console.error('Error getting preaching places:', error);
    throw new Error('Error al obtener lugares de salida', { cause: error });
  }
}

export async function createPlace(data: PreachingPlace): Promise<PreachingPlace> {
  try {
    const [inserted] = await db
      .insert(preachingPlaces)
      .values({
        id: data.id,
        congregationId: data.congregationId,
        name: data.name,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        description: data.description,
        active: data.active ?? true,
      })
      .returning();

    return {
      id: inserted.id,
      congregationId: inserted.congregationId,
      name: inserted.name,
      address: inserted.address,
      latitude: inserted.latitude,
      longitude: inserted.longitude,
      description: inserted.description || undefined,
      active: Boolean(inserted.active),
      createdAt: toIsoDate(inserted.createdAt),
    };
  } catch (error) {
    console.error('Error creating place:', error);
    throw new Error('Error al crear punto de salida', { cause: error });
  }
}

export async function updatePlace(id: string, data: Partial<PreachingPlace>): Promise<PreachingPlace> {
  try {
    const [updated] = await db
      .update(preachingPlaces)
      .set({
        name: data.name,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        description: data.description,
        active: data.active,
      })
      .where(eq(preachingPlaces.id, id))
      .returning();

    return {
      id: updated.id,
      congregationId: updated.congregationId,
      name: updated.name,
      address: updated.address,
      latitude: updated.latitude,
      longitude: updated.longitude,
      description: updated.description || undefined,
      active: Boolean(updated.active),
      createdAt: toIsoDate(updated.createdAt),
    };
  } catch (error) {
    console.error(`Error updating place ${id}:`, error);
    throw new Error('Error al actualizar lugar de salida', { cause: error });
  }
}

export async function deletePlace(id: string): Promise<void> {
  try {
    // Baja lógica
    await db.update(preachingPlaces).set({ active: false }).where(eq(preachingPlaces.id, id));
  } catch (error) {
    console.error(`Error deleting place ${id}:`, error);
    throw new Error('Error al desactivar lugar de salida', { cause: error });
  }
}

// ----------------------------------------------------
// TERRITORIOS
// ----------------------------------------------------
export async function getTerritoriesList(congregationId: string): Promise<Territory[]> {
  try {
    const rows = await db
      .select()
      .from(territories)
      .where(and(eq(territories.congregationId, congregationId), eq(territories.active, true)));

    return rows.map((r) => ({
      id: r.id,
      congregationId: r.congregationId,
      number: r.number,
      name: r.name || undefined,
      description: r.description || undefined,
      status: r.status as any,
      polygon: (r.polygon as any) || [],
      active: Boolean(r.active),
      observations: r.observations || undefined,
      lastAssignedDate: r.lastAssignedDate || undefined,
      lastAssignedToId: r.lastAssignedToId || undefined,
      lastAssignedToName: r.lastAssignedToName || undefined,
      lastCompletedDate: r.lastCompletedDate || undefined,
      createdAt: toIsoDate(r.createdAt),
    }));
  } catch (error) {
    console.error('Error fetching territories:', error);
    throw new Error('Error al obtener territorios', { cause: error });
  }
}

export async function createTerritoryRecord(data: Territory): Promise<Territory> {
  try {
    const [inserted] = await db
      .insert(territories)
      .values({
        id: data.id,
        congregationId: data.congregationId,
        number: data.number,
        name: data.name,
        description: data.description,
        status: data.status,
        polygon: data.polygon,
        active: data.active ?? true,
        observations: data.observations,
        lastAssignedDate: data.lastAssignedDate,
        lastAssignedToId: data.lastAssignedToId,
        lastAssignedToName: data.lastAssignedToName,
        lastCompletedDate: data.lastCompletedDate,
      })
      .returning();

    return {
      id: inserted.id,
      congregationId: inserted.congregationId,
      number: inserted.number,
      name: inserted.name || undefined,
      description: inserted.description || undefined,
      status: inserted.status as any,
      polygon: (inserted.polygon as any) || [],
      active: Boolean(inserted.active),
      observations: inserted.observations || undefined,
      lastAssignedDate: inserted.lastAssignedDate || undefined,
      lastAssignedToId: inserted.lastAssignedToId || undefined,
      lastAssignedToName: inserted.lastAssignedToName || undefined,
      lastCompletedDate: inserted.lastCompletedDate || undefined,
      createdAt: toIsoDate(inserted.createdAt),
    };
  } catch (error) {
    console.error('Error creating territory:', error);
    throw new Error('Error al crear territorio', { cause: error });
  }
}

export async function updateTerritoryRecord(id: string, data: Partial<Territory>): Promise<Territory> {
  try {
    const [updated] = await db
      .update(territories)
      .set({
        number: data.number,
        name: data.name,
        description: data.description,
        status: data.status,
        polygon: data.polygon,
        active: data.active,
        observations: data.observations,
        lastAssignedDate: data.lastAssignedDate,
        lastAssignedToId: data.lastAssignedToId,
        lastAssignedToName: data.lastAssignedToName,
        lastCompletedDate: data.lastCompletedDate,
      })
      .where(eq(territories.id, id))
      .returning();

    return {
      id: updated.id,
      congregationId: updated.congregationId,
      number: updated.number,
      name: updated.name || undefined,
      description: updated.description || undefined,
      status: updated.status as any,
      polygon: (updated.polygon as any) || [],
      active: Boolean(updated.active),
      observations: updated.observations || undefined,
      lastAssignedDate: updated.lastAssignedDate || undefined,
      lastAssignedToId: updated.lastAssignedToId || undefined,
      lastAssignedToName: updated.lastAssignedToName || undefined,
      lastCompletedDate: updated.lastCompletedDate || undefined,
      createdAt: toIsoDate(updated.createdAt),
    };
  } catch (error) {
    console.error(`Error updating territory ${id}:`, error);
    throw new Error('Error al actualizar territorio', { cause: error });
  }
}

export async function getTerritoryHistoryList(
  congregationId: string,
  territoryId?: string
): Promise<TerritoryHistoryRecord[]> {
  try {
    let condition = eq(territoryHistory.congregationId, congregationId);
    if (territoryId) {
      condition = and(condition, eq(territoryHistory.territoryId, territoryId)) as any;
    }
    const rows = await db
      .select()
      .from(territoryHistory)
      .where(condition)
      .orderBy(desc(territoryHistory.createdAt));

    return rows.map((r) => ({
      id: r.id,
      territoryId: r.territoryId,
      territoryNumber: r.territoryNumber,
      congregationId: r.congregationId,
      assignedToId: r.assignedToId,
      assignedToName: r.assignedToName,
      assignedDate: r.assignedDate,
      completedDate: r.completedDate || undefined,
      notes: r.notes || undefined,
    }));
  } catch (error) {
    console.error('Error fetching territory history:', error);
    throw new Error('Error al consultar historial de territorios', { cause: error });
  }
}

export async function createTerritoryHistoryRecord(
  data: TerritoryHistoryRecord
): Promise<TerritoryHistoryRecord> {
  try {
    const [inserted] = await db
      .insert(territoryHistory)
      .values({
        id: data.id,
        territoryId: data.territoryId,
        territoryNumber: data.territoryNumber,
        congregationId: data.congregationId,
        assignedToId: data.assignedToId,
        assignedToName: data.assignedToName,
        assignedDate: data.assignedDate,
        completedDate: data.completedDate,
        notes: data.notes,
      })
      .returning();

    return {
      id: inserted.id,
      territoryId: inserted.territoryId,
      territoryNumber: inserted.territoryNumber,
      congregationId: inserted.congregationId,
      assignedToId: inserted.assignedToId,
      assignedToName: inserted.assignedToName,
      assignedDate: inserted.assignedDate,
      completedDate: inserted.completedDate || undefined,
      notes: inserted.notes || undefined,
    };
  } catch (error) {
    console.error('Error creating territory history record:', error);
    throw new Error('Error al registrar historial de territorio', { cause: error });
  }
}

// ----------------------------------------------------
// ASIGNACIONES SEMANALES
// ----------------------------------------------------
export async function getWeeklyAssignmentsList(congregationId: string): Promise<WeeklyAssignment[]> {
  try {
    const rows = await db
      .select()
      .from(weeklyAssignments)
      .where(eq(weeklyAssignments.congregationId, congregationId));

    return rows.map((r) => ({
      id: r.id,
      congregationId: r.congregationId,
      date: r.date,
      time: r.time,
      placeId: r.placeId,
      placeName: r.placeName,
      leaderId: r.leaderId,
      leaderName: r.leaderName,
      territoryId: r.territoryId || undefined,
      territoryNumber: r.territoryNumber || undefined,
      notes: r.notes || undefined,
      hasConflict: Boolean(r.hasConflict),
      createdAt: toIsoDate(r.createdAt),
      createdBy: r.createdBy || undefined,
    }));
  } catch (error) {
    console.error('Error fetching weekly assignments:', error);
    throw new Error('Error al obtener programa semanal', { cause: error });
  }
}

export async function createWeeklyAssignmentRecord(data: WeeklyAssignment): Promise<WeeklyAssignment> {
  try {
    const [inserted] = await db
      .insert(weeklyAssignments)
      .values({
        id: data.id,
        congregationId: data.congregationId,
        date: data.date,
        time: data.time,
        placeId: data.placeId,
        placeName: data.placeName,
        leaderId: data.leaderId,
        leaderName: data.leaderName,
        territoryId: data.territoryId,
        territoryNumber: data.territoryNumber,
        notes: data.notes,
        hasConflict: data.hasConflict ?? false,
        createdBy: data.createdBy,
      })
      .returning();

    return {
      id: inserted.id,
      congregationId: inserted.congregationId,
      date: inserted.date,
      time: inserted.time,
      placeId: inserted.placeId,
      placeName: inserted.placeName,
      leaderId: inserted.leaderId,
      leaderName: inserted.leaderName,
      territoryId: inserted.territoryId || undefined,
      territoryNumber: inserted.territoryNumber || undefined,
      notes: inserted.notes || undefined,
      hasConflict: Boolean(inserted.hasConflict),
      createdAt: toIsoDate(inserted.createdAt),
      createdBy: inserted.createdBy || undefined,
    };
  } catch (error) {
    console.error('Error creating weekly assignment:', error);
    throw new Error('Error al crear asignación semanal', { cause: error });
  }
}

export async function updateWeeklyAssignmentRecord(
  id: string,
  data: Partial<WeeklyAssignment>
): Promise<WeeklyAssignment> {
  try {
    const [updated] = await db
      .update(weeklyAssignments)
      .set({
        date: data.date,
        time: data.time,
        placeId: data.placeId,
        placeName: data.placeName,
        leaderId: data.leaderId,
        leaderName: data.leaderName,
        territoryId: data.territoryId,
        territoryNumber: data.territoryNumber,
        notes: data.notes,
        hasConflict: data.hasConflict,
      })
      .where(eq(weeklyAssignments.id, id))
      .returning();

    return {
      id: updated.id,
      congregationId: updated.congregationId,
      date: updated.date,
      time: updated.time,
      placeId: updated.placeId,
      placeName: updated.placeName,
      leaderId: updated.leaderId,
      leaderName: updated.leaderName,
      territoryId: updated.territoryId || undefined,
      territoryNumber: updated.territoryNumber || undefined,
      notes: updated.notes || undefined,
      hasConflict: Boolean(updated.hasConflict),
      createdAt: toIsoDate(updated.createdAt),
      createdBy: updated.createdBy || undefined,
    };
  } catch (error) {
    console.error(`Error updating weekly assignment ${id}:`, error);
    throw new Error('Error al actualizar asignación semanal', { cause: error });
  }
}

export async function deleteWeeklyAssignmentRecord(id: string): Promise<void> {
  try {
    await db.delete(weeklyAssignments).where(eq(weeklyAssignments.id, id));
  } catch (error) {
    console.error(`Error deleting weekly assignment ${id}:`, error);
    throw new Error('Error al eliminar asignación semanal', { cause: error });
  }
}

// ----------------------------------------------------
// PREDICACIÓN PÚBLICA (PUNTOS Y TURNOS)
// ----------------------------------------------------
export async function getPublicPlacesList(congregationId: string): Promise<PublicPreachingPlace[]> {
  try {
    const rows = await db
      .select()
      .from(publicPreachingPlaces)
      .where(
        and(
          eq(publicPreachingPlaces.congregationId, congregationId),
          eq(publicPreachingPlaces.active, true)
        )
      );

    return rows.map((r) => ({
      id: r.id,
      congregationId: r.congregationId,
      name: r.name,
      address: r.address,
      latitude: r.latitude,
      longitude: r.longitude,
      day: r.day as any,
      time: r.time,
      duration: r.duration,
      description: r.description || undefined,
      active: Boolean(r.active),
      fixedMemberIds: (r.fixedMemberIds as string[]) || [],
      createdAt: toIsoDate(r.createdAt),
    }));
  } catch (error) {
    console.error('Error fetching public preaching places:', error);
    throw new Error('Error al obtener puntos de predicación pública', { cause: error });
  }
}

export async function createPublicPlaceRecord(
  data: PublicPreachingPlace
): Promise<PublicPreachingPlace> {
  try {
    const [inserted] = await db
      .insert(publicPreachingPlaces)
      .values({
        id: data.id,
        congregationId: data.congregationId,
        name: data.name,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        day: data.day,
        time: data.time,
        duration: data.duration,
        description: data.description,
        active: data.active ?? true,
        fixedMemberIds: data.fixedMemberIds || [],
      })
      .returning();

    return {
      id: inserted.id,
      congregationId: inserted.congregationId,
      name: inserted.name,
      address: inserted.address,
      latitude: inserted.latitude,
      longitude: inserted.longitude,
      day: inserted.day as any,
      time: inserted.time,
      duration: inserted.duration,
      description: inserted.description || undefined,
      active: Boolean(inserted.active),
      fixedMemberIds: (inserted.fixedMemberIds as string[]) || [],
      createdAt: toIsoDate(inserted.createdAt),
    };
  } catch (error) {
    console.error('Error creating public place:', error);
    throw new Error('Error al registrar punto de predicación pública', { cause: error });
  }
}

export async function updatePublicPlaceRecord(
  id: string,
  data: Partial<PublicPreachingPlace>
): Promise<PublicPreachingPlace> {
  try {
    const [updated] = await db
      .update(publicPreachingPlaces)
      .set({
        name: data.name,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        day: data.day,
        time: data.time,
        duration: data.duration,
        description: data.description,
        active: data.active,
        fixedMemberIds: data.fixedMemberIds,
      })
      .where(eq(publicPreachingPlaces.id, id))
      .returning();

    return {
      id: updated.id,
      congregationId: updated.congregationId,
      name: updated.name,
      address: updated.address,
      latitude: updated.latitude,
      longitude: updated.longitude,
      day: updated.day as any,
      time: updated.time,
      duration: updated.duration,
      description: updated.description || undefined,
      active: Boolean(updated.active),
      fixedMemberIds: (updated.fixedMemberIds as string[]) || [],
      createdAt: toIsoDate(updated.createdAt),
    };
  } catch (error) {
    console.error(`Error updating public place ${id}:`, error);
    throw new Error('Error al actualizar punto público', { cause: error });
  }
}

export async function deletePublicPlaceRecord(id: string): Promise<void> {
  try {
    await db.update(publicPreachingPlaces).set({ active: false }).where(eq(publicPreachingPlaces.id, id));
  } catch (error) {
    console.error(`Error deleting public place ${id}:`, error);
    throw new Error('Error al desactivar punto público', { cause: error });
  }
}

export async function getPublicAssignmentsList(
  congregationId: string
): Promise<PublicPreachingAssignment[]> {
  try {
    const rows = await db
      .select()
      .from(publicPreachingAssignments)
      .where(eq(publicPreachingAssignments.congregationId, congregationId));

    return rows.map((r) => ({
      id: r.id,
      congregationId: r.congregationId,
      placeId: r.placeId,
      placeName: r.placeName,
      date: r.date,
      time: r.time,
      duration: r.duration,
      participants: (r.participants as any) || [],
      notes: r.notes || undefined,
      createdAt: toIsoDate(r.createdAt),
    }));
  } catch (error) {
    console.error('Error fetching public assignments:', error);
    throw new Error('Error al obtener turnos de predicación pública', { cause: error });
  }
}

export async function createPublicAssignmentRecord(
  data: PublicPreachingAssignment
): Promise<PublicPreachingAssignment> {
  try {
    const [inserted] = await db
      .insert(publicPreachingAssignments)
      .values({
        id: data.id,
        congregationId: data.congregationId,
        placeId: data.placeId,
        placeName: data.placeName,
        date: data.date,
        time: data.time,
        duration: data.duration,
        participants: data.participants,
        notes: data.notes,
      })
      .returning();

    return {
      id: inserted.id,
      congregationId: inserted.congregationId,
      placeId: inserted.placeId,
      placeName: inserted.placeName,
      date: inserted.date,
      time: inserted.time,
      duration: inserted.duration,
      participants: (inserted.participants as any) || [],
      notes: inserted.notes || undefined,
      createdAt: toIsoDate(inserted.createdAt),
    };
  } catch (error) {
    console.error('Error creating public assignment:', error);
    throw new Error('Error al crear turno de predicación pública', { cause: error });
  }
}

export async function updatePublicAssignmentRecord(
  id: string,
  data: Partial<PublicPreachingAssignment>
): Promise<PublicPreachingAssignment> {
  try {
    const [updated] = await db
      .update(publicPreachingAssignments)
      .set({
        placeId: data.placeId,
        placeName: data.placeName,
        date: data.date,
        time: data.time,
        duration: data.duration,
        participants: data.participants,
        notes: data.notes,
      })
      .where(eq(publicPreachingAssignments.id, id))
      .returning();

    return {
      id: updated.id,
      congregationId: updated.congregationId,
      placeId: updated.placeId,
      placeName: updated.placeName,
      date: updated.date,
      time: updated.time,
      duration: updated.duration,
      participants: (updated.participants as any) || [],
      notes: updated.notes || undefined,
      createdAt: toIsoDate(updated.createdAt),
    };
  } catch (error) {
    console.error(`Error updating public assignment ${id}:`, error);
    throw new Error('Error al actualizar turno público', { cause: error });
  }
}

export async function deletePublicAssignmentRecord(id: string): Promise<void> {
  try {
    await db.delete(publicPreachingAssignments).where(eq(publicPreachingAssignments.id, id));
  } catch (error) {
    console.error(`Error deleting public assignment ${id}:`, error);
    throw new Error('Error al eliminar turno público', { cause: error });
  }
}

// ----------------------------------------------------
// AUDITORÍA
// ----------------------------------------------------
export async function getAuditLogsList(congregationId: string): Promise<AuditLog[]> {
  try {
    const rows = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.congregationId, congregationId))
      .orderBy(desc(auditLogs.timestamp))
      .limit(50);

    return rows.map((r) => ({
      id: r.id,
      congregationId: r.congregationId,
      userId: r.userId,
      userName: r.userName,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
      details: r.details || undefined,
      timestamp: toIsoDate(r.timestamp),
    }));
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw new Error('Error al obtener bitácora de auditoría', { cause: error });
  }
}

export async function createAuditLogRecord(data: AuditLog): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: data.id,
      congregationId: data.congregationId,
      userId: data.userId,
      userName: data.userName,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId,
      details: data.details,
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
}
