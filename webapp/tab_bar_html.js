/* ============================================================
   TabBar HTML — нижний таббар как HTML overlay (вместо Phaser-слоя).
   PNG-иконки с CSS drop-shadow glow; плавные CSS-переходы.
   TabBarHTML.sync(scene, activeKey, onInternal)  — вызывается из TabBar.build()
   TabBarHTML.setActive(key)                       — обновить активную вкладку
   TabBarHTML.hide() / .show()                     — для полноэкранных оверлеев
   ============================================================ */
window.TabBarHTML = (() => {
  const TABS = [
    { key: 'profile', label: 'Профиль', img: 'tab_profile.png', em: '⚔️', col: '#22d3ee' },
    { key: 'clan',    label: 'Клан',    img: 'tab_clan.png',    em: '🏰', col: '#fb7185' },
    { key: 'stats',   label: 'Герой',   img: 'tab_stats.png',   em: '🛡️', col: '#818cf8' },
    { key: 'boss',    label: 'Босс',    img: 'tab_boss.png',    em: '💀', col: '#fb923c' },
    { key: 'rating',  label: 'Рейтинг', img: 'tab_rating.png',  em: '👑', col: '#fbbf24' },
    { key: 'more',    label: 'Меню',    img: 'tab_more.png',    em: '📜', col: '#a78bfa' },
  ];

  let _root = null, _scene = null, _onInternal = null, _activeKey = null;

  const CSS = `
#tb-html-bar{position:fixed;z-index:9200;display:flex;
  background:rgba(7,4,26,.97);
  border-top:1px solid rgba(255,255,255,.09);
  overflow:hidden;
  font-family:-apple-system,"Segoe UI",Roboto,sans-serif}
#tb-html-bar::before{content:'';position:absolute;inset:0;
  background:radial-gradient(ellipse at 50% 0%,rgba(90,50,180,.13),transparent 65%);
  pointer-events:none}
.tb-item{flex:1;display:flex;flex-direction:column;align-items:center;
  justify-content:center;position:relative;cursor:pointer;
  padding:3px 0 4px;overflow:hidden;
  -webkit-tap-highlight-color:transparent;user-select:none;
  transition:background .15s}
.tb-item:active{background:rgba(255,255,255,.07)}
.tb-dot{position:absolute;top:4px;left:50%;transform:translateX(-50%);
  width:7px;height:7px;border-radius:50%;
  opacity:0;transition:opacity .22s;
  background:var(--col);
  box-shadow:0 0 7px var(--col),0 0 3px var(--col)}
.tb-item.active .tb-dot{opacity:1}
.tb-icon-wrap{width:28px;height:28px;display:flex;align-items:center;
  justify-content:center;position:relative;
  transition:transform .25s cubic-bezier(.34,1.56,.64,1)}
.tb-item.active .tb-icon-wrap{transform:scale(1.2) translateY(-2px)}
.tb-img{width:28px;height:28px;object-fit:contain;display:block;
  filter:saturate(.4) brightness(.6);
  transition:filter .25s}
.tb-item.active .tb-img{
  filter:saturate(1.15) brightness(1.1)
    drop-shadow(0 0 5px var(--col))
    drop-shadow(0 0 14px var(--col))}
.tb-em{font-size:21px;line-height:1;
  filter:saturate(.4) brightness(.65);transition:filter .25s}
.tb-item.active .tb-em{
  filter:saturate(1.1) brightness(1.1) drop-shadow(0 0 6px var(--col))}
.tb-ambient{position:absolute;bottom:6px;left:50%;
  transform:translateX(-50%);
  width:36px;height:5px;border-radius:50%;
  background:var(--col);filter:blur(5px);
  opacity:0;transition:opacity .25s;pointer-events:none}
.tb-item.active .tb-ambient{opacity:.48}
.tb-label{font-size:9px;font-weight:700;margin-top:3px;
  letter-spacing:.3px;white-space:nowrap;
  color:rgba(180,163,220,.5);
  transition:color .25s,text-shadow .25s}
.tb-item.active .tb-label{color:var(--col);text-shadow:0 0 8px var(--col)}
.tb-ripple{position:absolute;border-radius:50%;pointer-events:none;
  top:50%;left:50%;width:0;height:0;
  transform:translate(-50%,-50%);
  animation:tbRip .42s ease-out forwards}
@keyframes tbRip{from{opacity:.45}to{width:80px;height:80px;opacity:0}}
`;

  function _inject() {
    if (document.getElementById('tb-html-css')) return;
    const s = document.createElement('style');
    s.id = 'tb-html-css'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function _bv() {
    const v = window.BUILD_VERSION;
    return (v && v !== '__BUILD_VERSION__') ? '?v=' + v : '';
  }

  function _fit() {
    if (!_root) return;
    try {
      const c = document.querySelector('canvas'); if (!c) return;
      const r = c.getBoundingClientRect();
      const barH = Math.round(r.height * 76 / (c.height || 700));
      _root.style.top    = (r.top + r.height - barH) + 'px';
      _root.style.left   = r.left + 'px';
      _root.style.width  = r.width + 'px';
      _root.style.height = barH + 'px';
    } catch(_) {}
  }

  function _create() {
    if (_root) return;
    _inject();
    _root = document.createElement('div');
    _root.id = 'tb-html-bar';

    TABS.forEach(tab => {
      const item = document.createElement('div');
      item.className = 'tb-item';
      item.dataset.key = tab.key;
      item.style.setProperty('--col', tab.col);

      const dot  = document.createElement('div'); dot.className  = 'tb-dot';
      const wrap = document.createElement('div'); wrap.className = 'tb-icon-wrap';
      const amb  = document.createElement('div'); amb.className  = 'tb-ambient';
      const lbl  = document.createElement('div'); lbl.className  = 'tb-label'; lbl.textContent = tab.label;

      const img = document.createElement('img');
      img.className = 'tb-img';
      img.src = tab.img + _bv();
      img.onerror = () => {
        img.style.display = 'none';
        const em = document.createElement('span'); em.className = 'tb-em'; em.textContent = tab.em;
        wrap.appendChild(em);
      };
      wrap.appendChild(img);
      item.append(dot, wrap, amb, lbl);

      item.addEventListener('pointerdown', () => {
        const rip = document.createElement('div');
        rip.className = 'tb-ripple';
        rip.style.background = tab.col + '55';
        item.appendChild(rip);
        rip.addEventListener('animationend', () => rip.remove(), { once: true });
      });

      item.addEventListener('pointerup', () => {
        if (!_scene) return;
        const liveActive = _scene._activeTab || _activeKey;
        if (tab.key === liveActive) return;
        try { if (typeof Sound !== 'undefined' && Sound.tab) Sound.tab(); } catch(_) {}
        try { if (typeof tg !== 'undefined') tg?.HapticFeedback?.selectionChanged(); } catch(_) {}
        TabBar.navigate(_scene, tab.key, _onInternal);
      });

      _root.appendChild(item);
    });

    document.body.appendChild(_root);
    _fit();
    window.addEventListener('resize', _fit);
  }

  function setActive(key) {
    _activeKey = key;
    if (!_root) return;
    _root.querySelectorAll('.tb-item').forEach(el => {
      el.classList.toggle('active', el.dataset.key === key);
    });
  }

  function sync(scene, activeKey, onInternal) {
    _scene = scene;
    _onInternal = onInternal;
    _create();
    _fit();
    setActive(activeKey);
  }

  function hide() { if (_root) _root.style.display = 'none'; }
  function show() { if (_root) _root.style.display = 'flex'; }

  return { sync, setActive, hide, show, fit: _fit };
})();
