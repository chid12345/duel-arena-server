/* ============================================================
   Referral HTML Overlay — киберпанк/неон тема для "Рефералка"
   ============================================================ */
(() => {
const CSS = `
.rf-ov{position:fixed;top:0;left:0;right:0;bottom:76px;z-index:9100;display:flex;justify-content:center;background:radial-gradient(ellipse at 50% 0%,#1a0a2a 0%,#05050a 55%),#000;color:#e6f7ff;overflow-y:auto;overflow-x:hidden;font-family:-apple-system,"Segoe UI",Roboto,sans-serif;touch-action:pan-y}
.rf-ov::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,255,220,.025) 3px 4px);pointer-events:none;z-index:1}
.rf-ov::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 20% 30%,rgba(255,40,170,.12),transparent 40%),radial-gradient(circle at 80% 70%,rgba(0,230,255,.10),transparent 40%);pointer-events:none;z-index:1}
.rf-panel{width:100%;max-width:430px;position:relative;z-index:2;padding:0 0 24px}
.rf-hdr{display:flex;align-items:center;justify-content:space-between;padding:16px 16px 12px;border-bottom:1px solid rgba(0,240,255,.12)}
.rf-hdr-title{font-size:17px;font-weight:800;letter-spacing:.5px;background:linear-gradient(90deg,#ff3ba8,#00f0ff);-webkit-background-clip:text;background-clip:text;color:transparent;display:flex;align-items:center;gap:8px}
.rf-hdr-icon{font-size:20px;filter:drop-shadow(0 0 8px rgba(0,240,255,.7))}
@keyframes rfCloseGlow{0%,100%{box-shadow:0 0 8px rgba(255,59,168,.4)}50%{box-shadow:0 0 18px rgba(255,59,168,.8)}}
.rf-close{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:rgba(255,59,168,.15);border:1px solid rgba(255,59,168,.5);color:#ff7acb;font-size:14px;font-weight:700;cursor:pointer;user-select:none;animation:rfCloseGlow 2.5s ease-in-out infinite;flex-shrink:0}
.rf-close:active{transform:scale(.88)}
.rf-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:12px 14px;padding:4px;background:rgba(0,240,255,.06);border-radius:12px;border:1px solid rgba(0,240,255,.15)}
.rf-tab{padding:9px 0;border-radius:9px;text-align:center;font-size:12px;font-weight:700;cursor:pointer;user-select:none;color:#80a8c0;letter-spacing:.3px;transition:all .2s}
.rf-tab.on{background:linear-gradient(135deg,rgba(0,240,255,.2),rgba(255,59,168,.15));color:#e6f7ff;box-shadow:0 0 12px rgba(0,240,255,.2),inset 0 0 8px rgba(0,240,255,.08);border:1px solid rgba(0,240,255,.4)}
.rf-tc{display:none}.rf-tc.on{display:block}
.rf-cards{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 14px 10px}
.rf-card{padding:12px 10px 14px;border-radius:14px;text-align:center;background:linear-gradient(135deg,rgba(20,5,35,.9),rgba(5,5,18,.9));position:relative;overflow:hidden}
.rf-card::before{content:"";position:absolute;inset:0;border-radius:14px;padding:1px;background:linear-gradient(135deg,rgba(0,240,255,.5),rgba(255,59,168,.3));-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
.rf-card.gold::before{background:linear-gradient(135deg,rgba(255,200,60,.6),rgba(255,59,168,.3))}
.rf-card-icon{font-size:16px;margin-bottom:4px;display:block}
.rf-card-label{font-size:10px;font-weight:700;color:#80c8ff;letter-spacing:.5px;margin-bottom:6px}
.rf-card-val{font-size:22px;font-weight:900;color:#00f0ff;text-shadow:0 0 12px currentColor;line-height:1}
.rf-card.gold .rf-card-val{color:#ffc83c;text-shadow:0 0 12px rgba(255,200,60,.8)}
.rf-bal{margin:2px 14px 10px;padding:10px 14px;border-radius:12px;background:rgba(0,0,0,.4);border:1px solid rgba(0,240,255,.15);font-size:11px;color:#80c8ff;text-align:center;line-height:1.5}
.rf-lnk-lbl{font-size:10px;font-weight:700;color:#80a8c0;letter-spacing:.5px;margin:0 14px 6px}
.rf-lnk-box{margin:0 14px 14px;padding:11px 14px;border-radius:12px;background:rgba(0,240,255,.05);border:1px solid rgba(0,240,255,.3);font-size:11px;color:#60c8e8;box-shadow:0 0 10px rgba(0,240,255,.08);word-break:break-all;letter-spacing:.2px}
.rf-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 14px 10px}
.rf-btn{padding:14px 10px;border-radius:14px;text-align:center;font-size:13px;font-weight:800;cursor:pointer;user-select:none;letter-spacing:.3px;transition:transform .12s,box-shadow .12s;position:relative;overflow:hidden;border:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.rf-btn::before{content:"";position:absolute;top:0;left:0;right:0;height:40%;background:rgba(255,255,255,.08);border-radius:14px 14px 0 0;pointer-events:none}
.rf-btn:active{transform:scale(.93)}
.rf-btn-copy{background:linear-gradient(135deg,#0088bb,#00c8e8);color:#fff;box-shadow:0 4px 16px rgba(0,200,255,.35),0 0 20px rgba(0,200,255,.12)}
.rf-btn-copy:active{box-shadow:0 2px 8px rgba(0,200,255,.5),0 0 30px rgba(0,200,255,.3)}
.rf-btn-share{background:linear-gradient(135deg,#aa0055,#ff3ba8);color:#fff;box-shadow:0 4px 16px rgba(255,59,168,.35),0 0 20px rgba(255,59,168,.12)}
.rf-btn-share:active{box-shadow:0 2px 8px rgba(255,59,168,.5),0 0 30px rgba(255,59,168,.3)}
.rf-wd{margin:4px 14px 0;padding:13px 14px;border-radius:14px;text-align:center;cursor:pointer;user-select:none;touch-action:manipulation;transition:transform .12s;-webkit-tap-highlight-color:transparent;border:none}
.rf-wd:active{transform:scale(.97)}
.rf-wd.ready{background:linear-gradient(135deg,#0a4020,#1a6a38);border:1px solid rgba(60,200,100,.4);box-shadow:0 0 14px rgba(60,200,100,.2)}
.rf-wd.wait{background:rgba(10,10,30,.6);border:1px solid rgba(60,60,120,.3)}
.rf-wd.none{background:rgba(10,10,30,.5);border:1px solid rgba(60,60,100,.25)}
.rf-wd-top{font-size:13px;font-weight:800;color:#3cc864;margin-bottom:3px}
.rf-wd.wait .rf-wd-top,.rf-wd.none .rf-wd-top{color:#8888cc;font-size:12px}
.rf-wd-sub{font-size:10px;color:#6868aa;line-height:1.4}
.rf-steps{display:flex;flex-direction:column;gap:8px;margin:0 14px 14px}
.rf-step{display:flex;align-items:flex-start;gap:12px;padding:12px;border-radius:14px;background:linear-gradient(135deg,rgba(20,5,35,.9),rgba(5,5,18,.9));border:1px solid rgba(0,240,255,.2)}
.rf-snum{width:28px;height:28px;border-radius:50%;flex-shrink:0;display:grid;place-items:center;font-size:13px;font-weight:900;background:linear-gradient(135deg,rgba(0,240,255,.25),rgba(255,59,168,.15));border:1px solid rgba(0,240,255,.5);color:#00f0ff;text-shadow:0 0 8px currentColor}
.rf-stitle{font-size:12px;font-weight:700;color:#e6f7ff;margin-bottom:3px}
.rf-ssub{font-size:10px;color:#80c8ff;opacity:.85;line-height:1.4}
.rf-sch-hdr{margin:0 14px 8px;padding:11px 14px;border-radius:12px;background:linear-gradient(135deg,rgba(255,200,60,.12),rgba(255,59,168,.08));border:1px solid rgba(255,200,60,.3);text-align:center;font-size:12px;font-weight:800;color:#ffc83c;letter-spacing:.5px;text-shadow:0 0 10px rgba(255,200,60,.5)}
.rf-tiers{display:flex;flex-direction:column;gap:4px;margin:0 14px}
.rf-tier{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-radius:10px}
.rf-tier:nth-child(odd){background:rgba(20,10,40,.8);border:1px solid rgba(0,240,255,.12)}
.rf-tier:nth-child(even){background:rgba(10,5,25,.8);border:1px solid rgba(255,59,168,.1)}
.rf-tier-r{font-size:10px;color:#b0c8e0}
.rf-tier-p{font-size:11px;font-weight:800;text-shadow:0 0 8px currentColor}
.rf-tier-p.t1{color:#7adfaa}.rf-tier-p.t2{color:#5ac8f0}.rf-tier-p.t3{color:#ffc83c}
@keyframes rfToast{0%{opacity:0;transform:translateY(10px)}15%{opacity:1;transform:translateY(0)}85%{opacity:1}100%{opacity:0;transform:translateY(-6px)}}
.rf-toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(10,20,40,.95);border:1px solid rgba(0,240,255,.4);border-radius:10px;padding:9px 18px;font-size:12px;font-weight:700;color:#e6f7ff;text-align:center;z-index:9200;pointer-events:none;animation:rfToast 2.2s ease forwards;white-space:nowrap;box-shadow:0 0 16px rgba(0,240,255,.25)}
`;

const ReferralHTML = (() => {
  let _el = null;

  function _inject() {
    if (document.getElementById('rf-ov-style')) return;
    const s = document.createElement('style');
    s.id = 'rf-ov-style'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function _toast(msg) {
    const t = document.createElement('div');
    t.className = 'rf-toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2300);
  }

  function _tap(el, cb) {
    let sy = 0;
    el.addEventListener('pointerdown', e => { sy = e.clientY; }, { passive: true });
    el.addEventListener('pointerup', e => {
      if (Math.abs(e.clientY - sy) > 10) return;
      e.stopPropagation(); cb();
    });
  }

  function _build(rd) {
    const link = rd.link || '';
    const inv  = rd.invited_count      || 0;
    const prem = rd.paying_subscribers || 0;
    const usdtBal   = rd.usdt_balance      || 0;
    const usdtTotal = rd.total_reward_usdt || 0;
    const canWd   = rd.can_withdraw   || false;
    const coolH   = rd.cooldown_hours || 0;
    const wdMin   = rd.withdraw_min   || 5;

    const wdClass = canWd ? 'ready' : (coolH > 0 ? 'wait' : 'none');
    const wdTop = canWd
      ? `💸 Вывести $${usdtBal.toFixed(2)} USDT`
      : (coolH > 0 ? `⏳ Следующий вывод через ${coolH}ч` : `🔥 Минимум $${wdMin} для вывода`);
    const wdSub = canWd
      ? 'Перевод через @CryptoBot'
      : (coolH > 0 ? 'Вывод доступен раз в сутки' : `У вас: $${usdtBal.toFixed(4)} USDT · зарабатывай больше`);

    const premLine = prem > 0
      ? `<div style="font-size:10px;color:#ffc83c;text-align:center;margin:0 14px 8px">⭐ Из них купили Premium: ${prem}</div>`
      : '';
    const balLine = usdtBal > 0
      ? `<div class="rf-bal" style="border-color:rgba(60,200,100,.3);color:#80ffb0">💸 Доступно к выводу: $${usdtBal.toFixed(4)} USDT</div>`
      : `<div class="rf-bal">Баланс: $0.00 — зарабатывай приглашая</div>`;

    const el = document.createElement('div');
    el.className = 'rf-ov'; el.id = 'rf-root';
    el.innerHTML = `
<div class="rf-panel">
  <div class="rf-hdr">
    <div class="rf-hdr-title"><span class="rf-hdr-icon">🔗</span>РЕФЕРАЛКА</div>
    <div class="rf-close" id="rf-x">✕</div>
  </div>
  <div class="rf-tabs">
    <div class="rf-tab on" id="rf-t-stats">📊 Статистика</div>
    <div class="rf-tab"   id="rf-t-info">ℹ️ Условия</div>
  </div>
  <div class="rf-tc on" id="rf-stats">
    <div class="rf-cards">
      <div class="rf-card">
        <span class="rf-card-icon">👥</span>
        <div class="rf-card-label">ПРИГЛАШЕНО</div>
        <div class="rf-card-val">${inv}</div>
      </div>
      <div class="rf-card gold">
        <span class="rf-card-icon">💰</span>
        <div class="rf-card-label">USDT ЗАРАБОТАНО</div>
        <div class="rf-card-val">$${usdtTotal.toFixed(2)}</div>
      </div>
    </div>
    ${premLine}
    ${balLine}
    <div class="rf-lnk-lbl">🔗 ТВОЯ РЕФЕРАЛЬНАЯ ССЫЛКА</div>
    <div class="rf-lnk-box" id="rf-link">${link.replace('https://','')}</div>
    <div class="rf-btns">
      <div class="rf-btn rf-btn-copy" id="rf-copy">📋 Скопировать</div>
      <div class="rf-btn rf-btn-share" id="rf-share">💬 Поделиться</div>
    </div>
    <div class="rf-wd ${wdClass}" id="rf-wd">
      <div class="rf-wd-top" id="rf-wd-top">${wdTop}</div>
      <div class="rf-wd-sub">${wdSub}</div>
    </div>
  </div>
  <div class="rf-tc" id="rf-info">
    <div class="rf-steps">
      <div class="rf-step"><div class="rf-snum">1</div><div><div class="rf-stitle">Поделись ссылкой с другом</div><div class="rf-ssub">Кнопка «Скопировать» на вкладке «Статистика»</div></div></div>
      <div class="rf-step"><div class="rf-snum">2</div><div><div class="rf-stitle">Друг регистрируется по ссылке</div><div class="rf-ssub">Один раз — привязка навсегда</div></div></div>
      <div class="rf-step"><div class="rf-snum">3</div><div><div class="rf-stitle">Друг покупает Premium — ты получаешь USDT</div><div class="rf-ssub">Бонус USDT зачисляется автоматически</div></div></div>
    </div>
    <div class="rf-sch-hdr">🔥 СХЕМА ВОЗНАГРАЖДЕНИЙ</div>
    <div class="rf-tiers">
      <div class="rf-tier"><span class="rf-tier-r">1–10 Premium-покупок</span><span class="rf-tier-p t1">5% разово → USDT</span></div>
      <div class="rf-tier"><span class="rf-tier-r">11–30 Premium-покупок</span><span class="rf-tier-p t2">7% разово → USDT</span></div>
      <div class="rf-tier"><span class="rf-tier-r">31+ Premium-покупок</span><span class="rf-tier-p t3">10% всегда → USDT</span></div>
    </div>
  </div>
</div>`;
    return { el, link, usdtBal, canWd };
  }

  function _wire(el, link, usdtBal, canWd) {
    // Close
    _tap(el.querySelector('#rf-x'), () => ReferralHTML.close());

    // Tab switch
    _tap(el.querySelector('#rf-t-stats'), () => {
      el.querySelector('#rf-t-stats').classList.add('on');
      el.querySelector('#rf-t-info').classList.remove('on');
      el.querySelector('#rf-stats').classList.add('on');
      el.querySelector('#rf-info').classList.remove('on');
      try { tg?.HapticFeedback?.impactOccurred('light'); } catch(_) {}
    });
    _tap(el.querySelector('#rf-t-info'), () => {
      el.querySelector('#rf-t-info').classList.add('on');
      el.querySelector('#rf-t-stats').classList.remove('on');
      el.querySelector('#rf-info').classList.add('on');
      el.querySelector('#rf-stats').classList.remove('on');
      try { tg?.HapticFeedback?.impactOccurred('light'); } catch(_) {}
    });

    // Copy
    _tap(el.querySelector('#rf-copy'), () => {
      try { tg?.HapticFeedback?.notificationOccurred('success'); } catch(_) {}
      navigator.clipboard?.writeText(link)
        .then(() => _toast('✅ Ссылка скопирована!'))
        .catch(() => { try { tg?.openLink?.(link); } catch(_) {} });
    });

    // Share
    _tap(el.querySelector('#rf-share'), () => {
      try { tg?.HapticFeedback?.impactOccurred('medium'); } catch(_) {}
      const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('⚔️ Присоединяйся к Duel Arena — PvP-арена в Telegram!')}`;
      try { tg?.openLink?.(url); } catch(_) {}
    });

    // Withdraw
    if (canWd) {
      let busy = false;
      _tap(el.querySelector('#rf-wd'), async () => {
        if (busy) return; busy = true;
        try { tg?.HapticFeedback?.impactOccurred('heavy'); } catch(_) {}
        const topEl = el.querySelector('#rf-wd-top');
        topEl.textContent = '⏳ Переводим через @CryptoBot...';
        try {
          const res = await post('/api/referral/withdraw');
          if (res.ok) {
            try { tg?.HapticFeedback?.notificationOccurred('success'); } catch(_) {}
            topEl.textContent = `✅ $${res.amount?.toFixed(2)} USDT отправлен!`;
            topEl.style.color = '#7affb8';
            _toast('✅ USDT отправлен через @CryptoBot!');
          } else if (res.cryptobot_required) {
            topEl.textContent = `💸 Вывести $${usdtBal.toFixed(2)} USDT`;
            _toast('📲 Откройте @CryptoBot в Telegram один раз');
            try { tg?.openLink?.('https://t.me/CryptoBot'); } catch(_) {}
            busy = false;
          } else {
            topEl.textContent = `💸 Вывести $${usdtBal.toFixed(2)} USDT`;
            _toast(`❌ ${res.reason}`);
            busy = false;
          }
        } catch(_) {
          topEl.textContent = `💸 Вывести $${usdtBal.toFixed(2)} USDT`;
          _toast('❌ Нет соединения'); busy = false;
        }
      });
    }
  }

  return {
    show() {
      if (_el) return;
      _inject();
      // Show loading state while fetching
      const loader = document.createElement('div');
      loader.className = 'rf-ov'; loader.id = 'rf-root';
      loader.innerHTML = `<div class="rf-panel"><div class="rf-hdr"><div class="rf-hdr-title"><span class="rf-hdr-icon">🔗</span>РЕФЕРАЛКА</div><div class="rf-close" id="rf-x">✕</div></div><div style="text-align:center;padding:40px 20px;color:#80c8ff;font-size:13px">⏳ Загрузка...</div></div>`;
      _el = loader;
      document.body.appendChild(_el);
      _tap(_el.querySelector('#rf-x'), () => ReferralHTML.close());

      get('/api/referral').then(rd => {
        if (!_el) return;
        _el.remove();
        const { el, link, usdtBal, canWd } = _build(rd);
        _el = el;
        document.body.appendChild(_el);
        _wire(_el, link, usdtBal, canWd);
      }).catch(() => {
        if (!_el) return;
        _el.querySelector('div[style]').textContent = '❌ Нет соединения';
      });
    },
    close() {
      if (!_el) return;
      _el.remove(); _el = null;
    },
    isOpen() { return !!_el; },
  };
})();

window.ReferralHTML = ReferralHTML;
})();
