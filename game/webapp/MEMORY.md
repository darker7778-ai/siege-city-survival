# Siege City Survival Mini App — Memory v0.1

## Confirmed decisions

- The visual ground truth is the approved project style-card v1.1.0: cold night, charcoal/pencil texture, rare muted amber light, worn paper UI.
- The implementation uses the existing project artwork pack. No external image search and no generated replacement art are used.
- v0.1 is intentionally a client-only prototype. It is not presented as release-ready multiplayer infrastructure.
- The main action is a Telegram-style MainButton concept rendered in the app shell; the native MainButton is synchronized when the Web App SDK is available.

## Known platform boundary

The browser preview has no authenticated Telegram user and no invoice link. It uses the concrete fallback identity «Илья» and a local prototype Stars ledger. A production Telegram user and real digital-goods fulfillment require the backend phase described in `PLAN.md`.

## Visual implementation notes

The project assets are high-resolution PNGs. They are referenced through WebDev permanent storage URLs, not committed into this project tree. CSS uses image URLs only for major visual surfaces; small resource icons remain legible at 18–24px.
