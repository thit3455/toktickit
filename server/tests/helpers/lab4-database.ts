import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, isAbsolute } from "node:path";

export const lab4Migration = "20261029090000_actions_taken";
export function disposableUrl(variable = "LAB4_TEST_DATABASE_URL") {
  // Never fall back to DATABASE_URL or load .env. Naming and local-host guards
  // make the explicitly supplied disposable target reviewable before any write.
  const value = process.env[variable];
  if (!value) throw new Error(`Set ${variable} to an explicitly disposable local test database.`);
  let url: URL;
  try { url = new URL(value); }
  catch { throw new Error("Invalid disposable database configuration. Connection details suppressed."); }
  validateDisposableUrl(url);
  return url;
}
function validateDisposableUrl(url: URL) {
  if (!["postgresql:", "postgres:"].includes(url.protocol) || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || !/^\/toktickit_lab4_test_[a-zA-Z0-9_]+$/.test(url.pathname))
    throw new Error("Refusing an unverified database: use a local toktickit_lab4_test_* database.");
}
export function runDatabaseTool(command: string, args: string[], env = process.env) {
  try { return execFileSync(command, args, { env, stdio: "pipe", timeout: 120000, windowsHide: true }); }
  catch (error) {
    // The preserved Lab 3 migration creates a TEMP TABLE. Explain this known
    // permission failure without retaining/printing native output or its URLs.
    const failure = error as { stdout?: unknown; stderr?: unknown } | null;
    const output = [failure?.stdout, failure?.stderr]
      .filter((value): value is string | Buffer => typeof value === "string" || Buffer.isBuffer(value))
      .map(value => value.toString()).join("\n");
    const hint = /permission denied to create temporary tables in database/i.test(output)
      ? " Runner requires TEMPORARY on its dedicated test database to replay the preserved migrations." : "";
    throw new Error(`Disposable database operation failed (${command === process.execPath ? "Prisma CLI" : "PostgreSQL tool"}).${hint} Connection details suppressed.`);
  }
}

const postgresTools = ["psql", "pg_dump", "pg_restore"] as const;
type PostgresTool = typeof postgresTools[number];
type Postgres18Tools = Record<PostgresTool, string>;
function postgresToolEnvironment(): NodeJS.ProcessEnv {
  // Never inherit another libpq target/service/password, or unrelated DB URLs.
  // Copy rather than mutate the test runner's process environment.
  return Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^PG/i.test(key) && !/DATABASE_URL$/i.test(key)));
}
export function postgres18Tools(directory = process.env.LAB4_PG_BIN): Postgres18Tools {
  if (!directory || !isAbsolute(directory)) throw new Error("Set LAB4_PG_BIN to the absolute PostgreSQL 18 bin directory. PATH fallback is disabled.");
  const tools = {} as Postgres18Tools;
  for (const name of postgresTools) {
    const command = join(directory, `${name}${process.platform === "win32" ? ".exe" : ""}`);
    const version = runDatabaseTool(command, ["--version"], postgresToolEnvironment()).toString().trim();
    if (!new RegExp(`^${name} \\(PostgreSQL\\) 18\\.\\d+(?:[^\\r\\n]*)?$`).test(version))
      throw new Error("All Lab 4 PostgreSQL tools must report PostgreSQL 18. Version output suppressed.");
    tools[name] = command;
  }
  return tools;
}
export function runPostgresTool(tools: Postgres18Tools, name: PostgresTool, args: string[], connection?: URL) {
  const env = postgresToolEnvironment();
  if (!connection) return runDatabaseTool(tools[name], args, env);
  validateDisposableUrl(connection);
  // These are the supported local-test URL options; reject routing/service or
  // password overrides instead of allowing libpq to bypass the URL host guard.
  const options: Record<string, string> = { sslmode: "PGSSLMODE", connect_timeout: "PGCONNECT_TIMEOUT", application_name: "PGAPPNAME" };
  for (const [key, value] of connection.searchParams) {
    if (key === "schema") continue; // Prisma-only; pg_dump selects it explicitly.
    if (!Object.hasOwn(options, key)) throw new Error("Unsupported PostgreSQL tool URL option. Connection details suppressed.");
    env[options[key]] = value;
  }
  try {
    env.PGUSER = decodeURIComponent(connection.username);
    env.PGPASSWORD = decodeURIComponent(connection.password);
  } catch { throw new Error("Invalid disposable database credentials. Connection details suppressed."); }
  if (!env.PGUSER || !env.PGPASSWORD) throw new Error("Explicit disposable database username and password are required. Connection details suppressed.");
  env.PGHOST = connection.hostname.replace(/^\[|\]$/g, "");
  env.PGPORT = connection.port || "5432";
  env.PGDATABASE = connection.pathname.slice(1);
  // pg_restore needs an explicit --dbname to select direct restore mode. Supply
  // only the guarded plain database name, never a URI/conninfo or a password.
  return runDatabaseTool(tools[name], ["--no-password", `--dbname=${env.PGDATABASE}`, ...args], env);
}
export async function isolatedLab4Database() {
  const url = disposableUrl();
  const schema = `lab4_${randomUUID().replaceAll("-", "")}`;
  url.searchParams.set("schema", schema);
  const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  // CREATE (without IF NOT EXISTS) proves this invocation owns the empty schema.
  await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  const directory = mkdtempSync(join(tmpdir(), "toktickit-lab4-"));
  return { prisma, url, schema, directory,
    migrate(includeLab4 = true) {
      const target = join(directory, includeLab4 ? "current" : "baseline");
      mkdirSync(target, { recursive: true });
      writeFileSync(join(target, "schema.prisma"), readFileSync(resolve("prisma/schema.prisma")));
      mkdirSync(join(target, "migrations"), { recursive: true });
      for (const entry of readdirSync(resolve("prisma/migrations"))) {
        if (!includeLab4 && entry === lab4Migration) continue;
        cpSync(resolve("prisma/migrations", entry), join(target, "migrations", entry), { recursive: true });
      }
      runDatabaseTool(process.execPath, [resolve("node_modules/prisma/build/index.js"), "migrate", "deploy", "--schema", join(target, "schema.prisma")], { ...process.env, DATABASE_URL: url.toString() });
    },
    async dispose() {
      if (!/^lab4_[a-f0-9]{32}$/.test(schema) || url.searchParams.get("schema") !== schema) throw new Error("Refusing unsafe schema cleanup.");
      try { await prisma.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`); } finally { await prisma.$disconnect(); }
      // Keep temp migration/backup files for inspection; never recursively delete a computed path.
    },
  };
}
