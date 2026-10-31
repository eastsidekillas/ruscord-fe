// End-to-end smoke test of the client against a running ruscord-core.
//
//   npm start                      # the client on http://localhost:4200
//   E2E_FIXTURES=../ruscord-core/internal/platform/imaging/testdata node e2e/smoke.mjs
//
// Needs `npx playwright install chromium` once, and a fresh core: it
// registers ann_<n>, bob_<n>, cat_<n> with a random <n>. The core limits
// registrations to 5 an hour per address, so run it at most once an hour
// against the same core (or flush Valkey).
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE ?? 'http://localhost:4200';
const FIX = process.env.E2E_FIXTURES ?? '../ruscord-core/internal/platform/imaging/testdata';
const run = Math.random().toString(36).slice(2, 7);
const name = n => `${n}_${run}`;
const SHOTS = process.env.E2E_SHOTS ?? 'e2e/failures';
let failed = 0;
const pages = {};

async function user(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 850 } });
  const page = await ctx.newPage();
  page.errors = [];
  page.frames_ = [];
  page.on('pageerror', e => page.errors.push(e.message));
  // Anything the Content-Security-Policy blocks is a bug: the page needs it.
  page.on('console', m => { if (/Content Security Policy/i.test(m.text())) page.errors.push(m.text()); });
  page.on('websocket', ws => ws.on('framereceived', f => {
    try { const x = JSON.parse(f.payload); if (x.t) page.frames_.push(x); } catch { /* not JSON */ }
  }));
  page.on('dialog', d => d.accept(d.type() === 'prompt' ? 'нарушение правил' : undefined));
  return page;
}

async function register(page, n) {
  await page.goto(BASE + '/login');
  await page.locator('a', { hasText: 'Зарегистрироваться' }).click();
  await page.locator('#username').waitFor();
  await page.fill('#email', `${name(n)}@example.com`);
  await page.fill('#name', n.toUpperCase());
  await page.fill('#username', name(n));
  await page.fill('#password', `password-${n}`);
  await page.locator('button[type=submit]').click();
  await page.waitForURL(/\/channels\/me/, { timeout: 10000 });
}

async function step(title, fn) {
  try {
    await fn();
    console.log('ok  ', title);
  } catch (e) {
    failed++;
    console.log('FAIL', title, '—', e.message.split('\n')[0]);
    const slug = title.replace(/\W+/g, '_').slice(0, 40);
    for (const [n, p] of Object.entries(pages)) {
      await p.screenshot({ path: `${SHOTS}/${slug}-${n}.png` }).catch(() => {});
    }
  }
}

const input = p => p.locator('input[placeholder^="Написать"]').first();
async function say(p, text) {
  await input(p).fill(text);
  await input(p).press('Enter');
}
const sees = (p, text, timeout = 8000) => p.getByText(text).first().waitFor({ timeout });
const menu = async (p, item) => {
  await p.locator('[aria-label="Меню настроек"]').first().click();
  await p.getByText(item, { exact: true }).click();
};

const browser = await chromium.launch();
const ann = await user(browser), bob = await user(browser), cat = await user(browser);
Object.assign(pages, { ann, bob, cat });
await import('node:fs').then(fs => fs.mkdirSync(SHOTS, { recursive: true }));

await step('register three users', async () => {
  await register(ann, 'ann');
  await register(bob, 'bob');
  await register(cat, 'cat');
});

await step('friend request by username, live with the name, accepted', async () => {
  await ann.getByText('Добавить в друзья').first().click();
  await ann.fill('input[placeholder="Имя пользователя"]', name('bob'));
  await ann.locator('form button[type=submit]').click();
  await bob.getByText('Ожидание').first().click().catch(() => {});
  await sees(bob, 'ANN');
  await bob.getByRole('button', { name: 'Принять' }).click();
  await ann.getByText('Все').first().click().catch(() => {});
  await sees(ann, 'BOB');
});

await step('direct message both ways and typing', async () => {
  await ann.getByRole('button', { name: 'Написать' }).first().click();
  await ann.waitForURL(/\/channels\/me\/[0-9a-f-]{36}/);
  await say(ann, 'привет');
  await bob.goto(ann.url());
  await sees(bob, 'привет');
  await input(bob).pressSequentially('пишу', { delay: 50 });
  await sees(ann, 'печатает', 6000);
  await input(bob).press('Enter');
  await sees(ann, 'пишу');
});

let invite = '';
await step('server with an icon, invite link, join by link', async () => {
  await ann.goto(BASE + '/channels/me');
  await ann.locator('SidebarCreateServer button, SidebarCreateServer div').first().click();
  await ann.fill('#channelName', 'Тестовый');
  await ann.setInputFiles('#avatar', `${FIX}/alpha.png`);
  await ann.getByRole('button', { name: 'Создать сервер' }).click();
  await ann.waitForURL(/\/channels\/[0-9a-f-]{36}/);
  await ann.locator('ServerSidebar img[src*="/cdn/icons/"]').first().waitFor({ timeout: 8000 });
  await menu(ann, 'Пригласить участников');
  const link = ann.locator('span.font-mono');
  await link.waitFor({ timeout: 8000 });
  invite = (await link.innerText()).trim();
  await ann.keyboard.press('Escape');
  await ann.mouse.click(5, 5);
  for (const p of [bob, cat]) {
    await p.goto(invite);
    await p.getByRole('button', { name: 'Принять приглашение' }).click();
    await p.waitForURL(/\/channels\/[0-9a-f-]{36}\/[0-9a-f-]{36}/, { timeout: 8000 });
  }
});

await step('create a channel from the menu; others see it live', async () => {
  await menu(ann, 'Создать канал');
  await ann.fill('input[name=name]', 'новости');
  const from = ann.url();
  await ann.getByRole('button', { name: 'Создать', exact: true }).click();
  // The new channel opens by itself (not just any channel URL: one was open already).
  await ann.waitForURL(u => u.href !== from && /\/channels\/[0-9a-f-]{36}\/[0-9a-f-]{36}/.test(u.pathname));
  await ann.locator('input[placeholder="Написать в #новости"]').waitFor({ timeout: 8000 });
  await sees(bob, 'новости');
  await say(ann, 'первая новость');
  await bob.getByText('новости').first().click();
  await sees(bob, 'первая новость');
});

await step('a role with kick rights, given to Bob, opens settings for him', async () => {
  await menu(ann, 'Настройки сервера');
  await ann.getByRole('button', { name: 'Роли' }).click();
  await ann.fill('input[name=newRole]', 'Модератор');
  await ann.locator('input[name=newRole]').press('Enter');
  await ann.locator('input[name=roleName]').waitFor();
  await ann.getByText('Выгонять участников').click();
  await ann.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await ann.waitForTimeout(500);
  await ann.getByRole('button', { name: 'Участники' }).click();
  const row = ann.locator('div.flex.items-center.gap-2.py-1\\.5', { hasText: 'BOB' });
  await row.locator('select').selectOption({ label: 'Модератор' });
  await row.getByText('Модератор').waitFor({ timeout: 5000 });
  await ann.keyboard.press('Escape');
  await ann.mouse.click(5, 5);
  await bob.locator('[aria-label="Меню настроек"]').first().click();
  await sees(bob, 'Настройки сервера', 8000);
  await bob.mouse.click(5, 5);
});

await step('ban Cat: she loses the server and cannot come back; unban', async () => {
  await menu(ann, 'Настройки сервера');
  await ann.getByRole('button', { name: 'Участники' }).click();
  const row = ann.locator('div.flex.items-center.gap-2.py-1\\.5', { hasText: 'CAT' });
  await row.getByRole('button', { name: 'Забанить' }).click();
  await row.waitFor({ state: 'detached', timeout: 5000 });
  for (let i = 0; i < 40 && !cat.frames_.some(f => f.t === 'GUILD_DELETE'); i++) await cat.waitForTimeout(200);
  if (!cat.frames_.some(f => f.t === 'GUILD_DELETE')) throw new Error('no GUILD_DELETE for Cat');
  await cat.goto(invite);
  await cat.getByRole('button', { name: 'Принять приглашение' }).click();
  await sees(cat, 'Не удалось присоединиться', 5000);
  await ann.getByRole('button', { name: 'Баны' }).click();
  await sees(ann, 'нарушение правил');
  await ann.getByRole('button', { name: 'Разбанить' }).click();
  await sees(ann, 'Банов нет');
  await ann.keyboard.press('Escape');
  await ann.mouse.click(5, 5);
});

await step('profile: name, about me and avatar reach others live', async () => {
  await ann.locator('[title="Настройки"]').click();
  await ann.setInputFiles('input[type=file]', `${FIX}/photo.jpg`);
  await ann.fill('input[placeholder="Ваше имя..."]', 'Аня');
  await ann.fill('textarea[placeholder="Расскажи о себе..."]', 'Люблю Go');
  await ann.getByRole('button', { name: 'Сохранить' }).click();
  await sees(ann, 'Профиль обновлён');
  await ann.keyboard.press('Escape');
  await sees(bob, 'Аня');
  await bob.locator('img[src*="/cdn/avatars/"]').first().waitFor({ timeout: 8000 });
});

await step('Cat deletes her account; it cannot sign in again', async () => {
  await cat.goto(BASE + '/channels/me');
  await cat.locator('[title="Настройки"]').click();
  await cat.getByRole('button', { name: 'Удалить учётную запись' }).click();
  await cat.fill('input[placeholder="Пароль"]', 'password-cat');
  await cat.getByRole('button', { name: 'Удалить навсегда' }).click();
  await cat.waitForURL(/\/login/, { timeout: 8000 });
  await cat.fill('#email', `${name('cat')}@example.com`);
  await cat.fill('#password', 'password-cat');
  await cat.locator('button[type=submit]').click();
  await sees(cat, 'Неверный email или пароль', 5000).catch(async () => {
    if (!/\/login/.test(cat.url())) throw new Error('signed in after deletion');
  });
});

for (const [n, p] of [['ann', ann], ['bob', bob], ['cat', cat]]) {
  if (p.errors.length) {
    failed++;
    console.log('FAIL', `${n}: page errors`, p.errors.slice(0, 3));
  }
}
await browser.close();
console.log(failed ? `${failed} failed` : 'all passed');
process.exit(failed ? 1 : 0);
