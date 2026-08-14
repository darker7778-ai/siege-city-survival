# Trend Research Notes — Siege City Survival Mini App Design

Sources saved in markdown to /home/ubuntu/upload/:
- turumburum: telegram-mini-app-beyond-the-standard-ui-designing-a-truly-native-experience_1786675149763.md
- adsgram: top-10-mini-prilozheniy-v-telegram-2025_1786675167107.md
- omisoft: how-to-monetize-telegram-mini-app__1786675152057.md
- Telegram official: core.telegram.org/bots/webapps (local copy core.telegram.org_bots_webapps_1786673963962.md)

## Findings with citations

### Platform facts (Telegram official docs [1])
- Bot API 8.0 (Nov 2024): fullscreen mode, safeArea/contentSafeArea, add to home screen,
  shareMessage/downloadFile, geolocation, device motion, PAID SUBSCRIPTIONS via Telegram Stars,
  Gifts for users; Loading Screen customization via BotFather (/mybots > Configure Mini App);
  haptics style "light" for small collisions.
- Bot API 9.0 (Apr 2025): DeviceStorage + SecureStorage (persistent local storage on device).
- Bot API 9.6 (Apr 2026): requestChat. Design guidelines: mobile-first, 60fps animations, respect
  safe areas in fullscreen, adapt ThemeParams dynamically (light/dark themes).
- Telegram: ~1B MAU 2025, 2.5M new users/day [2]; >70% RU users use mini apps; 53.5% of users
  aged 18-34 [3].

### UX/TMA-native design best practices (turumburum.com, Mar 2026) [4]
- "App-in-App" principle: TMA must feel native to Telegram; "foreign interface" effect kills trust
  (phishing effect) and conversion.
- Call ready() immediately to prevent UI flicker; skeleton screens instead of spinner/blank
  ("white screen" perceived as failure); ≥10% of budget on usability.
- themeParams color sync mandatory; personalize ("Welcome, [Name]") — no sign-up friction.
- Navigation: avoid horizontal swipe elements near screen edges (iOS swipe-to-close conflict);
  use visual pagination cues; MainButton for primary CTA (native trust, adaptive disabled/loading
  states); SecondaryButton for secondary.
- HapticFeedback API: "light"/"medium" impacts for taps, distinct pattern success/error — "premium"
  feel.
- ClosingConfirmation API mandatory for active gameplay sessions without auto-save (rage-quit via
  swipe-to-close). Use selectively to avoid dialog fatigue.
- Notifications: contextual opt-in (ask after meaningful event, not at first launch); service
  messages bridging chat→TMA deep links create retention loops.
- Share: Stories layouts vertical + shareMessage deep links for viral growth.

### Monetization (omisoft.net, Mar 2026) [3]
- Telegram Stars economics: 30% Apple/Google cut; reinvested into Telegram Ads ~0% effective;
  withdrawal via Fragment 21 days min 1,000 Stars; 1 Star ≈ $0.013–0.015.
- IAP: 90% of purchases on Day 0 (first session = highest conversion); weekly subscriptions convert
  5.4x better than annual; 50+ paywall A/B tests earn 18.7x more; "soft paywall": play free, offer
  well-timed upgrade once invested; tiered pricing.
- Battle Pass (season pass) = time-limited challenges + reward multipliers; weekly plans = 55.5%
  of subscription revenue.
- Rewarded video (AdsGram etc.): CTR 20–40% (vs 0.5–2% display).
- Catizen: 30M+ on-chain tx; token launches need a real game underneath (airdrop-only doesn't retain).
- Hybrid gaming revenue mix: 60–70% rewarded ads, 30–40% IAP.

### Successful games landscape (adsgram.ai top-10, Sep 2025) [2]
- Hamster Kombat: 300M+ users; tap + "card upgrade system" for running exchange; monetization via
  upgrades/premium + token listing. Lesson: upgrade-card progression loop scales to hundreds of
  millions.
- Notcoin: tap-to-earn pioneer, 35M users; tasks: channel subscriptions, invites, daily activity.
- Zoo (city-building sim + alliance system): build enclosures, upgrade infrastructure, passive
  income; alliances grant collective bonuses/accelerated growth. Lesson: alliances as retention
  accelerator.
- Time Farm: every-4-hour mining cycles (timer loops); booster system. Lesson: regular timer-based
  return loops ("collect every N hours").
- TapSwap/Yescoin: missions/quests + referrals. Lesson: daily quests + referral as standard loop.

## Design implications for Siege City Survival
1. Native TMA chrome: MainButton for primary action (attack/collect), SecondaryButton,
   ClosingConfirmation on attack/siege screens, haptics on every tap, skeleton loading screen
   styled as the loading banner (banner-loading.png already exists).
2. Loop design: timer-based return loops (Time Farm 4h) → resource collection timers; daily quests
   (Notcoin/TapSwap pattern); alliance boosts (Zoo).
3. Monetization: Stars as soft paywall — speed-ups, premium currency (coins icon), weekly season
   pass ("Осада: сезон"), daily reward streak; Day-0 offer. 90% of purchases Day 0.
4. Growth: share achievements via shareMessage to chats/stories (vertical layouts), referral
   bonuses.
5. Style lock: style-card.md v1.1.0 (This War of Mine desaturated night palette).

## Reference URLs
[1] https://core.telegram.org/bots/webapps
[2] https://adsgram.ai/blog/adsgram/top-10-mini-prilozheniy-v-telegram-2025
[3] https://omisoft.net/blog/how-to-monetize-telegram-mini-app/
[4] https://turumburum.com/blog/telegram-mini-app-beyond-the-standard-ui-designing-a-truly-native-experience
[5] https://earlybird.so/the-telegram-mini-apps-revolution/
[6] https://xbsoftware.com/blog/telegram-mini-app-development/

## Additional research still needed (per gdd-techdoc: 2 shipped examples + 1 failure per system)
- City-building/survival-strategy mobile systems: Clash of Clans build queue, State of Survival
  alliance raids; idle/strategy timer loops.
- Documented failure: e.g., failed telegram games or pay-to-win backlash examples.
- Notifications re-engagement data for bot games.

## Mobile city-builder/survival-strategy systems research

### Clash of Clans (2012–) — core loop teardown [7][8]
Three loops: (1) collecting resources, (2) building & training, (3) battling. Loop 1 = short/mid goals; 2–3 = long-term goals.
- Automated farming: collectors produce up to a cap; returning to harvest is always rewarding; early-stage caps
  reached quickly → new players visit often.
- Builder queue FIFO: session tiers — Tier1 minutes for new users, Tier2 several times/day
  (habit formation), Tier3 daily; players "fill the queue before bed" and return in the morning.
- Interdependent economy: every building upgrade gated by HQ level + cross-resource cost + housing caps;
  everything tied to one another prevents single-build grinding.
- Steep exponential time/price curves; restriction = builder count; extra builders as $5/$10 IAP
  (price elasticity). Non-linear pricing — whales pay more as they progress (ARPPU tracks retention).
- Monetization categories: one-time (cosmetics, extra builders); over time (shield, time-gates, pay-to-skip).
- Visual progression: village transforms visually as you grow — "start small, end epic" retention driver.
- First-time flow: emotional attachment in 5 minutes — attack tutorial, defend tutorial, then core loop,
  then achievements as quests. New players protected by shield first days.
- Battle unit consumption (all troops lost win/lose) = strong sink but retention-unfriendly;
  Kabam's Edgeworld allowed surviving units to return + retreats → better UX; surviving "super units"
  sell well (emotional investment).
- Weaknesses (documented critique 2012): clans lacked coordination tools; no world map/rivalries;
  no friend messaging/gifting/invites → virality gaps.
URLs: [7] https://medium.com/product-teardown/product-teardown-05-clash-of-clan-ba3461116646
      [8] https://www.deconstructoroffun.com/blog//2012/09/clash-of-clans-winning-formula.html

### State of Survival (2019, FunPlus) — closest genre reference [9]
- Zombie-apocalypse survival strategy; alliance raids/co-op boss events; hero collection + city build.
- First year: extraordinary revenue; alliance cooperation as core social engine.
- Lesson: raid/cooperative events give daily social reason to open the app; hero/leader unit adds
  emotional layer over generic armies.
URL: [9] https://stateofsurvival.game/ + https://www.businesswire.com/news/home/20210107005348/en/An-Extraordinary-First-Year-for-Zombie-Apocalypse-Game-State-of-Survival

### Documented failure examples
- Telegram "airdrop-only" games (2024 tap-to-earn wave) churned hard once airdrops ended:
  "Token launches require a real game underneath — airdrop-only mechanics don't retain users" [3].
- CoC 2012 critique: over-consumption of attacking troops punished players; weak clan tools limited
  social retention; no world map rivalries [8].
- Edgeworld (Kabam) — cited contrast: kept surviving units, better battle UX [8].

### Derived best practices for SCS
1. Resource collectors + capped storage + timers → guaranteed reward on every return (CoC) adapted to
   Telegram timer-loop idiom (Time Farm 4h).
2. FIFO construction/training queues; session length tiering → fit TMA usage: 2–5 min sessions,
   multiple returns/day.
3. Interdependent upgrade graph (HQ-gated levels, cross-resource costs) to prevent grinding one building.
4. Siege as async PvP raid: raiding party consumes militia, defenders auto-fight; keep partial
   survivors (Edgeworld lesson) or use non-consumable militia with repair — choose based on economy.
5. Alliances = native Telegram groups/chats bridge: clan created from TG group link.
6. Whale non-linear pricing via Stars (speed-ups, season pass) + day-0 soft paywall [3].
7. Day-1-5 shield (beginner protection) to prevent churn of new players.
8. Visual transformation of city as progression feedback.
