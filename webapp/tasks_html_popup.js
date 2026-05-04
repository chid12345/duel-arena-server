/* ============================================================
   Tasks HTML Popup — инфо-попап при тапе + тост награды
   ============================================================ */
(function() {
const CSS = `<style id="tsk-popup-style">
#tsk-popup-overlay{position:absolute;inset:0;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;z-index:200;animation:tpopFade .15s ease-out}
@keyframes tpopFade{from{opacity:0}to{opacity:1}}
.tpop-panel{background:linear-gradient(135deg,rgba(15,3,30,.98),rgba(5,5,18,.98));border:1px solid rgba(255,215,0,.45);border-radius:16px;padding:20px 18px 16px;width:calc(100% - 48px);max-width:340px;position:relative;animation:tpopPop .2s cubic-bezier(.34,1.56,.64,1)}
@keyframes tpopPop{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}
.tpop-close{position:absolute;top:10px;right:12px;background:rgba(255,100,100,.15);border:1px solid rgba(255,100,100,.4);border-radius:7px;color:#ffaaaa;font-size:13px;cursor:pointer;padding:2px 8px;line-height:1.6}
.tpop-close:active{transform:scale(.92)}
.tpop-icon{font-size:36px;text-align:center;margin-bottom:6px}
.tpop-name{font-size:15px;font-weight:800;color:#ffe888;text-align:center;margin-bottom:4px}
.tpop-divider{height:1px;background:rgba(255,215,0,.2);margin:8px 0}
.tpop-desc{font-size:12px;color:#c8a878;text-align:center;line-height:1.55;white-space:pre-wrap;margin-bottom:8px}
.tpop-badge{font-size:10px;font-weight:700;color:#88ccff;background:rgba(26,58,106,.9);border-radius:8px;padding:3px 12px;text-align:center;display:inline-block;width:100%;box-sizing:border-box;margin-bottom:8px}
.tpop-prog{font-size:10px;font-weight:700;color:#ffe888;text-align:center;margin:5px 0 8px}
.tpop-prog.done{color:#88ff88}
.tpop-bar-wrap{height:6px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden;margin:4px 0}
.tpop-bar{height:100%;border-radius:3px;background:linear-gradient(90deg,#5096ff,#00f0ff);box-shadow:0 0 6px rgba(0,240,255,.4);transition:width .3s}
.tpop-bar.done{background:linear-gradient(90deg,#3cc864,#80ff9c);box-shadow:0 0 6px rgba(60,200,100,.4)}
.tpop-rewards{font-size:13px;font-weight:700;color:#ffd700;text-align:center;margin-top:6px;letter-spacing:.3px}
.tsk-reward-toast{position:absolute;left:50%;transform:translateX(-50%);top:40%;background:linear-gradient(135deg,rgba(15,3,30,.97),rgba(5,5,18,.97));border:1px solid rgba(255,215,0,.6);border-radius:16px;padding:18px 28px;text-align:center;z-index:300;box-shadow:0 0 30px rgba(255,215,0,.2);animation:tpopPop .25s cubic-bezier(.34,1.56,.64,1);transition:opacity .35s;white-space:nowrap}
.tsk-rt-title{font-size:16px;font-weight:800;color:#fff;margin-bottom:8px}
.tsk-rt-items{font-size:20px;font-weight:800;color:#ffd166;text-shadow:0 0 12px rgba(255,209,102,.6);letter-spacing:2px}
</style>`;

let _cssInjected = false;
function _injectCSS() {
  if (_cssInjected || document.getElementById('tsk-popup-style')) return;
  document.head.insertAdjacentHTML('beforeend', CSS);
  _cssInjected = true;
}

/* ── Инфо-попап при тапе на карточку ── */
window.TasksHTML_showPopup = function(opts) {
  _injectCSS();
  document.getElementById('tsk-popup-overlay')?.remove();
  const _e = window._TasksHTML_esc;

  let badgeHtml = opts.badge ? `<div class="tpop-badge">${_e(opts.badge)}</div>` : '';

  let progHtml = '';
  if (opts.progress) {
    const cur = opts.progressCur || 0, max = opts.progressMax || 1;
    const pct = Math.min(100, Math.round(cur / Math.max(1, max) * 100));
    const done = cur >= max;
    progHtml = `<div class="tpop-bar-wrap"><div class="tpop-bar${done?' done':''}" style="width:${pct}%"></div></div>
<div class="tpop-prog${done?' done':''}">${cur} / ${max} · ${pct}%${done?' ✓':''}</div>`;
  }

  let rewardHtml = '';
  if (opts.rewards) {
    const parts = [];
    if (opts.rewards.gold)     parts.push(`+${opts.rewards.gold}💰`);
    if (opts.rewards.diamonds) parts.push(`+${opts.rewards.diamonds}💎`);
    if (opts.rewards.xp)       parts.push(`+${opts.rewards.xp}⭐`);
    if (parts.length) rewardHtml = `<div class="tpop-rewards">🎁 ${parts.join('  ')}</div>`;
  }

  const wrap = document.createElement('div');
  wrap.id = 'tsk-popup-overlay';
  wrap.innerHTML = `<div class="tpop-panel">
  <button class="tpop-close" id="tpop-close-btn">✕</button>
  <div class="tpop-icon">${_e(opts.icon||'📦')}</div>
  <div class="tpop-name">${_e(opts.name||'')}</div>
  <div class="tpop-divider"></div>
  ${badgeHtml}
  <div class="tpop-desc">${_e(opts.desc||'')}</div>
  ${progHtml}
  ${rewardHtml}
</div>`;

  const root = document.getElementById('tsk-overlay') || document.body;
  root.appendChild(wrap);
  wrap.addEventListener('click', e => { if (e.target === wrap) wrap.remove(); });
  wrap.querySelector('#tpop-close-btn').addEventListener('click', () => wrap.remove());
};

/* ── Тост с наградой после клейма ── */
window.TasksHTML_showReward = function(r, onDone) {
  _injectCSS();
  document.querySelector('.tsk-reward-toast')?.remove();
  const parts = [];
  if ((r.gold     || 0) > 0) parts.push(`+${r.gold}💰`);
  if ((r.diamonds || 0) > 0) parts.push(`+${r.diamonds}💎`);
  if ((r.xp       || 0) > 0) parts.push(`+${r.xp}⭐`);
  const itemsText = parts.length ? parts.join('  ') : '🎁';

  const toast = document.createElement('div');
  toast.className = 'tsk-reward-toast';
  toast.innerHTML = `<div class="tsk-rt-title">✅ Получено!</div><div class="tsk-rt-items">${itemsText}</div>`;
  const root = document.getElementById('tsk-overlay') || document.body;
  root.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { toast.remove(); if (onDone) onDone(); }, 380);
  }, 1300);
};
})();
