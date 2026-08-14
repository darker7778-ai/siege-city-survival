"""Render project-styled diagrams: core loop and economy flow for the SCS Mini App design doc.

Palette strictly from style-card.md v1.1.0 (This War of Mine lock):
night sky #0C1016, steel #3A414C, ash #6E7580, silver #9BA4B0, paper white #D8DDE5,
amber #8C6A3F / UI highlight #C4A265, rust #7A4A2B, olive #4A5043, panels #1A1E26.
Output: PNG diagrams that look like worn paper/metal, NOT default matplotlib look.
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.font_manager as fm
import numpy as np

BG = "#0C1016"
PANEL = "#1A1E26"
STEEL = "#3A414C"
ASH = "#6E7580"
SILVER = "#9BA4B0"
PAPER = "#D8DDE5"
AMBER = "#C4A265"
RUST = "#7A4A2B"
OLIVE = "#4A5043"

# Register a typewriter-ish font if available, else fallback
font_candidates = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]
normal_font = font_candidates[0]
bold_font = font_candidates[1]
props_normal = fm.FontProperties(fname=normal_font)
props_bold = fm.FontProperties(fname=bold_font)


def styled_ax(title, w, h):
    fig, ax = plt.subplots(figsize=(w, h), dpi=160)
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis("off")
    ax.text(5, 9.55, title, ha="center", va="top", fontproperties=props_bold,
            fontsize=20, color=AMBER, alpha=0.95)
    return fig, ax


def node(ax, x, y, w, h, label, sub, color, textcolor=PAPER):
    box = FancyBboxPatch((x - w / 2, y - h / 2), w, h,
                         boxstyle="round,pad=0.02,rounding_size=0.08",
                         facecolor=color, edgecolor=ASH, linewidth=1.4,
                         alpha=0.96)
    ax.add_patch(box)
    ax.text(x, y + 0.08, label, ha="center", va="center",
            fontproperties=props_bold, fontsize=12.5, color=textcolor)
    if sub:
        ax.text(x, y - 0.52, sub, ha="center", va="center",
                fontproperties=props_normal, fontsize=8.5, color=SILVER, alpha=0.85)


def arrow(ax, x1, y1, x2, y2, color=RUST, lw=2.2, label=None, style="->"):
    a = FancyArrowPatch((x1, y1), (x2, y2), arrowstyle=style,
                        mutation_scale=26, linewidth=lw, color=color,
                        shrinkA=6, shrinkB=10, alpha=0.95, zorder=5)
    ax.add_patch(a)
    if label:
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        ax.text(mx, my + 0.18, label, ha="center", va="bottom",
                fontproperties=props_normal, fontsize=8.5, color=AMBER)


# ---------------- Core loop diagram ----------------
fig, ax = styled_ax("CORE LOOP — СУТОЧНЫЙ ЦИКЛ СЕССИИ", 14, 8.6)

# Cycle: open TMA -> collect -> build/train -> siege -> rewards -> return timers
node(ax, 2.2, 6.6, 3.0, 1.9, "ОТКРЫТЬ МИНИ-ЭПП", "вход через бот / меню-кнопка", PANEL)
node(ax, 5.0, 3.2, 3.0, 1.9, "СОБРАТЬ РЕСУРСЫ", "коллекторы заполнены за N часов", PANEL)
node(ax, 7.8, 6.6, 3.0, 1.9, "СТРОИТЬ / ТРЕНИРОВАТЬ", "очередь 1/2, таймер, звёзды", PANEL)
node(ax, 5.0, 0.75, 3.0, 1.5, "ОСАДА / НАБЕГ", "выбор юнитов, MainButton «Начать набег»", "#241A14")

arrow(ax, 3.7, 6.6, 5.0, 4.2, label="собрать с коллекторов")
arrow(ax, 6.5, 3.2, 7.8, 6.6, label="потратить ресурсы")
arrow(ax, 6.3, 6.6, 5.0, 3.2)
arrow(ax, 5.0, 1.6, 3.6, 3.0, label="награда + опыт")
arrow(ax, 3.7, 3.2, 2.2, 6.6, label="выход: запуск таймеров")


ax.text(5, 9.0, "Каждая сессия 2–5 минут, гарантированная награда за каждый возврат",
        ha="center", va="top", fontproperties=props_normal, fontsize=10.5,
        color=SILVER, style="italic")
fig.tight_layout(pad=0.4)
fig.savefig("/home/ubuntu/siege-city-survival/design/assets/core-loop-diagram.png",
            facecolor=BG, bbox_inches="tight")
plt.close(fig)

# ---------------- Economy flow diagram ----------------
fig, ax = styled_ax("ЭКОНОМИКА: ПОТОКИ РЕСУРСОВ (SOURCE → SINK)", 14, 9.2)

src_y, sink_y = 7.4, 2.6
node(ax, 1.6, src_y, 2.4, 1.6, "ДЕРЕВО / КАМЕНЬ", "коллекторы 1 ч (кеп)", PANEL)
node(ax, 4.4, src_y, 2.4, 1.6, "ЕДА", "ферма 1 ч, осада +паёк", PANEL)
node(ax, 7.2, src_y, 2.4, 1.6, "МЕТАЛЛ / ШЕСТЕРНИ", "разведка, разбор 2 ч", PANEL)
node(ax, 9.4, src_y, 1.6, 1.3, "★ ЗВЁЗДЫ", "Stars / квесты", "#241A14", AMBER)

node(ax, 1.9, sink_y, 2.6, 1.6, "СТРОИТЕЛЬСТВО", "здания и очереди", PANEL)
node(ax, 5.0, sink_y, 2.6, 1.6, "НАБОР ЮНИТОВ", "ополчение, ремонт", PANEL)
node(ax, 8.1, sink_y, 2.6, 1.6, "ОСАДЫ / РЕМОНТ", "расход/потери войск", "#241A14")

# sources -> sinks
for sx in (2.8, 5.6, 8.4):
    arrow(ax, sx, src_y - 0.85, min(max(sx, 2.2), 9.4), sink_y + 0.85)
arrow(ax, 9.4, src_y - 0.65, 9.4, sink_y + 0.65, label="ускорения и пропуск")


# stars as accelerators back into sinks
arrow(ax, 9.2, src_y - 0.8, 6.2, sink_y + 0.85, color=AMBER, lw=2.4,
      label="speed-up за ★")

ax.text(5, 9.0, "Монеты (217★) — твёрдая валюта: магазин, рынок, ежедневная серия",
        ha="center", va="top", fontproperties=props_normal, fontsize=10.5,
        color=SILVER, style="italic")
fig.tight_layout(pad=0.4)
fig.savefig("/home/ubuntu/siege-city-survival/design/assets/economy-flow-diagram.png",
            facecolor=BG, bbox_inches="tight")
plt.close(fig)

print("Diagrams rendered OK")
