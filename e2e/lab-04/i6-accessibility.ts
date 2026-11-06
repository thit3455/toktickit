import { expect, type Page, type TestInfo, type Locator } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
export async function keyboardActivate(page: Page, control: Locator) {
    await control.focus();
    await expect(control).toBeFocused();
    await page.keyboard.press("Enter");
}
export async function visibleFocus(page: Page, control: Locator) {
    await page.keyboard.press("Tab");
    await control.focus();
    await expect(control).toBeFocused();
    await expect.poll(() => control.evaluate(el => { const s = getComputedStyle(el); return (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none"; })).toBe(true);
}
export async function inspectScreen(page: Page, name: string, info: TestInfo, loading = false) {
    if (!loading)
        await page.waitForLoadState("networkidle");
    // Audit settled colors after real finite transitions; do not disable motion or contrast rules.
    await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(a => Number.isFinite(Number(a.effect?.getComputedTiming().endTime))).map(a => a.finished.catch(() => undefined))); await new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))); });
    const source = process.env.LAB4_I6_AXE_PATH, expected = resolve("artifacts/lab-04/i6-local/a11y-tools/node_modules/axe-core/axe.min.js");
    if (!source || resolve(source) !== expected || JSON.parse(readFileSync(resolve(dirname(source), "package.json"), "utf8")).version !== "4.14.0")
        throw Error("Use the pinned local I6 axe-core tool.");
    if (!await page.evaluate(() => Boolean((window as any).axe)))
        await page.addScriptTag({ content: readFileSync(source, "utf8") });
    const audit = await page.evaluate(async () => { const r = await (window as any).axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } }); return { version: r.testEngine.version, violations: r.violations.map((v: any) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n: any) => ({ target: n.target, failureSummary: n.failureSummary })) })), incomplete: r.incomplete.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })) }; });
    const layout = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, headings: [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(e => (e as HTMLElement).offsetParent !== null).map(e => ({ level: e.tagName, text: e.textContent?.trim() })), smallTargets: [...document.querySelectorAll("button,a[href],summary")].filter(e => (e as HTMLElement).offsetParent !== null).map(e => { const r = e.getBoundingClientRect(); return { name: e.textContent?.trim().slice(0, 80), width: r.width, height: r.height }; }).filter(r => r.width < 24 || r.height < 24) }));
    const geometry = await page.evaluate(() => {
        const controls = [...document.querySelectorAll<HTMLElement>("button,input,select,textarea,summary")].filter(e => e.offsetParent !== null);
        const overlaps: string[][] = [];
        const describe = (e: HTMLElement) => e.id || e.getAttribute("aria-label") || e.textContent?.trim().slice(0, 80) || e.tagName;
        for (let i = 0; i < controls.length; i++)
            for (let j = i + 1; j < controls.length; j++) {
                const a = controls[i], b = controls[j];
                if (a.contains(b) || b.contains(a))
                    continue;
                const x = a.getBoundingClientRect(), y = b.getBoundingClientRect();
                if (Math.min(x.right, y.right) - Math.max(x.left, y.left) > 1 && Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top) > 1)
                    overlaps.push([describe(a), describe(b)]);
            }
        const luminance = (rgb: number[]) => rgb.map(c => { const s = c / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; }).reduce((n, c, i) => n + c * [.2126, .7152, .0722][i], 0);
        // Closed native-select text is measurable in CSS; OS popup rendering still needs human review.
        const selectContrast = [...document.querySelectorAll<HTMLSelectElement>("select")].filter(e => e.offsetParent !== null && !e.disabled).map(e => {
            const s = getComputedStyle(e), fg = s.color.match(/[\d.]+/g)?.map(Number) ?? [], bg = s.backgroundColor.match(/[\d.]+/g)?.map(Number) ?? [];
            const opaque = fg.length >= 3 && bg.length >= 3 && (fg[3] ?? 1) === 1 && (bg[3] ?? 1) === 1 && s.opacity === "1";
            const a = luminance(fg.slice(0, 3)), b = luminance(bg.slice(0, 3));
            return { id: e.id, foreground: s.color, background: s.backgroundColor, ratio: opaque ? (Math.max(a, b) + .05) / (Math.min(a, b) + .05) : null };
        });
        return { overlaps, selectContrast };
    });
    await info.attach(name + "-audit", { body: JSON.stringify({ screen: name, project: info.project.name, viewport: page.viewportSize(), audit, layout, geometry }, null, 2), contentType: "application/json" });
    await page.screenshot({ path: info.outputPath(name + ".png"), fullPage: true });
    expect(layout.document, "No horizontal page overflow on " + name).toBeLessThanOrEqual(layout.viewport);
    expect(geometry.overlaps, "No overlapping controls on " + name).toEqual([]);
    for (const select of geometry.selectContrast) {
        expect(select.ratio, "Native select CSS contrast: " + select.id).not.toBeNull();
        expect(select.ratio!).toBeGreaterThanOrEqual(4.5);
    }
    expect(audit.violations, "axe findings on " + name).toEqual([]);
    return { audit, layout };
}
