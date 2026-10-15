import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { adminAuth } from './src/lib/firebase-admin.ts';
import {
  getCongregationsList,
  getCongregationById,
  createCongregationRecord,
  updateCongregationRecord,
  getUserByUid,
  getUserByEmail,
  getUserById,
  getUsersByCongregation,
  upsertUserRecord,
  updateUserRecord,
  deleteUserRecord,
  getPlaces,
  createPlace,
  updatePlace,
  deletePlace,
  getTerritoriesList,
  createTerritoryRecord,
  updateTerritoryRecord,
  getTerritoryHistoryList,
  createTerritoryHistoryRecord,
  getWeeklyAssignmentsList,
  createWeeklyAssignmentRecord,
  updateWeeklyAssignmentRecord,
  deleteWeeklyAssignmentRecord,
  getPublicPlacesList,
  createPublicPlaceRecord,
  updatePublicPlaceRecord,
  deletePublicPlaceRecord,
  getPublicAssignmentsList,
  createPublicAssignmentRecord,
  updatePublicAssignmentRecord,
  deletePublicAssignmentRecord,
  getAuditLogsList,
  createAuditLogRecord,
} from './src/db/queries.ts';
import { bootstrapDatabase } from './src/db/seed.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
let databaseInitialization: Promise<void> | undefined;

function initializeDatabase() {
  if (!databaseInitialization) {
    databaseInitialization = bootstrapDatabase().catch((error) => {
      databaseInitialization = undefined;
      throw error;
    });
  }
  return databaseInitialization;
}

app.use(express.json({ limit: '2mb' }));
app.use('/api', async (_req: Request, res: Response, next) => {
  try {
    await initializeDatabase();
    next();
  } catch (error) {
    console.error('Base de datos no disponible:', error);
    res.status(503).json({ error: 'La base de datos no está disponible. Verifica la configuración del servidor.' });
  }
});

// Auth helper middleware that extracts user info from Firebase Token or dev header
async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  let decoded: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>;
  try {
    decoded = await adminAuth.verifyIdToken(authHeader.slice('Bearer '.length));
  } catch {
    return null;
  }

  let dbUser = await getUserByUid(decoded.uid);
  if (!dbUser && decoded.email) {
    dbUser = await getUserByEmail(decoded.email);
    if (dbUser) {
      await upsertUserRecord({
        ...dbUser,
        uid: decoded.uid,
      });
      dbUser.uid = decoded.uid;
    }
  }
  return { firebase: decoded, dbUser };
}

// ====================================================
// RUTAS API DE LA BASE DE DATOS POSTGRESQL (NEON / CLOUD SQL)
// ====================================================

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', engine: 'PostgreSQL / Cloud SQL' });
});

// 1. Congregaciones
app.get('/api/congregations', async (_req: Request, res: Response) => {
  try {
    const list = await getCongregationsList();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener congregaciones' });
  }
});

app.post('/api/congregations', async (req: Request, res: Response) => {
  try {
    const { name, circuit, city, timezone } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
    const id = `cong-${Date.now()}`;
    const result = await createCongregationRecord({
      id,
      name,
      circuit,
      city,
      timezone: timezone || 'America/El_Salvador',
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al crear congregación' });
  }
});

app.put('/api/congregations/:id', async (req: Request, res: Response) => {
  try {
    const updated = await updateCongregationRecord(req.params.id, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al actualizar congregación' });
  }
});

// 2. Perfil y Sincronización de Usuario
app.post('/api/auth/sync', async (req: Request, res: Response) => {
  try {
    const userSession = await getUserFromRequest(req);
    if (!userSession?.firebase) {
      return res.status(401).json({ error: 'Inicia sesión para sincronizar tu cuenta.' });
    }
    const uid = userSession?.firebase?.uid;
    const email = userSession?.firebase?.email;
    const displayName = userSession?.firebase?.name;
    if (!email) return res.status(400).json({ error: 'Correo requerido' });

    let user = await getUserByEmail(email);
    const congregations = await getCongregationsList();
    const defaultCongId = congregations[0]?.id || 'cong-central-1';
    const isMaster = email.toLowerCase() === 'tch.rivlue15@gmail.com';

    if (!user) {
      const parts = (displayName || email.split('@')[0]).split(' ');
      const firstName = parts[0] || 'Publicador';
      const lastName = parts.slice(1).join(' ') || '';
      user = await upsertUserRecord({
        id: `user-${Date.now()}`,
        uid: uid || `uid-${Date.now()}`,
        congregationId: defaultCongId,
        firstName,
        lastName,
        fullName: displayName || `${firstName} ${lastName}`.trim(),
        email: email.toLowerCase(),
        role: isMaster ? 'COORDINADOR' : 'PUBLICADOR',
        isMasterAdmin: isMaster,
        canLeadPreaching: isMaster,
        canPublicPreaching: true,
        active: true,
      });
    } else if (uid && user.uid !== uid) {
      user = await upsertUserRecord({
        ...user,
        uid,
        isMasterAdmin: user.isMasterAdmin || isMaster,
      });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al sincronizar usuario' });
  }
});

app.get('/api/me', async (req: Request, res: Response) => {
  try {
    const userSession = await getUserFromRequest(req);
    if (userSession?.dbUser) {
      return res.json(userSession.dbUser);
    }

    res.status(401).json({ error: 'Usuario no autenticado' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener sesión' });
  }
});

// 3. Publicadores / Miembros
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const congId = (req.query.congregationId as string) || '';
    if (!congId) return res.status(400).json({ error: 'congregationId requerido' });
    const list = await getUsersByCongregation(congId);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener publicadores' });
  }
});

app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const id = body.id || `user-${Date.now()}`;
    const user = await upsertUserRecord({
      ...body,
      id,
      uid: body.uid || id,
      fullName: body.fullName || `${body.firstName} ${body.lastName}`.trim(),
    });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al registrar publicador' });
  }
});

app.put('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const { id, createdAt, ...updateFields } = req.body;
    const updated = await updateUserRecord(req.params.id, updateFields);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al actualizar publicador' });
  }
});

app.delete('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const userSession = await getUserFromRequest(req);
    const requester = userSession?.dbUser;
    if (!requester || !userSession?.firebase) {
      return res.status(401).json({ error: 'Debes iniciar sesión para eliminar publicadores.' });
    }
    if (requester.role !== 'COORDINADOR' || !requester.active) {
      return res.status(403).json({ error: 'Solo un coordinador activo puede eliminar publicadores.' });
    }

    const target = await getUserById(req.params.id);
    if (!target) return res.status(404).json({ error: 'Publicador no encontrado.' });
    if (target.id === requester.id || target.isMasterAdmin) {
      return res.status(400).json({ error: 'No se puede eliminar la cuenta propia ni al usuario maestro.' });
    }
    if (!requester.isMasterAdmin && target.congregationId !== requester.congregationId) {
      return res.status(403).json({ error: 'No puedes eliminar publicadores de otra congregación.' });
    }

    if (target.uid && target.uid !== target.id) {
      try {
        await adminAuth.deleteUser(target.uid);
      } catch (error: any) {
        if (error.code !== 'auth/user-not-found') throw error;
      }
    }
    await deleteUserRecord(target.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error al eliminar publicador:', error);
    res.status(500).json({ error: error.message || 'Error al eliminar publicador.' });
  }
});

// 4. Lugares de Salida
app.get('/api/places', async (req: Request, res: Response) => {
  try {
    const congId = req.query.congregationId as string;
    if (!congId) return res.status(400).json({ error: 'congregationId requerido' });
    const list = await getPlaces(congId);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener lugares' });
  }
});

app.post('/api/places', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const id = body.id || `place-${Date.now()}`;
    const created = await createPlace({
      ...body,
      id,
      createdAt: new Date().toISOString(),
    });
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al crear lugar' });
  }
});

app.put('/api/places/:id', async (req: Request, res: Response) => {
  try {
    const updated = await updatePlace(req.params.id, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al actualizar lugar' });
  }
});

app.delete('/api/places/:id', async (req: Request, res: Response) => {
  try {
    await deletePlace(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al eliminar lugar' });
  }
});

// 5. Territorios
app.get('/api/territories', async (req: Request, res: Response) => {
  try {
    const congId = req.query.congregationId as string;
    if (!congId) return res.status(400).json({ error: 'congregationId requerido' });
    const list = await getTerritoriesList(congId);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener territorios' });
  }
});

app.post('/api/territories', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const id = body.id || `terr-${Date.now()}`;
    const created = await createTerritoryRecord({
      ...body,
      id,
      status: body.status || 'DISPONIBLE',
      polygon: body.polygon || [],
      active: true,
      createdAt: new Date().toISOString(),
    });
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al registrar territorio' });
  }
});

app.put('/api/territories/:id', async (req: Request, res: Response) => {
  try {
    const updated = await updateTerritoryRecord(req.params.id, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al actualizar territorio' });
  }
});

// Historial de Territorios
app.get('/api/territories/history', async (req: Request, res: Response) => {
  try {
    const congId = req.query.congregationId as string;
    const territoryId = req.query.territoryId as string | undefined;
    if (!congId) return res.status(400).json({ error: 'congregationId requerido' });
    const history = await getTerritoryHistoryList(congId, territoryId);
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al consultar historial' });
  }
});

app.post('/api/territories/:id/assign', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { publisherId, publisherName, date, congregationId, territoryNumber, notes } = req.body;

    const updated = await updateTerritoryRecord(id, {
      status: 'ASIGNADO',
      lastAssignedDate: date,
      lastAssignedToId: publisherId,
      lastAssignedToName: publisherName,
    });

    await createTerritoryHistoryRecord({
      id: `th-${Date.now()}`,
      territoryId: id,
      territoryNumber: territoryNumber || updated.number,
      congregationId,
      assignedToId: publisherId,
      assignedToName: publisherName,
      assignedDate: date,
      notes,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al asignar territorio' });
  }
});

app.post('/api/territories/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { date, congregationId } = req.body;

    const updated = await updateTerritoryRecord(id, {
      status: 'COMPLETADO',
      lastCompletedDate: date,
    });

    const historyList = await getTerritoryHistoryList(congregationId, id);
    if (historyList.length > 0 && !historyList[0].completedDate) {
      // Registrar fecha completada
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al completar territorio' });
  }
});

// 6. Asignaciones Semanales de Salida
app.get('/api/weekly-assignments', async (req: Request, res: Response) => {
  try {
    const congId = req.query.congregationId as string;
    if (!congId) return res.status(400).json({ error: 'congregationId requerido' });
    const list = await getWeeklyAssignmentsList(congId);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener asignaciones semanales' });
  }
});

app.post('/api/weekly-assignments', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const id = body.id || `wa-${Date.now()}`;
    const created = await createWeeklyAssignmentRecord({
      ...body,
      id,
      createdAt: new Date().toISOString(),
    });
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al crear asignación semanal' });
  }
});

app.put('/api/weekly-assignments/:id', async (req: Request, res: Response) => {
  try {
    const updated = await updateWeeklyAssignmentRecord(req.params.id, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al actualizar asignación semanal' });
  }
});

app.delete('/api/weekly-assignments/:id', async (req: Request, res: Response) => {
  try {
    await deleteWeeklyAssignmentRecord(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al eliminar asignación semanal' });
  }
});

// 7. Predicación Pública (Puntos y Turnos)
app.get('/api/public-places', async (req: Request, res: Response) => {
  try {
    const congId = req.query.congregationId as string;
    if (!congId) return res.status(400).json({ error: 'congregationId requerido' });
    const list = await getPublicPlacesList(congId);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener puntos públicos' });
  }
});

app.post('/api/public-places', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const id = body.id || `pub-pl-${Date.now()}`;
    const created = await createPublicPlaceRecord({
      ...body,
      id,
      createdAt: new Date().toISOString(),
    });
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al registrar punto público' });
  }
});

app.put('/api/public-places/:id', async (req: Request, res: Response) => {
  try {
    const updated = await updatePublicPlaceRecord(req.params.id, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al actualizar punto público' });
  }
});

app.delete('/api/public-places/:id', async (req: Request, res: Response) => {
  try {
    await deletePublicPlaceRecord(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al eliminar punto público' });
  }
});

app.get('/api/public-assignments', async (req: Request, res: Response) => {
  try {
    const congId = req.query.congregationId as string;
    if (!congId) return res.status(400).json({ error: 'congregationId requerido' });
    const list = await getPublicAssignmentsList(congId);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener turnos de carritos' });
  }
});

app.post('/api/public-assignments', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const id = body.id || `pa-${Date.now()}`;
    const created = await createPublicAssignmentRecord({
      ...body,
      id,
      createdAt: new Date().toISOString(),
    });
    res.json(created);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al crear turno de carritos' });
  }
});

app.put('/api/public-assignments/:id', async (req: Request, res: Response) => {
  try {
    const updated = await updatePublicAssignmentRecord(req.params.id, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al actualizar turno de carritos' });
  }
});

app.delete('/api/public-assignments/:id', async (req: Request, res: Response) => {
  try {
    await deletePublicAssignmentRecord(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al eliminar turno' });
  }
});

// 8. Bitácora de Auditoría
app.get('/api/audit-logs', async (req: Request, res: Response) => {
  try {
    const congId = req.query.congregationId as string;
    if (!congId) return res.status(400).json({ error: 'congregationId requerido' });
    const list = await getAuditLogsList(congId);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener auditoría' });
  }
});

app.post('/api/audit-logs', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    await createAuditLogRecord({
      ...body,
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al registrar auditoría' });
  }
});

// ====================================================
// VITE INTEGRATION EN DESARROLLO Y PRODUCCIÓN
// ====================================================
async function startServer() {
  await initializeDatabase();

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor activo en http://0.0.0.0:${PORT} con PostgreSQL`);
  });
}

export default app;

if (process.env.VERCEL !== '1') {
  startServer().catch((error) => {
    console.error('No se pudo iniciar el servidor:', error);
    process.exitCode = 1;
  });
}
