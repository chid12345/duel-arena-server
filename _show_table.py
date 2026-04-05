import json
p = json.load(open(r'progression_100_levels_v4/progression.json', encoding='utf-8'))
xp = p['xp_to_next']
win = p['xp_per_win']
steps = p['steps_per_level']
stats = p['stats_on_reach']
hp = p['hp_on_reach']
gold = p['gold_on_reach']

print(f"{'Ур':>4} {'need XP':>8} {'win XP':>7} {'апов':>5}  {'AP пороги (% полоски)':<32} {'стат':>5} {'HP':>4} {'зол':>5}")
print('-' * 80)
for i in range(99):
    lv = i + 1
    need = xp[i]
    w = win[i]
    s = steps[i]
    thrs = []
    for k in range(1, s + 1):
        thr = (need * k) // (s + 1)
        thrs.append(f"{100 * thr // need}%")
    ap_str = ' '.join(thrs)
    st = stats[lv] if lv < len(stats) else 0
    h = hp[lv] if lv < len(hp) else 0
    g = gold[lv] if lv < len(gold) else 0
    print(f"{lv:>4} {need:>8} {w:>7} {s:>5}  {ap_str:<32} {st:>5} {h:>4} {g:>5}")
print(f"{100:>4} {'max':>8} {win[99]:>7} {'-':>5}  {'-':<32} {stats[100]:>5} {hp[100]:>4} {gold[100]:>5}")
