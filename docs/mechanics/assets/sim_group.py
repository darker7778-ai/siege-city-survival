"""MECH-08 group simulation: solo vs group scavenging over 30 game days.
Verifies: (a) group raid is ~15-30% more efficient per player than solo;
(b) even split is fair when all participate, unfair when someone idles;
(c) group loot share split (default equal, leader-configurable >=10% each)
keeps group viable and solo still competitive.
"""
import random
from dataclasses import dataclass

random.seed(7)
DAYS = 30

# --- модель вылазки ---
# Соло-вылазка: лут на игрока (кг) зависит от глубины нодов.
# База: 1.5-4.0 кг на игрока за ноду; риск потери персонажа ~10%/нода.
def solo_raid(player):
    loot = random.uniform(1.5, 4.0) * 2   # типично 2-3 нода
    risk = 1 - (0.9 ** random.uniform(1.5, 3.0))
    return loot, risk

# Совместная вылазка: рюкзак суммарный 24 кг (база; соло 12 кг), глубина +2 нода.
# Лут распределён по суммарной «мощи» группы; риск снижен (партнёр прикрывает).
def group_raid(n_members, active_members, power_share, shares):
    n_active = len(active_members) if hasattr(active_members, '__len__') else active_members
    # Рюкзак суммарный 24 кг = в 2 раза больше соло (12 кг). Совместная вылазка
    # заменяет индивидуальную: за ночь группа делает ОДНУ вылазку вместо N.
    # Экономия действия ×2 рюкзак × глубина = бонус при полной активности.
    backpack = 24.0 * (1 + 0.5 * (n_active - 1))   # 24-36-48... кг при 2-3-4+ активных
    depth_bonus = 1.0 + 0.10 * 2   # +2 нода ~ +10% лута
    total_loot = backpack * (0.5 + random.uniform(0, 0.5)) * depth_bonus * power_share
    risk = 1 - (0.92 ** random.uniform(2.5, 5.0))  # ниже: прикрытие
    # дележ по долям (по умолчанию поровну, мин 10%)
    per_member = {m: total_loot * s for m, s in shares.items()}
    return per_member, risk

@dataclass(frozen=True)
class Member:
    name: str
    power: float  # 0.8-1.2 "сила" (уровень/экипировка)
    active_rate: float  # доля ночей с участием в групповой вылазке
    solo_loot_hist = None

def main():
    group = [
        Member("P1", 1.0, 1.0),   # лидер, всегда активен
        Member("P2", 1.1, 0.9),   # офицер, часто активен
        Member("P3", 0.9, 0.5),   # поленивый — участвует в половине ночей
        Member("P4", 1.0, 0.0),   # неактив совсем
        Member("P5", 0.8, 0.8),
        Member("P6", 1.2, 0.6),
    ]
    total_power = sum(m.power for m in group)

    stats = {
        "solo_total": 0.0, "solo_risk_sum": 0,
        "groupA_total": 0.0, "groupA_risk": 0.0, "groupA_per": {},
        "groupB_total": 0.0, "groupB_risk": 0.0, "groupB_per": {},
    }
    for m in group:
        stats["groupA_per"][m.name] = 0.0
        stats["groupB_per"][m.name] = 0.0
    nights_active = 0
    for day in range(DAYS):
        # Соло-гипотеза: каждый активный игрок ходит на вылазку один (без группы)
        for m in group:
            if random.random() < m.active_rate:
                loot, risk = solo_raid(m)
                stats["solo_total"] += loot
                stats["solo_risk_sum"] += 1 if risk > 0.15 else 0
        # групповая вылазка: активные участники этой ночи
        active = [m for m in group if random.random() < m.active_rate]
        if len(active) >= 2:   # группа >=2 — вылазка разрешена
            nights_active += 1
            active_power_share = sum(m.power for m in active) / total_power
            for m in active:
                # Вариант A: поровну по числу участников (доля = 1/n_active)
                shareA = 1 / len(active)
                perA, riskA = group_raid(len(group), len(active),
                                         active_power_share, {mm.name: shareA for mm in active})
                stats["groupA_total"] += perA.get(m.name, 0)
                stats["groupA_per"][m.name] += perA.get(m.name, 0)
                stats["groupA_risk"] += riskA / len(active)
                # Вариант B: по мощности
                perB, riskB = group_raid(len(group), len(active),
                                         active_power_share,
                                         {mm.name: mm.power / sum(x.power for x in active) for mm in active})
                stats["groupB_total"] += perB.get(m.name, 0)
                stats["groupB_per"][m.name] += perB.get(m.name, 0)
                stats["groupB_risk"] += riskB / len(active)

    print("=== MECH-08: соло vs группа (30 дней, 6 членов, рандомная активность) ===")
    per_player_solo = stats["solo_total"] / DAYS / len(group)
    active_players = sum(1 for m in group if m.active_rate > 0)
    per_active_solo = stats["solo_total"] / DAYS / max(active_players, 1)
    print(f"Соло (по всем игрокам): {stats['solo_total']:.1f} кг / {DAYS} ночей "
          f"= {per_player_solo:.2f} кг/игрок/день")
    print(f"Соло (только по активным {active_players}): {per_active_solo:.2f} кг/день")
    print(f"Групповые ночи проведены: {nights_active}")
    print()
    print("Вариант A (дележ поровну):")
    for m in group:
        print(f"  {m.name}: активн.{m.active_rate:.0%} → {stats['groupA_per'][m.name]:7.1f} кг "
              f"({stats['groupA_per'][m.name]/DAYS:.2f} кг/день)")
    print(f"  ИТОГО: {stats['groupA_total']:.1f} кг, avg риск/ночь {stats['groupA_risk']/max(nights_active,1):.1%}")
    print()
    print("Вариант B (дележ по вкладу/мощи):")
    for m in group:
        print(f"  {m.name}: активн.{m.active_rate:.0%} → {stats['groupB_per'][m.name]:7.1f} кг "
              f"({stats['groupB_per'][m.name]/DAYS:.2f} кг/день)")
    print(f"  ИТОГО: {stats['groupB_total']:.1f} кг, avg риск/ночь {stats['groupB_risk']/max(nights_active,1):.1%}")
    print()
    gA_active = stats['groupA_total'] / DAYS / max(active_players, 1)
    gB_active = stats['groupB_total'] / DAYS / max(active_players, 1)
    print(f"Группа A (поровну, по активным): {gA_active:.2f} кг/день vs соло {per_active_solo:.2f} "
          f"→ бонус {(gA_active/per_active_solo-1)*100:+.0f}%")
    print(f"Группа B (по вкладу, по активным): {gB_active:.2f} кг/день "
          f"→ бонус {(gB_active/per_active_solo-1)*100:+.0f}%")
    print(f"Поленивый P3: A={stats['groupA_per']['P3']/DAYS:.2f} vs B={stats['groupB_per']['P3']/DAYS:.2f} кг/день")

if __name__ == "__main__":
    main()
