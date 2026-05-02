/* ============================================================
   EquipmentSlotsHTML — HTML overlay для 6 слотов экипировки в профиле.
   Тот же паттерн что в helmet/weapon/boots HTML overlays:
   texKey+'.png' → img → _removeDarkBg на onload → чистый PNG без фона.
   ============================================================ */
(() => {
const _RARITY_COLOR = { common:'#a0aec0', rare:'#fbbf24', epic:'#c084fc', mythic:'#ff6b2b' };
const _LABELS = { belt:'ГОЛОВА', armor:'ТЕЛО', boots:'НОГИ', weapon:'ОРУЖИЕ', shield:'ЩИТ', ring1:'КОЛЬЦО' };
const _EMPTY  = { belt:'⛑', armor:'🧥', boots:'👢', weapon:'⚔', shield:'🛡', ring1:'💍' };
const _imgCache = new Map();

let _cssOn = false;
function _injectCSS() {
  if (_cssOn) return; _cssOn = true;
  const s = document.createElement('style'); s.id = 'eqs-css';
  s.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
#eqs-overlay{position:fixed;inset:0;pointer-events:none;z-index:500}
.eqs-btn{position:fixed;display:flex;flex-direction:column;align-items:center;gap:2px;
  cursor:pointer;pointer-events:auto;touch-action:manipulation;
  transform:translate(-50%,-50%);-webkit-tap-highlight-color:transparent;user-select:none}
.eqs-img{object-fit:contain;display:block;background:transparent;
  filter:drop-shadow(0 0 8px var(--eqc,#607090)) drop-shadow(0 0 3px rgba(0,0,0,.6));
  transition:filter .15s,transform .15s}
.eqs-btn:active .eqs-img{
  filter:drop-shadow(0 0 20px var(--eqc,#607090)) drop-shadow(0 0 6px rgba(0,0,0,.9));
  transform:scale(.88)}
.eqs-empty{display:flex;align-items:center;justify-content:center;opacity:.28}
.eqs-lbl{font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--eqc,#607090);
  text-shadow:0 0 5px var(--eqc,#607090);letter-spacing:.8px;white-space:nowrap}
.eqs-lbl.empty{color:#607090;text-shadow:none;opacity:.45}
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
  boots_free1:'boots_free1.png',     boots_free2:'boots_free2.png',
  boots_free3:'boots_free3.png',     boots_free4:'boots_free4.jpeg',
  boots_gold1:'boots_gold1.png',     boots_gold2:'boots_gold2.jpg',
  boots_gold3:'boots_gold3.jpg',     boots_gold4:'boots_gold4.jpg',
  boots_dia1:'boots_dia1.jpg',       boots_dia2:'boots_dia2.jpg',
  boots_dia3:'boots_dia3.jpg',       boots_dia4:'boots_dia4.jpg',
  boots_mythic1:'boots_mythic1.jpeg',boots_mythic2:'boots_mythic2.jpeg',
  boots_mythic3:'boots_mythic3.jpeg',boots_mythic4:'boots_mythic4.jpeg',
  shield_free1:'shield_free1.jpeg',  shield_free2:'shield_free2.jpeg',
  shield_free3:'shield_free3.jpeg',  shield_free4:'shield_free4.jpeg',
  shield_gold1:'shield_gold1.jpeg',  shield_gold2:'shield_gold2.jpeg',
  shield_gold3:'shield_gold3.jpeg',  shield_gold4:'shield_gold4.jpeg',
  shield_dia1:'shield_dia1.png',     shield_dia2:'shield_dia2.png',
  shield_dia3:'shield_dia3.png',     shield_dia4:'shield_dia4.png',
  shield_mythic1:'shield_mythic1.png',shield_mythic2:'shield_mythic2.png',
  shield_mythic3:'shield_mythic3.png',shield_mythic4:'shield_mythic4.png',
};

/* Texture key → filename (с правильным расширением) */
function _texUrl(key) { return key ? (_EXT[key] || key + '.png') : null; }

/* Данные слота: texKey (→ filename) + rarity */
function _slotInfo(slot) {
  const eq = State.equipment || {};
  if (slot === 'armor') {
    const wd = State.wardrobeEquipped;
    if (wd?.textureKey) return { url: _texUrl(wd.textureKey), rarity: wd.rarity || 'common' };
    const it = eq.armor;
    if (it) return { url: _texUrl(getArmorTextureKey(it.rarity)), rarity: it.rarity };
    return null;
  }
  const it = eq[slot];
  if (!it) return null;
  const r = it.rarity, id = it.item_id;
  let key = null;
  if      (slot === 'belt')   key = getHelmetTextureKey(id)  || getHelmetTextureKeyByRarity(r);
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
    armor:  { left: px(lx), top: py(sMid), sz },
    boots:  { left: px(lx), top: py(sBot), sz },
    weapon: { left: px(rx), top: py(sTop), sz },
    shield: { left: px(rx), top: py(sMid), sz },
    ring1:  { left: px(rx), top: py(sBot), sz },
  };
}

function _dispatch(slot, scene) {
  try {
    if (typeof Sound !== 'undefined') Sound.click?.();
    if      (slot === 'armor'  )                           scene.scene.start('Stats', { player: State.player, openWardrobe: true });
    else if (slot === 'weapon' && typeof WeaponHTML !== 'undefined') WeaponHTML.open(scene);
    else if (slot === 'belt'   && typeof HelmetHTML !== 'undefined') HelmetHTML.open(scene);
    else if (slot === 'boots'  && typeof BootsHTML  !== 'undefined') BootsHTML.open(scene);
    else if (slot === 'shield' && typeof ShieldHTML !== 'undefined') ShieldHTML.open(scene);
    else if (slot === 'ring1'  && typeof RingHTML   !== 'undefined') RingHTML.open(scene);
  } catch(e) { console.warn('[EqSlotsHTML] dispatch', slot, e); }
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
  const SLOTS = ['belt','armor','boots','weapon','shield','ring1'];

  SLOTS.forEach(slot => {
    const info  = _slotInfo(slot);
    const color = _RARITY_COLOR[info?.rarity] || '#607090';
    const p     = pos[slot];
    const btn   = document.createElement('div');
    btn.className    = 'eqs-btn';
    btn.dataset.slot = slot;
    btn.style.cssText = `left:${p.left}px;top:${p.top}px;--eqc:${color}`;

    if (info?.url) {
      const img = document.createElement('img');
      img.className  = 'eqs-img';
      img.style.width  = p.sz + 'px';
      img.style.height = p.sz + 'px';
      img.src = info.url;
      img.onload  = () => _removeDarkBg(img);
      img.onerror = () => {
        // При ошибке — показываем emoji-заглушку вместо broken-image
        img.style.display = 'none';
        const em = document.createElement('div');
        em.className = 'eqs-empty';
        em.style.cssText = `width:${p.sz}px;height:${p.sz}px;font-size:${Math.round(p.sz*.52)}px`;
        em.textContent   = _EMPTY[slot];
        btn.insertBefore(em, btn.firstChild);
      };
      const lbl = document.createElement('span');
      lbl.className   = 'eqs-lbl';
      lbl.textContent = _LABELS[slot];
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
