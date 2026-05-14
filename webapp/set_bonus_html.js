/* ============================================================
   SetBonusHTML — HTML overlay для активного «Комплекта» (set bonus) в Профиле.
   Источник истины — State.equipment (приходит с /api/player).
   Логика подсчёта зеркалит config/set_bonuses.py: больше предметов → побеждает,
   при равенстве → старшая редкость. Полная сборка 6/6 даёт перк.
   ============================================================ */
(() => {
const CATS = ['weapon','shield','armor','belt','boots','ring1'];
const ORDER = ['common','rare','epic','mythic'];
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

let _cssOn = false;
function _injectCSS() {
  if (_cssOn) return; _cssOn = true;
  const s = document.createElement('style'); s.id = 'sbn-css';
  s.textContent = `
#sbn-overlay{position:fixed;left:0;right:0;pointer-events:none;z-index:51}
.sbn-card{position:fixed;left:50%;transform:translateX(-50%);
  background:linear-gradient(180deg,rgba(28,26,46,.92),rgba(18,18,28,.96));
  border:1px solid var(--sbn-c,#607090);border-radius:10px;
  padding:7px 11px;pointer-events:auto;cursor:pointer;
  box-shadow:0 0 12px var(--sbn-c,#607090),0 0 2px rgba(0,0,0,.5);
  font-family:'Share Tech Mono',monospace;color:#fff;
  -webkit-tap-highlight-color:transparent;user-select:none;touch-action:manipulation;
  min-width:200px;max-width:88vw}
.sbn-head{display:flex;align-items:center;gap:6px;font-size:11px}
.sbn-title{flex:1;letter-spacing:.5px;text-shadow:0 0 4px var(--sbn-c,#607090)}
.sbn-count{font-weight:700;color:var(--sbn-c,#fff)}
.sbn-arrow{font-size:9px;opacity:.7}
.sbn-body{margin-top:5px;padding-top:5px;border-top:1px dashed rgba(255,255,255,.15);
  font-size:10px;line-height:1.45;color:#cfd2e0;display:none}
.sbn-card.open .sbn-body{display:block}
.sbn-card.open .sbn-arrow{transform:rotate(180deg)}
.sbn-perk{margin-top:5px;padding:4px 6px;border-radius:5px;
  background:rgba(255,200,60,.12);border:1px solid rgba(255,200,60,.35);color:#ffe1a0}
.sbn-perk b{color:#ffd07c}
.sbn-row{display:flex;justify-content:space-between;gap:8px}
.sbn-empty{font-size:10px;color:#9aa0b8}
`;
  document.head.appendChild(s);
}

function _countRarities(eq) {
  const counts = {};
  CATS.forEach(c => {
    const it = eq?.[c];
    if (!it?.rarity) return;
    counts[it.rarity] = (counts[it.rarity] || 0) + 1;
  });
  return counts;
}

function _resolveActive(eq) {
  const counts = _countRarities(eq);
  const keys = Object.keys(counts);
  if (!keys.length) return null;
  let maxC = 0;
  keys.forEach(r => { if (counts[r] > maxC) maxC = counts[r]; });
  if (maxC < 3) return { winner: null, count: maxC };  // не достигнут порог 3
  // равенство → старшая редкость
  const winners = keys.filter(r => counts[r] === maxC);
  winners.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  const winner = winners[winners.length - 1];  // последняя в списке = старшая
  return { winner, count: maxC, threshold: Math.min(6, maxC) };
}

function _bonusLines(b) {
  const out = [];
  if (b.hp)  out.push(`+${b.hp}% HP`);
  if (b.def) out.push(`Защита +${b.def}%`);
  if (b.atk) out.push(`+${b.atk}% урон`);
  if (b.acc) out.push(`+${b.acc}% точность`);
  return out;
}

function _close() {
  const el = document.getElementById('sbn-overlay');
  if (el) { if (el._offResize) el._offResize(); el.remove(); }
}

function _position(cvs) {
  const r = cvs.getBoundingClientRect();
  // Размещаем под слотами экипировки. Слоты живут в зоне czY+czH ≈ 466 в canvas-координатах.
  // Берём низ canvas минус отступ ≈ 95px (над таб-баром).
  const top = r.top + r.height * 0.66;
  return { left: r.left + r.width / 2, top };
}

function show(scene) {
  _injectCSS();
  _close();
  const cvs = document.querySelector('canvas');
  if (!cvs) return;

  const wrap = document.createElement('div');
  wrap.id = 'sbn-overlay';

  const eq = (window.State && State.equipment) || {};
  const r = _resolveActive(eq);
  if (!r) return;  // совсем пустой профиль — не показываем

  const card = document.createElement('div');
  card.className = 'sbn-card';
  const pos = _position(cvs);
  card.style.left = pos.left + 'px';
  card.style.top  = pos.top + 'px';

  if (!r.winner) {
    // Меньше 3 одной редкости — подсказка «соберите 3+»
    card.style.setProperty('--sbn-c', '#607090');
    card.innerHTML = `<div class="sbn-head"><span class="sbn-title">Комплект не собран</span></div>
      <div class="sbn-empty">Наденьте 3+ предмета одной редкости — получите бонус</div>`;
    wrap.appendChild(card);
    document.body.appendChild(wrap);
    scene.events.once('shutdown', _close);
    scene.events.once('destroy',  _close);
    return;
  }

  const color = COLOR[r.winner] || '#607090';
  card.style.setProperty('--sbn-c', color);

  const b = BONUSES[r.winner][r.threshold];
  const lines = _bonusLines(b);
  const perk = r.threshold >= 6 ? PERKS[r.winner] : null;

  let body = '<div class="sbn-body">';
  lines.forEach(l => { body += `<div>• ${l}</div>`; });
  if (perk) {
    body += `<div class="sbn-perk"><b>★ ${perk.name}</b><div>${perk.desc}</div></div>`;
  } else {
    body += `<div class="sbn-empty">Соберите 6/6 — откроется уникальный перк</div>`;
  }
  body += '</div>';

  card.innerHTML = `
    <div class="sbn-head">
      <span>${EMO[r.winner]}</span>
      <span class="sbn-title">${NAME[r.winner]}</span>
      <span class="sbn-count">${r.count}/6</span>
      <span class="sbn-arrow">▼</span>
    </div>${body}`;

  card.addEventListener('pointerup', e => {
    e.stopPropagation();
    card.classList.toggle('open');
  });
  card.addEventListener('pointerdown', e => e.stopPropagation());

  wrap.appendChild(card);
  document.body.appendChild(wrap);

  const _onResize = () => {
    const np = _position(cvs);
    card.style.left = np.left + 'px';
    card.style.top  = np.top + 'px';
  };
  window.addEventListener('resize', _onResize);
  wrap._offResize = () => window.removeEventListener('resize', _onResize);

  scene.events.once('shutdown', _close);
  scene.events.once('destroy',  _close);
}

function refresh(scene) { show(scene); }

window.SetBonusHTML = { show, close: _close, refresh };
})();
