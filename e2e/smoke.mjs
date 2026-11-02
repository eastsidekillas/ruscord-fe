// End-to-end smoke test of the client against a running ruscord-core.
//
//   e2e/ci.sh ../ruscord-core      # everything in Docker, like CI does
//
// or against a stack of your own:
//
//   npm start                      # the client on http://localhost:4200
//   E2E_FIXTURES=../ruscord-core/internal/platform/imaging/testdata node e2e/smoke.mjs
//
// E2E_RESTART_CMD, when set, is a shell command that restarts the core; the
// smoke then checks that clients recover from it.
//
// Needs `npx playwright install chromium` once, and a fresh core: it
// registers ann_<n>, bob_<n>, cat_<n> with a random <n>. The core limits
// registrations to 5 an hour per address, so run it at most once an hour
// against the same core (or flush Valkey).
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';

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

// Puts a page's gateway socket through Playwright, so a test can drop it
// like a lost network (the page sees close 4000 and reconnects) and keep it
// down for a while. Frames are recorded like for other pages.
async function droppable(page) {
  page.wsRoutes = [];
  page.wsBlocked = false;
  await page.routeWebSocket(/\/gateway/, ws => {
    if (page.wsBlocked) {
      ws.close({ code: 4000, reason: 'test: network down' });
      return;
    }
    page.wsRoutes.push(ws);
    const server = ws.connectToServer();
    ws.onMessage(m => server.send(m));
    server.onMessage(m => {
      try { const x = JSON.parse(m); if (x.t) page.frames_.push(x); } catch { /* not JSON */ }
      ws.send(m);
    });
  });
}

function dropConnection(page) {
  page.wsBlocked = true;
  for (const ws of page.wsRoutes.splice(0)) ws.close({ code: 4000, reason: 'test: network down' }).catch(() => {});
}

// Every copy of a message on screen: exactly one is expected.
async function once(p, text) {
  const n = await p.getByText(text, { exact: true }).count();
  if (n !== 1) throw new Error(`"${text}" shown ${n} times`);
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

// Fake microphone and camera (a beep and a test pattern), allowed without asking.
const browser = await chromium.launch({
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const ann = await user(browser), bob = await user(browser), cat = await user(browser);
Object.assign(pages, { ann, bob, cat });
await droppable(ann);
await import('node:fs').then(fs => fs.mkdirSync(SHOTS, { recursive: true }));

await step('a wrong password shows the server\'s error and unlocks the form', async () => {
  await ann.goto(BASE + '/login');
  await ann.fill('#email', `nobody_${run}@example.com`);
  await ann.fill('#password', 'wrong-password');
  await ann.locator('button[type=submit]').click();
  await ann.getByRole('alert').getByText('Неверный email или пароль').waitFor({ timeout: 8000 });
  await ann.locator('button[type=submit]:enabled').waitFor({ timeout: 2000 });
});

await step('register three users', async () => {
  await register(ann, 'ann');
  await register(bob, 'bob');
  await register(cat, 'cat');
});

await step('friend request by username, live with the name, accepted', async () => {
  await ann.getByText('Добавить в друзья').first().click();
  await ann.fill('input[placeholder="Имя пользователя"]', name('bob'));
  await ann.locator('form button[type=submit]').click();
  await bob.getByRole('button', { name: /^Заявки/ }).click();
  await sees(bob, 'ANN');
  await bob.getByRole('button', { name: 'Принять' }).click();
  await ann.getByRole('button', { name: 'Все', exact: true }).click();
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

await step('reply, edit in place and delete in a DM; both sides see it live', async () => {
  const msg = (p, text) => p.locator('ChatItem', { hasText: text }).last();
  await msg(ann, 'пишу').hover();
  await msg(ann, 'пишу').getByRole('button', { name: 'Ответить' }).click();
  await ann.getByRole('button', { name: 'Отменить ответ' }).waitFor({ timeout: 8000 });
  await say(ann, 'ответ на пишу');
  await bob.locator('ChatItem', { hasText: 'ответ на пишу' }).getByText('пишу', { exact: true }).waitFor({ timeout: 8000 });
  await msg(ann, 'ответ на пишу').hover();
  await msg(ann, 'ответ на пишу').getByRole('button', { name: 'Изменить' }).click();
  const field = ann.getByLabel('Изменить сообщение');
  await field.fill('ответ, исправленный');
  await field.press('Enter');
  await sees(bob, 'ответ, исправленный');
  await msg(bob, 'ответ, исправленный').getByText('(изменено)').waitFor({ timeout: 8000 });
  await msg(ann, 'ответ, исправленный').hover();
  await msg(ann, 'ответ, исправленный').getByRole('button', { name: 'Удалить' }).click();
  await bob.getByText('ответ, исправленный').waitFor({ state: 'detached', timeout: 8000 });
});

await step('group: create with a friend, rename, both see it; the friend leaves', async () => {
  await ann.getByRole('button', { name: 'Создать группу' }).click();
  const dialog = ann.getByRole('dialog');
  await dialog.getByText('BOB', { exact: true }).click();
  await dialog.getByRole('button', { name: 'Создать группу' }).click();
  await ann.getByText('УЧАСТНИКИ — 2 ИЗ 10').waitFor({ timeout: 8000 });
  await ann.getByRole('button', { name: 'Переименовать группу' }).click();
  await ann.getByLabel('Название группы').fill('Поход');
  await ann.getByLabel('Название группы').press('Enter');
  await bob.getByRole('link', { name: /Поход/ }).click();
  await bob.getByRole('heading', { name: 'Поход' }).waitFor({ timeout: 8000 });
  await say(bob, 'беру палатку');
  await sees(ann, 'беру палатку');
  await bob.getByRole('button', { name: 'Выйти из группы' }).click();
  await bob.waitForURL(/\/channels\/me$/, { timeout: 8000 });
  await ann.getByText('УЧАСТНИКИ — 1 ИЗ 10').waitFor({ timeout: 8000 });
  // Back to the DM the next steps use.
  await ann.getByRole('link', { name: /BOB$/ }).click();
  await bob.getByRole('link', { name: /ANN$/ }).click();
});

await step('connection lost for 6 s: "no connection" shows, the gap is replayed once', async () => {
  const resumed = () => ann.frames_.filter(f => f.t === 'RESUMED').length;
  const before = resumed();
  dropConnection(ann);
  try {
    await say(bob, 'пока связи не было 1');
    await say(bob, 'пока связи не было 2');
    await sees(bob, 'пока связи не было 2');
    await sees(ann, 'Нет соединения', 8000);
    await ann.waitForTimeout(3000);
  } finally {
    ann.wsBlocked = false;
  }
  await sees(ann, 'пока связи не было 2', 40000);
  await once(ann, 'пока связи не было 1');
  await once(ann, 'пока связи не было 2');
  if (resumed() <= before) throw new Error('reconnected without RESUME');
  await ann.getByText('Нет соединения').first().waitFor({ state: 'hidden', timeout: 8000 });
});

await step('sending offline fails visibly and keeps the message; retry sends it once', async () => {
  const failed = ann.locator('[data-pending=failed]', { hasText: 'отправлю, когда будет сеть' });
  await ann.context().setOffline(true);
  try {
    await say(ann, 'отправлю, когда будет сеть');
    await failed.getByText('Не отправлено — нет связи').waitFor({ timeout: 5000 });
  } finally {
    await ann.context().setOffline(false);
  }
  await failed.getByRole('button', { name: 'Повторить' }).click();
  await sees(bob, 'отправлю, когда будет сеть');
  await once(bob, 'отправлю, когда будет сеть');
  await once(ann, 'отправлю, когда будет сеть');
});

if (process.env.E2E_RESTART_CMD) {
  await step('the core restarts: clients reconnect by themselves and talk on', async () => {
    execSync(process.env.E2E_RESTART_CMD, { stdio: 'inherit', shell: '/bin/bash' });
    await say(bob, 'после рестарта').catch(() => {});
    // The first send may hit the restart; the message stays with "retry".
    for (let i = 0; i < 20 && !(await bob.locator('ChatItem', { hasText: 'после рестарта' }).count()); i++) {
      await bob.waitForTimeout(1000);
      const retry = bob.locator('[data-pending=failed]').getByRole('button', { name: 'Повторить' });
      if (await retry.count()) await retry.first().click();
    }
    await sees(ann, 'после рестарта', 30000);
    await once(ann, 'после рестарта');
    await say(ann, 'и я на месте');
    await sees(bob, 'и я на месте');
  });
}

let invite = '';
await step('server with an icon, invite link, join by link', async () => {
  await ann.goto(BASE + '/channels/me');
  await ann.locator('SidebarCreateServer button, SidebarCreateServer div').first().click();
  await ann.fill('#channelName', 'Тестовый');
  await ann.setInputFiles('#avatar', `${FIX}/alpha.png`);
  await ann.getByRole('button', { name: 'Создать', exact: true }).click();
  await ann.waitForURL(/\/channels\/[0-9a-f-]{36}/);
  await ann.locator('ServerSidebar img[src*="/cdn/icons/"]').first().waitFor({ timeout: 8000 });
  await menu(ann, 'Пригласить людей');
  await ann.waitForFunction(() => /\/invite\//.test(document.querySelector('#i-link')?.value ?? ''), null, { timeout: 8000 });
  invite = (await ann.locator('#i-link').inputValue()).trim();
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
  await ann.fill('#cc-name', 'новости');
  const from = ann.url();
  await ann.getByRole('button', { name: 'Создать канал', exact: true }).click();
  // The new channel opens by itself (not just any channel URL: one was open already).
  await ann.waitForURL(u => u.href !== from && /\/channels\/[0-9a-f-]{36}\/[0-9a-f-]{36}/.test(u.pathname));
  await ann.locator('input[placeholder="Написать в #новости"]').waitFor({ timeout: 8000 });
  await sees(bob, 'новости');
  await say(ann, 'первая новость');
  await bob.getByText('новости').first().click();
  await sees(bob, 'первая новость');
});

await step('own nickname on the server: set, then reset', async () => {
  await menu(ann, 'Сменить ник');
  await ann.fill('#nk', 'Анюта');
  await ann.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await sees(ann, 'Ник сохранён');
  await menu(ann, 'Сменить ник');
  await ann.getByRole('button', { name: 'Сбросить', exact: true }).click();
  await sees(ann, 'Ник сброшен');
});

await step('voice: both enter the voice channel, hear who speaks, mute shows; the owner mutes and disconnects Bob', async () => {
  const room = p => p.locator('[data-voice-member]');
  for (const p of [ann, bob]) await p.locator('[data-voice-channel="General"]').click();
  for (const p of [ann, bob]) {
    await sees(p, 'Голос подключён', 15000);
    await room(p).nth(1).waitFor({ timeout: 15000 }); // both are listed
  }
  // The fake microphone beeps: LiveKit reports a speaker.
  await ann.locator('[data-speaking]').first().waitFor({ timeout: 15000 });
  await bob.locator('[data-voice-panel] button[title="Выключить микрофон"]').click();
  await ann.locator('[data-voice-member="BOB"] [title="Микрофон выключен"]').waitFor({ timeout: 10000 });
  await bob.locator('[data-voice-panel] button[title="Включить микрофон"]').click();

  // The owner mutes Bob: LiveKit takes his microphone away, his button goes grey.
  const bobRow = ann.locator('[data-voice-member="BOB"]');
  await bobRow.hover();
  await bobRow.locator('button[title="Выключить микрофон участнику"]').click();
  await bobRow.locator('[title="Микрофон выключил модератор"]').waitFor({ timeout: 10000 });
  await sees(bob, 'Модератор выключил вам микрофон', 10000);
  await bob.locator('[data-voice-panel] button[title="Микрофон выключил модератор"]:disabled').waitFor({ timeout: 10000 });
  await bobRow.hover();
  await bobRow.locator('button[title="Вернуть микрофон"]').click();
  await bob.locator('[data-voice-panel] button[title="Выключить микрофон"]:enabled').waitFor({ timeout: 10000 });

  // And disconnects him.
  await bobRow.hover();
  await bobRow.locator('button[title="Отключить от канала"]').click();
  await sees(bob, 'Вы отключены от голосового канала', 10000);
  await bobRow.waitFor({ state: 'detached', timeout: 10000 });

  await ann.locator('[data-voice-panel] button[title="Отключиться"]').click();
  await ann.locator('[data-voice-panel]').waitFor({ state: 'detached', timeout: 10000 });
  await room(ann).first().waitFor({ state: 'detached', timeout: 15000 });
  await bob.locator('[data-voice-panel] button[title="Скрыть"]').click();
});

await step('a role with kick rights, given to Bob, opens settings for him', async () => {
  await menu(ann, 'Настройки сервера');
  await ann.getByRole('button', { name: 'Роли' }).click();
  await ann.getByRole('button', { name: 'Создать роль' }).click();
  // The new role opens in the editor once created.
  await ann.waitForFunction(() => document.querySelector('#r-name')?.value === 'Новая роль', null, { timeout: 8000 });
  await ann.fill('#r-name', 'Модератор');
  await ann.getByText('Выгонять участников').click();
  await ann.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await ann.waitForTimeout(500);
  await ann.getByRole('button', { name: 'Участники' }).click();
  const row = ann.locator('[data-member]', { hasText: 'BOB' });
  await row.getByRole('button', { name: /^Выдать роль/ }).click();
  await row.getByRole('menuitem', { name: 'Модератор' }).click();
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
  const row = ann.locator('[data-member]', { hasText: 'CAT' });
  await row.getByRole('button', { name: 'Забанить' }).click();
  await ann.fill('#ban-r', 'нарушение правил');
  await ann.getByRole('dialog').getByRole('button', { name: 'Забанить' }).click();
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
  await ann.fill('#p-name', 'Аня');
  await ann.fill('#p-bio', 'Люблю Go');
  await ann.getByRole('button', { name: 'Сохранить' }).click();
  await sees(ann, 'Профиль обновлён');
  await ann.keyboard.press('Escape');
  await sees(bob, 'Аня');
  await bob.locator('img[src*="/cdn/avatars/"]').first().waitFor({ timeout: 8000 });
});

await step('devices: a new sign-in is announced, signing it out works at once; password change', async () => {
  const ann2 = await user(browser);
  await ann2.goto(BASE + '/login');
  await ann2.fill('#email', `${name('ann')}@example.com`);
  await ann2.fill('#password', 'password-ann');
  await ann2.locator('button[type=submit]').click();
  await ann2.waitForURL(/\/channels\/me/, { timeout: 10000 });
  await sees(ann, 'Вход с нового устройства');
  await ann.locator('[title="Настройки"]').click();
  await ann.getByRole('button', { name: 'Устройства и безопасность' }).click();
  await ann.locator('[data-session]').nth(1).waitFor({ timeout: 8000 });
  await ann.locator('[data-session]', { hasNotText: 'это устройство' }).getByRole('button', { name: 'Завершить' }).click();
  // Signed out at once: the socket closes and the session cannot be renewed.
  await ann2.waitForURL(/\/login/, { timeout: 10000 });
  await ann.fill('#pw-cur', 'password-ann');
  await ann.fill('#pw-new', 'password-ann-2');
  await ann.getByRole('button', { name: 'Сменить пароль' }).click();
  await sees(ann, 'Пароль изменён');
  await ann.keyboard.press('Escape');
  await ann2.context().close();
});

await step('block from the friends page: the friend is gone on both sides; unblock', async () => {
  await cat.goto(BASE + '/channels/me');
  await cat.fill('#friend-add', name('ann'));
  await cat.locator('form button[type=submit]').click();
  await sees(cat, 'Запрос в друзья отправлен');
  await ann.goto(BASE + '/channels/me');
  await ann.getByRole('button', { name: /^Заявки/ }).click();
  await ann.locator('[data-rel]', { hasText: 'CAT' }).getByRole('button', { name: 'Принять' }).click();
  await ann.getByRole('button', { name: 'Все', exact: true }).click();
  await ann.locator('[data-rel]', { hasText: 'CAT' }).getByRole('button', { name: 'Заблокировать' }).click();
  await ann.getByRole('button', { name: 'Заблокированные' }).click();
  await ann.locator('[data-rel]', { hasText: 'CAT' }).waitFor({ timeout: 8000 });
  await cat.getByRole('button', { name: 'Все', exact: true }).click();
  await sees(cat, 'У вас пока нет друзей');
  await ann.locator('[data-rel]', { hasText: 'CAT' }).getByRole('button', { name: 'Разблокировать' }).click();
  await sees(ann, 'Вы никого не заблокировали');
});

await step('Cat deletes her account; it cannot sign in again', async () => {
  await cat.goto(BASE + '/channels/me');
  await cat.locator('[title="Настройки"]').click();
  await cat.getByRole('button', { name: 'Устройства и безопасность' }).click();
  await cat.fill('#del-pw', 'password-cat');
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
