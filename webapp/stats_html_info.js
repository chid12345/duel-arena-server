/* ============================================================
   Stats HTML Info — информационный попап по статам
   Вызывается кликом по строке стата (Сила/Ловкость/Интуиция/Выносливость)
   Объясняет игроку, что делает стат и на что он влияет.
   Использует .hi-* стили из stats_html_items.js (неон-модал).
   ============================================================ */
(() => {
const CSS = `
.hi-mdl.st1{border-color:#ff3ba8;box-shadow:0 0 36px rgba(255,59,168,.35),0 24px 60px rgba(0,0,0,.7)}
.hi-mdl.st2{border-color:#00f0ff;box-shadow:0 0 36px rgba(0,240,255,.35),0 24px 60px rgba(0,0,0,.7)}
.hi-mdl.st3{border-color:#a06bff;box-shadow:0 0 36px rgba(160,107,255,.35),0 24px 60px rgba(0,0,0,.7)}
.hi-mdl.st4{border-color:#9cffa8;box-shadow:0 0 36px rgba(156,255,168,.35),0 24px 60px rgba(0,0,0,.7)}
.hi-mdl.st1 .hi-ic,.hi-mdl.st1 .hi-t{color:#ff3ba8}
.hi-mdl.st2 .hi-ic,.hi-mdl.st2 .hi-t{color:#00f0ff}
.hi-mdl.st3 .hi-ic,.hi-mdl.st3 .hi-t{color:#a06bff}
.hi-mdl.st4 .hi-ic,.hi-mdl.st4 .hi-t{color:#9cffa8}
.hi-b.st1{color:#ff3ba8} .hi-b.st2{color:#00f0ff} .hi-b.st3{color:#a06bff} .hi-b.st4{color:#9cffa8}
.hi-eff{margin:4px 4px 10px;padding:10px 12px;border-radius:11px;background:rgba(10,5,25,.85);border:1px solid rgba(0,240,255,.25)}
.hi-eff .er{display:flex;gap:8px;padding:5px 0;font-size:11px;line-height:1.35;align-items:flex-start}
.hi-eff .er:not(:last-child){border-bottom:1px solid rgba(0,240,255,.08)}
.hi-eff .ei{flex-shrink:0;width:18px;text-align:center;filter:drop-shadow(0 0 4px currentColor)}
.hi-eff .et{flex:1;color:#c8daff}
.hi-eff .et b{color:#fff;text-shadow:0 0 4px currentColor}
.hi-cls{margin:0 4px 10px;padding:8px 12px;border-radius:10px;background:rgba(168,85,247,.08);border:1px solid rgba(168,85,247,.3);font-size:10.5px;color:#c9b3ff;line-height:1.4;text-align:center}
.hi-cur{margin:6px 4px 8px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
.hi-cur .cc{text-align:center;padding:7px 4px;border-radius:9px;background:rgba(15,8,30,.9);border:1px solid rgba(0,240,255,.25)}
.hi-cur .cc .l{font-size:8.5px;color:#80c8ff;text-transform:uppercase;letter-spacing:.4px;opacity:.85}
.hi-cur .cc .v{font-size:15px;font-weight:800;color:#fff;text-shadow:0 0 5px currentColor;margin-top:1px}
`;
const _esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function _injectCSS(){if(document.getElementById('hi-stinfo'))return;const s=document.createElement('style');s.id='hi-stinfo';s.textContent=CSS;document.head.appendChild(s);}

const STAT_INFO = {
  strength: {
    cls:'st1', icon:'⚔', name:'Сила',
    sub:'Главный источник урона в ближнем бою',
    effects:[
      ['💥','<b>Урон атаки</b> — чем больше Силы, тем сильнее удар (с убывающей отдачей)'],
      ['🔨','<b>Пролом брони</b> — при высокой Силе шанс игнорировать часть брони врага'],
      ['🏰','<b>Абсолютная стойка</b> — Сила + Выносливость дают шанс принять всего 1 урона'],
    ],
    cls_hint:'⚔ <b>Берсерк</b>: +12% урон, но −8% уворот',
    curFn: p => [['Сила', p.strength|0], ['Урон', p.dmg|0], ['HP', p.max_hp_effective|0]],
  },
  agility: {
    cls:'st2', icon:'💨', name:'Ловкость',
    sub:'Уклонение и скорость атаки',
    effects:[
      ['🌀','<b>Шанс уворота</b> — сравнивается с Ловкостью атакующего, плюс каждые N очков +% уворота'],
      ['⚡','<b>Двойной удар</b> — шанс нанести второй удар за ход (усиливается от вложений)'],
      ['🥾','<b>Контратака</b> — при уклоне есть шанс сразу ударить в ответ'],
    ],
    cls_hint:'💨 <b>Теневой Вихрь</b>: +8% уворот, но −10% броня',
    curFn: p => [['Ловкость', p.agility|0], ['Уворот', (p.dodge_pct|0)+'%'], ['Урон', p.dmg|0]],
  },
  intuition: {
    cls:'st3', icon:'✦', name:'Интуиция',
    sub:'Критические удары и пробой защиты',
    effects:[
      ['🎯','<b>Шанс крита</b> — сравнивается с Интуицией врага + бонус от вложений'],
      ['💢','<b>Множитель крита</b> — по умолчанию ×1.5 (у Хаос-Рыцаря ×1.65)'],
      ['🔪','<b>Крит-пробой блока</b> — при блоке критом урон всё равно проходит (×0.5)'],
    ],
    cls_hint:'💥 <b>Хаос-Рыцарь</b>: +5% крит, ×1.65 множитель, но −10% HP',
    curFn: p => [['Интуиция', p.intuition|0], ['Крит %', (p.crit_pct|0)+'%'], ['Мн. крита', '×1.5']],
  },
  stamina: {
    cls:'st4', icon:'🛡', name:'Выносливость',
    sub:'Здоровье и защитные механики',
    effects:[
      ['❤️','<b>Максимум HP</b> — каждое очко добавляет к запасу здоровья'],
      ['🛡','<b>Поглощение</b> — шанс принять удар вдвое слабее (Guard)'],
      ['🏰','<b>Абсолютная стойка</b> — вместе с Силой даёт шанс принять всего 1 урона'],
    ],
    cls_hint:'⚔ <b>Берсерк</b>: бонус к урону компенсирует потерю уворота',
    curFn: p => [['Выносливость', p.stamina|0], ['HP', p.max_hp_effective|0], ['Броня', (p.armor_pct|0)+'%']],
  },
};

function _close(){ document.getElementById('hi-bg')?.remove(); }

function showStatInfo(key, player){
  const info = STAT_INFO[key]; if (!info) return;
  _injectCSS();
  _close();
  const effHtml = info.effects.map(([ic,txt]) => `<div class="er"><div class="ei">${_esc(ic)}</div><div class="et">${txt}</div></div>`).join('');
  const cur = info.curFn(player||{});
  const curHtml = cur.map(([l,v]) => `<div class="cc"><div class="l">${_esc(l)}</div><div class="v">${_esc(v)}</div></div>`).join('');
  const html = `
    <div class="hi-mdl ${info.cls}" role="dialog">
      <div class="hi-x" data-hi="close">✕</div>
      <div class="hi-ic">${_esc(info.icon)}</div>
      <div class="hi-t">${_esc(info.name)}</div>
      <div class="hi-d">${_esc(info.sub)}</div>
      <div class="hi-cur">${curHtml}</div>
      <div class="hi-eff">${effHtml}</div>
      <div class="hi-cls">${info.cls_hint}</div>
      <div class="hi-btns one"><div class="hi-b ${info.cls}" data-hi="close">Понятно</div></div>
    </div>`;
  const bg = document.createElement('div');
  bg.id = 'hi-bg'; bg.className = 'hi-bg';
  bg.innerHTML = html;
  document.body.appendChild(bg);
  bg.addEventListener('click', e => {
    if (e.target === bg){ _close(); return; }
    const el = e.target.closest('[data-hi]'); if (!el) return;
    try{ window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); }catch(_){}
    _close();
  });
}

window.StatsHTMLInfo = { showStatInfo, close: _close };
})();
