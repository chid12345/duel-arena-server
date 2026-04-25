/* wb_html_boss_card.js — попап карточки босса (лобби WB).
   Расширяет window.WBHtml: showBossCard(state) */
(() => {
  const CSS = `
.wb-bcard-ov{position:fixed;inset:0;z-index:9998;display:flex;align-items:flex-end;justify-content:center;
  background:rgba(0,0,0,.65);backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity .2s;}
.wb-bcard-ov.open{opacity:1;pointer-events:all;}
.wb-bcard{width:100%;max-width:390px;border-radius:22px 22px 0 0;overflow:hidden;
  background:linear-gradient(180deg,#14003a 0%,#06030f 100%);
  border:1px solid rgba(255,0,200,.35);border-bottom:none;
  box-shadow:0 -10px 60px rgba(255,0,200,.25);padding:0 0 24px;
  transform:translateY(100%);transition:transform .3s cubic-bezier(.32,1.2,.5,1);}
.wb-bcard-ov.open .wb-bcard{transform:translateY(0);}
.wb-bcard-hdl{display:flex;justify-content:center;padding:10px 0 6px;}
.wb-bcard-hdl::before{content:"";width:36px;height:4px;border-radius:2px;background:rgba(255,0,200,.35);}

/* шапка */
.wb-bcard-head{display:flex;align-items:center;gap:14px;padding:12px 18px 14px;
  border-bottom:1px solid rgba(255,0,200,.12);}
.wb-bcard-em{font-size:52px;line-height:1;filter:drop-shadow(0 0 18px rgba(255,0,200,.6));}
.wb-bcard-info{flex:1;min-width:0;}
.wb-bcard-badge{font-size:8px;font-weight:800;letter-spacing:2px;color:#ff00cc;
  text-shadow:0 0 8px currentColor;margin-bottom:6px;}
.wb-bcard-name{font-size:17px;font-weight:900;
  background:linear-gradient(90deg,#fff,#ff88cc);-webkit-background-clip:text;background-clip:text;color:transparent;}
.wb-bcard-hp{font-size:9px;color:#446688;margin-top:4px;letter-spacing:.5px;}

/* статы */
.wb-bcard-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:14px 16px 10px;}
.wb-bcs{border-radius:12px;padding:10px 8px;text-align:center;
  background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);}
.wb-bcs-ic{font-size:18px;margin-bottom:4px;}
.wb-bcs-nm{font-size:8px;font-weight:700;letter-spacing:1px;color:#556677;margin-bottom:5px;}
.wb-bcs-val{font-size:15px;font-weight:900;letter-spacing:.5px;}
.wb-bcs-val.up{color:#ff5566;text-shadow:0 0 8px rgba(255,50,50,.5);}
.wb-bcs-val.up2{color:#ff2244;text-shadow:0 0 12px rgba(255,0,0,.7);}
.wb-bcs-val.dn{color:#44aaff;text-shadow:0 0 8px rgba(50,150,255,.5);}
.wb-bcs-val.ok{color:#778899;}

/* тактика */
.wb-bcard-tip{margin:0 16px;padding:12px 14px;border-radius:12px;
  background:rgba(0,200,100,.05);border:1px solid rgba(0,200,100,.15);}
.wb-bcard-tip-lbl{font-size:8px;font-weight:800;letter-spacing:2px;color:#00cc66;margin-bottom:6px;}
.wb-bcard-tip-txt{font-size:11px;color:#99bbaa;line-height:1.5;}
`;

  const TYPES = {
    universal: { tip:'Нет особых слабостей — любая стратегия работает одинаково эффективно.' },
    fire:      { tip:'Огненный урон усилен физически. Магические атаки ослаблены — Интуиция рулит.' },
    ice:       { tip:'Мощная магия — ставь Ловкость и Уворот. Физ. урон немного снижен.' },
    poison:    { tip:'Высокая скорость атак — нужна Защита и Уклонение. Сила чуть ослаблена.' },
    shadow:    { tip:'Двойной физ. урон (Сила + Ловкость) — максимальная Защита обязательна.' },
  };

  // Превращает multiplier в CSS-класс и текст
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

  // stat_profile от бэкенда — либо из active.stat_profile, либо base из TYPES
  const BASE_PROFILES = {
    universal: {str:1.00,agi:1.00,int:1.00},
    fire:      {str:1.15,agi:1.00,int:0.85},
    ice:       {str:0.90,agi:0.90,int:1.25},
    poison:    {str:0.95,agi:1.20,int:1.05},
    shadow:    {str:1.10,agi:1.10,int:1.00},
  };

  function _inject() {
    if (document.getElementById('wb-style-bcard')) return;
    const s = document.createElement('style'); s.id = 'wb-style-bcard'; s.textContent = CSS;
    document.head.appendChild(s);
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
      <div class="wb-bcard-hdl"></div>
      <div class="wb-bcard-head">
        <div class="wb-bcard-em">${emoji}</div>
        <div class="wb-bcard-info">
          <div class="wb-bcard-badge">${label.toUpperCase()} · ТИП БОССА</div>
          <div class="wb-bcard-name">${name}</div>
          <div class="wb-bcard-hp">${hp}</div>
        </div>
      </div>
      <div class="wb-bcard-stats">${statsHTML}</div>
      <div class="wb-bcard-tip">
        <div class="wb-bcard-tip-lbl">💡 ТАКТИКА</div>
        <div class="wb-bcard-tip-txt">${tip}</div>
      </div>
    </div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    ov.addEventListener('click', e => { if (e.target === ov) { ov.classList.remove('open'); setTimeout(() => ov.remove(), 250); } });
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch(_) {}
  }

  Object.assign(window.WBHtml, { showBossCard });
})();
