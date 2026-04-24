/* ============================================================
   Clan HTML NoClan — экран «Вы не в клане» (киберпанк)
   Большая голограмма-эмблема + плитки 2×2 (Найти/Создать/Топ/Сезон)
   ============================================================ */
(() => {
const CSS = `
.nc-overlay{position:absolute;top:0;left:0;right:0;bottom:76px;z-index:9000;display:flex;justify-content:center;background:radial-gradient(ellipse at 50% 0%,#1a0a2a 0%,#05050a 55%),#000;color:#e6f7ff;overflow:hidden;font-family:-apple-system,"Segoe UI",Roboto,sans-serif}
.nc-overlay::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,255,220,.025) 3px 4px);pointer-events:none;z-index:1}
.nc-overlay::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 20% 30%,rgba(255,40,170,.12),transparent 40%),radial-gradient(circle at 80% 70%,rgba(0,230,255,.10),transparent 40%);pointer-events:none;z-index:1}
.nc-panel{width:100%;max-width:430px;position:relative;z-index:2;padding:0 0 10px;display:flex;flex-direction:column;height:100%;box-sizing:border-box}
.nc-hdr{padding:10px 16px 4px;display:flex;align-items:center;gap:10px;flex-shrink:0}
.nc-back{font-size:22px;color:#80d8ff;cursor:pointer;padding:4px 8px;opacity:.7;user-select:none}
.nc-hdri{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;font-size:16px;background:linear-gradient(135deg,#1a0533,#2a0a40);border:1px solid #ff3ba8;box-shadow:0 0 10px rgba(255,59,168,.5),inset 0 0 6px rgba(255,59,168,.2)}
.nc-hdrt{font-size:15px;font-weight:800;letter-spacing:.5px;background:linear-gradient(90deg,#ff3ba8,#00f0ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.nc-hdrs{font-size:9.5px;color:#00e0ff;opacity:.75;margin-top:1px}
.nc-emblem{width:96px;height:96px;border-radius:24px;margin:8px auto 0;position:relative;display:grid;place-items:center;background:radial-gradient(circle at 50% 40%,rgba(255,59,168,.25),rgba(0,240,255,.12) 50%,transparent 70%);border:1.5px solid #ff3ba8;box-shadow:0 0 30px rgba(255,59,168,.4),inset 0 0 22px rgba(0,240,255,.15);animation:ncPulse 3s ease-in-out infinite;flex-shrink:0}
.nc-emblem::before{content:"";position:absolute;inset:-6px;border-radius:30px;border:1px solid rgba(0,240,255,.35);box-shadow:0 0 10px rgba(0,240,255,.4);animation:ncRing 4s linear infinite}
@keyframes ncPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04);box-shadow:0 0 42px rgba(255,59,168,.55),inset 0 0 26px rgba(0,240,255,.25)}}
@keyframes ncRing{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
.nc-em-img{width:74px;height:74px;filter:drop-shadow(0 0 12px rgba(255,59,168,.7))}
.nc-title{text-align:center;font-size:18px;font-weight:900;margin-top:10px;letter-spacing:.8px;background:linear-gradient(90deg,#ff3ba8,#ffa8d8,#00f0ff);-webkit-background-clip:text;background-clip:text;color:transparent;flex-shrink:0}
.nc-sub{text-align:center;font-size:11px;color:#80c8ff;opacity:.85;margin-top:4px;padding:0 30px;line-height:1.4;flex-shrink:0}
.nc-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px 12px 0;flex:1;min-height:0}
.nc-card{padding:10px 8px;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer;user-select:none;transition:transform .12s;position:relative;overflow:hidden;min-height:0}
.nc-card:active{transform:scale(.96)}
.nc-card .ic{font-size:24px;margin-bottom:2px;filter:drop-shadow(0 0 8px currentColor)}
.nc-card .ti{font-size:12.5px;font-weight:800;letter-spacing:.4px}
.nc-card .de{font-size:9px;opacity:.72;text-align:center;margin-top:1px;line-height:1.25}
.nc-card.find{background:linear-gradient(135deg,rgba(0,100,200,.28),rgba(5,10,40,.9));border:1px solid #3b82f6;color:#7eb3ff;box-shadow:0 0 14px rgba(59,130,246,.3)}
.nc-card.create{background:linear-gradient(135deg,rgba(255,59,168,.3),rgba(40,5,60,.9));border:1px solid #ff3ba8;color:#ff7acb;box-shadow:0 0 16px rgba(255,59,168,.4)}
.nc-card.create::before{content:"НОВОЕ";position:absolute;top:7px;right:8px;font-size:7px;font-weight:900;padding:2px 5px;border-radius:4px;background:#ff3ba8;color:#fff;letter-spacing:.5px;box-shadow:0 0 6px rgba(255,59,168,.6)}
.nc-card.top{background:linear-gradient(135deg,rgba(255,209,102,.18),rgba(30,20,5,.9));border:1px solid #ffd166;color:#ffe08a;box-shadow:0 0 12px rgba(255,209,102,.3)}
.nc-card.season{background:linear-gradient(135deg,rgba(168,85,247,.22),rgba(25,5,45,.9));border:1px solid #a855f7;color:#c4a0ff;box-shadow:0 0 14px rgba(168,85,247,.35)}
.nc-card.season::after{content:"7д";position:absolute;top:7px;right:8px;font-size:10px;font-weight:800;color:#ffd166;text-shadow:0 0 4px currentColor}
.nc-cost{text-align:center;font-size:10px;color:#a8b4d8;opacity:.75;margin-top:8px;padding-bottom:4px;letter-spacing:.3px;flex-shrink:0}
.nc-cost .c{color:#ffd166;font-weight:700}
`;

function _injectCSS(){ if(document.getElementById('nc-style'))return; const s=document.createElement('style'); s.id='nc-style'; s.textContent=CSS; document.head.appendChild(s); }

function openNoClan(scene) {
  _injectCSS();
  close();
  const root = document.createElement('div');
  root.id = 'nc-root';
  root.className = 'nc-overlay';
  root.innerHTML = `
    <div class="nc-panel">
      <div class="nc-hdr">
        <span class="nc-back" data-act="back">‹</span>
        <div class="nc-hdri">⚔️</div>
        <div>
          <div class="nc-hdrt">КЛАН</div>
          <div class="nc-hdrs">Кланы · Поиск · Рейтинг</div>
        </div>
      </div>
      <div class="nc-emblem">
        <img src="clan_emblem.png" class="nc-em-img" alt="">
      </div>
      <div class="nc-title">ТЫ ОДИНОЧКА</div>
      <div class="nc-sub">Вступи в клан — вместе сила</div>
      <div class="nc-grid">
        <div class="nc-card find"   data-sub="search"><span class="ic">🔍</span><span class="ti">НАЙТИ КЛАН</span><span class="de">Поиск по тегу/имени</span></div>
        <div class="nc-card create" data-sub="create"><span class="ic">⚡</span><span class="ti">СОЗДАТЬ</span><span class="de">Стань лидером</span></div>
        <div class="nc-card top"    data-sub="top"><span class="ic">🏆</span><span class="ti">ТОП</span><span class="de">Лучшие кланы</span></div>
        <div class="nc-card season" data-sub="season"><span class="ic">📅</span><span class="ti">СЕЗОН</span><span class="de">Награды недели</span></div>
      </div>
    </div>`;
  document.body.appendChild(root);
  if (window.ClanHTML?._fitToCanvas) {
    window.ClanHTML._fitToCanvas(root);
    const onResize = () => window.ClanHTML._fitToCanvas(root);
    window.addEventListener('resize', onResize);
    root._onResize = onResize;
  }
  document.getElementById('cl-placeholder')?.remove();
  root.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });

  root.addEventListener('click', e => {
    const el = e.target.closest('[data-act],[data-sub]');
    if (!el) return;
    try { tg?.HapticFeedback?.impactOccurred('light'); } catch(_) {}
    if (el.dataset.act === 'back') { close(); scene.scene.start('Menu', { target: 'more' }); return; }
    const sub = el.dataset.sub;
    if (sub) scene.scene.restart({ sub });
  });
}

function close() {
  const r = document.getElementById('nc-root');
  if (r?._onResize) { try { window.removeEventListener('resize', r._onResize); } catch(_) {} }
  r?.remove();
}

Object.assign(window.ClanHTML = window.ClanHTML || {}, { openNoClan });
const _origClose = window.ClanHTML.close;
window.ClanHTML.close = function() { try { close(); } catch(_) {} try { _origClose?.(); } catch(_) {} };
})();
