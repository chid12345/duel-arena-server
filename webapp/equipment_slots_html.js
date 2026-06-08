/* ============================================================
   EquipmentSlotsHTML — HTML overlay для 6 слотов экипировки в профиле.
   Тот же паттерн что в helmet/weapon/boots HTML overlays:
   texKey+'.png' → img → _removeDarkBg на onload → чистый PNG без фона.
   ============================================================ */
(() => {
const _RARITY_COLOR = { common:'#a0aec0', rare:'#fbbf24', epic:'#c084fc', mythic:'#ff6b2b' };
const _LABELS = { belt:'ШЛЕМ', armor2:'БРОНЯ', boots:'ОБУВЬ', weapon:'ОРУЖИЕ', shield:'ЩИТ', ring1:'КОЛЬЦО' };
const _EMPTY  = { belt:'⛑', armor2:'🛡', boots:'👢', weapon:'⚔', shield:'🛡', ring1:'💍' };
const _imgCache = new Map();

let _cssOn = false;
function _injectCSS() {
  if (_cssOn) return; _cssOn = true;
  const s = document.createElement('style'); s.id = 'eqs-css';
  s.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
#eqs-overlay{position:fixed;inset:0;pointer-events:none;z-index:50}
.eqs-btn{position:fixed;display:flex;flex-direction:column;align-items:center;gap:2px;
  cursor:pointer;pointer-events:auto;touch-action:manipulation;
  transform:translate(-50%,-50%);-webkit-tap-highlight-color:transparent;user-select:none}
.eqs-img{object-fit:contain;display:block;background:transparent;
  filter:drop-shadow(0 0 8px var(--eqc,#607090)) drop-shadow(0 0 3px rgba(0,0,0,.6));
  transition:filter .15s,transform .15s}
.eqs-btn:active .eqs-img{
  filter:drop-shadow(0 0 20px var(--eqc,#607090)) drop-shadow(0 0 6px rgba(0,0,0,.9));
  transform:scale(.88)}
/* Пустой (незанятый) слот: было opacity .28 — почти невидимо, игрок не понимал
   что туда можно выбрать вещь. Теперь это явное «гнездо»: пунктирная пульсирующая
   рамка + значок ＋ в углу + видимая иконка → сразу ясно «нажми и выбери». */
.eqs-empty{display:flex;align-items:center;justify-content:center;position:relative;
  border:1.6px dashed rgba(140,180,240,.6);border-radius:12px;
  background:radial-gradient(ellipse at center,rgba(80,120,200,.16),transparent 72%);
  box-shadow:inset 0 0 14px rgba(80,120,200,.2);
  animation:eqsEmptyPulse 1.8s ease-in-out infinite}
.eqs-empty::after{content:'＋';position:absolute;top:-5px;right:-5px;width:16px;height:16px;
  display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;line-height:1;
  color:#06101f;background:linear-gradient(135deg,#7dd3fc,#38bdf8);border-radius:50%;
  box-shadow:0 0 7px rgba(56,189,248,.85);font-family:Arial,sans-serif}
@keyframes eqsEmptyPulse{0%,100%{border-color:rgba(130,170,230,.45);box-shadow:inset 0 0 10px rgba(80,120,200,.15)}
  50%{border-color:rgba(150,200,255,.95);box-shadow:inset 0 0 18px rgba(120,170,255,.32)}}
/* Лоадинг-плейсхолдер: НАДЕТЫЙ слот, ждёт PNG. opacity намного выше (.8 + пульс),
   чтобы игрок ВИДЕЛ что вещь надета, а не считал слот пустым. */
.eqs-loading{display:flex;align-items:center;justify-content:center;opacity:.8;animation:eqsPulse 1.4s ease-in-out infinite;
  filter:drop-shadow(0 0 6px var(--eqc,#607090))}
@keyframes eqsPulse{0%,100%{opacity:.55}50%{opacity:.95}}
.eqs-lbl{font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--eqc,#607090);
  text-shadow:0 0 5px var(--eqc,#607090);letter-spacing:.8px;white-space:nowrap}
.eqs-lbl.empty{color:#bcd2f5;text-shadow:0 0 6px rgba(130,170,230,.7);opacity:1}
`;
  document.head.appendChild(s);
}

/* Убрать тёмный фон — тот же алгоритм что в helmet/weapon HTML overlays */
function _removeDarkBg(img) {
  if (img._bgDone) return;
  img._bgDone = true;
  if (!img.naturalWidth || !img.naturalHeight) return;
  const origSrc = img.src;
  if (_imgCache.has(origSrc)) {
    const cached = _imgCache.get(origSrc);
    if (cached !== origSrc) img.src = cached;
    return;
  }
  const cv = document.createElement('canvas');
  cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  try {
    const d = ctx.getImageData(0, 0, cv.width, cv.height);
    const W = cv.width, H = cv.height;
    let dark = 0;
    [[0,0],[W-1,0],[0,H-1],[W-1,H-1]].forEach(([x,y]) => {
      const i = (y*W+x)*4;
      const mx = Math.max(d.data[i],d.data[i+1],d.data[i+2]);
      const mn = Math.min(d.data[i],d.data[i+1],d.data[i+2]);
      if (d.data[i+3]>10 && mx<80 && mx-mn<30) dark++;
    });
    if (dark < 2) { _imgCache.set(origSrc, origSrc); return; }
    for (let i = 0; i < d.data.length; i += 4) {
      const mx = Math.max(d.data[i],d.data[i+1],d.data[i+2]);
      const mn = Math.min(d.data[i],d.data[i+1],d.data[i+2]);
      if (mx < 72 && mx-mn < 28) d.data[i+3] = 0;
    }
    ctx.putImageData(d, 0, 0);
    const cleaned = cv.toDataURL();
    _imgCache.set(origSrc, cleaned);
    img.src = cleaned;
  } catch(_) { _imgCache.set(origSrc, origSrc); }
}

/* Точные расширения для сапог и щитов (смесь .png/.jpg/.jpeg) */
const _EXT = {
  boots_free1:'boots_free1.webp',     boots_free2:'boots_free2.webp',
  boots_free3:'boots_free3.webp',     boots_free4:'boots_free4.webp',
  boots_gold1:'boots_gold1.webp',     boots_gold2:'boots_gold2.webp',
  boots_gold3:'boots_gold3.webp',     boots_gold4:'boots_gold4.webp',
  boots_dia1:'boots_dia1.webp',       boots_dia2:'boots_dia2.webp',
  boots_dia3:'boots_dia3.webp',       boots_dia4:'boots_dia4.webp',
  boots_mythic1:'boots_mythic1.webp',boots_mythic2:'boots_mythic2.webp',
  boots_mythic3:'boots_mythic3.webp',boots_mythic4:'boots_mythic4.webp',
  shield_free1:'shield_free1.webp',  shield_free2:'shield_free2.webp',
  shield_free3:'shield_free3.webp',  shield_free4:'shield_free4.webp',
  shield_gold1:'shield_gold1.webp',  shield_gold2:'shield_gold2.webp',
  shield_gold3:'shield_gold3.webp',  shield_gold4:'shield_gold4.webp',
  shield_dia1:'shield_dia1.webp',     shield_dia2:'shield_dia2.webp',
  shield_dia3:'shield_dia3.webp',     shield_dia4:'shield_dia4.webp',
  shield_mythic1:'shield_mythic1.webp',shield_mythic2:'shield_mythic2.webp',
  shield_mythic3:'shield_mythic3.webp',shield_mythic4:'shield_mythic4.webp',
};

/* Texture key → filename (с правильным расширением). _EXT остался для совместимости —
   там лежат явные .webp; для всех остальных ключей дефолтный .webp (после WebP-пасса). */
function _texUrl(key) { return key ? (_EXT[key] || key + '.webp') : null; }

/* Данные слота: texKey (→ filename) + rarity.
   armor2 — новая чистая броня (item_id='armor2_free1'..'armor2_mythic4').
   texture_key сервер возвращает 'armor_free1'..'armor_mythic4' (старые PNG). */
function _slotInfo(slot) {
  const eq = State.equipment || {};
  const it = eq[slot];
  if (!it) return null;
  const r = it.rarity, id = it.item_id;
  let key = null;
  if      (slot === 'armor2') key = it.texture_key || getArmorTextureKey(id) || getArmorTextureKey(r);
  else if (slot === 'belt')   key = getHelmetTextureKey(id)  || getHelmetTextureKeyByRarity(r);
  else if (slot === 'weapon') key = getWeaponTextureKey(id)  || getWeaponTextureKeyByRarity(r);
  else if (slot === 'boots')  key = getBootsTextureKey(id)   || getBootsTextureKeyByRarity(r);
  else if (slot === 'shield') key = getShieldTextureKey(id)  || getShieldTextureKeyByRarity(r);
  else if (slot === 'ring1')  key = getRingTextureKey(id)    || getRingTextureKeyByRarity(r);
  return key ? { url: _texUrl(key), rarity: r } : null;
}

/* Позиции слотов в CSS-пикселях (та же формула что в scene_menu_equipment.js) */
function _positions(cvs) {
  const r  = cvs.getBoundingClientRect();
  const sx = r.width  / (cvs.width  || 390);
  const sy = r.height / (cvs.height || 700);
  const W  = cvs.width || 390;
  const PAD = 10, SW = 60, SH = 64;
  const colW      = Math.round((W - PAD * 2) / 4);
  const lx        = PAD + Math.round((colW - SW) / 2);
  const rx        = W - PAD - colW + Math.round((colW - SW) / 2);
  const czY       = 136, czH = 330;
  const slotZoneH = czH - 80;
  const sTop = czY + 14;
  const sMid = czY + Math.round((slotZoneH - SH) / 2);
  const sBot = czY + slotZoneH - SH;
  const px   = gx => r.left + (gx + SW / 2) * sx;
  const py   = gy => r.top  + (gy + SH / 2) * sy;
  const sz   = Math.round(SW * sx * 0.88);
  return {
    belt:   { left: px(lx), top: py(sTop), sz },
    armor2: { left: px(lx), top: py(sMid), sz },
    boots:  { left: px(lx), top: py(sBot), sz },
    weapon: { left: px(rx), top: py(sTop), sz },
    shield: { left: px(rx), top: py(sMid), sz },
    ring1:  { left: px(rx), top: py(sBot), sz },
  };
}

function _dispatch(slot, scene) {
  // Закрываем overlay слотов ДО открытия другого оверлея — иначе будет z-index bleed
  _close();
  // Ghost-tap guard: блокируем сквозные pointer-up до открытия нового
  // overlay, чтобы палец не «пробил» первую кнопку (Голова → авто-открытие первого шлема).
  try { window.GhostTapGuard?.block?.(180); } catch(_) {}
  if (typeof Sound !== 'undefined') Sound.click?.();
  // Открываем overlay с задержкой 80мс — pointer-up успевает отыграть
  // на текущей кнопке без побочного эффекта на новых элементах.
  setTimeout(() => {
    try {
      if      (slot === 'armor2' && typeof Armor2HTML !== 'undefined') Armor2HTML.open(scene);
      else if (slot === 'weapon' && typeof WeaponHTML !== 'undefined') WeaponHTML.open(scene);
      else if (slot === 'belt'   && typeof HelmetHTML !== 'undefined') HelmetHTML.open(scene);
      else if (slot === 'boots'  && typeof BootsHTML  !== 'undefined') BootsHTML.open(scene);
      else if (slot === 'shield' && typeof ShieldHTML !== 'undefined') ShieldHTML.open(scene);
      else if (slot === 'ring1'  && typeof RingHTML   !== 'undefined') RingHTML.open(scene);
    } catch(e) { console.warn('[EqSlotsHTML] dispatch', slot, e); }
  }, 80);
}

function _close() {
  const el = document.getElementById('eqs-overlay');
  if (el) { if (el._offResize) el._offResize(); el.remove(); }
}

function show(scene) {
  _injectCSS();
  _close();
  const cvs = document.querySelector('canvas');
  if (!cvs) return;

  const wrap = document.createElement('div');
  wrap.id = 'eqs-overlay';

  const pos   = _positions(cvs);
  // armor2 — слот «БРОНЯ» в средней позиции левой колонки (на месте старого armor).
  // Старый armor снесён под корень, новый чистый слот в разработке.
  const SLOTS = ['belt','armor2','boots','weapon','shield','ring1'];

  SLOTS.forEach(slot => {
    const info  = _slotInfo(slot);
    const color = _RARITY_COLOR[info?.rarity] || '#607090';
    const p     = pos[slot];
    const btn   = document.createElement('div');
    btn.className    = 'eqs-btn';
    btn.dataset.slot = slot;
    btn.style.cssText = `left:${p.left}px;top:${p.top}px;--eqc:${color}`;

    if (info?.url) {
      // Сразу рисуем emoji-плейсхолдер ⚔/💍/🛡, картинка качается ПОВЕРХ.
      // Раньше пока PNG идёт по сети (до 2с на холодной мобильной + 3
      // ретрая) — игрок видел СОВСЕМ пустой слот.
      // Используем класс `eqs-loading` (opacity .8 + пульс), а не
      // `eqs-empty` (opacity .28 для незанятых слотов) — иначе игрок
      // принимал тусклую emoji за «слот не работает».
      const ph = document.createElement('div');
      ph.className = 'eqs-loading';
      ph.style.cssText = `width:${p.sz}px;height:${p.sz}px;font-size:${Math.round(p.sz*.52)}px`;
      ph.textContent = _EMPTY[slot];

      const img = document.createElement('img');
      img.className  = 'eqs-img';
      img.style.width  = p.sz + 'px';
      img.style.height = p.sz + 'px';
      img.style.display = 'none';  // прячем до успешной загрузки, в слоте — emoji
      img.src = info.url;
      img.onload = () => {
        _removeDarkBg(img);
        img.style.display = '';
        if (ph.parentNode) ph.remove();  // PNG приехал — emoji убираем
      };
      // Ретраи на нестабильной мобильной сети. 3 попытки с растущей
      // паузой и кэш-бастингом ?r=N. Emoji-плейсхолдер всё это время
      // на месте — никогда не пусто.
      let _retry = 0;
      img.onerror = () => {
        if (_retry < 3) {
          _retry++;
          setTimeout(() => { img.src = info.url + '?r=' + _retry; }, 300 * _retry);
        }
        // Все 3 попытки провалились — оставляем emoji-плейсхолдер.
      };
      const lbl = document.createElement('span');
      lbl.className   = 'eqs-lbl';
      lbl.textContent = _LABELS[slot];
      btn.appendChild(ph);
      btn.appendChild(img);
      btn.appendChild(lbl);
    } else {
      const em  = document.createElement('div');
      em.className = 'eqs-empty';
      em.style.cssText = `width:${p.sz}px;height:${p.sz}px;font-size:${Math.round(p.sz*.52)}px`;
      em.textContent   = _EMPTY[slot];
      const lbl = document.createElement('span');
      lbl.className   = 'eqs-lbl empty';
      lbl.textContent = _LABELS[slot];
      btn.appendChild(em);
      btn.appendChild(lbl);
    }

    btn.addEventListener('pointerdown',  e => e.stopPropagation());
    btn.addEventListener('pointerup',    e => { e.stopPropagation(); _dispatch(slot, scene); });
    wrap.appendChild(btn);
  });

  document.body.appendChild(wrap);

  const _onResize = () => {
    const np = _positions(cvs);
    wrap.querySelectorAll('.eqs-btn').forEach(btn => {
      const p = np[btn.dataset.slot]; if (!p) return;
      btn.style.left = p.left + 'px'; btn.style.top = p.top + 'px';
      const img = btn.querySelector('.eqs-img');
      if (img) { img.style.width = p.sz+'px'; img.style.height = p.sz+'px'; }
      const em  = btn.querySelector('.eqs-empty');
      if (em)  { em.style.width = p.sz+'px'; em.style.height = p.sz+'px'; em.style.fontSize = Math.round(p.sz*.52)+'px'; }
    });
  };
  window.addEventListener('resize', _onResize);
  wrap._offResize = () => window.removeEventListener('resize', _onResize);

  scene.events.once('shutdown', _close);
  scene.events.once('destroy',  _close);
}

function refresh(scene) { show(scene); }

window.EquipmentSlotsHTML = { show, close: _close, refresh };
})();
