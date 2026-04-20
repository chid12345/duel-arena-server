/* ============================================================
   Wardrobe HTML Overlay — CSS + render
   Vertical Cards: крупные карточки, 60% изображение, мифик fullwidth
   ============================================================ */
(() => {
const CSS = `
.wd-overlay{position:fixed;inset:0;z-index:9000;display:flex;align-items:flex-start;justify-content:center;background:rgba(0,0,0,.85);backdrop-filter:blur(6px)}
.wd-panel{width:100%;max-width:430px;height:100%;display:flex;flex-direction:column;background:rgba(8,4,20,.98);backdrop-filter:blur(18px);border-left:1px solid rgba(120,60,240,.2);border-right:1px solid rgba(120,60,240,.2);box-shadow:0 0 80px rgba(80,20,180,.12)}

/* Head */
.wd-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px;background:linear-gradient(180deg,rgba(70,15,150,.4) 0%,transparent 100%);border-bottom:1px solid rgba(120,60,240,.15);flex-shrink:0}
.wd-title{font-size:17px;font-weight:800;letter-spacing:.6px;background:linear-gradient(90deg,#c4b5fd,#f9a8d4,#c4b5fd);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.wd-close{width:32px;height:32px;border-radius:9px;background:rgba(220,50,80,.18);border:1px solid rgba(255,80,120,.35);color:#fca5a5;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
.wd-close:hover{background:rgba(220,50,80,.38)}

/* Tabs */
.wd-tabs{display:flex;gap:8px;padding:10px 14px 8px;flex-shrink:0}
.wd-tab{flex:1;position:relative;overflow:hidden;padding:10px 8px;border-radius:13px;cursor:pointer;font-size:13px;font-weight:700;text-align:center;border:1.5px solid transparent;transition:all .28s;color:#5b6478;background:rgba(255,255,255,.028);letter-spacing:.3px}
.wd-tab::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(100,35,210,.75),rgba(180,35,200,.55));opacity:0;transition:opacity .28s;border-radius:inherit}
.wd-tab.active{color:#fff;border-color:rgba(160,130,255,.55);box-shadow:0 0 18px rgba(130,80,255,.35),0 0 5px rgba(130,80,255,.18) inset}
.wd-tab.active::before{opacity:1}
.wd-tab span{position:relative;z-index:1}

/* Grid — flex column, каждая группа свой mini-grid */
.wd-grid{display:flex;flex-direction:column;gap:0;padding:6px 12px 60px;overflow-y:auto;flex:1;scrollbar-width:thin;scrollbar-color:rgba(130,80,255,.5) transparent}
.wd-grid::-webkit-scrollbar{width:3px;background:transparent}
.wd-grid::-webkit-scrollbar-thumb{background:linear-gradient(180deg,rgba(130,80,255,.75),rgba(160,110,255,.4),rgba(100,35,210,.65));border-radius:3px}
.wd-sep{font-size:9.5px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:rgba(255,255,255,.22);border-top:1px solid rgba(255,255,255,.07);padding-top:7px;margin-top:4px;margin-bottom:8px}
.wd-card-group{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:12px}

/* ── Card base ── */
.wd-card{position:relative;border-radius:18px;overflow:hidden;cursor:pointer;background:var(--cbg,rgba(10,6,24,.97));border:1.5px solid var(--rc,rgba(100,70,180,.35));box-shadow:0 6px 22px rgba(0,0,0,.4);transition:transform .22s,box-shadow .22s}
.wd-card:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(0,0,0,.55),0 0 24px var(--rg,rgba(120,70,220,.25))}
.wd-card.equipped{border-color:#22c55e!important;box-shadow:0 0 22px rgba(34,197,94,.38),0 0 8px rgba(34,197,94,.15) inset!important}

/* Rarity variables */
.wd-card.rarity-common{--rc:rgba(156,163,175,.4);--rg:rgba(156,163,175,.16);--cbg:rgba(10,8,22,.97);border-color:transparent!important}
.wd-card.rarity-rare{--rc:rgba(251,191,36,.5);--rg:rgba(251,191,36,.2);--cbg:rgba(10,8,4,.97);border-color:transparent!important}
.wd-card.rarity-epic{--rc:rgba(168,85,247,.58);--rg:rgba(168,85,247,.24);--cbg:rgba(14,6,34,.97);border-color:transparent!important}
.wd-card.rarity-mythic{--rc:rgba(249,115,22,.62);--rg:rgba(249,115,22,.28);--cbg:rgba(22,6,0,.98)}

/* Серебристый огонёк — обычная */
.wd-card.rarity-common::before{content:'';position:absolute;width:160%;aspect-ratio:1;top:50%;left:50%;translate:-50% -50%;background:conic-gradient(transparent 340deg,rgba(140,148,165,.3) 348deg,rgba(210,215,230,1) 356deg,rgba(240,242,248,.9) 359deg,transparent 360deg);animation:borderRun 4s linear infinite;z-index:0;pointer-events:none}
.wd-card.rarity-common::after{content:'';position:absolute;inset:2px;background:var(--cbg,rgba(10,8,22,.97));border-radius:16px;z-index:1;pointer-events:none}
.wd-card.rarity-common .wd-img-area,.wd-card.rarity-common .wd-card-body,.wd-card.rarity-common .wd-eq-badge{position:relative;z-index:2}

/* Золотой огонёк — редкая */
.wd-card.rarity-rare::before{content:'';position:absolute;width:160%;aspect-ratio:1;top:50%;left:50%;translate:-50% -50%;background:conic-gradient(transparent 340deg,rgba(180,130,0,.35) 348deg,rgba(251,191,36,1) 356deg,rgba(255,235,130,.9) 359deg,transparent 360deg);animation:borderRun 3.5s linear infinite;z-index:0;pointer-events:none}
.wd-card.rarity-rare::after{content:'';position:absolute;inset:2px;background:var(--cbg,rgba(10,8,4,.97));border-radius:16px;z-index:1;pointer-events:none}
.wd-card.rarity-rare .wd-img-area,.wd-card.rarity-rare .wd-card-body,.wd-card.rarity-rare .wd-eq-badge{position:relative;z-index:2}

/* Фиолетовый огонёк — эпическая */
.wd-card.rarity-epic::before{content:'';position:absolute;width:160%;aspect-ratio:1;top:50%;left:50%;translate:-50% -50%;background:conic-gradient(transparent 340deg,rgba(130,60,255,.35) 348deg,rgba(192,132,252,1) 356deg,rgba(240,200,255,.9) 359deg,transparent 360deg);animation:borderRun 3s linear infinite;z-index:0;pointer-events:none}
.wd-card.rarity-epic::after{content:'';position:absolute;inset:2px;background:var(--cbg,rgba(14,6,34,.97));border-radius:16px;z-index:1;pointer-events:none}
.wd-card.rarity-epic .wd-img-area,.wd-card.rarity-epic .wd-card-body,.wd-card.rarity-epic .wd-eq-badge{position:relative;z-index:2}

@keyframes borderRun{to{transform:rotate(360deg)}}

/* Mythic — стандартный размер как все карточки */

/* Equipped badge */
.wd-eq-badge{position:absolute;top:8px;left:8px;z-index:5;background:rgba(21,128,61,.85);border:1px solid rgba(34,197,94,.6);color:#86efac;font-size:9px;font-weight:800;padding:2px 7px;border-radius:6px;letter-spacing:.5px;backdrop-filter:blur(4px)}

/* ── Image area ── */
.wd-img-area{position:relative;width:100%;height:148px;overflow:hidden;flex-shrink:0;background:rgba(0,0,0,.0);display:flex;align-items:center;justify-content:center}
.wd-card-img{width:84%;height:84%;object-fit:contain;display:block;animation:breathe 4s ease-in-out infinite;position:relative;z-index:2}
.wd-card-img.mythic-crop{width:90%;height:90%}
/* gradient fade bottom of image into card body */
.wd-img-fade{position:absolute;bottom:0;left:0;right:0;height:40%;background:linear-gradient(transparent,var(--cbg,rgba(10,6,24,.97)));pointer-events:none;z-index:3}
/* мягкое радиальное свечение под броней */
.wd-img-area::before{content:'';position:absolute;bottom:5%;left:50%;translate:-50% 0;width:80%;height:60%;background:radial-gradient(ellipse at center,var(--rg,rgba(120,70,220,.25)),transparent 70%);filter:blur(14px);pointer-events:none;z-index:1}
/* дыхание предмета */
@keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
/* мифик — на всю ширину */
.wd-card.mythic-full{grid-column:1/-1}
.wd-card.mythic-full .wd-img-area{height:200px}
.wd-card.mythic-full .wd-card-body{align-items:center;text-align:center}
.wd-card.mythic-full .wd-name{font-size:16px}
.wd-card.mythic-full .wd-pills{justify-content:center}

/* Lava overlay for mythic */
.wd-lava-overlay{position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen;animation:lavaPulse 2.6s ease-in-out infinite;border-radius:inherit}
@keyframes lavaPulse{0%,100%{opacity:.65;background:radial-gradient(ellipse 75% 60% at 50% 65%,rgba(255,90,0,.14) 0%,transparent 70%)}50%{opacity:1;background:radial-gradient(ellipse 75% 60% at 50% 65%,rgba(255,130,0,.38) 0%,rgba(255,50,0,.12) 50%,transparent 72%);box-shadow:inset 0 0 28px rgba(255,80,0,.45)}}
/* neck mask for mythic crop */
.wd-neck-mask{position:absolute;top:0;left:0;right:0;height:36%;background:linear-gradient(180deg,var(--cbg,rgba(22,6,0,.98)) 0%,rgba(22,6,0,.85) 30%,transparent 100%);pointer-events:none}

/* ── Card body ── */
.wd-card-body{padding:6px 10px 8px;min-height:0}

/* Name */
.wd-name{font-size:14px;font-weight:900;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.2px;margin-bottom:2px}
.wd-name.epic{background:linear-gradient(90deg,#a5f3fc,#818cf8,#c084fc,#818cf8,#a5f3fc);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:epicText 3s linear infinite}
.wd-name.mythic{font-size:16px;font-weight:900;background:linear-gradient(90deg,#fdba74,#f97316,#fbbf24,#ef4444,#f97316,#fdba74);background-size:260% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:mythicText 2.6s linear infinite;filter:drop-shadow(0 0 5px rgba(249,115,22,.55))}
@keyframes epicText{0%{background-position:0% center}100%{background-position:200% center}}
@keyframes mythicText{0%{background-position:0% center}100%{background-position:260% center}}

/* Rarity line */
.wd-rarity-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:3px}
.wd-rarity-badge{font-size:7.5px;font-weight:800;letter-spacing:.9px;text-transform:uppercase;color:var(--rc,#aaa);opacity:.85}
.wd-stars{font-size:8px;color:var(--rc,#aaa)}

/* Pills */
.wd-pills{display:flex;gap:3px;flex-wrap:wrap;margin-bottom:3px;min-height:14px}
.wd-pill{padding:2px 6px;border-radius:6px;font-size:8px;font-weight:800;letter-spacing:.3px}
.p-s{background:rgba(136,34,34,.88);color:#fca5a5}.p-a{background:rgba(17,85,119,.88);color:#7dd3fc}.p-i{background:rgba(80,17,136,.88);color:#d8b4fe}.p-e{background:rgba(17,85,51,.88);color:#86efac}

/* ── Buttons ── */
.wd-btn{position:relative;overflow:hidden;width:100%;padding:6px 4px;border-radius:10px;font-size:10.5px;font-weight:800;cursor:pointer;border:1.5px solid transparent;text-align:center;transition:all .22s;letter-spacing:.4px;display:flex;align-items:center;justify-content:center;gap:5px}
.wd-btn::after{content:'';position:absolute;top:0;left:-100%;width:55%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);transform:skewX(-15deg)}
.wd-btn:hover::after,.wd-btn:active::after{animation:shimmer .4s ease forwards}
.wd-btn:active{transform:scale(.95)}
@keyframes shimmer{to{left:150%}}

.btn-free{background:linear-gradient(135deg,rgba(45,52,68,.4),rgba(60,68,85,.55));border-color:rgba(156,163,175,.35);color:#d1d5db}
.btn-eq{background:linear-gradient(135deg,rgba(16,90,45,.5),rgba(22,128,61,.65));border-color:rgba(34,197,94,.55);color:#86efac;animation:pulseEq 2.4s ease-in-out infinite}
@keyframes pulseEq{0%,100%{box-shadow:0 0 7px rgba(34,197,94,.2);border-color:rgba(34,197,94,.42)}50%{box-shadow:0 0 16px rgba(34,197,94,.55),0 0 4px rgba(34,197,94,.28) inset;border-color:rgba(34,197,94,.88)}}
.btn-uneq{background:linear-gradient(135deg,rgba(180,30,30,.4),rgba(220,38,38,.3));border-color:rgba(239,68,68,.5);color:#fca5a5}
/* Золото — постоянный шиммер */
.btn-gold{background:linear-gradient(135deg,#6b2e08,#92400e,#a16207);border-color:rgba(251,191,36,.6);color:#fde68a}
.btn-gold::after{animation:shimmer 2.2s ease-in-out infinite!important}
/* Алмазы — постоянный шиммер */
.btn-dia{background:linear-gradient(135deg,#4c1d95,#5b21b6,#7c3aed);border-color:rgba(167,139,250,.6);color:#ede9fe}
.btn-dia::after{animation:shimmer 2s ease-in-out infinite!important}

/* Mythic USDT button — fullwidth animated */
.btn-mythic{background:linear-gradient(135deg,#7c2d12,#c2410c,#d97706,#c2410c,#7c2d12);background-size:300% 100%;border-color:rgba(251,191,36,.7);color:#fff;font-weight:900;font-size:13px;text-shadow:0 1px 5px rgba(0,0,0,.65);animation:mythicFlow 2.6s linear infinite,mythicPulse 2.1s ease-in-out infinite;padding:12px 4px}
@keyframes mythicFlow{0%{background-position:100% 0}100%{background-position:-200% 0}}
@keyframes mythicPulse{0%,100%{box-shadow:0 0 10px rgba(249,115,22,.3)}50%{box-shadow:0 0 26px rgba(249,115,22,.8),0 0 10px rgba(251,191,36,.5)}}
.btn-mythic::after{content:'';position:absolute;top:0;left:-80%;width:45%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent);transform:skewX(-20deg);animation:mythicShine 2.6s ease-in-out infinite}
@keyframes mythicShine{0%{left:-80%}60%,100%{left:130%}}

/* Smoke above mythic button */
.wd-smoke-wrap{position:relative}
.wd-smoke{position:absolute;bottom:100%;left:0;right:0;height:30px;pointer-events:none;overflow:hidden}
.wd-smoke::before,.wd-smoke::after{content:'';position:absolute;bottom:0;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle,rgba(255,110,0,.55) 0%,transparent 70%);filter:blur(3px);animation:smokeUp 2.3s ease-out infinite}
.wd-smoke::before{left:28%}.wd-smoke::after{left:60%;animation-delay:1.15s;width:6px;height:6px}
@keyframes smokeUp{0%{transform:translateY(0) scaleX(1);opacity:.75}60%{transform:translateY(-18px) scaleX(1.9);opacity:.28}100%{transform:translateY(-30px) scaleX(2.6);opacity:0}}

/* Empty state */
.wd-empty{grid-column:1/-1;text-align:center;padding:50px 0;color:#4b5563;font-size:13px}

/* ── Modal ── */
.wd-modal-bg{position:absolute;inset:0;z-index:10;background:rgba(0,0,0,.8);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center}
.wd-modal{width:300px;border-radius:22px;padding:0 0 20px;background:rgba(8,4,20,.98);border:1.5px solid var(--mc,rgba(120,70,220,.55));box-shadow:0 0 50px var(--mg,rgba(120,70,220,.35)),0 24px 70px rgba(0,0,0,.75);position:relative;overflow:hidden;animation:mPop .22s cubic-bezier(.34,1.56,.64,1)}
@keyframes mPop{from{opacity:0;transform:scale(.86) translateY(12px)}to{opacity:1;transform:none}}
.wd-m-close{position:absolute;top:10px;right:12px;z-index:5;background:rgba(220,50,80,.22);border:1px solid rgba(255,80,120,.4);color:#fca5a5;font-size:13px;cursor:pointer;width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center}
.wd-m-img-wrap{position:relative;width:100%;height:160px;overflow:hidden}
.wd-m-img-wrap img{width:100%;height:100%;object-fit:cover;object-position:center top;display:block}
.wd-m-img-wrap img.mythic-crop{object-position:center 22%;transform:scale(1.65) translateY(7%);transform-origin:center center}
.wd-m-img-fade{position:absolute;bottom:0;left:0;right:0;height:60%;background:linear-gradient(transparent,rgba(8,4,20,.98));pointer-events:none}
.wd-m-img-wrap .wd-lava-overlay{border-radius:0}
.wd-m-img-wrap .wd-neck-mask{--cbg:rgba(8,4,20,.98)}
.wd-m-body{padding:12px 18px 0}
.wd-m-name{text-align:center;font-size:18px;font-weight:800;color:#f8fafc;margin-bottom:3px}
.wd-m-name.epic{background:linear-gradient(90deg,#a5f3fc,#818cf8,#c084fc,#818cf8,#a5f3fc);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:epicText 3s linear infinite}
.wd-m-name.mythic{font-size:20px;font-weight:900;background:linear-gradient(90deg,#fdba74,#f97316,#fbbf24,#ef4444,#f97316,#fdba74);background-size:260% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:mythicText 2.6s linear infinite;filter:drop-shadow(0 0 6px rgba(249,115,22,.55))}
.wd-m-rarity{text-align:center;font-size:10px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;margin-bottom:5px}
.wd-m-stars{text-align:center;font-size:12px;margin-bottom:10px}
.wd-m-div{height:1px;margin:10px 0;background:linear-gradient(90deg,transparent,var(--mc,rgba(120,70,220,.45)),transparent)}
.wd-m-pills{display:flex;justify-content:center;gap:7px;flex-wrap:wrap;margin-bottom:10px}
.wd-m-pill{padding:4px 11px;border-radius:8px;font-size:11px;font-weight:800}
.wd-m-bonus{font-size:12px;color:#c8a878;text-align:center;line-height:1.65;background:rgba(255,255,255,.04);border-radius:11px;padding:9px 13px;margin-bottom:14px;white-space:pre-wrap}
.wd-m-btn{width:100%;padding:12px;border-radius:13px;font-size:14px;font-weight:800;cursor:pointer;border:2px solid transparent;transition:all .22s;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;gap:6px}
.wd-m-btn::after{content:'';position:absolute;top:0;left:-100%;width:55%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent);transform:skewX(-15deg)}
.wd-m-btn:hover::after{animation:shimmer .5s ease forwards}
.mb-eq{background:linear-gradient(135deg,#166534,#15803d);border-color:rgba(34,197,94,.55);color:#fff;box-shadow:0 4px 18px rgba(21,128,61,.32)}
.mb-uneq{background:linear-gradient(135deg,#7f1d1d,#991b1b);border-color:rgba(239,68,68,.55);color:#fff}
.mb-free{background:linear-gradient(135deg,#1f2937,#374151);border-color:rgba(156,163,175,.35);color:#f9fafb}
.mb-gold{background:linear-gradient(135deg,#78350f,#92400e);border-color:rgba(251,191,36,.55);color:#fde68a}
.mb-dia{background:linear-gradient(135deg,#4c1d95,#5b21b6);border-color:rgba(167,139,250,.55);color:#ede9fe}
.mb-usdt{background:linear-gradient(135deg,#7c2d12,#c2410c,#d97706,#c2410c,#7c2d12);background-size:300% 100%;border-color:rgba(251,191,36,.7);color:#fff;font-weight:900;animation:mythicFlow 2.6s linear infinite,mythicPulse 2.1s ease-in-out infinite}
.mb-usdt::after{content:'';position:absolute;top:0;left:-80%;width:45%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent);transform:skewX(-20deg);animation:mythicShine 2.6s ease-in-out infinite}
`;

const RARITY_IMG   = { common:'armor_common.png', rare:'armor_gold.png', epic:'armor_epic.png', mythic:'armor_mythic.png' };
const RARITY_COLOR = { common:'#9ca3af', rare:'#60a5fa', epic:'#c084fc', mythic:'#fb923c' };
const RARITY_LABEL = { common:'Обычная', rare:'Редкая', epic:'Эпическая', mythic:'Мифическая' };

const ARMORS_DATA = [
  { id:'tank_free',     r:'common', name:'Кираса Гвардейца',   stars:'★☆☆☆', tier:'БЕСПЛ.',  str:5,agi:0,int:0,end:5, bonus:'Надёжная сталь для первых сражений.\nБроня: +2% к защите',          type:'free' },
  { id:'agile_free',    r:'common', name:'Доспех Рекрута',      stars:'★☆☆☆', tier:'БЕСПЛ.',  str:0,agi:5,int:2,end:0, bonus:'Надёжная сталь для первых сражений.\nУклонение: +2%',               type:'free' },
  { id:'crit_free',     r:'common', name:'Латы Пограничника',   stars:'★☆☆☆', tier:'БЕСПЛ.',  str:0,agi:0,int:6,end:5, bonus:'Надёжная сталь для первых сражений.\nКрит урон: +3%',               type:'free' },
  { id:'universal_free',r:'common', name:'Броня Ополченца',     stars:'★☆☆☆', tier:'БЕСПЛ.',  str:2,agi:2,int:2,end:2, bonus:'Надёжная сталь для первых сражений.\nМакс. HP: +1%',                type:'free' },
  { id:'berserker_gold',r:'rare',   name:'Панцирь Короля',      stars:'★★☆☆', tier:'ЗОЛОТО',  str:7,agi:0,int:0,end:7, bonus:'Выковано из чистейшего золота.\nУрон +4% при HP < 30%',            type:'gold',     price:'💰 5000' },
  { id:'assassin_gold', r:'rare',   name:'Золотой Оплот',       stars:'★★☆☆', tier:'ЗОЛОТО',  str:0,agi:7,int:0,end:0, bonus:'Выковано из чистейшего золота.\nДвойной удар: 4%',                 type:'gold',     price:'💰 5000' },
  { id:'mage_gold',     r:'rare',   name:'Латы Завоевателя',    stars:'★★☆☆', tier:'ЗОЛОТО',  str:0,agi:0,int:7,end:0, bonus:'Выковано из чистейшего золота.\nКрит урон: +4%',                   type:'gold',     price:'💰 5000' },
  { id:'paladin_gold',  r:'rare',   name:'Позолоченная Броня',  stars:'★★☆☆', tier:'ЗОЛОТО',  str:4,agi:0,int:4,end:4, bonus:'Выковано из чистейшего золота.\nВходящий урон: -3%',               type:'gold',     price:'💰 5000' },
  { id:'dragonknight',  r:'epic',   name:'Доспех Ледяного Духа',stars:'★★★☆', tier:'АЛМАЗЫ',  str:9,agi:0,int:5,end:9, bonus:'Кристаллы поглощают часть урона.\nУрон +6% при HP < 40%',         type:'diamonds', price:'💎 100' },
  { id:'shadowdancer',  r:'epic',   name:'Нагрудник Бездны',    stars:'★★★☆', tier:'АЛМАЗЫ',  str:0,agi:9,int:5,end:0, bonus:'Кристаллы поглощают часть урона.\nДвойной удар: 6%',               type:'diamonds', price:'💎 100' },
  { id:'archmage',      r:'epic',   name:'Латы Теневого Мага',  stars:'★★★☆', tier:'АЛМАЗЫ',  str:0,agi:0,int:9,end:6, bonus:'Кристаллы поглощают часть урона.\nКрит урон: +5%',                type:'diamonds', price:'💎 100' },
  { id:'legendary_usdt',r:'mythic', name:'Сердце Дракона',      stars:'★★★★', tier:'ЛЕГЕНДА', str:0,agi:0,int:0,end:0, bonus:'Чешуя, пропитанная яростью лавы.\n+19 свободных статов\nСброс сборки — 5.99 USDT', type:'usdt', price:'🔥 11.99 USDT' },
];

function _injectCSS() {
  if (document.getElementById('wd-style')) return;
  const s = document.createElement('style');
  s.id = 'wd-style'; s.textContent = CSS;
  document.head.appendChild(s);
}

function _pills(a) {
  let h = '';
  if (a.str > 0) h += `<span class="wd-pill p-s">С+${a.str}</span>`;
  if (a.agi > 0) h += `<span class="wd-pill p-a">Л+${a.agi}</span>`;
  if (a.int > 0) h += `<span class="wd-pill p-i">И+${a.int}</span>`;
  if (a.end > 0) h += `<span class="wd-pill p-e">В+${a.end}</span>`;
  return h || `<span style="color:#4b5563;font-size:8px">Особые статы</span>`;
}

function _imgAreaHtml(a) {
  const img = RARITY_IMG[a.r] || '';
  return `<div class="wd-img-area">
    <img src="${img}" class="wd-card-img" />
    <div class="wd-img-fade"></div>
  </div>`;
}

function _btnHtml(a) {
  if (a.equipped)
    return `<button class="wd-btn btn-uneq" data-act="unequip" data-id="${a.id}">✅ Снять броню</button>`;
  if (a.owned)
    return `<button class="wd-btn btn-eq" data-act="equip" data-id="${a.id}">⚔️ Надеть</button>`;
  if (a.type === 'free')
    return `<button class="wd-btn btn-free" data-act="buy" data-id="${a.id}">🆓 Выбрать бесплатно</button>`;
  if (a.type === 'gold')
    return `<button class="wd-btn btn-gold" data-act="buy" data-id="${a.id}">💰 Купить — ${a.price.replace('💰 ','')}</button>`;
  if (a.type === 'diamonds')
    return `<button class="wd-btn btn-dia" data-act="buy" data-id="${a.id}">💎 Купить — ${a.price.replace('💎 ','')}</button>`;
  // usdt/mythic
  return `<div class="wd-smoke-wrap"><div class="wd-smoke"></div><button class="wd-btn btn-mythic" data-act="buy_usdt" data-id="${a.id}">🔥 КУПИТЬ — ${a.price}</button></div>`;
}

function _cardHtml(a) {
  const nc  = a.r === 'epic' ? ' epic' : a.r === 'mythic' ? ' mythic' : '';
  const rc  = RARITY_COLOR[a.r] || '#aaa';
  const fullCls = '';
  const eqBadge = a.equipped ? '<div class="wd-eq-badge">✅ Надета</div>' : '';
  return `<div class="wd-card rarity-${a.r}${fullCls}${a.equipped?' equipped':''}" data-id="${a.id}">
    ${eqBadge}
    ${_imgAreaHtml(a)}
    <div class="wd-card-body">
      <div class="wd-name${nc}">${a.name}</div>
      <div class="wd-rarity-row">
        <span class="wd-rarity-badge" style="color:${rc}">${RARITY_LABEL[a.r]}</span>
        <span class="wd-stars" style="color:${rc}">${a.stars}</span>
      </div>
      <div class="wd-pills">${_pills(a)}</div>
      ${_btnHtml(a)}
    </div>
  </div>`;
}

function _buildGrid(items, view) {
  if (!items.length) return `<div class="wd-empty">Нет предметов</div>`;
  if (view === 'owned') {
    return `<div class="wd-card-group">${items.map(_cardHtml).join('')}</div>`;
  }
  const groups = [
    { key:'common',  label:'ОБЫЧНАЯ' },
    { key:'rare',    label:'РЕДКАЯ' },
    { key:'epic',    label:'ЭПИЧЕСКАЯ' },
    { key:'mythic',  label:'МИФИЧЕСКАЯ' },
  ];
  return groups.map(g => {
    const list = items.filter(a => a.r === g.key);
    if (!list.length) return '';
    return `<div class="wd-sep" style="color:${RARITY_COLOR[g.key]}">${g.label}</div><div class="wd-card-group">${list.map(_cardHtml).join('')}</div>`;
  }).join('');
}

window.WardrobeHTML = {
  ARMORS_DATA,
  _injectCSS,
  _buildGrid,
  _cardHtml,
  _imgAreaHtml,
  _pills,
  _btnHtml,
  RARITY_IMG,
  RARITY_COLOR,
  RARITY_LABEL,
};
})();
