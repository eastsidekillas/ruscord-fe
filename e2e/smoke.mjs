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
  // E2E_INSECURE: the test server's stack in CI has a local certificate.
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 850 }, ignoreHTTPSErrors: !!process.env.E2E_INSECURE });
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
    // What it was waiting for: the first lines of Playwright's call log.
    const log = e.message.split('\n').filter(l => /^\s+- /.test(l)).slice(0, 6);
    for (const l of log) console.log('     ', l.trim());
    const slug = title.replace(/\W+/g, '_').slice(0, 40);
    for (const [n, p] of Object.entries(pages)) {
      await p.screenshot({ path: `${SHOTS}/${slug}-${n}.png` }).catch(() => {});
    }
  }
}

const input = p => p.locator('textarea[placeholder^="Написать"]').first();
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

await step('a visit by a tagged link is counted and the tag goes with the sign-up', async () => {
  // A tab counts one visit; this one already opened /login above.
  await ann.evaluate(() => sessionStorage.removeItem('rc_visit'));
  const visit = ann.waitForResponse(r => r.url().endsWith('/api/v1/visits') && r.request().method() === 'POST');
  await ann.goto(BASE + '/?ref=E2E');
  if ((await visit).status() !== 204) throw new Error('visit not counted');
  const kept = await ann.evaluate(() => JSON.parse(localStorage.getItem('rc_ref') ?? 'null')?.ref);
  if (kept !== 'e2e') throw new Error(`tag kept: ${kept}`);
});

await step('register three users', async () => {
  const signup = ann.waitForRequest(r => r.url().endsWith('/api/v1/auth/register'));
  await register(ann, 'ann');
  if ((await signup).postDataJSON().ref !== 'e2e') throw new Error('the sign-up did not carry the tag');
  await register(bob, 'bob');
  await register(cat, 'cat');
});

await step('the statistics page does not exist for a non-admin', async () => {
  await bob.goto(BASE + '/admin');
  await sees(bob, 'Такой страницы нет.');
  await bob.goto(BASE + '/channels/me');
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

let dmUrl = '';
await step('direct message both ways and typing', async () => {
  await ann.getByRole('button', { name: 'Написать' }).first().click();
  await ann.waitForURL(/\/channels\/me\/[0-9a-f-]{36}/);
  dmUrl = ann.url();
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
  await ann.locator('textarea[placeholder="Написать в #новости"]').waitFor({ timeout: 8000 });
  await sees(bob, 'новости');
  await say(ann, 'первая новость');
  await bob.getByText('новости').first().click();
  await sees(bob, 'первая новость');
});

await step('markup and a mention from the suggestions: Bob sees bold, code, a link and the message highlighted', async () => {
  await input(ann).pressSequentially('**жирно** и `код` https://example.com @bo', { delay: 20 });
  await ann.getByRole('option', { name: new RegExp(name('bob'), 'i') }).first().waitFor({ timeout: 8000 });
  await input(ann).press('Enter'); // picks the suggestion
  await input(ann).press('Enter'); // sends
  const msg = bob.locator('ChatItem[data-mentioned]', { hasText: 'жирно' }).last();
  await msg.waitFor({ timeout: 8000 });
  await msg.locator('strong', { hasText: 'жирно' }).waitFor({ timeout: 2000 });
  await msg.locator('code', { hasText: 'код' }).waitFor({ timeout: 2000 });
  await msg.locator('a[href="https://example.com"]').waitFor({ timeout: 2000 });
  // Shown by the name on the server: Bob's display name (registration sets it to BOB).
  await msg.getByText('@BOB', { exact: true }).waitFor({ timeout: 2000 });
  // The author's own copy is not highlighted.
  await ann.locator('ChatItem', { hasText: 'жирно' }).last().waitFor();
  if (await ann.locator('ChatItem[data-mentioned]', { hasText: 'жирно' }).count()) throw new Error('own message is highlighted');
});

await step('the paperclip opens the file chooser, and the chosen file waits in the composer', async () => {
  const errors = [];
  const onError = m => m.type() === 'error' && errors.push(m.text());
  ann.on('console', onError);
  try {
    const clip = ann.locator('MessageInput [data-attach]');
    await clip.click({ trial: true, timeout: 4000 }); // visible and not covered
    const [chooser] = await Promise.all([ann.waitForEvent('filechooser', { timeout: 4000 }), clip.click()]);
    await chooser.setFiles({ name: 'скрепка.txt', mimeType: 'text/plain', buffer: Buffer.from('x') });
    await ann.getByRole('list', { name: 'Файлы к отправке' }).getByText('скрепка.txt').waitFor({ timeout: 4000 });
    await ann.getByRole('button', { name: 'Убрать скрепка.txt' }).click();
  } catch (e) {
    console.log('     console errors:', errors.slice(0, 5));
    throw e;
  } finally {
    ann.off('console', onError);
  }
});

await step('attachments: a picture and a file reach Bob; the picture shows, the file downloads', async () => {
  const fs = await import('node:fs');
  await ann.locator('MessageInput input[type=file]').setInputFiles([
    { name: 'alpha.png', mimeType: 'image/png', buffer: fs.readFileSync(`${FIX}/alpha.png`) },
    { name: 'заметка.txt', mimeType: 'text/plain', buffer: Buffer.from('привет из файла') },
  ]);
  await ann.getByRole('list', { name: 'Файлы к отправке' }).getByText('заметка.txt').waitFor({ timeout: 4000 });
  await say(ann, 'с файлами');
  const msg = bob.locator('ChatItem', { hasText: 'с файлами' }).last();
  const img = msg.locator('img[src*="/cdn/attachments/"]');
  await img.waitFor({ timeout: 15000 });
  await bob.waitForFunction(el => el.complete && el.naturalWidth > 0, await img.elementHandle(), { timeout: 8000 });
  const file = msg.locator('a[download="заметка.txt"]');
  await file.waitFor({ timeout: 2000 });
  const res = await bob.request.get(BASE + (await file.getAttribute('href')));
  if (res.status() !== 200 || (await res.text()) !== 'привет из файла') throw new Error(`download: ${res.status()}`);
  if (!/^attachment/.test(res.headers()['content-disposition'] ?? '')) throw new Error('a text file must download, not open');
});

await step('reactions and pins: Ann reacts from the picker, Bob joins; Ann pins, Bob finds it pinned', async () => {
  await say(ann, 'реакции сюда');
  const annMsg = ann.locator('ChatItem', { hasText: 'реакции сюда' }).last();
  const bobMsg = bob.locator('ChatItem', { hasText: 'реакции сюда' }).last();
  await annMsg.hover();
  await annMsg.getByRole('button', { name: 'Реакция', exact: true }).click();
  const picker = ann.getByRole('dialog', { name: 'Выбор эмодзи' });
  await picker.getByRole('searchbox', { name: 'Найти эмодзи' }).fill('лайк');
  await picker.getByRole('button', { name: 'большой палец вверх', exact: true }).first().click();
  await bobMsg.getByRole('button', { name: '👍: 1', exact: true }).click({ timeout: 8000 });
  await bobMsg.getByRole('button', { name: '👍: 2, ваша реакция', exact: true }).waitFor({ timeout: 8000 });
  await annMsg.getByRole('button', { name: '👍: 2, ваша реакция', exact: true }).waitFor({ timeout: 8000 });
  // The owner pins it; Bob sees the mark and finds it among the pinned.
  await annMsg.hover();
  await annMsg.getByRole('button', { name: 'Закрепить', exact: true }).click();
  await bobMsg.locator('[title="Закреплено"]').waitFor({ timeout: 8000 });
  await bob.locator('[data-pins]').click();
  await bob.getByRole('dialog', { name: 'Закреплённые сообщения' }).getByText('реакции сюда').waitFor({ timeout: 8000 });
  await bob.locator('[data-pins]').click();
  await bob.getByRole('dialog', { name: 'Закреплённые сообщения' }).waitFor({ state: 'detached', timeout: 4000 });
});

await step('unread: a mention while Bob is away shows on the server and the channel; opening it reads it', async () => {
  const back = bob.url();
  await bob.goto(BASE + '/channels/me');
  await bob.getByText('ЛИЧНЫЕ СООБЩЕНИЯ').waitFor({ timeout: 8000 });
  try {
    await input(ann).pressSequentially('@bo', { delay: 20 });
    await ann.getByRole('option', { name: new RegExp(name('bob'), 'i') }).first().waitFor({ timeout: 8000 });
    await input(ann).press('Enter');
    // Enter picks the suggestion, it does not send "@bo" as text.
    const typed = await input(ann).inputValue();
    if (!/^@\S+ $/.test(typed) || /^@bo $/i.test(typed)) throw new Error(`the suggestion was not picked: "${typed}"`);
    await input(ann).pressSequentially('загляни', { delay: 10 });
    await input(ann).press('Enter');
    const server = bob.locator('ServerSidebar [data-unread]').first();
    await server.locator('.ok-badge', { hasText: '1' }).waitFor({ timeout: 10000 }).catch(async e => {
      // What Bob's side and the server know, to tell a lost mention from a lost event.
      const badge = await server.locator('.ok-badge').textContent({ timeout: 500 }).catch(() => 'none');
      const states = await bob.evaluate(() => fetch('/api/v1/users/@me/read-states').then(r => r.json()));
      const ch = new URL(back).pathname.split('/').at(-1);
      const last = await bob.evaluate(id => fetch(`/api/v1/channels/${id}/messages?limit=3`).then(r => r.json()), ch);
      console.log('     badge:', badge, '| server state:', JSON.stringify(states.find(x => x.channel_id === ch)));
      console.log('     last messages:', JSON.stringify(last.map(m => [m.id, m.content, m.mentions?.length ?? m.mentions])));
      console.log('     events Bob got:', JSON.stringify(bob.frames_.slice(-6).map(f => [f.t, f.d?.id ?? f.d?.message_id, f.d?.content])));
      throw e;
    });
  } finally {
    // Later steps expect Bob in the channel, whatever happened here.
    await bob.goto(back);
  }
  // Opening the channel reads it: the mark and the badge go away.
  await bob.locator('ChatItem', { hasText: 'загляни' }).waitFor({ timeout: 8000 });
  await bob.locator('ServerSidebar [data-unread]').first().waitFor({ state: 'detached', timeout: 10000 });
  await bob.locator('ServerChannelsItems a[data-unread]').first().waitFor({ state: 'detached', timeout: 4000 });
});

await step('search: Bob finds the bold message with a filter and jumps to it', async () => {
  const box = bob.getByRole('searchbox', { name: 'Поиск по сообщениям' });
  await box.fill('жирно есть:ссылка');
  await box.press('Enter');
  const results = bob.getByRole('dialog', { name: 'Результаты поиска' });
  await results.getByText('Найдено: 1').waitFor({ timeout: 8000 });
  await results.locator('[data-search-result]').first().click();
  await bob.waitForURL(/around=/, { timeout: 8000 });
  await bob.locator('ChatItem[data-highlight]', { hasText: 'жирно' }).waitFor({ timeout: 8000 });
  // A word that is nowhere (searches are limited to one a second).
  await bob.waitForTimeout(1100);
  await box.fill('жирафы');
  await box.press('Enter');
  await results.getByText('Ничего не нашлось.').waitFor({ timeout: 8000 });
  await box.press('Escape');
  await results.waitFor({ state: 'detached', timeout: 4000 });
});

await step('channel permissions: @everyone loses #новости, Bob stops seeing it live; back to default', async () => {
  const item = ann.locator('a', { hasText: 'новости' }).first();
  await item.hover();
  await item.getByRole('button', { name: 'Настройки канала' }).click();
  await ann.getByRole('button', { name: 'Права', exact: true }).click();
  await ann.getByRole('radiogroup', { name: 'Видеть каналы' }).getByRole('radio', { name: 'Запретить' }).click();
  await ann.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await bob.getByText('новости', { exact: true }).first().waitFor({ state: 'detached', timeout: 8000 });
  await ann.getByRole('radiogroup', { name: 'Видеть каналы' }).getByRole('radio', { name: 'По умолчанию' }).click();
  await ann.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await sees(bob, 'новости');
  await ann.keyboard.press('Escape');
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
  await bob.waitForURL(/\/channels\/[0-9a-f-]{36}\/[0-9a-f-]{36}/);
  const bobVoiceFrom = bob.url().split('/').pop();
  for (const p of [ann, bob]) {
    await sees(p, 'Голос подключён', 15000);
    await room(p).nth(1).waitFor({ timeout: 15000 }); // both are listed
  }
  // The fake microphone beeps: LiveKit reports a speaker.
  await ann.locator('[data-speaking]').first().waitFor({ timeout: 15000 });

  // Ann shares her screen (the fake one); Bob picks it in the list and sees frames.
  await ann.locator('[data-voice-share]').click();
  await sees(ann, 'Вы показываете экран', 15000);
  await bob.locator('[data-voice-member="ANN"] [data-voice-screen]').click();
  await bob.waitForFunction(() => {
    const v = document.querySelector('[data-voice-stage] video');
    return !!v && v.videoWidth > 0;
  }, null, { timeout: 15000 });
  // Fullscreen on and off by the same button (Esc was the only way out).
  await bob.locator('[data-voice-fullscreen]').click();
  await bob.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 5000 });
  await bob.locator('[data-voice-fullscreen]').click();
  await bob.waitForFunction(() => !document.fullscreenElement, null, { timeout: 5000 });
  await ann.locator('[data-voice-share]').click();
  await bob.locator('[data-voice-stage]').waitFor({ state: 'detached', timeout: 15000 });
  // Both see a tile for each participant in the centre.
  for (const p of [ann, bob]) await p.locator('[data-voice-tile]').nth(1).waitFor({ timeout: 10000 });

  // Ann turns on the (fake) camera; Bob gets frames in her tile, then it goes.
  await ann.locator('[data-voice-camera-toggle]').click();
  await bob.waitForFunction(() => {
    const v = document.querySelector('[data-voice-tile="ANN"] [data-voice-camera] video');
    return !!v && v.videoWidth > 0;
  }, null, { timeout: 15000 });
  // A click on her tile puts her camera on the stage, with frames there too.
  await bob.locator('[data-voice-tile="ANN"]').click();
  await bob.waitForFunction(() => {
    const v = document.querySelector('[data-voice-stage][data-voice-stage-source="camera"] video');
    return !!v && v.videoWidth > 0;
  }, null, { timeout: 15000 });
  // The statistics show what Bob receives from Ann; logged for the record.
  await bob.locator('[data-voice-panel] button[title="Устройства"]').click();
  await bob.locator('[data-voice-stats-toggle]').click();
  await bob.locator('[data-voice-stats]').getByText('Камера:').waitFor({ timeout: 15000 });
  await bob.waitForTimeout(4500); // two samples: rates and buffers since the last one
  console.log('     stats on Bob\'s side: ' + (await bob.locator('[data-voice-stats]').innerText()).replace(/\s*\n\s*/g, ' | '));
  await bob.locator('[data-voice-stats-toggle]').click();
  await bob.locator('[data-voice-panel] button[title="Устройства"]').click();
  await ann.locator('[data-voice-camera-toggle]').click();
  await bob.locator('[data-voice-tile="ANN"] [data-voice-camera]').waitFor({ state: 'detached', timeout: 15000 });
  await bob.locator('[data-voice-stage]').waitFor({ state: 'detached', timeout: 15000 });

  await bob.locator('[data-voice-panel] button[title="Выключить микрофон"]').click();
  await ann.locator('[data-voice-member="BOB"] [title="Микрофон выключен"]').waitFor({ timeout: 10000 });
  await bob.locator('[data-voice-panel] button[title="Включить микрофон"]').click();

  // The owner mutes Bob: LiveKit takes his microphone away, his button goes grey.
  // Assumption A25: the real LiveKit unpublishes his track itself, so Ann
  // stops receiving it; given back, his client publishes it again.
  const audioTracks = (p, n) => p.waitForFunction(k => document.querySelectorAll('[data-voice-audio] audio').length === k, n, { timeout: 15000 });
  await audioTracks(ann, 1);
  const bobRow = ann.locator('[data-voice-member="BOB"]');
  await bobRow.hover();
  await bobRow.locator('button[title="Выключить микрофон участнику"]').click();
  await bobRow.locator('[title="Микрофон выключил модератор"]').waitFor({ timeout: 10000 });
  await sees(bob, 'Модератор выключил вам микрофон', 10000);
  await bob.locator('[data-voice-panel] button[title="Микрофон выключил модератор"]:disabled').waitFor({ timeout: 10000 });
  await audioTracks(ann, 0);
  await bobRow.hover();
  await bobRow.locator('button[title="Вернуть микрофон"]').click();
  await bob.locator('[data-voice-panel] button[title="Выключить микрофон"]:enabled').waitFor({ timeout: 10000 });
  await audioTracks(ann, 1);

  // A25: deafened by the owner, Bob receives no sound (canSubscribe=false).
  await audioTracks(bob, 1);
  await bobRow.hover();
  await bobRow.locator('button[title="Выключить звук участнику"]').click();
  await sees(bob, 'Модератор выключил вам звук', 10000);
  await audioTracks(bob, 0);
  await bobRow.hover();
  await bobRow.locator('button[title="Вернуть звук"]').click();
  await audioTracks(bob, 1);

  // The owner moves Bob to a second voice channel: his client goes there itself.
  await menu(ann, 'Создать канал');
  await ann.getByText('Голосовой', { exact: true }).click();
  await ann.fill('#cc-name', 'Вторая');
  await ann.getByRole('button', { name: 'Создать канал', exact: true }).click();
  await ann.locator('[data-voice-channel="Вторая"]').waitFor({ timeout: 8000 });
  // Dragged with the mouse onto the other channel.
  await bobRow.dragTo(ann.locator('[data-voice-channel="Вторая"]'));
  await bob.locator('[data-voice-panel]').getByText(/^Вторая/).waitFor({ timeout: 15000 });
  await sees(bob, 'Голос подключён', 15000);
  await bob.waitForURL(u => !u.pathname.endsWith('/' + bobVoiceFrom), { timeout: 10000 });

  // And disconnects him.
  await bobRow.hover();
  await bobRow.locator('button[title="Отключить от канала"]').click();
  await sees(bob, 'Вы отключены от голосового канала', 10000);
  await bobRow.waitFor({ state: 'detached', timeout: 10000 });

  await ann.locator('[data-voice-panel] button[title="Отключиться"]').click();
  await ann.locator('[data-voice-panel]').waitFor({ state: 'detached', timeout: 10000 });
  await room(ann).first().waitFor({ state: 'detached', timeout: 15000 });
  await bob.locator('[data-voice-panel] button[title="Скрыть"]').click();
  // The voice channel took the centre; back to the chat with its member list.
  for (const p of [ann, bob]) await p.locator('a', { hasText: 'новости' }).first().click();
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
  await ann.setInputFiles('UserSettingsModal input[type=file]', `${FIX}/photo.jpg`);
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

await step('a call in a DM: Bob declines, then accepts the next one; both connect; it ends when both leave', async () => {
  const hangUp = p => p.locator('[data-voice-toolbar] button[aria-label="Отключиться"]').click();
  const incoming = bob.locator('[data-incoming-call]');
  await ann.goto(dmUrl);
  await ann.locator('[data-call-start]').click();
  await ann.locator('[data-call-ringing="BOB"]').waitFor({ timeout: 15000 });
  await incoming.waitFor({ timeout: 10000 });
  await incoming.getByRole('button', { name: 'Отклонить' }).click();
  await incoming.waitFor({ state: 'detached', timeout: 5000 });
  await ann.locator('[data-call-ringing="BOB"]').waitFor({ state: 'detached', timeout: 10000 });
  // Ann alone hangs up: the call ends for everyone.
  await hangUp(ann);
  await ann.locator('[data-call-bar]').waitFor({ state: 'detached', timeout: 15000 });

  await ann.locator('[data-call-start]').click();
  await incoming.waitFor({ timeout: 10000 });
  await incoming.getByRole('button', { name: 'Принять' }).click();
  await bob.waitForURL(dmUrl);
  // Both connected: each receives the other's sound.
  for (const p of [ann, bob]) {
    await p.locator('[data-call-stage]').waitFor({ timeout: 15000 });
    await p.waitForFunction(() => document.querySelectorAll('[data-voice-audio] audio').length === 1, null, { timeout: 15000 });
  }
  await hangUp(bob);
  await bob.locator('[data-call-bar]').waitFor({ timeout: 10000 }); // the call goes on with Ann
  await hangUp(ann);
  for (const p of [ann, bob]) await p.locator('[data-call-bar]').waitFor({ state: 'detached', timeout: 15000 });
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
