/* ============================================================
   More Menu HTML Overlay — киберпанк вкладка "Меню"
   ============================================================ */
(() => {
const CSS = `
.mo-overlay{position:fixed;top:0;left:0;right:0;bottom:76px;z-index:9000;display:flex;justify-content:center;background:radial-gradient(ellipse at 50% 0%,#1a0a2a 0%,#05050a 55%),#000;color:#e6f7ff;overflow-y:auto;overflow-x:hidden;font-family:-apple-system,"Segoe UI",Roboto,sans-serif;touch-action:pan-y}
.mo-overlay::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,255,220,.025) 3px 4px);pointer-events:none;z-index:1}
.mo-overlay::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 20% 30%,rgba(255,40,170,.10),transparent 40%),radial-gradient(circle at 80% 70%,rgba(0,230,255,.08),transparent 40%);pointer-events:none;z-index:1}
.mo-panel{width:100%;max-width:430px;position:relative;z-index:2;padding:24px 14px 24px;display:flex;flex-direction:column;gap:28px}
.mo-title{font-size:11px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;text-align:center;background:linear-gradient(90deg,#ff3ba8,#00f0ff);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 8px rgba(0,240,255,.35))}
.mo-btns{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 8px}
.mo-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px 6px;cursor:pointer;user-select:none;-webkit-user-select:none;border:none;outline:none;background:none;-webkit-tap-highlight-color:transparent;transition:transform .12s;touch-action:manipulation;pointer-events:auto}
.mo-btn:active,.mo-btn.pressed{transform:scale(.88)}
.mo-icon{font-size:52px;line-height:1;display:block;transition:filter .18s,transform .18s;pointer-events:none}
.mo-label{font-size:11px;font-weight:800;letter-spacing:.4px;text-align:center;pointer-events:none}
@keyframes moP1{0%,100%{filter:drop-shadow(0 0 10px rgba(200,80,255,.6)) drop-shadow(0 0 4px rgba(0,0,0,.6))}50%{filter:drop-shadow(0 0 22px rgba(200,80,255,.95)) drop-shadow(0 0 8px rgba(0,0,0,.5))}}
@keyframes moP2{0%,100%{filter:drop-shadow(0 0 10px rgba(0,220,255,.6)) drop-shadow(0 0 4px rgba(0,0,0,.6))}50%{filter:drop-shadow(0 0 22px rgba(0,220,255,.95)) drop-shadow(0 0 8px rgba(0,0,0,.5))}}
@keyframes moP3{0%,100%{filter:drop-shadow(0 0 10px rgba(255,190,0,.6)) drop-shadow(0 0 4px rgba(0,0,0,.6))}50%{filter:drop-shadow(0 0 22px rgba(255,190,0,.95)) drop-shadow(0 0 8px rgba(0,0,0,.5))}}
.mo-av .mo-icon{animation:moP1 3s ease-in-out infinite}
.mo-ref .mo-icon{animation:moP2 3.5s ease-in-out infinite}
.mo-guide .mo-icon{animation:moP3 2.8s ease-in-out infinite}
.mo-av .mo-label{color:#d480ff;text-shadow:0 0 10px rgba(200,80,255,.7)}
.mo-ref .mo-label{color:#80e8ff;text-shadow:0 0 10px rgba(0,220,255,.7)}
.mo-guide .mo-label{color:#ffd080;text-shadow:0 0 10px rgba(255,180,0,.7)}
.mo-ver{display:flex;flex-direction:column;align-items:center;gap:4px;margin-top:auto}
.mo-ver-badge{display:flex;align-items:center;gap:8px;padding:8px 20px;border-radius:12px;background:linear-gradient(135deg,rgba(20,8,40,.9),rgba(5,5,15,.9));box-shadow:0 0 0 1px rgba(255,59,168,.2),0 0 16px rgba(255,59,168,.08);cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:manipulation}
.mo-ver-sword{font-size:16px;filter:drop-shadow(0 0 6px rgba(255,200,60,.6));pointer-events:none}
.mo-ver-name{font-size:12px;font-weight:800;background:linear-gradient(90deg,#ff3ba8,#00f0ff);-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:.5px;pointer-events:none}
.mo-ver-num{font-size:11px;font-weight:700;color:#ffc83c;text-shadow:0 0 8px rgba(255,200,60,.5);pointer-events:none}
`;

const MoreMenuHTML = (() => {
  let _el = null;
  let _tapCount = 0;
  let _tapTimer = null;

  function _inject() {
    if (document.getElementById('mo-style')) return;
    const s = document.createElement('style');
    s.id = 'mo-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function _build(version) {
    const el = document.createElement('div');
    el.className = 'mo-overlay';
    el.id = 'mo-root';
    el.innerHTML = `
      <div class="mo-panel">
        <div class="mo-title">Настройки &amp; Разделы</div>
        <div class="mo-btns">
          <div class="mo-btn mo-av"    id="mo-btn-av"    role="button">
            <span class="mo-icon">🎭</span>
            <span class="mo-label">Аватарки</span>
          </div>
          <div class="mo-btn mo-ref"   id="mo-btn-ref"   role="button">
            <span class="mo-icon">🔗</span>
            <span class="mo-label">Рефералка</span>
          </div>
          <div class="mo-btn mo-guide" id="mo-btn-guide" role="button">
            <span class="mo-icon">📖</span>
            <span class="mo-label">Справка</span>
          </div>
        </div>
        <div class="mo-ver">
          <div class="mo-ver-badge" id="mo-ver-badge">
            <span class="mo-ver-sword">⚔️</span>
            <span class="mo-ver-name">Duel Arena</span>
            <span class="mo-ver-num">v${version || '1.00'}</span>
          </div>
        </div>
      </div>
    `;
    return el;
  }

  // Надёжный обработчик тапа для Telegram WebView
  function _onTap(el, cb) {
    let _startY = 0;
    el.addEventListener('pointerdown', (e) => {
      _startY = e.clientY;
      el.classList.add('pressed');
    }, { passive: true });
    el.addEventListener('pointerup', (e) => {
      el.classList.remove('pressed');
      // Игнорируем если это скролл (>10px по вертикали)
      if (Math.abs(e.clientY - _startY) > 10) return;
      e.stopPropagation();
      cb();
    });
    el.addEventListener('pointercancel', () => {
      el.classList.remove('pressed');
    }, { passive: true });
  }

  function _bindEvents(el, scene) {
    _onTap(el.querySelector('#mo-btn-av'), () => {
      try { tg?.HapticFeedback?.selectionChanged(); } catch(_) {}
      try { Sound.click(); } catch(_) {}
      setTimeout(() => {
        try { scene.scene.start('Avatar', {}); }
        catch(err) { console.error('[MoreMenu] Avatar nav:', err); }
      }, 60);
    });

    _onTap(el.querySelector('#mo-btn-ref'), () => {
      try { tg?.HapticFeedback?.selectionChanged(); } catch(_) {}
      try { Sound.click(); } catch(_) {}
      setTimeout(() => {
        try { scene._onInvite(); }
        catch(err) { console.error('[MoreMenu] Invite:', err); }
      }, 60);
    });

    _onTap(el.querySelector('#mo-btn-guide'), () => {
      try { tg?.HapticFeedback?.selectionChanged(); } catch(_) {}
      try { Sound.click(); } catch(_) {}
      setTimeout(() => {
        try { scene.scene.start('Guide', {}); }
        catch(err) { console.error('[MoreMenu] Guide nav:', err); }
      }, 60);
    });

    // Скрытый Safe Mode: 5 тапов по версии
    _onTap(el.querySelector('#mo-ver-badge'), () => {
      _tapCount++;
      clearTimeout(_tapTimer);
      if (_tapCount >= 5) {
        _tapCount = 0;
        if (typeof SafeMode !== 'undefined') {
          SafeMode.toggle();
          try { tg?.HapticFeedback?.notificationOccurred(SafeMode.isOn() ? 'warning' : 'success'); } catch(_) {}
        }
      } else {
        _tapTimer = setTimeout(() => { _tapCount = 0; }, 1500);
      }
    });
  }

  return {
    show(scene) {
      if (_el) return;
      _inject();
      const version = (typeof State !== 'undefined' && State.appVersion) || '1.00';
      _el = _build(version);
      _bindEvents(_el, scene);
      document.body.appendChild(_el);
    },
    close() {
      if (!_el) return;
      _el.remove();
      _el = null;
    },
    isOpen() { return !!_el; },
  };
})();

window.MoreMenuHTML = MoreMenuHTML;
})();
