import { chromium } from "playwright";
const browser = await chromium.launch();

const mobile = await browser.newPage({ viewport: { width: 375, height: 700 } });
await mobile.goto("https://beauty-recruit.vercel.app/about", { waitUntil: "networkidle" });
await mobile.screenshot({ path: "about_mobile.png" });

const desktop = await browser.newPage({ viewport: { width: 1440, height: 800 } });
await desktop.goto("https://beauty-recruit.vercel.app/about", { waitUntil: "networkidle" });
await desktop.screenshot({ path: "about_desktop.png" });

await browser.close();
console.log("done");
