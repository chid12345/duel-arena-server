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
    const target = window.ArchBadge?.meta?.(targetSetId);
    const targetName = target ? `${target.emoji} ${target.name}` : 'этого архетипа';
    const eq = _getEquipped(slot.key);

    // Слот пуст — нужно что-то надеть.
    if (!eq) {
      return `<div class="sb-slot off">
        <span class="sb-slot-em">${slot.emoji}</span>
        <span class="sb-slot-lb">${slot.label}</span>
        <div class="sb-slot-info">
          <span class="sb-item-nm" style="color:#6b7280">пусто</span>
          <span class="sb-status need">надень ${targetName}</span>
        </div>
      </div>`;
    }

    const sid = _itemSetId(eq);
    const match = sid === targetSetId;
    const name = eq.name || eq.item_id || '—';
    const rarStyle = _rarityStyle(eq.rarity);

    // Совпадает — в комплекте, зелёная галочка.
    if (match) {
      return `<div class="sb-slot on">
        <span class="sb-slot-em">${slot.emoji}</span>
        <span class="sb-slot-lb">${slot.label}</span>
        <div class="sb-slot-info">
          <span class="sb-item-nm" style="${rarStyle}">${name}</span>
        </div>
        <span class="sb-status ok">✓ в сете</span>
      </div>`;
    }

    // Надет ЧУЖОЙ архетип — явно говорим «замени», а не голый крестик.
    const cur = window.ArchBadge?.meta?.(sid);
    const curName = cur ? `${cur.emoji} ${cur.name}` : 'другой архетип';
    return `<div class="sb-slot mismatch">
      <span class="sb-slot-em">${slot.emoji}</span>
      <span class="sb-slot-lb">${slot.label}</span>
      <div class="sb-slot-info">
        <span class="sb-item-nm" style="${rarStyle}">${name}</span>
        <span class="sb-status swap">это ${curName} — замени на ${targetName}</span>
      </div>
    </div>`;
  }

  function slotsHTML(setId) {
    if (!setId) return '';
    const rows = SLOTS.map(s => _row(s, setId)).join('');
    return `<div class="sb-breakdown">
      <div class="sb-breakdown-h">Что надето · ✓ в сете / замени / пусто:</div>
      ${rows}
    </div>`;
  }

  function _injectCSS() {
    if (document.getElementById('sb-breakdown-css')) return;
    const css = `
.sb-breakdown{margin-top:8px;padding:8px;background:rgba(255,255,255,.03);border-radius:8px;border:1px solid rgba(255,255,255,.06)}
.sb-breakdown-h{font-size:9.5px;color:#80a8c0;opacity:.7;margin-bottom:6px;letter-spacing:.3px}
.sb-slot{display:flex;align-items:center;gap:7px;padding:4px 0;font-size:11px;border-top:1px solid rgba(255,255,255,.04)}
.sb-slot:first-of-type{border-top:none}
.sb-slot-em{width:18px;text-align:center;flex-shrink:0}
.sb-slot-lb{width:48px;color:#a8b8cc;font-weight:600;flex-shrink:0}
.sb-slot-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.sb-item-nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;letter-spacing:.2px}
.sb-status{font-size:9px;font-weight:600}
.sb-status.ok{color:#22c55e;flex-shrink:0}
.sb-status.swap{color:#fb923c}
.sb-status.need{color:#fbbf24}
.sb-slot.mismatch .sb-item-nm{opacity:.5}
    `;
    const el = document.createElement('style');
    el.id = 'sb-breakdown-css';
    el.textContent = css;
    document.head.appendChild(el);
  }
  _injectCSS();

  window.SetBonusBreakdown = { slotsHTML };
})();
