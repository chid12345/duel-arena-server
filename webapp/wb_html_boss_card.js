/* wb_html_boss_card.js — попап карточки босса (лобби WB).
   Расширяет window.WBHtml: showBossCard(state) */
(() => {
  const CSS = `
.wb-bcard-ov{position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;
  background:rgba(0,0,0,.75);backdrop-filter:blur(6px);opacity:0;pointer-events:none;transition:opacity .2s;}
.wb-bcard-ov.open{opacity:1;pointer-events:all;}
.wb-bcard{position:relative;width:calc(100% - 40px);max-width:340px;border-radius:20px;overflow:hidden;
  background:linear-gradient(180deg,#14003a 0%,#06030f 100%);
  border:1px solid rgba(255,0,200,.35);
  box-shadow:0 8px 60px rgba(255,0,200,.3),0 2px 20px rgba(0,0,0,.8);
  transform:scale(.88) translateY(12px);opacity:0;
  transition:transform .25s cubic-bezier(.32,1.2,.5,1),opacity .2s;}
.wb-bcard-ov.open .wb-bcard{transform:scale(1) translateY(0);opacity:1;}

/* кнопка закрыть */
.wb-bcard-close{position:absolute;top:10px;right:12px;width:28px;height:28px;border-radius:50%;
  background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);
  display:flex;align-items:center;justify-content:center;cursor:pointer;
  font-size:14px;color:rgba(255,255,255,.5);line-height:1;z-index:2;}
.wb-bcard-close:active{background:rgba(255,255,255,.15);}

/* эмодзи-шапка */
.wb-bcard-top{display:flex;flex-direction:column;align-items:center;padding:28px 20px 16px;
  border-bottom:1px solid rgba(255,0,200,.1);}
.wb-bcard-em{font-size:64px;line-height:1;margin-bottom:10px;
  filter:drop-shadow(0 0 20px rgba(255,0,200,.7)) drop-shadow(0 0 8px rgba(255,0,200,.4));}
.wb-bcard-badge{font-size:8px;font-weight:800;letter-spacing:2.5px;margin-bottom:8px;
  padding:3px 10px;border-radius:20px;background:rgba(255,255,255,.06);}
.wb-bcard-name{font-size:18px;font-weight:900;text-align:center;
  background:linear-gradient(90deg,#fff,#ff88cc);-webkit-background-clip:text;background-clip:text;color:transparent;}
.wb-bcard-hp{font-size:9px;color:#446688;margin-top:5px;letter-spacing:.5px;text-align:center;}

/* статы */
.wb-bcard-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:14px 14px 10px;}
.wb-bcs{border-radius:12px;padding:10px 6px;text-align:center;
  background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);}
.wb-bcs-ic{font-size:16px;margin-bottom:3px;}
.wb-bcs-nm{font-size:7px;font-weight:800;letter-spacing:1px;color:#556677;margin-bottom:4px;}
.wb-bcs-val{font-size:13px;font-weight:900;letter-spacing:.5px;}
.wb-bcs-val.up{color:#ff5566;text-shadow:0 0 8px rgba(255,50,50,.5);}
.wb-bcs-val.up2{color:#ff2244;text-shadow:0 0 12px rgba(255,0,0,.7);}
.wb-bcs-val.dn{color:#44aaff;text-shadow:0 0 8px rgba(50,150,255,.5);}
.wb-bcs-val.ok{color:#778899;}

/* тактика */
.wb-bcard-tip{margin:0 14px 14px;padding:11px 13px;border-radius:12px;
  background:rgba(0,200,100,.05);border:1px solid rgba(0,200,100,.15);}
.wb-bcard-tip-lbl{font-size:8px;font-weight:800;letter-spacing:2px;color:#00cc66;margin-bottom:5px;}
.wb-bcard-tip-txt{font-size:11px;color:rgba(255,255,255,.65);line-height:1.5;}

/* кнопка понятно */
.wb-bcard-ok{margin:0 14px 18px;padding:13px;border-radius:14px;text-align:center;cursor:pointer;
  background:linear-gradient(135deg,rgba(200,0,150,.35),rgba(100,0,200,.35));
  border:1px solid rgba(255,0,200,.3);
  font-size:13px;font-weight:800;letter-spacing:1.5px;color:#fff;
  text-shadow:0 0 10px rgba(255,0,200,.5);
  transition:background .15s;}
.wb-bcard-ok:active{background:linear-gradient(135deg,rgba(200,0,150,.55),rgba(100,0,200,.55));}
`;

  const TYPES = {
    universal: { tip:'Нет особых слабостей — любая стратегия работает одинаково эффективно.' },
    fire:      { tip:'Огненный урон усилен физически. Магические атаки ослаблены — Интуиция рулит.' },
    ice:       { tip:'Мощная магия — ставь Ловкость и Уворот. Физ. урон немного снижен.' },
    poison:    { tip:'Высокая скорость атак — нужна Защита и Уклонение. Сила чуть ослаблена.' },
    shadow:    { tip:'Двойной физ. урон (Сила + Ловкость) — максимальная Защита обязательна.' },
  };

  function _statClass(v) {
    if (v >= 1.20) return 'up2';
    if (v >= 1.08) return 'up';
    if (v <= 0.88) return 'dn';
    return 'ok';
  }
  function _statLabel(v) {
    if (v >= 1.20) return `×${v.toFixed(2)} ↑↑`;
    if (v >= 1.08) return `×${v.toFixed(2)} ↑`;
    if (v <= 0.88) return `×${v.toFixed(2)} ↓`;
    return `×${v.toFixed(2)}`;
  }

  const BASE_PROFILES = {
    universal: {str:1.00,agi:1.00,int:1.00},
    fire:      {str:1.15,agi:1.00,int:0.85},
    ice:       {str:0.90,agi:0.90,int:1.25},
    poison:    {str:0.95,agi:1.20,int:1.05},
    shadow:    {str:1.10,agi:1.10,int:1.00},
  };

  const TYPE_COLOR = {
    universal: '#cc88ff', fire: '#ff8844', ice: '#55ccff',
    poison: '#88ff88', shadow: '#bb88ff',
  };

  function _inject() {
    if (document.getElementById('wb-style-bcard')) return;
    const s = document.createElement('style'); s.id = 'wb-style-bcard'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function _closeCard() {
    const ov = document.getElementById('wb-bcard-ov');
    if (!ov) return;
    ov.classList.remove('open');
    setTimeout(() => ov.remove(), 250);
  }

  function showBossCard(state) {
    _inject();
    document.getElementById('wb-bcard-ov')?.remove();

    const src = state?.active || state?.next_scheduled;
    if (!src) { window.WBHtml?.toast?.('Нет данных о боссе'); return; }

    const type  = src.boss_type || 'universal';
    const emoji = src.boss_emoji || '🐉';
    const name  = src.boss_name  || 'Мировой Босс';
    const label = src.boss_type_label || 'Универсальный';
    const tip   = (TYPES[type] || TYPES.universal).tip;
    const prof  = src.stat_profile || BASE_PROFILES[type] || BASE_PROFILES.universal;
    const badgeColor = TYPE_COLOR[type] || TYPE_COLOR.universal;

    const str = parseFloat(prof.str) || 1, agi = parseFloat(prof.agi) || 1, int_ = parseFloat(prof.int) || 1;
    const hp  = state?.active
      ? `HP: ${(state.active.current_hp||0).toLocaleString()} / ${(state.active.max_hp||0).toLocaleString()}`
      : 'HP зависит от числа участников';

    const statsHTML = [
      { ic:'⚔️', nm:'СИЛА',      v: str  },
      { ic:'💨', nm:'ЛОВКОСТЬ',  v: agi  },
      { ic:'🔮', nm:'ИНТУИЦИЯ',  v: int_ },
    ].map(({ic,nm,v}) =>
      `<div class="wb-bcs">
        <div class="wb-bcs-ic">${ic}</div>
        <div class="wb-bcs-nm">${nm}</div>
        <div class="wb-bcs-val ${_statClass(v)}">${_statLabel(v)}</div>
      </div>`
    ).join('');

    const ov = document.createElement('div'); ov.id = 'wb-bcard-ov'; ov.className = 'wb-bcard-ov';
    ov.innerHTML = `<div class="wb-bcard">
      <div class="wb-bcard-close" id="wb-bcard-close">×</div>
      <div class="wb-bcard-top">
        <div class="wb-bcard-em">${emoji}</div>
        <div class="wb-bcard-badge" style="color:${badgeColor};">${label.toUpperCase()} · ТИП БОССА</div>
        <div class="wb-bcard-name">${name}</div>
        <div class="wb-bcard-hp">${hp}</div>
      </div>
      <div class="wb-bcard-stats">${statsHTML}</div>
      <div class="wb-bcard-tip">
        <div class="wb-bcard-tip-lbl">💡 ТАКТИКА</div>
        <div class="wb-bcard-tip-txt">${tip}</div>
      </div>
      <div class="wb-bcard-ok" id="wb-bcard-ok">ПОНЯТНО</div>
    </div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));

    ov.addEventListener('click', e => {
      if (e.target === ov || e.target.id === 'wb-bcard-close' || e.target.id === 'wb-bcard-ok') {
        _closeCard();
      }
    });
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch(_) {}
  }

  Object.assign(window.WBHtml, { showBossCard });
})();
