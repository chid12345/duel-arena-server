/* BotBattleCss — кибер-стили для HTML-overlay боя (PvP/Натиск/Башня/Бот).
   Палитра унифицирована с WB-боем: pink #ff3ba8 / cyan #00f0ff / gold #ffd166.
   API: inject() — однократно вставляет <style id="bb-css"> в <head>. */

const BotBattleCss = (() => {

  const CSS = `
    /* === БАЗА ============================================================ */
    #bb-root{position:fixed;color:#e6f7ff;z-index:200;font-family:-apple-system,"Segoe UI",Roboto,sans-serif;overflow:hidden;-webkit-tap-highlight-color:transparent;user-select:none;
      background:radial-gradient(ellipse at 50% 0%,#1a0a2a 0%,#05050a 55%),#000;}
    #bb-root *{box-sizing:border-box;}
    /* CRT-сканлайн поверх всего фона + радиальная неон-виньетка */
    #bb-root::before{content:"";position:absolute;inset:0;pointer-events:none;z-index:1;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,255,220,.025) 3px 4px);}
    #bb-root::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:1;background:radial-gradient(circle at 20% 30%,rgba(255,40,170,.10),transparent 40%),radial-gradient(circle at 80% 80%,rgba(0,230,255,.10),transparent 40%);}
    #bb-root > *{position:relative;z-index:2;}

    /* === BG арены — фото бота / pvp_bg, затемнено + лёгкая виньетка снизу */
    #bb-root .bg{position:absolute;top:0;left:0;right:0;bottom:0;background-size:cover;background-position:center;filter:brightness(.72) saturate(1.05);pointer-events:none;z-index:0;}
    #bb-root .bg::after{content:"";position:absolute;inset:0;background:linear-gradient(to bottom,rgba(5,5,15,.45) 0%,rgba(5,5,15,.05) 35%,rgba(5,5,15,.05) 65%,rgba(5,5,15,.7) 100%);}

    /* === ШАПКА (соперник сверху, как в WB-бою) =========================== */
    #bb-root .bb-top{position:absolute;top:8px;left:8px;right:8px;display:flex;align-items:center;gap:8px;z-index:10;pointer-events:none;}
    #bb-root .bb-top-name{flex:1;min-width:0;font-size:14px;font-weight:900;letter-spacing:1px;background:linear-gradient(90deg,#ff3ba8,#00f0ff);-webkit-background-clip:text;background-clip:text;color:transparent;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:auto;cursor:pointer;font-family:-apple-system,"Segoe UI",Roboto,sans-serif;}
    #bb-root .bb-top-sub{font-size:9px;color:#ffd166;text-shadow:0 0 5px rgba(255,209,102,.6);letter-spacing:.5px;font-family:"Courier New","Consolas",monospace;flex-shrink:0;}
    #bb-root .bb-top-sub:empty{display:none;}
    #bb-root .bb-top-sub .hp-rating{color:#ffd166;}

    /* HP-полоска соперника на всю ширину под шапкой */
    #bb-root .bb-bhp{position:absolute;top:34px;left:8px;right:8px;display:flex;align-items:center;gap:8px;z-index:10;pointer-events:none;}
    #bb-root .bb-bhp-lbl{font-size:9px;font-weight:900;letter-spacing:1.2px;color:#ffd166;text-shadow:0 0 5px rgba(255,209,102,.6);flex-shrink:0;font-family:"Courier New","Consolas",monospace;}
    #bb-root .bb-bhp-nums{font-family:"Courier New","Consolas",monospace;font-size:10px;font-weight:900;color:#fff;text-shadow:0 0 5px #ff3ba8;white-space:nowrap;flex-shrink:0;}

    /* HP-полоска (общий компонент) с inset glow + сегменты + блик */
    #bb-root .hp-bar{position:relative;flex:1;height:14px;border-radius:7px;background:rgba(255,255,255,.04);overflow:hidden;border:1.5px solid rgba(0,240,255,.4);box-shadow:inset 0 0 8px rgba(0,0,0,.7),0 0 10px rgba(0,240,255,.18);}
    #bb-root .hp-bar.opp{border-color:rgba(255,59,168,.4);box-shadow:inset 0 0 8px rgba(0,0,0,.7),0 0 10px rgba(255,59,168,.18);}
    #bb-root .hp-fill{height:100%;background:linear-gradient(90deg,#0066ff 0%,#00f0ff 100%);background-size:200% 100%;box-shadow:0 0 8px rgba(0,240,255,.6),inset 0 0 4px rgba(255,255,255,.3);transition:width .5s ease;animation:bbHpFlow 2.4s linear infinite;}
    #bb-root .hp-bar.opp .hp-fill{background:linear-gradient(90deg,#ff0066 0%,#ff3ba8 50%,#ffd166 100%);background-size:200% 100%;box-shadow:0 0 8px rgba(255,59,168,.6),inset 0 0 4px rgba(255,255,255,.3);}
    @keyframes bbHpFlow{to{background-position:200% 0;}}
    #bb-root .hp-bar::before{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(90deg,transparent 0,transparent calc(8.333% - 1px),rgba(0,0,0,.45) calc(8.333% - 1px),rgba(0,0,0,.45) 8.333%);z-index:2;}
    #bb-root .hp-bar::after{content:"";position:absolute;left:0;right:0;top:0;height:45%;background:linear-gradient(180deg,rgba(255,255,255,.22),transparent);pointer-events:none;z-index:1;border-radius:6px 6px 0 0;}
    #bb-root .hp-rating{font-weight:600;opacity:.95;font-size:9.5px;color:#ffd166;text-shadow:0 0 5px rgba(255,209,102,.6);letter-spacing:.6px;font-family:"Courier New","Consolas",monospace;}

    /* HP игрока — внизу под кнопками, как в WB */
    #bb-root .bb-php-row{position:absolute;left:8px;right:8px;bottom:8px;display:flex;align-items:center;gap:8px;z-index:9;pointer-events:none;}
    #bb-root .bb-php-row .hp-bar{height:9px;border-radius:5px;}
    #bb-root .bb-php-ic{font-size:14px;flex-shrink:0;filter:drop-shadow(0 0 4px #00f0ff);color:#00f0ff;}
    #bb-root .bb-php-nums{font-family:"Courier New","Consolas",monospace;font-size:10px;font-weight:700;color:#80e8ff;text-shadow:0 0 5px #00f0ff;flex-shrink:0;white-space:nowrap;}
    #bb-root .bb-php-name{font-size:10px;font-weight:900;letter-spacing:.8px;color:#80e8ff;text-shadow:0 0 6px rgba(0,240,255,.7);font-family:"Courier New","Consolas",monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:35%;flex-shrink:0;pointer-events:auto;cursor:pointer;}
    #bb-root .bb-php-name .hp-rating{margin-left:4px;}

    /* === КИБЕР-ТАЙМЕР =================================================== */
    #bb-root .timer{display:flex;align-items:center;gap:5px;font-family:"Courier New","Consolas",monospace;font-size:13px;font-weight:700;color:#00f0ff;text-shadow:0 0 6px #00f0ff;pointer-events:none;background:rgba(10,2,20,.65);padding:3px 8px;border-radius:6px;border:1px solid rgba(0,240,255,.35);transition:color .15s,border-color .15s,background .15s;flex-shrink:0;}
    #bb-root .timer::before{content:"";width:5px;height:5px;border-radius:50%;background:#00f0ff;box-shadow:0 0 6px #00f0ff;animation:bbTimerDot 1s ease-in-out infinite;}
    @keyframes bbTimerDot{0%,100%{opacity:1}50%{opacity:.25}}
    #bb-root .timer.danger{color:#ff4477;text-shadow:0 0 6px #ff4477;border-color:rgba(255,68,119,.7);background:rgba(40,5,12,.85);animation:bbTimerPulse 1s ease-in-out infinite;}
    #bb-root .timer.danger::before{background:#ff4477;box-shadow:0 0 8px #ff4477;}
    @keyframes bbTimerPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 transparent}50%{transform:scale(1.1);box-shadow:0 0 12px rgba(255,68,119,.7)}}

    /* === БОЙЦЫ ========================================================== */
    #bb-root .fighter{position:absolute;bottom:22%;display:flex;align-items:flex-end;justify-content:center;pointer-events:none;}
    #bb-root .player{left:-2%;width:38%;height:48%;}
    #bb-root .boss{right:-3%;width:62%;height:78%;}
    #bb-root.pvp .player{left:2%;width:46%;height:60%;}
    #bb-root.pvp .boss{right:2%;width:46%;height:60%;}
    #bb-root .fighter img{width:100%;height:100%;object-fit:contain;object-position:bottom;-webkit-mask-image:linear-gradient(to top,transparent 0%,#000 8%);mask-image:linear-gradient(to top,transparent 0%,#000 8%);-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-size:100% 100%;mask-size:100% 100%;transform-origin:50% 100%;}
    @keyframes bbBreathPlayer{0%,100%{transform:scaleX(-1) scale(1)}50%{transform:scaleX(-1) scale(1.025)}}
    #bb-root .player > img{animation:bbBreathPlayer 3.6s ease-in-out infinite;transform-origin:50% 100%;}
    #bb-root .shadow{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:78%;height:12px;background:radial-gradient(ellipse at center,rgba(0,0,0,.78) 0%,transparent 70%);pointer-events:none;}
    #bb-root .vs{position:absolute;top:38%;left:50%;transform:translate(-50%,-50%);z-index:8;font-size:64px;font-weight:900;color:#fff;font-family:"Courier New","Consolas",monospace;letter-spacing:6px;text-shadow:2px 0 0 #00f0ff,-2px 0 0 #ff3ba8,0 0 14px #ff3ba8,0 0 18px #00f0ff,0 4px 10px rgba(0,0,0,.95);animation:bbVsPulse 1.6s ease-in-out infinite;pointer-events:none;}
    @keyframes bbVsPulse{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.1)}}
    @keyframes bbBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.025)}}
    #bb-root .boss > img{animation:bbBreath 3.4s ease-in-out infinite;}
    @keyframes bbBreathFlip{0%,100%{transform:scaleX(-1) scale(1)}50%{transform:scaleX(-1) scale(1.025)}}
    #bb-root .boss.flip > img{animation:bbBreathFlip 3.4s ease-in-out infinite;}
    @keyframes bbDodgeLeft{0%,100%{translate:0 0;opacity:1}50%{translate:-26px 0;opacity:.55}}
    @keyframes bbDodgeRight{0%,100%{translate:0 0;opacity:1}50%{translate:26px 0;opacity:.55}}
    #bb-root .fighter.dodge-left{animation:bbDodgeLeft 380ms ease-out;}
    #bb-root .fighter.dodge-right{animation:bbDodgeRight 380ms ease-out;}
    /* Кибер-вспышка на жертве: pink (обычный) или cyan (крит) */
    #bb-root .fighter > img{transition:filter 90ms ease-out;}
    #bb-root .fighter.cy-hit > img{filter:drop-shadow(0 0 18px #ff3ba8) drop-shadow(0 0 32px #ff3ba8) brightness(1.4) saturate(.6) !important;}
    #bb-root .fighter.cy-hit.crit > img{filter:drop-shadow(0 0 22px #00f0ff) drop-shadow(0 0 38px #00f0ff) brightness(1.7) saturate(.5) !important;}
    /* Старый класс crit-hit — оставляем как алиас (вызывается из BotBattleHtmlFx) */
    #bb-root .fighter.crit-hit > img{filter:drop-shadow(0 0 20px #00f0ff) drop-shadow(0 0 36px #00f0ff) brightness(1.55) !important;}

    /* === ЗОНЫ АТАКИ/ЗАЩИТЫ — палитра выровнена под WB ==================== */
    #bb-root .col{position:absolute;display:flex;flex-direction:column;gap:10px;z-index:9;}
    #bb-root .atk-col{left:4px;bottom:104px;}
    #bb-root .def-col{right:4px;bottom:104px;}
    #bb-root .col-lbl{font-size:9px;font-weight:900;letter-spacing:1.6px;text-align:center;font-family:"Courier New","Consolas",monospace;text-transform:uppercase;margin-bottom:1px;}
    #bb-root .atk-col .col-lbl{color:#ff7acb;text-shadow:0 0 6px rgba(255,59,168,.7);}
    #bb-root .def-col .col-lbl{color:#80e8ff;text-shadow:0 0 6px rgba(0,240,255,.7);}
    #bb-root .ic-btn{width:54px;display:flex;flex-direction:column;align-items:center;gap:0;cursor:pointer;user-select:none;position:relative;padding:2px 0;}
    #bb-root .ic-btn img{width:30px;height:30px;object-fit:contain;}
    #bb-root .ic-btn .nm{font-size:7.5px;font-weight:800;letter-spacing:.4px;font-family:"Courier New","Consolas",monospace;text-transform:uppercase;}
    #bb-root .atk-col .ic-btn img{filter:drop-shadow(0 0 5px rgba(255,59,168,.85)) drop-shadow(0 1px 2px rgba(0,0,0,.8));}
    #bb-root .def-col .ic-btn img{filter:drop-shadow(0 0 5px rgba(0,240,255,.85)) drop-shadow(0 1px 2px rgba(0,0,0,.8));}
    #bb-root .atk-col .ic-btn .nm{color:#ff9ed4;text-shadow:0 0 5px rgba(255,59,168,.7);}
    #bb-root .def-col .ic-btn .nm{color:#a8eaff;text-shadow:0 0 5px rgba(0,240,255,.7);}
    #bb-root .ic-btn .halo{position:absolute;top:-4px;left:50%;transform:translateX(-50%);width:56px;height:56px;border-radius:50%;pointer-events:none;opacity:0;}
    #bb-root .atk-col .ic-btn .halo{background:radial-gradient(circle,rgba(255,59,168,.85) 0%,rgba(255,59,168,.25) 45%,transparent 70%);}
    #bb-root .def-col .ic-btn .halo{background:radial-gradient(circle,rgba(0,240,255,.85) 0%,rgba(0,240,255,.25) 45%,transparent 70%);}
    #bb-root .ic-btn.sel .halo{opacity:1;animation:bbHalo 1.2s ease-in-out infinite;}
    @keyframes bbHalo{0%,100%{transform:translateX(-50%) scale(1);opacity:.95}50%{transform:translateX(-50%) scale(1.2);opacity:1}}
    #bb-root .ic-btn.sel{border-radius:10px;}
    #bb-root .atk-col .ic-btn.sel{background:radial-gradient(circle at 50% 35%,rgba(255,59,168,.28) 0%,transparent 70%);box-shadow:0 0 0 2px rgba(255,59,168,.65),0 0 14px rgba(255,59,168,.5);}
    #bb-root .def-col .ic-btn.sel{background:radial-gradient(circle at 50% 35%,rgba(0,240,255,.28) 0%,transparent 70%);box-shadow:0 0 0 2px rgba(0,240,255,.65),0 0 14px rgba(0,240,255,.5);}
    @keyframes bbSelPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
    #bb-root .atk-col .ic-btn.sel img{filter:drop-shadow(0 0 16px #ff3ba8) drop-shadow(0 0 8px #fff) drop-shadow(0 1px 2px rgba(0,0,0,.85));animation:bbSelPulse 1s ease-in-out infinite;transform-origin:50% 100%;}
    #bb-root .def-col .ic-btn.sel img{filter:drop-shadow(0 0 16px #00f0ff) drop-shadow(0 0 8px #fff) drop-shadow(0 1px 2px rgba(0,0,0,.85));animation:bbSelPulse 1s ease-in-out infinite;transform-origin:50% 100%;}
    #bb-root .ic-btn.sel .nm{color:#fff;font-weight:900;}
    #bb-root .ic-btn.spin > img{filter:brightness(2) drop-shadow(0 0 12px #fff) drop-shadow(0 0 6px #ffd166)!important;}

    /* === ПАНЕЛЬ ДЕЙСТВИЙ (auto + confirm + autobattle) =================== */
    /* Стоит над HP-полоской игрока (которая на bottom:8px) */
    #bb-root .action-row{position:absolute;left:8px;right:8px;bottom:42px;display:flex;gap:8px;align-items:stretch;z-index:9;}
    #bb-root .auto-btn{flex-shrink:0;width:38px;height:38px;background:none;border:0;padding:0;display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;transition:transform .12s;font-size:0;}
    #bb-root .auto-btn img{width:100%;height:100%;object-fit:contain;pointer-events:none;filter:drop-shadow(0 0 6px rgba(255,200,60,.5)) drop-shadow(0 2px 4px rgba(0,0,0,.6));transition:filter .18s, transform .18s;}
    #bb-root .auto-btn:active{transform:scale(.92);}
    #bb-root .auto-btn:active img{filter:drop-shadow(0 0 12px rgba(255,200,60,.85)) drop-shadow(0 2px 4px rgba(0,0,0,.6));}
    #bb-root .confirm-btn{flex:1;height:38px;position:relative;display:flex;align-items:center;justify-content:center;border-radius:10px;background:linear-gradient(135deg,rgba(20,5,40,.95),rgba(8,2,20,.98));border:1.5px solid rgba(120,40,120,.45);box-shadow:inset 0 1px 0 rgba(255,180,255,.07),0 2px 8px rgba(0,0,0,.55);font-family:-apple-system,"Segoe UI",Roboto,sans-serif;font-size:11px;font-weight:900;letter-spacing:1.6px;text-transform:uppercase;color:transparent;cursor:not-allowed;overflow:hidden;opacity:.6;transition:opacity .2s, border-color .2s, box-shadow .2s, transform .12s;user-select:none;}
    #bb-root .confirm-btn::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 0% 0%,rgba(255,59,168,.10),transparent 55%),radial-gradient(circle at 100% 100%,rgba(0,240,255,.10),transparent 55%);}
    #bb-root .confirm-btn::after{content:attr(data-text);position:relative;z-index:2;background:linear-gradient(90deg,#ff7acb,#80e8ff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 1px 2px rgba(0,0,0,.85));}
    #bb-root .confirm-btn.ready{opacity:1;cursor:pointer;border-color:rgba(255,59,168,.65);box-shadow:inset 0 0 16px rgba(255,59,168,.10),inset 0 1px 0 rgba(255,180,255,.18),0 0 16px rgba(255,59,168,.45),0 0 28px rgba(0,240,255,.25);animation:cfPulse 1.8s ease-in-out infinite;}
    #bb-root .confirm-btn.ready::after{background:linear-gradient(90deg,#ff3ba8,#00f0ff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 6px rgba(255,59,168,.45));}
    @keyframes cfPulse{0%,100%{box-shadow:inset 0 0 16px rgba(255,59,168,.10),inset 0 1px 0 rgba(255,180,255,.18),0 0 16px rgba(255,59,168,.45),0 0 28px rgba(0,240,255,.25);}50%{box-shadow:inset 0 0 20px rgba(255,59,168,.18),inset 0 1px 0 rgba(255,180,255,.25),0 0 26px rgba(255,59,168,.7),0 0 44px rgba(0,240,255,.4);}}
    #bb-root .confirm-btn.ready:active{transform:scale(.97);animation:none;}
    #bb-root .autobattle-btn{flex-shrink:0;width:38px;height:38px;background:none;border:0;padding:0;display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;transition:transform .12s;position:relative;font-size:0;}
    #bb-root .autobattle-btn img{width:100%;height:100%;object-fit:contain;pointer-events:none;filter:hue-rotate(160deg) saturate(1.2) drop-shadow(0 0 6px rgba(0,240,255,.4)) drop-shadow(0 2px 4px rgba(0,0,0,.6));transition:filter .25s, transform .18s;}
    #bb-root .autobattle-btn:active{transform:scale(.92);}
    #bb-root .autobattle-btn:active img{filter:hue-rotate(160deg) saturate(1.3) brightness(1.15) drop-shadow(0 0 12px rgba(0,240,255,.7)) drop-shadow(0 2px 4px rgba(0,0,0,.6));transform:scale(.96);}
    #bb-root .autobattle-btn.on img{animation:bbAutoOnGlow 1.6s ease-in-out infinite;}
    @keyframes bbAutoOnGlow{0%,100%{filter:hue-rotate(160deg) saturate(1.3) drop-shadow(0 0 10px rgba(0,240,255,.55)) drop-shadow(0 0 16px rgba(255,59,168,.35)) drop-shadow(0 2px 4px rgba(0,0,0,.6));}50%{filter:hue-rotate(160deg) saturate(1.4) drop-shadow(0 0 16px rgba(0,240,255,.85)) drop-shadow(0 0 28px rgba(255,59,168,.6)) drop-shadow(0 2px 4px rgba(0,0,0,.6));}}
    #bb-root .autobattle-btn.locked img{filter:grayscale(.6) brightness(.7) drop-shadow(0 2px 4px rgba(0,0,0,.6));}
    #bb-root .autobattle-btn .lock-em{position:absolute;top:-2px;right:-2px;font-size:14px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.85));pointer-events:none;}
    #bb-root .bb-toast{position:absolute;left:50%;bottom:78px;transform:translateX(-50%);background:linear-gradient(180deg,rgba(40,8,40,.95),rgba(20,4,20,.95));border:1px solid rgba(0,240,255,.45);border-radius:8px;padding:7px 14px;font-size:11px;font-weight:700;color:#80e8ff;text-shadow:0 0 6px rgba(0,240,255,.5);letter-spacing:.5px;box-shadow:0 0 14px rgba(0,240,255,.35);z-index:50;pointer-events:none;animation:bbToastFx 2.4s ease-out forwards;}
    @keyframes bbToastFx{0%{opacity:0;transform:translate(-50%,8px)}10%,80%{opacity:1;transform:translate(-50%,0)}100%{opacity:0;transform:translate(-50%,-6px)}}
    #bb-root .wait{position:absolute;left:0;right:0;top:55%;text-align:center;color:#ffd166;font-size:13px;font-weight:700;z-index:9;pointer-events:none;text-shadow:0 0 6px rgba(255,209,102,.6);}

    /* === ИМПАКТ-ЭФФЕКТЫ + НЕОН-ЦИФРЫ УРОНА (порт из cy-* WB) ============= */
    #bb-root .cy-dmg{position:absolute;font-family:"Impact","Arial Black",Helvetica,sans-serif;font-weight:900;pointer-events:none;z-index:20;font-size:38px;line-height:1;letter-spacing:1px;white-space:nowrap;color:#ff3ba8;-webkit-text-stroke:2.5px #0a0014;text-shadow:0 0 8px #ff3ba8,0 0 16px rgba(255,59,168,.55),0 3px 0 rgba(0,0,0,.95),0 4px 10px rgba(0,0,0,.75);animation:bbDmgFly 1.6s cubic-bezier(.2,.7,.3,1) forwards;transform:translate(-50%,0);}
    #bb-root .cy-dmg.crit{font-size:44px;color:#00f0ff;-webkit-text-stroke:2.5px #001a1f;text-shadow:0 0 10px #00f0ff,0 0 22px rgba(0,240,255,.7),0 0 36px rgba(0,240,255,.4),0 3px 0 rgba(0,0,0,.95),0 4px 10px rgba(0,0,0,.75);}
    @keyframes bbDmgFly{0%{opacity:0;transform:translate(-50%,12px) scale(.5) rotate(-3deg);}14%{opacity:1;transform:translate(-50%,-14px) scale(1.25) rotate(-1deg);}30%{opacity:1;transform:translate(-50%,-24px) scale(1) rotate(0deg);}78%{opacity:1;transform:translate(-50%,-58px) scale(1) rotate(0deg);}100%{opacity:0;transform:translate(-50%,-90px) scale(.85) rotate(0deg);}}
    #bb-root .cy-slash{position:absolute;width:240px;height:12px;transform:translate(-50%,-50%) rotate(var(--slash-rot,-25deg)) scaleX(0);background:linear-gradient(90deg,transparent 0%,#ff3ba8 25%,#fff 50%,#ff3ba8 75%,transparent 100%);filter:blur(2px) drop-shadow(0 0 14px #ff3ba8) drop-shadow(0 0 4px #fff);opacity:0;pointer-events:none;z-index:18;border-radius:6px;transform-origin:50% 50%;animation:bbSlash .42s cubic-bezier(.2,.8,.3,1) forwards;}
    #bb-root .cy-slash.crit{background:linear-gradient(90deg,transparent 0%,#00f0ff 25%,#fff 50%,#00f0ff 75%,transparent 100%);filter:blur(2px) drop-shadow(0 0 18px #00f0ff) drop-shadow(0 0 6px #fff);}
    @keyframes bbSlash{0%{opacity:0;transform:translate(-50%,-50%) rotate(var(--slash-rot,-25deg)) scaleX(0);}18%{opacity:1;transform:translate(-50%,-50%) rotate(var(--slash-rot,-25deg)) scaleX(1.05);}60%{opacity:.9;}100%{opacity:0;transform:translate(-50%,-50%) rotate(var(--slash-rot,-25deg)) scaleX(1);}}
    #bb-root .cy-shock{position:absolute;width:44px;height:44px;border-radius:50%;border:3px solid #ff3ba8;transform:translate(-50%,-50%) scale(0);opacity:0;pointer-events:none;z-index:16;box-shadow:0 0 14px #ff3ba8,inset 0 0 8px rgba(255,59,168,.4);animation:bbShock .55s cubic-bezier(.2,.7,.3,1) forwards;}
    #bb-root .cy-shock.crit{border-color:#00f0ff;box-shadow:0 0 18px #00f0ff,inset 0 0 8px rgba(0,240,255,.4);}
    @keyframes bbShock{0%{opacity:1;transform:translate(-50%,-50%) scale(0);border-width:4px;}60%{opacity:.85;}100%{opacity:0;transform:translate(-50%,-50%) scale(6);border-width:1px;}}
    #bb-root .cy-spark{position:absolute;width:6px;height:6px;border-radius:50%;background:#fff;color:#ff3ba8;box-shadow:0 0 8px currentColor,0 0 16px currentColor;pointer-events:none;z-index:17;--dx:0px;--dy:0px;transform:translate(-50%,-50%);animation:bbSpark .55s ease-out forwards;}
    #bb-root .cy-spark.crit{color:#00f0ff;}
    @keyframes bbSpark{0%{opacity:1;transform:translate(-50%,-50%) scale(1);}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(.2);}}
  `;

  return {
    inject() {
      if (document.getElementById('bb-css')) return;
      const s = document.createElement('style');
      s.id = 'bb-css';
      s.textContent = CSS;
      document.head.appendChild(s);
    },
  };
})();

if (typeof window !== 'undefined') window.BotBattleCss = BotBattleCss;
