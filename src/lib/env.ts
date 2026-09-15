/**
 * True when running against a production environment/database. Used to
 * guard destructive or data-seeding scripts that must never touch prod.
 *
 * NODE_ENV/VERCEL_ENV are checked first since they're set by the platform
 * itself and can't be forgotten in a connection string. PRODUCTION_DB_HOST_MARKER
 * is a belt-and-suspenders fallback: set it to a distinguishing substring of
 * your Neon production branch's host (e.g. its branch id) once you know it,
 * so a misconfigured DATABASE_URL is still caught even if the platform env
 * vars are somehow wrong.
 */
export function isProductionEnvironment(env: Partial<NodeJS.ProcessEnv> = process.env): boolean {
  if (env.NODE_ENV === "production") return true;
  if (env.VERCEL_ENV === "production") return true;

  const marker = env.PRODUCTION_DB_HOST_MARKER;
  if (marker && env.DATABASE_URL?.includes(marker)) return true;

  return false;
}
