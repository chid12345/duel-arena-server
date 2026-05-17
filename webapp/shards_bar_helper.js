/* webapp/shards_bar_helper.js — компактный 4-чип бар шардов в заголовке каталога.
 *
 * Используется в 6 overlay (helmet/shield/boots/ring/weapon/wardrobe).
 * Рендерит ⬡ T1/T2/T3/T4 с цветами по тиру (серебро/золото/фиолет/огонь).
 * Читает State.shards = {T1: N, T2: N, T3: N, T4: N} (из /api/player).
 *
 * Использование в overlay:
 *   <div class="wd-head">
 *     <span class="wd-title">⛑️ Шлемы</span>
 *     ${window.ShardsBar ? ShardsBar.build() : ''}
 *     <button class="wd-close">✕</button>
 *   </div>
 */
(function (global) {
  'use strict';

  let _cssOn = false;
  function _injectCSS() {
    if (_cssOn) return;
    _cssOn = true;
    const s = document.createElement('style');
    s.id = 'shards-bar-css';
    s.textContent = `
.shards-bar{display:flex;align-items:center;gap:5px;margin:0 8px;font-family:'Share Tech Mono',monospace}
.shard-chip{display:flex;align-items:center;gap:3px;padding:3px 7px;border-radius:8px;font-size:10px;font-weight:800;letter-spacing:.3px;border:1px solid;backdrop-filter:blur(4px);transition:transform .15s,filter .15s;cursor:default;white-space:nowrap}
.shard-chip:hover{transform:translateY(-1px);filter:brightness(1.2)}
.shard-chip.t1{border-color:rgba(156,163,175,.55);background:rgba(156,163,175,.1);color:#d1d5db;box-shadow:0 0 8px rgba(156,163,175,.25)}
.shard-chip.t2{border-color:rgba(251,191,36,.55);background:rgba(251,191,36,.1);color:#fcd34d;box-shadow:0 0 8px rgba(251,191,36,.3)}
.shard-chip.t3{border-color:rgba(168,85,247,.55);background:rgba(168,85,247,.1);color:#d8b4fe;box-shadow:0 0 10px rgba(168,85,247,.35)}
.shard-chip.t4{border-color:rgba(249,115,22,.6);background:rgba(249,115,22,.12);color:#fdba74;box-shadow:0 0 12px rgba(249,115,22,.4),0 0 4px rgba(249,115,22,.2) inset}
.shard-chip.empty{opacity:.35;filter:grayscale(.5);box-shadow:none}
@media (max-width:400px){.shards-bar{gap:3px;margin:0 4px}.shard-chip{padding:2px 5px;font-size:9px}}
`;
    document.head.appendChild(s);
  }

  function _val(tier) {
    try {
      return Number((window.State?.shards?.[tier]) || 0);
    } catch (_) { return 0; }
  }

  function build() {
    _injectCSS();
    const tiers = ['T1', 'T2', 'T3', 'T4'];
    const chips = tiers.map(t => {
      const v = _val(t);
      const cls = v > 0 ? '' : ' empty';
      return `<div class="shard-chip ${t.toLowerCase()}${cls}" title="${_tip(t)}">⬡ ${v}</div>`;
    }).join('');
    return `<div class="shards-bar">${chips}</div>`;
  }

  function _tip(tier) {
    const tips = {
      T1: 'Шарды T1 — для гольдового шмота (800g)',
      T2: 'Шарды T2 — для T2-шмота (8000g)',
      T3: 'Шарды T3 — для алмазного шмота (75💎)',
      T4: 'Шарды T4 — для mythic-шмота за донат',
    };
    return tips[tier] || '';
  }

  global.ShardsBar = { build };
})(window);
