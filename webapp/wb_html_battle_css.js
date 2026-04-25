/* wb_html_battle_css.js — CSS экрана боя (киберпанк). Инжектируется один раз. */
window.WBBattleCSS = (() => {
  const CSS = `
#wb-root{position:fixed;inset:0;z-index:9500;overflow-y:auto;overflow-x:hidden;
  background:#050508;font-family:-apple-system,"Segoe UI",Roboto,sans-serif;
  color:#e0e0e0;scrollbar-width:none;}
#wb-root::-webkit-scrollbar{display:none}
#wb-root::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
  background:repeating-linear-gradient(0deg,transparent 0 2px,rgba(0,0,0,.2) 2px 4px);opacity:.15;}
#wb-root>*{position:relative;z-index:1;}

/* ── Шапка боя ── */
.wb-bhdr2{display:block;padding:10px 14px 8px;position:sticky;top:0;z-index:10;
  background:linear-gradient(180deg,rgba(5,5,8,.98) 0%,rgba(5,5,8,.85) 100%);
  border-bottom:1px solid rgba(255,0,85,.15);}
.wb-bhdr2-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}
.wb-bhdr2-l{display:flex;align-items:center;gap:8px;}
.wb-back2{width:28px;height:28px;border-radius:7px;display:grid;place-items:center;
  background:rgba(255,0,85,.07);border:1px solid rgba(255,0,85,.2);
  font-size:14px;color:#ff0055;cursor:pointer;flex-shrink:0;}
.wb-bhdr2-title{font-size:13px;font-weight:900;letter-spacing:3px;
  color:#FF0055;text-shadow:0 0 10px #FF0055,0 0 20px #FF0055;
  animation:wb-glitch 5s infinite;}
@keyframes wb-glitch{0%,94%,100%{transform:none}
  95%{transform:translateX(-2px) skewX(-5deg);text-shadow:2px 0 #00FF9F,-2px 0 #FF0055}
  97%{transform:translateX(2px) skewX(3deg);text-shadow:-2px 0 #BF00FF}
  98%{transform:none}}
.wb-bhdr2-r{display:flex;align-items:center;gap:8px;}
.wb-phase{font-size:9px;font-weight:800;letter-spacing:1.5px;
  padding:3px 8px;border-radius:6px;
  background:rgba(255,0,85,.15);border:1px solid rgba(255,0,85,.4);color:#FF0055;}
.wb-btimer2{display:flex;align-items:center;gap:5px;
  background:rgba(0,255,159,.07);border:1px solid rgba(0,255,159,.25);
  border-radius:7px;padding:4px 9px;}
.wb-tdot{width:5px;height:5px;border-radius:50%;background:#00FF9F;
  box-shadow:0 0 5px #00FF9F;animation:wb-blink 1s infinite;}
@keyframes wb-blink{0%,100%{opacity:1}50%{opacity:.2}}
.wb-tval{font-family:'Courier New',monospace;font-size:15px;font-weight:700;
  color:#00FF9F;text-shadow:0 0 8px #00FF9F;}

/* ── HP секция (inline в шапке) ── */
.wb-hp2-sec{display:flex;align-items:center;gap:8px;padding:4px 0 0;}
.wb-hp2-lbl{font-size:9px;color:rgba(255,255,255,.4);letter-spacing:1px;white-space:nowrap;}
.wb-hp2-nums{font-family:'Courier New',monospace;font-size:11px;color:#FF0055;font-weight:700;white-space:nowrap;}
.wb-hp2-track{flex:1;height:8px;border-radius:4px;background:rgba(255,255,255,.06);
  border:1px solid rgba(255,0,85,.2);overflow:hidden;position:relative;}
.wb-hp2-fill{height:100%;border-radius:5px;
  background:linear-gradient(90deg,#880033,#cc0055,#ff3377);
  box-shadow:0 0 10px rgba(255,0,100,.5);transition:width .4s;}
.wb-hp2-fill::after{content:"";position:absolute;inset:0;
  background:repeating-linear-gradient(90deg,transparent 0 10px,rgba(255,255,255,.05) 10px 11px);
  animation:wb-flow 1.2s linear infinite;}
@keyframes wb-flow{to{background-position:11px 0}}

/* ── Тикер ── */
.wb-ticker{overflow:hidden;border-bottom:1px solid rgba(0,191,255,.1);
  background:rgba(0,191,255,.03);padding:4px 0;flex-shrink:0;}
.wb-ticker-in{display:flex;gap:36px;white-space:nowrap;
  animation:wb-scroll 20s linear infinite;font-size:9px;
  color:rgba(224,224,224,.55);padding:0 14px;}
@keyframes wb-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.wb-tn{color:#00BFFF;}.wb-td{color:#00FF9F;font-family:monospace;font-weight:700;}
.wb-tcl{color:#BF00FF;}

/* ── Зона босса ── */
.wb-boss-zone{position:relative;flex:1;overflow:hidden;cursor:crosshair;
  min-height:380px;background:radial-gradient(ellipse 70% 55% at 50% 55%,rgba(0,191,255,.05) 0%,transparent 70%);}
.wb-bimg2{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
  width:300px;height:300px;object-fit:contain;
  filter:drop-shadow(0 0 20px rgba(0,191,255,.3)) drop-shadow(0 0 40px rgba(255,0,85,.15));
  animation:wb-bfloat 3s ease-in-out infinite;pointer-events:none;}
@keyframes wb-bfloat{0%,100%{transform:translate(-50%,-50%) scale(1)}
  50%{transform:translate(-50%,-50%) scale(1.03)}}
.wb-bimg2.wb-hit{animation:wb-bhit .15s ease forwards,wb-bfloat 3s ease-in-out infinite .15s;}
@keyframes wb-bhit{0%{filter:brightness(1)}50%{filter:brightness(3) saturate(0)}100%{filter:brightness(1)}}
.wb-bem2{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
  font-size:140px;animation:wb-bfloat 3s ease-in-out infinite;pointer-events:none;
  filter:drop-shadow(0 0 24px rgba(0,191,255,.5));}
.wb-rage2{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .3s;}
.wb-rage2.on{opacity:1;animation:wb-rage 0.5s ease-in-out infinite;}
@keyframes wb-rage{0%,100%{box-shadow:inset 0 0 40px rgba(255,0,85,.35)}50%{box-shadow:inset 0 0 70px rgba(255,0,85,.65)}}
.wb-wp{position:absolute;width:26px;height:26px;border-radius:50%;
  border:2px solid #00FF9F;box-shadow:0 0 9px #00FF9F,inset 0 0 5px rgba(0,255,159,.3);
  animation:wb-wpp 1.5s ease-in-out infinite;cursor:crosshair;display:flex;align-items:center;justify-content:center;}
@keyframes wb-wpp{0%,100%{transform:scale(1);opacity:.8}50%{transform:scale(1.2);opacity:1}}
.wb-wp::after{content:'+';font-size:11px;color:#00FF9F;font-weight:700;}
.wb-ghost{position:absolute;width:28px;height:28px;border-radius:50%;
  background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid rgba(0,191,255,.3);
  display:flex;align-items:center;justify-content:center;font-size:14px;
  opacity:0;animation:wb-gh 4s ease-in-out infinite;pointer-events:none;}
@keyframes wb-gh{0%{opacity:0;transform:translateY(20px) translateX(0)}20%{opacity:.4}80%{opacity:.3}100%{opacity:0;transform:translateY(-30px) translateX(20px)}}
.wb-dmg-num{position:absolute;font-family:'Courier New',monospace;font-weight:900;
  pointer-events:none;z-index:20;text-shadow:0 0 10px currentColor;white-space:nowrap;
  animation:wb-dmgfly2 .9s ease-out forwards;}
.wb-dmg-num.crit{text-shadow:0 0 16px #ffcc00,0 0 32px #ff8800;}
@keyframes wb-dmgfly2{
  0%  {opacity:1;transform:translateX(-50%) translateY(0)     scale(1)   }
  20% {opacity:1;transform:translateX(-50%) translateY(-20px) scale(1.15)}
  100%{opacity:0;transform:translateX(-50%) translateY(-70px) scale(.7)  }}
.wb-tap-hint{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);
  font-size:9px;color:rgba(255,255,255,.3);letter-spacing:2px;text-transform:uppercase;
  pointer-events:none;white-space:nowrap;
  animation:wb-hint 2s ease-in-out infinite;}
@keyframes wb-hint{0%,100%{opacity:.25}50%{opacity:.7}}

/* ── Мёртв ── */
.wb-dead{margin:12px 14px;padding:16px;border-radius:14px;text-align:center;
  background:rgba(30,0,0,.6);border:1px solid rgba(255,40,40,.3);}
.wb-dead-t{font-size:18px;font-weight:900;color:#ff4444;margin-bottom:6px;}
.wb-res-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px;}
.wb-res-b{padding:8px 4px;border-radius:10px;cursor:pointer;text-align:center;
  background:rgba(255,200,0,.07);border:1px solid rgba(255,200,0,.25);font-size:10px;line-height:1.5;}
.wb-res-b:active{transform:scale(.96);}
.ri{display:block;font-size:18px;margin-bottom:2px;}

/* ── Ульта ── */
.wb-ultra{display:flex;align-items:center;gap:8px;padding:6px 14px;
  background:rgba(255,255,255,.03);border-top:1px solid rgba(255,255,255,.06);flex-shrink:0;}
.wb-ultra-lbl{font-size:8px;letter-spacing:1.5px;color:rgba(255,255,255,.35);white-space:nowrap;text-transform:uppercase;}
.wb-ultra-track{flex:1;height:5px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden;}
.wb-ultra-fill{height:100%;width:0%;background:linear-gradient(90deg,#00BFFF,#BF00FF);
  border-radius:3px;box-shadow:0 0 5px #00BFFF;transition:width .3s;}
.wb-ultra-btn{padding:5px 11px;border-radius:7px;font-size:9px;font-weight:700;letter-spacing:.8px;
  cursor:not-allowed;border:1px solid rgba(191,0,255,.3);color:rgba(255,255,255,.4);
  background:rgba(191,0,255,.1);white-space:nowrap;transition:all .2s;}
.wb-ultra-btn.ready{color:#fff;border-color:#BF00FF;cursor:pointer;
  box-shadow:0 0 10px #BF00FF;animation:wb-up .8s ease-in-out infinite;}
@keyframes wb-up{0%,100%{box-shadow:0 0 10px #BF00FF}50%{box-shadow:0 0 22px #BF00FF,0 0 35px #00BFFF}}
.wb-ultra-btn:active.ready{transform:scale(.96);}

/* ── Кнопки скиллов ── */
.wb-skills{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;
  padding:6px 10px 10px;background:linear-gradient(0deg,rgba(5,5,8,.98) 0%,rgba(5,5,8,.85) 100%);
  border-top:1px solid rgba(255,255,255,.08);flex-shrink:0;}
.wb-skill{border-radius:10px;padding:8px 4px 7px;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:4px;cursor:pointer;position:relative;overflow:hidden;
  background:rgba(255,255,255,.04);border:1.5px solid rgba(255,255,255,.1);
  transition:all .12s;-webkit-tap-highlight-color:transparent;}
.wb-skill:active:not(.cd){transform:scale(.93);}
.wb-skill.atk{border-color:rgba(255,0,85,.55);box-shadow:0 0 10px rgba(255,0,85,.2),inset 0 0 8px rgba(255,0,85,.05);}
.wb-skill.shld{border-color:rgba(0,191,255,.55);box-shadow:0 0 10px rgba(0,191,255,.2),inset 0 0 8px rgba(0,191,255,.05);}
.wb-skill.ult{border-color:rgba(191,0,255,.6);animation:wb-ug 2s ease-in-out infinite;}
@keyframes wb-ug{0%,100%{box-shadow:0 0 8px rgba(191,0,255,.2)}50%{box-shadow:0 0 20px rgba(191,0,255,.5),0 0 35px rgba(191,0,255,.2)}}
.wb-skill.auto{border-color:rgba(0,255,159,.55);box-shadow:0 0 10px rgba(0,255,159,.2),inset 0 0 8px rgba(0,255,159,.05);}
.wb-skill.auto.auto-on{border-color:rgba(0,255,159,.85);box-shadow:0 0 16px rgba(0,255,159,.5);
  background:rgba(0,255,159,.08);animation:wb-ug 1.5s ease-in-out infinite;}
.ws-icon{font-size:22px;line-height:1;}
.ws-name{font-size:8px;letter-spacing:.8px;text-transform:uppercase;color:rgba(255,255,255,.55);font-weight:700;}
.wb-skill.cd .ws-icon,.wb-skill.cd .ws-name{opacity:.25;}
.wb-cd-ov{position:absolute;inset:0;border-radius:10px;background:rgba(0,0,0,.72);
  display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .1s;}
.wb-skill.cd .wb-cd-ov{opacity:1;}
.wb-cd-num{font-family:'Courier New',monospace;font-size:20px;font-weight:900;color:rgba(255,255,255,.75);}

/* ── Инфо-попап скилла ── */
.wb-sinfo-ov{position:fixed;inset:0;z-index:9995;background:rgba(0,0,0,.55);
  backdrop-filter:blur(3px);opacity:0;pointer-events:none;transition:opacity .2s;
  display:flex;align-items:flex-end;justify-content:center;}
.wb-sinfo-ov.open{opacity:1;pointer-events:all;}
.wb-sinfo{width:100%;max-width:390px;border-radius:20px 20px 0 0;padding:0 0 20px;
  background:linear-gradient(180deg,#0d0020 0%,#05030f 100%);
  border:1px solid rgba(255,0,85,.25);border-bottom:none;
  box-shadow:0 -8px 40px rgba(255,0,85,.12);
  transform:translateY(100%);transition:transform .28s cubic-bezier(.32,1.2,.5,1);}
.wb-sinfo-ov.open .wb-sinfo{transform:translateY(0);}
.wb-sinfo-hdl{display:flex;justify-content:center;padding:9px 0 5px;}
.wb-sinfo-hdl::before{content:"";width:32px;height:3px;border-radius:2px;background:rgba(255,0,85,.3);}
.wb-sinfo-ic{font-size:36px;text-align:center;padding:6px 0 4px;
  filter:drop-shadow(0 0 10px rgba(255,0,85,.5));}
.wb-sinfo-title{font-size:15px;font-weight:900;letter-spacing:1px;color:#fff;text-align:center;padding:0 18px 3px;}
.wb-sinfo-cd{font-size:9px;font-weight:800;letter-spacing:1.5px;color:#FF0055;text-align:center;margin-bottom:10px;}
.wb-sinfo-desc{font-size:11px;color:rgba(255,255,255,.6);text-align:center;padding:0 22px 10px;line-height:1.5;}
.wb-sinfo-tip{margin:0 14px 10px;padding:8px 12px;border-radius:10px;
  background:rgba(0,191,255,.05);border:1px solid rgba(0,191,255,.15);}
.wb-sinfo-tip-t{font-size:7px;font-weight:800;letter-spacing:2px;color:#00BFFF;margin-bottom:3px;}
.wb-sinfo-tip-v{font-size:10px;color:rgba(255,255,255,.55);line-height:1.4;}
.wb-sinfo-use{margin:0 14px;padding:11px;border-radius:12px;text-align:center;cursor:pointer;
  background:linear-gradient(135deg,rgba(255,0,85,.3),rgba(180,0,60,.3));
  border:1px solid rgba(255,0,85,.4);font-size:12px;font-weight:800;letter-spacing:1px;color:#fff;
  transition:background .15s;}
.wb-sinfo-use:active{background:linear-gradient(135deg,rgba(255,0,85,.5),rgba(180,0,60,.5));}

/* ── QTE: Коллективный удар ── */
.wb-qte-ov{position:absolute;inset:0;z-index:50;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:10px;
  background:rgba(0,0,0,.7);backdrop-filter:blur(4px);
  opacity:0;pointer-events:none;transition:opacity .2s;}
.wb-qte-ov.open{opacity:1;pointer-events:all;}
.wb-qte-title{font-size:13px;font-weight:900;letter-spacing:2.5px;color:#00FF9F;
  text-shadow:0 0 12px #00FF9F;animation:wb-glitch 4s infinite;}
.wb-qte-btn{width:130px;height:130px;border-radius:50%;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:4px;cursor:pointer;
  background:radial-gradient(circle,rgba(0,255,159,.15) 0%,rgba(0,80,50,.6) 100%);
  border:3px solid #00FF9F;box-shadow:0 0 30px #00FF9F,inset 0 0 20px rgba(0,255,159,.15);
  animation:wb-qte-pulse 0.6s ease-in-out infinite;-webkit-tap-highlight-color:transparent;}
@keyframes wb-qte-pulse{0%,100%{box-shadow:0 0 20px #00FF9F,inset 0 0 10px rgba(0,255,159,.15)}
  50%{box-shadow:0 0 45px #00FF9F,0 0 70px rgba(0,255,159,.4),inset 0 0 25px rgba(0,255,159,.25)}}
.wb-qte-btn:active{transform:scale(.92);}
.wb-qte-lbl{font-size:11px;font-weight:800;letter-spacing:2px;color:#00FF9F;}
.wb-qte-ic{font-size:32px;}
.wb-qte-cnt{font-size:11px;font-weight:800;color:rgba(0,255,159,.7);}
.wb-qte-bar-wrap{width:180px;text-align:center;}
.wb-qte-bar-lbl{font-size:8px;font-weight:800;letter-spacing:1.5px;color:rgba(255,255,255,.45);margin-bottom:4px;}
.wb-qte-bar{height:4px;border-radius:2px;background:rgba(255,255,255,.1);overflow:hidden;}
.wb-qte-bar-fill{height:100%;border-radius:2px;
  background:linear-gradient(90deg,#00FF9F,#00BFFF);transition:width .1s linear;}

/* ── Screen shake (ульта/QTE) ── */
.wb-shake{animation:wb-shake .45s ease-in-out;}
@keyframes wb-shake{0%,100%{transform:translateX(0)}10%,30%,50%,70%,90%{transform:translateX(-4px)}20%,40%,60%,80%{transform:translateX(4px)}}

/* ── MVP RAID — итоги рейда ── */
.wb-mvp-ov{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.88);
  display:flex;align-items:center;justify-content:center;padding:20px;
  opacity:0;pointer-events:none;transition:opacity .35s;}
.wb-mvp-ov.open{opacity:1;pointer-events:all;}
.wb-mvp{width:100%;max-width:340px;text-align:center;padding:24px 18px;
  background:radial-gradient(ellipse at center,rgba(40,30,0,.4) 0%,transparent 70%);
  transform:scale(.9);transition:transform .35s cubic-bezier(.32,1.4,.5,1);}
.wb-mvp-ov.open .wb-mvp{transform:scale(1);}
.wb-mvp-bdg{font-size:13px;font-weight:900;letter-spacing:5px;color:#FFD700;
  text-transform:uppercase;margin-bottom:14px;text-shadow:0 0 20px #FFD700;
  animation:wb-mvp-shine 1s ease-in-out infinite;}
@keyframes wb-mvp-shine{0%,100%{text-shadow:0 0 20px #FFD700}50%{text-shadow:0 0 40px #FFD700,0 0 80px rgba(255,215,0,.5)}}
.wb-mvp-av{width:80px;height:80px;border-radius:50%;margin:0 auto 14px;
  border:3px solid #FFD700;box-shadow:0 0 30px rgba(255,215,0,.5);
  display:flex;align-items:center;justify-content:center;font-size:40px;
  background:linear-gradient(135deg,#1a1a2e,#16213e);}
.wb-mvp-ov.lose .wb-mvp-av{border-color:#ff4466;box-shadow:0 0 30px rgba(255,68,102,.5);}
.wb-mvp-ov.lose .wb-mvp-bdg{color:#ff4466;text-shadow:0 0 20px #ff4466;}
.wb-mvp-name{font-size:24px;font-weight:900;color:#fff;margin-bottom:8px;}
.wb-mvp-sub{font-size:11px;font-weight:700;letter-spacing:2px;color:#FF0055;
  text-transform:uppercase;margin-bottom:14px;text-shadow:0 0 10px rgba(255,0,85,.5);}
.wb-mvp-dmg{font-size:14px;color:rgba(255,255,255,.7);margin-bottom:8px;}
.wb-mvp-dmg span{color:#00FF9F;font-family:'Courier New',monospace;font-weight:900;text-shadow:0 0 8px #00FF9F;}
.wb-mvp-rew{font-size:13px;color:#fff;margin-bottom:6px;font-weight:700;}
.wb-mvp-chest{font-size:11px;color:#ffdd66;margin-bottom:14px;}
.wb-mvp-btn{display:block;width:100%;margin-top:18px;padding:14px;border-radius:10px;
  background:linear-gradient(135deg,#FF0055,#cc0044);border:none;color:#fff;
  font-size:13px;font-weight:900;letter-spacing:2px;cursor:pointer;
  box-shadow:0 0 25px rgba(255,0,85,.5);transition:all .15s;}
.wb-mvp-btn:active{transform:scale(.96);box-shadow:0 0 15px rgba(255,0,85,.7);}

/* ── Тост ── */
.wb-toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:9999;
  background:rgba(10,0,25,.95);border:1px solid rgba(255,0,200,.5);border-radius:10px;
  padding:9px 16px;font-size:11px;font-weight:700;color:#fff;pointer-events:none;
  animation:wb-tin .25s ease-out forwards;box-shadow:0 0 18px rgba(255,0,200,.25);}
@keyframes wb-tin{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

/* ── Player card overlay (без изменений) ── */
.wb-pcard-ov{position:fixed;inset:0;z-index:9990;background:rgba(0,0,0,.6);
  backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity .2s;
  display:flex;align-items:flex-end;justify-content:center;}
.wb-pcard-ov.open{opacity:1;pointer-events:all;}
.wb-pcard{width:100%;max-width:390px;border-radius:22px 22px 0 0;overflow:hidden;
  background:linear-gradient(180deg,#14003a 0%,#06030f 100%);
  border:1px solid rgba(255,0,200,.35);border-bottom:none;
  box-shadow:0 -10px 60px rgba(255,0,200,.18);padding:0 0 20px;
  transform:translateY(100%);transition:transform .3s cubic-bezier(.32,1.2,.5,1);}
.wb-pcard-ov.open .wb-pcard{transform:translateY(0);}
.wb-pc-hdl{display:flex;justify-content:center;padding:10px 0 6px;}
.wb-pc-hdl::before{content:"";width:36px;height:4px;border-radius:2px;background:rgba(255,0,200,.35);}
.wb-pc-hdr{display:flex;align-items:center;gap:12px;padding:0 18px 12px;
  border-bottom:1px solid rgba(255,0,200,.1);}
.wb-pc-av{font-size:36px;flex-shrink:0;}
.wb-pc-name{font-size:16px;font-weight:900;color:#fff;}
.wb-pc-tag{font-size:10px;color:#cc88ff;margin-top:2px;}
.wb-pc-cl{font-size:9px;color:#445566;margin-top:1px;}
.wb-pc-x{margin-left:auto;font-size:18px;color:#440066;cursor:pointer;padding:4px;}
.wb-pc-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px 18px;}
.wb-pc-st{text-align:center;padding:8px;border-radius:10px;
  background:rgba(255,0,200,.06);border:1px solid rgba(255,0,200,.15);}
.sv{font-size:14px;font-weight:900;color:#ff00cc;}
.sl{font-size:8px;color:#556;letter-spacing:1px;margin-top:2px;}
.wb-pc-hps{padding:0 18px 10px;}
.wb-pc-hpr{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;}
.wb-pc-hpl{font-size:9px;font-weight:800;letter-spacing:1px;color:#00e5ff;}
.wb-pc-hpv{font-size:10px;color:#aaa;}
.wb-pc-hpt{height:6px;border-radius:3px;background:rgba(255,255,255,.06);overflow:hidden;}
.wb-pc-hpf{height:100%;background:linear-gradient(90deg,#0033ff,#0099ff);border-radius:3px;}
.wb-pc-raid{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 18px;}
.wb-pc-rr{display:flex;align-items:center;gap:8px;padding:8px;border-radius:10px;
  background:rgba(0,10,25,.8);border:1px solid rgba(0,229,255,.12);}
.wb-pc-ri{font-size:16px;}
.wb-pc-rl{font-size:9px;color:#445;flex:1;}
.wb-pc-rv{font-size:11px;font-weight:800;}
.wb-pc-rv.d{color:#ff4466;}.wb-pc-rv.y{color:#ffdd44;}
`;
  function inject() {
    if (document.getElementById('wb-style-b2')) return;
    const s = document.createElement('style'); s.id='wb-style-b2'; s.textContent=CSS;
    document.head.appendChild(s);
  }
  return { inject };
})();
