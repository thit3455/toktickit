import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { basename, join, resolve } from "node:path";
import { disposableUrl, postgres18Tools, runDatabaseTool, runPostgresTool } from "../helpers/lab4-database.js";

// No native executable (including a version check) or database can run here.
vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));
const execute = vi.mocked(execFileSync);
const directory = resolve("postgres18-fixture");
const executable = (name: string) => join(directory, `${name}${process.platform === "win32" ? ".exe" : ""}`);
const sourcePassword = "fixture:p@ss/% +ไทย";
const source = () => new URL(`postgresql://fixture_runner:${encodeURIComponent(sourcePassword)}@127.0.0.1:55432/toktickit_lab4_test_actions?schema=lab4_fixture`);

beforeEach(() => {
  execute.mockReset();
  execute.mockImplementation(command => Buffer.from(`${basename(String(command)).replace(/\.exe$/, "")} (PostgreSQL) 18.0\r\n`));
});
afterEach(() => { vi.unstubAllEnvs(); });

describe("Explicit PostgreSQL 18 selection without a database", () => {
  it("checks all three absolute executables and ignores PATH", () => {
    vi.stubEnv("LAB4_PG_BIN", directory);
    vi.stubEnv("PATH", "untrusted-path-fixture");
    const tools = postgres18Tools();
    expect(tools).toEqual({ psql: executable("psql"), pg_dump: executable("pg_dump"), pg_restore: executable("pg_restore") });
    expect(execute.mock.calls.map(([command, args]) => [command, args])).toEqual([
      [tools.psql, ["--version"]], [tools.pg_dump, ["--version"]], [tools.pg_restore, ["--version"]],
    ]);
    expect(process.env.PATH).toBe("untrusted-path-fixture");
  });

  it.each(["", "relative-bin"])("refuses missing/relative bin configuration (%s) before launching anything", value => {
    expect(() => postgres18Tools(value)).toThrow("absolute PostgreSQL 18 bin directory");
    expect(execute).not.toHaveBeenCalled();
  });

  it.each(["17.7", "19.0", "180.0"])("rejects incompatible client version %s", version => {
    execute.mockImplementation(command => Buffer.from(`${basename(String(command)).replace(/\.exe$/, "")} (PostgreSQL) ${version}`));
    expect(() => postgres18Tools(directory)).toThrow("must report PostgreSQL 18");
  });

  it("rejects a mixed installation when a later tool has the wrong major", () => {
    execute.mockImplementation(command => Buffer.from(`${basename(String(command)).replace(/\.exe$/, "")} (PostgreSQL) ${String(command).includes("pg_restore") ? "17.7" : "18.1"}`));
    expect(() => postgres18Tools(directory)).toThrow("must report PostgreSQL 18");
    expect(execute).toHaveBeenCalledTimes(3);
  });

  it("suppresses failed executable details and does not fall back to PATH", () => {
    execute.mockImplementation(() => { throw new Error("fixture connection/password in stderr and native error"); });
    expect(() => postgres18Tools(directory)).toThrow(/^Disposable database operation failed \(PostgreSQL tool\). Connection details suppressed\.$/);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0]).toBe(executable("psql"));
  });

  it("does not include unexpected version output in errors", () => {
    execute.mockReturnValue(Buffer.from("fixture-sensitive-output"));
    expect(() => postgres18Tools(directory)).toThrow(/^All Lab 4 PostgreSQL tools must report PostgreSQL 18. Version output suppressed\.$/);
  });
});

describe("Recovery subprocess credentials without a database", () => {
  it("puts decoded credentials only in a child environment, not arguments or the parent", () => {
    vi.stubEnv("PGPASSWORD", "inherited-password-fixture");
    vi.stubEnv("PGSERVICE", "inherited-service-fixture");
    vi.stubEnv("PGHOSTADDR", "192.0.2.1");
    vi.stubEnv("PGOPTIONS", "inherited-options-fixture");
    vi.stubEnv("PGPASSFILE", "inherited-passfile-fixture");
    vi.stubEnv("LAB4_TEST_DATABASE_URL", source().toString());
    vi.stubEnv("LAB4_RECOVERY_DATABASE_URL", "fixture-secret-recovery-url");
    vi.stubEnv("DATABASE_URL", "fixture-unrelated-url");
    const connection = source(), original = connection.toString();
    const tools = postgres18Tools(directory);
    execute.mockClear();
    runPostgresTool(tools, "pg_dump", ["--format=custom", "--schema=lab4_fixture", "--file=fixture.dump"], connection);

    const [command, args, options] = execute.mock.calls[0];
    expect(command).toBe(executable("pg_dump"));
    expect(args).toEqual(["--no-password", "--dbname=toktickit_lab4_test_actions", "--format=custom", "--schema=lab4_fixture", "--file=fixture.dump"]);
    expect(JSON.stringify(args)).not.toContain(sourcePassword);
    expect(JSON.stringify(args)).not.toContain(encodeURIComponent(sourcePassword));
    expect(JSON.stringify(args)).not.toContain("postgresql://");
    const env = options!.env!;
    expect(env.PGPASSWORD).toBe(sourcePassword);
    expect(env.PGUSER).toBe("fixture_runner");
    expect(env.PGHOST).toBe("127.0.0.1");
    expect(env.PGPORT).toBe("55432");
    expect(env.PGDATABASE).toBe("toktickit_lab4_test_actions");
    for (const key of ["PGSERVICE", "PGHOSTADDR", "PGOPTIONS", "PGPASSFILE", "DATABASE_URL", "LAB4_TEST_DATABASE_URL", "LAB4_RECOVERY_DATABASE_URL"]) expect(env[key]).toBeUndefined();
    expect(options!.stdio).toBe("pipe");
    expect(options!.windowsHide).toBe(true);
    expect(process.env.PGPASSWORD).toBe("inherited-password-fixture");
    expect(process.env.DATABASE_URL).toBe("fixture-unrelated-url");
    expect(connection.toString()).toBe(original);
  });

  it("uses the destination credentials for a direct transactional restore and fresh credentials for each child", () => {
    const tools = postgres18Tools(directory);
    execute.mockClear();
    const target = new URL("postgresql://restore_runner:fixture-target-password@127.0.0.1:55432/toktickit_lab4_test_recovery");
    runPostgresTool(tools, "pg_dump", ["--format=custom"], source());
    runPostgresTool(tools, "pg_restore", ["--exit-on-error", "--single-transaction", "--no-owner", "--no-acl", "fixture.dump"], target);
    const [, args, options] = execute.mock.calls[1];
    expect(args).toEqual(["--no-password", "--dbname=toktickit_lab4_test_recovery", "--exit-on-error", "--single-transaction", "--no-owner", "--no-acl", "fixture.dump"]);
    expect(options!.env!.PGUSER).toBe("restore_runner");
    expect(options!.env!.PGPASSWORD).toBe("fixture-target-password");
    expect(execute.mock.calls[0][2]!.env!.PGPASSWORD).toBe(sourcePassword);
  });

  it("lists the archive without a connection or inherited credentials", () => {
    vi.stubEnv("PGPASSWORD", "inherited-password-fixture");
    const tools = postgres18Tools(directory);
    execute.mockClear();
    runPostgresTool(tools, "pg_restore", ["--list", "fixture.dump"]);
    expect(execute.mock.calls[0][1]).toEqual(["--list", "fixture.dump"]);
    expect(execute.mock.calls[0][2]!.env!.PGPASSWORD).toBeUndefined();
  });

  it("retains supported libpq options without forwarding Prisma schema", () => {
    const connection = source();
    connection.searchParams.set("sslmode", "disable");
    connection.searchParams.set("connect_timeout", "5");
    connection.searchParams.set("application_name", "lab4-recovery");
    const tools = postgres18Tools(directory);
    runPostgresTool(tools, "pg_dump", [], connection);
    const env = execute.mock.calls.at(-1)![2]!.env!;
    expect(env.PGSSLMODE).toBe("disable");
    expect(env.PGCONNECT_TIMEOUT).toBe("5");
    expect(env.PGAPPNAME).toBe("lab4-recovery");
    expect(env.PGOPTIONS).toBeUndefined();
  });

  it("normalizes the guarded IPv6 loopback address for libpq", () => {
    const connection = source(); connection.hostname = "[::1]";
    const tools = postgres18Tools(directory);
    runPostgresTool(tools, "pg_dump", [], connection);
    expect(execute.mock.calls.at(-1)![2]!.env!.PGHOST).toBe("::1");
  });

  it.each(["host", "service", "password"])("refuses query override %s without launching a recovery process", key => {
    const connection = source(); connection.searchParams.set(key, "fixture-override");
    const tools = postgres18Tools(directory); execute.mockClear();
    expect(() => runPostgresTool(tools, "pg_dump", [], connection)).toThrow(/^Unsupported PostgreSQL tool URL option. Connection details suppressed\.$/);
    expect(execute).not.toHaveBeenCalled();
  });

  it("refuses a non-disposable target without launching a recovery process", () => {
    const connection = source(); connection.pathname = "/development";
    const tools = postgres18Tools(directory); execute.mockClear();
    expect(() => runPostgresTool(tools, "pg_dump", [], connection)).toThrow("Refusing an unverified database");
    expect(execute).not.toHaveBeenCalled();
  });

  it.each(["", "%invalid"])("fails safely on missing/malformed password (%s)", password => {
    const connection = source(); connection.password = password;
    const tools = postgres18Tools(directory); execute.mockClear();
    expect(() => runPostgresTool(tools, "pg_dump", [], connection)).toThrow(/Connection details suppressed\.$/);
    expect(execute).not.toHaveBeenCalled();
  });

  it("suppresses native errors containing credentials, stdout, stderr and arguments", () => {
    const tools = postgres18Tools(directory);
    execute.mockImplementation(() => { throw Object.assign(new Error(source().toString()), { stdout: sourcePassword, stderr: sourcePassword }); });
    let failure: unknown;
    try { runPostgresTool(tools, "pg_restore", ["fixture.dump"], source()); } catch (error) { failure = error; }
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe("Disposable database operation failed (PostgreSQL tool). Connection details suppressed.");
    expect(Object.keys(failure as Error)).toEqual([]);
    expect((failure as Error).cause).toBeUndefined();
  });

  it.each(["stdout", "stderr"])("explains the migration TEMPORARY privilege failure safely from %s", stream => {
    execute.mockImplementation(() => { throw Object.assign(new Error(source().toString()), {
      [stream]: Buffer.from(`fixture-sensitive-details ${source().toString()}\nERROR: permission denied to create temporary tables in database \"toktickit_lab4_test_actions\"`),
    }); });
    let failure: unknown;
    try { runDatabaseTool(process.execPath, ["fixture-migrate"]); } catch (error) { failure = error; }
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe("Disposable database operation failed (Prisma CLI). Runner requires TEMPORARY on its dedicated test database to replay the preserved migrations. Connection details suppressed.");
    expect((failure as Error).stack).not.toContain("fixture-sensitive-details");
    expect((failure as Error).stack).not.toContain(source().toString());
    expect(Object.keys(failure as Error)).toEqual([]);
    expect((failure as Error).cause).toBeUndefined();
  });

  it("suppresses malformed URL input instead of leaking Node's invalid-URL input", () => {
    vi.stubEnv("LAB4_TEST_DATABASE_URL", "fixture-secret-invalid-url");
    expect(() => disposableUrl()).toThrow(/^Invalid disposable database configuration. Connection details suppressed\.$/);
  });
});
