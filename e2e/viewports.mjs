// Screens of the main flows at phone, tablet and laptop widths, with the
// checks that a narrow screen breaks first: horizontal overflow and whether
// the parts you need (servers, channels, the message input) are on screen.
//
//   E2E_BASE=http://localhost:8081 node e2e/viewports.mjs   # → e2e/viewports/*.png
//
// It reports, it does not fail: the layout for narrow screens is not done yet.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.E2E_BASE ?? 'http://localhost:4200';
const OUT = process.env.E2E_VIEWPORTS ?? 'e2e/viewports';
const WIDTHS = [[390, 844, 'phone'], [768, 1024, 'tablet'], [1280, 800, 'laptop']];
const run = Math.random().toString(36).slice(2, 7);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 850 } });
const page = await ctx.newPage();

// One account with a DM-less home, a server and a channel.
await page.goto(BASE + '/login');
await page.locator('a', { hasText: 'Зарегистрироваться' }).click();
await page.fill('#email', `vp_${run}@example.com`);
await page.fill('#name', 'VP');
await page.fill('#username', `vp_${run}`);
await page.fill('#password', 'password-vp');
await page.locator('button[type=submit]').click();
await page.waitForURL(/\/channels\/me/);
await page.locator('SidebarCreateServer button, SidebarCreateServer div').first().click();
await page.fill('#channelName', 'Сервер');
await page.getByRole('button', { name: 'Создать сервер' }).click();
await page.waitForURL(/\/channels\/[0-9a-f-]{36}\/[0-9a-f-]{36}/);
const channelUrl = page.url();

const screens = [
  ['login', BASE + '/login', null],
  ['home', BASE + '/channels/me', null],
  ['channel', channelUrl, 'textarea[placeholder^="Написать"]'],
];

const visible = sel => page.evaluate(s => {
  const el = document.querySelector(s);
  if (!el) return 'missing';
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.left >= 0 && r.right <= innerWidth + 1 && r.top < innerHeight ? 'on screen' : `off screen (${Math.round(r.left)}..${Math.round(r.right)} of ${innerWidth})`;
}, sel);

const report = [];
for (const [w, h, label] of WIDTHS) {
  await page.setViewportSize({ width: w, height: h });
  for (const [name, url, must] of screens) {
    if (name === 'login') await ctx.clearCookies().then(() => {}); // see the sign-in form
    await page.goto(url);
    await page.waitForTimeout(1500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    const line = [`${label} ${w}px ${name}`, overflow > 1 ? `horizontal overflow ${overflow}px` : 'no overflow'];
    if (must) line.push(`input ${await visible(must)}`);
    await page.screenshot({ path: `${OUT}/${label}-${name}.png` });
    report.push(line.join(', '));
    if (name === 'login') {
      // Sign back in for the next screens.
      await page.fill('#email', `vp_${run}@example.com`);
      await page.fill('#password', 'password-vp');
      await page.locator('button[type=submit]').click();
      await page.waitForURL(/\/channels\/me/);
    }
  }
}
console.log(report.join('\n'));
await browser.close();
