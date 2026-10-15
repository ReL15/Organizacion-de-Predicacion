import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: connectionString
    ? {
        url: connectionString,
        ssl: false,
      }
    : {
        host: process.env.SQL_HOST || "localhost",
        user: process.env.SQL_ADMIN_USER || process.env.SQL_USER || "postgres",
        password: process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || "",
        database: process.env.SQL_DB_NAME || "postgres",
        ssl: false,
      },
  verbose: true,
});
