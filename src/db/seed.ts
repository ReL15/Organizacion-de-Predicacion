import {
  getCongregationsList,
  createCongregationRecord,
  getUserByEmail,
  upsertUserRecord,
} from './queries.ts';
import { db } from './index.ts';
import { sql } from 'drizzle-orm';

export async function bootstrapDatabase() {
  await db.execute(sql`
    ALTER TABLE congregations
    ADD COLUMN IF NOT EXISTS city text,
    ADD COLUMN IF NOT EXISTS logo_url text,
    ADD COLUMN IF NOT EXISTS address text,
    ADD COLUMN IF NOT EXISTS latitude double precision,
    ADD COLUMN IF NOT EXISTS longitude double precision;

    ALTER TABLE territories
    ADD COLUMN IF NOT EXISTS last_progress text,
    ADD COLUMN IF NOT EXISTS last_progress_date text,
    ADD COLUMN IF NOT EXISTS last_progress_publisher text;

    ALTER TABLE weekly_assignments
    ADD COLUMN IF NOT EXISTS activity_type text DEFAULT 'TERRITORIO';
  `);

  const congregations = await getCongregationsList();
  let defaultCongId = 'cong-central-1';

  if (congregations.length === 0) {
    console.log('Inicializando congregación principal en Neon PostgreSQL...');
    const created = await createCongregationRecord({
      id: defaultCongId,
      name: 'Congregación Central',
      circuit: 'SV-01',
      timezone: 'America/El_Salvador',
    });
    defaultCongId = created.id;
  } else {
    defaultCongId = congregations[0].id;
  }

  const adminEmail = 'tch.rivlue15@gmail.com';
  const existingAdmin = await getUserByEmail(adminEmail);
  if (!existingAdmin) {
    console.log(`Registrando Usuario Maestro en PostgreSQL para ${adminEmail}...`);
    await upsertUserRecord({
      id: 'user-admin-master-1',
      uid: 'user-admin-master-1',
      congregationId: defaultCongId,
      firstName: 'Administrador',
      lastName: 'Maestro',
      fullName: 'Administrador Maestro',
      email: adminEmail,
      role: 'COORDINADOR',
      isMasterAdmin: true,
      canLeadPreaching: true,
      canPublicPreaching: true,
      active: true,
    });
  }

  console.log('Base de datos Neon PostgreSQL vinculada y lista.');
}
