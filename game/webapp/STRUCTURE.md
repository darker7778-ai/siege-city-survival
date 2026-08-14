# Siege City Survival Mini App — Structure v0.1

## Runtime layers

| Layer | Location | Responsibility |
|---|---|---|
| React frame | `client/src/components/GameCanvas.tsx` | Loading, HUD, screens, input, Telegram Web App bridge, local persistence orchestration |
| Babylon canvas | `client/src/game/scene.ts` | Full-screen night ground, textured city plane and building silhouettes; lifecycle-safe rendering |
| Game model | `client/src/game/storage.ts` | Types, defaults, passive collection, FIFO timers, upgrades, training, local raid resolution |
| Asset map | `client/src/game/assets.ts` | Permanent `/manus-storage/...` URLs for the committed project art pack |
| Styling | `client/src/index.css` | Signal Amber design system, paper grain, responsive mobile layout, reduced-motion rules |

## State vocabulary

`GameState` is the single local client snapshot. It contains `resources`, `buildings`, `queue`, `militia`, `lastCollectedAt`, `news`, `onboardingComplete`, `totalRaids` and `lastRaidAt`. Mutations are pure functions returning a new snapshot, then saved immediately.

The v0.1 client never treats a button tap as a network-confirmed server result. The UI labels its persistence boundary as local prototype state and keeps the future server intent boundary explicit in `PLAN.md`.

## Scene contract

`createGameScene(engine, canvas): Promise<GameHandle>` creates a Babylon `Scene`, camera, ground and billboarded building planes using the project asset URLs. The handle exposes `scene` and `dispose()`. React owns only lifecycle; the game model remains framework-agnostic.

## Telegram bridge

The component calls `ready()`, `expand()`, `MainButton.setParams`, `HapticFeedback.impactOccurred`, `showPopup`, `openTelegramLink` and `enableClosingConfirmation` only when the SDK exists. Browser preview receives a compact `WEB PREVIEW` label instead of failing.
