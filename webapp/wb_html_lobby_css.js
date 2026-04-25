/* wb_html_lobby_css.js — CSS для лобби Мирового Босса (инжектируется один раз) */
window.WBLobbyCSS = (() => {
  const CSS = `
#wb-root{position:fixed;inset:0;z-index:9500;overflow-y:auto;overflow-x:hidden;
  background:radial-gradient(ellipse at 50% -5%,#1d0035 0%,#04030a 55%),#000;
  font-family:-apple-system,"Segoe UI",Roboto,sans-serif;color:#ddeeff;
  scrollbar-width:none;}
#wb-root::-webkit-scrollbar{display:none}
#wb-root::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
  background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,255,200,.016) 3px 4px);}
#wb-root::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
  background:radial-gradient(circle at 10% 15%,rgba(255,0,200,.09) 0%,transparent 40%),
             radial-gradient(circle at 90% 80%,rgba(0,200,255,.07) 0%,transparent 40%);}
#wb-root>*{position:relative;z-index:1;}

/* ── Шапка ── */
.wb-hdr{display:flex;align-items:center;gap:10px;padding:14px 16px 12px;
  border-bottom:1px solid rgba(255,0,200,.18);
  background:linear-gradient(180deg,rgba(30,0,50,.5) 0%,transparent 100%);position:sticky;top:0;z-index:10;}
.wb-back{width:32px;height:32px;border-radius:8px;display:grid;place-items:center;
  background:rgba(255,0,200,.07);border:1px solid rgba(255,0,200,.3);font-size:16px;color:#ff00cc;cursor:pointer;}
.wb-hdr-icon{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;font-size:22px;
  background:linear-gradient(135deg,#1a0033,#002a30);border:1px solid #ff00cc;
  box-shadow:0 0 16px rgba(255,0,200,.5),inset 0 0 10px rgba(255,0,200,.12);
  animation:wb-ip 3s ease-in-out infinite;}
@keyframes wb-ip{0%,100%{box-shadow:0 0 14px rgba(255,0,200,.45)}50%{box-shadow:0 0 26px rgba(255,0,200,.85)}}
.wb-title{font-size:15px;font-weight:900;letter-spacing:2px;
  background:linear-gradient(90deg,#ff00cc,#00e5ff);-webkit-background-clip:text;background-clip:text;color:transparent;}
.wb-sub{font-size:9px;color:#00e5ff;opacity:.65;letter-spacing:1.5px;margin-top:1px;}

/* ── Таймер (левая колонка внутри карточки босса) ── */
.wb-timer-lbl{font-size:8px;font-weight:800;letter-spacing:2px;color:#cc44ff;
  text-shadow:0 0 8px rgba(200,0,255,.4);margin-bottom:4px;}
.wb-cnt{font-size:32px;font-weight:900;letter-spacing:2px;font-variant-numeric:tabular-nums;
  background:linear-gradient(180deg,#00ffee,#00aacc);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 0 10px rgba(0,230,255,.7));animation:wb-cp 1s ease-in-out infinite;}
@keyframes wb-cp{0%,100%{filter:drop-shadow(0 0 8px rgba(0,230,255,.6))}50%{filter:drop-shadow(0 0 18px rgba(0,230,255,1))}}
.wb-insert{font-size:6px;letter-spacing:2.5px;color:#ff00cc;opacity:.5;margin-top:3px;animation:wb-blink 1.2s step-end infinite;}
@keyframes wb-blink{0%,100%{opacity:.5}50%{opacity:.1}}

/* ── Карточка босса (горизонтальная: [таймер+имя слева] | [картинка справа]) ── */
.wb-boss-card{margin:8px 14px 0;border-radius:16px;overflow:hidden;position:relative;
  display:flex;align-items:stretch;cursor:pointer;
  background:linear-gradient(135deg,rgba(20,0,40,.97),rgba(0,8,28,.97));
  border:1px solid rgba(255,0,200,.45);
  animation:wb-boss-glow 2.5s ease-in-out infinite;
  transition:transform .12s;}
@keyframes wb-boss-glow{
  0%,100%{box-shadow:0 0 16px rgba(255,0,200,.15),inset 0 0 14px rgba(255,0,200,.04);border-color:rgba(255,0,200,.35);}
  50%{box-shadow:0 0 36px rgba(255,0,200,.5),0 0 70px rgba(255,0,200,.12),inset 0 0 24px rgba(255,0,200,.08);border-color:rgba(255,0,200,.8);}
}
.wb-boss-card:active{transform:scale(.99);}
.wb-boss-card::before{content:"";position:absolute;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(255,0,200,.7),transparent);}
/* левая колонка: таймер сверху + имя босса снизу */
.wb-boss-card-l{flex:1;padding:10px 8px 10px 14px;display:flex;flex-direction:column;justify-content:center;gap:6px;}
.wb-boss-timer-block{display:flex;flex-direction:column;}
.wb-boss-info-block{display:flex;flex-direction:column;}
.wb-boss-type-badge{font-size:8px;font-weight:800;letter-spacing:2px;color:#ff00cc;
  text-shadow:0 0 8px currentColor;margin-bottom:4px;}
.wb-boss-card-name{font-size:14px;font-weight:900;margin-bottom:3px;
  background:linear-gradient(90deg,#fff,#ff88cc);-webkit-background-clip:text;background-clip:text;color:transparent;}
.wb-boss-card-hint{font-size:8px;color:rgba(255,255,255,.45);letter-spacing:.5px;}
.wb-hero-r{width:110px;flex-shrink:0;position:relative;display:flex;align-items:flex-end;justify-content:center;overflow:hidden;}
.wb-hero-aura{position:absolute;width:130px;height:130px;border-radius:50%;bottom:-40px;left:50%;transform:translateX(-50%);
  background:radial-gradient(ellipse,rgba(255,0,200,.2) 0%,transparent 70%);
  animation:wb-ap 2.5s ease-in-out infinite;}
@keyframes wb-ap{0%,100%{opacity:.6;transform:translateX(-50%) scale(.9)}50%{opacity:1;transform:translateX(-50%) scale(1.1)}}
.wb-hero-img{width:100px;height:120px;object-fit:contain;position:relative;z-index:1;
  filter:drop-shadow(0 0 14px rgba(255,0,200,.7)) drop-shadow(0 0 28px rgba(0,200,255,.3));
  animation:wb-bf 3s ease-in-out infinite;}
.wb-hero-emoji{font-size:64px;position:relative;z-index:1;animation:wb-bf 3s ease-in-out infinite;
  filter:drop-shadow(0 0 20px rgba(255,0,200,.6));}
@keyframes wb-bf{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}

/* ── Кнопка Участвую ── */
.wb-join-btn{display:flex;align-items:center;gap:10px;margin:6px 14px 0;padding:9px 14px;
  border-radius:12px;cursor:pointer;transition:all .2s;
  background:linear-gradient(135deg,rgba(10,0,30,.95),rgba(5,0,20,.95));
  border:1.5px solid rgba(255,0,200,.4);
  box-shadow:0 0 14px rgba(255,0,200,.08);}
.wb-join-btn.joined{border-color:rgba(0,255,136,.5);background:linear-gradient(135deg,rgba(0,20,10,.95),rgba(0,10,6,.95));
  box-shadow:0 0 14px rgba(0,255,136,.1);}
.wb-join-btn:active{transform:scale(.98);}
.wb-join-ico{font-size:22px;flex-shrink:0;}
.wb-join-txt{flex:1;min-width:0;}
.wb-join-main{font-size:12px;font-weight:800;color:#ff88cc;letter-spacing:.3px;}
.wb-join-btn.joined .wb-join-main{color:#00ff88;}
.wb-join-sub{font-size:9px;color:#446688;margin-top:2px;}
.wb-join-btn.joined .wb-join-sub{color:#339966;}
.wb-join-arr{font-size:15px;color:#440066;flex-shrink:0;}
.wb-join-btn.joined .wb-join-arr{color:#00aa44;}

/* ── Enter-кнопка (бой идёт) ── */
.wb-enter{display:none;margin:8px 14px 0;height:58px;border-radius:14px;position:relative;overflow:hidden;cursor:pointer;
  background:linear-gradient(135deg,#cc0055,#ff0080,#cc0055);background-size:200% auto;
  border:2px solid #ff00aa;animation:wb-eg 1s ease-in-out infinite,wb-ebg 3s linear infinite;
  box-shadow:0 0 40px rgba(255,0,130,.5),inset 0 1px 0 rgba(255,180,220,.3);}
@keyframes wb-eg{0%,100%{box-shadow:0 0 35px rgba(255,0,130,.5)}50%{box-shadow:0 0 55px rgba(255,0,130,.85)}}
@keyframes wb-ebg{to{background-position:200% center}}
.wb-enter.active{display:block;}
.wb-enter-in{display:flex;align-items:center;justify-content:center;gap:10px;height:100%;position:relative;z-index:2;}
.wb-enter-icon{font-size:22px;animation:wb-eis .4s ease-in-out infinite alternate;}
@keyframes wb-eis{0%{transform:rotate(-5deg) scale(1)}100%{transform:rotate(5deg) scale(1.1)}}
.wb-enter-lbl{font-size:17px;font-weight:900;color:#fff;letter-spacing:2px;text-shadow:0 0 14px rgba(255,200,220,.9);}
.wb-enter-sub{display:block;font-size:8px;font-weight:700;color:rgba(255,200,220,.6);letter-spacing:3px;margin-top:1px;}

/* ── Мои запасы ── */
.wb-inv-sec{margin:6px 14px 0;}
.wb-inv-lbl{font-size:8px;font-weight:800;letter-spacing:2.5px;color:#00e5ff;text-shadow:0 0 5px currentColor;margin-bottom:5px;}
.wb-chips{display:flex;gap:5px;flex-wrap:wrap;}
.wb-chip{display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:8px;
  background:rgba(0,8,25,.8);border:1px solid rgba(0,229,255,.2);font-size:10px;font-weight:700;color:#aaeeff;}
.wb-chip b{color:#00e5ff;font-weight:900;}

/* ── Категории ── */
.wb-cats{display:flex;margin:8px 14px 0;border-radius:12px;background:rgba(255,255,255,.03);
  border:1px solid rgba(255,0,200,.2);overflow:hidden;}
.wb-cat{flex:1;padding:8px 0 7px;text-align:center;cursor:pointer;transition:all .2s;position:relative;}
.wb-cat-ic{font-size:18px;display:block;filter:grayscale(.7) brightness(.5);}
.wb-cat-lb{font-size:8px;font-weight:800;letter-spacing:.8px;color:#443355;display:block;margin-top:3px;transition:all .2s;}
.wb-cat.on .wb-cat-ic{filter:grayscale(0) drop-shadow(0 0 6px rgba(255,0,200,.7));}
.wb-cat.on .wb-cat-lb{color:#ff88dd;text-shadow:0 0 8px rgba(255,0,200,.6);}
.wb-cat.on{background:linear-gradient(135deg,rgba(255,0,200,.1),rgba(0,100,200,.06));}
.wb-cat.on::after{content:"";position:absolute;bottom:0;left:10%;right:10%;height:1.5px;
  background:linear-gradient(90deg,transparent,#ff00cc,transparent);}
.wb-cp{display:none;}.wb-cp.on{display:block;}

/* ── Карточки бустов (−30% размер) ── */
.wb-bgrid{display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:5px 14px 8px;}
.wb-bc.last{grid-column:1/-1;display:flex;align-items:center;gap:10px;}
.wb-bc.last .bc-ic{font-size:16px;margin-bottom:0;}
.wb-bc.last .bc-nm,.wb-bc.last .bc-vl,.wb-bc.last .bc-desc,.wb-bc.last .bc-pr{display:inline;margin:0;}
.wb-bc.last .bc-nm{margin-right:6px;}
.wb-bc.last .bc-vl{margin-right:4px;}
.wb-bc.last-wrap{display:flex;flex-direction:column;flex:1;gap:1px;}
.wb-bc{padding:7px 7px 8px;border-radius:11px;cursor:pointer;position:relative;overflow:hidden;
  background:linear-gradient(135deg,rgba(20,0,38,.97),rgba(5,4,18,.97));
  border:1px solid rgba(255,0,200,.25);transition:all .2s;}
.wb-bc:hover,.wb-bc:active{border-color:rgba(255,0,200,.6);box-shadow:0 0 14px rgba(255,0,200,.3);}
.bc-ic{font-size:13px;margin-bottom:2px;filter:drop-shadow(0 0 5px rgba(255,0,200,.5));}
.bc-nm{font-size:8px;font-weight:800;letter-spacing:.8px;color:#cc88ff;margin-bottom:1px;}
.bc-vl{font-size:11px;font-weight:900;color:#ff00cc;text-shadow:0 0 8px currentColor;}
.bc-desc{font-size:8px;color:rgba(255,255,255,.6);margin:2px 0 3px;line-height:1.35;}
.bc-pr{font-size:9px;font-weight:800;color:#ffdd44;text-shadow:0 0 6px rgba(255,210,0,.45);letter-spacing:.3px;}
.bc-ow{position:absolute;top:5px;right:6px;font-size:8px;font-weight:800;color:#00e5ff;
  background:rgba(0,229,255,.1);border:1px solid rgba(0,229,255,.25);padding:1px 5px;border-radius:4px;}

/* ── Карточки воскрешения ── */
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
.wb-rb-lbl{font-size:7px;color:#446688;letter-spacing:1px;margin-bottom:5px;}
.wb-rb-desc{font-size:7px;color:rgba(255,255,255,.55);margin-bottom:5px;line-height:1.3;}
.wb-rbtn{width:100%;padding:6px 0;border-radius:8px;font-size:12px;font-weight:900;text-align:center;
  background:linear-gradient(135deg,rgba(255,200,0,.13),rgba(255,160,0,.07));
  border:1px solid rgba(255,200,0,.45);color:#ffdd44;
  text-shadow:0 0 8px rgba(255,200,0,.5);cursor:pointer;letter-spacing:.3px;}

/* ── История ── */
.wb-hist{padding:6px 14px 14px;display:flex;flex-direction:column;gap:5px;}
.wb-hc{border-radius:13px;overflow:hidden;background:rgba(8,0,18,.75);
  border:1px solid rgba(255,0,200,.12);border-left:2px solid rgba(255,0,200,.35);}
.wb-hh{display:flex;align-items:center;gap:10px;padding:9px 12px;}
.wb-hi{font-size:18px;width:24px;text-align:center;flex-shrink:0;}
.wb-hn{font-size:12px;font-weight:800;color:#ddd;flex:1;}
.wb-hm{display:flex;gap:8px;margin-top:2px;}
.wb-hd{font-size:9px;color:#445566;}
.wb-hdmg{font-size:9px;color:#ff4466;font-weight:700;}
.wb-hbdg{font-size:8px;font-weight:800;padding:3px 7px;border-radius:6px;letter-spacing:.5px;white-space:nowrap;flex-shrink:0;}
.wb-hbdg.f{background:rgba(0,229,255,.12);color:#00e5ff;border:1px solid rgba(0,229,255,.28);}
.wb-hbdg.p{background:rgba(255,200,0,.1);color:#ffcc44;border:1px solid rgba(255,200,0,.25);}

/* ── Тост ── */
.wb-toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:9999;
  background:rgba(10,0,25,.95);border:1px solid rgba(255,0,200,.5);border-radius:10px;
  padding:10px 18px;font-size:12px;font-weight:700;color:#fff;pointer-events:none;
  animation:wb-tin .25s ease-out forwards;box-shadow:0 0 20px rgba(255,0,200,.3);}
@keyframes wb-tin{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

/* ── Подготовка ── */
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
