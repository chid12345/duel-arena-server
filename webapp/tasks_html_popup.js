/* ============================================================
   Tasks HTML Popup — инфо-попап при тапе + тост награды
   ============================================================ */
(function() {
const CSS = `<style id="tsk-popup-style">
#tsk-popup-overlay{position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;z-index:200;animation:tpopFade .15s ease-out}
@keyframes tpopFade{from{opacity:0}to{opacity:1}}
.tpop-panel{background:linear-gradient(160deg,rgba(8,2,20,.99),rgba(2,4,16,.99));border:1px solid rgba(0,240,255,.5);border-radius:20px;padding:0 0 20px;width:calc(100% - 48px);max-width:320px;position:relative;overflow:hidden;box-shadow:0 0 28px rgba(0,240,255,.18),0 0 60px rgba(0,240,255,.07),inset 0 0 24px rgba(0,240,255,.03);animation:tpopPop .22s cubic-bezier(.34,1.56,.64,1)}
@keyframes tpopPop{from{transform:scale(.8);opacity:0}to{transform:scale(1);opacity:1}}
.tpop-panel::before{content:'';display:block;height:3px;background:linear-gradient(90deg,#ff3ba8,#00f0ff,#b45aff,#00f0ff,#ff3ba8);background-size:200%;animation:tpopShift 3s linear infinite}
@keyframes tpopShift{0%{background-position:0%}100%{background-position:200%}}
.tpop-panel::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,255,220,.018) 3px 4px);pointer-events:none;border-radius:20px}
.tpop-close{position:absolute;top:10px;right:12px;background:rgba(255,59,168,.15);border:1px solid rgba(255,59,168,.5);border-radius:50%;color:#ff7acb;font-size:11px;cursor:pointer;width:26px;height:26px;display:flex;align-items:center;justify-content:center;z-index:2;transition:all .15s;line-height:1;box-shadow:0 0 8px rgba(255,59,168,.2)}
.tpop-close:active{transform:scale(.85);background:rgba(255,59,168,.35)}
@keyframes tpopIconPulse{0%,100%{filter:drop-shadow(0 0 12px rgba(0,240,255,.6)) drop-shadow(0 0 4px rgba(0,240,255,.3))}50%{filter:drop-shadow(0 0 22px rgba(0,240,255,.9)) drop-shadow(0 0 8px rgba(0,240,255,.5))}}
.tpop-icon{font-size:48px;text-align:center;padding:18px 0 10px;animation:tpopIconPulse 2.5s ease-in-out infinite}
.tpop-name{font-size:16px;font-weight:800;text-align:center;background:linear-gradient(90deg,#ff3ba8,#00f0ff);-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:.4px;margin-bottom:2px;padding:0 28px}
.tpop-divider{height:1px;background:linear-gradient(90deg,transparent,rgba(0,240,255,.45),transparent);margin:8px 16px 12px}
.tpop-desc{font-size:11px;color:#80c8ff;text-align:center;line-height:1.65;white-space:pre-wrap;margin-bottom:10px;padding:0 18px;opacity:.88}
.tpop-badge{font-size:11px;font-weight:800;color:#00f0ff;background:rgba(0,240,255,.08);border:1px solid rgba(0,240,255,.4);border-radius:20px;padding:4px 18px;text-align:center;display:block;width:fit-content;margin:0 auto 12px;box-shadow:0 0 10px rgba(0,240,255,.15),inset 0 0 8px rgba(0,240,255,.05);letter-spacing:.6px;text-shadow:0 0 8px rgba(0,240,255,.5)}
.tpop-prog{font-size:10px;font-weight:700;color:#ffe888;text-align:center;margin:5px 0 8px;text-shadow:0 0 6px rgba(255,232,136,.4)}
.tpop-prog.done{color:#80ff9c;text-shadow:0 0 6px rgba(128,255,156,.5)}
.tpop-bar-wrap{height:5px;border-radius:3px;background:rgba(255,255,255,.07);overflow:hidden;margin:4px 20px}
.tpop-bar{height:100%;border-radius:3px;background:linear-gradient(90deg,#5096ff,#00f0ff);box-shadow:0 0 8px rgba(0,240,255,.6)}
.tpop-bar.done{background:linear-gradient(90deg,#3cc864,#80ff9c);box-shadow:0 0 8px rgba(60,200,100,.6)}
.tpop-rewards{font-size:16px;font-weight:800;color:#ffd166;text-align:center;margin-top:10px;letter-spacing:2px;text-shadow:0 0 16px rgba(255,209,102,.8),0 0 32px rgba(255,209,102,.4);filter:drop-shadow(0 0 6px rgba(255,209,102,.5))}
.tsk-reward-toast{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center;z-index:300;pointer-events:none;background:rgba(0,0,0,.45);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-radius:60px;padding:12px 28px 14px;animation:tskRwdIn .28s cubic-bezier(.34,1.56,.64,1) both;transition:opacity .38s ease;white-space:nowrap}
@keyframes tskRwdIn{from{transform:translate(-50%,-50%) scale(.6);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}
.tsk-rt-title{font-size:9px;font-weight:700;color:rgba(255,255,255,.55);letter-spacing:3px;text-transform:uppercase;display:block;margin-bottom:4px}
.tsk-rt-items{font-size:20px;font-weight:900;color:#ffd166;letter-spacing:3px;display:block;text-shadow:0 0 18px rgba(255,209,102,1),0 0 36px rgba(255,209,102,.6),0 2px 8px rgba(0,0,0,.95);filter:drop-shadow(0 0 8px rgba(255,209,102,.6))}
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
    if (parts.length) rewardHtml = `<div class="tpop-rewards">${parts.join('  ')}</div>`;
  }

  const icon = opts.icon || '✨';

  const wrap = document.createElement('div');
  wrap.id = 'tsk-popup-overlay';
  wrap.innerHTML = `<div class="tpop-panel">
  <button class="tpop-close" id="tpop-close-btn">✕</button>
  <div class="tpop-icon">${_e(icon)}</div>
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
  toast.innerHTML = `<div class="tsk-rt-title">✅ Получено</div><div class="tsk-rt-items">${itemsText}</div>`;
  const root = document.getElementById('tsk-overlay') || document.body;
  root.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => { toast.remove(); if (onDone) onDone(); }, 380);
  }, 1300);
};
})();
