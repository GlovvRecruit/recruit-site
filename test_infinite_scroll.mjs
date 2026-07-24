import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
await page.goto("https://beauty-recruit.vercel.app/brand-jobs", { waitUntil: "networkidle" });

async function info() {
  return page.evaluate(() => ({
    cards: document.querySelectorAll("a.card-shadow").length,
    scrollY: window.scrollY,
    docHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    sentinelText: document.body.innerText.includes("불러오는 중"),
  }));
}

console.log("initial:", await info());
for (let i = 0; i < 5; i++) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(1500);
  console.log(`after scroll ${i + 1}:`, await info());
}
await browser.close();
