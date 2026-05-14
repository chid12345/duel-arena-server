/* ============================================================
   SetBonusPage — рендер страницы «Комплект» во вкладке Герой.
   Показывает 4 карточки (серебро/золото/алмаз/донат) с прогрессом
   3/4/5/6, бонусами на каждом пороге и перком за 6/6.
   Активный сет (тот что даёт бонусы прямо сейчас) подсвечен.
   Источник истины — State.equipment. Зеркалит config/set_bonuses.py.
   Экспорт: window.SetBonusPage.html(player)
   ============================================================ */
(() => {
const CATS = ['weapon','shield','armor','belt','boots','ring1'];
const ORDER = ['common','rare','epic','mythic'];
const TIERS = ['common','rare','epic','mythic'];
const NAME = { common:'Новобранец', rare:'Герой', epic:'Чемпион', mythic:'Бог войны' };
const EMO  = { common:'🥈', rare:'🥇', epic:'💎', mythic:'⭐' };
const COLOR= { common:'#a0aec0', rare:'#fbbf24', epic:'#c084fc', mythic:'#ff6b2b' };
const BONUSES = {
  common: {3:{hp:1,def:1},                            4:{hp:2,def:2,atk:1},        5:{hp:3,def:3,atk:2,acc:1},   6:{hp:4,def:3,atk:2,acc:2}},
  rare:   {3:{hp:3,def:2,atk:2},                       4:{hp:4,def:3,atk:3,acc:1},  5:{hp:5,def:4,atk:4,acc:2},   6:{hp:6,def:5,atk:5,acc:3}},
  epic:   {3:{hp:5,def:4,atk:4,acc:1},                 4:{hp:7,def:5,atk:5,acc:2},  5:{hp:8,def:6,atk:6,acc:3},   6:{hp:10,def:7,atk:7,acc:4}},
  mythic: {3:{hp:7,def:5,atk:5,acc:2},                 4:{hp:9,def:6,atk:7,acc:3},  5:{hp:11,def:8,atk:9,acc:4},  6:{hp:13,def:10,atk:11,acc:5}},
};
const PERKS = {
  common: { name:'Второе дыхание',   desc:'Раз в бой: при HP < 30% мгновенно +100 HP' },
  rare:   { name:'Решающий удар',     desc:'Первый удар в бою +50% урона' },
  epic:   { name:'Хладнокровие',      desc:'Каждый раунд +1% к урону (до +10% за бой)' },
  mythic: { name:'Гнев богов',        desc:'Каждый 5-й удар автоматически наносит x2 урона' },
};

function _countRarities(eq){
  const c = {};
  CATS.forEach(s => {
    const r = eq?.[s]?.rarity;
    if (r) c[r] = (c[r] || 0) + 1;
  });
  return c;
}

function _resolveActive(counts){
  const keys = Object.keys(counts);
  if (!keys.length) return null;
  let maxC = 0;
  keys.forEach(r => { if (counts[r] > maxC) maxC = counts[r]; });
  if (maxC < 3) return null;
  const winners = keys.filter(r => counts[r] === maxC);
  winners.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  return winners[winners.length - 1];  // старшая редкость при равенстве
}

function _bonusLine(b){
  const parts = [];
  if (b.hp)  parts.push(`+${b.hp}% HP`);
  if (b.def) parts.push(`Защита +${b.def}%`);
  if (b.atk) parts.push(`+${b.atk}% урон`);
  if (b.acc) parts.push(`+${b.acc}% точность`);
  return parts.join(' · ');
}

function _renderTierCard(tier, count, isActive){
  const c = COLOR[tier];
  const activeBadge = isActive ? `<span class="sb-badge" style="color:${c};border-color:${c}">АКТИВЕН</span>` : '';
  const moreNeeded = count < 3 ? `<div class="sb-need">Соберите ещё ${3 - count} для бонуса</div>` : '';
  const rows = [3, 4, 5, 6].map(t => {
    const on = count >= t;
    const b = BONUSES[tier][t];
    return `<div class="sb-row ${on?'on':'off'}">
      <span class="sb-mark">${on ? '✓' : '○'}</span>
      <span class="sb-th">${t}/6</span>
      <span class="sb-bn">${_bonusLine(b)}</span>
    </div>`;
  }).join('');
  const perk = PERKS[tier];
  const perkOn = count >= 6;
  const perkRow = `<div class="sb-perk ${perkOn?'on':'off'}">
    <div class="sb-perk-h">★ ${perk.name}</div>
    <div class="sb-perk-d">${perk.desc}</div>
  </div>`;
  return `<div class="st-bon sb-card ${isActive?'sb-active':''}" style="--sb-c:${c}">
    <div class="t sb-head">
      <span class="sb-emo">${EMO[tier]}</span>
      <span class="sb-name" style="color:${c}">${NAME[tier]}</span>
      <span class="sb-count" style="color:${c}">${count}/6</span>
      ${activeBadge}
    </div>
    ${moreNeeded}
    <div class="sb-rows">${rows}</div>
    ${perkRow}
  </div>`;
}

function pageHTML(p){
  const eq = (window.State && State.equipment) || {};
  const counts = _countRarities(eq);
  const totalEquipped = CATS.filter(s => eq[s]?.rarity).length;
  const active = _resolveActive(counts);

  if (totalEquipped === 0) {
    return `<div class="st-bon sb-empty">
      <div class="t">📦 Снаряга не надета</div>
      <div class="em">Загляни в Профиль → надень любые предметы → возвращайся сюда смотреть прогресс комплектов</div>
    </div>`;
  }

  const intro = `<div class="st-bon sb-intro">
    <div class="t">🎁 Комплекты</div>
    <div class="sb-int-d">Носи 3+ предмета одной редкости — получишь бонус. Работает тот сет, где предметов больше всего (при равенстве — старшая редкость). 6/6 открывает уникальный перк.</div>
  </div>`;

  const cards = TIERS.map(t => _renderTierCard(t, counts[t] || 0, t === active)).join('');
  return intro + cards;
}

window.SetBonusPage = { html: pageHTML, resolveActive: (eq) => _resolveActive(_countRarities(eq)) };
})();
