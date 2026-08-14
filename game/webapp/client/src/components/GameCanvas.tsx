// Style reminder: Signal Amber / war-worn editorial minimalism. This file is the mobile command surface over the Babylon city canvas.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import BatteryCharging from "lucide-react/dist/esm/icons/battery-charging";
import Check from "lucide-react/dist/esm/icons/check";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Clock3 from "lucide-react/dist/esm/icons/clock-3";
import Flag from "lucide-react/dist/esm/icons/flag";
import Hammer from "lucide-react/dist/esm/icons/hammer";
import Layers3 from "lucide-react/dist/esm/icons/layers-3";
import MapPinned from "lucide-react/dist/esm/icons/map-pinned";
import Menu from "lucide-react/dist/esm/icons/menu";
import PackageOpen from "lucide-react/dist/esm/icons/package-open";
import Plus from "lucide-react/dist/esm/icons/plus";
import Radio from "lucide-react/dist/esm/icons/radio";
import Shield from "lucide-react/dist/esm/icons/shield";
import ShoppingBag from "lucide-react/dist/esm/icons/shopping-bag";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Swords from "lucide-react/dist/esm/icons/swords";
import Timer from "lucide-react/dist/esm/icons/timer";
import Users from "lucide-react/dist/esm/icons/users";
import Zap from "lucide-react/dist/esm/icons/zap";
import { ASSETS } from "@/game/assets";
import { BUILDING_META, BuildingKey, completeTimers, collectResources, formatNumber, formatTimer, GameState, getWorldClock, loadGame, prepareRaid, resolveRaid, saveGame, startTraining, startUpgrade, activatePrototypeProduct } from "@/game/storage";
import { createGameScene, GameHandle } from "@/game/scene";

type Screen = "city" | "build" | "militia" | "siege" | "alliance" | "shop";

type TelegramWebApp = {
  initDataUnsafe?: { user?: { first_name?: string; username?: string } };
  ready?: () => void;
  expand?: () => void;
  close?: () => void;
  MainButton?: { setParams: (params: Record<string, unknown>) => void; show: () => void; hide: () => void; onClick: (callback: () => void) => void; offClick: (callback: () => void) => void; showProgress: (leaveActive?: boolean) => void; hideProgress: () => void };
  HapticFeedback?: { impactOccurred: (style: "light" | "medium" | "heavy") => void; notificationOccurred: (type: "error" | "success" | "warning") => void };
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
  openTelegramLink?: (url: string) => void;
  showPopup?: (params: { title?: string; message: string; buttons?: Array<{ type: string; text?: string }> }, callback?: () => void) => void;
};

declare global {
  interface Window { Telegram?: { WebApp?: TelegramWebApp } }
}

const NAV_ITEMS: Array<{ id: Screen; label: string; icon: typeof MapPinned }> = [
  { id: "city", label: "Город", icon: MapPinned },
  { id: "build", label: "Постройки", icon: Hammer },
  { id: "militia", label: "Ополчение", icon: Swords },
  { id: "alliance", label: "Группа", icon: Flag },
  { id: "shop", label: "Магазин", icon: ShoppingBag },
];

const RESOURCE_ITEMS = [
  { key: "wood", label: "Дерево", icon: ASSETS.icons.wood },
  { key: "stone", label: "Камень", icon: ASSETS.icons.stone },
  { key: "food", label: "Еда", icon: ASSETS.icons.food },
  { key: "metal", label: "Металл", icon: ASSETS.icons.metal },
  { key: "gold", label: "Монеты", icon: ASSETS.icons.gold },
] as const;

const BUILDING_ART: Record<BuildingKey, string> = {
  hq: ASSETS.buildings.hq,
  lumbermill: ASSETS.buildings.lumbermill,
  quarry: ASSETS.buildings.quarry,
  barracks: ASSETS.buildings.barracks,
};

function telegram() {
  return typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
}

function haptic(style: "light" | "medium" | "heavy" = "light") {
  telegram()?.HapticFeedback?.impactOccurred(style);
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<any>(null);
  const handleRef = useRef<GameHandle | null>(null);
  const mountedRef = useRef(false);
  const [screen, setScreen] = useState<Screen>(new URLSearchParams(window.location.search).get("demo") ? "city" : "city");
  const [game, setGame] = useState<GameState>(() => loadGame());
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [showLedger, setShowLedger] = useState(false);
  const [telegramMode, setTelegramMode] = useState(false);
  const playerName = telegram()?.initDataUnsafe?.user?.first_name || "Илья";

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoading(false), 900);
    const tg = telegram();
    if (tg) {
      setTelegramMode(true);
      tg.ready?.();
      tg.expand?.();
    }
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
      setGame((current) => {
        const next = completeTimers(current, Date.now());
        if (next !== current) saveGame(next);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (mountedRef.current || !canvasRef.current) return;
    mountedRef.current = true;
    if (!window.BABYLON) return;
    const engine = new window.BABYLON.Engine(canvasRef.current, true, { preserveDrawingBuffer: true, stencil: true });
    engineRef.current = engine;
    createGameScene(engine, canvasRef.current).then((handle) => {
      handleRef.current = handle;
      engine.runRenderLoop(() => handle.scene.render());
    });
    return () => {
      mountedRef.current = false;
      handleRef.current?.dispose();
      handleRef.current = null;
      engine.stopRenderLoop();
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2800);
  }, []);

  const updateGame = useCallback((next: GameState) => {
    setGame(next);
    saveGame(next);
  }, []);

  const collect = useCallback(() => {
    haptic("medium");
    const result = collectResources(game, Date.now());
    if ("error" in result) { showNotice(`${result.error}: ${result.message}`); return; }
    updateGame(result.state);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 420);
    showNotice(`Собрано: +${result.wood} дерева · +${result.stone} камня`);
  }, [game, showNotice, updateGame]);

  const upgrade = useCallback((key: BuildingKey) => {
    haptic("light");
    const result = startUpgrade(game, key, Date.now());
    if (result.error) {
      telegram()?.HapticFeedback?.notificationOccurred("error");
      showNotice(result.error);
      return;
    }
    updateGame(result.state);
    showNotice(`Приказ отправлен: ${game.buildings[key].name}`);
  }, [game, showNotice, updateGame]);

  const train = useCallback(() => {
    haptic("light");
    const result = startTraining(game, Date.now());
    if (result.error) {
      telegram()?.HapticFeedback?.notificationOccurred("error");
      showNotice(result.error);
      return;
    }
    updateGame(result.state);
    showNotice("Набор начат · вернитесь через 08м");
  }, [game, showNotice, updateGame]);

  const raid = useCallback(() => {
    haptic("medium");
    const nowValue = Date.now();
    const clock = getWorldClock(nowValue);
    if (clock.phase === "dusk") {
      const result = prepareRaid(game, nowValue);
      if ("error" in result) { showNotice(`${result.error}: ${result.message}`); return; }
      telegram()?.enableClosingConfirmation?.();
      updateGame(result.state);
      showNotice(`Вылазка назначена на ночь Дня ${clock.day}.`);
      setScreen("siege");
      return;
    }
    if (clock.phase !== "night") { showNotice(`RAID_WINDOW_CLOSED: назначение доступно только в сумерках. Сейчас ${clock.phaseLabel}.`); return; }
    const result = resolveRaid(game, nowValue);
    if ("error" in result) { showNotice(`${result.error}: ${result.message}`); return; }
    updateGame(result.state);
    showNotice(result.victory ? `Осада удалась · вернулось ${result.returned}/${result.sent}` : `Тяжёлое возвращение · вернулось ${result.returned}/${result.sent}`);
    setScreen("siege");
  }, [game, showNotice, updateGame]);

  const activateProduct = useCallback((product: "speed" | "slot" | "bundle", cost: number) => {
    if (product !== "bundle" && game.resources.stars < cost) {
      showNotice("Недостаточно Stars в локальном прототипе.");
      return;
    }
    if (product === "speed" && game.queue.length === 0) {
      showNotice("QUEUE_EMPTY: сначала поставьте приказ в очередь.");
      return;
    }
    const next = activatePrototypeProduct(game, product, Date.now());
    updateGame(next);
    haptic("medium");
    showNotice(product === "bundle" ? "Набор выжившего добавлен в ledger." : "Прототипный товар активирован.");
  }, [game, showNotice, updateGame]);

  useEffect(() => {
    const tg = telegram();
    const mainButton = tg?.MainButton;
    if (!mainButton || loading) return;
    const callback = screen === "city" ? collect : screen === "militia" ? raid : undefined;
    if (!callback) {
      mainButton.hide();
      return;
    }
    mainButton.setParams({ text: screen === "city" ? "СОБРАТЬ РЕСУРСЫ" : "ОТКРЫТЬ ОСАДУ", color: "#C4A265", text_color: "#0C1016", is_visible: true });
    mainButton.onClick(callback);
    mainButton.show();
    return () => { mainButton.offClick(callback); mainButton.hide(); };
  }, [collect, loading, raid, screen]);

  const worldClock = useMemo(() => getWorldClock(now), [now]);
  const phase = useMemo(() => ({ label: worldClock.phaseLabel, detail: worldClock.detail, tone: worldClock.phase === "dusk" ? "amber" : worldClock.phase === "night" ? "cold" : "day" }), [worldClock]);
  const nextPhase = formatTimer(worldClock.nextPhaseAt - now);

  if (loading) return <LoadingScreen name={playerName} />;

  return (
    <div className="game-shell">
      <canvas ref={canvasRef} className="game-canvas" aria-label="Ночная сцена города" />
      <div className="scene-wash" />
      <main className="app-frame">
        <header className="topbar">
          <div className="brand-lockup">
            <img src={ASSETS.logo} alt="" className="brand-emblem" />
            <div><span className="eyebrow">SCS / 01</span><strong>SIEGE CITY</strong></div>
          </div>
          <div className="world-clock">
            <span className="clock-mark"><Radio size={12} /> WORLD CLOCK</span>
            <strong>ДЕНЬ {worldClock.day} · {worldClock.gameTime}</strong>
            <span className={`phase-chip ${phase.tone}`}><span className="pulse-dot" /> {phase.label} · {nextPhase}</span>
          </div>
          <button className="icon-button" aria-label="Открыть журнал" onClick={() => { haptic(); setShowLedger((value) => !value); }}><Menu size={18} /></button>
        </header>

        <section className="resource-strip" aria-label="Ресурсы убежища">
          {RESOURCE_ITEMS.map((resource) => (
            <div className="resource-item" key={resource.key}>
              <img src={resource.icon} alt="" />
              <span><small>{resource.label}</small><b>{formatNumber(game.resources[resource.key])}</b></span>
            </div>
          ))}
          <div className="resource-item stars"><Sparkles size={16} /><span><small>Stars</small><b>{formatNumber(game.resources.stars)}</b></span></div>
        </section>

        {showLedger && <aside className="ledger-panel" aria-label="Журнал событий"><div className="section-kicker">ЛЕНТА / 07 СУТОК <button onClick={() => setShowLedger(false)} aria-label="Закрыть журнал">×</button></div>{game.news.slice(0, 5).map((item, index) => <div className="ledger-line" key={`${item}-${index}`}><span>0{index + 1}</span><p>{item}</p></div>)}</aside>}

        <div className="screen-body">
          {screen === "city" && <CityScreen game={game} now={now} flash={flash} onCollect={collect} onOpen={(next) => setScreen(next)} />}
          {screen === "build" && <BuildScreen game={game} now={now} onBack={() => setScreen("city")} onUpgrade={upgrade} />}
          {screen === "militia" && <MilitiaScreen game={game} now={now} onBack={() => setScreen("city")} onTrain={train} onRaid={() => setScreen("siege")} />}
          {screen === "siege" && <SiegeScreen game={game} now={now} onBack={() => { telegram()?.disableClosingConfirmation?.(); setScreen("militia"); }} onRaid={raid} />}
          {screen === "alliance" && <AllianceScreen onBack={() => setScreen("city")} telegramMode={telegramMode} />}
          {screen === "shop" && <ShopScreen game={game} onBack={() => setScreen("city")} onActivate={activateProduct} />}
        </div>

        <nav className="bottom-nav" aria-label="Основная навигация">
          {NAV_ITEMS.map((item) => { const Icon = item.icon; return <button key={item.id} className={screen === item.id || (screen === "siege" && item.id === "militia") ? "active" : ""} onClick={() => { haptic(); setScreen(item.id); }}><Icon size={18} /><span>{item.label}</span>{item.id === "militia" && game.trainingDoneAt && <i />}</button>; })}
        </nav>
        <div className="web-mode-badge">{telegramMode ? "TELEGRAM WEB APP" : "WEB PREVIEW"} · ЛОКАЛЬНАЯ СЕССИЯ</div>
      </main>
      {notice && <div className="notice" role="status"><Check size={15} /> {notice}</div>}
    </div>
  );
}

function LoadingScreen({ name }: { name: string }) {
  return <div className="loading-screen" style={{ backgroundImage: `linear-gradient(180deg, rgba(12,16,22,.34), rgba(12,16,22,.94)), url(${ASSETS.loading})` }}><img src={ASSETS.logo} alt="Siege City Survival" className="loading-logo" /><span className="eyebrow">SIEGE CITY SURVIVAL / v0.1</span><h1>Привет, {name}</h1><p>Свет в убежище ещё держится.</p><div className="loading-line"><span /><b>СИНХРОНИЗАЦИЯ ГОРОДА</b></div></div>;
}

function CityScreen({ game, now, flash, onCollect, onOpen }: { game: GameState; now: number; flash: boolean; onCollect: () => void; onOpen: (screen: Screen) => void }) {
  const elapsed = Math.min(4, Math.max(0, (now - game.lastCollectedAt) / 3_600_000));
  const cityBuildings: Array<{ key: BuildingKey; x: string; y: string; label: string }> = [
    { key: "hq", x: "17%", y: "19%", label: "ШТАБ" },
    { key: "lumbermill", x: "66%", y: "23%", label: "ЛЕС" },
    { key: "quarry", x: "24%", y: "61%", label: "КАМЕНЬ" },
    { key: "barracks", x: "69%", y: "62%", label: "КАЗАРМЫ" },
  ];
  const clock = getWorldClock(now);
  return <div className="city-screen">
    <div className="screen-heading"><div><span className="eyebrow">СЕКТОР 04 / ЛИНИЯ ОБОРОНЫ</span><h1>Город держится.</h1></div><div className="shield-status"><Shield size={15} /> ЩИТ 02д 11ч</div></div>
    <div className="city-viewport" style={{ backgroundImage: `linear-gradient(180deg, rgba(9,13,18,.18), rgba(9,13,18,.74)), url(${ASSETS.city})` }}>
      <div className="city-grid" aria-label="Сетка города 6 на 8">{Array.from({ length: 48 }, (_, index) => <span key={index} className={index % 7 === 0 || index % 11 === 0 ? "ruin-cell" : ""} />)}</div>
      {cityBuildings.map((building) => <button className="building-pin" key={building.key} style={{ left: building.x, top: building.y }} onClick={() => { haptic(); onOpen(building.key === "barracks" ? "militia" : "build"); }}><img src={BUILDING_ART[building.key]} alt={BUILDING_META[building.key].name} /><span>{building.label} <b>УР. {game.buildings[building.key].level}</b></span></button>)}
      <div className="city-signal"><span className="signal-bar" /><span>НОЧНОЙ КОНТУР СТАБИЛЕН</span></div>
    </div>
    <div className={`collect-card ${flash ? "flash" : ""}`}><div className="collect-copy"><span className="section-kicker"><Zap size={13} /> КОЛЛЕКТОРЫ / НАКОПЛЕНО {elapsed.toFixed(1)}ч</span><h2>Вернуть тепло в склад</h2><p>Лесопилка <b>+{Math.floor(elapsed * 12 * game.buildings.lumbermill.level)}</b> · Каменоломня <b>+{Math.floor(elapsed * 6 * game.buildings.quarry.level)}</b></p></div><button className="primary-action" onClick={onCollect}><PackageOpen size={18} /> СОБРАТЬ РЕСУРСЫ <ChevronRight size={16} /></button></div>
    <div className="city-brief"><div><span className="eyebrow">СВОДКА / МИРОВЫЕ ЧАСЫ</span><strong>Рынок работает · следующий этап через {formatTimer(clock.nextPhaseAt - now)}</strong></div><button className="text-action" onClick={() => onOpen("militia")}>Проверить периметр <ChevronRight size={15} /></button></div>
  </div>;
}

function BuildScreen({ game, now, onBack, onUpgrade }: { game: GameState; now: number; onBack: () => void; onUpgrade: (key: BuildingKey) => void }) {
  return <div className="inner-screen"><ScreenHeader index="02" title="Постройки" subtitle="Очередь приказов / визуальная трансформация города" onBack={onBack} /><div className="queue-strip"><div><span className="eyebrow">ОЧЕРЕДЬ РАБОТ</span><strong>{game.queue.length}/2 СЛОТА</strong></div><div className="queue-slots">{[0, 1].map((slot) => { const item = game.queue[slot]; return <div className="queue-slot" key={slot}>{item ? <><Timer size={14} /><span>{BUILDING_META[item.building].shortName}<b>{formatTimer(item.doneAt - now)}</b></span></> : <><Plus size={15} /><span>СЛОТ СВОБОДЕН</span></>}</div>; })}</div></div><div className="building-list">{(Object.keys(BUILDING_META) as BuildingKey[]).map((key, index) => { const building = game.buildings[key]; const cost = { wood: 80 * building.level, stone: 40 * building.level }; const queued = game.queue.find((item) => item.building === key); return <article className="building-card" key={key}><div className="building-art"><img src={BUILDING_ART[key]} alt="" /></div><div className="building-info"><span className="eyebrow">0{index + 1} / УР. {building.level}</span><h2>{building.name}</h2><p>{building.rate || "Главный гейт города"}</p><div className="building-cost"><span><img src={ASSETS.icons.wood} alt="" /> {cost.wood}</span><span><img src={ASSETS.icons.stone} alt="" /> {cost.stone}</span><span><Clock3 size={13} /> {formatTimer(15 * building.level * 60_000)}</span></div></div><button className="secondary-action" disabled={Boolean(queued)} onClick={() => onUpgrade(key)}>{queued ? <><Timer size={15} /> {formatTimer(queued.doneAt - now)}</> : <><Hammer size={15} /> УЛУЧШИТЬ</>}</button></article>; })}</div></div>;
}

function MilitiaScreen({ game, now, onBack, onTrain, onRaid }: { game: GameState; now: number; onBack: () => void; onTrain: () => void; onRaid: () => void }) {
  const training = game.trainingDoneAt ? formatTimer(game.trainingDoneAt - now) : null;
  return <div className="inner-screen"><ScreenHeader index="03" title="Ополчение" subtitle="Люди — не ресурс. Возвращайте их домой." onBack={onBack} /><div className="militia-hero"><div className="militia-copy"><span className="eyebrow">КАЗАРМЫ / СТАТУС</span><h2>{game.militia} <small>/ {game.militiaCapacity}</small></h2><p>Готовы держать периметр и выйти в ночь.</p><div className="capacity-line"><span style={{ width: `${(game.militia / game.militiaCapacity) * 100}%` }} /></div></div><img src={ASSETS.militia} alt="Ополченец в тяжёлом пальто" /></div><div className="action-grid"><button className="primary-action" onClick={onTrain} disabled={Boolean(training)}><Users size={18} /> {training ? `НАБОР / ${training}` : "НАЧАТЬ НАБОР"}</button><button className="secondary-action raid-entry" onClick={onRaid}><Swords size={17} /> ОТКРЫТЬ ОСАДУ <ChevronRight size={15} /></button></div><div className="warning-note"><AlertTriangle size={16} /><p><b>Щит новичка активен.</b> Первые 3 дня город нельзя выбрать целью. Даже при поражении часть ополчения возвращается.</p></div></div>;
}

function SiegeScreen({ game, now, onBack, onRaid }: { game: GameState; now: number; onBack: () => void; onRaid: () => void }) {
  const clock = getWorldClock(now);
  const available = clock.phase === "dusk" || (clock.phase === "night" && Boolean(game.raidAssignedAt));
  const actionLabel = clock.phase === "dusk" ? "НАЗНАЧИТЬ ВЫЛАЗКУ" : clock.phase === "night" ? (game.raidAssignedAt ? "ИСПОЛНИТЬ ВЫЛАЗКУ" : "НЕТ НАЗНАЧЕНИЯ") : "ОКНО ЗАКРЫТО";
  return <div className="inner-screen siege-screen"><ScreenHeader index="04" title="Осада" subtitle="Асинхронный набег / один приказ до рассвета" onBack={onBack} /><div className="raid-map" style={{ backgroundImage: `linear-gradient(180deg, rgba(12,16,22,.08), rgba(12,16,22,.88)), url(${ASSETS.hero})` }}><div className="raid-target"><span className="eyebrow">ЦЕЛЬ / СЕКТОР 09</span><strong>Дымный рынок</strong><span>Защита: 76 · Добыча: до 20%</span></div><div className="raid-path"><span /><span /><span /><span /></div></div><div className="raid-loadout"><div><span className="eyebrow">ВЫЛАЗКА / СОСТАВ</span><strong>{Math.floor(game.militia * 0.75)} ополченцев</strong><p>Рюкзак 12 кг · глубина 8 нодов</p></div><div className="raid-stat"><Swords size={17} /><b>61</b><span>мощность</span></div><div className="raid-stat"><BatteryCharging size={17} /><b>87%</b><span>готовность</span></div></div><button className="primary-action wide" onClick={onRaid} disabled={!available}><Swords size={18} /> {actionLabel} <span className="action-note">{clock.detail}</span></button><p className="legal-note">{clock.phase === "dusk" ? "Только сумерки открывают назначение. Ночью исполняется уже назначенная вылазка." : "Результат считается локально в v0.1-прототипе; серверная синхронизация появится до релиза."}</p></div>;
}

function AllianceScreen({ onBack, telegramMode }: { onBack: () => void; telegramMode: boolean }) {
  const openGroup = () => { haptic(); const tg = telegram(); if (tg?.openTelegramLink) tg.openTelegramLink("https://t.me/siegecity_survival"); else window.open("https://t.me/siegecity_survival", "_blank", "noopener,noreferrer"); };
  return <div className="inner-screen"><ScreenHeader index="05" title="Группа" subtitle="Альянс живёт в Telegram, не в отдельной копии чата." onBack={onBack} /><div className="alliance-card"><div className="group-emblem"><Flag size={23} /></div><div><span className="eyebrow">РАЙОН 07 / ГРУППА</span><h2>Тихий контур</h2><p>4 участника · 18 420 общего склада</p></div><span className="online-dot">ONLINE</span></div><div className="member-list"><div className="member-row"><span className="avatar">И</span><div><b>Илья · лидер</b><small>Штаб Ур. 1 · сегодня в сети</small></div><span>+10%</span></div><div className="member-row"><span className="avatar muted">М</span><div><b>Марина · медик</b><small>Казармы Ур. 1 · 2ч назад</small></div><span>+04%</span></div><div className="member-row"><span className="avatar muted">А</span><div><b>Артём · дозорный</b><small>Лесопилка Ур. 2 · 6ч назад</small></div><span>+02%</span></div></div><div className="alliance-actions"><button className="primary-action" onClick={openGroup}><Users size={17} /> {telegramMode ? "ОТКРЫТЬ ГРУППУ" : "ОТКРЫТЬ TELEGRAM"}</button><button className="secondary-action"><Zap size={16} /> БОЙ ЗА РАЙОН <ChevronRight size={15} /></button></div><p className="legal-note">Сейчас открыт официальный маршрут к группе. Групповой склад, роли и совместные вылазки подключаются на серверной итерации.</p></div>;
}

function ShopScreen({ game, onBack, onActivate }: { game: GameState; onBack: () => void; onActivate: (product: "speed" | "slot" | "bundle", cost: number) => void }) {
  return <div className="inner-screen"><ScreenHeader index="06" title="Магазин" subtitle="Время, расширение, косметика. Не сила." onBack={onBack} /><div className="shop-balance"><Sparkles size={15} /> ЛОКАЛЬНЫЙ LEDGER <strong>{formatNumber(game.resources.stars)} ★</strong><button onClick={() => onActivate("bundle", 0)}>+50</button></div><div className="product-list"><ProductCard icon={<Timer />} title="Speed-up / 5 минут" detail="Снимает 5 минут с первого слота очереди" price="5 ★" onClick={() => onActivate("speed", 5)} /><ProductCard icon={<Layers3 />} title="Слот лагеря +4" detail="Расширяет место для ополчения" price="15 ★" onClick={() => onActivate("slot", 15)} /><ProductCard icon={<Shield />} title="Набор выжившего" detail="Локальный прототип: +50 Stars в ledger" price="0 ★" onClick={() => onActivate("bundle", 0)} /></div><p className="legal-note">Это клиентский прототип каталога. Реальные Telegram Stars, invoice-link и выдача цифрового товара будут подключены после появления игрового сервера.</p></div>;
}

function ProductCard({ icon, title, detail, price, onClick }: { icon: React.ReactNode; title: string; detail: string; price: string; onClick: () => void }) {
  const code = title.startsWith("Speed") ? "01" : title.startsWith("Слот") ? "02" : "03";
  return <article className="product-card"><div className="product-icon">{icon}</div><div><span className="eyebrow">CONVENIENCE / {code}</span><h2>{title}</h2><p>{detail}</p></div><button className="secondary-action" onClick={onClick}>{price} <ChevronRight size={15} /></button></article>;
}

function ScreenHeader({ index, title, subtitle, onBack }: { index: string; title: string; subtitle: string; onBack: () => void }) {
  return <div className="screen-heading inner-heading"><button className="back-button" onClick={() => { haptic(); onBack(); }} aria-label="Назад"><ArrowLeft size={17} /></button><div><span className="eyebrow">{index} / ПРИКАЗЫ</span><h1>{title}</h1><p>{subtitle}</p></div></div>;
}
