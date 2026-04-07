"""One-off: build xp_to_next (sum=S) and xp_per_win for ~6 months / 11 wins/day. Run: python _gen_progression_curve.py"""
import json

n = 99
# ~2000 побед при avg(xp_per_win)~93.5 и среднем множителе dmg×level ~0.72 → 93.5*0.72*2000≈134640
S_target = 136_000
p = 1.45
a, b = 180, 2400
raw = [a + (b - a) * (i / (n - 1)) ** p for i in range(n)]
scale = S_target / sum(raw)
needs = [max(1, int(round(x * scale))) for x in raw]
diff = S_target - sum(needs)
idx = 0
while diff != 0:
    i = idx % n
    if diff > 0:
        needs[i] += 1
        diff -= 1
    else:
        if needs[i] > 1:
            needs[i] -= 1
            diff += 1
    idx += 1

# xp_per_win: 85..102 по уровню (чуть поднимаем на высоких)
xp_per_win = [max(50, round(85 + 17 * (i / 99))) for i in range(100)]

print("sum xp_to_next", sum(needs), "min", min(needs), "max", max(needs))
avg_xp = sum(xp_per_win) / len(xp_per_win)
print("avg xp_per_win", avg_xp)
print("crude wins sum/(avg*0.72)", sum(needs) / (avg_xp * 0.72))

# пример: ур.50 need и апы
lv = 50
need = needs[lv - 1]
steps = 6  # из текущего JSON около этого для 50
print(f"\nПример ур.{lv}: need={need}, steps={steps}")
for k in range(1, steps + 1):
    thr = (need * k) // (steps + 1)
    print(f"  AP{k}: thr={thr} XP ({100*thr/need:.1f}% полоски)")

out = {"xp_to_next": needs, "xp_per_win": xp_per_win}
with open("_gen_progression_out.json", "w", encoding="utf-8") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
print("\nwritten _gen_progression_out.json")
