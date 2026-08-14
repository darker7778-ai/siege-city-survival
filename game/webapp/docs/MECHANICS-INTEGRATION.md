# Siege City Survival Mini App v0.1 — Mechanics Integration

## Scope

This document records how the current client prototype maps the mechanics that are being written in the project specification. The implementation is intentionally **frontend-only**: the local state model is deterministic enough for UX validation, while all authoritative results, anti-cheat checks, multiplayer state, Telegram Stars billing, and server-time validation remain explicit backend boundaries for a later iteration.

## World clock and phases

The client uses one derived world clock from `client/src/game/storage.ts` rather than separate local timers for each action. The current 24-hour prototype maps to four gameplay phases:

| Phase | Client behavior | Visible signal |
| --- | --- | --- |
| `day` | Resource collection, construction and training are available | Blue/neutral phase chip |
| `dusk` | A raid can be prepared and assigned for the night | Amber phase chip and active raid window |
| `night` | A previously assigned raid can be resolved | Cold phase chip and execution action |
| `morning_tick` | Passive production is materialized and raid state is cleaned up | World clock advances to the next day |

The displayed timer is derived from the same world clock. The prototype does not claim server authority; it shows the boundary in the UI and in the future intent-shaped action functions.

## Intent-shaped actions and error codes

The following client functions represent the current action vocabulary:

| Action | Function | Current validation |
| --- | --- | --- |
| Resource collection | `collectResources` | Phase lock, resource cap, offline recovery window |
| Building upgrade | `startUpgrade` | Queue capacity, resource cost, duplicate queue prevention |
| Militia training | `startTraining` | Barracks capacity, food/metal cost, one training slot |
| Raid preparation | `prepareRaid` | Dusk-only window, beginner shield, available militia |
| Raid resolution | `resolveRaid` | Night-only window, assigned raid, partial return of militia |
| Prototype catalog action | `activatePrototypeProduct` | Local ledger only; speed-up mutates a real queue item |

Important phase errors are surfaced as explicit messages rather than silently disabling the interaction. The UI currently exposes `DAY_ACTIONS_LOCKED`, `RAID_WINDOW_CLOSED`, `NO_RAID_ASSIGNED`, `QUEUE_FULL`, `QUEUE_EMPTY`, and `NEWBIE_SHIELD_ACTIVE` where applicable.

## Offline recovery and caps

`loadGame()` restores the saved state and applies the documented offline recovery window. Passive income is bounded by the resource caps before it is returned to the UI. The hourly collection display therefore remains readable without pretending to be a server settlement.

## Raid result model

The v0.1 raid uses a deterministic local result derived from militia strength and a stable day-based seed. It keeps a partial-return rule: a failed raid does not delete the entire force. The result is written to the event ledger so the player can inspect what happened after returning from the Siege screen.

## Telegram boundaries

When Telegram WebApp is present, the client calls `ready()`, `expand()`, haptic feedback, the MainButton, closing confirmation for a prepared raid, and the official group link. It does not validate `initData` in the browser and does not process real Telegram Stars invoices. The Shop screen labels these as local prototype ledger actions until a server implementation is available.

## Acceptance checks for this iteration

1. The City screen shows the current world day, phase, caps, building pins, and collection action.
2. The Build screen exposes a two-slot queue with real countdowns and resource costs.
3. The Militia screen exposes capacity, training, beginner protection, and a route to Siege.
4. The Siege screen separates dusk assignment from night execution and shows a closed-window state outside those phases.
5. The Alliance screen opens the project’s Telegram route and clearly labels server-only features.
6. The Shop screen mutates only the local ledger and a real local queue item; it does not simulate an invoice or payment success.
7. `pnpm check` and `pnpm build` complete successfully.
