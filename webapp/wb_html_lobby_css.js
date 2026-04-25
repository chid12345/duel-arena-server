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
.wb-back{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;
  background:rgba(255,0,200,.07);border:1px solid rgba(255,0,200,.3);font-size:16px;color:#ff00cc;cursor:pointer;}
.wb-hdr-icon{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;font-size:20px;
  background:linear-gradient(135deg,#1a0033,#002a30);border:1px solid #ff00cc;
  box-shadow:0 0 16px rgba(255,0,200,.5);animation:wb-ip 3s ease-in-out infinite;}
@keyframes wb-ip{0%,100%{box-shadow:0 0 14px rgba(255,0,200,.45)}50%{box-shadow:0 0 26px rgba(255,0,200,.85)}}
.wb-title{font-size:15px;font-weight:900;letter-spacing:2px;
  background:linear-gradient(90deg,#ff00cc,#00e5ff);-webkit-background-clip:text;background-clip:text;color:transparent;}
.wb-sub{font-size:8px;color:#00e5ff;opacity:.65;letter-spacing:1.5px;margin-top:1px;}
.wb-online{margin-left:auto;font-size:9px;font-weight:800;letter-spacing:.5px;color:#00FF9F;
  background:rgba(0,255,136,.1);border:1px solid rgba(0,255,136,.3);padding:3px 8px;border-radius:8px;flex-shrink:0;}

/* ── Таймер ── */
.wb-timer-lbl{font-size:8px;font-weight:800;letter-spacing:2px;color:#cc44ff;
  text-shadow:0 0 8px rgba(200,0,255,.4);margin-bottom:4px;}
.wb-cnt{font-size:32px;font-weight:900;letter-spacing:2px;font-variant-numeric:tabular-nums;
  background:linear-gradient(180deg,#00ffee,#00aacc);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 0 10px rgba(0,230,255,.7));animation:wb-cp 1s ease-in-out infinite;}
@keyframes wb-cp{0%,100%{filter:drop-shadow(0 0 8px rgba(0,230,255,.6))}50%{filter:drop-shadow(0 0 18px rgba(0,230,255,1))}}

/* ── Компактный таймер (дышащий) ── */
.wb-timer-card{margin:8px 14px 0;border-radius:14px;padding:12px 16px;cursor:pointer;
  display:flex;align-items:center;justify-content:space-between;
  background:linear-gradient(135deg,rgba(20,0,40,.97),rgba(0,8,28,.97));
  border:1px solid rgba(255,0,200,.35);
  animation:wb-boss-glow 2.5s ease-in-out infinite;transition:transform .12s;}
@keyframes wb-boss-glow{
  0%,100%{box-shadow:0 0 12px rgba(255,0,200,.12),inset 0 0 20px rgba(255,0,200,.03);border-color:rgba(255,0,200,.3);}
  50%{box-shadow:0 0 32px rgba(255,0,200,.45),inset 0 0 30px rgba(255,0,200,.06);border-color:rgba(255,0,200,.75);}}
.wb-timer-card:active{transform:scale(.99);}
.wb-type-pill{font-size:9px;font-weight:900;letter-spacing:1.5px;padding:5px 10px;
  border-radius:8px;border:1px solid;flex-shrink:0;}

/* ── Призовой фонд ── */
.wb-prize{margin:6px 14px 0;padding:10px 12px;border-radius:12px;
  background:rgba(255,160,0,.06);border:1px solid rgba(255,160,0,.2);
  display:flex;justify-content:space-between;align-items:center;gap:8px;}
.wb-prize-l{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0;}
.wb-prize-lbl{font-size:8px;font-weight:800;letter-spacing:1.5px;color:#ffdd44;text-shadow:0 0 5px rgba(255,210,0,.4);}
.wb-prize-sub{font-size:8px;color:rgba(255,255,255,.3);}
.wb-prize-r{flex-shrink:0;text-align:right;}
.wb-prize-coins{font-size:20px;font-weight:900;color:#ffdd44;text-shadow:0 0 10px rgba(255,200,0,.6);white-space:nowrap;}
.wb-prize-cnt{font-size:9px;font-weight:700;color:#00FF9F;white-space:nowrap;margin-top:2px;}

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
.wb-auto-main{font-size:11px;font-weight:700;color:#e0e0e0;}
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
  background:linear-gradient(135deg,#7a0030,#bb004a,#990038);
  border:1px solid rgba(255,80,120,.4);box-shadow:0 0 18px rgba(180,0,60,.2);}
.wb-join-btn.joined{background:linear-gradient(135deg,rgba(0,20,10,.95),rgba(0,10,6,.95));
  border-color:rgba(0,255,136,.4);box-shadow:0 0 14px rgba(0,255,136,.1);}
.wb-join-btn:active{transform:scale(.98);}
.wb-join-ico{font-size:22px;flex-shrink:0;}
.wb-join-txt{flex:1;min-width:0;}
.wb-join-main{font-size:12px;font-weight:800;color:#fff;letter-spacing:.3px;}
.wb-join-btn.joined .wb-join-main{color:#00ff88;}
.wb-join-sub{font-size:9px;color:rgba(255,200,220,.45);margin-top:2px;}
.wb-join-btn.joined .wb-join-sub{color:#339966;}
.wb-join-arr{font-size:16px;color:rgba(255,200,220,.4);flex-shrink:0;}
.wb-join-btn.joined .wb-join-arr{color:#00aa44;}

/* ── Войти в бой (активный рейд) ── */
.wb-enter{display:none;margin:8px 14px 0;height:58px;border-radius:14px;overflow:hidden;cursor:pointer;
  background:linear-gradient(135deg,#cc0055,#ff0080,#cc0055);background-size:200% auto;
  border:2px solid #ff00aa;animation:wb-eg 1s ease-in-out infinite;
  box-shadow:0 0 40px rgba(255,0,130,.5);}
@keyframes wb-eg{0%,100%{box-shadow:0 0 35px rgba(255,0,130,.5)}50%{box-shadow:0 0 55px rgba(255,0,130,.85)}}
.wb-enter.active{display:block;}
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
.wb-shop-hdr{padding:10px 14px 4px;font-size:8px;font-weight:800;letter-spacing:2px;color:rgba(255,255,255,.3);}
.wb-cats{display:flex;margin:0 14px;border-radius:12px;background:rgba(255,255,255,.03);
  border:1px solid rgba(255,0,200,.2);overflow:hidden;}
.wb-cat{flex:1;padding:8px 0 7px;text-align:center;cursor:pointer;transition:all .2s;position:relative;}
.wb-cat-ic{font-size:16px;display:block;filter:grayscale(.7) brightness(.5);}
.wb-cat-lb{font-size:8px;font-weight:800;letter-spacing:.8px;color:#443355;display:block;margin-top:3px;}
.wb-cat.on .wb-cat-ic{filter:grayscale(0) drop-shadow(0 0 6px rgba(255,0,200,.7));}
.wb-cat.on .wb-cat-lb{color:#ff88dd;text-shadow:0 0 8px rgba(255,0,200,.6);}
.wb-cat.on{background:linear-gradient(135deg,rgba(255,0,200,.1),rgba(0,100,200,.06));}
.wb-cat.on::after{content:"";position:absolute;bottom:0;left:10%;right:10%;height:1.5px;
  background:linear-gradient(90deg,transparent,#ff00cc,transparent);}
.wb-cp{display:none;}.wb-cp.on{display:block;}

/* ── Бусты (карточки) ── */
.wb-bgrid{display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:5px 14px 10px;}
.wb-bc{padding:9px 9px 7px;border-radius:10px;cursor:pointer;position:relative;overflow:hidden;
  display:flex;flex-direction:column;gap:2px;
  background:linear-gradient(135deg,rgba(20,0,38,.97),rgba(5,4,18,.97));
  border:1px solid rgba(255,0,200,.2);transition:all .2s;}
.wb-bc:hover,.wb-bc:active{border-color:rgba(255,0,200,.55);box-shadow:0 0 10px rgba(255,0,200,.25);}
.bc-ic{font-size:22px;line-height:1;filter:drop-shadow(0 0 5px rgba(255,0,200,.4));}
.bc-nm{font-size:7px;font-weight:800;letter-spacing:.8px;color:#cc88ff;text-transform:uppercase;margin-top:2px;}
.bc-vl{font-size:15px;font-weight:900;color:#ff00cc;text-shadow:0 0 6px currentColor;line-height:1.1;}
.bc-pr{font-size:8px;font-weight:800;color:#ffdd44;text-shadow:0 0 4px rgba(255,210,0,.4);margin-top:3px;}
.bc-ow{position:absolute;top:5px;right:6px;font-size:7px;font-weight:800;color:#00e5ff;
  background:rgba(0,229,255,.1);border:1px solid rgba(0,229,255,.25);padding:1px 4px;border-radius:3px;}

/* ── Широкая карточка (★ БОНУС) ── */
.wb-bc.last{grid-column:1/-1;flex-direction:row;align-items:center;gap:10px;
  padding:8px 12px;border-radius:12px;
  background:linear-gradient(135deg,rgba(0,30,20,.97),rgba(0,15,10,.97));
  border:1px solid rgba(0,255,159,.35);
  animation:wb-feat 2.5s ease-in-out infinite;}
@keyframes wb-feat{0%,100%{box-shadow:0 0 12px rgba(0,255,159,.07);border-color:rgba(0,255,159,.3);}
  50%{box-shadow:0 0 24px rgba(0,255,159,.2);border-color:rgba(0,255,159,.6);}}
.wb-bc.last::before{content:"★ БОНУС";position:absolute;top:6px;right:8px;
  font-size:7px;font-weight:800;letter-spacing:1px;color:#00ff88;}
.wb-bc.last .bc-ic{font-size:26px;margin-bottom:0;flex-shrink:0;filter:drop-shadow(0 0 8px rgba(0,255,159,.6));}
.wb-bc.last .bc-vl{font-size:16px;color:#00ff88;text-shadow:0 0 8px rgba(0,255,136,.5);}
.wb-bc.last .bc-nm{font-size:8px;color:#00cc66;}
.last-body{display:flex;flex-direction:column;gap:2px;flex:1;}

/* ── Куплено ── */
.wb-bc.bought{pointer-events:none;border-color:rgba(0,255,159,.2)!important;
  background:linear-gradient(135deg,rgba(0,20,12,.97),rgba(0,10,8,.97))!important;}
.wb-bc.bought::after{content:"✓ КУПЛЕНО";position:absolute;bottom:6px;right:7px;
  font-size:7px;font-weight:800;letter-spacing:.5px;color:#00ff88;}
.wb-bc.bought .bc-pr{display:none;}
.wb-bc.bought .bc-vl{color:#00ff88!important;text-shadow:0 0 5px rgba(0,255,136,.3)!important;}

/* ── Воскрешения ── */
.wb-rgrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:6px 14px 14px;}
.wb-rc{border-radius:14px;overflow:hidden;cursor:pointer;transition:all .2s;
  background:linear-gradient(135deg,rgba(25,0,20,.97),rgba(10,0,12,.97));border:1px solid rgba(255,80,180,.2);}
.wb-rc:hover{border-color:rgba(255,80,180,.5);box-shadow:0 0 16px rgba(255,80,180,.2);}
.wb-rh{padding:10px 8px 8px;text-align:center;
  background:linear-gradient(135deg,rgba(255,0,150,.08),rgba(200,0,100,.04));border-bottom:1px solid rgba(255,80,180,.12);}
.wb-ri{font-size:22px;filter:drop-shadow(0 0 6px rgba(255,80,180,.6));}
.wb-rh-pct{font-size:13px;font-weight:900;color:#ff66bb;text-shadow:0 0 6px currentColor;margin-top:3px;}
.wb-rb{padding:7px 6px;text-align:center;}
.wb-rb-cnt{font-size:16px;font-weight:900;color:#00e5ff;text-shadow:0 0 6px currentColor;}
.wb-rb-lbl{font-size:7px;color:#446688;letter-spacing:1px;margin-bottom:4px;}
.wb-rb-desc{font-size:7px;color:rgba(255,255,255,.55);margin-bottom:5px;line-height:1.3;}
.wb-rbtn{padding:5px 0;border-radius:8px;font-size:11px;font-weight:900;text-align:center;
  background:linear-gradient(135deg,rgba(255,200,0,.13),rgba(255,160,0,.07));
  border:1px solid rgba(255,200,0,.45);color:#ffdd44;cursor:pointer;letter-spacing:.3px;}

/* ── История ── */
.wb-hist{padding:6px 14px 14px;display:flex;flex-direction:column;gap:5px;}
.wb-hc{border-radius:13px;overflow:hidden;background:rgba(8,0,18,.75);
  border:1px solid rgba(255,0,200,.12);border-left:2px solid rgba(255,0,200,.35);}
.wb-hh{display:flex;align-items:center;gap:10px;padding:9px 12px;}
.wb-hi{font-size:18px;width:24px;text-align:center;flex-shrink:0;}
.wb-hn{font-size:12px;font-weight:800;color:#ddd;}
.wb-hm{display:flex;gap:8px;margin-top:2px;}
.wb-hd{font-size:9px;color:#445566;}.wb-hdmg{font-size:9px;color:#ff4466;font-weight:700;}
.wb-hbdg{font-size:8px;font-weight:800;padding:3px 7px;border-radius:6px;letter-spacing:.5px;flex-shrink:0;}
.wb-hbdg.f{background:rgba(0,229,255,.12);color:#00e5ff;border:1px solid rgba(0,229,255,.28);}
.wb-hbdg.p{background:rgba(255,200,0,.1);color:#ffcc44;border:1px solid rgba(255,200,0,.25);}

/* ── Тост + подготовка ── */
.wb-toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:9999;
  background:rgba(10,0,25,.95);border:1px solid rgba(255,0,200,.5);border-radius:10px;
  padding:10px 18px;font-size:12px;font-weight:700;color:#fff;pointer-events:none;
  animation:wb-tin .25s ease-out forwards;box-shadow:0 0 20px rgba(255,0,200,.3);}
@keyframes wb-tin{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.wb-prep{padding:20px 14px;text-align:center;}
.wb-prep-t{font-size:28px;font-weight:900;color:#ff00cc;text-shadow:0 0 16px currentColor;letter-spacing:2px;}
.wb-prep-s{font-size:11px;color:#8899aa;margin-top:8px;}
`;
  function inject() {
    if (document.getElementById('wb-style-lobby')) return;
    const s = document.createElement('style'); s.id = 'wb-style-lobby'; s.textContent = CSS;
    document.head.appendChild(s);
  }
  return { inject };
})();
