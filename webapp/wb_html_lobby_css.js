/* wb_html_lobby_css.js — CSS лобби Мирового Босса */
window.WBLobbyCSS = (() => {
  const CSS = `
#wb-root{position:fixed;inset:0;z-index:9500;overflow-y:auto;overflow-x:hidden;
  background:radial-gradient(ellipse at 50% -5%,#1d0035 0%,#04030a 55%),#000;
  font-family:-apple-system,"Segoe UI",Roboto,sans-serif;color:#ddeeff;scrollbar-width:none;}
#wb-root::-webkit-scrollbar{display:none}
#wb-root::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
  background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,255,200,.016) 3px 4px);}
#wb-root::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
  background:radial-gradient(circle at 10% 15%,rgba(255,0,200,.09) 0%,transparent 40%),
             radial-gradient(circle at 90% 80%,rgba(0,200,255,.07) 0%,transparent 40%);}
#wb-root>*{position:relative;z-index:1;}

/* ── Шапка ── */
.wb-hdr{display:flex;align-items:center;gap:10px;padding:12px 14px 10px;
  border-bottom:1px solid rgba(255,0,200,.18);
  background:linear-gradient(180deg,rgba(30,0,50,.5) 0%,transparent 100%);position:sticky;top:0;z-index:10;}
@keyframes wbBackGlow{0%,100%{text-shadow:0 0 8px #00f5ff,0 0 18px rgba(0,245,255,.3);opacity:.75}50%{text-shadow:0 0 16px #00f5ff,0 0 32px rgba(0,245,255,.6);opacity:1}}
.wb-back{display:inline-flex;flex-direction:column;align-items:center;line-height:1;font-size:30px;color:#00f5ff;cursor:pointer;padding:2px 10px;user-select:none;animation:wbBackGlow 2s ease-in-out infinite}
.wb-back::after{content:'НАЗАД';font-size:6px;font-weight:700;letter-spacing:1.2px;color:rgba(0,245,255,.6);margin-top:-1px}
.wb-back:active{transform:scale(.88)}
.wb-hdr-icon{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;font-size:20px;
  background:linear-gradient(135deg,#1a0033,#002a30);border:1px solid #ff00cc;
  box-shadow:0 0 16px rgba(255,0,200,.5);animation:wb-ip 3s ease-in-out infinite;}
@keyframes wb-ip{0%,100%{box-shadow:0 0 14px rgba(255,0,200,.45)}50%{box-shadow:0 0 26px rgba(255,0,200,.85)}}
.wb-title{font-size:15px;font-weight:900;letter-spacing:2px;
  background:linear-gradient(90deg,#ff00cc,#00e5ff);-webkit-background-clip:text;background-clip:text;color:transparent;}
.wb-sub{font-size:8px;color:#00e5ff;opacity:.65;letter-spacing:1.5px;margin-top:1px;}
.wb-live{margin-left:auto;display:flex;align-items:center;gap:4px;flex-shrink:0;
  background:rgba(0,255,159,.06);border:1px solid rgba(0,255,159,.2);border-radius:6px;padding:4px 8px;}
.wb-ldot{width:5px;height:5px;border-radius:50%;background:#00FF9F;box-shadow:0 0 5px #00FF9F;animation:wb-blink 1s infinite;}
.wb-livenum{font-family:'Courier New',monospace;font-size:11px;font-weight:700;color:#00FF9F;}

/* ── Карточка таймера босса (компактная, пульсирует) ── */
.wb-bcard2{margin:8px 14px 0;border-radius:12px;padding:10px 14px;cursor:pointer;position:relative;
  background:linear-gradient(135deg,rgba(20,0,40,.97),rgba(0,8,28,.97));
  border:1px solid rgba(255,0,204,.35);
  animation:wb-boss-glow 2.5s ease-in-out infinite;transition:transform .12s;}
@keyframes wb-boss-glow{
  0%,100%{box-shadow:0 0 14px rgba(255,0,204,.1);border-color:rgba(255,0,204,.3);}
  50%{box-shadow:0 0 34px rgba(255,0,204,.4);border-color:rgba(255,0,204,.7);}}
.wb-bcard2:active{transform:scale(.99);}
.wb-bc2-tlbl{font-size:8px;font-weight:800;letter-spacing:2px;color:#cc44ff;}
.wb-bc2-tval{font-size:28px;font-weight:900;letter-spacing:2px;font-family:'Courier New',monospace;
  background:linear-gradient(180deg,#00ffee,#00aacc);-webkit-background-clip:text;background-clip:text;color:transparent;
  animation:wb-cp 1s ease-in-out infinite;}
@keyframes wb-cp{0%,100%{filter:drop-shadow(0 0 8px rgba(0,230,255,.6))}50%{filter:drop-shadow(0 0 18px rgba(0,230,255,1))}}
.wb-bc2-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;}
.wb-bc2-hint{font-size:9px;font-weight:800;letter-spacing:1px;color:#ff88dd;
  text-shadow:0 0 8px rgba(255,80,200,.4);white-space:nowrap;opacity:.9;}
.wb-unclaimed{margin:8px 14px 0;padding:11px 14px;border-radius:11px;cursor:pointer;
  background:linear-gradient(135deg,rgba(255,180,40,.18),rgba(255,80,180,.15));
  border:1.5px solid rgba(255,200,80,.5);
  font-size:12px;font-weight:800;color:#ffe080;text-align:center;
  text-shadow:0 0 10px rgba(255,200,80,.5);
  animation:wb-unclaimed-pulse 1.6s ease-in-out infinite;
  transition:transform .12s;}
.wb-unclaimed:active{transform:scale(.98);}
@keyframes wb-unclaimed-pulse{
  0%,100%{box-shadow:0 0 12px rgba(255,200,80,.25);}
  50%{box-shadow:0 0 26px rgba(255,200,80,.55);}}

/* ── Призовой фонд ── */
.wb-prize{margin:6px 14px 0;padding:10px 12px;border-radius:12px;cursor:pointer;
  background:rgba(255,160,0,.06);border:1px solid rgba(255,160,0,.2);
  display:flex;justify-content:space-between;align-items:center;gap:8px;
  transition:transform .12s,background .15s;}
.wb-prize:active{transform:scale(.99);background:rgba(255,160,0,.1);}
.wb-prize-l{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0;}
.wb-prize-row{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.wb-prize-lbl{font-size:8px;font-weight:800;letter-spacing:1.5px;color:#ffdd44;text-shadow:0 0 5px rgba(255,210,0,.4);}
.wb-prize-hint{font-size:9px;color:#ffaa44;font-weight:700;letter-spacing:.3px;
  white-space:nowrap;text-shadow:0 0 6px rgba(255,160,0,.4);opacity:.9;}
.wb-prize-coins{font-size:20px;font-weight:900;color:#ffdd44;text-shadow:0 0 10px rgba(255,200,0,.6);white-space:nowrap;margin-top:2px;}
.wb-prize-formula{font-size:9px;color:#aaa;font-weight:600;letter-spacing:.3px;margin-top:1px;opacity:.7;}
.wb-prize-sub{font-size:9px;color:#ffaa44;font-weight:700;letter-spacing:.5px;}
.wb-prize-r{flex-shrink:0;text-align:center;}
.wb-prize-cnt{font-size:28px;font-weight:900;color:#00BFFF;text-shadow:0 0 10px rgba(0,191,255,.6);line-height:1;}
.wb-prize-players{font-size:9px;color:rgba(255,255,255,.35);margin-top:1px;white-space:nowrap;}

/* ── Аватары участников ── */
.wb-avstrip{display:flex;align-items:center;gap:4px;padding:5px 14px 2px;overflow:hidden;}
.wb-av{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:13px;
  background:linear-gradient(135deg,#1a0033,#0a1a30);border:1px solid rgba(255,0,200,.25);flex-shrink:0;}
.wb-av-more{font-size:9px;color:rgba(255,255,255,.35);letter-spacing:.5px;margin-left:4px;}

/* ── Разведка ── */
.wb-recon{display:flex;align-items:center;gap:10px;margin:6px 14px 0;padding:9px 12px;
  border-radius:11px;cursor:pointer;background:rgba(0,191,255,.04);border:1px solid rgba(0,191,255,.2);}
.wb-recon:active{background:rgba(0,191,255,.08);}
.wb-recon-ic{font-size:20px;flex-shrink:0;}
.wb-recon-txt{flex:1;min-width:0;}
.wb-recon-main{font-size:11px;font-weight:800;color:#00BFFF;}
.wb-recon-sub{font-size:9px;color:#446688;margin-top:1px;}
.wb-recon-arr{font-size:16px;color:#335566;flex-shrink:0;}

/* ── Авто-бой ── */
.wb-auto-row{display:flex;align-items:center;gap:10px;margin:4px 14px 0;padding:9px 12px;
  border-radius:11px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);}
.wb-auto-ic{font-size:20px;flex-shrink:0;}
.wb-auto-txt{flex:1;min-width:0;}
.wb-auto-main{font-size:11px;font-weight:700;color:#00FF9F;}
.wb-auto-sub{font-size:9px;color:#446688;margin-top:1px;}
.wb-toggle{width:36px;height:20px;border-radius:10px;background:rgba(255,255,255,.1);
  border:1px solid rgba(255,255,255,.15);position:relative;cursor:pointer;flex-shrink:0;transition:all .25s;}
.wb-toggle::after{content:"";position:absolute;left:2px;top:2px;width:15px;height:15px;border-radius:8px;
  background:rgba(255,255,255,.4);transition:all .25s;}
.wb-toggle.on{background:rgba(0,255,136,.2);border-color:rgba(0,255,136,.5);}
.wb-toggle.on::after{left:18px;background:#00ff88;box-shadow:0 0 6px #00ff88;}

/* ── Участвовать ── */
.wb-join-btn{display:flex;align-items:center;gap:10px;margin:6px 14px 0;padding:10px 14px;
  border-radius:12px;cursor:pointer;transition:all .2s;
  background:rgba(255,0,85,.1);border:1px solid rgba(255,0,85,.35);}
.wb-join-btn.joined{background:rgba(0,255,136,.07);border-color:rgba(0,255,136,.35);}
.wb-join-btn:active{transform:scale(.98);}
.wb-join-ico{font-size:22px;flex-shrink:0;}
.wb-join-txt{flex:1;min-width:0;}
.wb-join-main{font-size:12px;font-weight:800;color:#FF0055;letter-spacing:.3px;}
.wb-join-btn.joined .wb-join-main{color:#00ff88;}
.wb-join-sub{font-size:9px;color:rgba(255,100,120,.45);margin-top:2px;}
.wb-join-btn.joined .wb-join-sub{color:#339966;}
.wb-join-arr{font-size:16px;color:rgba(255,0,85,.5);flex-shrink:0;}
.wb-join-btn.joined .wb-join-arr{color:#00aa44;}

/* ── Напоминалка (отдельная кнопка под участвовать) ── */
.wb-remind-toggle{display:flex;align-items:center;gap:10px;margin:6px 14px 0;padding:9px 14px;
  border-radius:10px;cursor:pointer;transition:all .2s;
  background:rgba(255,200,0,.06);border:1px solid rgba(255,200,0,.2);}
.wb-remind-toggle.on{background:rgba(255,200,0,.12);border-color:rgba(255,200,0,.45);}
.wb-remind-toggle:active{transform:scale(.98);}
.wb-remind-ic{font-size:18px;flex-shrink:0;}
.wb-remind-lbl{flex:1;font-size:11px;font-weight:700;color:rgba(255,200,0,.55);letter-spacing:.2px;}
.wb-remind-toggle.on .wb-remind-lbl{color:#ffcc00;}
.wb-remind-arr{font-size:14px;color:rgba(255,200,0,.35);flex-shrink:0;}
.wb-remind-toggle.on .wb-remind-arr{color:#ffcc00;}

/* ── Войти в бой (активный рейд) ── */
.wb-enter{display:none;margin:8px 14px 0;height:58px;border-radius:14px;overflow:hidden;cursor:pointer;
  background:linear-gradient(135deg,#cc0055,#ff0080,#cc0055);background-size:200% auto;
  border:2px solid #ff00aa;animation:wb-eg 1s ease-in-out infinite;
  box-shadow:0 0 40px rgba(255,0,130,.5);}
@keyframes wb-eg{0%,100%{box-shadow:0 0 35px rgba(255,0,130,.5)}50%{box-shadow:0 0 55px rgba(255,0,130,.85)}}
.wb-enter.active{display:block;}
.wb-enter.locked{display:block;cursor:not-allowed;background:rgba(80,80,80,.3);
  border-color:rgba(120,120,120,.4);box-shadow:none;animation:none;}
.wb-enter.locked .wb-enter-icon{animation:none;opacity:.6;}
.wb-enter.locked .wb-enter-lbl{color:rgba(255,255,255,.4);}
.wb-enter.locked .wb-enter-sub{color:rgba(255,255,255,.3);}
.wb-enter-note{margin:8px 14px 0;padding:10px 14px;border-radius:10px;
  background:rgba(120,90,200,.08);border:1px solid rgba(160,120,255,.2);
  font-size:11px;color:rgba(220,200,255,.85);text-align:center;line-height:1.5;
  letter-spacing:.3px;}
.wb-enter-in{display:flex;align-items:center;justify-content:center;gap:10px;height:100%;position:relative;z-index:2;}
.wb-enter-icon{font-size:22px;animation:wb-eis .4s ease-in-out infinite alternate;}
@keyframes wb-eis{0%{transform:rotate(-5deg) scale(1)}100%{transform:rotate(5deg) scale(1.1)}}
.wb-enter-lbl{font-size:17px;font-weight:900;color:#fff;letter-spacing:2px;}
.wb-enter-sub{display:block;font-size:8px;color:rgba(255,200,220,.6);letter-spacing:3px;margin-top:1px;}

/* ── МОИ ЗАПАСЫ ── */
.wb-inv-sec{margin:6px 14px 0;}
.wb-inv-lbl{font-size:8px;font-weight:800;letter-spacing:2.5px;color:#00e5ff;text-shadow:0 0 5px currentColor;margin-bottom:5px;}
.wb-chips{display:flex;gap:5px;flex-wrap:wrap;}
.wb-chip{display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:8px;
  background:rgba(0,8,25,.8);border:1px solid rgba(0,229,255,.2);font-size:10px;font-weight:700;color:#aaeeff;}
.wb-chip b{color:#00e5ff;font-weight:900;}

/* ── Магазин: заголовок + категории ── */
.wb-shop-hdr{padding:10px 14px 5px;font-size:9px;font-weight:800;letter-spacing:2px;color:rgba(255,255,255,.5);
  display:flex;align-items:center;gap:10px;}
.wb-shop-line{flex:1;height:1px;background:rgba(255,255,255,.08);}
.wb-cats{display:flex;margin:0 14px;gap:5px;}
.wb-cat{flex:1;padding:7px 6px;border-radius:9px;display:flex;align-items:center;justify-content:center;
  gap:5px;cursor:pointer;transition:all .2s;
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);}
.wb-cat-ic{font-size:13px;filter:grayscale(.8) brightness(.5);flex-shrink:0;}
.wb-cat-lb{font-size:8px;font-weight:800;letter-spacing:.5px;color:#443355;}
.wb-cat.on{background:rgba(200,0,60,.18);border-color:rgba(255,0,85,.45);}
.wb-cat.on .wb-cat-ic{filter:grayscale(0);}
.wb-cat.on .wb-cat-lb{color:#ff4488;text-shadow:0 0 6px rgba(255,0,100,.5);}
.wb-cp{display:none;}.wb-cp.on{display:block;}

/* ── Бусты (горизонтальный скролл) ── */
.wb-bgrid{display:flex;overflow-x:auto;gap:4px;padding:3px 10px 8px;
  scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;}
.wb-bgrid::-webkit-scrollbar{display:none;}
.wb-bc{flex-shrink:0;width:62px;scroll-snap-align:start;
  padding:6px 5px 5px;border-radius:8px;cursor:pointer;position:relative;overflow:hidden;
  display:flex;flex-direction:column;gap:1px;
  background:linear-gradient(135deg,rgba(20,0,38,.97),rgba(5,4,18,.97));
  border:1px solid rgba(255,0,200,.2);transition:all .2s;}
.wb-bc:active{border-color:rgba(255,0,200,.55);box-shadow:0 0 6px rgba(255,0,200,.2);}
.bc-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:1px;}
.bc-ic{font-size:13px;line-height:1;filter:drop-shadow(0 0 4px rgba(255,0,200,.4));}
.bc-ow{font-size:7px;font-weight:800;color:#00BFFF;
  background:rgba(0,191,255,.12);border:1px solid rgba(0,191,255,.3);padding:1px 3px;border-radius:3px;}
.bc-nm{font-size:7px;font-weight:800;letter-spacing:.6px;color:rgba(255,255,255,.4);text-transform:uppercase;}
.bc-vl{font-family:'Courier New',monospace;font-size:11px;font-weight:900;color:#00FF9F;
  text-shadow:0 0 6px rgba(0,255,159,.5);line-height:1.1;}
.bc-buy{margin-top:3px;padding:3px 0;border-radius:5px;font-size:7px;font-weight:800;
  text-align:center;color:#44ddff;border:1px solid rgba(40,200,255,.35);
  background:rgba(40,200,255,.07);letter-spacing:.2px;}
.bc-bought-lbl{display:none;margin-top:3px;font-size:7px;font-weight:800;letter-spacing:.5px;
  color:#00FF9F;text-align:center;}

/* ── Куплено ── */
.wb-bc.bought{pointer-events:none;border-color:rgba(0,255,159,.25)!important;
  background:linear-gradient(135deg,rgba(0,20,12,.97),rgba(0,10,8,.97))!important;}
.wb-bc.bought .bc-buy{display:none;}
.wb-bc.bought .bc-bought-lbl{display:block;}
.wb-bc.bought .bc-vl{color:#00FF9F!important;}

/* ── Воскрешения ── */
.wb-rev-info{margin:6px 10px 8px;padding:8px 11px;border-radius:9px;
  background:linear-gradient(135deg,rgba(0,180,255,.06),rgba(180,0,200,.04));
  border:1px solid rgba(0,180,255,.18);
  font-size:9.5px;line-height:1.45;color:rgba(200,225,255,.78);letter-spacing:.2px;}
.wb-rev-info b{color:#ff66bb;text-shadow:0 0 4px rgba(255,102,187,.5);}
.wb-rgrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;padding:3px 10px 8px;}
.wb-rc{border-radius:8px;overflow:hidden;transition:all .15s;cursor:pointer;
  background:linear-gradient(135deg,rgba(25,0,20,.97),rgba(10,0,12,.97));border:1px solid rgba(255,80,180,.2);}
.wb-rc:hover{border-color:rgba(255,80,180,.55);background:linear-gradient(135deg,rgba(35,0,28,.99),rgba(15,0,18,.99));}
.wb-rc:active{transform:scale(.96);}
.wb-rc-info{cursor:default;opacity:.9;}
.wb-rc-info:hover{border-color:rgba(255,80,180,.2);background:linear-gradient(135deg,rgba(25,0,20,.97),rgba(10,0,12,.97));}
.wb-rc-info:active{transform:none;}
.wb-rh{padding:5px 5px 4px;text-align:center;
  background:linear-gradient(135deg,rgba(255,0,150,.08),rgba(200,0,100,.04));border-bottom:1px solid rgba(255,80,180,.12);}
.wb-ri{font-size:14px;filter:drop-shadow(0 0 4px rgba(255,80,180,.6));}
.wb-rh-pct{font-size:10px;font-weight:900;color:#ff66bb;text-shadow:0 0 4px currentColor;margin-top:1px;}
.wb-rb{padding:4px 4px;text-align:center;}
.wb-rb-cnt{font-size:11px;font-weight:900;color:#00e5ff;text-shadow:0 0 4px currentColor;}
.wb-rb-lbl{font-size:6px;color:#446688;letter-spacing:1px;margin-bottom:2px;}
.wb-rb-desc{font-size:6px;color:rgba(255,255,255,.5);margin-bottom:3px;line-height:1.2;}
.wb-rprice{padding:3px 0;border-radius:5px;font-size:9px;font-weight:900;text-align:center;
  background:rgba(220,170,0,.12);border:1px solid rgba(220,170,0,.4);
  color:#ffcc44;letter-spacing:.3px;}

/* ── История ── */
.wb-hist{padding:6px 14px 14px;display:flex;flex-direction:column;gap:6px;}
.wb-hist-empty{padding:24px 14px;text-align:center;font-size:11px;color:#334;letter-spacing:.5px;}
.wb-hr{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;
  background:rgba(8,0,18,.8);border:1px solid rgba(255,255,255,.06);}
.wb-hr.won{border-left:3px solid rgba(0,229,100,.5);}
.wb-hr.lost{border-left:3px solid rgba(255,40,80,.4);}
.wb-hr-em{font-size:22px;flex-shrink:0;}
.wb-hr-info{flex:1;min-width:0;}
.wb-hr-name{font-size:11px;font-weight:800;color:#ccc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.wb-hr-sub{display:flex;flex-wrap:wrap;gap:5px;margin-top:3px;align-items:center;}
.wb-hr-dmg{font-size:9px;font-weight:700;color:#ff8844;}
.wb-hr-gld{font-size:9px;font-weight:700;color:#ffcc44;}
.wb-hr-dia{font-size:9px;font-weight:700;color:#44ddff;}
.wb-hr-chest{font-size:8px;color:#bb88ff;font-weight:600;}
.wb-hr-skip{font-size:9px;color:#445;font-style:italic;}
.wb-hr-badge{flex-shrink:0;font-size:8px;font-weight:800;padding:3px 7px;border-radius:6px;letter-spacing:.4px;white-space:nowrap;}
.wb-hr-badge.won{background:rgba(0,229,100,.12);color:#00e564;border:1px solid rgba(0,229,100,.3);}
.wb-hr-badge.lost{background:rgba(255,40,80,.1);color:#ff5566;border:1px solid rgba(255,40,80,.3);}

/* ── Инфо-попап буста ── */
.wb-binfo-ov{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.6);
  backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity .2s;
  display:flex;align-items:flex-end;justify-content:center;}
.wb-binfo-ov.open{opacity:1;pointer-events:all;}
.wb-binfo{width:100%;max-width:390px;border-radius:20px 20px 0 0;padding:0 0 22px;
  background:linear-gradient(180deg,#0d0020 0%,#05030f 100%);
  border:1px solid rgba(255,0,200,.3);border-bottom:none;
  box-shadow:0 -8px 40px rgba(255,0,200,.15);
  transform:translateY(100%);transition:transform .28s cubic-bezier(.32,1.2,.5,1);}
.wb-binfo-ov.open .wb-binfo{transform:translateY(0);}
.wb-binfo-hdl{display:flex;justify-content:center;padding:9px 0 5px;}
.wb-binfo-hdl::before{content:"";width:32px;height:3px;border-radius:2px;background:rgba(255,0,200,.3);}
.wb-binfo-ic{font-size:38px;text-align:center;padding:6px 0 4px;
  filter:drop-shadow(0 0 10px rgba(255,0,200,.5));}
.wb-binfo-title{font-size:16px;font-weight:900;color:#fff;text-align:center;padding:0 18px 4px;letter-spacing:1px;}
.wb-binfo-val{font-family:'Courier New',monospace;font-size:22px;font-weight:900;
  color:#00FF9F;text-align:center;text-shadow:0 0 8px rgba(0,255,159,.5);padding-bottom:8px;}
.wb-binfo-desc{font-size:11px;color:rgba(255,255,255,.6);text-align:center;padding:0 22px 8px;line-height:1.5;}
.wb-binfo-note{font-size:10px;font-weight:700;color:#ffb84d;text-align:center;
  margin:0 18px 10px;padding:6px 10px;border-radius:8px;
  background:rgba(255,140,0,.08);border:1px solid rgba(255,140,0,.25);letter-spacing:.3px;}
.wb-binfo-own{font-size:9px;font-weight:800;color:#00BFFF;text-align:center;padding-bottom:10px;letter-spacing:.5px;}
.wb-binfo-buy{margin:0 14px;padding:12px;border-radius:12px;text-align:center;cursor:pointer;
  background:linear-gradient(135deg,rgba(255,0,85,.3),rgba(180,0,55,.3));
  border:1px solid rgba(255,0,85,.4);font-size:13px;font-weight:800;letter-spacing:1px;color:#fff;
  transition:background .15s;}
.wb-binfo-buy:active{background:linear-gradient(135deg,rgba(255,0,85,.5),rgba(180,0,55,.5));}

/* ── Тост + подготовка ── */
.wb-toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:9999;
  background:rgba(10,0,25,.95);border:1px solid rgba(255,0,200,.5);border-radius:10px;
  padding:10px 18px;font-size:12px;font-weight:700;color:#fff;pointer-events:none;
  animation:wb-tin .25s ease-out forwards;box-shadow:0 0 20px rgba(255,0,200,.3);}
@keyframes wb-tin{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.wb-prep{padding:20px 14px;text-align:center;}
.wb-prep-t{font-size:28px;font-weight:900;color:#ff00cc;text-shadow:0 0 16px currentColor;letter-spacing:2px;}
.wb-prep-s{font-size:11px;color:#8899aa;margin-top:8px;}

/* ─── НОВЫЙ LAYOUT ЗАЛА ОЖИДАНИЯ V2 (таймер сверху, чат, выход снизу) ─── */
.wb-gth.v2{display:flex;flex-direction:column;height:100%;padding:10px 10px 8px;gap:8px}
.wb-gth.v2 .wb-gth-topbar{flex-shrink:0;display:flex;align-items:center;gap:10px;
  padding:8px 12px;border-radius:12px;
  background:linear-gradient(180deg,rgba(20,5,40,.85),rgba(10,3,25,.55));
  border:1px solid rgba(140,80,255,.3);box-shadow:0 0 14px rgba(140,80,255,.15);position:relative;z-index:2}
.wb-gth.v2 .wb-gth-topbar-l{flex:1;display:flex;align-items:center;gap:8px;min-width:0}
.wb-gth.v2 .wb-gth-topbar-l .wb-gth-badge{flex-shrink:0;font-size:9px;font-weight:900;letter-spacing:1.2px;
  color:#80e8ff;background:rgba(0,240,255,.12);border:1px solid rgba(0,240,255,.4);
  border-radius:6px;padding:3px 7px}
.wb-gth.v2 .wb-gth-topbar-l .wb-gth-head{font-size:13px;font-weight:900;letter-spacing:.8px;
  color:#ff7acb;text-shadow:0 0 7px rgba(255,122,203,.55);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wb-gth.v2 .wb-gth-topbar-l .wb-gth-sub{font-size:8px;color:#7caaf0;opacity:.8;letter-spacing:1px;margin-top:1px}
.wb-gth.v2 .wb-gth-topbar-timer{flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end}
.wb-gth.v2 .wb-gth-topbar-timer .lbl{font-size:7px;color:#80c8ff;letter-spacing:1.2px}
.wb-gth.v2 .wb-gth-topbar-timer .val{font-size:20px;font-weight:900;line-height:1;color:#00f5ff;
  text-shadow:0 0 10px #00f5ff;letter-spacing:.5px;font-variant-numeric:tabular-nums}

/* Средняя секция — на ВСЁ свободное место. Внутри неё ростер тянется
   на всю высоту правого края, а ЧАТ слева ограничен 50vh / 380px max
   и прижат к ВЕРХУ — снизу под чатом проглядывает фон зала ожидания. */
.wb-gth.v2 .wb-gth-mid{flex:1;display:flex;gap:7px;min-height:0;position:relative;z-index:2}

.wb-chat-wrap{flex:1;display:flex;flex-direction:column;min-width:0;
  /* Как в мокапе: чат + ростер заполняют всю среднюю часть.
     Никаких лимитов по высоте — flex:1 тянется до самой кнопки «Выйти». */
  background:linear-gradient(180deg,rgba(15,3,30,.85),rgba(5,1,15,.92));
  border:1px solid rgba(0,240,255,.28);border-radius:12px;overflow:hidden;
  box-shadow:0 0 14px rgba(0,240,255,.08) inset}
.wb-chat-hdr{flex-shrink:0;padding:7px 10px;display:flex;align-items:center;gap:6px;
  border-bottom:1px solid rgba(0,240,255,.18);background:rgba(0,240,255,.04)}
.wb-chat-hdr .icon{font-size:13px}
.wb-chat-hdr .title{font-size:10px;font-weight:800;letter-spacing:.5px;color:#80e8ff}
.wb-chat-hdr .info{margin-left:auto;font-size:8px;color:#60a8c0;opacity:.65}
.wb-chat-list{flex:1;overflow-y:auto;padding:7px 8px;display:flex;flex-direction:column;gap:4px;
  scrollbar-width:none;-webkit-overflow-scrolling:touch}
.wb-chat-list::-webkit-scrollbar{display:none}
.wb-chat-list:empty::after{content:'— тишина в эфире —';display:block;font-size:10px;
  color:#60a8c0;opacity:.5;text-align:center;padding:14px 0;font-style:italic}
.wb-chat-msg{max-width:92%;padding:5px 8px;border-radius:9px;
  background:linear-gradient(135deg,rgba(25,10,40,.85),rgba(10,5,20,.85));
  border:1px solid rgba(255,59,168,.3);animation:wbCmIn .18s ease;word-break:break-word}
.wb-chat-msg.me{align-self:flex-end;border-color:rgba(0,240,255,.4);
  background:linear-gradient(135deg,rgba(10,20,50,.9),rgba(5,15,40,.9))}
.wb-chat-msg-nm{font-size:9px;font-weight:800;color:#ff7acb;margin-bottom:2px;letter-spacing:.3px}
.wb-chat-msg.me .wb-chat-msg-nm{color:#00f0ff}
.wb-chat-msg-tx{font-size:11px;color:#fff;line-height:1.35}
@keyframes wbCmIn{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
/* Минимальный input — как в мокапе: только input + большая яркая кнопка ➤.
   Счётчик убрали (зажирал место и прятал кнопку), maxlength=200 на input.
   Кнопка ➤ позиционирована absolute, чтобы её НЕ съел overflow:hidden
   родителя и flex-сжатие в узком чате на мобайле — раньше она
   фактически уезжала за правый край и казалась "пропавшей". */
.wb-chat-input{position:relative;flex-shrink:0;padding:7px 64px 7px 8px;
  border-top:1px solid rgba(0,240,255,.18);background:rgba(0,240,255,.04)}
.wb-chat-input input{display:block;width:100%;height:34px;border-radius:8px;padding:0 12px;font-size:12px;
  color:#fff;background:rgba(10,5,25,.9);border:1px solid rgba(0,240,255,.35);outline:none;
  font-family:inherit;transition:border-color .15s,box-shadow .15s;box-sizing:border-box}
.wb-chat-input input:focus{border-color:#00f0ff;box-shadow:0 0 8px rgba(0,240,255,.4)}
.wb-chat-input input.err{border-color:#ff3344;box-shadow:0 0 8px rgba(255,51,68,.5);
  animation:wbInpShake .25s ease}
@keyframes wbInpShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
.wb-chat-send{position:absolute;right:8px;top:50%;transform:translateY(-50%);
  width:48px;height:34px;border-radius:8px;display:grid;place-items:center;
  font-size:17px;cursor:pointer;background:linear-gradient(135deg,#ff3ba8,#ff1488);
  color:#fff;border:1px solid rgba(255,255,255,.3);font-weight:900;
  box-shadow:0 0 12px rgba(255,59,168,.7),inset 0 0 5px rgba(255,255,255,.25);
  transition:transform .1s,opacity .15s,box-shadow .15s;z-index:3}
.wb-chat-send:active{transform:translateY(-50%) scale(.9);box-shadow:0 0 18px rgba(255,59,168,1)}
.wb-chat-send.dis{opacity:.4;pointer-events:none;filter:grayscale(.5);box-shadow:none}

/* ВАЖНО: сбрасываем position:absolute из старого battle_css (там ростер
   приклеен к правому краю поверх чата). В v2 ростер — обычный flex-item
   в строке .wb-gth-mid, рядом с чатом, иначе чат залазит ПОД ростер. */
.wb-gth.v2 .wb-gth-roster{position:static;right:auto;top:auto;bottom:auto;
  width:108px;flex-shrink:0;display:flex;flex-direction:column;
  background:linear-gradient(180deg,rgba(15,3,30,.85),rgba(5,1,15,.92));
  border:1px solid rgba(140,80,255,.3);border-radius:12px;overflow:hidden;
  box-shadow:none}
.wb-gth.v2 .wb-gth-roster-h{flex-shrink:0;padding:6px 9px;font-size:9px;font-weight:800;color:#80e8ff;
  letter-spacing:.4px;border-bottom:1px solid rgba(140,80,255,.2);
  display:flex;justify-content:space-between;align-items:center;background:rgba(140,80,255,.06)}
.wb-gth.v2 .wb-gth-roster-h .cnt{background:rgba(0,240,255,.15);color:#00f0ff;
  border:1px solid rgba(0,240,255,.4);border-radius:5px;padding:1px 5px;font-size:8px}
.wb-gth.v2 .wb-gth-roster-list{flex:1;overflow-y:auto;padding:5px;scrollbar-width:none}
.wb-gth.v2 .wb-gth-roster-list::-webkit-scrollbar{display:none}
.wb-gth.v2 .wb-gth-row{display:flex;align-items:center;gap:5px;padding:4px 5px;border-radius:6px;
  margin-bottom:3px;background:rgba(20,5,35,.7);border:1px solid rgba(140,80,255,.2);cursor:pointer}
.wb-gth.v2 .wb-gth-row.me{border-color:rgba(0,240,255,.5);background:rgba(0,30,50,.7)}
.wb-gth.v2 .wb-gth-row .av{font-size:12px;flex-shrink:0}
.wb-gth.v2 .wb-gth-row .wb-gth-row-body{flex:1;display:flex;flex-direction:column;min-width:0}
.wb-gth.v2 .wb-gth-row .nm{font-size:9px;font-weight:700;color:#e6f7ff;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap}
.wb-gth.v2 .wb-gth-row.me .nm{color:#00f0ff}
.wb-gth.v2 .wb-gth-row .lv{font-size:7px;color:#80c8ff;opacity:.7}

.wb-gth.v2 .wb-gth-leave{position:relative;z-index:2;flex-shrink:0;padding:11px;
  text-align:center;border-radius:11px;cursor:pointer;
  background:linear-gradient(135deg,rgba(255,59,168,.15),rgba(120,30,90,.2));
  border:1px solid rgba(255,59,168,.4);font-size:11px;font-weight:900;letter-spacing:1px;
  color:#ff7acb;text-shadow:0 0 5px currentColor;box-shadow:0 0 12px rgba(255,59,168,.12)}
.wb-gth.v2 .wb-gth-leave:active{transform:scale(.98)}
.wb-gth.v2 .wb-gth-leave-ic{margin-right:6px}
`;
  function inject() {
    if (document.getElementById('wb-style-lobby')) return;
    const s = document.createElement('style'); s.id = 'wb-style-lobby'; s.textContent = CSS;
    document.head.appendChild(s);
  }
  return { inject };
})();
