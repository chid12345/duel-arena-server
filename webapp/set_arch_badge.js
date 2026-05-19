/* ============================================================
   ArchBadge — единый helper для значка архетипа предмета.
   Используется на карточках экипировки везде где видна вещь:
   wardrobe overlays per slot (helmet/weapon/...), shop, profile.
   Источник правды по архетипам — config/sets_catalog_v2.py.
   Экспорт: window.ArchBadge.{meta, html, slotNeed}
   ============================================================ */
(() => {
  const META = {
    predator: { name: 'Хищник',  emoji: '🐍', color: '#22c55e' },
    bastion:  { name: 'Бастион',  emoji: '🛡', color: '#3b82f6' },
    berserk:  { name: 'Берсерк',  emoji: '⚔',  color: '#ef4444' },
    ghost:    { name: 'Призрак',  emoji: '👻', color: '#a78bfa' },
    mage:     { name: 'Маг',      emoji: '🔮', color: '#06b6d4' },
    regent:   { name: 'Регент',   emoji: '👑', color: '#f59e0b' },
  };

  function meta(setId) {
    return setId ? (META[setId] || null) : null;
  }

  // Тот же детерминированный маппинг что в db_schema/equipment_items/__init__.py
  // _default_set_id. JS-зеркало нужно потому что hardcoded items в *_html_overlay
  // не содержат set_id — мы выводим его из item_id.
  const _RING = [
    'predator','bastion','berserk','ghost',     // *_free1..4
    'mage','regent','predator','bastion',       // *_gold1..4
    'berserk','ghost','mage','regent',          // *_dia1..4
    'predator','bastion','berserk','ghost',     // *_mythic1..4
  ];
  const _OFFSET = { free:0, gold:4, dia:8, diamond:8, mythic:12 };
  const _WEAPON_ORDER = ['sword','axe','club','gs'];

  function setIdFor(itemId) {
    if (!itemId || typeof itemId !== 'string' || itemId.indexOf('_') < 0) return null;
    const last = itemId.split('_').pop();
    // Длинные префиксы вперёд: 'diamond' раньше 'dia'.
    for (const rarity of ['mythic','diamond','gold','free','dia']) {
      if (!last.startsWith(rarity)) continue;
      const off = _OFFSET[rarity];
      const numStr = last.slice(rarity.length);
      if (numStr === '') {
        // weapon-формат: '<type>_<rarity>'
        const wtype = itemId.slice(0, itemId.length - rarity.length - 1);
        const wpos = _WEAPON_ORDER.indexOf(wtype);
        return wpos >= 0 ? _RING[off + wpos] : null;
      }
      const num = parseInt(numStr, 10) - 1;
      if (Number.isNaN(num) || num < 0 || num > 3) return null;
      return _RING[off + num];
    }
    return null;
  }

  /* Маленький бейдж: <span> с эмодзи и кратким названием. */
  function html(setId, opts = {}) {
    const m = meta(setId);
    if (!m) return '';
    const small = opts.size === 'sm';
    const fz = small ? '9px' : '10px';
    const pd = small ? '1px 5px' : '2px 6px';
    return `<span class="arch-bdg" style="`
      + `display:inline-flex;align-items:center;gap:3px;`
      + `font-size:${fz};padding:${pd};border-radius:7px;`
      + `color:${m.color};border:1px solid ${m.color}80;`
      + `background:${m.color}1a;font-weight:600;letter-spacing:.2px">`
      + `${m.emoji} ${m.name}</span>`;
  }

  /* «⭐ нужно для X 4/6» — если этот предмет может закрыть слот в самом
     полном незаконченном архетипе игрока. Возвращает '' если не нужен.
     Использует State.setsStatus.archetypes (top by count, count<6). */
  function slotNeed(setId) {
    if (!setId) return '';
    const s = window.State?.setsStatus;
    if (!s || !s.archetypes) return '';
    // Самый полный незакрытый архетип с count >= 1
    let top = null;
    for (const a of s.archetypes) {
      if (a.count <= 0 || a.count >= 6) continue;
      if (!top || a.count > top.count) top = a;
    }
    if (!top || top.set_id !== setId) return '';
    const m = META[setId]; if (!m) return '';
    return `<div class="arch-need" style="`
      + `display:inline-flex;align-items:center;gap:4px;`
      + `font-size:9px;padding:2px 6px;border-radius:7px;margin-top:3px;`
      + `color:${m.color};background:${m.color}26;border:1px solid ${m.color}80;`
      + `font-weight:700">`
      + `⭐ нужно для ${m.name} ${top.count}/6</div>`;
  }

  /* Удобный комбо-хелпер: вернёт html-бейдж по item_id (вычислит set_id). */
  function htmlFor(itemId, opts) {
    return html(setIdFor(itemId), opts);
  }

  function slotNeedFor(itemId) {
    return slotNeed(setIdFor(itemId));
  }

  /* Описания архетипов (синхронизировано с config/sets_catalog_v2.py). */
  const DESC = {
    predator: 'Крит и шанс двойного удара',
    bastion:  'HP и защита от урона',
    berserk:  'Чистый урон без защиты',
    ghost:    'Уворот и точность',
    mage:     'Пробой брони и сила удара',
    regent:   'Сбалансированный универсал',
  };

  /* Большой блок для детального попапа: название архетипа + описание стиля
     + строка прогресса «у тебя X/6». Подсветка если этот предмет добавит +1
     к самому полному незакрытому архетипу. */
  function detailBlock(itemId) {
    const sid = setIdFor(itemId);
    const m = meta(sid);
    if (!m) return '';
    const s = window.State?.setsStatus;
    const arch = s?.archetypes?.find(a => a.set_id === sid);
    const cur = arch ? arch.count : 0;
    const eq = window.State?.equipment || {};
    // Если этот же item_id уже надет — он уже учтён в cur, не «добавит +1».
    let alreadyEquipped = false;
    for (const slot in eq) if (eq[slot]?.item_id === itemId) { alreadyEquipped = true; break; }
    const wouldAdd = !alreadyEquipped && cur < 6;
    // «Топ незакрытый» для подсветки
    let topUnfinished = null;
    if (s?.archetypes) {
      for (const a of s.archetypes) {
        if (a.count <= 0 || a.count >= 6) continue;
        if (!topUnfinished || a.count > topUnfinished.count) topUnfinished = a;
      }
    }
    const isTop = wouldAdd && topUnfinished?.set_id === sid;
    const progLine = (cur > 0)
      ? `<div style="font-size:11px;color:#a8c0d8;margin-top:4px">У тебя <b style="color:${m.color}">${cur}/6</b> этого архетипа${wouldAdd ? ' — этот предмет даст +1' : ''}.</div>`
      : `<div style="font-size:11px;color:#80a8c0;margin-top:4px;opacity:.85">У тебя пока нет предметов этого архетипа.</div>`;
    const topHint = isTop
      ? `<div style="font-size:11px;color:${m.color};margin-top:4px;font-weight:700">⭐ Нужно — это твой самый полный незаконченный комплект.</div>`
      : '';
    return `<div style="margin-top:8px;padding:8px 10px;border-radius:8px;`
      + `background:${m.color}14;border:1px solid ${m.color}55">`
      + `<div style="font-size:12px;color:${m.color};font-weight:700">${m.emoji} Архетип: ${m.name}</div>`
      + `<div style="font-size:11px;color:#cfe0f0;margin-top:2px">${DESC[sid] || ''}</div>`
      + `${progLine}${topHint}`
      + `</div>`;
  }

  window.ArchBadge = { meta, html, slotNeed, setIdFor, htmlFor, slotNeedFor, detailBlock };
})();
