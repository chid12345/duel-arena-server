/* ============================================================
   EquipmentSlotsHTML — HTML overlay для 6 слотов экипировки в профиле.
   Изображения берём из Phaser-текстур (уже загружены), очищаем через
   cleanEquipmentTexture, отдаём как data URL → нет чёрного фона.
   ============================================================ */
(() => {
const _RARITY_COLOR = { common:'#a0aec0', rare:'#fbbf24', epic:'#c084fc', mythic:'#ff6b2b' };
const _LABELS = { belt:'ГОЛОВА', armor:'ТЕЛО', boots:'НОГИ', weapon:'ОРУЖИЕ', shield:'ЩИТ', ring1:'КОЛЬЦО' };
const _EMPTY  = { belt:'⛑', armor:'🧥', boots:'👢', weapon:'⚔', shield:'🛡', ring1:'💍' };

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
.eqs-img{object-fit:contain;display:block;
  filter:drop-shadow(0 0 8px var(--eqc,#607090)) drop-shadow(0 0 3px rgba(0,0,0,.6));
  transition:filter .15s,transform .15s}
.eqs-btn:active .eqs-img{
  filter:drop-shadow(0 0 20px var(--eqc,#607090)) drop-shadow(0 0 6px rgba(0,0,0,.9));
  transform:scale(.88)}
.eqs-empty{display:flex;align-items:center;justify-content:center;opacity:.28;transition:opacity .15s}
.eqs-btn:active .eqs-empty{opacity:.5}
.eqs-lbl{font-family:'Share Tech Mono',monospace;font-size:9px;color:var(--eqc,#607090);
  text-shadow:0 0 5px var(--eqc,#607090);letter-spacing:.8px;white-space:nowrap}
.eqs-lbl.empty{color:#607090;text-shadow:none;opacity:.45}
`;
  document.head.appendChild(s);
}

/* Получить URL изображения из Phaser-текстуры (с очисткой чёрного фона) */
function _getImgUrl(scene, texKey) {
  if (!texKey || !scene?.textures?.exists(texKey)) return null;
  try {
    const cleanKey = (typeof cleanEquipmentTexture === 'function')
      ? cleanEquipmentTexture(scene, texKey)
      : texKey;
    const src = scene.textures.get(cleanKey).getSourceImage();
    if (!src) return null;
    if (src instanceof HTMLCanvasElement) return src.toDataURL();
    if (src.src) return src.src;
  } catch(_) {}
  return null;
}

/* Данные слота: URL из Phaser + rarity */
function _slotInfo(slot, scene) {
  const eq = State.equipment || {};
  if (slot === 'armor') {
    const wd = State.wardrobeEquipped;
    const texKey = wd ? wd.textureKey : (eq.armor ? getArmorTextureKey(eq.armor.rarity) : null);
    const rarity = wd ? (wd.rarity || 'common') : (eq.armor?.rarity);
    const url = texKey ? _getImgUrl(scene, texKey) : null;
    return url ? { url, rarity } : null;
  }
  const it = eq[slot];
  if (!it) return null;
  const r = it.rarity, id = it.item_id;
  let texKey = null;
  if      (slot === 'belt')   texKey = getHelmetTextureKey(id)  || getHelmetTextureKeyByRarity(r);
  else if (slot === 'weapon') texKey = getWeaponTextureKey(id)  || getWeaponTextureKeyByRarity(r);
  else if (slot === 'boots')  texKey = getBootsTextureKey(id)   || getBootsTextureKeyByRarity(r);
  else if (slot === 'shield') texKey = getShieldTextureKey(id)  || getShieldTextureKeyByRarity(r);
  else if (slot === 'ring1')  texKey = getRingTextureKey(id)    || getRingTextureKeyByRarity(r);
  const url = texKey ? _getImgUrl(scene, texKey) : null;
  return url ? { url, rarity: r } : null;
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
  const imgPx = Math.round(SW * sx * 0.88);
  return {
    belt:   { left: px(lx), top: py(sTop), size: imgPx },
    armor:  { left: px(lx), top: py(sMid), size: imgPx },
    boots:  { left: px(lx), top: py(sBot), size: imgPx },
    weapon: { left: px(rx), top: py(sTop), size: imgPx },
    shield: { left: px(rx), top: py(sMid), size: imgPx },
    ring1:  { left: px(rx), top: py(sBot), size: imgPx },
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
    const info  = _slotInfo(slot, scene);
    const color = _RARITY_COLOR[info?.rarity] || '#607090';
    const p     = pos[slot];
    const btn   = document.createElement('div');
    btn.className  = 'eqs-btn';
    btn.dataset.slot = slot;
    btn.style.cssText = `left:${p.left}px;top:${p.top}px;--eqc:${color}`;

    if (info?.url) {
      const img = document.createElement('img');
      img.className = 'eqs-img';
      img.width  = p.size;
      img.height = p.size;
      img.src    = info.url;
      const lbl  = document.createElement('span');
      lbl.className   = 'eqs-lbl';
      lbl.textContent = _LABELS[slot];
      btn.appendChild(img);
      btn.appendChild(lbl);
    } else {
      const em  = document.createElement('div');
      em.className  = 'eqs-empty';
      em.style.cssText = `width:${p.size}px;height:${p.size}px;font-size:${Math.round(p.size * .52)}px`;
      em.textContent   = _EMPTY[slot];
      const lbl = document.createElement('span');
      lbl.className   = 'eqs-lbl empty';
      lbl.textContent = _LABELS[slot];
      btn.appendChild(em);
      btn.appendChild(lbl);
    }

    btn.addEventListener('pointerdown',  e => e.stopPropagation());
    btn.addEventListener('pointerup',    e => { e.stopPropagation(); _dispatch(slot, scene); });
    btn.addEventListener('pointercancel',() => {});
    wrap.appendChild(btn);
  });

  document.body.appendChild(wrap);

  const _onResize = () => {
    const np = _positions(cvs);
    wrap.querySelectorAll('.eqs-btn').forEach(btn => {
      const p = np[btn.dataset.slot]; if (!p) return;
      btn.style.left = p.left + 'px';
      btn.style.top  = p.top  + 'px';
      const img = btn.querySelector('.eqs-img');
      if (img) { img.width = p.size; img.height = p.size; }
      const em  = btn.querySelector('.eqs-empty');
      if (em)  { em.style.width = p.size+'px'; em.style.height = p.size+'px'; em.style.fontSize = Math.round(p.size*.52)+'px'; }
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
