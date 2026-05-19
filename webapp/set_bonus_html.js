/* ============================================================
   SetBonusPage — страница «Комплект» во вкладке Герой.
   Архетипные сеты v2 (этап 5E): 6 архетипов, пороги 2/4/6.
   Источник данных — /api/sets/status (рассчитывается на сервере).
   Кэшируется в State.setsStatus, обновляется при equip/unequip.
   Экспорт: window.SetBonusPage.html(player), window.SetBonusPage.refresh()
   ============================================================ */
(() => {
const COLOR = {
  predator: '#22c55e',
  bastion:  '#3b82f6',
  berserk:  '#ef4444',
  ghost:    '#a78bfa',
  mage:     '#06b6d4',
  regent:   '#f59e0b',
};

function _countsSig(s) {
  // Стабильная подпись по counts архетипов — чтоб понять, изменилось ли.
  if (!s || !s.archetypes) return '';
  return s.archetypes.map(a => `${a.set_id}:${a.count}`).join('|');
}

async function refresh() {
  try {
    const r = await get('/api/sets/status');
    if (!r?.ok) return;
    window.State = window.State || {};
    const oldSig = _countsSig(State.setsStatus);
    State.setsStatus = r;
    const newSig = _countsSig(r);
    // Если подсчёты изменились и оверлей Героя открыт на вкладке КОМПЛЕКТ —
    // перерисовать. Иначе игрок видит залежавшийся кэш с нулями.
    if (oldSig !== newSig) {
      try { window.StatsHTML?.refresh?.(); } catch (_) {}
    }
  } catch (_) {}
}

function _renderArchetype(arch, maxPieces) {
  const c = COLOR[arch.set_id] || '#888';
  const count = arch.count;
  const isFull = count >= maxPieces;
  const isActive = count >= 2;
  const fullBadge = isFull ? `<span class="sb-badge" style="color:${c};border-color:${c}">★ ПОЛНЫЙ</span>` : '';
  const activeBadge = (!isFull && isActive) ? `<span class="sb-badge" style="color:${c};border-color:${c}">АКТИВЕН</span>` : '';

  const rows = arch.thresholds.map(t => {
    const on = t.reached;
    const bonusStr = (t.bonuses_human || []).join(' · ') || '—';
    return `<div class="sb-row ${on?'on':'off'}">
      <span class="sb-mark">${on ? '✓' : '○'}</span>
      <span class="sb-th">${t.n}/${maxPieces}</span>
      <span class="sb-bn">${bonusStr}</span>
    </div>`;
  }).join('');

  // Перк (на пороге 6) — единственный, ищем в thresholds
  let perkRow = '';
  const perkTier = (arch.thresholds || []).find(t => t.n === maxPieces && t.perk_id);
  if (perkTier) {
    const perkOn = count >= maxPieces;
    const lockBadge = perkOn ? '★' : `<span class="sb-perk-lock">🔒 нужно ещё ${maxPieces - count}</span>`;
    perkRow = `<div class="sb-perk ${perkOn?'on':'off'}">
      <div class="sb-perk-h">${lockBadge} ${perkTier.perk_id}</div>
      <div class="sb-perk-d">${perkTier.perk_desc || ''}</div>
    </div>`;
  }

  const moreNeeded = count < 2 ? `<div class="sb-need">Соберите ещё ${2 - count} для бонуса</div>` : '';

  return `<div class="st-bon sb-card ${isActive?'sb-active':''}" style="--sb-c:${c}">
    <div class="t sb-head">
      <span class="sb-emo">${arch.emoji}</span>
      <span class="sb-name" style="color:${c}">${arch.name}</span>
      <span class="sb-count" style="color:${c}">${count}/${maxPieces}</span>
      ${fullBadge}${activeBadge}
    </div>
    <div class="sb-desc" style="font-size:11px;color:#80a8c0;opacity:.85;margin:4px 0 8px">${arch.desc || ''}</div>
    ${moreNeeded}
    <div class="sb-rows">${rows}</div>
    ${perkRow}
  </div>`;
}

function pageHTML(p) {
  // На каждой отрисовке тянем свежий статус — после equip/unequip счётчики
  // должны обновиться, без этого видны старые нули из первого открытия.
  refresh();
  const s = (window.State && State.setsStatus) || null;

  if (!s || !s.ok) {
    return `<div class="st-bon sb-empty">
      <div class="t">⏳ Загрузка комплектов...</div>
      <div class="em">Если ничего не появилось — обнови вкладку Герой.</div>
    </div>`;
  }

  const maxPieces = s.max_pieces || 6;
  const archs = s.archetypes || [];
  const anyEquipped = archs.some(a => a.count > 0);

  if (!anyEquipped) {
    return `<div class="st-bon sb-empty">
      <div class="t">📦 Снаряга не надета</div>
      <div class="em">Загляни в Профиль → надень предметы → возвращайся смотреть прогресс архетипов.</div>
    </div>`;
  }

  const intro = `<div class="st-bon sb-intro">
    <div class="t">🎁 Архетипы</div>
    <div class="sb-int-d">6 стилей игры. Носи 2+ предмета одного архетипа — получишь бонус. Несколько архетипов могут быть активны одновременно. Полный комплект 6/6 даёт уникальный перк.</div>
  </div>`;

  // Сортируем: активные (count >= 2) первыми, по убыванию count
  const sorted = archs.slice().sort((a, b) => b.count - a.count);
  const cards = sorted.map(arch => _renderArchetype(arch, maxPieces)).join('');
  return intro + cards;
}

// Авто-обновление при первой загрузке (если есть State.initData)
function _autoLoad() {
  if (window.State?.initData && !State.setsStatus) refresh();
}

window.SetBonusPage = {
  html: pageHTML,
  refresh,
  // Совместимость со старым API (use sites просили resolveActive)
  resolveActive: () => {
    const s = window.State?.setsStatus;
    return s?.active?.[0]?.set_id || null;
  },
};

// Стартовая загрузка через 500мс — даём время initData проникнуть
setTimeout(_autoLoad, 500);
})();
