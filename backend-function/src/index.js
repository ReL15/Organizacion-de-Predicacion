/**
 * Appwrite Function: Backend seguro para "Organizador de la Predicación Congregacional"
 * 
 * Reglas de seguridad estrictas:
 * 1. Obtiene la identidad confiable exclusivamente desde el JWT de sesión de Appwrite.
 * 2. Verifica perfil y rol en base de datos.
 * 3. Valida aislamiento estricto por congregación en todas las lecturas y escrituras.
 * 4. Valida en servidor el límite obligatorio de 2 a 3 participantes en predicación pública.
 * 5. Registra bitácora de auditoría inmutable en el backend.
 */

import { Client, Account, Databases, Users, Query, ID } from 'node-appwrite';

export default async function ({ req, res, log, error }) {
  const endpoint = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_FUNCTION_API_KEY;
  const databaseId = process.env.APPWRITE_DATABASE_ID || 'congregacion_db';
  const recordsTableId = process.env.APPWRITE_RECORDS_TABLE_ID || 'congregation_records';
  const bootstrapAdminEmail = (process.env.APPWRITE_BOOTSTRAP_ADMIN_EMAIL || '').toLowerCase().trim();

  // Helper de respuesta JSON
  const sendJson = (status, payload) => {
    return res.json(payload, status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
  };

  if (req.method === 'OPTIONS') {
    return sendJson(200, { ok: true });
  }

  try {
    // 1. Extraer JWT desde el header Authorization
    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return sendJson(401, { error: 'No autorizado: Token de sesión requerido.' });
    }

    // 2. Resolver usuario confiable usando el JWT con el SDK oficial
    const userClient = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setJWT(token);

    const userAccount = new Account(userClient);
    let appwriteUser;
    try {
      appwriteUser = await userAccount.get();
    } catch (err) {
      error(`Error verificando JWT: ${err.message}`);
      return sendJson(401, { error: 'Sesión inválida o expirada en Appwrite.' });
    }

    const currentUserId = appwriteUser.$id;
    const currentUserEmail = (appwriteUser.email || '').toLowerCase().trim();

    // 3. Cliente privilegiado con API Key del servidor (sólo backend)
    const adminClient = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const db = new Databases(adminClient);
    const usersAdmin = new Users(adminClient);

    // 4. Parsear payload de la petición
    let body = {};
    if (typeof req.body === 'string') {
      try {
        body = JSON.parse(req.body);
      } catch (e) {
        body = {};
      }
    } else if (typeof req.body === 'object' && req.body !== null) {
      body = req.body;
    }

    const { action, payload = {} } = body;

    if (!action) {
      return sendJson(400, { error: 'Acción no especificada.' });
    }

    // 5. Cargar perfil de usuario desde la tabla de registros
    let userProfile = null;
    try {
      const profileResult = await db.listDocuments(databaseId, recordsTableId, [
        Query.equal('recordType', 'user_profile'),
        Query.equal('userId', currentUserId),
        Query.limit(1),
      ]);
      if (profileResult.documents.length > 0) {
        userProfile = JSON.parse(profileResult.documents[0].payload);
      }
    } catch (err) {
      log(`No se pudo leer perfil existente: ${err.message}`);
    }

    // Bootstrap del primer Coordinador si el correo coincide
    const isBootstrapAdmin = bootstrapAdminEmail && currentUserEmail === bootstrapAdminEmail;

    if (!userProfile && isBootstrapAdmin) {
      // Auto-inicializar perfil como Coordinador
      userProfile = {
        id: currentUserId,
        congregationId: '', // Debe crear o vincular una congregación en el paso siguiente
        firstName: appwriteUser.name ? appwriteUser.name.split(' ')[0] : 'Coordinador',
        lastName: appwriteUser.name ? appwriteUser.name.split(' ').slice(1).join(' ') : 'Inicial',
        fullName: appwriteUser.name || 'Coordinador Inicial',
        email: currentUserEmail,
        role: 'COORDINADOR',
        canLeadPreaching: true,
        canPublicPreaching: true,
        active: true,
        hasPassword: true,
        createdAt: new Date().toISOString(),
      };

      await db.createDocument(databaseId, recordsTableId, ID.unique(), {
        recordType: 'user_profile',
        congregationId: 'BOOTSTRAP',
        userId: currentUserId,
        payload: JSON.stringify(userProfile),
      });
    }

    // Acciones previas a tener congregación asignada
    if (action === 'get_my_profile') {
      return sendJson(200, {
        profile: userProfile,
        isBootstrapAdmin,
        hasCongregation: Boolean(userProfile && userProfile.congregationId),
      });
    }

    if (action === 'create_initial_congregation') {
      if (!isBootstrapAdmin && (!userProfile || userProfile.role !== 'COORDINADOR')) {
        return sendJson(403, { error: 'Sólo el coordinador inicial puede crear la congregación.' });
      }

      const { name, circuit, timezone } = payload;
      if (!name) {
        return sendJson(400, { error: 'El nombre de la congregación es obligatorio.' });
      }

      const congId = ID.unique();
      const newCongregation = {
        id: congId,
        name,
        circuit: circuit || '',
        timezone: timezone || 'America/El_Salvador',
        createdAt: new Date().toISOString(),
        createdBy: currentUserId,
      };

      // Guardar congregación
      await db.createDocument(databaseId, recordsTableId, ID.unique(), {
        recordType: 'congregation',
        congregationId: congId,
        userId: currentUserId,
        payload: JSON.stringify(newCongregation),
      });

      // Actualizar perfil de coordinador con la congregación
      userProfile.congregationId = congId;
      const existingProfileDoc = await db.listDocuments(databaseId, recordsTableId, [
        Query.equal('recordType', 'user_profile'),
        Query.equal('userId', currentUserId),
      ]);

      if (existingProfileDoc.documents.length > 0) {
        await db.updateDocument(databaseId, recordsTableId, existingProfileDoc.documents[0].$id, {
          congregationId: congId,
          payload: JSON.stringify(userProfile),
        });
      }

      return sendJson(200, {
        congregation: newCongregation,
        profile: userProfile,
      });
    }

    // Validar que el usuario tenga un perfil activo y congregación asociada
    const isMasterAdmin = Boolean(userProfile?.isMasterAdmin || isBootstrapAdmin);

    // Listar todas las congregaciones (Sólo Usuario Maestro)
    if (action === 'get_all_congregations') {
      if (!isMasterAdmin) {
        return sendJson(403, { error: 'Sólo el usuario maestro puede listar todas las congregaciones.' });
      }
      const congDocs = await db.listDocuments(databaseId, recordsTableId, [
        Query.equal('recordType', 'congregation'),
        Query.limit(100),
      ]);
      const congregations = congDocs.documents.map((d) => JSON.parse(d.payload));
      return sendJson(200, congregations);
    }

    if (!userProfile || (!userProfile.congregationId && !isMasterAdmin)) {
      return sendJson(403, {
        error: 'Tu cuenta no tiene una congregación asignada. Comunícate con el coordinador.',
      });
    }

    if (!userProfile.active) {
      return sendJson(403, { error: 'Esta cuenta ha sido desactivada por el coordinador.' });
    }

    // El usuario maestro puede operar sobre la congregación objetivo enviada en el payload
    const userCongregationId = (isMasterAdmin && payload.targetCongregationId)
      ? payload.targetCongregationId
      : userProfile.congregationId;
    const userRole = isMasterAdmin ? 'COORDINADOR' : userProfile.role;

    // Helper de autorización de roles
    const isCoordinator = userRole === 'COORDINADOR';
    const isOverseerOrAssistant =
      isCoordinator ||
      userRole === 'SUPERINTENDENTE_DE_SERVICIO' ||
      userRole === 'ASISTENTE_SUPERINTENDENTE_SERVICIO';

    // Helper para auditar
    const recordAuditLog = async (act, entity, entityId, details = '') => {
      try {
        const logEntry = {
          id: ID.unique(),
          congregationId: userCongregationId,
          userId: currentUserId,
          userName: userProfile.fullName,
          action: act,
          entity,
          entityId,
          details,
          timestamp: new Date().toISOString(),
        };
        await db.createDocument(databaseId, recordsTableId, ID.unique(), {
          recordType: 'audit_log',
          congregationId: userCongregationId,
          userId: currentUserId,
          payload: JSON.stringify(logEntry),
        });
      } catch (err) {
        error(`Fallo al registrar auditoría: ${err.message}`);
      }
    };

    // ==============================================================
    // ENRUTADOR DE ACCIONES
    // ==============================================================

    switch (action) {
      // ------------------------------------------------------------
      // LECTURAS GENERALES (Aisladas estrictamente por congregación)
      // ------------------------------------------------------------
      case 'get_congregation_data': {
        const docs = await db.listDocuments(databaseId, recordsTableId, [
          Query.equal('congregationId', userCongregationId),
          Query.limit(100),
        ]);

        const grouped = {
          congregation: null,
          users: [],
          preachingPlaces: [],
          territories: [],
          territoryHistory: [],
          weeklyAssignments: [],
          publicPlaces: [],
          publicAssignments: [],
          auditLogs: [],
        };

        for (const doc of docs.documents) {
          const item = JSON.parse(doc.payload);
          if (doc.recordType === 'congregation') grouped.congregation = item;
          if (doc.recordType === 'user_profile') grouped.users.push(item);
          if (doc.recordType === 'preaching_place') grouped.preachingPlaces.push(item);
          if (doc.recordType === 'territory') grouped.territories.push(item);
          if (doc.recordType === 'territory_history') grouped.territoryHistory.push(item);
          if (doc.recordType === 'weekly_assignment') grouped.weeklyAssignments.push(item);
          if (doc.recordType === 'public_place') grouped.publicPlaces.push(item);
          if (doc.recordType === 'public_assignment') grouped.publicAssignments.push(item);
          if (doc.recordType === 'audit_log' && isCoordinator) grouped.auditLogs.push(item);
        }

        return sendJson(200, grouped);
      }

      // ------------------------------------------------------------
      // ASIGNACIONES SEMANALES
      // ------------------------------------------------------------
      case 'save_weekly_assignment': {
        if (!isOverseerOrAssistant) {
          return sendJson(403, { error: 'No tienes permisos para modificar el programa semanal.' });
        }

        const assignment = payload;
        if (!assignment.date || !assignment.time || !assignment.placeId || !assignment.leaderId) {
          return sendJson(400, { error: 'Faltan campos obligatorios para la asignación.' });
        }

        assignment.congregationId = userCongregationId;
        assignment.createdBy = currentUserId;
        if (!assignment.id) assignment.id = ID.unique();
        if (!assignment.createdAt) assignment.createdAt = new Date().toISOString();

        // Buscar si ya existe para actualizar o crear
        const existing = await db.listDocuments(databaseId, recordsTableId, [
          Query.equal('recordType', 'weekly_assignment'),
          Query.equal('congregationId', userCongregationId),
          Query.equal('entityId', assignment.id),
        ]);

        if (existing.documents.length > 0) {
          await db.updateDocument(databaseId, recordsTableId, existing.documents[0].$id, {
            payload: JSON.stringify(assignment),
          });
          await recordAuditLog('ACTUALIZACIÓN', 'Asignación Semanal', assignment.id, `Fecha: ${assignment.date}`);
        } else {
          await db.createDocument(databaseId, recordsTableId, ID.unique(), {
            recordType: 'weekly_assignment',
            congregationId: userCongregationId,
            entityId: assignment.id,
            payload: JSON.stringify(assignment),
          });
          await recordAuditLog('CREACIÓN', 'Asignación Semanal', assignment.id, `Fecha: ${assignment.date}`);
        }

        return sendJson(200, { success: true, assignment });
      }

      case 'delete_weekly_assignment': {
        if (!isOverseerOrAssistant) {
          return sendJson(403, { error: 'No tienes permisos para eliminar asignaciones.' });
        }
        const { id } = payload;
        const existing = await db.listDocuments(databaseId, recordsTableId, [
          Query.equal('recordType', 'weekly_assignment'),
          Query.equal('congregationId', userCongregationId),
          Query.equal('entityId', id),
        ]);
        if (existing.documents.length > 0) {
          await db.deleteDocument(databaseId, recordsTableId, existing.documents[0].$id);
          await recordAuditLog('ELIMINACIÓN', 'Asignación Semanal', id);
        }
        return sendJson(200, { success: true });
      }

      // ------------------------------------------------------------
      // PREDICACIÓN PÚBLICA (VALIDACIÓN ESTRICTA: 2 A 3 PARTICIPANTES)
      // ------------------------------------------------------------
      case 'save_public_assignment': {
        if (!isOverseerOrAssistant) {
          return sendJson(403, { error: 'No tienes permisos para editar turnos públicos.' });
        }

        const assignment = payload;
        const participants = assignment.participants || [];

        // REGLA CRÍTICA OBLIGATORIA DEL SERVIDOR:
        if (!Array.isArray(participants) || participants.length < 2 || participants.length > 3) {
          return sendJson(400, {
            error: 'Regla del servidor violada: Cada turno de predicación pública debe tener exactamente entre 2 y 3 participantes.',
          });
        }

        assignment.congregationId = userCongregationId;
        if (!assignment.id) assignment.id = ID.unique();
        if (!assignment.createdAt) assignment.createdAt = new Date().toISOString();

        const existing = await db.listDocuments(databaseId, recordsTableId, [
          Query.equal('recordType', 'public_assignment'),
          Query.equal('congregationId', userCongregationId),
          Query.equal('entityId', assignment.id),
        ]);

        if (existing.documents.length > 0) {
          await db.updateDocument(databaseId, recordsTableId, existing.documents[0].$id, {
            payload: JSON.stringify(assignment),
          });
          await recordAuditLog('ACTUALIZACIÓN', 'Predicación Pública', assignment.id, `${assignment.date} ${assignment.time}`);
        } else {
          await db.createDocument(databaseId, recordsTableId, ID.unique(), {
            recordType: 'public_assignment',
            congregationId: userCongregationId,
            entityId: assignment.id,
            payload: JSON.stringify(assignment),
          });
          await recordAuditLog('CREACIÓN', 'Predicación Pública', assignment.id, `${assignment.date} ${assignment.time}`);
        }

        return sendJson(200, { success: true, assignment });
      }

      // ------------------------------------------------------------
      // TERRITORIOS
      // ------------------------------------------------------------
      case 'save_territory': {
        if (!isOverseerOrAssistant) {
          return sendJson(403, { error: 'No tienes permisos para administrar territorios.' });
        }

        const territory = payload;
        if (!territory.number) {
          return sendJson(400, { error: 'El número de territorio es obligatorio.' });
        }

        territory.congregationId = userCongregationId;
        if (!territory.id) territory.id = ID.unique();
        if (!territory.createdAt) territory.createdAt = new Date().toISOString();

        const existing = await db.listDocuments(databaseId, recordsTableId, [
          Query.equal('recordType', 'territory'),
          Query.equal('congregationId', userCongregationId),
          Query.equal('entityId', territory.id),
        ]);

        if (existing.documents.length > 0) {
          await db.updateDocument(databaseId, recordsTableId, existing.documents[0].$id, {
            payload: JSON.stringify(territory),
          });
          await recordAuditLog('ACTUALIZACIÓN', 'Territorio', territory.id, `Número: ${territory.number}`);
        } else {
          await db.createDocument(databaseId, recordsTableId, ID.unique(), {
            recordType: 'territory',
            congregationId: userCongregationId,
            entityId: territory.id,
            payload: JSON.stringify(territory),
          });
          await recordAuditLog('CREACIÓN', 'Territorio', territory.id, `Número: ${territory.number}`);
        }

        return sendJson(200, { success: true, territory });
      }

      // ------------------------------------------------------------
      // ADMINISTRACIÓN DE USUARIOS (SÓLO COORDINADOR)
      // ------------------------------------------------------------
      case 'admin_save_user': {
        if (!isCoordinator) {
          return sendJson(403, { error: 'Acción denegada: Sólo el coordinador puede gestionar miembros y roles.' });
        }

        const targetUser = payload;
        targetUser.congregationId = userCongregationId;

        // No permitir que el usuario modifique su propio rol
        if (targetUser.id === currentUserId && targetUser.role !== 'COORDINADOR') {
          return sendJson(400, { error: 'No puedes degradar tu propio rol de Coordinador.' });
        }

        const existing = await db.listDocuments(databaseId, recordsTableId, [
          Query.equal('recordType', 'user_profile'),
          Query.equal('userId', targetUser.id),
        ]);

        if (existing.documents.length > 0) {
          await db.updateDocument(databaseId, recordsTableId, existing.documents[0].$id, {
            payload: JSON.stringify(targetUser),
          });
          await recordAuditLog('ACTUALIZACIÓN', 'Usuario', targetUser.id, `Rol: ${targetUser.role}`);
        } else {
          await db.createDocument(databaseId, recordsTableId, ID.unique(), {
            recordType: 'user_profile',
            congregationId: userCongregationId,
            userId: targetUser.id,
            payload: JSON.stringify(targetUser),
          });
          await recordAuditLog('CREACIÓN', 'Usuario', targetUser.id, `Rol: ${targetUser.role}`);
        }

        return sendJson(200, { success: true, user: targetUser });
      }

      // ------------------------------------------------------------
      // RESPALDO JSON COMPLETO (SÓLO COORDINADOR)
      // ------------------------------------------------------------
      case 'export_backup': {
        if (!isCoordinator) {
          return sendJson(403, { error: 'Sólo el coordinador puede exportar respaldos.' });
        }

        const docs = await db.listDocuments(databaseId, recordsTableId, [
          Query.equal('congregationId', userCongregationId),
          Query.limit(500),
        ]);

        const backup = {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          congregationId: userCongregationId,
          records: docs.documents.map((d) => ({
            type: d.recordType,
            data: JSON.parse(d.payload),
          })),
        };

        await recordAuditLog('RESPALDO', 'Congregación', userCongregationId, 'Exportado archivo JSON');
        return sendJson(200, backup);
      }

      default:
        return sendJson(400, { error: `Acción desconocida: ${action}` });
    }
  } catch (err) {
    error(`Error fatal en Function: ${err.message}`);
    return sendJson(500, { error: 'Error interno en el servidor seguro.' });
  }
}
