// Private-environment orchestration. No .env load or development target is permitted.
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { isolatedLab4Database } from "./lab4-database.js";
import { assertI6DatabaseConfiguration } from "./i6-database.js";
let owned: Awaited<ReturnType<typeof isolatedLab4Database>> | undefined;
let api: import("node:http").Server | undefined, frontend: {
    close(): Promise<void>;
} | undefined;
let disconnect: (() => Promise<void>) | undefined;
async function main() {
    for (const kind of ["workflow", "dashboard", "recovery"] as const)
        assertI6DatabaseConfiguration(process.env, kind);
    const root = resolve("."), mode = process.argv[2];
    if (!["backend", "legacy", "a11y"].includes(mode))
        throw Error("Unsupported I6 execution group.");
    process.chdir(resolve(root, "server"));
    owned = await isolatedLab4Database();
    owned.migrate();
    for (const name of ["Account and Access", "Hardware", "Software", "Network"])
        await owned.prisma.category.create({ data: { name } });
    for (let i = 0; i < 6; i++)
        await owned.prisma.relatedSystem.create({ data: { name: "I6 disposable office " + i } });
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^PG/i.test(key) && !/DATABASE_URL$/i.test(key)));
    Object.assign(env, { DATABASE_URL: owned.url.href, LAB4_TEST_DATABASE_URL: process.env.LAB4_TEST_DATABASE_URL, LAB4_RECOVERY_DATABASE_URL: process.env.LAB4_RECOVERY_DATABASE_URL, LAB4_I6_DASHBOARD_DATABASE_URL: process.env.LAB4_I6_DASHBOARD_DATABASE_URL, LAB4_I6_OWNED_SCHEMA: owned.schema });
    let args: string[], cwd: string;
    if (mode === "backend") {
        const exclude = ["lab-04/requester-dashboard.api.test.ts", "lab-04/staff-dashboard.api.test.ts", "lab-04/dashboard-performance.test.ts"];
        const available = readdirSync("tests", { recursive: true }).map(String).filter(file => file.endsWith(".test.ts") && !exclude.includes(file.replaceAll("\\", "/"))).map(file => "tests/" + file.replaceAll("\\", "/"));
        const requested = process.argv.slice(3);
        if (requested.some(file => !available.includes(file)))
            throw Error("Unknown backend file.");
        const files = requested.length ? requested : available;
        args = [resolve("node_modules/vitest/vitest.mjs"), "run", ...files, "--no-file-parallelism", "--reporter=dot"];
        cwd = process.cwd();
        console.log(JSON.stringify({ group: mode, files: files.length, ownedBootstrap: true, recoveryConfigured: true }));
    }
    else {
        process.env.DATABASE_URL = owned.url.href;
        const { app } = await import("../../src/app.js"), { getPrisma } = await import("../../src/prisma.js");
        disconnect = () => getPrisma().$disconnect();
        api = await new Promise<import("node:http").Server>((done, fail) => { const server = app.listen(0, "127.0.0.1", () => done(server)); server.once("error", fail); });
        const address = api.address();
        if (!address || typeof address === "string")
            throw Error("Owned API address unavailable.");
        env.E2E_API_URL = "http://localhost:" + address.port;
        env.LAB4_I6_OWNED_API_PORT = String(address.port);
        const { createServer } = await import(pathToFileURL(resolve(root, "client/node_modules/vite/dist/node/index.js")).href);
        const vite = await createServer({ root: resolve(root, "client"), configFile: resolve(root, "client/vite.config.ts"), cacheDir: resolve(root, "artifacts/lab-04/i6-local/legacy-vite-cache"), server: { host: "localhost", port: 5174, strictPort: true }, define: { "import.meta.env.VITE_API_URL": JSON.stringify(env.E2E_API_URL) }, logLevel: "silent" });
        frontend = vite;
        await vite.listen();
        cwd = root;
        const available = mode === "legacy" ? ["e2e/lab-02/requester-ticket-flow.spec.ts", "e2e/lab-03/authentication.spec.ts", "e2e/lab-03/user-administration.spec.ts"] : ["e2e/lab-04/accessibility-responsive.spec.ts"];
        const requested = process.argv.slice(3);
        if (requested.some(file => !available.includes(file)))
            throw Error("Unknown browser file.");
        const files = requested.length ? requested : available;
        const projects = (env.LAB4_I6_PROJECTS ?? "desktop,tablet,mobile").split(",");
        if (projects.some(p => !["desktop", "tablet", "mobile"].includes(p)))
            throw Error("Unknown test project.");
        const stamp = Date.now();
        env.PLAYWRIGHT_JSON_OUTPUT_FILE = resolve(root, "artifacts/lab-04/i6-local/" + mode + "-" + stamp + ".json");
        args = [resolve(root, "node_modules/@playwright/test/cli.js"), "test", "--config=playwright.i6.config.ts", ...files, ...projects.map(p => "--project=" + p), "--workers=1", "--output=artifacts/lab-04/i6-local/" + mode + "-browser-" + stamp, "--reporter=line,json"];
        console.log(JSON.stringify({ group: mode, ownedBootstrap: true, frontendPort: 5174, apiPort: address.port, files: files.length }));
    }
    const code = await new Promise<number | null>((done, fail) => { const child = spawn(process.execPath, args, { cwd, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }); child.stdout.on("data", data => process.stdout.write(data)); child.stderr.on("data", data => process.stderr.write(data)); child.once("error", () => fail(Error("Owned test subprocess unavailable."))); child.once("exit", done); });
    process.exitCode = code ?? 1;
}
main().catch(() => { console.error("Issue #6 owned execution failed; connection details suppressed."); process.exitCode = 1; }).finally(async () => { try {
    await frontend?.close();
    if (api)
        await new Promise<void>(done => { api!.close(() => done()); api!.closeAllConnections(); });
    await disconnect?.();
}
finally {
    await owned?.dispose();
} });
