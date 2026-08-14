"""MECH-07 v2: demand is survival-driven (food/water consumption), supply is
raid-scavenged surplus, coupons are scarce on purpose (only selling earns).
Measures: coupon circulation velocity, price convergence, liquidity coverage.
"""
import random
from collections import defaultdict

RESOURCE_REF = {
    "materials": (2.0, 0.5), "water": (6.5, 1.0), "cooked_meal": (12.5, 1.5),
    "meds": (50.0, 5.0), "parts": (20.0, 2.5), "scrap": (120.0, 10.0),
}
NPC_SPREAD = 0.20

class Player:
    def __init__(self, rid, stars_pack):
        self.id = rid
        self.stars_pack = stars_pack
        self.coupons = 20.0  # стартовый капитал (подарок за первые сутки — дизайн-решение)
        self.inventory = defaultdict(float)
        self.days_active = 0

def main(seed=7, days=30, n_players=100, stars_share=0.05, active_rate=0.4):
    random.seed(seed)
    players = [Player(i, random.random() < stars_share) for i in range(n_players)]
    listings = defaultdict(list)
    history = defaultdict(list)
    burn_total = 0.0
    volume = defaultdict(float)
    daily_active_counts = []

    for day in range(days):
        active = [p for p in players if random.random() < active_rate]
        daily_active_counts.append(len(active))

        # Потребление: еда/вода сжираются каждый день (не накапливаются) —
        # у игрока мотив покупать каждый день, даже если есть рюкзак.
        for p in active:
            p.days_active += 1
            p.inventory["cooked_meal"] -= 1
            p.inventory["water"] -= 1
            if p.inventory["cooked_meal"] < 0:
                p.coupons -= 3.0   # голодная плата (моральный штраф MECH-06 параллельно)
            if p.inventory["water"] < 0:
                p.coupons -= 2.0
            p.inventory["cooked_meal"] = max(0.0, p.inventory["cooked_meal"])
            p.inventory["water"] = max(0.0, p.inventory["water"])

        # Добыча вылазок (активные)
        for p in active:
            p.inventory["materials"] += random.uniform(2, 8)
            p.inventory["water"] += random.uniform(0, 2)
            if random.random() < 0.15:
                p.inventory["cooked_meal"] += 1
            if random.random() < 0.06:
                p.inventory["meds"] += 1
            if random.random() < 0.18:
                p.inventory["parts"] += random.uniform(0.5, 2)
            if random.random() < 0.03:
                p.inventory["scrap"] += 1

        # Вливания
        for p in active:
            p.coupons += 5.0  # ежедневка «пережить сутки»
        for p in players:
            if p.stars_pack and random.random() < 0.3:
                p.coupons += 500.0

        # Листинги: продаём излишек над буфером, цена ~ якорь (медиана или реф)
        for p in active:
            buffers = {"materials": 25, "water": 5, "cooked_meal": 3,
                       "meds": 2, "parts": 6, "scrap": 1}
            for res, buf in buffers.items():
                qty = p.inventory[res]
                if qty > buf:
                    sell_qty = qty - buf
                    p.inventory[res] = buf
                    anchor = history[res][-1] if history[res] else RESOURCE_REF[res][0]
                    price = anchor * random.uniform(0.85, 1.2)
                    listings[res].append([price, sell_qty, p])

        # Покупки: приоритет — еда/вода, потом меды/материалы
        for p in active:
            wants = [("cooked_meal", 2), ("water", 2), ("meds", 1),
                     ("materials", 8), ("parts", 2)]
            for res, qty in wants:
                if p.inventory[res] < qty * 0.8 and p.coupons > 2:
                    target = qty - p.inventory[res]
                    spend_cap = p.coupons * 0.5   # не тратим всё — запас на голодную плату
                    lst = sorted([x for x in listings[res] if x[1] > 0], key=lambda x: x[0])
                    bought = 0.0
                    spent = 0.0
                    for x in lst:
                        take = min(x[1], target - bought)
                        cost = take * x[0]
                        if spent + cost > spend_cap:
                            take = max(0.0, (spend_cap - spent) / x[0])
                        if take <= 0:
                            break
                        x[1] -= take
                        spent += take * x[0]
                        if x[2] is not None:
                            x[2].coupons += take * x[0] * 0.95
                        burn_total += take * x[0] * 0.05
                        volume[res] += take * x[0]
                        p.coupons -= cost
                        p.inventory[res] += take
                        bought += take
                        if bought >= target:
                            break

        # NPC-ликвидность для пустых ресурсов
        for res in RESOURCE_REF:
            if not listings[res]:
                med = history[res][-1] if history[res] else RESOURCE_REF[res][0]
                listings[res].append([med * (1 - NPC_SPREAD), 50.0, None])
            prices = [x[0] for x in listings[res]]
            history[res].append(sum(prices) / len(prices))
            listings[res] = [x for x in listings[res] if 0 < x[1] < 1e6]

    print(f"=== MECH-07 v2 (30 дней, 100 игроков, active_rate={active_rate}) ===")
    med_c = sum(p.coupons for p in players) / n_players
    print(f"Median coupons/игрок (end): {med_c:.0f}")
    print(f"Total burned (5%): {burn_total:.0f}  |  Volume: {sum(volume.values()):.0f}")
    inj_quest = active_rate * days * n_players * 5
    inj_stars = sum(1 for p in players if p.stars_pack) * 500 * 0.3 * days
    print(f"Injected: quests {inj_quest:.0f} + Stars {inj_stars:.0f} = {inj_quest+inj_stars:.0f}")
    print(f"Burn/volume ratio: {burn_total/sum(volume.values())*100:.1f}%")
    print()
    for res in RESOURCE_REF:
        ref = RESOURCE_REF[res][0]
        medians = history[res][-10:]
        m = sum(medians)/len(medians)
        print(f"{res:12s} ref={ref:6.1f} last10-median={m:7.2f}  vol={volume[res]:8.0f}")
    return history, daily_active_counts

if __name__ == "__main__":
    main()
