/* wb_html_battle.js — HyperPunk battle screen + player cards + HUD update
   Расширяет window.WBHtml методами _renderBattle, updateHUD, addHit */
(() => {
  const CSS_B = `
.wb-bhdr{padding:12px 14px 8px;display:flex;align-items:center;justify-content:space-between;
  border-bottom:1px solid rgba(255,0,200,.15);
  background:linear-gradient(180deg,rgba(30,0,50,.5) 0%,transparent 100%);position:sticky;top:0;z-index:10;}
.wb-btitle{font-size:12px;font-weight:900;letter-spacing:1px;color:#fff;display:flex;align-items:center;gap:6px;}
.wb-bico{font-size:16px;filter:drop-shadow(0 0 6px rgba(255,0,200,.7));}
.wb-vuln{font-size:8px;font-weight:800;letter-spacing:1px;padding:3px 8px;border-radius:6px;
  background:rgba(255,200,0,.12);color:#ffdd44;border:1px solid rgba(255,200,0,.3);animation:wb-blink .8s step-end infinite;}
.wb-btimer{font-size:11px;font-weight:800;letter-spacing:1px;color:#00e5ff;text-shadow:0 0 6px currentColor;}
.wb-hp-sec{padding:8px 14px 4px;}
.wb-hp-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;}
.wb-hp-lbl{font-size:8px;font-weight:800;letter-spacing:2px;color:#ff00cc;text-shadow:0 0 5px currentColor;}
.wb-hp-nums{font-size:9px;color:rgba(255,255,255,.4);font-weight:700;}
.wb-hp-track{height:16px;border-radius:8px;background:rgba(255,255,255,.06);
  border:1px solid rgba(255,0,200,.2);overflow:visible;position:relative;margin-bottom:4px;}
.wb-hp-fill{height:100%;border-radius:8px;
  background:linear-gradient(90deg,#880033,#cc0055,#ff3377);
  box-shadow:0 0 12px rgba(255,0,100,.5);position:relative;transition:width .4s;}
.wb-hp-fill::after{content:"";position:absolute;inset:0;border-radius:8px;
  background:repeating-linear-gradient(90deg,transparent 0 8px,rgba(255,255,255,.06) 8px 9px);
  animation:wb-flow 1.2s linear infinite;}
@keyframes wb-flow{to{background-position:9px 0}}
.wb-crown-pins{position:absolute;inset:0;pointer-events:none;}
.wb-cp-pin{position:absolute;top:-2px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:1px;}
.wb-cp-pin .cpi{font-size:10px;line-height:1;}.wb-cp-pin .cpd{width:2px;height:20px;background:rgba(255,200,0,.4);}
.wb-cp-pin.done .cpi{opacity:.35;filter:grayscale(1);}.wb-cp-pin.done .cpd{background:rgba(255,255,255,.15);}
.wb-enrage{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:6px;margin-top:2px;
  font-size:8px;font-weight:800;letter-spacing:1px;color:#ff6644;background:rgba(255,80,0,.1);border:1px solid rgba(255,80,0,.25);}
.wb-live{margin:6px 14px 4px;padding:7px 12px;border-radius:10px;
  background:rgba(0,5,20,.7);border:1px solid rgba(0,229,255,.15);
  display:flex;align-items:center;justify-content:space-between;}
.wb-ldots{display:flex;align-items:center;gap:5px;}
.wb-ldot{width:6px;height:6px;border-radius:50%;background:#00ff88;
  box-shadow:0 0 6px rgba(0,255,136,.8);animation:wb-ldp 1.2s ease-in-out infinite;}
.wb-ldot:nth-child(2){animation-delay:.2s}.wb-ldot:nth-child(3){animation-delay:.4s}
@keyframes wb-ldp{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}
.wb-ltext{font-size:10px;font-weight:800;color:#00ff88;text-shadow:0 0 6px rgba(0,255,136,.5);}
.wb-ltext span{color:rgba(255,255,255,.3);font-weight:600;}
.wb-lavs{display:flex;gap:3px;align-items:center;}
.wb-lav{width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:9px;
  background:linear-gradient(135deg,#1a0033,#0a0020);border:1px solid rgba(255,0,200,.3);
  cursor:pointer;transition:all .2s;position:relative;}
.wb-lav:hover{border-color:#ff00cc;box-shadow:0 0 8px rgba(255,0,200,.5);}
.wb-lav.atk{animation:wb-atk .6s ease-in-out infinite alternate;}
.wb-lav.atk::after{content:"⚔️";position:absolute;font-size:7px;top:-6px;right:-4px;animation:wb-sw .6s ease-in-out infinite alternate;}
@keyframes wb-atk{0%{border-color:rgba(255,0,200,.3)}100%{border-color:rgba(255,0,200,.9);box-shadow:0 0 8px rgba(255,0,200,.5)}}
@keyframes wb-sw{0%{transform:rotate(-20deg)}100%{transform:rotate(20deg)}}
.wb-lmore{font-size:8px;color:#445566;font-weight:700;margin-left:2px;}
.wb-arena{position:relative;padding:6px 14px 4px;display:flex;align-items:flex-end;justify-content:space-between;height:220px;}
.wb-arena-glow{position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(ellipse at 50% 50%,rgba(255,0,200,.06) 0%,transparent 70%);
  animation:wb-ap 3s ease-in-out infinite;}
.wb-arena-gnd{position:absolute;bottom:4px;left:14px;right:14px;height:1px;
  background:linear-gradient(90deg,transparent,rgba(255,0,200,.25),transparent);}
.wb-arena-gnd::before{content:"";position:absolute;bottom:0;left:0;right:0;height:20px;
  background:linear-gradient(0deg,rgba(255,0,200,.05),transparent);}
.wb-player{display:flex;flex-direction:column;align-items:center;gap:5px;width:100px;position:relative;z-index:2;}
.wb-pskin{width:88px;height:130px;border-radius:12px;display:grid;place-items:center;
  background:linear-gradient(135deg,rgba(0,60,150,.18),rgba(0,30,80,.1));
  border:1px solid rgba(0,200,255,.25);box-shadow:0 0 20px rgba(0,180,255,.12),inset 0 0 14px rgba(0,200,255,.05);
  position:relative;overflow:hidden;animation:wb-pf 3.2s ease-in-out infinite;}
@keyframes wb-pf{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
.wb-pskin img{max-width:80px;max-height:126px;object-fit:contain;
  filter:hue-rotate(180deg) drop-shadow(0 0 10px rgba(0,200,255,.6));}
.wb-pskin .pem{font-size:52px;}
.wb-pskin::after{content:"";position:absolute;left:0;right:0;height:2px;
  background:linear-gradient(90deg,transparent,rgba(0,229,255,.4),transparent);
  animation:wb-ss 2.5s linear infinite;top:0;}
@keyframes wb-ss{0%{top:-2px;opacity:0}10%{opacity:1}90%{opacity:1}100%{top:100%;opacity:0}}
.wb-php{width:88px;height:6px;border-radius:3px;background:rgba(255,255,255,.06);overflow:hidden;}
.wb-php-f{height:100%;border-radius:3px;background:linear-gradient(90deg,#0044aa,#0088ff);
  box-shadow:0 0 6px rgba(0,150,255,.5);transition:width .3s;}
.wb-ptag{font-size:8px;font-weight:800;color:#00e5ff;letter-spacing:1px;text-shadow:0 0 4px currentColor;}
.wb-plvl{font-size:8px;color:rgba(255,255,255,.35);}
.wb-vs-c{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:8px;padding-bottom:14px;z-index:2;position:relative;}
.wb-vs{font-size:18px;font-weight:900;letter-spacing:2px;
  background:linear-gradient(180deg,#fff,#ff00cc);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 0 8px rgba(255,0,200,.6));}
.wb-parts{display:flex;flex-direction:column;align-items:center;gap:3px;}
.wb-part-row{display:flex;gap:3px;}
.wb-pav{width:18px;height:18px;border-radius:50%;display:grid;place-items:center;font-size:8px;
  background:linear-gradient(135deg,#1a0033,#0a0020);border:1px solid rgba(255,0,200,.3);}
.wb-pm{width:18px;height:18px;border-radius:50%;display:grid;place-items:center;font-size:7px;
  font-weight:800;color:#556677;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);}
.wb-plbl{font-size:7px;color:rgba(255,255,255,.25);letter-spacing:.5px;}
.wb-boss-s{width:130px;position:relative;z-index:2;}
.wb-bframe{width:130px;height:180px;position:relative;display:flex;align-items:flex-end;justify-content:center;}
.wb-baura{position:absolute;width:140px;height:140px;border-radius:50%;bottom:0;left:50%;transform:translateX(-50%);
  background:radial-gradient(ellipse,rgba(255,0,200,.18) 0%,transparent 70%);animation:wb-ap 2.5s ease-in-out infinite;}
.wb-bimg{width:120px;height:176px;object-fit:contain;position:relative;z-index:1;
  filter:drop-shadow(0 0 16px rgba(255,0,200,.75)) drop-shadow(0 0 32px rgba(0,200,255,.3));
  animation:wb-bf 2.5s ease-in-out infinite;transition:filter .1s;}
.wb-bem{font-size:80px;position:relative;z-index:1;animation:wb-bf 2.5s ease-in-out infinite;
  filter:drop-shadow(0 0 20px rgba(255,0,200,.7));}
.wb-flash{position:absolute;inset:0;border-radius:50%;pointer-events:none;z-index:10;
  background:radial-gradient(ellipse,rgba(255,255,255,.9) 0%,transparent 70%);opacity:0;}
.wb-flash.on{animation:wb-fl .3s ease-out forwards;}
@keyframes wb-fl{0%{opacity:.9}100%{opacity:0}}
.wb-wave{position:absolute;width:60px;height:60px;border-radius:50%;pointer-events:none;z-index:11;
  border:2px solid rgba(255,0,200,.8);bottom:50%;left:50%;transform:translate(-50%,50%) scale(0);opacity:0;}
.wb-wave.on{animation:wb-wv .5s ease-out forwards;}
@keyframes wb-wv{0%{transform:translate(-50%,50%) scale(.5);opacity:.9}100%{transform:translate(-50%,50%) scale(3);opacity:0}}
.wb-dfloat{position:absolute;right:8px;top:20%;z-index:20;pointer-events:none;
  font-size:26px;font-weight:900;color:#ff3366;text-shadow:0 0 14px rgba(255,0,100,.9),0 0 28px rgba(255,0,100,.5);opacity:0;
  letter-spacing:1px;white-space:nowrap;}
.wb-dfloat.crit{color:#ffcc00;font-size:34px;text-shadow:0 0 18px rgba(255,200,0,1),0 0 40px rgba(255,200,0,.6);}
.wb-dfloat.show{animation:wb-dr 1.1s ease-out forwards;}
@keyframes wb-dr{0%{opacity:1;transform:translateY(0) scale(1.2)}30%{transform:translateY(-16px) scale(1)}100%{opacity:0;transform:translateY(-60px) scale(.9)}}
.wb-shake{animation:wb-shk .3s ease-out!important;}
@keyframes wb-shk{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(5px)}60%{transform:translateX(-4px)}80%{transform:translateX(3px)}}
.wb-blog-wrap{margin:5px 14px 5px;border-radius:12px;overflow:hidden;
  background:rgba(4,0,12,.9);border:1px solid rgba(0,229,255,.12);border-left:2px solid rgba(255,0,200,.35);}
.wb-blog-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,.06);}
.wb-blog-tab{flex:1;padding:5px 0;text-align:center;font-size:9px;font-weight:800;letter-spacing:.8px;
  color:#334455;cursor:pointer;transition:all .15s;position:relative;}
.wb-blog-tab.on{color:#fff;background:rgba(255,255,255,.04);}
.wb-blog-tab.on::after{content:"";position:absolute;bottom:0;left:15%;right:15%;height:1px;
  background:linear-gradient(90deg,transparent,#ff00cc,transparent);}
.wb-blog-p{display:none;padding:8px 12px;min-height:72px;max-height:110px;overflow-y:auto;scroll-behavior:smooth;}
.wb-blog-empty{font-size:9px;color:#334;text-align:center;padding:18px 0;letter-spacing:1px;}
.wb-blog-p::-webkit-scrollbar{width:2px;}
.wb-blog-p::-webkit-scrollbar-thumb{background:rgba(255,0,200,.3);border-radius:2px;}
.wb-blog-p.on{display:block;}
.wb-ll{font-size:10px;line-height:1.8;}
.wb-ll .d{color:#ff4466;font-weight:800;}.wb-ll .c{color:#ffcc00;font-weight:800;}
.wb-ll .h{color:#44ffaa;font-weight:800;}.wb-ll .s{color:#ff00cc;font-weight:800;}
.wb-ll .o{opacity:.7;}.wb-ll .w{color:#cc88ff;font-weight:700;}
.wb-chat-l{font-size:10px;line-height:1.8;}
.wb-chat-l .cn{font-weight:800;color:#00e5ff;}.wb-chat-l .cm{color:#aabbcc;}
.wb-act-z{padding:8px 14px 80px;display:flex;flex-direction:column;gap:6px;}
.wb-atk-btn{width:100%;height:56px;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:10px;
  background:linear-gradient(135deg,#660022,#aa0044);border:1px solid rgba(255,0,100,.55);
  box-shadow:0 0 20px rgba(255,0,80,.2),inset 0 1px 0 rgba(255,100,150,.15);
  color:#fff;cursor:pointer;position:relative;overflow:hidden;transition:all .1s;user-select:none;}
.wb-atk-btn::before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,60,120,.12),transparent);}
.wb-atk-btn:active{transform:scale(.97);box-shadow:0 0 40px rgba(255,0,80,.6);}
.wb-atk-ico{font-size:22px;filter:drop-shadow(0 0 6px rgba(255,100,150,.8));}
.wb-atk-ml{font-size:14px;font-weight:900;letter-spacing:1px;}
.wb-atk-sl{font-size:8px;color:rgba(255,200,220,.5);letter-spacing:.5px;display:block;margin-top:1px;}
.wb-dead{margin:8px 14px;padding:16px;border-radius:14px;text-align:center;
  background:rgba(10,0,20,.9);border:1px solid rgba(255,0,100,.3);}
.wb-dead-t{font-size:16px;font-weight:900;color:#ff4466;margin-bottom:10px;}
.wb-res-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:8px;}
.wb-res-b{padding:8px 4px;border-radius:10px;text-align:center;cursor:pointer;
  background:rgba(20,0,30,.9);border:1px solid rgba(255,80,180,.25);font-size:9px;font-weight:800;color:#ff88cc;transition:all .2s;}
.wb-res-b:hover{border-color:rgba(255,80,180,.6);box-shadow:0 0 12px rgba(255,80,180,.2);}
.wb-res-b .ri{font-size:18px;margin-bottom:3px;display:block;}
.wb-sec-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;}
.wb-sb{height:46px;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
  cursor:pointer;font-weight:800;transition:all .15s;position:relative;overflow:hidden;}
.wb-sb::before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.05),transparent);}
.wb-sb-i{font-size:16px;line-height:1;}.wb-sb-l{font-size:8px;letter-spacing:.3px;}.wb-sb-c{font-size:9px;font-weight:900;}
.wb-sb.sc{background:linear-gradient(135deg,rgba(0,30,10,.95),rgba(0,18,6,.95));border:1px solid rgba(0,255,100,.25);}
.wb-sb.sc .wb-sb-l{color:#66ffaa;}.wb-sb.sc .wb-sb-c{color:#00ff88;text-shadow:0 0 4px currentColor;}
.wb-sb.bo{background:linear-gradient(135deg,rgba(30,0,60,.95),rgba(15,0,35,.95));border:1px solid rgba(150,0,255,.3);}
.wb-sb.bo .wb-sb-l{color:#cc88ff;}.wb-sb.bo .wb-sb-c{color:#aa66ff;text-shadow:0 0 4px currentColor;}
.wb-sb.st{background:linear-gradient(135deg,rgba(0,20,40,.95),rgba(0,10,25,.95));border:1px solid rgba(0,200,255,.2);}
.wb-sb.st .wb-sb-l{color:#88ccff;}.wb-sb.st .wb-sb-c{color:#44aaff;font-size:8px;}
/* Player card */
.wb-pcard-ov{position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center;
  background:rgba(0,0,0,.6);backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity .2s;}
.wb-pcard-ov.open{opacity:1;pointer-events:all;}
.wb-pcard{width:100%;max-width:390px;border-radius:22px 22px 0 0;overflow:hidden;
  background:linear-gradient(180deg,#14003a 0%,#06030f 100%);
  border:1px solid rgba(255,0,200,.35);border-bottom:none;
  box-shadow:0 -10px 60px rgba(255,0,200,.18),0 -2px 0 rgba(255,0,200,.4);
  transform:translateY(100%);transition:transform .3s cubic-bezier(.32,1.2,.5,1);}
.wb-pcard-ov.open .wb-pcard{transform:translateY(0);}
.wb-pc-hdl{display:flex;justify-content:center;padding:10px 0 6px;}
.wb-pc-hdl::before{content:"";width:36px;height:4px;border-radius:2px;background:rgba(255,0,200,.35);}
.wb-pc-hdr{display:flex;align-items:center;gap:12px;padding:0 18px 14px;border-bottom:1px solid rgba(255,0,200,.1);}
.wb-pc-av{width:60px;height:60px;border-radius:14px;flex-shrink:0;position:relative;
  background:linear-gradient(135deg,#1a0033,#002a30);border:1px solid #ff00cc;
  box-shadow:0 0 18px rgba(255,0,200,.45);display:grid;place-items:center;overflow:hidden;font-size:32px;}
.wb-pc-av::after{content:"";position:absolute;bottom:4px;right:4px;width:10px;height:10px;border-radius:50%;
  background:#00ff88;border:2px solid #06030f;box-shadow:0 0 6px rgba(0,255,136,.8);animation:wb-ldp 1.2s infinite;}
.wb-pc-name{font-size:16px;font-weight:900;color:#fff;}.wb-pc-tag{font-size:10px;color:#00e5ff;font-weight:700;margin-top:2px;}
.wb-pc-cl{font-size:9px;color:#664477;margin-top:3px;}
.wb-pc-x{margin-left:auto;width:28px;height:28px;border-radius:8px;display:grid;place-items:center;
  background:rgba(255,0,200,.08);border:1px solid rgba(255,0,200,.25);color:#ff88cc;font-size:14px;cursor:pointer;flex-shrink:0;}
.wb-pc-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:12px 18px;}
.wb-pc-st{padding:10px 8px;border-radius:12px;text-align:center;
  background:linear-gradient(135deg,rgba(20,0,38,.9),rgba(5,4,18,.9));border:1px solid rgba(255,0,200,.18);}
.wb-pc-st .sv{font-size:16px;font-weight:900;color:#00e5ff;text-shadow:0 0 8px currentColor;}
.wb-pc-st .sl{font-size:8px;font-weight:800;letter-spacing:1px;color:#664477;margin-top:3px;}
.wb-pc-hps{padding:0 18px 10px;}
.wb-pc-hpr{display:flex;justify-content:space-between;margin-bottom:4px;}
.wb-pc-hpl{font-size:8px;font-weight:800;letter-spacing:2px;color:#ff00cc;}
.wb-pc-hpv{font-size:9px;color:rgba(255,255,255,.4);}
.wb-pc-hpt{height:10px;border-radius:5px;background:rgba(255,255,255,.06);border:1px solid rgba(0,200,255,.2);overflow:hidden;}
.wb-pc-hpf{height:100%;border-radius:5px;background:linear-gradient(90deg,#0044aa,#0088ff);transition:width .4s;}
.wb-pc-raid{padding:0 18px 12px;display:flex;flex-direction:column;gap:5px;}
.wb-pc-rr{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;
  background:rgba(5,0,15,.7);border:1px solid rgba(255,0,200,.1);}
.wb-pc-ri{font-size:16px;width:20px;text-align:center;}.wb-pc-rl{font-size:10px;color:#8899aa;flex:1;}
.wb-pc-rv{font-size:11px;font-weight:800;}
.wb-pc-rv.d{color:#ff4466;text-shadow:0 0 5px currentColor;}
.wb-pc-rv.g{color:#00ff88;text-shadow:0 0 5px currentColor;}
.wb-pc-rv.y{color:#ffcc00;text-shadow:0 0 5px currentColor;}
.wb-pc-bst{padding:0 18px 16px;}
.wb-pc-bsl{font-size:8px;font-weight:800;letter-spacing:2px;color:#664477;margin-bottom:6px;}
.wb-pc-bc{display:flex;gap:5px;flex-wrap:wrap;}
.wb-pc-bch{display:flex;align-items:center;gap:4px;padding:4px 9px;border-radius:8px;
  background:rgba(255,0,200,.07);border:1px solid rgba(255,0,200,.25);font-size:9px;font-weight:800;color:#ff88cc;}
`;

  function _injectBattleCSS() {
    const ID = 'wb-style-b';
    if (document.getElementById(ID)) return;
    const s = document.createElement('style'); s.id = ID; s.textContent = CSS_B;
    document.head.appendChild(s);
  }

  function _fmtSec(s) {
    if (s == null || s < 0) return '—';
    return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  }
  function _esc(v) { return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

  function _renderBattle(root, s) {
    _injectBattleCSS();
    const a = s.active, ps = s.player_state;
    const pct = a.max_hp > 0 ? Math.round(a.current_hp / a.max_hp * 100) : 0;
    const ppct = ps && ps.max_hp > 0 ? Math.round(ps.current_hp / ps.max_hp * 100) : 85;
    const cr = a.crown_flags || 0;
    const pins = [[0b001,25],[0b010,50],[0b100,75]].map(([bit,p]) =>
      `<div class="wb-cp-pin${(cr&bit)?'':' done'}" style="left:${p}%"><div class="cpi">👑</div><div class="cpd"></div></div>`).join('');
    const top3 = (s.top || []).slice(0,3);
    const lavs = top3.map((t,i) => `<div class="wb-lav atk" data-pid="${i}" style="animation-delay:${i*.3}s">${['🧙','⚔️','🛡️'][i]}</div>`).join('');
    const _rcnt = Math.max(s.registrants_count||0, s.player_state ? 1 : 0);
    const extra = Math.max(0,_rcnt-3);
    const isDead = ps?.is_dead;

    const actZone = isDead ? `
      <div class="wb-dead">
        <div class="wb-dead-t">💀 Вы мертвы</div>
        <div style="font-size:10px;color:#8899aa">Используй свиток воскрешения</div>
        <div class="wb-res-row">
          <div class="wb-res-b" data-act="res" data-t="res_30"><span class="ri">💊</span>30% HP<br><small style="color:#666">500 🔥</small></div>
          <div class="wb-res-b" data-act="res" data-t="res_60"><span class="ri">💉</span>60% HP<br><small style="color:#666">40 💠</small></div>
          <div class="wb-res-b" data-act="res" data-t="res_100"><span class="ri">✨</span>100% HP<br><small style="color:#666">80 💠</small></div>
        </div>
        <div style="margin-top:10px;cursor:pointer;font-size:10px;color:#556;padding:8px;border:1px solid rgba(255,255,255,.08);border-radius:8px;" data-act="back">🚪 Покинуть бой</div>
      </div>` : `
      <div style="margin-bottom:6px;padding:7px 12px;border-radius:10px;text-align:center;font-size:10px;font-weight:800;color:#ff4444;border:1px solid rgba(255,40,40,.25);background:rgba(30,0,0,.5);cursor:pointer;letter-spacing:.5px;" data-act="wb-end-test">🛑 ЗАВЕРШИТЬ БОЙ (тест)</div>`+`
      <div class="wb-atk-btn" data-act="hit">
        <div class="wb-atk-ico">⚔️</div>
        <div><div class="wb-atk-ml">АТАКОВАТЬ</div><div class="wb-atk-sl">НАЖМИ ДЛЯ УДАРА</div></div>
      </div>
      <div class="wb-sec-row">
        <div class="wb-sb sc" data-act="use-scroll"><div class="wb-sb-i">💊</div><div class="wb-sb-l">СВИТОК</div><div class="wb-sb-c">×${ps?.raid_scroll_1?'1':'?'}</div></div>
        <div class="wb-sb bo" data-act="show-boosts"><div class="wb-sb-i">⚡</div><div class="wb-sb-l">БУСТ</div><div class="wb-sb-c">×${Object.values(s.raid_scrolls_inv||{}).reduce((a,b)=>a+b,0)}</div></div>
        <div class="wb-sb st" data-act="show-dmg"><div class="wb-sb-i">📊</div><div class="wb-sb-l">ВКЛАД</div><div class="wb-sb-c">${(ps?.total_damage||0).toLocaleString('ru')}</div></div>
      </div>`;

    root.innerHTML = `
<div class="wb-bhdr">
  <div class="wb-btitle"><span class="wb-bico">${_esc(a.boss_emoji||'💀')}</span>${_esc(a.boss_name||'Мировой Босс')}</div>
  ${a.vulnerable?'<div class="wb-vuln">⚡ УЯЗВИМ ×3</div>':''}
  <div class="wb-btimer" id="wb-bl-timer">⏱ ${_fmtSec(a.seconds_left)}</div>
</div>
<div class="wb-hp-sec">
  <div class="wb-hp-top"><div class="wb-hp-lbl">★ HP БОССА</div><div class="wb-hp-nums" id="wb-boss-nums">${(a.current_hp||0).toLocaleString('ru')} / ${(a.max_hp||0).toLocaleString('ru')} · ${pct}%</div></div>
  <div class="wb-hp-track"><div class="wb-hp-fill" id="wb-boss-bar" style="width:${pct}%"></div><div class="wb-crown-pins">${pins}</div></div>
  <div class="wb-enrage">🔥 ЯРОСТЬ при 50% HP — урон босса ×1.2</div>
</div>
<div class="wb-live">
  <div style="display:flex;align-items:center;gap:8px">
    <div class="wb-ldots"><div class="wb-ldot"></div><div class="wb-ldot"></div><div class="wb-ldot"></div></div>
    <div class="wb-ltext" id="wb-live-cnt">${_rcnt} <span>игроков в рейде</span></div>
  </div>
  <div class="wb-lavs">${lavs}${extra>0?`<div class="wb-lmore">+${extra}</div>`:''}</div>
</div>
<div class="wb-arena">
  <div class="wb-arena-glow"></div><div class="wb-arena-gnd"></div>
  <div class="wb-player">
    <div class="wb-pskin">
      <img src="bosses/boss2.png" onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<span class=pem>🧙</span>')"/>
    </div>
    <div class="wb-php"><div class="wb-php-f" id="wb-pl-bar" style="width:${ppct}%"></div></div>
    <div class="wb-ptag">ВЫ</div>
    <div class="wb-plvl" id="wb-pl-hp">${ps?`${ps.current_hp}/${ps.max_hp} HP`:'—'}</div>
  </div>
  <div class="wb-vs-c">
    <div class="wb-vs">VS</div>
    <div class="wb-parts">
      <div class="wb-part-row">
        ${top3.map(()=>`<div class="wb-pav">⚔️</div>`).join('')}
        ${extra>0?`<div class="wb-pm">+${extra}</div>`:''}
      </div>
      <div class="wb-plbl">${s.registrants_count||0} В РЕЙДЕ</div>
    </div>
  </div>
  <div class="wb-boss-s">
    <div class="wb-bframe" id="wb-bframe">
      <div class="wb-baura"></div>
      <div class="wb-flash" id="wb-flash"></div>
      <div class="wb-wave" id="wb-wave"></div>
      <div class="wb-dfloat" id="wb-dfloat"></div>
      <img class="wb-bimg" id="wb-bimg" src="bosses/boss3.png"
        onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<div class=wb-bem id=wb-bem>${_esc(a.boss_emoji||'🐉')}</div>')"/>
    </div>
  </div>
</div>
<div class="wb-blog-wrap">
  <div class="wb-blog-tabs">
    <div class="wb-blog-tab on" data-blog="mine">⚔️ МОЙ УРОН</div>
    <div class="wb-blog-tab" data-blog="world">🌍 ОБЩИЙ</div>
  </div>
  <div class="wb-blog-p on" id="wb-log-mine"><div class="wb-blog-empty">⚔️ Бей босса — здесь появится твой урон</div></div>
  <div class="wb-blog-p" id="wb-log-world"><div class="wb-blog-empty">🌍 Сводный урон всех участников рейда</div></div>
</div>
<div class="wb-act-z">${actZone}</div>
<div class="wb-pcard-ov" id="wb-pcov"><div class="wb-pcard" id="wb-pc">
  <div class="wb-pc-hdl"></div>
  <div class="wb-pc-hdr">
    <div class="wb-pc-av" id="wb-pc-av">🧙</div>
    <div><div class="wb-pc-name" id="wb-pc-n">—</div><div class="wb-pc-tag" id="wb-pc-t">—</div><div class="wb-pc-cl" id="wb-pc-c">—</div></div>
    <div class="wb-pc-x" id="wb-pc-x">✕</div>
  </div>
  <div class="wb-pc-stats">
    <div class="wb-pc-st"><div class="sv" id="wb-pc-atk">—</div><div class="sl">УРОН</div></div>
    <div class="wb-pc-st"><div class="sv" id="wb-pc-dmg">—</div><div class="sl">НАНЕСЕНО</div></div>
    <div class="wb-pc-st"><div class="sv" id="wb-pc-con">—</div><div class="sl">ВКЛАД</div></div>
  </div>
  <div class="wb-pc-hps">
    <div class="wb-pc-hpr"><div class="wb-pc-hpl">★ HP В БОЮ</div><div class="wb-pc-hpv" id="wb-pc-hpv">—</div></div>
    <div class="wb-pc-hpt"><div class="wb-pc-hpf" id="wb-pc-hpf" style="width:80%"></div></div>
  </div>
  <div class="wb-pc-raid">
    <div class="wb-pc-rr"><div class="wb-pc-ri">⚔️</div><div class="wb-pc-rl">Урон по боссу</div><div class="wb-pc-rv d" id="wb-pc-rdmg">—</div></div>
    <div class="wb-pc-rr"><div class="wb-pc-ri">💥</div><div class="wb-pc-rl">Критов в рейде</div><div class="wb-pc-rv y" id="wb-pc-rct">—</div></div>
  </div>
</div></div>`;

    _bindBattle(root, s);
  }

  function _bindBattle(root, s) {
    const sc = window.WBHtml._scene;
    // log tabs
    root.querySelectorAll('.wb-blog-tab').forEach(t => t.addEventListener('click', () => {
      root.querySelectorAll('.wb-blog-tab').forEach(x=>x.classList.remove('on'));
      root.querySelectorAll('.wb-blog-p').forEach(x=>x.classList.remove('on'));
      t.classList.add('on');
      root.querySelector('#wb-log-'+t.dataset.blog)?.classList.add('on');
    }));
    // player card
    root.querySelectorAll('.wb-lav').forEach(av => av.addEventListener('click', e => {
      const pid = +av.dataset.pid; const top = s.top||[];
      if (top[pid]) _openCard(top[pid], s);
    }));
    document.getElementById('wb-pc-x')?.addEventListener('click', ()=>document.getElementById('wb-pcov')?.classList.remove('open'));
    document.getElementById('wb-pcov')?.addEventListener('click', e=>{ if(e.target===e.currentTarget) e.currentTarget.classList.remove('open'); });
    // action buttons
    root.addEventListener('click', e => {
      const el = e.target.closest('[data-act]'); if(!el) return;
      const act = el.dataset.act;
      if (act==='hit') _onHit(root, s, sc);
      else if (act==='res') sc?._resurrect?.(el.dataset.t);
      else if (act==='back') { window.WBHtml.close(); sc?.scene?.start?.('Menu',{returnTab:'more'}); }
      else if (act==='show-dmg') window.WBHtml.toast(`🗡 Твой урон: ${(s.player_state?.total_damage||0).toLocaleString('ru')}`);
      else if (act==='use-scroll') window.WBHtml._htmlScrollPicker?.(s, sc);
      else if (act==='show-boosts') window.WBHtml._htmlBoostShop?.(s, sc);
      else if (act==='wb-end-test') {
        get('/api/admin/wb_end').then(()=>{ window.WBHtml.toast('✅ Бой завершён'); setTimeout(()=>sc?._refresh?.(),800); }).catch(()=>window.WBHtml.toast('❌ Ошибка'));
      }
    });
  }

  let _atkIdx = 0;
  function _onHit(root, s, sc) {
    sc?._onHit?.();
    // visual feedback
    ['wb-flash','wb-wave'].forEach(id=>{const el=document.getElementById(id);if(el){el.classList.remove('on');void el.offsetWidth;el.classList.add('on');}});
    const bimg = document.getElementById('wb-bimg') || document.getElementById('wb-bem');
    if(bimg){bimg.classList.remove('wb-shake');void bimg.offsetWidth;bimg.classList.add('wb-shake');setTimeout(()=>bimg.classList.remove('wb-shake'),350);}
    const df = document.getElementById('wb-dfloat'); if(df){df.className='wb-dfloat';void df.offsetWidth;df.textContent='⚡ ударил';df.classList.add('show');}
  }

  function _openCard(p, s) {
    const hp = p.hp||p.current_hp||800, mhp = p.max_hp||1000;
    const pct = Math.round(Math.min(100,Math.max(0,(hp/mhp)*100)));
    document.getElementById('wb-pc-av').textContent = p.emoji||'⚔️';
    document.getElementById('wb-pc-n').textContent = p.name||'Игрок';
    document.getElementById('wb-pc-t').textContent = `Ур. ${p.level||'?'}`;
    document.getElementById('wb-pc-c').textContent = p.clan||'Без клана';
    document.getElementById('wb-pc-atk').textContent = (p.atk||0).toLocaleString('ru')||'—';
    document.getElementById('wb-pc-dmg').textContent = (p.damage||0).toLocaleString('ru');
    document.getElementById('wb-pc-con').textContent = (p.contribution||0)+'%';
    document.getElementById('wb-pc-hpv').textContent = `${hp} / ${mhp} HP`;
    document.getElementById('wb-pc-hpf').style.width = pct+'%';
    document.getElementById('wb-pc-rdmg').textContent = (p.damage||0).toLocaleString('ru');
    document.getElementById('wb-pc-rct').textContent = p.crits||'—';
    document.getElementById('wb-pcov')?.classList.add('open');
  }

  function updateHUD(state) {
    const a = state?.active; if(!a) return;
    const pct = a.max_hp>0 ? Math.round(a.current_hp/a.max_hp*100) : 0;
    const bar = document.getElementById('wb-boss-bar'); if(bar) bar.style.width = pct+'%';
    const nums = document.getElementById('wb-boss-nums');
    if(nums) nums.textContent = `${(a.current_hp||0).toLocaleString('ru')} / ${(a.max_hp||0).toLocaleString('ru')} · ${pct}%`;
    const timer = document.getElementById('wb-bl-timer'); if(timer) timer.textContent = `⏱ ${_fmtSec(a.seconds_left)}`;
    const ps = state.player_state;
    if(ps){
      const ppct = ps.max_hp>0?Math.round(ps.current_hp/ps.max_hp*100):0;
      const pb = document.getElementById('wb-pl-bar'); if(pb) pb.style.width=ppct+'%';
      const ph = document.getElementById('wb-pl-hp'); if(ph) ph.textContent=`${ps.current_hp}/${ps.max_hp} HP`;
    }
    const lc = document.getElementById('wb-live-cnt');
    if(lc) { const rc=Math.max(state.registrants_count||0,state.player_state?1:0); lc.innerHTML=`${rc} <span>игроков в рейде</span>`; }
  }

  function addHitLog(dmg, isCrit) {
    // Показываем цифру урона на экране
    const df = document.getElementById('wb-dfloat');
    if (df) {
      df.className = 'wb-dfloat' + (isCrit ? ' crit' : '');
      void df.offsetWidth;
      df.textContent = (isCrit ? '💥 ' : '⚔️ ') + dmg.toLocaleString('ru');
      df.classList.add('show');
    }
    // Добавляем в лог
    const line = document.createElement('div'); line.className='wb-ll';
    line.innerHTML = isCrit ? `💥 КРИТ! <span class="c">${dmg.toLocaleString('ru')}</span> урона!`
                            : `⚔️ <span class="d">${dmg.toLocaleString('ru')}</span> урона`;
    ['wb-log-mine','wb-log-world'].forEach(id=>{
      const p=document.getElementById(id); if(!p) return;
      p.querySelector('.wb-blog-empty')?.remove();
      const cl=line.cloneNode(true); p.appendChild(cl); p.scrollTop=p.scrollHeight;
    });
  }

  // Extend WBHtml
  Object.assign(window.WBHtml, { _renderBattle, updateHUD, addHitLog });
  // expose _scene setter alias
  Object.defineProperty(window.WBHtml, '_scene', {
    get(){ return window.WBHtml.__scene; }, set(v){ window.WBHtml.__scene=v; }, configurable:true
  });
})();
