import { defineConfig } from "drizzle-kit";

// drizzle-kit doesn't read .env on its own; Node 22 can.
try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on the environment.
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  // Migrations need a direct connection; Neon provides it as DATABASE_URL_UNPOOLED.
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
  strict: true,
});
