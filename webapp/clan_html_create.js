/* ============================================================
   Clan HTML Create — создание клана (киберпанк) с PNG-эмблемами
   Форма: имя, тег, мин.ур., закрытый, описание + 3 эмблемы-карточки
   ============================================================ */
(() => {
const CSS = `
.cc-form{padding:4px 12px 12px;display:flex;flex-direction:column;gap:10px}
.cc-title{font-size:11px;font-weight:700;color:#ffa8d8;letter-spacing:.5px;margin-bottom:2px}
.cc-hint{font-size:9.5px;color:#80c8ff;opacity:.75;margin-top:1px}
.cc-row{display:flex;gap:8px;align-items:stretch}
.cc-field{flex:1;display:flex;flex-direction:column;gap:2px}
.cc-inp{height:36px;padding:0 12px;font-size:13px;font-family:inherit;color:#e6f7ff;background:rgba(10,5,25,.85);border:1px solid #00f0ff;border-radius:10px;box-shadow:0 0 8px rgba(0,240,255,.2),inset 0 0 6px rgba(0,240,255,.06);outline:none;letter-spacing:.3px}
.cc-inp::placeholder{color:rgba(128,200,255,.45)}
.cc-inp:focus{border-color:#ff3ba8;box-shadow:0 0 12px rgba(255,59,168,.4),inset 0 0 6px rgba(255,59,168,.1)}
.cc-tag{text-transform:uppercase;max-width:86px}
.cc-lvl{max-width:68px;text-align:center}
.cc-toggle{min-width:72px;height:36px;border-radius:10px;display:grid;place-items:center;font-size:11px;font-weight:800;cursor:pointer;user-select:none;background:rgba(10,5,25,.85);border:1px solid rgba(0,240,255,.35);color:#80e8ff;text-shadow:0 0 4px currentColor;transition:all .15s}
.cc-toggle.on{border-color:#ff3ba8;color:#ffa8d8;box-shadow:0 0 10px rgba(255,59,168,.4)}
.cc-toggle:active{transform:scale(.96)}
.cc-toggle .em{font-size:14px;margin-right:4px}
.cc-emblems{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:4px}
.cc-em{padding:10px 6px 8px;border-radius:12px;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;user-select:none;transition:transform .1s,border-color .15s,box-shadow .15s;background:linear-gradient(135deg,rgba(15,5,30,.88),rgba(5,5,15,.9));border:1.5px solid rgba(128,200,255,.2);position:relative}
.cc-em:active{transform:scale(.95)}
.cc-em img{width:52px;height:52px;object-fit:contain;filter:drop-shadow(0 0 8px currentColor);opacity:.55;transition:opacity .15s,filter .15s}
.cc-em .nm{font-size:10.5px;font-weight:800;letter-spacing:.5px;opacity:.7;transition:opacity .15s}
.cc-em.sel{border-width:2px;transform:scale(1.02)}
.cc-em.sel img{opacity:1;filter:drop-shadow(0 0 12px currentColor)}
.cc-em.sel .nm{opacity:1;text-shadow:0 0 6px currentColor}
.cc-em.sel::after{content:"✓";position:absolute;top:4px;right:6px;font-size:12px;font-weight:800;color:currentColor;text-shadow:0 0 6px currentColor}
.cc-em.light{color:#ffd166}
.cc-em.dark{color:#a06bff}
.cc-em.neutral{color:#7ec8ff}
.cc-em.light.sel{border-color:#ffd166;box-shadow:0 0 14px rgba(255,209,102,.5)}
.cc-em.dark.sel{border-color:#a06bff;box-shadow:0 0 14px rgba(160,107,255,.5)}
.cc-em.neutral.sel{border-color:#7ec8ff;box-shadow:0 0 14px rgba(126,200,255,.5)}
.cc-submit{height:44px;border-radius:12px;display:grid;place-items:center;font-size:13px;font-weight:800;letter-spacing:.4px;cursor:pointer;user-select:none;margin-top:4px;background:linear-gradient(135deg,#ff3ba8,#a01e6e);color:#fff;border:1px solid #ff3ba8;box-shadow:0 0 16px rgba(255,59,168,.55);text-shadow:0 0 4px rgba(0,0,0,.3);transition:transform .1s}
.cc-submit:active{transform:scale(.97)}
.cc-footer{text-align:center;font-size:10px;color:#a8b4d8;opacity:.75;margin-top:2px}
.cc-footer .c{color:#ffd166;font-weight:700}
`;
function _injectCSS(){ if(document.getElementById('cc-style'))return; const s=document.createElement('style'); s.id='cc-style'; s.textContent=CSS; document.head.appendChild(s); }
const EMBLEMS = [
  { key: 'light',   label: 'СВЕТ',        img: 'clan_em_light.png' },
  { key: 'dark',    label: 'ТЬМА',        img: 'clan_em_dark.png' },
  { key: 'neutral', label: 'НЕЙТРАЛ',     img: 'clan_em_neutral.png' },
];

function openCreate(scene) {
  _injectCSS();
  const body = `
    <div class="cc-form">
      <div class="cc-field">
        <div class="cc-title">🛡️ НАЗВАНИЕ КЛАНА</div>
        <input class="cc-inp" id="cc-name" type="text" placeholder="Железный Кулак" maxlength="20">
        <div class="cc-hint">3–20 символов · уникальное</div>
      </div>
      <div class="cc-row">
        <div class="cc-field">
          <div class="cc-title">🔖 ТЕГ</div>
          <input class="cc-inp cc-tag" id="cc-tag" type="text" placeholder="ЖК" maxlength="4">
          <div class="cc-hint">2–4 символа</div>
        </div>
        <div class="cc-field">
          <div class="cc-title">⚡ МИН. УР.</div>
          <input class="cc-inp cc-lvl" id="cc-lvl" type="text" placeholder="1" maxlength="2" inputmode="numeric">
          <div class="cc-hint">Фильтр по ур.</div>
        </div>
        <div class="cc-field">
          <div class="cc-title">🚪 РЕЖИМ</div>
          <div class="cc-toggle" id="cc-closed" data-act="toggle"><span class="em">🔓</span>Открыт</div>
          <div class="cc-hint">Тап — закрыть</div>
        </div>
      </div>
      <div class="cc-field">
        <div class="cc-title">📝 ОПИСАНИЕ (необязательно)</div>
        <input class="cc-inp" id="cc-desc" type="text" placeholder="Ищем активных бойцов" maxlength="120">
        <div class="cc-hint">До 120 символов</div>
      </div>
      <div class="cc-field">
        <div class="cc-title">✨ ЭМБЛЕМА КЛАНА</div>
        <div class="cc-emblems">
          ${EMBLEMS.map(e => `<div class="cc-em ${e.key}${e.key==='neutral'?' sel':''}" data-act="em" data-key="${e.key}"><img src="${e.img}" alt=""><div class="nm">${e.label}</div></div>`).join('')}
        </div>
        <div class="cc-hint">Только вид · бафф +5% 🪙 у всех одинаков</div>
      </div>
      <div class="cc-submit" data-act="create">⚔️ ОСНОВАТЬ КЛАН · 800 🪙</div>
      <div class="cc-footer">Имя и тег должны быть <span class="c">уникальны</span></div>
    </div>`;
  window.ClanHTML._shell(scene, '⚡', 'СОЗДАТЬ КЛАН', body, 'Бафф +5% к золоту · Стоимость 800🪙');

  const state = { emblem: 'neutral', closed: 0, busy: false };
  const root = document.getElementById('cl-root');

  root?.addEventListener('click', async e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    if (act === 'back') return;
    try { tg?.HapticFeedback?.impactOccurred('light'); } catch(_) {}

    if (act === 'em') {
      state.emblem = el.dataset.key;
      root.querySelectorAll('.cc-em').forEach(x => x.classList.toggle('sel', x.dataset.key === state.emblem));
      return;
    }
    if (act === 'toggle') {
      state.closed = state.closed ? 0 : 1;
      const t = document.getElementById('cc-closed');
      if (t) {
        t.classList.toggle('on', !!state.closed);
        t.innerHTML = state.closed ? '<span class="em">🔒</span>Закрыт' : '<span class="em">🔓</span>Открыт';
      }
      return;
    }
    if (act === 'create') {
      if (state.busy) return;
      const name = (document.getElementById('cc-name')?.value || '').trim();
      const tag  = (document.getElementById('cc-tag')?.value  || '').trim();
      const desc = (document.getElementById('cc-desc')?.value || '').trim();
      const minL = parseInt(document.getElementById('cc-lvl')?.value || '1', 10) || 1;
      if (name.length < 3) return window.ClanHTML._toast?.('❌ Название минимум 3 символа', false);
      if (tag.length  < 2) return window.ClanHTML._toast?.('❌ Тег минимум 2 символа', false);
      state.busy = true;
      const btn = document.querySelector('[data-act="create"]');
      if (btn) btn.textContent = '⏳ Создаём...';
      try {
        const res = await post('/api/clan/create', { name, tag, emblem: state.emblem, description: desc, min_level: minL, closed: state.closed });
        if (res.ok) {
          try { tg?.HapticFeedback?.notificationOccurred('success'); Sound.levelUp(); } catch(_) {}
          if (res.player) State.player = res.player;
          window.ClanHTML._toast?.(`🏰 Клан [${res.tag}] ${res.name} основан!`);
          setTimeout(() => { window.ClanHTML.close(); scene.scene.restart({ sub: 'main' }); }, 700);
        } else {
          window.ClanHTML._toast?.('❌ ' + res.reason, false);
          if (btn) btn.textContent = '⚔️ ОСНОВАТЬ КЛАН · 800 🪙';
          state.busy = false;
        }
      } catch(_) {
        window.ClanHTML._toast?.('❌ Нет соединения', false);
        if (btn) btn.textContent = '⚔️ ОСНОВАТЬ КЛАН · 800 🪙';
        state.busy = false;
      }
    }
  });
}

Object.assign(window.ClanHTML = window.ClanHTML || {}, { openCreate });
})();
