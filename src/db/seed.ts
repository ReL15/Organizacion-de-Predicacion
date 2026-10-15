import {
  getCongregationsList,
  createCongregationRecord,
  getUserByEmail,
  upsertUserRecord,
} from './queries.ts';

export async function bootstrapDatabase() {
  try {
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

    // Asegurar Usuario Maestro para el correo del administrador
    const adminEmail = 'tch.rivlue15@gmail.com';
    const existingAdmin = await getUserByEmail(adminEmail);
    if (!existingAdmin) {
      console.log(`Registrando Usuario Maestro en PostgreSQL para ${adminEmail}...`);
      await upsertUserRecord({
        id: 'user-admin-master-1',
        uid: 'user-admin-master-1', // Se asociará dinámicamente si inicia con Firebase
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
  } catch (err) {
    console.error('Error durante la inicialización de la base de datos:', err);
  }
}
