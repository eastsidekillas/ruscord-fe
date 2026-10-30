# Ruscord — клиент

Angular-клиент для [ruscord-core](https://github.com/eastsidekillas/ruscord-core).
Протокол и пути описаны в `docs/api.md` ядра.

## Как устроено

- **Вход** — HttpOnly-cookie, которые ставит ядро. При 401 клиент один раз
  вызывает `POST /auth/refresh` и повторяет запрос
  (`entities/session/interceptors/refresh.interceptor.ts`).
- **Gateway** — один WebSocket на вкладку (`shared/api/gateway/gateway.service.ts`):
  тикет, IDENTIFY или RESUME, heartbeat, переподключение по кодам закрытия,
  op 3 при бездействии.
- **Состояние** — READY и события gateway сводит чистая функция `reduce`
  (`entities/app-state/model/reduce.ts`), хранилище отдаёт его сигналами.
  Сообщения грузит страница канала.
- **Права** клиент не считает: только проверяет биты из `permissions` и
  `channel_permissions`, которые прислал сервер (ADR-0017 ядра).
- Файлы (`avatar`, `icon`) — пути `/cdn/...` того же домена.

## Разработка

Нужно запущенное ядро на `127.0.0.1:8080` (в ядре: `make up`, затем `make run`).

```bash
npm install
npm start          # http://localhost:4200, /api, /gateway и /cdn проксируются на ядро
npm run test:ci    # юнит-тесты в headless Chrome
npm run e2e        # сквозной прогон в Chromium против запущенного ядра (см. e2e/smoke.mjs)
```

CI (`.github/workflows/ci.yml`) на каждом PR собирает продакшен-сборку и
гоняет юнит-тесты. Сквозной прогон требует запущенного ядра и пока
запускается вручную: `npx playwright install chromium` один раз, затем
`E2E_FIXTURES=../ruscord-core/internal/platform/imaging/testdata npm run e2e`.
Шрифт Inter лежит в сборке (`@fontsource-variable/inter`): клиент не ходит на
внешние серверы (152-ФЗ, см. `docs/legal/russia.md` ядра).

Открывайте `http://localhost:4200`, а не `127.0.0.1:4200`: ядро проверяет
Origin по списку `RUSCORD_ALLOWED_ORIGINS` (по умолчанию `http://localhost:4200`).

## Сборка и деплой

`Dockerfile` собирает статику и кладёт её в nginx. `nginx/default.conf`
проксирует `/api/`, `/gateway` и `/cdn/` на сервис `core:8080` на том же домене:
cookie и проверка Origin требуют одного источника. В ядре
`RUSCORD_ALLOWED_ORIGINS` должен содержать адрес сайта.

## Управление сервером

Меню сервера (шестерёнка у названия) показывает то, на что у вас есть права:
создать канал (`MANAGE_CHANNELS`), настройки — обзор (`MANAGE_GUILD`), роли
(`MANAGE_ROLES`), участники (кик, бан, выдача ролей), баны (`BAN_MEMBERS`).
Каналы и категории правятся шестерёнкой при наведении. Права проверяет ядро;
клиент только прячет недоступное.

## Что пока выключено

- Звонки и голосовые каналы — вернутся с шагом 6 ядра.
- Пересылка сообщений — после MVP.
