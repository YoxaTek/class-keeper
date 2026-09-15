import { defineConfig } from "prisma/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";

// The Prisma CLI (migrate, db seed, studio, ...) only auto-loads `.env`,
// never `.env.local` — but `.env.local` is where local dev's DATABASE_URL
// (the Neon `dev` branch) lives, matching what `next dev` reads. This
// loads it explicitly so both tools point at the same database.
// It's a no-op in Vercel's build environment, where DATABASE_URL is
// already set directly (staging → the `staging` branch, production →
// `main`) and there is no .env.local file.
loadEnv({ path: path.join(__dirname, ".env.local"), quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
