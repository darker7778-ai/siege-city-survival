// Style reminder: game rules stay plain TypeScript and remain independent from React or Babylon.

export type BuildingKey = "hq" | "lumbermill" | "quarry" | "barracks";
export type WorldPhase = "tick_window" | "morning" | "day" | "dusk" | "night";

export type WorldClock = {
  day: number;
  phase: WorldPhase;
  gameHour: number;
  gameMinute: number;
  gameTime: string;
  phaseLabel: string;
  detail: string;
  nextPhaseAt: number;
  nextPhaseLabel: string;
};

export type Resources = { wood: number; stone: number; food: number; metal: number; gold: number; stars: number };
export type Building = { key: BuildingKey; name: string; shortName: string; level: number; maxLevel: number; rate?: string };
export type QueueItem = { id: string; building: BuildingKey; targetLevel: number; startedAt: number; doneAt: number };
export type RaidLocationId = "supermarket" | "pharmacy" | "industrial" | "residential";
export type RaidLoot = Pick<Resources, "wood" | "stone" | "food" | "metal" | "gold">;
export type RaidLocation = { id: RaidLocationId; name: string; shortName: string; depth: number; risk: number; profile: string; accent: "food" | "medical" | "materials" | "mixed"; baseLoot: RaidLoot };
export type RaidForecast = { sent: number; nodes: number; risk: number; survivalChance: number; capacity: number; estimatedWeight: number; loot: Record<keyof RaidLoot, { min: number; max: number }> };
export type RaidReport = { location: RaidLocationId; day: number; sent: number; returned: number; nodes: number; risk: number; victory: boolean; collected: RaidLoot; lost: RaidLoot; returnedLoot: RaidLoot; weightUsed: number; capacity: number; energySpent: number; moraleDelta: number; resolvedAt: number; outcome: string };

export type GameState = {
  resources: Resources;
  buildings: Record<BuildingKey, Building>;
  queue: QueueItem[];
  militia: number;
  militiaCapacity: number;
  trainingDoneAt: number | null;
  lastCollectedAt: number;
  lastTickWorldDay: number;
  raidAssignedAt: number | null;
  raidWorldDay: number | null;
  raidLocation: RaidLocationId | null;
  lastRaidReport: RaidReport | null;
  onboardingComplete: boolean;
  news: string[];
  totalRaids: number;
  lastRaidAt: number | null;
};

export const WORLD_ANCHOR_MS = Date.UTC(2026, 7, 14, 2, 0, 0);
export const WORLD_CYCLE_MS = 4 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const PHASES: Array<{ phase: WorldPhase; start: number; label: string; detail: string }> = [
  { phase: "tick_window", start: 0, label: "ТИК", detail: "Утренняя сводка" },
  { phase: "morning", start: 10 * MINUTE_MS, label: "УТРО", detail: "Приказы и сбор" },
  { phase: "day", start: 30 * MINUTE_MS, label: "ДЕНЬ", detail: "Убежище работает" },
  { phase: "dusk", start: 150 * MINUTE_MS, label: "СУМЕРКИ", detail: "Окно назначения вылазки" },
  { phase: "night", start: 160 * MINUTE_MS, label: "НОЧЬ", detail: "Только вылазки и защита" },
];

export const BUILDING_META: Record<BuildingKey, Omit<Building, "level">> = {
  hq: { key: "hq", name: "Командный штаб", shortName: "Штаб", maxLevel: 8 },
  lumbermill: { key: "lumbermill", name: "Лесопилка", shortName: "Лесопилка", maxLevel: 8, rate: "12 дерева/ч" },
  quarry: { key: "quarry", name: "Каменоломня", shortName: "Каменоломня", maxLevel: 8, rate: "6 камня/ч" },
  barracks: { key: "barracks", name: "Казармы", shortName: "Казармы", maxLevel: 8, rate: "20 мест" },
};

export const RAID_LOCATIONS: Record<RaidLocationId, RaidLocation> = {
  supermarket: { id: "supermarket", name: "Супермаркет", shortName: "МАРКЕТ", depth: 8, risk: 25, profile: "Еда / вода / запасные материалы", accent: "food", baseLoot: { wood: 8, stone: 3, food: 18, metal: 2, gold: 1 } },
  pharmacy: { id: "pharmacy", name: "Аптека", shortName: "АПТЕКА", depth: 7, risk: 35, profile: "Медицинский запас / редкий металл", accent: "medical", baseLoot: { wood: 4, stone: 2, food: 7, metal: 8, gold: 2 } },
  industrial: { id: "industrial", name: "Промзона", shortName: "ПРОМЗОНА", depth: 9, risk: 40, profile: "Материалы / металл / детали", accent: "materials", baseLoot: { wood: 14, stone: 10, food: 3, metal: 18, gold: 1 } },
  residential: { id: "residential", name: "Жилой квартал", shortName: "КВАРТАЛ", depth: 8, risk: 55, profile: "Смешанная добыча / торговый NPC", accent: "mixed", baseLoot: { wood: 11, stone: 5, food: 10, metal: 6, gold: 4 } },
};

const RAID_WEIGHTS: Record<keyof RaidLoot, number> = { wood: 0.1, stone: 0.2, food: 0.4, metal: 0.15, gold: 0.05 };

function pad(value: number) { return String(value).padStart(2, "0"); }

export function getWorldClock(now = Date.now()): WorldClock {
  const elapsed = Math.max(0, now - WORLD_ANCHOR_MS);
  const day = Math.floor(elapsed / WORLD_CYCLE_MS) + 1;
  const cycleOffset = elapsed % WORLD_CYCLE_MS;
  const gameMinutes = Math.floor((cycleOffset / WORLD_CYCLE_MS) * 24 * 60);
  const absoluteMinutes = (5 * 60 + gameMinutes) % (24 * 60);
  const gameHour = Math.floor(absoluteMinutes / 60);
  const gameMinute = absoluteMinutes % 60;
  const current = [...PHASES].reverse().find((entry) => cycleOffset >= entry.start) || PHASES[0];
  const next = PHASES.find((entry) => entry.start > cycleOffset) || PHASES[0];
  const nextCycleOffset = next.start > cycleOffset ? next.start : next.start + WORLD_CYCLE_MS;
  return {
    day,
    phase: current.phase,
    gameHour,
    gameMinute,
    gameTime: `${pad(gameHour)}:${pad(gameMinute)}`,
    phaseLabel: current.label,
    detail: current.detail,
    nextPhaseAt: WORLD_ANCHOR_MS + (day - 1) * WORLD_CYCLE_MS + nextCycleOffset,
    nextPhaseLabel: next.label,
  };
}

export function isDayActionPhase(phase: WorldPhase) { return phase === "morning" || phase === "day"; }

export function createDefaultState(now = Date.now()): GameState {
  const clock = getWorldClock(now);
  return {
    resources: { wood: 220, stone: 140, food: 18, metal: 8, gold: 42, stars: 25 },
    buildings: {
      hq: { ...BUILDING_META.hq, level: 1 },
      lumbermill: { ...BUILDING_META.lumbermill, level: 1 },
      quarry: { ...BUILDING_META.quarry, level: 1 },
      barracks: { ...BUILDING_META.barracks, level: 1 },
    },
    queue: [], militia: 14, militiaCapacity: 20, trainingDoneAt: null,
    lastCollectedAt: now - 52 * MINUTE_MS, lastTickWorldDay: clock.day,
    raidAssignedAt: null, raidWorldDay: null, raidLocation: null, lastRaidReport: null, onboardingComplete: false,
    news: ["Город пережил ночь. Сборщики снова работают.", "В дальнем секторе замечен дым — возможно, есть движение."],
    totalRaids: 0, lastRaidAt: null,
  };
}

const STORAGE_KEY = "siege-city-survival-v01";

export function loadGame(): GameState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw) as Partial<GameState>;
    const defaults = createDefaultState();
    return {
      ...defaults,
      ...parsed,
      resources: { ...defaults.resources, ...parsed.resources },
      buildings: { ...defaults.buildings, ...parsed.buildings },
      queue: Array.isArray(parsed.queue) ? parsed.queue : [],
      news: Array.isArray(parsed.news) ? parsed.news.slice(0, 8) : defaults.news,
      lastTickWorldDay: typeof parsed.lastTickWorldDay === "number" ? parsed.lastTickWorldDay : defaults.lastTickWorldDay,
      raidAssignedAt: parsed.raidAssignedAt ?? null,
      raidWorldDay: parsed.raidWorldDay ?? null,
      raidLocation: parsed.raidLocation ?? null,
      lastRaidReport: parsed.lastRaidReport ?? null,
    };
  } catch { return createDefaultState(); }
}

export function saveGame(state: GameState) { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
export function formatNumber(value: number) { return Math.floor(value).toLocaleString("ru-RU"); }
export function formatTimer(ms: number) { if (ms <= 0) return "ГОТОВО"; const totalSeconds = Math.ceil(ms / 1000); const hours = Math.floor(totalSeconds / 3600); const minutes = Math.floor((totalSeconds % 3600) / 60); const seconds = totalSeconds % 60; if (hours > 0) return `${hours}ч ${pad(minutes)}м`; return `${pad(minutes)}м ${pad(seconds)}с`; }

export function collectResources(state: GameState, now = Date.now()) {
  const clock = getWorldClock(now);
  if (!isDayActionPhase(clock.phase)) return { state, wood: 0, stone: 0, error: "DAY_ACTIONS_LOCKED" as const, message: "Сбор закрыт: убежище работает только утром и днём." };
  const elapsedHours = Math.min(4, Math.max(0, (now - state.lastCollectedAt) / 3_600_000));
  const wood = Math.floor(elapsedHours * 12 * state.buildings.lumbermill.level);
  const stone = Math.floor(elapsedHours * 6 * state.buildings.quarry.level);
  const next: GameState = { ...state, resources: { ...state.resources, wood: state.resources.wood + wood, stone: state.resources.stone + stone }, lastCollectedAt: now, onboardingComplete: true, news: [`Собрано: +${wood} дерева, +${stone} камня.`, ...state.news].slice(0, 8) };
  return { state: next, wood, stone };
}

function applyWorldTick(state: GameState, clock: WorldClock): GameState {
  const missedTicks = Math.max(1, clock.day - state.lastTickWorldDay);
  const consumedFood = Math.min(state.resources.food, missedTicks * 2);
  return { ...state, resources: { ...state.resources, food: state.resources.food - consumedFood }, lastTickWorldDay: clock.day, news: [`УТРЕННИЙ ТИК / День ${clock.day}: склад проверен, −${consumedFood} еды.`, ...state.news].slice(0, 8) };
}

export function completeTimers(state: GameState, now = Date.now()) {
  let next = state;
  const clock = getWorldClock(now);
  const completed = state.queue.filter((item) => item.doneAt <= now);
  if (completed.length > 0) {
    const buildings = { ...next.buildings };
    for (const item of completed) buildings[item.building] = { ...buildings[item.building], level: item.targetLevel };
    next = { ...next, buildings, queue: state.queue.filter((item) => item.doneAt > now), news: [`Постройка завершена: ${completed.map((item) => BUILDING_META[item.building].shortName).join(", ")}.`, ...state.news].slice(0, 8) };
  }
  if (next.trainingDoneAt && next.trainingDoneAt <= now) {
    const added = Math.max(1, Math.min(4, next.militiaCapacity - next.militia));
    next = { ...next, militia: next.militia + added, trainingDoneAt: null, news: [`В казармы вернулось ${added} новых ополченцев.`, ...next.news].slice(0, 8) };
  }
  if (next.lastTickWorldDay < clock.day && clock.phase !== "tick_window") next = applyWorldTick(next, clock);
  if (next.raidAssignedAt && next.raidWorldDay !== null && next.raidWorldDay < clock.day) {
    next = { ...next, raidAssignedAt: null, raidWorldDay: null, militia: Math.max(0, next.militia - 1), news: ["Вылазка принудительно завершена в 05:00: один ополченец вернулся раненым.", ...next.news].slice(0, 8) };
  }
  return next;
}

export function upgradeCost(key: BuildingKey, currentLevel: number) { const multiplier = Math.max(1, currentLevel); return { wood: 80 * multiplier, stone: 40 * multiplier, durationMs: 15 * multiplier * 60_000 }; }

export function startUpgrade(state: GameState, key: BuildingKey, now = Date.now()) {
  const clock = getWorldClock(now);
  if (!isDayActionPhase(clock.phase)) return { state, error: "DAY_ACTIONS_LOCKED", message: "Постройки закрыты в сумерках и ночью." };
  const building = state.buildings[key];
  if (building.level >= building.maxLevel) return { state, error: "MAX_LEVEL", message: "Здание уже достигло предельного уровня." };
  if (state.queue.some((item) => item.building === key)) return { state, error: "BUILDING_BUSY", message: "Это здание уже стоит в очереди." };
  if (state.queue.length >= 2) return { state, error: "QUEUE_FULL", message: "Оба слота очереди заняты." };
  const cost = upgradeCost(key, building.level);
  if (state.resources.wood < cost.wood || state.resources.stone < cost.stone) return { state, error: "INSUFFICIENT_RESOURCES", message: `Нужно ${cost.wood} дерева и ${cost.stone} камня.` };
  const item: QueueItem = { id: `${key}-${now}`, building: key, targetLevel: building.level + 1, startedAt: now, doneAt: now + cost.durationMs };
  return { state: { ...state, resources: { ...state.resources, wood: state.resources.wood - cost.wood, stone: state.resources.stone - cost.stone }, queue: [...state.queue, item], news: [`Приказ подписан: ${building.name} → Ур. ${building.level + 1}.`, ...state.news].slice(0, 8) } };
}

export function startTraining(state: GameState, now = Date.now()) {
  const clock = getWorldClock(now);
  if (!isDayActionPhase(clock.phase)) return { state, error: "DAY_ACTIONS_LOCKED", message: "Набор закрыт в сумерках и ночью." };
  if (state.trainingDoneAt) return { state, error: "TRAINING_BUSY", message: "Набор уже идёт в казармах." };
  if (state.militia >= state.militiaCapacity) return { state, error: "CAPACITY_FULL", message: "Все места в лагере заняты." };
  if (state.resources.food < 2) return { state, error: "INSUFFICIENT_FOOD", message: "Нужно 2 еды для набора." };
  return { state: { ...state, resources: { ...state.resources, food: state.resources.food - 2 }, trainingDoneAt: now + 8 * 60_000, news: ["В казармах начался набор ополчения.", ...state.news].slice(0, 8) } };
}

export function getRaidForecast(state: GameState, locationId: RaidLocationId): RaidForecast {
  const location = RAID_LOCATIONS[locationId];
  const sent = Math.max(4, Math.min(state.militia, Math.floor(state.militia * 0.75)));
  const readiness = Math.min(1.25, Math.max(0.72, sent / 12));
  const loot = Object.fromEntries((Object.keys(location.baseLoot) as Array<keyof RaidLoot>).map((key) => {
    const base = location.baseLoot[key] * readiness;
    return [key, { min: Math.max(0, Math.floor(base * 0.72)), max: Math.max(1, Math.ceil(base * 1.28)) }];
  })) as RaidForecast["loot"];
  const estimatedWeight = (Object.keys(location.baseLoot) as Array<keyof RaidLoot>).reduce((sum, key) => sum + location.baseLoot[key] * readiness * RAID_WEIGHTS[key], 0);
  return { sent, nodes: location.depth, risk: location.risk, survivalChance: Math.round(Math.min(94, Math.max(42, 86 - location.risk * 0.42 + sent * 1.1))), capacity: 12, estimatedWeight: Number(estimatedWeight.toFixed(1)), loot };
}

export function prepareRaid(state: GameState, now = Date.now(), locationId: RaidLocationId = "supermarket") {
  const clock = getWorldClock(now);
  if (clock.phase !== "dusk") return { state, error: "RAID_WINDOW_CLOSED", message: `Назначение вылазки доступно только в сумерках. Сейчас: ${clock.phaseLabel}.` };
  if (state.raidAssignedAt) return { state, error: "RAID_ALREADY_ASSIGNED", message: "Вылазка уже назначена на эту ночь." };
  if (state.militia < 4) return { state, error: "NOT_ENOUGH_MILITIA", message: "Нужно минимум 4 готовых ополченца." };
  return { state: { ...state, raidAssignedAt: now, raidWorldDay: clock.day, raidLocation: locationId, news: [`Вылазка назначена: ${RAID_LOCATIONS[locationId].name}, ночь Дня ${clock.day}.`, ...state.news].slice(0, 8) } };
}

export function resolveRaid(state: GameState, now = Date.now()) {
  const clock = getWorldClock(now);
  if (clock.phase !== "night") return { state, error: "NIGHT_NOT_ACTIVE", message: "Вылазка исполняется только ночью." };
  if (!state.raidAssignedAt || state.raidWorldDay !== clock.day) return { state, error: "RAID_NOT_ASSIGNED", message: "Сначала назначьте вылазку в сумерках." };
  const location = RAID_LOCATIONS[state.raidLocation || "supermarket"];
  const sent = Math.max(4, Math.min(state.militia, Math.floor(state.militia * 0.75)));
  const signal = Math.abs(Math.sin(clock.day * 3.17 + location.risk * 0.013));
  const victory = signal > location.risk / 100 + 0.05;
  const returned = victory ? Math.max(3, Math.floor(sent * (0.62 - location.risk * 0.0008))) : Math.max(3, Math.floor(sent * 0.4));
  const multiplier = victory ? 0.88 + signal * 0.42 : 0.34 + signal * 0.18;
  const collected = (Object.keys(location.baseLoot) as Array<keyof RaidLoot>).reduce((loot, key) => ({ ...loot, [key]: Math.max(0, Math.floor(location.baseLoot[key] * multiplier * Math.max(0.8, sent / 10))) }), {} as RaidLoot);
  const lossRate = victory ? 0.12 + location.risk / 500 : 0.5;
  const lost = (Object.keys(collected) as Array<keyof RaidLoot>).reduce((loot, key) => ({ ...loot, [key]: Math.floor(collected[key] * lossRate) }), {} as RaidLoot);
  const returnedLoot = (Object.keys(collected) as Array<keyof RaidLoot>).reduce((loot, key) => ({ ...loot, [key]: Math.max(0, collected[key] - lost[key]) }), {} as RaidLoot);
  const weightUsed = Number((Object.keys(returnedLoot) as Array<keyof RaidLoot>).reduce((sum, key) => sum + returnedLoot[key] * RAID_WEIGHTS[key], 0).toFixed(1));
  const report: RaidReport = { location: location.id, day: clock.day, sent, returned, nodes: location.depth, risk: location.risk, victory, collected, lost, returnedLoot, weightUsed, capacity: 12, energySpent: victory ? 18 : 28, moraleDelta: victory ? -5 : 3, resolvedAt: now, outcome: victory ? "Маршрут пройден. Груз доставлен в убежище." : "Контакт сорвал маршрут. Часть груза потеряна при отходе." };
  const next: GameState = { ...state, resources: { ...state.resources, wood: state.resources.wood + returnedLoot.wood, stone: state.resources.stone + returnedLoot.stone, food: state.resources.food + returnedLoot.food, metal: state.resources.metal + returnedLoot.metal, gold: state.resources.gold + returnedLoot.gold }, militia: Math.min(state.militiaCapacity, state.militia - sent + returned), raidAssignedAt: null, raidWorldDay: null, raidLocation: null, lastRaidReport: report, totalRaids: state.totalRaids + 1, lastRaidAt: now, news: [`${victory ? "Вылазка завершена" : "Тяжёлое возвращение"}: ${location.name}, возвращено ${returned}/${sent}.`, ...state.news].slice(0, 8) };
  return { state: next, victory, sent, returned, report };
}

export function activatePrototypeProduct(state: GameState, product: "speed" | "slot" | "bundle", now = Date.now()) {
  if (product === "speed") {
    const [first, ...rest] = state.queue;
    if (!first) return { ...state, news: ["В очереди нет активного приказа для ускорения.", ...state.news].slice(0, 8) };
    const updated: QueueItem = { ...first, doneAt: Math.max(now, first.doneAt - 5 * 60_000) };
    return { ...state, resources: { ...state.resources, stars: Math.max(0, state.resources.stars - 5) }, queue: [updated, ...rest], news: ["Прототип: 5 минут сняты с первого слота очереди.", ...state.news].slice(0, 8) };
  }
  if (product === "slot") return { ...state, resources: { ...state.resources, stars: Math.max(0, state.resources.stars - 15) }, militiaCapacity: state.militiaCapacity + 4, news: ["Прототип: лагерь расширен на 4 места.", ...state.news].slice(0, 8) };
  return { ...state, resources: { ...state.resources, stars: state.resources.stars + 50 }, news: ["Прототип: набор выжившего добавил 50 Stars в локальный ledger.", ...state.news].slice(0, 8) };
}
