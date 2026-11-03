import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
const viewports = { desktop: { width: 1440, height: 1000 }, tablet: { width: 768, height: 1024 }, mobile: { width: 390, height: 844 } } as const;
// Preserve the existing browser/device projects; I6 owns only its test server and evidence.
export default defineConfig({ ...base, retries: 0, use: { ...base.use, baseURL: "http://localhost:5174", trace: "retain-on-failure", screenshot: "only-on-failure" }, projects: base.projects!.map(project => ({ ...project, use: { ...project.use, viewport: viewports[project.name as keyof typeof viewports] } })) });
