import { PrismaClient } from "@prisma/client";
import { disposableUrl, isolatedLab4Database } from "./lab4-database.js";
export function assertI5DatabaseConfiguration(env: NodeJS.ProcessEnv = process.env) {
  if (env.LAB4_I5_TEST_APPROVED !== "1" || !env.LAB4_TEST_DATABASE_URL) throw new Error("Explicit approval and a dedicated Issue #5 database are required.");
  let url: URL;
  try { url = new URL(env.LAB4_TEST_DATABASE_URL); } catch { throw new Error("Invalid Issue #5 test configuration. Details suppressed."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hostname !== "127.0.0.1" || !url.port || ["5432", "5433", "55432"].includes(url.port)
    || !/^[1-9]\d*$/.test(url.port) || url.port !== env.LAB4_I5_EXPECTED_PORT
    || !/^\/toktickit_lab4_test_i5_[a-f0-9]{12}$/.test(url.pathname) || url.pathname.slice(1) !== env.LAB4_I5_EXPECTED_DATABASE
    || decodeURIComponent(url.username) !== "toktickit_lab4_i5_runner" || !url.password
    || [...url.searchParams.keys()].some(key => !["schema", "sslmode", "connect_timeout", "application_name"].includes(key)))
    throw new Error("Refusing a target other than the approved newly owned Issue #5 database.");
  return url;
}
export async function openI5Database() {
  const expected = assertI5DatabaseConfiguration();
  const url = disposableUrl();
  if (url.href !== expected.href) throw new Error("Issue #5 target changed during preflight.");
  const inspector = new PrismaClient({ datasources: { db: { url: expected.href } }, log: [] });
  try {
    const [identity] = await inspector.$queryRaw<Array<{ database: string; version: number; safe_role: boolean; permissions: boolean }>>`
      SELECT current_database() AS database, current_setting('server_version_num')::int AS version,
      (NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication AND NOT rolbypassrls) AS safe_role,
      (has_database_privilege(current_user,current_database(),'CONNECT') AND has_database_privilege(current_user,current_database(),'CREATE') AND has_database_privilege(current_user,current_database(),'TEMPORARY')) AS permissions
      FROM pg_roles WHERE rolname=current_user`;
    if (!identity || identity.database !== process.env.LAB4_I5_EXPECTED_DATABASE || identity.version < 180000 || identity.version >= 190000 || !identity.safe_role || !identity.permissions)
      throw new Error("Issue #5 server identity or runner permissions refused.");
    const [tables] = await inspector.$queryRaw<Array<{ count: number }>>`SELECT count(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND c.relkind IN ('r','p','v','m','f')`;
    if (tables.count !== 0) throw new Error("Issue #5 requires an empty owned target; existing tables are never reused or removed.");
  } finally { await inspector.$disconnect(); }
  return isolatedLab4Database();
}
