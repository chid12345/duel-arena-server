/* ============================================================
   WarriorSelect — HTML-оверлей выбора воина (MenuScene)
   _openWarriorSelect / _closeWarriorSelect / _selectWarriorType
   ============================================================ */

const _WS_CSS = `
#ws-overlay{position:fixed;inset:0;z-index:9100;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.82);backdrop-filter:blur(8px)}
#ws-panel{width:100%;max-width:430px;max-height:92dvh;display:flex;flex-direction:column;background:#040212;border-top:1px solid rgba(0,240,255,.18);border-left:1px solid rgba(0,240,255,.08);border-right:1px solid rgba(0,240,255,.08);border-radius:20px 20px 0 0;overflow:hidden;position:relative}
#ws-panel::before{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;background-image:linear-gradient(rgba(0,240,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,240,255,.03) 1px,transparent 1px);background-size:34px 34px}
#ws-panel::after{content:'';position:absolute;inset:0;z-index:0;pointer-events:none;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.14) 2px,rgba(0,0,0,.14) 4px)}
.ws-z{position:relative;z-index:2}
.ws-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 8px;border-bottom:1px solid rgba(0,240,255,.1)}
.ws-title{font-family:'Orbitron',sans-serif;font-size:13px;font-weight:700;letter-spacing:2px;color:#00f0ff;text-shadow:0 0 12px rgba(0,240,255,.6)}
.ws-sub{font-family:'Share Tech Mono',monospace;font-size:9px;color:rgba(0,240,255,.35);letter-spacing:1px;margin-top:1px}
.ws-x{width:28px;height:28px;border-radius:50%;border:1px solid rgba(0,240,255,.3);background:rgba(0,240,255,.07);color:rgba(0,240,255,.7);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
.ws-x:hover{background:rgba(255,50,80,.2);border-color:rgba(255,50,80,.6);color:#ff6688}
.ws-tabs{display:flex;gap:0;padding:8px 14px 6px;border-bottom:1px solid rgba(0,240,255,.07)}
.ws-tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px 6px;background:none;border:none;cursor:pointer;position:relative;transition:all .22s}
.ws-tab::after{content:'';position:absolute;bottom:-1px;left:20%;right:20%;height:2px;border-radius:2px;opacity:0;transition:opacity .22s}
.ws-tab.str::after{background:#ff5522;box-shadow:0 0 8px rgba(255,70,20,.9)}.ws-tab.agi::after{background:#00ff88;box-shadow:0 0 8px rgba(0,230,100,.9)}.ws-tab.crt::after{background:#cc44ff;box-shadow:0 0 8px rgba(190,60,255,.9)}
.ws-tab.active::after{opacity:1}
.ws-tab-icon{width:34px;height:34px;display:flex;align-items:center;justify-content:center;opacity:.3;transition:opacity .22s}
.ws-tab.active .ws-tab-icon{opacity:1}
.ws-tab-lbl{font-family:'Orbitron',sans-serif;font-size:7.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,.2);transition:color .22s}
.ws-tab.str.active .ws-tab-lbl{color:#ff7733}.ws-tab.agi.active .ws-tab-lbl{color:#00ee77}.ws-tab.crt.active .ws-tab-lbl{color:#cc66ff}
.ws-stage{position:relative;height:220px;display:flex;align-items:flex-end;justify-content:center;overflow:hidden}
.ws-aura{position:absolute;bottom:-20px;left:50%;transform:translateX(-50%);width:340px;height:200px;border-radius:50%;pointer-events:none;filter:blur(40px);z-index:1;transition:background .5s}
.ws-carousel{position:relative;z-index:5;display:flex;align-items:flex-end;justify-content:center;width:100%;height:100%;padding-bottom:10px}
.ws-card{position:absolute;display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:all .35s cubic-bezier(.34,1.22,.64,1)}
.ws-card[data-pos="-1"]{transform:translateX(-105px) scale(0.68);opacity:.35;filter:brightness(.5) saturate(.4);z-index:3}
.ws-card[data-pos="0"]{transform:translateX(0) scale(1);opacity:1;filter:none;z-index:6}
.ws-card[data-pos="1"]{transform:translateX(105px) scale(0.68);opacity:.35;filter:brightness(.5) saturate(.4);z-index:3}
.ws-img-wrap{position:relative;width:140px;height:180px;display:flex;align-items:flex-end;justify-content:center}
.ws-img-wrap::before{content:'';position:absolute;inset:-3px;border-radius:4px;opacity:0;transition:opacity .32s;pointer-events:none;z-index:0}
.ws-card[data-pos="0"] .ws-img-wrap::before{opacity:1}
body.wscls-str .ws-card[data-pos="0"] .ws-img-wrap::before{border:1.5px solid rgba(255,80,20,1);box-shadow:0 0 20px rgba(255,80,20,.7),0 0 50px rgba(255,80,20,.3)}
body.wscls-agi .ws-card[data-pos="0"] .ws-img-wrap::before{border:1.5px solid rgba(0,220,80,1);box-shadow:0 0 20px rgba(0,220,80,.7),0 0 50px rgba(0,220,80,.3)}
body.wscls-crt .ws-card[data-pos="0"] .ws-img-wrap::before{border:1.5px solid rgba(180,70,255,1);box-shadow:0 0 20px rgba(180,70,255,.7),0 0 50px rgba(180,70,255,.3)}
.ws-img{position:relative;z-index:2;width:100%;height:100%;object-fit:contain;object-position:bottom center;filter:drop-shadow(0 8px 20px rgba(0,0,0,.95));animation:wsFloat 3.8s ease-in-out infinite}
.ws-card[data-pos="0"] .ws-img{filter:drop-shadow(0 10px 24px rgba(0,0,0,.95)) brightness(1.1)}
.ws-glow{position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);width:110px;height:18px;border-radius:50%;filter:blur(10px);opacity:0;transition:opacity .32s;z-index:1}
.ws-card[data-pos="0"] .ws-glow{opacity:.85}
@keyframes wsFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.ws-fb{display:none;font-size:80px;animation:wsFloat 3.8s ease-in-out infinite;position:relative;z-index:2}
.ws-lbl{margin-top:6px;display:flex;flex-direction:column;align-items:center;gap:2px;transition:opacity .32s}
.ws-card[data-pos!="0"] .ws-lbl{opacity:.25}
.ws-sname{font-family:'Orbitron',sans-serif;font-size:11px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;color:#fff}
.ws-arr{position:absolute;top:50%;transform:translateY(-50%);width:34px;height:34px;border-radius:50%;border:1.5px solid rgba(0,240,255,.25);background:rgba(0,240,255,.06);cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:10;transition:all .2s}
.ws-arr.l{left:8px}.ws-arr.r{right:8px}
.ws-arr:hover{border-color:rgba(0,240,255,.8);box-shadow:0 0 14px rgba(0,240,255,.5)}
.ws-arr span{font-size:16px;color:rgba(0,240,255,.6);transition:color .2s;user-select:none}
.ws-arr:hover span{color:rgba(0,240,255,1)}
.ws-bottom{padding:10px 16px 20px;background:linear-gradient(to top,rgba(4,2,18,1) 65%,transparent);backdrop-filter:blur(15px);display:flex;flex-direction:column;gap:8px}
.ws-dots{display:flex;justify-content:center;gap:7px}
.ws-dot{width:6px;height:6px;border-radius:1px;background:rgba(0,240,255,.18);cursor:pointer;transition:all .28s}
.ws-dot.on{width:20px;border-radius:2px;background:currentColor;box-shadow:0 0 8px currentColor}
.ws-info{text-align:center}
.ws-cname{font-family:'Orbitron',sans-serif;font-size:20px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;transition:color .32s,text-shadow .32s}
body.wscls-str .ws-cname{color:#ff7733;text-shadow:0 0 20px rgba(255,100,40,.6)}
body.wscls-agi .ws-cname{color:#00ff88;text-shadow:0 0 20px rgba(0,220,100,.55)}
body.wscls-crt .ws-cname{color:#cc66ff;text-shadow:0 0 20px rgba(180,70,255,.6)}
.ws-bonuses{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}
.ws-plus{font-family:'Share Tech Mono',monospace;font-size:11px;padding:3px 10px;border-radius:3px;background:rgba(0,255,100,.1);border:1px solid rgba(0,255,100,.3);color:#44ff88}
.ws-minus{font-family:'Share Tech Mono',monospace;font-size:11px;padding:3px 10px;border-radius:3px;background:rgba(255,200,0,.06);border:1px solid rgba(255,200,0,.2);color:#ccaa55}
.ws-btn{width:100%;padding:13px;border-radius:3px;clip-path:polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%);border:none;font-family:'Orbitron',sans-serif;font-size:12px;font-weight:700;cursor:pointer;letter-spacing:1.5px;text-transform:uppercase;transition:all .22s;position:relative;overflow:hidden}
.ws-btn::before{content:'';position:absolute;top:0;left:-80%;width:50%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent);transform:skewX(-15deg);animation:wsShine 2.4s ease-in-out infinite}
@keyframes wsShine{0%{left:-80%}60%,100%{left:140%}}
body.wscls-str .ws-btn{background:linear-gradient(90deg,#8b1500,#ff5522,#8b1500);background-size:200%;color:#fff;box-shadow:0 0 18px rgba(255,70,20,.5);animation:wsBtnFlow 3s linear infinite}
body.wscls-agi .ws-btn{background:linear-gradient(90deg,#004d1a,#00ff88,#004d1a);background-size:200%;color:#001a0a;box-shadow:0 0 18px rgba(0,220,80,.45);animation:wsBtnFlow 3s linear infinite}
body.wscls-crt .ws-btn{background:linear-gradient(90deg,#3d0080,#cc44ff,#3d0080);background-size:200%;color:#fff;box-shadow:0 0 18px rgba(180,50,255,.5);animation:wsBtnFlow 3s linear infinite}
@keyframes wsBtnFlow{0%{background-position:0%}100%{background-position:200%}}
.ws-btn:active{transform:scale(.97)}
#ws-confirm{position:absolute;inset:0;z-index:30;display:flex;flex-direction:column;justify-content:flex-end;padding:20px 16px 24px;background:rgba(4,2,18,.9);backdrop-filter:blur(6px);border-radius:20px 20px 0 0}
.ws-conf-name{font-family:'Orbitron',sans-serif;font-size:22px;font-weight:900;letter-spacing:2px;text-transform:uppercase;text-align:center;margin-bottom:10px}
.ws-conf-desc{font-family:'Share Tech Mono',monospace;font-size:11.5px;line-height:1.7;color:rgba(255,255,255,.55);text-align:center;padding:0 4px 16px}
.ws-conf-btns{display:flex;gap:10px}
.ws-conf-cancel{flex:1;padding:12px;border-radius:3px;border:1px solid rgba(0,240,255,.22);background:rgba(0,240,255,.05);font-family:'Orbitron',sans-serif;font-size:10px;font-weight:700;cursor:pointer;letter-spacing:1px;text-transform:uppercase;color:rgba(0,240,255,.65)}
.ws-conf-ok{flex:2;padding:13px;border-radius:3px;clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%);border:none;font-family:'Orbitron',sans-serif;font-size:12px;font-weight:700;cursor:pointer;letter-spacing:1.5px;text-transform:uppercase;position:relative;overflow:hidden}
.ws-conf-ok::before{content:'';position:absolute;top:0;left:-80%;width:50%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent);transform:skewX(-15deg);animation:wsShine 2.4s ease-in-out infinite}
`;

const _WS_DATA = {
  tank:  { cls:'str', label:'Сила',     bonus:'+12% УРОН',     penalty:'↓8% уворот',
    desc:'Каждый удар наносит на 12% больше урона — ты бьёшь тяжелее всех. За это платишь скоростью: противник уклоняется от тебя на 8% легче. Выбирай если хочешь ломить напролом.',
    aura:'radial-gradient(ellipse,rgba(255,80,15,.22) 0%,transparent 68%)',
    glow:'rgba(255,80,20,.8)',
    skins:[{img:'skins/sila/1.png',name:'МОЛОТ',e:'⚔️'},{img:'skins/sila/2.png',name:'ТИРАН',e:'🛡️'},{img:'skins/sila/3.png',name:'ДРАКОН',e:'🔥'}] },
  agile: { cls:'agi', label:'Ловкость', bonus:'+8% УКЛОН',     penalty:'↓10% броня',
    desc:'Ты скользишь как тень — уклоняешься от ударов на 8% чаще. Но лёгкая броня трещит: защита снижена на 10%. Выбирай если хочешь уходить от урона и бить первым.',
    aura:'radial-gradient(ellipse,rgba(0,200,70,.2) 0%,transparent 68%)',
    glow:'rgba(0,210,80,.75)',
    skins:[{img:'skins/agility/1.png',name:'ПРИЗРАК',e:'🌑'},{img:'skins/agility/2.png',name:'КОГОТЬ',e:'🗡️'},{img:'skins/agility/3.png',name:'ШТОРМ',e:'💨'}] },
  crit:  { cls:'crt', label:'Интуиция', bonus:'+5% КРИТ ×1.65',penalty:'↓10% HP',
    desc:'Критические удары срабатывают чаще (+5%) и бьют в 1.65× сильнее обычного. Но твоё HP ниже на 10% — ты хрупкий. Выбирай если хочешь убивать с одного удара.',
    aura:'radial-gradient(ellipse,rgba(160,55,255,.2) 0%,transparent 68%)',
    glow:'rgba(160,60,255,.75)',
    skins:[{img:'skins/crit/1.png',name:'ХАОС',e:'💜'},{img:'skins/crit/2.png',name:'ПУСТОТА',e:'🔮'},{img:'skins/crit/3.png',name:'РОК',e:'✨'}] },
};

Object.assign(MenuScene.prototype, {

  _openWarriorSelect() {
    if (document.getElementById('ws-overlay')) return;
    if (!document.getElementById('ws-style')) {
      const s = document.createElement('style'); s.id = 'ws-style';
      s.textContent = '@import url("https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@700;900&display=swap");' + _WS_CSS;
      document.head.appendChild(s);
    }
    const _canvas = document.querySelector('canvas');
    if (_canvas) _canvas.style.pointerEvents = 'none';

    const curType = State.player?.warrior_type || 'tank';
    const el = document.createElement('div'); el.id = 'ws-overlay';
    el.innerHTML = `<div id="ws-panel">
      <div class="ws-head ws-z">
        <div><div class="ws-title">⚔ ВЫБЕРИ ВОИНА</div><div class="ws-sub">// ТИП ВЛИЯЕТ НА БОЙ //</div></div>
        <div class="ws-x" id="ws-close">✕</div>
      </div>
      <div class="ws-tabs ws-z" id="ws-tabs">
        <button class="ws-tab str" data-key="tank">
          <div class="ws-tab-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><line x1="3" y1="3" x2="21" y2="21" stroke="#ff5522" stroke-width="2.6" stroke-linecap="round"/><line x1="21" y1="3" x2="3" y2="21" stroke="#ff5522" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="3" r="1.8" fill="#ff5522"/><circle cx="12" cy="21" r="1.8" fill="#ff5522"/><circle cx="3" cy="12" r="1.8" fill="#ff5522"/><circle cx="21" cy="12" r="1.8" fill="#ff5522"/></svg></div>
          <div class="ws-tab-lbl">Сила</div></button>
        <button class="ws-tab agi" data-key="agile">
          <div class="ws-tab-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="#00ee77" stroke-width="2"/><circle cx="12" cy="12" r="3.5" fill="#00ee77" opacity=".5"/><circle cx="12" cy="12" r="1.4" fill="#00ee77"/></svg></div>
          <div class="ws-tab-lbl">Ловкость</div></button>
        <button class="ws-tab crt" data-key="crit">
          <div class="ws-tab-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><polygon points="12,2 22,12 12,22 2,12" stroke="#cc44ff" stroke-width="2" fill="rgba(180,60,255,.12)"/><polygon points="12,7 17,12 12,17 7,12" fill="#cc44ff" opacity=".55"/><circle cx="12" cy="12" r="1.8" fill="#cc44ff"/></svg></div>
          <div class="ws-tab-lbl">Интуиция</div></button>
      </div>
      <div class="ws-stage ws-z" id="ws-stage">
        <div class="ws-aura" id="ws-aura"></div>
        <div class="ws-carousel" id="ws-carousel"></div>
        <div class="ws-arr l" id="ws-prev"><span>◂</span></div>
        <div class="ws-arr r" id="ws-next"><span>▸</span></div>
      </div>
      <div class="ws-bottom ws-z">
        <div class="ws-dots" id="ws-dots"></div>
        <div class="ws-info"><div class="ws-cname" id="ws-cname"></div></div>
        <div class="ws-bonuses" id="ws-bonuses"></div>
        <button class="ws-btn ws-z" id="ws-btn"></button>
      </div></div>`;
    document.body.appendChild(el);

    let curKey = _WS_DATA[curType] ? curType : 'tank';
    let curSkin = 0;
    const scene = this;

    function render() {
      const d = _WS_DATA[curKey];
      document.body.className = document.body.className.replace(/wscls-\S+/g,'').trim() + ' wscls-' + d.cls;
      document.querySelectorAll('.ws-tab').forEach(t => t.classList.toggle('active', t.dataset.key === curKey));
      document.getElementById('ws-aura').style.background = d.aura;
      const box = document.getElementById('ws-carousel'); box.innerHTML = '';
      d.skins.forEach((sk, i) => {
        const pos = i - curSkin; if (Math.abs(pos) > 1) return;
        const c = document.createElement('div'); c.className = 'ws-card'; c.dataset.pos = pos;
        c.innerHTML = `<div class="ws-img-wrap"><img class="ws-img" src="${sk.img}" alt="${sk.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><div class="ws-fb">${sk.e}</div><div class="ws-glow" style="background:${d.glow}"></div></div><div class="ws-lbl"><div class="ws-sname">${sk.name}</div></div>`;
        c.onclick = () => { if (i !== curSkin) { curSkin = i; render(); } };
        box.appendChild(c);
      });
      const clr = {str:'#ff7733',agi:'#00ff88',crt:'#cc66ff'}[d.cls];
      document.getElementById('ws-dots').innerHTML = d.skins.map((_,i) =>
        `<div class="ws-dot${i===curSkin?' on':''}" style="color:${clr}" data-i="${i}"></div>`).join('');
      document.querySelectorAll('.ws-dot').forEach(dot => dot.onclick = () => { curSkin=+dot.dataset.i; render(); });
      document.getElementById('ws-cname').textContent = d.skins[curSkin].name;
      document.getElementById('ws-bonuses').innerHTML = `<span class="ws-plus">${d.bonus}</span><span class="ws-minus">${d.penalty}</span>`;
      document.getElementById('ws-btn').textContent = `▶ ВЫБРАТЬ — ${d.label}`;
    }

    render();

    document.getElementById('ws-tabs').addEventListener('click', e => {
      const t = e.target.closest('.ws-tab');
      if (t && t.dataset.key !== curKey) { curKey = t.dataset.key; curSkin = 0; render(); }
    });
    document.getElementById('ws-prev').onclick = () => { if (curSkin > 0) { curSkin--; render(); } };
    document.getElementById('ws-next').onclick = () => { if (curSkin < 2) { curSkin++; render(); } };

    function fadeClose(cb) {
      el.style.transition = 'opacity 0.18s';
      el.style.opacity = '0';
      // Канвас УЖЕ pointerEvents:none из _openWarriorSelect — НЕ восстанавливаем
      // его в _closeWarriorSelect, держим выключенным до снятия блокера.
      // overlay не глушим (DOM сам поглощает клики во время fade).
      setTimeout(() => {
        // Блокер ставим ПЕРЕД удалением overlay → нет щели для click-through.
        const g = document.createElement('div');
        g.style.cssText = 'position:fixed;inset:0;z-index:9200;background:transparent;';
        document.body.appendChild(g);
        scene._closeWarriorSelect();
        if (cb) cb();
        // Через 700ms убираем блокер И возвращаем канвасу обычный pointer-events.
        // 700ms = запас под медленные мобильные таймеры/тач-задержки.
        setTimeout(() => {
          g.remove();
          const cv = document.querySelector('canvas');
          if (cv) cv.style.pointerEvents = '';
        }, 700);
      }, 200);
    }

    document.getElementById('ws-btn').addEventListener('click', e => {
      e.stopPropagation(); e.preventDefault();
      const d = _WS_DATA[curKey];
      const key = curKey, skin = curSkin;
      const sk = d.skins[skin];
      // Показываем попап-подтверждение с описанием
      const old = document.getElementById('ws-confirm');
      if (old) old.remove();
      const conf = document.createElement('div'); conf.id = 'ws-confirm';
      const clrMap = {str:'#ff7733',agi:'#00ff88',crt:'#cc66ff'};
      const btnBg = {
        str:'background:linear-gradient(90deg,#8b1500,#ff5522,#8b1500);color:#fff;box-shadow:0 0 18px rgba(255,70,20,.5)',
        agi:'background:linear-gradient(90deg,#004d1a,#00ff88,#004d1a);color:#001a0a;box-shadow:0 0 18px rgba(0,220,80,.45)',
        crt:'background:linear-gradient(90deg,#3d0080,#cc44ff,#3d0080);color:#fff;box-shadow:0 0 18px rgba(180,50,255,.5)',
      }[d.cls];
      conf.innerHTML = `
        <div class="ws-conf-name" style="color:${clrMap[d.cls]}">${sk.name}</div>
        <div class="ws-conf-desc">${d.desc}</div>
        <div class="ws-conf-btns">
          <button class="ws-conf-cancel" id="ws-conf-cancel">✕ НАЗАД</button>
          <button class="ws-conf-ok" id="ws-conf-ok" style="${btnBg}">✓ ПРИНЯТЬ</button>
        </div>`;
      document.getElementById('ws-panel').appendChild(conf);
      document.getElementById('ws-conf-cancel').onclick = ev => { ev.stopPropagation(); conf.remove(); };
      document.getElementById('ws-conf-ok').addEventListener('click', ev => {
        ev.stopPropagation(); ev.preventDefault();
        const encoded = skin > 0 ? `${key}_${skin}` : key;
        fadeClose(() => scene._selectWarriorType(encoded, `${sk.name} (${d.label})`));
      });
    });

    document.getElementById('ws-close').onclick = e => { e.stopPropagation(); fadeClose(); };
    el.addEventListener('click', e => { if (e.target === el) { e.stopPropagation(); fadeClose(); } });
    let tx = 0;
    const stg = document.getElementById('ws-stage');
    stg.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, {passive:true});
    stg.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 40) { const n = curSkin + (dx < 0 ? 1 : -1); if (n >= 0 && n <= 2) { curSkin = n; render(); } }
    }, {passive:true});
  },

  _closeWarriorSelect() {
    const el = document.getElementById('ws-overlay');
    if (el) el.remove();
    document.body.className = document.body.className.replace(/wscls-\S+/g,'').trim();
    // canvas pointer-events НЕ восстанавливаем здесь: fadeClose держит его
    // выключенным до снятия блокера (700ms), иначе хвостовой touchend
    // протекает в нижний таб-бар и кидает игрока в Босс/Героя/Рейтинг.
    // Если оверлей закрылся БЕЗ fadeClose (теоретически невозможно, но safety
    // net) — восстановим через 700ms.
    setTimeout(() => {
      if (!document.getElementById('ws-overlay')) {
        const cv = document.querySelector('canvas');
        if (cv && cv.style.pointerEvents === 'none') cv.style.pointerEvents = '';
      }
    }, 700);
  },

  _tryBattle() {
    const wt = State.player?.warrior_type || '';
    const base = wt.split('_')[0];
    if (!['tank','agile','crit'].includes(base)) {
      tg?.HapticFeedback?.notificationOccurred('warning');
      this._toast('⚔️ Сначала выбери воина — он влияет на бой!');
      this._wsReturnTab = 'battle';
      this._openWarriorSelect();
      return;
    }
    this._switchTab('battle');
  },

  async _selectWarriorType(encodedType, name) {
    if (!State.player) return;
    State.player.warrior_type = encodedType;
    const retTab = this._wsReturnTab || 'profile';
    this._wsReturnTab = null;
    const old = this._panels.profile;
    if (old) {
      try { this.sys.displayList.remove(old); } catch(_e) {}
      try { old.destroy(); } catch(_e) {}
      this._panels.profile = null;
    }
    try {
      this._buildProfilePanel();
      this._switchTab(retTab);
    } catch(e) { console.warn('[WS] rebuild profile:', e); }
    this._toast(`⚔️ Воин выбран: ${name || encodedType}`);
    post('/api/warrior-type', { warrior_type: encodedType })
      .then(r => { if (!r.ok) this._toast(`⚠️ Не сохранён (${r.reason || r.detail || 'err'})`); })
      .catch(() => this._toast('⚠️ Воин не сохранён — нет связи'));
  },

});
