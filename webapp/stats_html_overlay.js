/* ============================================================
   Stats HTML Overlay — вкладка «Герой» (Вариант C: SEGMENTED · Неон)
   4 под-вкладки: СТАТЫ · БОНУСЫ · РЮКЗАК · РЕЙТИНГ
   Нижний TabBar не трогает — обрезан bottom:76px как у clan-overlay
   ============================================================ */
(() => {
const CSS = `
.st-overlay{position:fixed;top:0;left:0;right:0;bottom:76px;z-index:9000;background:radial-gradient(ellipse at top,#1a0830 0%,#05020f 70%),#000;color:#e6f7ff;overflow-y:auto;overflow-x:hidden;font-family:-apple-system,"Segoe UI",Roboto,sans-serif;display:flex;justify-content:center}
.st-overlay::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,255,220,.025) 3px 4px);pointer-events:none;z-index:1}
.st-panel{width:100%;max-width:430px;position:relative;z-index:2;padding:0 0 20px}
.st-hdr{margin:10px;padding:10px 12px;border-radius:14px;background:linear-gradient(135deg,rgba(255,59,168,.1),rgba(0,240,255,.08));border:1px solid #00f0ff;box-shadow:0 0 14px rgba(0,240,255,.3),inset 0 0 10px rgba(0,240,255,.06);display:flex;align-items:center;gap:10px;position:relative}
.st-hdr::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#ff3ba8,transparent)}
.st-back{font-size:22px;color:#80d8ff;cursor:pointer;padding:2px 8px 2px 0;opacity:.75;user-select:none}
.st-av{width:46px;height:46px;display:grid;place-items:center;font-size:26px;flex-shrink:0;filter:drop-shadow(0 0 12px #ff3ba8) drop-shadow(0 0 5px #ff3ba8);cursor:pointer}
.st-bd{flex:1;min-width:0}
.st-n{font-size:13px;font-weight:800;color:#fff;text-shadow:0 0 5px #00f0ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st-sb{font-size:10px;color:#00f0ff;margin-top:2px;text-shadow:0 0 4px currentColor;letter-spacing:.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st-pts{padding:6px 10px;border-radius:8px;font-size:10px;font-weight:800;background:rgba(255,59,168,.12);color:#ff3ba8;border:1px solid #ff3ba8;text-shadow:0 0 4px currentColor;box-shadow:0 0 8px rgba(255,59,168,.4);white-space:nowrap;animation:stPulse 1.4s ease-in-out infinite;cursor:default}
.st-pts.zero{animation:none;background:rgba(156,220,254,.08);color:#9cffa8;border-color:#9cffa8;box-shadow:0 0 6px rgba(156,255,168,.3)}
@keyframes stPulse{0%,100%{box-shadow:0 0 6px rgba(255,59,168,.35)}50%{box-shadow:0 0 14px rgba(255,59,168,.7)}}
.st-seg{margin:0 10px 10px;padding:3px;background:rgba(10,5,25,.92);border:1px solid rgba(0,240,255,.4);border-radius:12px;box-shadow:0 0 10px rgba(0,240,255,.15);display:grid;grid-template-columns:repeat(4,1fr);gap:3px}
.st-seg .s{padding:8px 2px;text-align:center;font-size:10px;font-weight:800;color:#80c8ff;border-radius:9px;cursor:pointer;letter-spacing:.4px;user-select:none;transition:all .15s}
.st-seg .s.on{background:linear-gradient(135deg,#ff3ba8,#a01e6e);color:#fff;box-shadow:0 0 12px rgba(255,59,168,.6),inset 0 0 6px rgba(255,255,255,.15);text-shadow:0 0 4px rgba(0,0,0,.4)}
.st-seg .s .em{display:block;font-size:14px;margin-bottom:2px;filter:drop-shadow(0 0 4px currentColor)}
.st-page{display:none}
.st-page.on{display:block}
.st-srow{margin:0 10px 8px;padding:10px 12px;border-radius:12px;background:linear-gradient(90deg,rgba(15,5,30,.88),rgba(5,5,15,.88));border:1px solid rgba(0,240,255,.35);display:grid;grid-template-columns:28px 1fr auto 36px;gap:10px;align-items:center}
.st-srow .ic{font-size:20px;filter:drop-shadow(0 0 6px currentColor);text-align:center}
.st-srow.s1{border-color:#ff3ba8;box-shadow:0 0 10px rgba(255,59,168,.2)} .st-srow.s1 .ic{color:#ff3ba8}
.st-srow.s2{border-color:#00f0ff;box-shadow:0 0 10px rgba(0,240,255,.2)} .st-srow.s2 .ic{color:#00f0ff}
.st-srow.s3{border-color:#a06bff;box-shadow:0 0 10px rgba(160,107,255,.2)} .st-srow.s3 .ic{color:#a06bff}
.st-srow.s4{border-color:#9cffa8;box-shadow:0 0 10px rgba(156,255,168,.2)} .st-srow.s4 .ic{color:#9cffa8}
.st-srow .mid .n{font-size:12px;font-weight:800;color:#fff;text-shadow:0 0 4px currentColor;letter-spacing:.3px}
.st-srow .mid .sv{font-size:9.5px;color:#80c8ff;margin-top:2px;opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st-srow .val{font-size:18px;font-weight:800;color:#fff;text-shadow:0 0 6px currentColor;min-width:28px;text-align:right}
.st-srow.s1 .val{color:#ff3ba8} .st-srow.s2 .val{color:#00f0ff} .st-srow.s3 .val{color:#a06bff} .st-srow.s4 .val{color:#9cffa8}
.st-srow .ad{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#ff3ba8,#a01e6e);color:#fff;font-size:17px;font-weight:800;display:grid;place-items:center;cursor:pointer;box-shadow:0 0 10px rgba(255,59,168,.5);user-select:none;transition:transform .1s}
.st-srow .ad:active{transform:scale(.92)}
.st-srow .ad.off{background:rgba(30,20,50,.7);box-shadow:none;color:#5a4e78;cursor:default}
.st-dash{margin:0 10px 10px;padding:10px 8px;border-radius:12px;background:linear-gradient(135deg,rgba(255,59,168,.06),rgba(0,240,255,.06));border:1px solid rgba(0,240,255,.3);box-shadow:0 0 8px rgba(0,240,255,.1);display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
.st-dash .cc{text-align:center;padding:2px 0}
.st-dash .cc .v{font-size:14px;font-weight:800;text-shadow:0 0 6px currentColor}
.st-dash .cc .l{font-size:8px;color:#80c8ff;margin-top:2px;text-transform:uppercase;letter-spacing:.4px}
.st-wrd{margin:0 10px 10px;padding:10px;border-radius:12px;background:linear-gradient(90deg,rgba(0,240,255,.08),rgba(156,255,168,.04));border:1px dashed rgba(0,240,255,.4);display:flex;align-items:center;justify-content:center;gap:8px;font-size:12px;font-weight:800;color:#9cffa8;cursor:pointer;user-select:none;text-shadow:0 0 4px currentColor}
.st-wrd:active{opacity:.7}
.st-bon{margin:0 10px 8px;padding:10px 12px;border-radius:12px;background:linear-gradient(90deg,rgba(15,5,30,.88),rgba(5,5,15,.88));border:1px solid rgba(0,240,255,.4);box-shadow:0 0 10px rgba(0,240,255,.15)}
.st-bon .t{font-size:11px;font-weight:800;color:#00f0ff;margin-bottom:8px;letter-spacing:.5px;text-transform:uppercase;text-shadow:0 0 6px currentColor;padding-bottom:6px;border-bottom:1px solid rgba(0,240,255,.2)}
.st-bon .r{display:flex;justify-content:space-between;padding:5px 0;font-size:11px;border-bottom:1px solid rgba(0,240,255,.08);gap:10px}
.st-bon .r:last-child{border:none}
.st-bon .r .k{color:#80c8ff;flex:1;min-width:0}
.st-bon .r .v{font-weight:800;color:#9cffa8;text-shadow:0 0 5px currentColor;white-space:nowrap}
.st-bon .r .v.neg{color:#f87171}
.st-bon .em{padding:14px 8px;text-align:center;color:#5a4e78;font-size:11px}
.st-invbtn{margin:0 10px;padding:14px;border-radius:12px;background:linear-gradient(135deg,rgba(255,59,168,.14),rgba(168,85,247,.08));border:1px solid #ff3ba8;box-shadow:0 0 12px rgba(255,59,168,.35);display:flex;align-items:center;justify-content:center;gap:10px;font-size:13px;font-weight:800;color:#fff;cursor:pointer;text-shadow:0 0 6px #ff3ba8;user-select:none}
.st-invbtn:active{opacity:.8}
.st-invtabs{margin:0 10px 8px;padding:3px;background:rgba(10,5,25,.92);border:1px solid rgba(0,240,255,.4);border-radius:10px;box-shadow:0 0 8px rgba(0,240,255,.15);display:grid;grid-template-columns:repeat(4,1fr);gap:3px}
.st-invtabs .it{padding:7px 2px;text-align:center;font-size:9.5px;font-weight:800;color:#80c8ff;border-radius:8px;cursor:pointer;user-select:none;letter-spacing:.3px}
.st-invtabs .it.on{background:linear-gradient(135deg,#00f0ff,#0088a8);color:#05020f;text-shadow:none;box-shadow:0 0 10px rgba(0,240,255,.5)}
.st-it{margin:0 10px 6px;padding:9px 10px;border-radius:11px;background:linear-gradient(90deg,rgba(15,5,30,.88),rgba(5,5,15,.88));border:1px solid rgba(0,240,255,.3);display:grid;grid-template-columns:34px 1fr auto;gap:8px;align-items:center;box-shadow:0 0 6px rgba(0,240,255,.08)}
.st-it-ic{font-size:22px;text-align:center;filter:drop-shadow(0 0 4px currentColor);color:#ffd166}
.st-it-bd{min-width:0}
.st-it-n{font-size:12px;font-weight:800;color:#fff;text-shadow:0 0 4px #00f0ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st-it-d{font-size:9.5px;color:#80c8ff;opacity:.85;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st-it-q{font-size:9px;color:#ffd166;margin-top:2px;font-weight:700}
.st-it-b{padding:7px 9px;border-radius:8px;background:linear-gradient(135deg,#ff3ba8,#a01e6e);color:#fff;font-size:10px;font-weight:800;cursor:pointer;user-select:none;box-shadow:0 0 8px rgba(255,59,168,.45);white-space:nowrap}
.st-it-b:active{transform:scale(.94)}
.st-it-b.boss{background:linear-gradient(135deg,#00aaff,#0055a8);box-shadow:0 0 8px rgba(0,170,255,.5)}
`;

const WT = {
  tank:  { name:'Берсерк',       icon:'⚔️' },
  agile: { name:'Теневой Вихрь', icon:'💨' },
  crit:  { name:'Хаос-Рыцарь',   icon:'💥' },
};
const CLASS_BONUS = {
  tank:  [{k:'Урон',v:'+12%',neg:false},{k:'Уворот',v:'−8%',neg:true}],
  agile: [{k:'Уворот',v:'+8%',neg:false},{k:'Броня',v:'−10%',neg:true}],
  crit:  [{k:'Шанс крита',v:'+5%'},{k:'Множитель крита',v:'×1.65'},{k:'Здоровье',v:'−10%',neg:true}],
};
const STAT_META = [
  { key:'strength',  cls:'s1', icon:'⚔', label:'Сила',         eff:p=>`~${p.dmg} урона` },
  { key:'agility',   cls:'s2', icon:'💨', label:'Ловкость',     eff:p=>`${p.dodge_pct}% уворот` },
  { key:'intuition', cls:'s3', icon:'✦', label:'Интуиция',     eff:p=>`${p.crit_pct}% крит` },
  { key:'stamina',   cls:'s4', icon:'🛡', label:'Выносливость', eff:p=>`${p.armor_pct}% броня` },
];
const BUFF_LBL = {
  strength:'⚔️ Сила', endurance:'🌀 Ловкость', stamina:'🛡 Выносливость',
  crit:'🎯 Интуиция', armor_pct:'🔰 Броня', dodge_pct:'💨 Уворот',
  hp_bonus:'❤️ HP', double_pct:'⚡ Двойной', accuracy:'👁 Точность',
  lifesteal_pct:'🩸 Вампир', gold_pct:'💰 Золото', xp_pct:'📚 Опыт',
};
const _esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const _base = (p,k) => Number(p?.stats_base?.[k] ?? p?.[k] ?? 0);
const _bonus = (p,k) => Number(p?.stats_bonus_total?.[k] ?? 0);
const _val = (p,k) => Number(p?.[k+'_effective'] ?? p?.[k] ?? 0);

function _injectCSS(){if(document.getElementById('st-style'))return;const s=document.createElement('style');s.id='st-style';s.textContent=CSS;document.head.appendChild(s);}

function _statsHTML(p){
  return STAT_META.map(s=>{
    const base=_base(p,s.key), bon=_bonus(p,s.key), v=_val(p,s.key), free=p.free_stats>0;
    return `<div class="st-srow ${s.cls}" data-stat="${s.key}">
      <div class="ic">${s.icon}</div>
      <div class="mid"><div class="n">${s.label}</div><div class="sv">база ${base} · бонус +${bon} · ${s.eff(p)}</div></div>
      <div class="val">${v}</div>
      <div class="ad${free?'':' off'}" data-act="train" data-stat="${s.key}">${free?'+':'—'}</div>
    </div>`;
  }).join('') + `<div class="st-dash">
    <div class="cc"><div class="v" style="color:#ffd166">${p.dmg|0}</div><div class="l">⚔ Урон</div></div>
    <div class="cc"><div class="v" style="color:#f87171">${p.max_hp_effective|0}</div><div class="l">❤ HP</div></div>
    <div class="cc"><div class="v" style="color:#9cffa8">${p.armor_pct|0}%</div><div class="l">🛡 Бр.</div></div>
    <div class="cc"><div class="v" style="color:#00f0ff">${p.dodge_pct|0}%</div><div class="l">💨 Ув.</div></div>
    <div class="cc"><div class="v" style="color:#a06bff">${p.crit_pct|0}%</div><div class="l">✦ Крит</div></div>
  </div>`;
}

function _bonusHTML(p, inv){
  const wt=WT[p.warrior_type]||WT.tank;
  const classRows=(CLASS_BONUS[p.warrior_type]||[]).map(r=>`<div class="r"><span class="k">${r.k}</span><span class="v${r.neg?' neg':''}">${r.v}</span></div>`).join('');
  const eq=inv?.eq_stats||p.eq_stats||{};
  const eqList=[
    eq.atk_bonus&&['Урон',`+${eq.atk_bonus}`],eq.hp_bonus&&['HP',`+${eq.hp_bonus}`],
    eq.def_pct&&['Броня',`+${eq.def_pct}%`],eq.crit_bonus&&['Крит-стат',`+${eq.crit_bonus}`],
    eq.pen_pct&&['Пробой',`+${eq.pen_pct}%`],eq.dodge_bonus&&['Уворот',`+${eq.dodge_bonus}%`],
    eq.regen_bonus&&['Регенерация',`+${eq.regen_bonus} HP/р`],eq.lifesteal_pct&&['Вампиризм',`+${eq.lifesteal_pct}%`],
    eq.str_bonus&&['Сила (щит)',`+${eq.str_bonus}`],eq.agi_bonus&&['Ловкость (щит)',`+${eq.agi_bonus}`],
    eq.intu_bonus&&['Интуиция (щит)',`+${eq.intu_bonus}`],eq.accuracy&&['Точность',`+${eq.accuracy}%`],
  ].filter(Boolean);
  const eqHtml=eqList.length?eqList.map(([k,v])=>`<div class="r"><span class="k">${_esc(k)}</span><span class="v">${_esc(v)}</span></div>`).join(''):`<div class="em">наденьте снаряжение в гардеробе</div>`;
  const cb=inv?.clan_bonus;
  const clanTitle=cb?.clan_name?`🏰 Клан · ${_esc(cb.clan_name)}`:'🏰 Клан';
  const clanHtml=cb?.perks?.length?cb.perks.map(pk=>`<div class="r"><span class="k">${_esc(pk.icon)} ${_esc(pk.label)}</span><span class="v">${_esc(pk.value)}</span></div>`).join(''):`<div class="em">вступите в клан для бонусов</div>`;
  return `<div class="st-bon"><div class="t">⚔ Класс · ${_esc(wt.name)}</div>${classRows||'<div class="em">нет бонусов</div>'}</div>
    <div class="st-bon"><div class="t">🛡 Экипировка</div>${eqHtml}</div>
    <div class="st-bon"><div class="t">${clanTitle}</div>${clanHtml}</div>`;
}

const INV_TABS = [
  { key:'scrolls', label:'📜 Свитки' },
  { key:'elixirs', label:'🧪 Эликсиры' },
  { key:'special', label:'🎁 Особые' },
  { key:'boss',    label:'⚔ Рейд' },
];
function _invHTML(inv){
  const META=(window.INVENTORY_META?.ITEM_META)||{};
  const buffs=inv?.active_buffs||[], items=inv?.inventory||[];
  const tabBar=`<div class="st-invtabs">${INV_TABS.map(t=>`<div class="it${_invSubTab===t.key?' on':''}" data-itab="${t.key}">${_esc(t.label)}</div>`).join('')}</div>`;
  // Активные баффы: компактная плашка сверху
  const buffsRows=buffs.map(b=>{
    const lbl=BUFF_LBL[b.buff_type]||b.buff_type;
    const val=`+${b.value}${b.buff_type.endsWith('_pct')?'%':''}`;
    const tail=b.charges!=null?`· ${b.charges} боёв`:(b.expires_at?'· ⏳':'');
    return `<div class="r"><span class="k">${_esc(lbl)} ${tail}</span><span class="v">${_esc(val)}</span></div>`;
  }).join('');
  const buffsCard=buffsRows?`<div class="st-bon"><div class="t">✦ Активные</div>${buffsRows}</div>`:'';
  // Предметы текущей подвкладки
  const curItems=items.filter(it=>(META[it.item_id]?.tab||'scrolls')===_invSubTab);
  const itemsHtml=curItems.length
    ? curItems.map(it=>{
        const m=META[it.item_id]||{icon:'📦',name:it.item_id,desc:''};
        const isBox=it.item_id.startsWith('box_'), isBoss=m.tab==='boss';
        const btn=isBoss?'⚔ В рейде':(isBox?'🎲 Открыть':'Применить');
        return `<div class="st-it"><div class="st-it-ic">${m.icon||'📦'}</div>
          <div class="st-it-bd"><div class="st-it-n">${_esc(m.name||it.item_id)}</div><div class="st-it-d">${_esc(m.desc||'')}</div><div class="st-it-q">×${it.quantity}</div></div>
          <div class="st-it-b${isBoss?' boss':''}" data-act="apply" data-item="${_esc(it.item_id)}">${btn}</div></div>`;
      }).join('')
    : `<div class="st-bon"><div class="em">Пусто в этой категории</div></div>`;
  return `${buffsCard}${tabBar}${itemsHtml}<div class="st-invbtn" data-act="shop">🛒 Открыть магазин</div>`;
}

function _rateHTML(p){
  const wins=p.wins|0, losses=p.losses|0, total=wins+losses, wr=total?Math.round(wins/total*100):0, streak=p.win_streak|0;
  return `<div class="st-bon"><div class="t">🏆 Боевая статистика</div>
    <div class="r"><span class="k">Победы</span><span class="v">${wins}</span></div>
    <div class="r"><span class="k">Поражения</span><span class="v neg">${losses}</span></div>
    <div class="r"><span class="k">Винрейт</span><span class="v" style="color:#ffd166">${wr}%</span></div>
    <div class="r"><span class="k">Серия побед</span><span class="v" style="color:#fb923c">${streak} 🔥</span></div></div>`;
}

let _scene=null, _inv=null, _currentTab='st', _invSubTab='scrolls';

function _render(){
  const p=State.player, wt=WT[p.warrior_type]||WT.tank;
  const root=document.getElementById('st-root'); if(!root) return;
  const name=_esc((p.username||'Герой').slice(0,16));
  const sub=`УР.${p.level} · ★ ${p.rating||0} · ${_esc(wt.name)}`;
  const fs=p.free_stats|0;
  const ptsTxt=fs>0?`⚡ ${fs}`:'✅';
  root.innerHTML=`<div class="st-panel">
    <div class="st-hdr">
      <span class="st-back" data-act="back">‹</span>
      <div class="st-av" data-act="wardrobe">${wt.icon}</div>
      <div class="st-bd"><div class="st-n">${name}</div><div class="st-sb">${sub}</div></div>
      <div class="st-pts${fs>0?'':' zero'}">${ptsTxt}</div>
    </div>
    <div class="st-seg">
      <div class="s${_currentTab==='st'?' on':''}" data-tab="st"><span class="em">⚔</span>СТАТЫ</div>
      <div class="s${_currentTab==='bo'?' on':''}" data-tab="bo"><span class="em">✨</span>БОНУСЫ</div>
      <div class="s${_currentTab==='in'?' on':''}" data-tab="in"><span class="em">🎒</span>РЮКЗАК</div>
      <div class="s${_currentTab==='ra'?' on':''}" data-tab="ra"><span class="em">🏆</span>РЕЙТИНГ</div>
    </div>
    <div class="st-page${_currentTab==='st'?' on':''}" data-p="st">${_currentTab==='st'?_statsHTML(p):''}</div>
    <div class="st-page${_currentTab==='bo'?' on':''}" data-p="bo">${_currentTab==='bo'?_bonusHTML(p,_inv):''}</div>
    <div class="st-page${_currentTab==='in'?' on':''}" data-p="in">${_currentTab==='in'?_invHTML(_inv):''}</div>
    <div class="st-page${_currentTab==='ra'?' on':''}" data-p="ra">${_currentTab==='ra'?_rateHTML(p):''}</div>
  </div>`;
}

async function _onClick(e){
  const el=e.target.closest('[data-act],[data-tab],[data-itab]'); if(!el) return;
  try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');}catch(_){}
  if(el.dataset.tab){ _currentTab=el.dataset.tab; _render(); return; }
  if(el.dataset.itab){ _invSubTab=el.dataset.itab; _render(); return; }
  const act=el.dataset.act;
  // Захватываем ссылку на сцену ДО close() — иначе _scene=null и scene.start не отработает.
  const scn=_scene;
  if(act==='back'){ close(); scn?.scene?.start('Menu', { returnTab:'profile' }); return; }
  if(act==='wardrobe'){ try{ await scn?._openAvatarPanel?.(); }catch(_){} return; }
  if(act==='shop'){ close(); scn?.scene?.start('Shop'); return; }
  if(act==='train'){
    const key=el.dataset.stat; if(!key) return;
    const res=await scn?._trainFromHTML?.(key);
    if(res?.ok){
      try{ await _refreshInv(); }catch(_){}
      _render();
    } else if(res?.reason){
      scn?._showToast?.(res.reason==='no_free_stats'?'❌ Нет свободных статов':'❌ Ошибка');
    }
    return;
  }
  if(act==='apply'){
    const itemId=el.dataset.item; if(!itemId) return;
    await _applyItem(itemId, false);
    return;
  }
}

async function _applyItem(itemId, replace){
  try{
    const res=await post('/api/shop/apply', { item_id:itemId, replace:!!replace });
    if(res?.conflict){
      const ok=window.confirm(`Уже активен свиток «${res.active_buff_type}» (${res.active_charges??'?'} боёв). Заменить?`);
      if(ok) await _applyItem(itemId, true);
      return;
    }
    if(res?.ok){
      if(res.player){ State.player=res.player; State.playerLoadedAt=Date.now(); }
      await _refreshInv();
      _render();
      try{ _scene?._showToast?.(res.msg||'✅ Применено'); }catch(_){}
    } else {
      _scene?._showToast?.(`❌ ${res?.reason||'Ошибка'}`);
    }
  } catch(_){
    _scene?._showToast?.('❌ Нет соединения');
  }
}

async function _refreshInv(){
  try{ const d=await get('/api/shop/inventory'); if(d?.ok) _inv=d; }catch(_){}
}

function _fitToCanvas(root){
  // Привязываем оверлей к canvas, а не к viewport: при FIT-скейле canvas может не
  // заполнять высоту окна, тогда `bottom:76px` съедает TabBar и меню «пропадает».
  try{
    const c=document.querySelector('canvas');
    if(!c) return;
    const r=c.getBoundingClientRect();
    const canvasH=c.height||700;
    const tabBarCss=(r.height*76)/canvasH;
    root.style.top=r.top+'px';
    root.style.left=r.left+'px';
    root.style.width=r.width+'px';
    root.style.right='auto';
    root.style.bottom='auto';
    root.style.height=Math.max(0,r.height-tabBarCss)+'px';
  }catch(_){}
}

async function open(scene, opts){
  _injectCSS();
  close();
  _scene=scene;
  const initTab=(opts?.tab)||'st';
  _currentTab=['st','bo','in','ra'].includes(initTab)?initTab:'st';
  await _refreshInv();
  if(!scene.scene?.isActive()) return;
  const root=document.createElement('div'); root.id='st-root'; root.className='st-overlay';
  document.body.appendChild(root);
  _fitToCanvas(root);
  const onResize=()=>_fitToCanvas(root);
  window.addEventListener('resize', onResize);
  root._onResize=onResize;
  root.addEventListener('click', _onClick);
  root.addEventListener('touchmove', e => e.stopPropagation(), { passive:true });
  _render();
}
function close(){
  const r=document.getElementById('st-root');
  if(r?._onResize){ try{ window.removeEventListener('resize', r._onResize); }catch(_){} }
  r?.remove();
  _scene=null;
}

window.StatsHTML = { open, close, refresh:_render };
})();
