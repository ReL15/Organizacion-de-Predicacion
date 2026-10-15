import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from './schema.ts';
import dotenv from 'dotenv';

dotenv.config();

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    let poolConfig: PoolConfig;

    if (connectionString) {
      poolConfig = {
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 10,
        connectionTimeoutMillis: 15000,
      };
    } else {
      if (!process.env.SQL_HOST || !process.env.SQL_USER || !process.env.SQL_DB_NAME) {
        throw new Error('Configura DATABASE_URL (o SQL_HOST, SQL_USER y SQL_DB_NAME) en el entorno.');
      }
      const isCloudSqlSocket = process.env.SQL_HOST && process.env.SQL_HOST.startsWith('/cloudsql');
      poolConfig = {
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 10,
        connectionTimeoutMillis: 15000,
        ssl: isCloudSqlSocket ? false : { rejectUnauthorized: false },
      };
    }

    global._postgresPool = new Pool(poolConfig);

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });
