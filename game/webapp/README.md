# Siege City Survival — Telegram Mini App v0.1

Клиентский первый вертикальный срез игры «Siege City Survival». Интерфейс и локальная игровая модель построены по проектным документам и текущим правилам `GAME_MECHANICS.md`: мировые часы, фазы дня, утренний тик, офлайн-восстановление с cap, очередь построек, ополчение, сумеречная вылазка, частичное возвращение и защита новичка.

## Стек

- React 19 + TypeScript + Vite
- Babylon.js browser runtime для интерактивной сцены города
- Tailwind 4 и локальная дизайн-система «Сигнал сумерек»
- LocalStorage для прототипного прогресса
- Telegram WebApp bridge без серверной валидации `initData` на этой итерации

## Запуск

```bash
pnpm install
pnpm dev
```

Проверки:

```bash
pnpm check
pnpm build
```

## Игровые экраны

| Экран | Что проверяется в v0.1 |
| --- | --- |
| Город | 6×8 grid, здания из project art pack, capped collection, world clock |
| Постройки | Два слота очереди, стоимость, countdown и completion |
| Ополчение | Capacity, training timer, protection note и переход в Siege |
| Осада | Dusk assignment, night resolution, partial return и phase locks |
| Группа | Telegram route и честная граница серверных alliance systems |
| Магазин | Локальный ledger, реальный prototype speed-up очереди, без fake invoice success |

## Визуальные ассеты

Все изображения подключены через WebDev storage URL из утверждённого project art pack. Локальные копии PNG не входят в frontend bundle, чтобы не увеличивать размер деплоя.

## Серверная граница

Эта версия не является authoritative multiplayer build. Серверная авторизация Telegram `initData`, синхронизация мирового времени, античит, PostgreSQL, альянсы, real-time siege resolution и Telegram Stars invoice API должны быть подключены до релиза. Подробная карта переноса описана в `docs/MECHANICS-INTEGRATION.md`.
