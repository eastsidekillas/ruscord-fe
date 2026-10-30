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
```

Открывайте `http://localhost:4200`, а не `127.0.0.1:4200`: ядро проверяет
Origin по списку `RUSCORD_ALLOWED_ORIGINS` (по умолчанию `http://localhost:4200`).

## Сборка и деплой

`Dockerfile` собирает статику и кладёт её в nginx. `nginx/default.conf`
проксирует `/api/`, `/gateway` и `/cdn/` на сервис `core:8080` на том же домене:
cookie и проверка Origin требуют одного источника. В ядре
`RUSCORD_ALLOWED_ORIGINS` должен содержать адрес сайта.

## Что пока выключено

- Звонки и голосовые каналы — вернутся с шагом 6 ядра.
- Пересылка сообщений — после MVP.
