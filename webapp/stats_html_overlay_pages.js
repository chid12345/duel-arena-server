/* ============================================================
   Stats HTML Overlay — рендер-хелперы страниц
   (выделено из stats_html_overlay.js)
   Экспорт: window.StatsHTMLPages
     { WT, statsHTML, bonusHTML, invHTML, rateHTML }
   ============================================================ */
(() => {
const WT = {
  tank:  { name:'Берсерк',       icon:'⚔️' },
  agile: { name:'Теневой Вихрь', icon:'💨' },
  crit:  { name:'Хаос-Рыцарь',   icon:'💥' },
};
const CLASS_BONUS = {
  tank:  [{k:'Урон',v:'+10%',neg:false},{k:'Уворот',v:'−5%',neg:true}],
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
const INV_TABS = [
  { key:'scrolls', label:'📜 Свитки' },
  { key:'elixirs', label:'🧪 Эликсиры' },
  { key:'special', label:'🎁 Особые' },
];
const _esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const _base = (p,k) => Number(p?.stats_base?.[k] ?? p?.[k] ?? 0);
const _bonus = (p,k) => Number(p?.stats_bonus_total?.[k] ?? 0);
const _val = (p,k) => Number(p?.[k+'_effective'] ?? p?.[k] ?? 0);

function statsHTML(p){
  return STAT_META.map(s=>{
    const base=_base(p,s.key), bon=_bonus(p,s.key), v=_val(p,s.key), free=p.free_stats>0;
    return `<div class="st-srow ${s.cls}" data-act="stat_info" data-stat="${s.key}">
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

function bonusHTML(p, inv){
  // tank_1/agile_2/crit_0 → tank/agile/crit (скины не должны ломать бонусы класса)
  const _wtKey=String(p?.warrior_type||'').split('_')[0];
  const wt=WT[_wtKey]||WT.tank;
  const classRows=(CLASS_BONUS[_wtKey]||[]).map(r=>`<div class="r"><span class="k">${r.k}</span><span class="v${r.neg?' neg':''}">${r.v}</span></div>`).join('');
  const eq=inv?.eq_stats||p.eq_stats||{};
  const eqList=[
    eq.atk_bonus&&['Урон',`+${eq.atk_bonus}`],eq.hp_bonus&&['HP',`+${eq.hp_bonus}`],
    eq.def_pct&&['Броня',`+${eq.def_pct}%`],eq.crit_bonus&&['Крит-стат',`+${eq.crit_bonus}`],
    eq.pen_pct&&['Пробой',`+${eq.pen_pct}%`],eq.dodge_bonus&&['Уворот',`+${eq.dodge_bonus}%`],
    eq.regen_bonus&&['Регенерация',`+${eq.regen_bonus} HP/р`],eq.lifesteal_pct&&['Вампиризм',`+${eq.lifesteal_pct}%`],
    eq.str_bonus&&['Сила (щит)',`+${eq.str_bonus}`],eq.agi_bonus&&['Ловкость (щит)',`+${eq.agi_bonus}`],
    eq.intu_bonus&&['Интуиция (щит)',`+${eq.intu_bonus}`],eq.accuracy&&['Точность',`+${eq.accuracy}%`],
    // Броня armor2 — защитные механики
    eq.body_def_pct&&['Защита тела',`−${eq.body_def_pct}%`],eq.reflect_pct&&['🪞 Шипы',`${eq.reflect_pct}%`],
    eq.block_chance&&['🛡 Блок',`${eq.block_chance}%`],eq.crit_resist_pct&&['Защита от крита',`−${eq.crit_resist_pct}%`],
    // Прочие боевые
    eq.double_pct&&['Двойной удар',`+${eq.double_pct}%`],eq.anti_dodge_pct&&['Анти-уворот',`−${eq.anti_dodge_pct}%`],
    eq.silence_pct&&['Глушение крита',`${eq.silence_pct}%`],eq.slow_pct&&['Замедление врага',`−${eq.slow_pct}%`],
    eq.regen_speed_pct&&['Скорость регена',`+${eq.regen_speed_pct}%`],
    eq.gold_pct&&['Золото',`+${eq.gold_pct}%`],eq.xp_pct&&['Опыт',`+${eq.xp_pct}%`],
  ].filter(Boolean);
  const eqHtml=eqList.length?eqList.map(([k,v])=>`<div class="r"><span class="k">${_esc(k)}</span><span class="v">${_esc(v)}</span></div>`).join(''):`<div class="em">наденьте снаряжение в гардеробе</div>`;
  // 🎁 Комплект — активные сет-бонусы (берём из State.setsStatus.active).
  const setHtml=_setBonusHtml();
  const cb=inv?.clan_bonus;
  const clanTitle=cb?.clan_name?`🏰 Клан · ${_esc(cb.clan_name)}`:'🏰 Клан';
  const clanHtml=cb?.perks?.length?cb.perks.map(pk=>`<div class="r"><span class="k">${_esc(pk.icon)} ${_esc(pk.label)}</span><span class="v">${_esc(pk.value)}</span></div>`).join(''):`<div class="em">вступите в клан для бонусов</div>`;
  // Premium-блок: +25% XP / +25% Gold во всех источниках наград
  const isPrem = !!(p?.is_premium);
  const daysLeft = Number(p?.premium_days_left || 0);
  const premTitle = isPrem
    ? `👑 Premium · активен${daysLeft>0?` · ${daysLeft} дн.`:''}`
    : `👑 Premium`;
  const premHtml = isPrem
    ? `<div class="r"><span class="k">📚 Опыт</span><span class="v">+25%</span></div>
       <div class="r"><span class="k">💰 Золото</span><span class="v">+25%</span></div>
       <div class="r"><span class="k">🎁 Ежедневный ящик</span><span class="v">каждый день</span></div>
       <div class="r"><span class="k">⚡ Авто-бой</span><span class="v">все режимы</span></div>`
    : `<div class="em">купите Premium в магазине для +25% XP/Gold и ежедневного ящика</div>`;
  return `<div class="st-bon"><div class="t">⚔ Класс · ${_esc(wt.name)}</div>${classRows||'<div class="em">нет бонусов</div>'}</div>
    <div class="st-bon"><div class="t">🛡 Экипировка</div>${eqHtml}</div>
    ${setHtml}
    <div class="st-bon"><div class="t">${clanTitle}</div>${clanHtml}</div>
    <div class="st-bon"><div class="t">${premTitle}</div>${premHtml}</div>`;
}

// 🎁 Комплект — карточка активных сет-бонусов для вкладки БОНУСЫ.
// Источник — State.setsStatus.active (тот же что вкладка «Комплект»).
function _setBonusHtml(){
  const s=window.State&&State.setsStatus;
  if(!s||!s.active){
    // Данных ещё нет — триггерим фон-загрузку, покажем заглушку (перерисуется).
    try{ window.SetBonusPage?.refresh?.(); }catch(_){}
    return `<div class="st-bon"><div class="t">🎁 Комплект</div><div class="em">загрузка…</div></div>`;
  }
  const act=s.active||[], mp=s.max_pieces||6;
  if(!act.length){
    return `<div class="st-bon"><div class="t">🎁 Комплект</div><div class="em">надень 2+ предмета одного архетипа — бонус появится тут</div></div>`;
  }
  const rows=act.map(a=>{
    const bonuses=(a.bonuses_human||[]).join(' · ')||'—';
    const perk=a.perk_id?`<div class="r"><span class="k">★ ${_esc(a.perk_desc||a.perk_id)}</span><span class="v"></span></div>`:'';
    return `<div class="r"><span class="k">${a.emoji||''} ${_esc(a.name)} · ${a.count}/${mp}</span><span class="v">${_esc(bonuses)}</span></div>${perk}`;
  }).join('');
  return `<div class="st-bon"><div class="t">🎁 Комплект</div>${rows}</div>`;
}

function invHTML(inv, subTab){
  const META=(window.INVENTORY_META?.ITEM_META)||{};
  const buffs=inv?.active_buffs||[], items=inv?.inventory||[];
  const tabBar=`<div class="st-invtabs">${INV_TABS.map(t=>`<div class="it${subTab===t.key?' on':''}" data-itab="${t.key}">${_esc(t.label)}</div>`).join('')}</div>`;
  const buffsRows=buffs.map(b=>{
    const lbl=BUFF_LBL[b.buff_type]||b.buff_type;
    const val=`+${b.value}${b.buff_type.endsWith('_pct')?'%':''}`;
    const tail=b.charges!=null?`· ${b.charges} боёв`:(b.expires_at?'· ⏳':'');
    return `<div class="r"><span class="k">${_esc(lbl)} ${tail}</span><span class="v">${_esc(val)}</span></div>`;
  }).join('');
  const buffsCard=buffsRows?`<div class="st-bon"><div class="t">✦ Активные</div>${buffsRows}</div>`:'';
  const curItems=items.filter(it=>(META[it.item_id]?.tab||'scrolls')===subTab);
  const itemsHtml=curItems.length
    ? curItems.map(it=>{
        const m=META[it.item_id]||{icon:'📦',name:it.item_id,desc:''};
        const isBox=it.item_id.startsWith('box_'), isBoss=m.tab==='boss';
        const btn=isBoss?'⚔ В рейде':(isBox?'🎲 Открыть':'Применить');
        // Для ящиков/сундуков подставляем PNG из BoxIcons (как в магазине),
        // иначе эмодзи из ITEM_META.icon. Свечение — по валюте (золото/алмазы/USDT/звёзды).
        const imgPath=window.BoxIcons?.imageFor?.(it.item_id);
        const glow=window.BoxIcons?.glowFor?.(it.item_id)||'rgba(255,200,80,.45)';
        const icHtml=imgPath
          ? `<img src="${imgPath}" style="width:34px;height:34px;object-fit:contain;display:block;margin:0 auto;filter:drop-shadow(0 0 8px ${glow}) drop-shadow(0 0 2px ${glow})" alt="">`
          : (m.icon||'📦');
        return `<div class="st-it" data-act="card" data-item="${_esc(it.item_id)}"><div class="st-it-ic">${icHtml}</div>
          <div class="st-it-bd"><div class="st-it-n">${_esc(m.name||it.item_id)}</div><div class="st-it-d">${_esc(m.desc||'')}</div><div class="st-it-q">×${it.quantity}</div></div>
          <div class="st-it-b${isBoss?' boss':''}" data-act="apply" data-item="${_esc(it.item_id)}">${btn}</div></div>`;
      }).join('')
    : `<div class="st-bon"><div class="em">Пусто в этой категории</div></div>`;
  return `${buffsCard}${tabBar}${itemsHtml}<div class="st-invbtn" data-act="shop">🛒 Открыть магазин</div>`;
}

function rateHTML(p){
  // Перепрофилирована: показывает страницу «Комплект» (set bonus).
  // Старая боевая статистика (Победы/Серия) убрана — дублировала шапку Профиля.
  if (window.SetBonusPage?.html) return window.SetBonusPage.html(p);
  return `<div class="st-bon"><div class="em">Загрузка страницы комплектов…</div></div>`;
}

window.StatsHTMLPages = { WT, statsHTML, bonusHTML, invHTML, rateHTML };
})();
