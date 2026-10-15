/**
 * Script de inicialización automatizada de la base de datos en Appwrite
 * 
 * Uso:
 *   node scripts/setup-appwrite-db.js
 * 
 * Requiere variables de entorno en .env o pasadas al comando:
 *   VITE_APPWRITE_ENDPOINT
 *   VITE_APPWRITE_PROJECT_ID
 *   APPWRITE_FUNCTION_API_KEY (clave API con scopes databases.write y databases.read)
 *   APPWRITE_DATABASE_ID (opcional, por defecto 'congregacion_db')
 *   APPWRITE_RECORDS_TABLE_ID (opcional, por defecto 'congregation_records')
 */

import { Client, Databases } from 'node-appwrite';
import dotenv from 'dotenv';

dotenv.config();

const endpoint =
  process.env.APPWRITE_ENDPOINT ||
  process.env.VITE_APPWRITE_ENDPOINT ||
  'https://cloud.appwrite.io/v1';

const projectId =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.VITE_APPWRITE_PROJECT_ID;

const apiKey =
  process.env.APPWRITE_FUNCTION_API_KEY ||
  process.env.APPWRITE_API_KEY;

const databaseId =
  process.env.APPWRITE_DATABASE_ID ||
  'congregacion_db';

const collectionId =
  process.env.APPWRITE_RECORDS_TABLE_ID ||
  'congregation_records';

async function setupDatabase() {
  console.log('====================================================');
  console.log('Inicializador de Base de Datos - Organizador de la Predicación');
  console.log('====================================================');

  if (!projectId || projectId === 'tu_project_id_aqui') {
    console.error('❌ Error: Falta VITE_APPWRITE_PROJECT_ID en el archivo .env');
    process.exit(1);
  }

  if (!apiKey || apiKey === 'standard_appwrite_api_key_secret') {
    console.error('❌ Error: Falta APPWRITE_FUNCTION_API_KEY en el archivo .env');
    console.error('   Genera una API Key en Appwrite Console > Settings > API Keys con permisos de databases.*');
    process.exit(1);
  }

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const db = new Databases(client);

  console.log(`Endpoint: ${endpoint}`);
  console.log(`Project ID: ${projectId}`);
  console.log(`Database ID: ${databaseId}`);
  console.log(`Collection ID: ${collectionId}`);
  console.log('----------------------------------------------------');

  // 1. Crear o verificar Base de Datos
  try {
    console.log(`1. Verificando base de datos "${databaseId}"...`);
    await db.get(databaseId);
    console.log(`   ✓ La base de datos "${databaseId}" ya existe.`);
  } catch (err) {
    console.log(`   Creando base de datos "${databaseId}"...`);
    try {
      await db.create(databaseId, 'Base de Datos de Predicación');
      console.log(`   ✓ Base de datos creada con éxito.`);
    } catch (createErr) {
      console.error(`   ❌ Fallo al crear base de datos: ${createErr.message}`);
      process.exit(1);
    }
  }

  // 2. Crear o verificar Colección / Tabla
  try {
    console.log(`2. Verificando colección "${collectionId}"...`);
    await db.getCollection(databaseId, collectionId);
    console.log(`   ✓ La colección "${collectionId}" ya existe.`);
  } catch (err) {
    console.log(`   Creando colección "${collectionId}"...`);
    try {
      await db.createCollection(
        databaseId,
        collectionId,
        'Registros Congregacionales',
        [], // Sin acceso público directo; acceso solo mediante la Function con API Key
        false
      );
      console.log(`   ✓ Colección creada con éxito.`);
    } catch (createErr) {
      console.error(`   ❌ Fallo al crear colección: ${createErr.message}`);
      process.exit(1);
    }
  }

  // 3. Crear Atributos requeridos
  const attributes = [
    { key: 'recordType', type: 'string', size: 64, required: true },
    { key: 'congregationId', type: 'string', size: 64, required: true },
    { key: 'userId', type: 'string', size: 64, required: false },
    { key: 'entityId', type: 'string', size: 64, required: false },
    { key: 'payload', type: 'string', size: 65535, required: true },
  ];

  console.log('3. Creando atributos en la colección...');
  for (const attr of attributes) {
    try {
      await db.createStringAttribute(
        databaseId,
        collectionId,
        attr.key,
        attr.size,
        attr.required
      );
      console.log(`   ✓ Atributo "${attr.key}" (tamaño: ${attr.size}) creado.`);
    } catch (attrErr) {
      if (attrErr.message?.includes('already exists') || attrErr.code === 409) {
        console.log(`   - Atributo "${attr.key}" ya existe.`);
      } else {
        console.warn(`   ⚠️ Advertencia en atributo "${attr.key}": ${attrErr.message}`);
      }
    }
  }

  // Esperar 3 segundos para que Appwrite procese los atributos antes de crear índices
  console.log('   Esperando procesamiento de atributos en Appwrite...');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // 4. Crear Índices
  const indexes = [
    { key: 'idx_congregation_type', type: 'key', attributes: ['congregationId', 'recordType'] },
    { key: 'idx_user_lookup', type: 'key', attributes: ['userId', 'recordType'] },
    { key: 'idx_entity_lookup', type: 'key', attributes: ['entityId'] },
  ];

  console.log('4. Creando índices para optimizar consultas...');
  for (const idx of indexes) {
    try {
      await db.createIndex(
        databaseId,
        collectionId,
        idx.key,
        idx.type,
        idx.attributes
      );
      console.log(`   ✓ Índice "${idx.key}" creado.`);
    } catch (idxErr) {
      if (idxErr.message?.includes('already exists') || idxErr.code === 409) {
        console.log(`   - Índice "${idx.key}" ya existe.`);
      } else {
        console.warn(`   ⚠️ Advertencia en índice "${idx.key}": ${idxErr.message}`);
      }
    }
  }

  console.log('====================================================');
  console.log('🎉 ¡Estructura de base de datos lista e inicializada con éxito!');
  console.log('====================================================');
}

setupDatabase().catch((e) => {
  console.error('Error no controlado:', e);
  process.exit(1);
});
