/* ============================================================
   PaymentStatus — общий статус-оверлей оплаты (киберпанк).
   После открытия CryptoPay показывает «⚡ Проверяю оплату…»,
   сам превращается в «✅ Получено!» когда товар выдан.
   Резервная кнопка «Я уже оплатил» появляется через 20 сек.

   Использование (из любого overlay-потока покупки USDT):
     PaymentStatus.show({ title:'Доспех Светоносного Бога',
                          onManualCheck: () => {...} });
     ...когда polling/выдача подтвердились:
     PaymentStatus.success('✅ Броня получена!');
     ...или при отмене/ошибке:
     PaymentStatus.hide();
   ============================================================ */
(() => {
  const ID = 'pay-status-root';
  let _manualTimer = null;

  function _injectCSS() {
    if (document.getElementById('pay-status-css')) return;
    const s = document.createElement('style');
    s.id = 'pay-status-css';
    s.textContent = `
#${ID}{position:fixed;inset:0;z-index:10200;display:flex;align-items:center;justify-content:center;
  background:rgba(4,7,16,.82);backdrop-filter:blur(6px)}
#${ID} .ps-card{position:relative;width:min(320px,86vw);border-radius:18px;padding:26px 22px 22px;
  background:linear-gradient(160deg,#0d1426,#070b16);border:1px solid #1b2742;
  box-shadow:0 0 0 1px rgba(0,240,255,.08),0 18px 50px rgba(0,0,0,.6),inset 0 0 50px rgba(0,240,255,.04);
  text-align:center;overflow:hidden}
#${ID} .ps-card::before{content:'';position:absolute;inset:0;pointer-events:none;
  background-image:linear-gradient(rgba(0,240,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,240,255,.04) 1px,transparent 1px);
  background-size:34px 34px;mask-image:radial-gradient(ellipse at 50% 0%,#000 40%,transparent 85%)}
#${ID} .ps-ring{width:78px;height:78px;margin:6px auto 16px;border-radius:50%;
  border:3px solid rgba(0,240,255,.15);border-top-color:#00f0ff;animation:ps-spin .9s linear infinite;
  box-shadow:0 0 22px rgba(0,240,255,.4)}
@keyframes ps-spin{to{transform:rotate(360deg)}}
#${ID} .ps-check{width:84px;height:84px;margin:6px auto 16px;border-radius:50%;font-size:44px;
  display:flex;align-items:center;justify-content:center;background:radial-gradient(circle,rgba(60,208,132,.25),transparent 70%);
  border:3px solid #3cd084;box-shadow:0 0 30px rgba(60,208,132,.5);animation:ps-pop .4s ease}
@keyframes ps-pop{0%{transform:scale(.5);opacity:0}100%{transform:scale(1);opacity:1}}
#${ID} .ps-title{font-size:15px;font-weight:800;color:#fff;letter-spacing:.4px;margin-bottom:7px}
#${ID} .ps-title.ok{color:#3cd084}
#${ID} .ps-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#00f0ff;
  box-shadow:0 0 10px #00f0ff;animation:ps-blink 1s infinite;margin-right:6px;vertical-align:middle}
@keyframes ps-blink{50%{opacity:.2}}
#${ID} .ps-sub{font-size:11px;color:#7e95c4;line-height:1.6;padding:0 6px}
#${ID} .ps-item{font-size:11px;color:#a0c8ff;margin-top:4px;font-weight:700}
#${ID} .ps-bar{height:4px;background:#15203a;border-radius:4px;margin:16px 14px 0;overflow:hidden}
#${ID} .ps-bar>i{display:block;height:100%;width:5%;background:linear-gradient(90deg,#00f0ff,#ff2e97);
  box-shadow:0 0 10px #00f0ff;animation:ps-fill 30s linear forwards}
@keyframes ps-fill{to{width:100%}}
#${ID} .ps-manual{margin-top:18px;display:none}
#${ID} .ps-manual.show{display:block}
#${ID} .ps-manual button{background:transparent;border:1px solid #233258;color:#5d76a8;
  font-size:11px;font-weight:700;border-radius:9px;padding:9px 14px;cursor:pointer;width:100%}
#${ID} .ps-manual button:active{transform:scale(.97)}
#${ID} .ps-close{position:absolute;top:10px;right:12px;width:28px;height:28px;border-radius:8px;
  background:rgba(220,50,80,.18);border:1px solid rgba(255,80,120,.3);color:#fca5a5;font-size:13px;
  cursor:pointer;display:flex;align-items:center;justify-content:center}`;
    document.head.appendChild(s);
  }

  function show(opts) {
    opts = opts || {};
    _injectCSS();
    hide();
    const wrap = document.createElement('div');
    wrap.id = ID;
    const itemLine = opts.title ? `<div class="ps-item">${opts.title}</div>` : '';
    wrap.innerHTML = `
      <div class="ps-card">
        <button class="ps-close" title="Закрыть">✕</button>
        <div class="ps-ring"></div>
        <div class="ps-title"><span class="ps-dot"></span>Проверяю оплату…</div>
        <div class="ps-sub">Подтверждаю платёж — это пара секунд.<br>Можешь смело ждать, броня придёт сама.</div>
        ${itemLine}
        <div class="ps-bar"><i></i></div>
        <div class="ps-manual"><button>Я уже оплатил — проверить</button></div>
      </div>`;
    document.body.appendChild(wrap);

    wrap.querySelector('.ps-close').onclick = () => hide();
    const manualWrap = wrap.querySelector('.ps-manual');
    const manualBtn = manualWrap.querySelector('button');
    manualBtn.onclick = () => {
      manualBtn.textContent = '⏳ Проверяю…';
      manualBtn.disabled = true;
      try { opts.onManualCheck && opts.onManualCheck(); } catch (_) { }
      setTimeout(() => { manualBtn.textContent = 'Я уже оплатил — проверить'; manualBtn.disabled = false; }, 4000);
    };
    // Кнопка-резерв появляется через 20 сек ожидания.
    clearTimeout(_manualTimer);
    _manualTimer = setTimeout(() => { manualWrap.classList.add('show'); }, 20000);
  }

  function success(msg) {
    const wrap = document.getElementById(ID);
    if (!wrap) return;
    clearTimeout(_manualTimer);
    const card = wrap.querySelector('.ps-card');
    card.innerHTML = `
      <div class="ps-check">✅</div>
      <div class="ps-title ok">${msg || 'Получено!'}</div>
      <div class="ps-sub">Спасибо за покупку! ⚔️</div>`;
    try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success'); } catch (_) { }
    setTimeout(hide, 2200);
  }

  function hide() {
    clearTimeout(_manualTimer);
    document.getElementById(ID)?.remove();
  }

  function isOpen() { return !!document.getElementById(ID); }

  window.PaymentStatus = { show, success, hide, isOpen };
})();
