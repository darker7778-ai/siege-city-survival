"""
MECH-11. Async-PvP-осада (набег) — балансная симуляция экономики осады.

Модель (по константам DESIGN-MiniApp-v1.0.0.md и формулам MECH-11 v1.0):
- 1 игровой день = 4 ч реального времени; 6 игровых дней в сутки РТ.
- Игрок производит дерево/камень/еда/металл коллекторами (лесопилка Ур.1: 12/ч, кеп 4 ч).
- Осада: атака на реально построенную базу противника; расчёт боя детерминированный
  с разбросом (RNG ±10% по составу гарнизона — защищается snapshot базы).
- Победа: грабёж до 20% жидких ресурсов цели.
- Проигрыш/любой исход: потери атакующего 40–70% отправленных ополченцев.
- Щит: 3 дня новичка + 12 ч после защиты; атака под щитом невозможна.
- Лимит атак: суточный счётчик (MECH-01A интенты).

Выход: CSV по 60 игровым дням (10 суток РТ) для 3 профилей + сводка.
"""
import csv
import numpy as np

rng = np.random.default_rng(42)

COLLECTOR_RATES = {"wood": 12.0, "stone": 6.0, "food": 8.0, "metal": 2.0}  # ресурсов/ч РТ
CAP_HOURS = 4.0
CAP = {res: r * CAP_HOURS for res, r in COLLECTOR_RATES.items()}
RT_H_PER_GAME_DAY = 4.0
GAME_DAYS_PER_RT_DAY = 24.0 / RT_H_PER_GAME_DAY  # 6

HQ_COST = {2: (120, 60), 3: (300, 150), 4: (700, 350)}  # дерево, камень
BARRACKS_MILITIA_CAP = {1: 20, 2: 40, 3: 80, 4: 160}
MILITIA_POWER = 10.0
WALL_POWER_PER_HQ_LEVEL = 40.0
GARRISON_RATIO = 0.5
FOOD_PER_RECRUIT = 0.5

LOOT_FRACTION = 0.20
LIQUID_SHARE = 0.60
ATTACK_COST_WOOD = 5.0
WIN_POWER_RATIO_MIN = 1.15
LOSS_MIN, LOSS_MAX = 0.40, 0.70

GAME_DAYS = 60


def run_profile(name, attack_freq_per_rt_day, target_power_ratio, is_raided_daily):
    day = 1
    res = {"wood": 400.0, "stone": 200.0, "food": 100.0, "metal": 20.0}
    militia = 20
    hq_level = 1
    barracks_level = 1
    hq_next = 2
    raider_total = 0
    attacks = 0
    losses_total = 0
    loot_total = {k: 0.0 for k in COLLECTOR_RATES}
    attacked_streak = 0
    rows = []

    for gd in range(1, GAME_DAYS + 1):
        # производство за игровые сутки (защитник собирает накопленное: кеп + производство 24ч)
        for r_ in COLLECTOR_RATES:
            res[r_] = min(res[r_] + COLLECTOR_RATES[r_] * 24.0, CAP[r_] + COLLECTOR_RATES[r_] * 20.0)

        # апгрейды HQ (покупка уровней по мере ресурсов)
        while hq_next in HQ_COST and res["wood"] >= HQ_COST[hq_next][0] and res["stone"] >= HQ_COST[hq_next][1]:
            res["wood"] -= HQ_COST[hq_next][0]
            res["stone"] -= HQ_COST[hq_next][1]
            hq_level = hq_next
            hq_next += 1
            if hq_level == barracks_level + 1:
                barracks_level = hq_level - 1
            militia = min(BARRACKS_MILITIA_CAP[barracks_level], militia + 20)

        militia_cap = BARRACKS_MILITIA_CAP[barracks_level]

        # атаки игрока (суточный лимит = ceil(freq))
        attacks_today = 0
        n_attacks = int(attack_freq_per_rt_day) + (1 if rng.random() < (attack_freq_per_rt_day % 1) else 0)
        for _ in range(n_attacks):
            if res["wood"] < ATTACK_COST_WOOD or militia < 5:
                continue
            attacks_today += 1
            attacks += 1
            res["wood"] -= ATTACK_COST_WOOD
            # Цель: другой игрок на том же этапе прогрессии, но с разницей в возрасте базы
            # и силой гарнизона. target_power_ratio > 1.0 = цель слабее (находим уязвимую базу).
            # Гарнизон цели = MILITIA_POWER * militia * (1/target_power_ratio) * GARRISON_RATIO,
            # стены = WALL_POWER_PER_HQ_LEVEL * max(1, hq_level - 1) — у цели база на шаг моложе.
            target_garrison = MILITIA_POWER * militia / max(0.7, target_power_ratio) * GARRISON_RATIO
            target_walls = WALL_POWER_PER_HQ_LEVEL * max(1, hq_level - 1)
            target_power = target_garrison + target_walls
            attack_power = MILITIA_POWER * militia * rng.uniform(0.9, 1.1)
            won = attack_power >= WIN_POWER_RATIO_MIN * target_power
            loss_rate = rng.uniform(LOSS_MIN, 0.55 if won else LOSS_MAX)
            losses = int(militia * loss_rate)
            militia -= losses
            losses_total += losses
            if won:
                # Лоут считается с ресурсов ЦЕЛИ, не своих: цель живёт той же моделью,
                # поэтому её жидкие ресурсы ≈ производство за (кеп + несколько суток накопления).
                mult = 0.8 + 0.4 * rng.random()
                for r_ in COLLECTOR_RATES:
                    target_res = CAP[r_] + COLLECTOR_RATES[r_] * (16 + 8 * rng.random())
                    amt = target_res * LOOT_FRACTION * mult
                    res[r_] += amt
                    loot_total[r_] += amt

        # набор ополчения (еда-поддержка)
        food_support = max(0.0, militia_cap - militia) * FOOD_PER_RECRUIT
        if res["food"] >= food_support and food_support > 0:
            res["food"] -= food_support
            militia = min(militia_cap, militia + int(food_support / FOOD_PER_RECRUIT))

        # рейд на базу игрока (защита) — после щита новичка (3 дня + 12 ч ≈ 3.5 дня)
        raided = False
        if is_raided_daily and gd > 4:
            attacker_power = MILITIA_POWER * (15 + 10 * gd / GAME_DAYS) * target_power_ratio
            defender_power = MILITIA_POWER * militia * GARRISON_RATIO + WALL_POWER_PER_HQ_LEVEL * hq_level
            if attacker_power > WIN_POWER_RATIO_MIN * defender_power:
                raided = True
                for r_ in COLLECTOR_RATES:
                    loss_amt = res[r_] * LOOT_FRACTION * LIQUID_SHARE * 0.9
                    res[r_] -= loss_amt
                raider_total += 1
                attacked_streak += 1
            else:
                attacked_streak = 0
        if not raided:
            attacked_streak = max(0, attacked_streak - 1)

        for r_ in COLLECTOR_RATES:
            res[r_] = max(0.0, res[r_])

        rows.append({
            "profile": name, "game_day": gd, "hq": hq_level, "militia": militia,
            "wood": round(res["wood"], 1), "stone": round(res["stone"], 1),
            "food": round(res["food"], 1), "metal": round(res["metal"], 1),
            "attacks_today": attacks_today, "raided": int(raided),
            "attacked_streak": attacked_streak,
        })

    return {"name": name, "attacks": attacks, "losses_total": losses_total,
            "raided_count": raider_total,
            "loot_total": {k: round(v, 1) for k, v in loot_total.items()},
            "final_resources": {k: round(v, 1) for k, v in res.items()}}, rows


if __name__ == "__main__":
    profiles = [
        ("p1_cautious", 0.5, 0.9, False),    # осторожный налётчик, цели слабее, сам не под рейдами
        ("p2_active", 1.0, 1.0, True),       # активный, цели равные, сам ежедневно под рейдами
        ("p3_reckless", 1.5, 1.25, True),    # нападает на сильных, сам под рейдами
    ]
    all_rows = []
    summary_rows = []
    print(f"{'profile':20s} {'attacks':>7s} {'losses':>7s} {'raided':>7s} | loot wood/stone/food/metal | final wood/stone/food/metal")
    for name, freq, ratio, raided in profiles:
        s, rows = run_profile(name, freq, ratio, raided)
        all_rows.extend(rows)
        print(f"{s['name']:20s} {s['attacks']:7d} {s['losses_total']:7d} {s['raided_count']:7d} | "
              f"{s['loot_total']['wood']}/{s['loot_total']['stone']}/{s['loot_total']['food']}/{s['loot_total']['metal']} | "
              f"{s['final_resources']['wood']}/{s['final_resources']['stone']}/{s['final_resources']['food']}/{s['final_resources']['metal']}")
        summary_rows.append({
            "name": s["name"], "attacks": s["attacks"], "losses_total": s["losses_total"],
            "raided_count": s["raided_count"], "wood_loot": s["loot_total"]["wood"],
            "stone_loot": s["loot_total"]["stone"], "food_loot": s["loot_total"]["food"],
            "metal_loot": s["loot_total"]["metal"], "wood_final": s["final_resources"]["wood"],
            "stone_final": s["final_resources"]["stone"], "food_final": s["final_resources"]["food"],
            "metal_final": s["final_resources"]["metal"],
        })

    with open("/home/ubuntu/mech11_siege_sim.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(all_rows[0].keys()))
        w.writeheader()
        w.writerows(all_rows)

    with open("/home/ubuntu/mech11_siege_summary.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(summary_rows[0].keys()))
        w.writeheader()
        w.writerows(summary_rows)

    # Балансный чек: отношение ограбленного к накраденному по активному профилю
    for s_row in summary_rows:
        total_loot = s_row["wood_loot"] + s_row["stone_loot"] + s_row["food_loot"] + s_row["metal_loot"]
        total_lost = s_row["raided_count"] * 50  # грубая оценка потерь от рейдов
        print(f"{s_row['name']}: суммарно награблено ~{total_loot:.0f} ед. при {s_row['raided_count']} потерях от рейдов")
    print("CSV saved: mech11_siege_sim.csv, mech11_siege_summary.csv")
