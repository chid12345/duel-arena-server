/* ============================================================
   Referral Confirm Popup — киберпанк модальное окно после
   подачи заявки на вывод USDT. Заменяет улетающий тост из
   v2.23.41 (игрок не успевал прочитать). Стиль повторяет
   tasks_html_popup.js (.tsk-reward-toast) для единого языка.
   ============================================================ */
(function() {
const CSS = `<style id="rf-conf-style">
#rf-conf-ov{position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;z-index:9999;animation:rfcOvFade .15s ease-out;touch-action:none}
@keyframes rfcOvFade{from{opacity:0}to{opacity:1}}
.rfc-panel{background:linear-gradient(160deg,rgba(8,2,20,.99),rgba(2,4,16,.99));border:1px solid rgba(0,240,255,.5);border-radius:20px;padding:0 0 18px;width:calc(100% - 48px);max-width:340px;position:relative;overflow:hidden;box-shadow:0 0 28px rgba(0,240,255,.18),0 0 60px rgba(0,240,255,.07),inset 0 0 24px rgba(0,240,255,.03);animation:rfcPop .25s cubic-bezier(.34,1.56,.64,1)}
@keyframes rfcPop{from{transform:scale(.7);opacity:0}to{transform:scale(1);opacity:1}}
.rfc-panel::before{content:'';display:block;height:3px;background:linear-gradient(90deg,#3cc864,#00f0ff,#80ff9c,#00f0ff,#3cc864);background-size:200%;animation:rfcShift 3s linear infinite}
@keyframes rfcShift{0%{background-position:0%}100%{background-position:200%}}
.rfc-panel::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(60,200,100,.018) 3px 4px);pointer-events:none;border-radius:20px}
.rfc-close{position:absolute;top:10px;right:12px;background:rgba(255,59,168,.15);border:1px solid rgba(255,59,168,.5);border-radius:50%;color:#ff7acb;font-size:11px;cursor:pointer;width:26px;height:26px;display:flex;align-items:center;justify-content:center;z-index:2;transition:all .15s;line-height:1;box-shadow:0 0 8px rgba(255,59,168,.2)}
.rfc-close:active{transform:scale(.85);background:rgba(255,59,168,.35)}
@keyframes rfcIconPulse{0%,100%{filter:drop-shadow(0 0 12px rgba(60,200,100,.6))}50%{filter:drop-shadow(0 0 22px rgba(60,200,100,.9))}}
.rfc-icon{font-size:42px;text-align:center;padding:20px 0 6px;animation:rfcIconPulse 2.4s ease-in-out infinite;position:relative;z-index:1}
.rfc-title{font-size:13px;font-weight:800;text-align:center;color:#80ff9c;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px;text-shadow:0 0 12px rgba(128,255,156,.6);position:relative;z-index:1}
.rfc-divider{height:1px;background:linear-gradient(90deg,transparent,rgba(60,200,100,.45),transparent);margin:8px 16px 10px}
.rfc-amount{font-size:24px;font-weight:800;text-align:center;color:#ffd166;letter-spacing:1px;margin-bottom:2px;text-shadow:0 0 16px rgba(255,209,102,.7);position:relative;z-index:1}
.rfc-num{font-size:10px;text-align:center;color:#80c8ff;letter-spacing:2px;margin-bottom:14px;opacity:.85;position:relative;z-index:1}
.rfc-steps{font-size:11px;color:#cfe5ff;text-align:left;line-height:1.7;padding:0 22px;margin-bottom:14px;position:relative;z-index:1}
.rfc-cmd{display:inline-block;font-family:monospace;background:rgba(0,240,255,.08);border:1px solid rgba(0,240,255,.4);border-radius:5px;padding:1px 6px;margin:0 1px;color:#00f0ff;font-size:11px}
.rfc-ok{display:block;margin:0 22px;padding:11px 0;border-radius:10px;background:linear-gradient(135deg,#3cc864,#2da050);border:1px solid rgba(128,255,156,.5);color:#fff;font-size:13px;font-weight:800;letter-spacing:2px;text-align:center;cursor:pointer;box-shadow:0 0 14px rgba(60,200,100,.35);transition:transform .12s;position:relative;z-index:1;text-transform:uppercase}
.rfc-ok:active{transform:scale(.96)}
</style>`;

let _cssInjected = false;
function _injectCSS() {
  if (_cssInjected || document.getElementById('rf-conf-style')) return;
  document.head.insertAdjacentHTML('beforeend', CSS);
  _cssInjected = true;
}

window.ReferralConfirmPopup = {
  /** Показать модальное окно после успешной подачи заявки на вывод.
   *  @param {{wid:number, amount:number}} opts */
  show(opts) {
    _injectCSS();
    document.getElementById('rf-conf-ov')?.remove();
    const wid = Number(opts.wid || 0);
    const amount = Number(opts.amount || 0);
    const amt = amount.toFixed(2);
    const ov = document.createElement('div');
    ov.id = 'rf-conf-ov';
    ov.innerHTML = `<div class="rfc-panel">
  <button class="rfc-close" id="rfc-x">✕</button>
  <div class="rfc-icon">✅</div>
  <div class="rfc-title">Заявка принята</div>
  <div class="rfc-divider"></div>
  <div class="rfc-amount">$${amt} USDT</div>
  <div class="rfc-num">ЗАЯВКА #${wid}</div>
  <div class="rfc-steps">
    <b>1.</b> Открой <b>@CryptoBot</b><br>
    <b>2.</b> Переведи <b>$${amt} USDT</b> получателю<br>
    <b>3.</b> Вернись сюда и набери:<br>
    &nbsp;&nbsp;&nbsp;<span class="rfc-cmd">/payout_done ${wid}</span>
  </div>
  <button class="rfc-ok" id="rfc-ok">Понятно</button>
</div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.querySelector('#rfc-x').addEventListener('click', close);
    ov.querySelector('#rfc-ok').addEventListener('click', close);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
  },
};
})();
