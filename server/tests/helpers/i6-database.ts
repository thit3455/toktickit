import { PrismaClient } from "@prisma/client";
type Kind = "workflow" | "dashboard" | "recovery";
const refuse = (): never => { throw new Error("Issue #6 requires its explicitly approved owned test configuration. Connection details suppressed."); };
function parse(value: string | undefined): URL { try {
    if (!value)
        return refuse();
    return new URL(value);
}
catch {
    return refuse();
} }
export function assertI6DatabaseConfiguration(env: NodeJS.ProcessEnv = process.env, kind: Kind = "workflow") {
    if (env.LAB4_I6_TEST_APPROVED !== "1" || !/^[a-f0-9]{12}$/.test(env.LAB4_I6_EXPECTED_NONCE ?? ""))
        return refuse();
    const variable = kind === "workflow" ? "LAB4_TEST_DATABASE_URL" : kind === "dashboard" ? "LAB4_I6_DASHBOARD_DATABASE_URL" : "LAB4_RECOVERY_DATABASE_URL";
    const url = parse(env[variable]), port = Number(url.port), nonce = env.LAB4_I6_EXPECTED_NONCE;
    const database = kind === "workflow" ? "toktickit_lab4_test_i4_" + nonce : kind === "dashboard" ? "toktickit_lab4_test_i5_" + nonce : "toktickit_lab4_test_i6_recovery_" + nonce;
    const role = kind === "dashboard" ? "toktickit_lab4_i5_runner" : "toktickit_lab4_i4_runner";
    let user: string;
    try {
        user = decodeURIComponent(url.username);
    }
    catch {
        return refuse();
    }
    if (!["postgres:", "postgresql:"].includes(url.protocol) || url.hostname !== "127.0.0.1" || !Number.isInteger(port) || port < 1024 || port > 65535 || ["5432", "5433", "55432"].includes(url.port)
        || url.port !== env.LAB4_I6_EXPECTED_PORT || url.pathname !== "/" + database || user !== role || !url.password || url.hash
        || [...url.searchParams.keys()].some(key => !["schema", "sslmode", "connect_timeout", "application_name"].includes(key))
        || new Set(url.searchParams.keys()).size !== [...url.searchParams.keys()].length || (url.searchParams.get("schema") ?? "public") !== "public")
        return refuse();
    return url;
}
export function assertI6OwnedApplicationConfiguration(env: NodeJS.ProcessEnv = process.env) {
    const base = assertI6DatabaseConfiguration(env), owned = parse(env.DATABASE_URL);
    const schema = env.LAB4_I6_OWNED_SCHEMA;
    if (!/^lab4_[a-f0-9]{32}$/.test(schema ?? "") || owned.searchParams.get("schema") !== schema)
        return refuse();
    const withoutSchema = new URL(owned);
    withoutSchema.searchParams.delete("schema");
    base.searchParams.delete("schema");
    if (withoutSchema.href !== base.href || owned.searchParams.getAll("schema").length !== 1)
        return refuse();
    return owned;
}
export function ownedI6Prisma(env: NodeJS.ProcessEnv = process.env) {
    return new PrismaClient({ datasources: { db: { url: assertI6OwnedApplicationConfiguration(env).href } }, log: [] });
}
export function assertI6ApiUrl(env: NodeJS.ProcessEnv = process.env) {
    assertI6DatabaseConfiguration(env);
    const url = parse(env.E2E_API_URL), port = Number(url.port);
    if (url.protocol !== "http:" || url.hostname !== "localhost" || !Number.isInteger(port) || port < 1024 || port > 65535
        || ["3000", "3001", "3002", "3003", "5173", "5174", "5432", "5433", "55432"].includes(url.port)
        || url.port !== env.LAB4_I6_OWNED_API_PORT || url.username || url.password || url.pathname !== "/" || url.search || url.hash)
        return refuse();
    return url.origin;
}
