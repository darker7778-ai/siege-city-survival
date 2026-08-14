"""MECH-12 balance model: daily district raid (alliance vs PvE fortress).

Design constants (aligned with MECH-11 / GAME_MECHANICS balance_sim.py):
- militia strength s = 12; alliance attack bonus B_alliance 1.05..1.15 by level
- attacks per member per day: up to 3 (MECH-11 siege limit), district bonus attacks:
  +1 per district kill (first kill only, CoC raid pattern)
- district HP grows with tier T (1..7, one per day of week); tier matched to avg HQ
- damage dealt per member scales with HQ of the member; losses 40-70% like MECH-11
- rewards are system-generated (never stolen from other players), split by contribution share
"""
import random
from dataclasses import dataclass, field

random.seed(42)

@dataclass
class Member:
    hq: int            # HQ level 1..3
    activity: float    # 0..1, fraction of days they play
    skill: float       # 0.8..1.2 damage multiplier variance

@dataclass
class Alliance:
    members: list
    bonus: float = 1.0

DISTRICT_HP = {1: 400, 2: 800, 3: 1400, 4: 2200, 5: 3200, 6: 4400, 7: 6000}
DISTRICT_REWARD = {1: 120, 2: 210, 3: 330, 4: 480, 5: 660, 6: 870, 7: 1120}  # "badge units" + resource pack value

def attack_damage(member: Member, alliance_bonus: float) -> float:
    """damage of one attack = u * s * B, where u depends on HQ (barracks tier)"""
    units = {1: 20, 2: 36, 3: 60}[member.hq]
    losses = random.uniform(0.40, 0.55)  # victory losses band (MECH-11 formula)
    survivors = units * (1 - losses)
    return units * 12 * alliance_bonus * member.skill  # full-force damage; losses already accounted in member economy via MECH-11

def run_day(alliance: Alliance, tier: int, n_attacks_per_member: int = 1, bonus_attack: bool = True):
    district = DISTRICT_HP[tier]
    damage_done = 0.0
    contributions = {}
    extra = 1 if bonus_attack else 0
    total_attacks = 0
    for m in alliance.members:
        if random.random() > m.activity:
            continue
        for _ in range(n_attacks_per_member + extra):
            dmg = attack_damage(m, alliance.bonus)
            contributions.setdefault(id(m), 0.0)
            contributions[id(m)] += dmg
            damage_done += dmg
            total_attacks += 1
            if damage_done >= district:
                # first kill grants +1 attack to the killer only (CoC raid pattern)
                extra = 0
                break
    return district, damage_done, contributions, total_attacks

def simulate(days=28, members_cfg=None, alliance_bonus=1.10, attacks=1):
    """Returns per-day summary: tier, damage, destroyed, reward units, top-member share."""
    cfg = members_cfg or [
        {"hq": 1, "activity": 0.9, "skill": 1.0},  # core casual players
    ]
    members = [Member(**c) for c in cfg]
    alliance = Alliance(members=members, bonus=alliance_bonus)
    log = []
    for day in range(days):
        tier = (day % 7) + 1
        district, dmg, contrib, n_atk = run_day(alliance, tier, attacks, bonus_attack=attacks >= 1)
        destroyed = dmg >= district
        total_c = sum(contrib.values())
        top_share = (max(contrib.values()) / total_c) if total_c and contrib else 0.0
        active = len(contrib)
        log.append({
            "day": day + 1, "tier": tier, "hp": district, "dmg": round(dmg),
            "destroyed": destroyed, "attacks": n_atk,
            "active_members": active, "total_members": len(members),
            "top_share": round(top_share, 2),
            "reward": DISTRICT_REWARD[tier] if destroyed else 0,
        })
    return log

def report(name, log):
    days = len(log)
    destroyed = sum(1 for r in log if r["destroyed"])
    total_dmg = sum(r["dmg"] for r in log)
    total_reward = sum(r["reward"] for r in log)
    avg_active = sum(r["active_members"] for r in log) / days
    print(f"=== {name} ===")
    print(f"Дней: {days} | Районов зачищено: {destroyed}/{days} "
          f"({100*destroyed/days:.0f}%)")
    print(f"Суммарный урон: {total_dmg:,} | Награды: {total_reward} badge-единиц")
    print(f"Средняя явка: {avg_active:.1f} активных членов | "
          f"Средний top-share: {sum(r['top_share'] for r in log)/days:.0%}")

if __name__ == "__main__":
    # Profile A: 8 members, casual (activity .6), HQ mix 1/1/1/1/2/2/2/3, bonus 1.05 (lvl-1 alliance)
    profile_a = [
        Member(hq=1, activity=0.6, skill=1.0) for _ in range(4)
    ] + [Member(hq=2, activity=0.6, skill=1.0) for _ in range(3)] + [
        Member(hq=3, activity=0.6, skill=1.1)
    ]
    # Profile B: 20 members, active (activity .85), HQ mix, bonus 1.10
    profile_b = [Member(hq=1, activity=0.85, skill=random.uniform(0.9, 1.1)) for _ in range(12)] + \
                [Member(hq=2, activity=0.85, skill=random.uniform(0.95, 1.15)) for _ in range(6)] + \
                [Member(hq=3, activity=0.85, skill=random.uniform(1.0, 1.2)) for _ in range(2)]
    # Profile C: 30 members, hardcore (activity .95), bonus 1.15
    profile_c = [Member(hq=1, activity=0.95, skill=random.uniform(0.9, 1.15)) for _ in range(16)] + \
                [Member(hq=2, activity=0.95, skill=random.uniform(0.95, 1.2)) for _ in range(10)] + \
                [Member(hq=3, activity=0.95, skill=random.uniform(1.05, 1.25)) for _ in range(4)]

    report("Профиль A: альянс 8 членов, явка 60%, бонус 1.05, 1 атака/член",
           simulate(members_cfg=[m.__dict__ for m in profile_a], alliance_bonus=1.05, attacks=1))
    report("Профиль B: альянс 20 членов, явка 85%, бонус 1.10, 1 атака/член",
           simulate(members_cfg=[m.__dict__ for m in profile_b], alliance_bonus=1.10, attacks=1))
    report("Профиль C: альянс 30 членов, явка 95%, бонус 1.15, 1 атака/член",
           simulate(members_cfg=[m.__dict__ for m in profile_c], alliance_bonus=1.15, attacks=1))

    # What if members use all 3 attacks/day?
    print()
    report("Профиль B, 3 атаки/член",
           simulate(members_cfg=[m.__dict__ for m in profile_b], alliance_bonus=1.10, attacks=3))
    report("Профиль B, 3 атаки/член, явка 50% (плохой день)",
           simulate(members_cfg=[{**m.__dict__, "activity": 0.5} for m in profile_b], alliance_bonus=1.10, attacks=3))
