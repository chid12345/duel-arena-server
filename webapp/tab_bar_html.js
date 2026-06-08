/* ============================================================
   TabBar HTML — нижний таббар как HTML overlay (вместо Phaser-слоя).
   PNG-иконки с CSS drop-shadow glow; плавные CSS-переходы.
   TabBarHTML.sync(scene, activeKey, onInternal)  — вызывается из TabBar.build()
   TabBarHTML.setActive(key)                       — обновить активную вкладку
   TabBarHTML.hide() / .show()                     — для полноэкранных оверлеев
   ============================================================ */
window.TabBarHTML = (() => {
  const TABS = [
    { key: 'profile', label: 'Профиль', img: 'tab_profile.webp', em: '⚔️', col: '#22d3ee' },
    { key: 'clan',    label: 'Клан',    img: 'tab_clan.webp',    em: '🏰', col: '#fb7185' },
    { key: 'stats',   label: 'Герой',   img: 'tab_stats.webp',   em: '🛡️', col: '#818cf8' },
    { key: 'boss',    label: 'Босс',    img: 'tab_boss.webp',    em: '💀', col: '#fb923c' },
    { key: 'rating',  label: 'Рейтинг', img: 'tab_rating.webp',  em: '👑', col: '#fbbf24' },
    { key: 'more',    label: 'Меню',    img: 'tab_more.webp',    em: '📜', col: '#a78bfa' },
  ];

  let _root = null, _scene = null, _onInternal = null, _activeKey = null;

  const CSS = `
/* Вариант B "Голо-платформы (Tron)" — иконки парят над светящейся платформой */
#tb-html-bar{position:fixed;z-index:9200;display:flex;
  background:linear-gradient(180deg,transparent 0,rgba(7,4,26,.55) 40%,rgba(7,4,26,.92) 100%);
  font-family:-apple-system,"Segoe UI",Roboto,sans-serif;
  touch-action:manipulation;padding:0 4px;gap:4px}
/* Тонкая верхняя неоновая линия — отделяет панель от контента */
#tb-html-bar::before{content:"";position:absolute;left:0;right:0;top:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(0,240,255,.45),transparent);
  box-shadow:0 0 8px rgba(0,240,255,.35);pointer-events:none}
/* Ячейки — без фонов и рамок, иконки "парят" */
.tb-item{flex:1;display:flex;flex-direction:column;align-items:center;
  justify-content:center;position:relative;cursor:pointer;
  padding:4px 0 6px;
  -webkit-tap-highlight-color:transparent;user-select:none;
  background:transparent}
/* Голо-платформа под иконкой: эллипс цвета таба, blur, у активного ярче и пульсирует */
.tb-platform{position:absolute;left:14%;right:14%;bottom:6px;height:4px;
  border-radius:50%;background:var(--col);filter:blur(2px);
  opacity:.45;transition:opacity .25s,filter .25s,height .25s;
  pointer-events:none;z-index:0}
/* Расширенное свечение платформы (эллипс-аура) */
.tb-platform::after{content:"";position:absolute;left:-15%;right:-15%;top:-2px;
  height:8px;border-radius:50%;
  background:radial-gradient(ellipse,var(--col) 0%,transparent 70%);
  opacity:.4;transition:opacity .25s}
.tb-item.active .tb-platform{opacity:.95;filter:blur(3px);height:5px;
  animation:tbPulse 1.6s ease-in-out infinite}
.tb-item.active .tb-platform::after{opacity:.75}
@keyframes tbPulse{0%,100%{opacity:.85}50%{opacity:1}}
/* Обёртка иконки */
.tb-icon-wrap{width:28px;height:28px;display:flex;align-items:center;
  justify-content:center;position:relative;z-index:1;margin-bottom:6px;
  transition:transform .28s cubic-bezier(.34,1.56,.64,1)}
.tb-item.active .tb-icon-wrap{transform:translateY(-5px) scale(1.14)}
.tb-item:active .tb-icon-wrap{transform:scale(.88)}
.tb-item.active:active .tb-icon-wrap{transform:translateY(-2px) scale(1.04)}
/* PNG-иконка — все горят своим цветом, активная ярче */
.tb-img{width:28px;height:28px;object-fit:contain;display:block;
  filter:saturate(.9) brightness(.85)
    drop-shadow(0 0 5px var(--col))
    drop-shadow(0 0 12px var(--col))
    drop-shadow(0 2px 3px rgba(0,0,0,.7));
  transition:filter .25s}
.tb-item.active .tb-img{
  filter:saturate(1.35) brightness(1.2)
    drop-shadow(0 0 8px var(--col))
    drop-shadow(0 0 22px var(--col))
    drop-shadow(0 3px 4px rgba(0,0,0,.7))}
/* Emoji-фолбэк */
.tb-em{font-size:21px;line-height:1;
  filter:saturate(.9) brightness(.85) drop-shadow(0 0 6px var(--col)) drop-shadow(0 2px 3px rgba(0,0,0,.7));
  transition:filter .25s}
.tb-item.active .tb-em{
  filter:saturate(1.3) brightness(1.18) drop-shadow(0 0 10px var(--col)) drop-shadow(0 0 22px var(--col))}
/* Подпись — у всех цвет своего таба, активная ярче */
.tb-label{font-size:9px;font-weight:700;
  letter-spacing:.4px;white-space:nowrap;position:relative;z-index:1;
  color:var(--col);opacity:.6;text-shadow:0 0 4px var(--col);
  transition:opacity .25s,text-shadow .25s}
.tb-item.active .tb-label{opacity:1;text-shadow:0 0 9px var(--col),0 0 2px var(--col)}
/* Ripple при тапе */
.tb-ripple{position:absolute;border-radius:50%;pointer-events:none;
  top:50%;left:50%;width:0;height:0;
  transform:translate(-50%,-50%);
  animation:tbRip .42s ease-out forwards;z-index:2}
@keyframes tbRip{from{opacity:.38}to{width:80px;height:80px;opacity:0}}
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

      const platform = document.createElement('div'); platform.className = 'tb-platform';
      const wrap     = document.createElement('div'); wrap.className     = 'tb-icon-wrap';
      const lbl      = document.createElement('div'); lbl.className      = 'tb-label'; lbl.textContent = tab.label;

      const img = document.createElement('img');
      img.className = 'tb-img';
      img.src = tab.img + _bv();
      img.onerror = () => {
        img.style.display = 'none';
        const em = document.createElement('span'); em.className = 'tb-em'; em.textContent = tab.em;
        wrap.appendChild(em);
      };
      wrap.appendChild(img);
      item.append(platform, wrap, lbl);

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
    show();   // гарантируем видимость — сцены без TabBar.build скроют через hide()
    _fit();
    setActive(activeKey);
  }

  function hide() { if (_root) _root.style.display = 'none'; }
  function show() { if (_root) _root.style.display = 'flex'; }

  return { sync, setActive, hide, show, fit: _fit };
})();
