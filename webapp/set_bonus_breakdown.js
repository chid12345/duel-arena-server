/* ============================================================
   SetBonusBreakdown — разбор «что есть/чего нет» по архетипу.
   Для каждого из 6 слотов экипировки показывает:
     ✓ зелёная галочка + имя — надетый предмет принадлежит архетипу
     ✗ серый крест + имя     — надетый предмет другого архетипа
     ○ пустой слот           — ничего не надето
   Имя предмета покрашено в неон по редкости (киберпанк-стиль).
   Источники: State.equipment + ArchBadge.setIdFor (deterministic mapping).
   Экспорт: window.SetBonusBreakdown.slotsHTML(setId)
   ============================================================ */
(() => {
  // Порядок и подписи слотов — те же 6 что в игре. ring2 — legacy, скрыт.
  const SLOTS = [
    { key: 'belt',   label: 'Шлем',    emoji: '⛑' },
    { key: 'armor2', label: 'Броня',   emoji: '🛡' },
    { key: 'weapon', label: 'Оружие',  emoji: '⚔' },
    { key: 'shield', label: 'Щит',     emoji: '🔰' },
    { key: 'boots',  label: 'Сапоги',  emoji: '👢' },
    { key: 'ring1',  label: 'Кольцо',  emoji: '💍' },
  ];

  // Киберпанк-палитра по редкости. Серебро/золото/алмаз/мифик —
  // неон-цвета с лёгким свечением через text-shadow.
  const RARITY_NEON = {
    common:  { color: '#cbd5e1', glow: 'rgba(203,213,225,.45)' }, // серебро
    rare:    { color: '#fbbf24', glow: 'rgba(251,191,36,.55)'  }, // золото
    epic:    { color: '#22d3ee', glow: 'rgba(34,211,238,.55)'  }, // алмаз/диамант
    mythic:  { color: '#fb7185', glow: 'rgba(251,113,133,.6)'  }, // мифик/неон
  };

  function _getEquipped(slot) {
    const eq = window.State?.equipment || {};
    return eq[slot] || null;
  }

  function _itemSetId(item) {
    if (!item) return null;
    if (item.set_id) return item.set_id;
    return window.ArchBadge?.setIdFor?.(item.item_id) || null;
  }

  function _rarityStyle(rarity) {
    const r = RARITY_NEON[rarity] || RARITY_NEON.common;
    return `color:${r.color};text-shadow:0 0 6px ${r.glow}`;
  }

  function _row(slot, targetSetId) {
    const eq = _getEquipped(slot.key);
    if (!eq) {
      // Пусто: даём подсказку в стиле «нужен предмет архетипа X».
      const archMeta = window.ArchBadge?.meta?.(targetSetId);
      const hint = archMeta ? `купи ${archMeta.emoji} ${archMeta.name}` : 'купи предмет';
      return `<div class="sb-slot off">
        <span class="sb-slot-em">${slot.emoji}</span>
        <span class="sb-slot-lb">${slot.label}</span>
        <span class="sb-slot-st" style="color:#6b7280">○ пусто · ${hint}</span>
      </div>`;
    }
    const sid = _itemSetId(eq);
    const match = sid === targetSetId;
    const name = eq.name || eq.item_id || '—';
    const rarStyle = _rarityStyle(eq.rarity);
    const icon  = match ? '✓' : '✗';
    const iconColor = match ? '#22c55e' : '#6b7280';
    const archMeta = window.ArchBadge?.meta?.(sid);
    const archTxt = (!match && archMeta)
      ? `<span style="font-size:9px;opacity:.65;margin-left:4px;color:${archMeta.color}">(${archMeta.emoji} ${archMeta.name})</span>`
      : '';
    return `<div class="sb-slot ${match?'on':'mismatch'}">
      <span class="sb-slot-em">${slot.emoji}</span>
      <span class="sb-slot-lb">${slot.label}</span>
      <span class="sb-slot-nm">
        <span style="color:${iconColor};font-weight:700">${icon}</span>
        <span class="sb-item-nm" style="${rarStyle}">${name}</span>${archTxt}
      </span>
    </div>`;
  }

  function slotsHTML(setId) {
    if (!setId) return '';
    const rows = SLOTS.map(s => _row(s, setId)).join('');
    return `<div class="sb-breakdown">
      <div class="sb-breakdown-h">По слотам:</div>
      ${rows}
    </div>`;
  }

  function _injectCSS() {
    if (document.getElementById('sb-breakdown-css')) return;
    const css = `
.sb-breakdown{margin-top:8px;padding:8px;background:rgba(255,255,255,.03);border-radius:8px;border:1px solid rgba(255,255,255,.06)}
.sb-breakdown-h{font-size:10px;color:#80a8c0;opacity:.7;margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px}
.sb-slot{display:flex;align-items:center;gap:6px;padding:3px 0;font-size:11px}
.sb-slot-em{width:18px;text-align:center}
.sb-slot-lb{width:54px;color:#a8b8cc;font-weight:600}
.sb-slot-nm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:4px}
.sb-item-nm{overflow:hidden;text-overflow:ellipsis;font-weight:600;letter-spacing:.2px}
.sb-slot-st{flex:1;font-style:italic}
.sb-slot.mismatch .sb-item-nm{opacity:.45}
    `;
    const el = document.createElement('style');
    el.id = 'sb-breakdown-css';
    el.textContent = css;
    document.head.appendChild(el);
  }
  _injectCSS();

  window.SetBonusBreakdown = { slotsHTML };
})();
