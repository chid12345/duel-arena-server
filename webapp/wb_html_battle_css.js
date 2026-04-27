/* wb_html_battle_css.js — CSS экрана боя (киберпанк). Инжектируется один раз. */
window.WBBattleCSS = (() => {
  // Cache-busting: добавляется к URL картинок боссов и фонов.
  // Бампать при обновлении любого asset'а в bosses/ или bosses/bg/.
  const ASV = 'a10';
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
  background:linear-gradient(90deg,
    rgba(var(--theme-rgb),.5),
    var(--theme),
    rgba(var(--theme-rgb),.95));
  box-shadow:0 0 10px rgba(var(--theme-rgb),.5);transition:width .4s;}
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
/* ── ДИНАМИЧЕСКИЕ ТЕМЫ ПО ТИПУ БОССА ──
   Цвет UI (HP-бар, кнопки скиллов, ульта, искры) подстраивается
   под текущего босса через CSS-переменные --theme и --theme-rgb.
   Класс bt-{type} ставится на #wb-root в _renderBattle. */
#wb-root{--theme:#cc0055;--theme-rgb:204,0,85;}
#wb-root.bt-lich   {--theme:#9b30ff;--theme-rgb:155,48,255;}
#wb-root.bt-shadow {--theme:#22ddff;--theme-rgb:34,221,255;}
#wb-root.bt-fire   {--theme:#ff6600;--theme-rgb:255,102,0;}
#wb-root.bt-poison {--theme:#00ff00;--theme-rgb:0,255,0;}
#wb-root.bt-spider {--theme:#bf00ff;--theme-rgb:191,0,255;}
#wb-root.bt-lava   {--theme:#ff5520;--theme-rgb:255,85,32;}
#wb-root.bt-demon  {--theme:#ff2030;--theme-rgb:255,32,48;}

.wb-boss-zone{position:relative;flex:1;overflow:hidden;cursor:crosshair;
  min-height:380px;background:radial-gradient(ellipse 70% 55% at 50% 55%,rgba(0,191,255,.05) 0%,transparent 70%);}
/* Кастомные фоны под отдельных боссов. У остальных — старый радиальный градиент. */
.wb-boss-zone.bt-lich{
  background-image:url('bosses/bg/lich.png?v=${ASV}');
  background-size:cover;background-position:center bottom;background-color:#02000a;}
.wb-boss-zone.bt-lich::before{content:"";position:absolute;left:0;right:0;bottom:0;
  height:38%;pointer-events:none;z-index:1;
  background:linear-gradient(to top,
    rgba(40,8,70,.7) 0%, rgba(40,8,70,.35) 35%,
    rgba(40,8,70,.10) 70%, transparent 100%);}

/* Теневой Страж — пещера с бирюзовой молнией и фиолетовыми кристаллами */
.wb-boss-zone.bt-shadow{
  background-image:url('bosses/bg/shadow.png?v=${ASV}');
  background-size:cover;background-position:center bottom;background-color:#02000c;}
.wb-boss-zone.bt-shadow::before{content:"";position:absolute;left:0;right:0;bottom:0;
  height:42%;pointer-events:none;z-index:1;
  background:linear-gradient(to top,
    rgba(0,0,0,.85) 0%, rgba(15,5,35,.55) 35%,
    rgba(15,5,35,.15) 70%, transparent 100%);}

/* Кровавый Демон — храм с красным туманом и лучом света.
   Стоит ногами в тумане, тяжёлое дыхание, при атаке фон алой вспышки. */
.wb-boss-zone.bt-demon{
  background-image:url('bosses/bg/demon.png?v=${ASV}');
  background-size:cover;background-position:center bottom;background-color:#0a0000;
  /* Туман медленно «дышит» — пульсация яркости 4.4с (тяжелее) */
  animation:wb-demon-bg-breathe 4.4s ease-in-out infinite;}
@keyframes wb-demon-bg-breathe{
  0%,100%{filter:brightness(.92) saturate(1.05)}
  50%   {filter:brightness(1.10) saturate(1.2)}}
/* Красный туман у ног — снизу подсвечивает босса (как от тумана на фоне) */
.wb-boss-zone.bt-demon::before{content:"";position:absolute;left:0;right:0;bottom:0;
  height:42%;pointer-events:none;z-index:1;
  background:linear-gradient(to top,
    rgba(180,20,20,.55) 0%, rgba(140,10,10,.35) 30%,
    rgba(100,5,5,.15) 65%, transparent 100%);
  mix-blend-mode:screen;
  animation:wb-demon-fog-pulse 4.4s ease-in-out infinite;}
@keyframes wb-demon-fog-pulse{
  0%,100%{opacity:.85}
  50%   {opacity:1}}
/* Алая вспышка фона при атаке босса (.wb-flash-rage) — кратковременная заливка */
.wb-boss-zone.bt-demon.wb-flash-rage::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:9;
  background:radial-gradient(ellipse at center,rgba(255,40,40,.45) 0%,rgba(180,10,10,.2) 60%,transparent 100%);
  animation:wb-demon-rage-flash .35s ease-out forwards;}
@keyframes wb-demon-rage-flash{
  0%{opacity:0}
  20%{opacity:1}
  100%{opacity:0}}

/* Слой капель крови — стекают с меча/наплечников вниз в туман.
   Скрыт по умолчанию, активен только под .bt-demon */
.wb-demon-blood{position:absolute;inset:0;pointer-events:none;z-index:6;overflow:hidden;display:none;}
.wb-boss-zone.bt-demon .wb-demon-blood{display:block;}
.wb-demon-blood .drop{position:absolute;width:3px;height:10px;border-radius:50% 50% 50% 50% / 30% 30% 70% 70%;
  background:linear-gradient(180deg, rgba(220,30,30,.95), rgba(140,5,5,.9));
  box-shadow:0 0 5px rgba(220,30,30,.6);
  animation:wb-demon-drip 4.5s ease-in infinite;}
.wb-demon-blood .drop.b1{left:38%;top:38%;animation-delay:.0s}
.wb-demon-blood .drop.b2{left:42%;top:42%;animation-delay:1.2s;animation-duration:5s}
.wb-demon-blood .drop.b3{left:58%;top:36%;animation-delay:.6s;animation-duration:4.2s}
.wb-demon-blood .drop.b4{left:62%;top:40%;animation-delay:2.0s;animation-duration:5.3s}
.wb-demon-blood .drop.b5{left:46%;top:48%;animation-delay:3.0s;animation-duration:4.7s}
.wb-demon-blood .drop.b6{left:54%;top:44%;animation-delay:1.6s;animation-duration:5.2s}
@keyframes wb-demon-drip{
  0%{transform:translateY(0) scaleY(1);opacity:0}
  10%{opacity:.95}
  85%{opacity:.85}
  100%{transform:translateY(420px) scaleY(1.6);opacity:0}}

/* Лавовый Титан — лавовый водопад в каньоне.
   Rim light: за спиной босса яркий свет, ему нужно сильное оранжевое
   контурное свечение. Heat haze глобально — горячий воздух плавает. */
.wb-boss-zone.bt-lava{
  background-image:url('bosses/bg/lava.png?v=${ASV}');
  background-size:cover;background-position:center bottom;background-color:#1a0500;
  /* Лавовый водопад мерцает яркостью — медленнее, более «текучий» */
  animation:wb-lava-bg-flicker 3.2s ease-in-out infinite;}
@keyframes wb-lava-bg-flicker{
  0%,100%{filter:brightness(.95) saturate(1.05) hue-rotate(0deg)}
  35%   {filter:brightness(1.15) saturate(1.2)  hue-rotate(-3deg)}
  60%   {filter:brightness(.92) saturate(1.1)  hue-rotate(2deg)}}
/* Тёмный туман с оранжевым отблеском у пола */
.wb-boss-zone.bt-lava::before{content:"";position:absolute;left:0;right:0;bottom:0;
  height:34%;pointer-events:none;z-index:1;
  background:linear-gradient(to top,
    rgba(40,5,0,.85) 0%, rgba(80,15,0,.5) 30%,
    rgba(80,15,0,.15) 65%, transparent 100%);}
/* Heat haze — глобальное дрожание горячего воздуха поверх ВСЕЙ сцены.
   Слабое skew + смещение, маска снизу вверх для растворения края. */
.wb-boss-zone.bt-lava::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:8;
  backdrop-filter:blur(.7px);
  -webkit-backdrop-filter:blur(.7px);
  -webkit-mask-image:linear-gradient(to top, black 0%, black 70%, transparent 100%);
  mask-image:linear-gradient(to top, black 0%, black 70%, transparent 100%);
  animation:wb-lava-haze 4s ease-in-out infinite;}
@keyframes wb-lava-haze{
  0%,100%{transform:translate(0,0) skewX(0)}
  25%   {transform:translate(-2px,1px) skewX(.5deg)}
  50%   {transform:translate(1.5px,-1px) skewX(-.4deg)}
  75%   {transform:translate(-1px,1px) skewX(.3deg)}}

/* Древний Страж — улей с фиолетовыми коконами. Bio-luminescence:
   фон медленно «дышит» зумом + коконы пульсируют синхронно с боссом. */
.wb-boss-zone.bt-spider{
  background-image:url('bosses/bg/spider.png?v=${ASV}');
  background-size:cover;background-position:center bottom;background-color:#08020c;
  /* Медленный зум 1-2% — органическое дыхание улья */
  animation:wb-spider-bg-breathe 6s ease-in-out infinite;}
@keyframes wb-spider-bg-breathe{
  0%,100%{background-size:100% auto;filter:brightness(.92) saturate(1.05)}
  50%   {background-size:103% auto;filter:brightness(1.08) saturate(1.2)}}
/* Тёмный туман с фиолетовым отливом — органические вены на полу */
.wb-boss-zone.bt-spider::before{content:"";position:absolute;left:0;right:0;bottom:0;
  height:36%;pointer-events:none;z-index:1;
  background:linear-gradient(to top,
    rgba(15,0,30,.85) 0%, rgba(40,5,60,.5) 35%,
    rgba(40,5,60,.15) 70%, transparent 100%);}
/* Слой слизи — фиолетовые капли падают сверху, перед боссом (z-index: 7).
   По умолчанию скрыт — показывается только под .bt-spider */
.wb-spider-slime{position:absolute;inset:0;pointer-events:none;z-index:7;overflow:hidden;display:none;}
.wb-boss-zone.bt-spider .wb-spider-slime{display:block;}
.wb-spider-slime .drip{position:absolute;top:-20px;width:3px;height:14px;border-radius:50% 50% 50% 50% / 30% 30% 70% 70%;
  background:linear-gradient(180deg, rgba(180,40,255,.8), rgba(120,20,200,.95));
  box-shadow:0 0 6px rgba(191,0,255,.6);
  animation:wb-spider-drip 5s linear infinite;}
.wb-spider-slime .drip.s1{left:12%;animation-delay:.0s}
.wb-spider-slime .drip.s2{left:28%;animation-delay:1.5s;animation-duration:6s}
.wb-spider-slime .drip.s3{left:46%;animation-delay:.7s;animation-duration:4.5s}
.wb-spider-slime .drip.s4{left:64%;animation-delay:2.2s;animation-duration:5.5s}
.wb-spider-slime .drip.s5{left:82%;animation-delay:1.0s;animation-duration:6.5s}
.wb-spider-slime .drip.s6{left:38%;animation-delay:3.5s;animation-duration:5s}
.wb-spider-slime .drip.s7{left:72%;animation-delay:4.2s;animation-duration:5.8s}
.wb-spider-slime .drip.s8{left:18%;animation-delay:3.0s;animation-duration:6.2s}
@keyframes wb-spider-drip{
  0%{transform:translateY(0) scaleY(1);opacity:0}
  10%{opacity:.95}
  85%{opacity:.7}
  100%{transform:translateY(800px) scaleY(1.4);opacity:0}}

/* Каменный Голем — алтарь с зелёным кристаллом-резонатором.
   Кристалл за боссом «дышит» в такт с боссом — эффект резонанса. */
.wb-boss-zone.bt-poison{
  background-image:url('bosses/bg/poison.png?v=${ASV}');
  background-size:cover;background-position:center bottom;background-color:#020a05;
  animation:wb-poison-bg-pulse 3.6s ease-in-out infinite;}
@keyframes wb-poison-bg-pulse{
  0%,100%{filter:brightness(.95) saturate(1.05)}
  50%   {filter:brightness(1.12) saturate(1.25)}}
/* Тёмный туман у пола — алтарь и ноги растворяются в тенях */
.wb-boss-zone.bt-poison::before{content:"";position:absolute;left:0;right:0;bottom:0;
  height:38%;pointer-events:none;z-index:1;
  background:linear-gradient(to top,
    rgba(0,0,0,.85) 0%, rgba(5,25,12,.55) 35%,
    rgba(5,25,12,.15) 70%, transparent 100%);}
/* Густая контактная тень под ногами голема — он «прилипает» к полу */
.wb-boss-zone.bt-poison::after{content:"";position:absolute;left:50%;bottom:7%;
  transform:translateX(-50%);width:42%;height:20px;pointer-events:none;z-index:1;
  background:radial-gradient(ellipse 50% 50% at 50% 50%,
    rgba(0,0,0,.95) 0%, rgba(0,0,0,.55) 45%, transparent 80%);
  filter:blur(7px);
  animation:wb-poison-shadow-breathe 3.6s ease-in-out infinite;}
@keyframes wb-poison-shadow-breathe{
  0%,100%{transform:translateX(-50%) scale(1)  }
  50%   {transform:translateX(-50%) scale(.93)}}

/* Огненный Колосс — крепость в лаве, ноги в потоке расплавленного металла */
.wb-boss-zone.bt-fire{
  background-image:url('bosses/bg/fire.png?v=${ASV}');
  background-size:cover;background-position:center bottom;background-color:#1a0500;
  /* Лёгкое «дыхание» фона: он слегка темнеет в такт с пульсом ядра босса.
     Затемнение акцентирует раскалённое ядро в груди. */
  animation:wb-fire-bg-pulse 2.6s ease-in-out infinite;}
@keyframes wb-fire-bg-pulse{
  0%,100%{filter:brightness(1.0)   saturate(1.05)}
  50%   {filter:brightness(.78)    saturate(1.15)}}
/* Лава у ног — оранжевый туман-свечение, ступни тонут в потоке. */
.wb-boss-zone.bt-fire::before{content:"";position:absolute;left:0;right:0;bottom:0;
  height:46%;pointer-events:none;z-index:1;
  background:linear-gradient(to top,
    rgba(255,90,0,.45) 0%, rgba(220,60,0,.25) 35%,
    rgba(180,40,0,.10) 70%, transparent 100%);
  mix-blend-mode:screen;}
/* Heat haze — лёгкое дрожание воздуха над лавой через wavy mask.
   Маска снизу→вверх растворяет границу blur'а, иначе виден прямоугольный
   stop там где заканчивается ::after. */
.wb-boss-zone.bt-fire::after{content:"";position:absolute;left:0;right:0;bottom:0;
  height:55%;pointer-events:none;z-index:3;
  backdrop-filter:blur(.6px);
  -webkit-backdrop-filter:blur(.6px);
  -webkit-mask-image:linear-gradient(to top, black 0%, black 60%, transparent 100%);
  mask-image:linear-gradient(to top, black 0%, black 60%, transparent 100%);
  animation:wb-fire-haze 5s ease-in-out infinite;}
@keyframes wb-fire-haze{
  0%,100%{transform:translateX(0) skewX(0)}
  25%   {transform:translateX(-1.5px) skewX(.4deg)}
  75%   {transform:translateX(1.5px) skewX(-.4deg)}}
.wb-bimg2{position:absolute;left:50%;top:50%;
  --boss-glow:#9b30ff;
  transform:translate(-50%,-52%);
  width:300px;height:300px;object-fit:contain;
  pointer-events:none;z-index:2;
  /* СТРОГО:
     - background:none !important + border:none — никаких фоновых блоков
     - filter:drop-shadow на самом img (не box-shadow на контейнере)
     - mask-image на img: transparent 0%, black 20%
     - Тугое 5px свечение — не заполняет промежутки между ног/рук → нет квадрата */
  background:none !important;border:none;
  -webkit-mask-image:linear-gradient(to top, transparent 0%, black 20%);
  mask-image:linear-gradient(to top, transparent 0%, black 20%);
  filter:drop-shadow(0 0 5px var(--boss-glow));
  animation:wb-bfloat 3.2s ease-in-out infinite;}
/* Лич — использует глобальную маску ног. Цвет свечения по умолчанию #9b30ff. */

/* Кровавый Демон: стоит ногами в тумане, мощное красное свечение,
   тяжёлое медленное дыхание. При атаке — алая вспышка фона. */
.wb-boss-zone.bt-demon .wb-bimg2{
  --boss-glow:#ff2030;
  /* Анкер к полу: Мясник стоит ногами в тумане */
  top:auto;bottom:-2%;
  transform:translateX(-50%);
  transform-origin:50% 100%;
  width:auto;height:72%;
  /* Только scale-дыхание, свечение — статичное 15px на базе */
  animation:wb-demon-stand 4.4s ease-in-out infinite;}
@keyframes wb-demon-stand{
  0%,100%{transform:translateX(-50%) scale(1)}
  50%   {transform:translateX(-50%) scale(1.03)}}

/* Лавовый Титан: rim light от водопада сзади + медленное дыхание.
   ВАЖНО: лавовый стоит ногами на полу — НЕ парит.
   Привязка к bottom + transform-origin внизу + анимация только scale. */
.wb-boss-zone.bt-lava .wb-bimg2{
  --boss-glow:#ff5520;
  /* Анкер к полу: top:auto + bottom + transform-origin внизу */
  top:auto;bottom:-2%;
  transform:translateX(-50%);
  transform-origin:50% 100%;
  width:auto;height:74%;
  /* Только scale-дыхание, без translateY — ноги на месте.
     Свечение — статичное 15px на .wb-bimg2 базе. */
  animation:wb-lava-stand 4.2s ease-in-out infinite;}
@keyframes wb-lava-stand{
  0%,100%{transform:translateX(-50%) scale(1)}
  50%   {transform:translateX(-50%) scale(1.025)}}

/* Древний Страж: фиолетовый через --boss-glow + микро-вибрация лап */
.wb-boss-zone.bt-spider .wb-bimg2{
  --boss-glow:#bf00ff;
  animation:wb-bfloat 3.2s ease-in-out infinite,
            wb-spider-vibrate .14s linear infinite;}
/* Микро-вибрация конечностей — лёгкое дрожание ±0.5px очень быстро */
@keyframes wb-spider-vibrate{
  0%  {margin-left:0; margin-top:0}
  25% {margin-left:.5px; margin-top:-.4px}
  50% {margin-left:-.4px; margin-top:.4px}
  75% {margin-left:.4px; margin-top:.4px}
  100%{margin-left:-.5px; margin-top:-.4px}}

/* Каменный Голем: чистый зелёный через --boss-glow */
.wb-boss-zone.bt-poison .wb-bimg2{
  --boss-glow:#00ff00;
  animation:wb-bfloat 3.6s ease-in-out infinite;}

/* Огненный Колосс: оранжевое свечение через --boss-glow */
.wb-boss-zone.bt-fire .wb-bimg2{
  --boss-glow:#ff6600;
  animation:wb-bfloat 3.2s ease-in-out infinite;}
/* Контактная тень-лужа лавы под ногами */
.wb-boss-zone.bt-fire .wb-bimg2 + .wb-fire-puddle,
.wb-boss-zone.bt-fire::after{}

/* Теневой Страж: бирюзовое свечение через --boss-glow + рывок 4.5с */
.wb-boss-zone.bt-shadow .wb-bimg2{
  --boss-glow:#22ddff;
  animation:wb-bfloat 3.2s ease-in-out infinite,
            wb-bjerk-shadow 4.5s ease-in-out infinite;}
/* Контактная густая чёрная тень под лапами теневого волка */
.wb-boss-zone.bt-shadow::after{content:"";position:absolute;left:50%;bottom:8%;
  transform:translateX(-50%);width:42%;height:18px;pointer-events:none;z-index:1;
  background:radial-gradient(ellipse 50% 50% at 50% 50%,
    rgba(0,0,0,.95) 0%, rgba(0,0,0,.55) 45%, transparent 80%);
  filter:blur(6px);
  animation:wb-shadow-breathe 3.2s ease-in-out infinite;}
@keyframes wb-shadow-breathe{
  0%,100%{transform:translateX(-50%) scale(1)}
  50%   {transform:translateX(-50%) scale(.92)}}
/* Рывок: лёгкий вперёд-назад, 1 раз за цикл (на 60–66%) */
@keyframes wb-bjerk-shadow{
  0%,55%,72%,100%{transform:translate(-50%,-52%) scale(1)}
  60%{transform:translate(calc(-50% + 7px),-52%) scale(1.04)}
  66%{transform:translate(calc(-50% - 4px),-52%) scale(1)}}

/* Усиленная тряска для огненного типа — более «тяжёлая» при атаке */
.wb-boss-zone.bt-fire.wb-shake,
#wb-root.wb-shake .wb-boss-zone.bt-fire{
  animation:wb-fire-quake .55s ease-out;}
@keyframes wb-fire-quake{
  0%,100%{transform:translate(0,0)}
  10%{transform:translate(-3px,2px)}
  25%{transform:translate(4px,-3px)}
  40%{transform:translate(-3px,-2px)}
  55%{transform:translate(2px,3px)}
  70%{transform:translate(-2px,1px)}
  85%{transform:translate(2px,-1px)}}

/* Дополнительные искры для огненного — много мелких частиц снизу вверх.
   Включается через ::before на отдельном слое .wb-fire-sparks. */
.wb-boss-zone.bt-fire .wb-ghost{
  /* Перекрашиваем эмодзи-духов в оранжевые искры */
  filter:hue-rotate(-50deg) saturate(2) brightness(1.3);
  color:#ffaa44;}
@keyframes wb-bfloat{
  0%,100%{transform:translate(-50%,-52%) scale(1) rotate(0deg)}
  30%{transform:translate(-50%,-55%) scale(1.02) rotate(.4deg)}
  60%{transform:translate(-50%,-50%) scale(1.03) rotate(-.3deg)}}
@keyframes wb-boss-glow{
  0%,100%{filter:drop-shadow(0 0 14px var(--boss-glow)) brightness(1)}
  50%   {filter:drop-shadow(0 0 24px var(--boss-glow)) brightness(1.08)}}
.wb-bimg2.wb-hit{animation:wb-bhit .18s ease forwards,wb-bfloat 3.2s ease-in-out infinite .18s,wb-boss-glow 2s ease-in-out infinite .18s;}
@keyframes wb-bhit{0%{filter:brightness(1) drop-shadow(0 0 12px var(--boss-glow))}
  40%{filter:brightness(4) saturate(0) drop-shadow(0 0 40px #fff)}
  100%{filter:brightness(1) drop-shadow(0 0 12px var(--boss-glow))}}
.wb-bem2{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
  font-size:140px;animation:wb-bfloat 3s ease-in-out infinite;pointer-events:none;
  filter:drop-shadow(0 0 24px rgba(0,191,255,.5));}
.wb-rage2{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .3s;}
.wb-rage2.on,.wb-rage2.rage{opacity:1;animation:wb-rage 0.5s ease-in-out infinite;}@keyframes wb-rage{0%,100%{box-shadow:inset 0 0 40px rgba(255,0,85,.35)}50%{box-shadow:inset 0 0 80px rgba(255,0,85,.7)}}
.wb-flash{animation:wb-flash .8s ease forwards;}@keyframes wb-flash{0%{background-color:transparent}20%{background-color:rgba(255,68,0,.25)}100%{background-color:transparent}}
.wb-hp2-segs{position:absolute;inset:0;display:flex;gap:0;align-items:center;padding:0 1px;pointer-events:none}.wb-hp2-segs>i{flex:1;height:60%;border-right:1px solid rgba(0,0,0,.5)}.wb-hp2-segs>i:last-child{border:none}
/* Зелёные точки удара (.wb-wp) скрыты — отвлекали от босса.
   Клик-зона работает через data-act="hit" на всей .wb-boss-zone. */
.wb-wp{display:none;}
.wb-ghost{position:absolute;width:28px;height:28px;border-radius:50%;
  background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid rgba(0,191,255,.3);
  display:flex;align-items:center;justify-content:center;font-size:14px;
  opacity:0;animation:wb-gh 4s ease-in-out infinite;pointer-events:none;}
@keyframes wb-gh{0%{opacity:0;transform:translateY(20px) translateX(0)}20%{opacity:.4}80%{opacity:.3}100%{opacity:0;transform:translateY(-30px) translateX(20px)}}
/* Цифры урона: чёткие (обводка вместо размытой тени), держатся 1.6с */
.wb-dmg-num{position:absolute;font-family:'Impact','Arial Black',sans-serif;font-weight:900;
  pointer-events:none;z-index:20;white-space:nowrap;letter-spacing:.5px;
  -webkit-text-stroke:1.5px rgba(0,0,0,.85);
  text-shadow:0 0 4px currentColor, 0 2px 4px rgba(0,0,0,.85);
  animation:wb-dmgfly2 1.6s cubic-bezier(.2,.7,.3,1) forwards;}
.wb-dmg-num.crit{-webkit-text-stroke:2px rgba(64,32,0,.9);
  text-shadow:0 0 6px #ffcc00, 0 0 14px #ff8800, 0 2px 4px rgba(0,0,0,.85);}
@keyframes wb-dmgfly2{
  0%  {opacity:0;transform:translateX(-50%) translateY(8px)   scale(.6) }
  10% {opacity:1;transform:translateX(-50%) translateY(-6px)  scale(1.15)}
  25% {opacity:1;transform:translateX(-50%) translateY(-16px) scale(1)   }
  75% {opacity:1;transform:translateX(-50%) translateY(-44px) scale(.95) }
  100%{opacity:0;transform:translateX(-50%) translateY(-72px) scale(.85) }}
/* Лёгкое мгновенное «эхо» при тапе — пока сервер не ответил */
.wb-tap-echo{position:absolute;width:34px;height:34px;border-radius:50%;
  border:2px solid var(--theme,#fff);
  pointer-events:none;z-index:18;
  transform:translate(-50%,-50%);
  animation:wb-tap-echo .5s ease-out forwards;}
@keyframes wb-tap-echo{
  0%  {opacity:.85;transform:translate(-50%,-50%) scale(.6)}
  100%{opacity:0;transform:translate(-50%,-50%) scale(2.2)}}
.wb-tap-hint{position:absolute;bottom:10px;left:50%;transform:translateX(-50%);
  font-size:9px;color:rgba(255,255,255,.3);letter-spacing:2px;text-transform:uppercase;
  pointer-events:none;white-space:nowrap;
  animation:wb-hint 2s ease-in-out infinite;}
@keyframes wb-hint{0%,100%{opacity:.25}50%{opacity:.7}}

/* ── Мёртв ── */
.wb-dead{margin:12px 14px;padding:16px;border-radius:14px;text-align:center;
  background:rgba(30,0,0,.6);border:1px solid rgba(255,40,40,.3);transition:padding .25s,margin .25s;}
.wb-dead .wb-dead-mini{display:none;}
.wb-dead.compact{padding:8px 12px;margin:6px 14px;cursor:pointer;
  background:rgba(40,10,10,.7);border-color:rgba(255,80,80,.4);}
.wb-dead.compact .wb-dead-full{display:none;}
.wb-dead.compact .wb-dead-mini{display:block;font-size:11px;font-weight:700;
  color:#ff8888;letter-spacing:.5px;}
.wb-dead.compact .wb-dead-mini:active{transform:scale(.97);}
.wb-dead-t{font-size:18px;font-weight:900;color:#ff4444;margin-bottom:6px;}
.wb-res-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px;}
.wb-res-b{padding:8px 4px;border-radius:10px;cursor:pointer;text-align:center;
  background:rgba(255,200,0,.07);border:1px solid rgba(255,200,0,.25);font-size:10px;line-height:1.5;}
.wb-res-b:active{transform:scale(.96);}
.ri{display:block;font-size:18px;margin-bottom:2px;}

/* ── Player HP ── */
.wb-plhp{display:flex;align-items:center;gap:8px;padding:4px 14px 2px;flex-shrink:0;}
.wb-plhp-i{font-size:12px}.wb-plhp-v{font-size:10px;font-family:'Courier New',monospace;color:#00BFFF;font-weight:700;white-space:nowrap;}
.wb-plhp-tr{flex:1;height:6px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden;border:1px solid rgba(0,191,255,.2);}.wb-plhp-f{height:100%;background:linear-gradient(90deg,#0033ff,#00BFFF);border-radius:3px;transition:width .3s;box-shadow:0 0 6px rgba(0,191,255,.5);}

/* ── Ульта ── */
.wb-ultra{display:flex;align-items:center;gap:8px;padding:6px 14px;
  background:rgba(255,255,255,.03);border-top:1px solid rgba(255,255,255,.06);flex-shrink:0;}
.wb-ultra-lbl{font-size:8px;letter-spacing:1.5px;color:rgba(255,255,255,.35);white-space:nowrap;text-transform:uppercase;}
.wb-ultra-track{flex:1;height:5px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden;}
.wb-ultra-fill{height:100%;width:0%;
  background:linear-gradient(90deg,#00BFFF,var(--theme,#BF00FF));
  border-radius:3px;box-shadow:0 0 5px var(--theme,#00BFFF);transition:width .3s;}
.wb-ultra-btn{padding:5px 11px;border-radius:7px;font-size:9px;font-weight:700;letter-spacing:.8px;
  cursor:not-allowed;border:1px solid rgba(var(--theme-rgb,191,0,255),.3);color:rgba(255,255,255,.4);
  background:rgba(var(--theme-rgb,191,0,255),.1);white-space:nowrap;transition:all .2s;}
.wb-ultra-btn.ready{color:#fff;border-color:var(--theme,#BF00FF);cursor:pointer;
  box-shadow:0 0 10px var(--theme,#BF00FF);animation:wb-up .8s ease-in-out infinite;}
@keyframes wb-up{0%,100%{box-shadow:0 0 10px var(--theme,#BF00FF)}50%{box-shadow:0 0 22px var(--theme,#BF00FF),0 0 35px var(--theme,#BF00FF)}}
.wb-ultra-btn:active.ready{transform:scale(.96);}

/* ── Кнопки скиллов ── */
.wb-skills{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;
  padding:6px 10px 10px;background:linear-gradient(0deg,rgba(5,5,8,.98) 0%,rgba(5,5,8,.85) 100%);
  border-top:1px solid rgba(255,255,255,.08);flex-shrink:0;}
.wb-skill{aspect-ratio:1;border-radius:10px;padding:8px 4px 7px;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:4px;cursor:pointer;position:relative;overflow:hidden;
  background:rgba(255,255,255,.04);border:1.5px solid rgba(255,255,255,.1);
  transition:all .12s;-webkit-tap-highlight-color:transparent;}
.wb-skill.atk .ws-icon{color:var(--theme,#FF0055);filter:drop-shadow(0 0 4px var(--theme,#FF0055))}.wb-skill.shld .ws-icon{color:#00BFFF;filter:drop-shadow(0 0 4px #00BFFF)}.wb-skill.ult .ws-icon{color:var(--theme,#BF00FF);filter:drop-shadow(0 0 4px var(--theme,#BF00FF))}.wb-skill.auto .ws-icon{color:#00FF9F;filter:drop-shadow(0 0 4px #00FF9F)}
.wb-skill:active:not(.cd){transform:scale(.93);}
/* АТАКА и УЛЬТА — цвет босса. ЩИТ синий (защита), АВТО зелёный (премиум) */
.wb-skill.atk{border-color:rgba(var(--theme-rgb,255,0,85),.55);box-shadow:0 0 10px rgba(var(--theme-rgb,255,0,85),.2),inset 0 0 8px rgba(var(--theme-rgb,255,0,85),.05);}
.wb-skill.shld{border-color:rgba(0,191,255,.55);box-shadow:0 0 10px rgba(0,191,255,.2),inset 0 0 8px rgba(0,191,255,.05);}
.wb-skill.ult{border-color:rgba(var(--theme-rgb,191,0,255),.6);animation:wb-ug 2s ease-in-out infinite;}
@keyframes wb-ug{0%,100%{box-shadow:0 0 8px rgba(var(--theme-rgb,191,0,255),.2)}50%{box-shadow:0 0 20px rgba(var(--theme-rgb,191,0,255),.5),0 0 35px rgba(var(--theme-rgb,191,0,255),.2)}}
.wb-skill.auto{border-color:rgba(0,255,159,.55);box-shadow:0 0 10px rgba(0,255,159,.2),inset 0 0 8px rgba(0,255,159,.05);}
/* АВТО включено — яркая зелёная подсветка чтобы было однозначно видно */
.wb-skill.auto.auto-on{
  border-color:#00FF9F;border-width:2.5px;
  box-shadow:0 0 22px rgba(0,255,159,.7),0 0 40px rgba(0,255,159,.35),inset 0 0 14px rgba(0,255,159,.15);
  background:linear-gradient(135deg,rgba(0,255,159,.18),rgba(0,200,130,.12));
  animation:wb-auto-on-pulse 1.2s ease-in-out infinite;
}
.wb-skill.auto.auto-on .ws-icon{filter:drop-shadow(0 0 10px #00FF9F)!important;animation:wb-auto-icon 1.2s ease-in-out infinite;}
.wb-skill.auto.auto-on .ws-name{color:#00FF9F!important;text-shadow:0 0 8px #00FF9F;}
.wb-skill.auto.auto-on .ws-name::after{content:' ✓';font-weight:900;}
@keyframes wb-auto-on-pulse{
  0%,100%{box-shadow:0 0 18px rgba(0,255,159,.6),0 0 32px rgba(0,255,159,.25),inset 0 0 12px rgba(0,255,159,.12);}
  50%{box-shadow:0 0 28px rgba(0,255,159,.95),0 0 50px rgba(0,255,159,.5),inset 0 0 20px rgba(0,255,159,.25);}}
@keyframes wb-auto-icon{
  0%,100%{transform:rotate(0deg) scale(1);}
  50%{transform:rotate(8deg) scale(1.08);}}
/* Визуальный feedback когда AUTO выпускает скилл — яркая вспышка */
.wb-skill.firing{animation:wb-skill-fire .6s ease-out;z-index:10;}
@keyframes wb-skill-fire{
  0%{transform:scale(1);box-shadow:0 0 10px currentColor;}
  20%{transform:scale(1.25);box-shadow:0 0 40px currentColor,0 0 70px currentColor,inset 0 0 20px rgba(255,255,255,.55);}
  60%{transform:scale(1.1);box-shadow:0 0 32px currentColor,0 0 56px currentColor,inset 0 0 16px rgba(255,255,255,.35);}
  100%{transform:scale(1);box-shadow:0 0 10px currentColor;}}
.wb-skill.atk.firing{color:#FF0055;}
.wb-skill.shld.firing{color:#00BFFF;}
/* Когда firing активен — поверх .cd dim'а показываем яркий icon */
.wb-skill.firing .ws-icon{opacity:1!important;filter:drop-shadow(0 0 12px currentColor)!important;}
.wb-skill.firing .ws-name{opacity:1!important;color:#fff!important;}
/* Активный ЩИТ — мерцает голубой рамкой 2 сек после авто-каста */
.wb-skill.shld.shield-active{animation:wb-shield-on 2s ease-in-out;}
@keyframes wb-shield-on{
  0%,100%{box-shadow:0 0 16px rgba(0,191,255,.4),inset 0 0 12px rgba(0,191,255,.2);}
  50%{box-shadow:0 0 30px rgba(0,191,255,.85),0 0 50px rgba(0,191,255,.5),inset 0 0 20px rgba(0,191,255,.4);}}
.ws-icon{font-size:22px;line-height:1;}.ws-name{font-size:8px;letter-spacing:.8px;text-transform:uppercase;color:rgba(255,255,255,.55);font-weight:700;}
.wb-skill.cd .ws-icon,.wb-skill.cd .ws-name{opacity:.25;}
.wb-cd-ov{position:absolute;inset:0;border-radius:10px;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .1s;}
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
.wb-shake{animation:wb-shake .45s ease-in-out;}@keyframes wb-shake{0%,100%{transform:translateX(0)}10%,30%,50%,70%,90%{transform:translateX(-4px)}20%,40%,60%,80%{transform:translateX(4px)}}

.wb-victwait{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:radial-gradient(circle,rgba(60,40,0,.4) 0%,#000 70%)}.wb-victwait-em{font-size:90px;filter:drop-shadow(0 0 30px #FFD700);animation:wb-mvp-shine 1.2s ease-in-out infinite}.wb-victwait-t{font-size:28px;font-weight:900;letter-spacing:8px;color:#FFD700;text-shadow:0 0 20px #FFD700}.wb-victwait-s{font-size:11px;color:rgba(255,255,255,.5);letter-spacing:1.5px}
/* ── MVP RAID — итоги рейда ── */
.wb-mvp-ov{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.88);
  display:flex;align-items:center;justify-content:center;padding:20px;
  opacity:0;pointer-events:none;transition:opacity .35s;}
.wb-mvp-ov.open{opacity:1;pointer-events:all;}
.wb-mvp{width:100%;max-width:340px;text-align:center;padding:24px 18px;position:relative;
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
.wb-mvp-x{position:absolute;top:10px;right:12px;width:30px;height:30px;border-radius:50%;
  background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);
  display:flex;align-items:center;justify-content:center;cursor:pointer;
  font-size:16px;color:rgba(255,255,255,.65);line-height:1;z-index:5;
  transition:all .12s;}
.wb-mvp-x:active{background:rgba(255,255,255,.18);transform:scale(.92);}
.wb-mvp-rew{font-size:13px;color:#fff;margin-bottom:6px;font-weight:700;}
.wb-mvp-chest{font-size:11px;color:#ffdd66;margin-bottom:14px;}
.wb-mvp-summary{margin:10px 14px 6px;padding:10px 12px;border-radius:10px;
  background:linear-gradient(135deg,rgba(150,80,255,.08),rgba(255,0,150,.06));
  border:1px solid rgba(255,200,80,.18);text-align:left;}
.wb-mvp-sum-h{font-size:10px;font-weight:900;letter-spacing:2px;color:#ffc83c;
  text-align:center;margin-bottom:8px;text-transform:uppercase;
  text-shadow:0 0 8px rgba(255,200,60,.4);}
.wb-mvp-sum-row{display:flex;align-items:center;gap:8px;font-size:11px;
  color:#fff;padding:5px 0;border-bottom:1px dashed rgba(255,255,255,.06);}
.wb-mvp-sum-row:last-child{border-bottom:none;}
.wb-mvp-sum-row.gold{color:#ffd700;font-weight:700;}
.wb-mvp-sum-row.scroll{color:#cc88ff;}
.wb-mvp-sum-row.top3{color:rgba(255,255,255,.85);}
.wb-mvp-sum-ic{font-size:14px;flex-shrink:0;}
.wb-mvp-sum-lbl{color:rgba(255,255,255,.6);font-size:10px;}
.wb-mvp-sum-val{flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap;}
.wb-mvp-sum-pct{color:#00FF9F;font-family:'Courier New',monospace;font-size:10px;
  font-weight:700;flex-shrink:0;}
.wb-mvp-msg{font-size:11px;color:rgba(255,255,255,.65);font-style:italic;
  margin:8px 14px 14px;padding:10px 12px;border-radius:10px;
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);
  line-height:1.5;text-align:center;}
.wb-mvp-ov.lose .wb-mvp-msg{color:rgba(255,180,180,.7);
  background:rgba(255,80,80,.06);border-color:rgba(255,80,80,.15);}
.wb-mvp-btn{display:block;width:100%;margin-top:18px;padding:14px;border-radius:10px;
  background:linear-gradient(135deg,#FF0055,#cc0044);border:none;color:#fff;
  font-size:13px;font-weight:900;letter-spacing:2px;cursor:pointer;
  box-shadow:0 0 25px rgba(255,0,85,.5);transition:all .15s;}
.wb-mvp-btn:active{transform:scale(.96);box-shadow:0 0 15px rgba(255,0,85,.7);}

/* ── Кнопка «📜 Лог боя» в MVP-окне ── */
.wb-mvp-log-btn{display:inline-block;margin:8px 0 4px;padding:7px 16px;border-radius:18px;
  background:rgba(255,255,255,.05);border:1px solid rgba(0,191,255,.4);color:#aaddff;
  font-size:11px;font-weight:700;letter-spacing:1px;cursor:pointer;
  transition:all .12s;}
.wb-mvp-log-btn:active{transform:scale(.96);background:rgba(0,191,255,.15);}

/* ── Лог боя (popup со статистикой) ── */
.wb-blog-ov{position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,.85);
  display:flex;align-items:center;justify-content:center;padding:20px;
  opacity:0;pointer-events:none;transition:opacity .22s;}
.wb-blog-ov.open{opacity:1;pointer-events:all;}
.wb-blog{width:100%;max-width:340px;border-radius:16px;padding:18px 14px;position:relative;
  background:linear-gradient(180deg,#14001f 0%,#06030f 100%);
  border:1px solid rgba(0,191,255,.3);
  box-shadow:0 8px 50px rgba(0,191,255,.18);
  transform:scale(.92);opacity:0;transition:transform .25s cubic-bezier(.32,1.2,.5,1),opacity .22s;}
.wb-blog-ov.open .wb-blog{transform:scale(1);opacity:1;}
.wb-blog-x{position:absolute;top:8px;right:10px;width:26px;height:26px;border-radius:50%;
  background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);
  display:flex;align-items:center;justify-content:center;cursor:pointer;
  font-size:14px;color:rgba(255,255,255,.55);line-height:1;}
.wb-blog-h{font-size:14px;font-weight:900;letter-spacing:2px;color:#00BFFF;
  text-align:center;margin-bottom:4px;text-shadow:0 0 10px rgba(0,191,255,.45);}
.wb-blog-sub{font-size:10px;color:rgba(255,255,255,.55);text-align:center;
  letter-spacing:1px;margin-bottom:14px;}
.wb-blog-grid{display:flex;flex-direction:column;gap:5px;margin-bottom:12px;}
.wb-blog-row{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:9px;
  background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);
  font-size:12px;color:rgba(255,255,255,.85);}
.wb-blog-row .ic{font-size:16px;flex-shrink:0;}
.wb-blog-row .lbl{flex:1;color:rgba(255,255,255,.65);font-size:11px;}
.wb-blog-row .val{font-weight:900;color:#fff;font-family:'Courier New',monospace;}
.wb-blog-row.good{background:rgba(0,255,159,.06);border-color:rgba(0,255,159,.18);}
.wb-blog-row.good .val{color:#00FF9F;}
.wb-blog-row.bad{background:rgba(255,80,80,.06);border-color:rgba(255,80,80,.18);}
.wb-blog-row.bad .val{color:#ff5577;}
.wb-blog-rew{text-align:center;font-size:13px;font-weight:700;color:#ffdd66;
  margin-bottom:14px;letter-spacing:1px;}
.wb-blog-ok{padding:11px;border-radius:11px;text-align:center;cursor:pointer;
  background:linear-gradient(135deg,#0066ff,#003ba3);color:#fff;
  font-size:12px;font-weight:900;letter-spacing:1.5px;
  box-shadow:0 0 18px rgba(0,100,255,.35);transition:transform .12s;}
.wb-blog-ok:active{transform:scale(.97);}

/* ── Комната ожидания (gather) ── */
.wb-gth{position:fixed;inset:0;z-index:9500;background:#000;
  font-family:-apple-system,"Segoe UI",Roboto,sans-serif;color:#e0e0e0;
  overflow:hidden;}
.wb-gth-bg{position:absolute;inset:0;z-index:1;
  background-size:cover;background-position:center;
  animation:wb-gth-fade 24s ease-in-out infinite;}
.wb-gth-bg.b1{background-image:url('bosses/gather/1.png?v=a10');animation-delay:0s;}
.wb-gth-bg.b2{background-image:url('bosses/gather/2.png?v=a10');animation-delay:12s;}
@keyframes wb-gth-fade{
  0%,40%   {opacity:1}
  50%,90%  {opacity:0}
  100%     {opacity:1}}
.wb-gth-vignette{position:absolute;inset:0;z-index:2;pointer-events:none;
  background:radial-gradient(ellipse 90% 80% at 50% 50%,
    transparent 0%, rgba(0,0,0,.45) 70%, rgba(0,0,0,.85) 100%);}
.wb-gth-top{position:absolute;top:14px;left:14px;right:14px;z-index:10;}
.wb-gth-head{font-size:11px;font-weight:900;letter-spacing:2px;color:#ff88dd;
  text-shadow:0 0 10px rgba(255,80,200,.6);text-transform:uppercase;}
.wb-gth-sub{font-size:9px;color:rgba(255,255,255,.55);margin-top:2px;letter-spacing:1.5px;}
.wb-gth-timer{position:absolute;left:0;right:158px;top:42%;z-index:5;text-align:center;}
.wb-gth-timer-lbl{font-size:9px;letter-spacing:2px;color:#cc88ff;
  text-shadow:0 0 8px rgba(180,80,255,.4);margin-bottom:4px;text-transform:uppercase;}
.wb-gth-timer-val{font-size:64px;font-weight:900;font-family:'Courier New',monospace;
  background:linear-gradient(180deg,#ffee00,#ff8800);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  letter-spacing:3px;
  filter:drop-shadow(0 0 12px rgba(255,200,0,.6));
  animation:wb-gth-pulse 1.6s ease-in-out infinite;}
@keyframes wb-gth-pulse{
  0%,100%{filter:drop-shadow(0 0 8px rgba(255,200,0,.5))}
  50%   {filter:drop-shadow(0 0 22px rgba(255,200,0,.9))}}
.wb-gth-roster{position:absolute;right:10px;top:14px;bottom:60px;z-index:8;
  width:138px;border-radius:11px;
  background:rgba(10,5,20,.8);backdrop-filter:blur(8px);
  -webkit-backdrop-filter:blur(8px);
  border:1px solid rgba(255,80,200,.3);
  box-shadow:0 4px 18px rgba(0,0,0,.6);
  overflow:hidden;display:flex;flex-direction:column;}
.wb-gth-roster-h{padding:8px 10px;font-size:9px;font-weight:900;letter-spacing:1.5px;
  color:#ff88dd;text-align:center;text-transform:uppercase;
  border-bottom:1px solid rgba(255,80,200,.2);
  background:rgba(255,80,200,.06);}
.wb-gth-roster-h .cnt{color:#fff;font-family:'Courier New',monospace;}
.wb-gth-roster-list{flex:1;overflow-y:auto;padding:4px 0;
  scrollbar-width:thin;scrollbar-color:rgba(255,80,200,.3) transparent;}
.wb-gth-roster-list::-webkit-scrollbar{width:4px;}
.wb-gth-roster-list::-webkit-scrollbar-thumb{background:rgba(255,80,200,.4);border-radius:2px;}
.wb-gth-row{display:flex;align-items:center;gap:6px;padding:6px 9px;cursor:pointer;
  border-radius:6px;margin:0 4px;transition:background .12s;}
.wb-gth-row:active{background:rgba(255,80,200,.18);}
.wb-gth-row .av{font-size:13px;flex-shrink:0;}
.wb-gth-row .nm{flex:1;font-size:11px;color:#fff;font-weight:600;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.wb-gth-row .lv{font-size:9px;color:rgba(255,255,255,.4);font-family:'Courier New',monospace;flex-shrink:0;}
.wb-gth-empty{padding:20px 12px;text-align:center;font-size:10px;color:rgba(255,255,255,.4);}
.wb-gth-leave{position:absolute;left:14px;right:158px;bottom:14px;z-index:10;
  padding:11px;border-radius:10px;text-align:center;cursor:pointer;
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);
  font-size:11px;font-weight:700;letter-spacing:1px;color:rgba(255,255,255,.6);}
.wb-gth-leave:active{background:rgba(255,255,255,.08);}

/* Карточка игрока (попап от тапа на ник) */
.wb-gth-pcard-ov{position:fixed;inset:0;z-index:9999;
  background:rgba(0,0,0,.78);backdrop-filter:blur(6px);
  display:flex;align-items:center;justify-content:center;
  opacity:0;pointer-events:none;transition:opacity .2s;}
.wb-gth-pcard-ov.open{opacity:1;pointer-events:all;}
.wb-gth-pcard{position:relative;width:280px;border-radius:18px;padding:22px 18px;
  background:linear-gradient(180deg,#180630 0%,#06030f 100%);
  border:1px solid rgba(255,80,200,.4);
  box-shadow:0 8px 50px rgba(255,80,200,.25);
  transform:scale(.92);opacity:0;
  transition:transform .25s cubic-bezier(.32,1.2,.5,1),opacity .2s;
  text-align:center;}
.wb-gth-pcard-ov.open .wb-gth-pcard{transform:scale(1);opacity:1;}
.wb-gth-pcard-x{position:absolute;top:8px;right:10px;width:26px;height:26px;border-radius:50%;
  background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);
  display:flex;align-items:center;justify-content:center;cursor:pointer;
  font-size:14px;color:rgba(255,255,255,.6);}
.wb-gth-pcard-av{font-size:50px;line-height:1;margin-bottom:8px;}
.wb-gth-pcard-name{font-size:16px;font-weight:900;color:#fff;letter-spacing:1px;}
.wb-gth-pcard-lv{font-size:11px;color:#cc88ff;margin-top:4px;letter-spacing:1px;}
.wb-gth-pcard-msg{font-size:11px;color:rgba(255,255,255,.5);margin-top:14px;
  padding:9px 12px;border-radius:9px;background:rgba(0,255,159,.06);
  border:1px solid rgba(0,255,159,.2);}

/* ── История боя (timeline по раундам) ── */
.wb-bhist-ov{position:fixed;inset:0;z-index:10005;background:rgba(0,0,0,.88);
  display:flex;align-items:center;justify-content:center;padding:18px;
  opacity:0;pointer-events:none;transition:opacity .22s;}
.wb-bhist-ov.open{opacity:1;pointer-events:all;}
.wb-bhist{width:100%;max-width:360px;max-height:84vh;overflow:hidden;
  border-radius:14px;padding:16px 14px;position:relative;
  background:linear-gradient(180deg,#0a0014 0%,#06030f 100%);
  border:1px solid rgba(0,191,255,.3);
  box-shadow:0 8px 50px rgba(0,191,255,.18);
  display:flex;flex-direction:column;gap:10px;
  transform:scale(.92);opacity:0;transition:transform .25s cubic-bezier(.32,1.2,.5,1),opacity .22s;}
.wb-bhist-ov.open .wb-bhist{transform:scale(1);opacity:1;}
.wb-bhist-x{position:absolute;top:8px;right:10px;width:26px;height:26px;border-radius:50%;
  background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);
  display:flex;align-items:center;justify-content:center;cursor:pointer;
  font-size:14px;color:rgba(255,255,255,.6);}
.wb-bhist-h{font-size:13px;font-weight:900;letter-spacing:2px;color:#00BFFF;
  text-align:center;text-shadow:0 0 10px rgba(0,191,255,.45);}
.wb-bhist-h .cnt{color:rgba(255,255,255,.5);font-weight:600;}
.wb-bhist-stats{display:flex;justify-content:center;gap:6px;font-size:10px;
  color:rgba(255,255,255,.7);font-family:'Courier New',monospace;
  padding:6px 10px;border-radius:8px;
  background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);}
.wb-bhist-stats .me{color:#00FF9F;font-weight:700;}
.wb-bhist-stats .boss{color:#ff5577;font-weight:700;}
.wb-bhist-stats .dot{color:rgba(255,255,255,.2);}
.wb-bhist-list{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:4px;
  scrollbar-width:thin;scrollbar-color:rgba(0,191,255,.3) transparent;}
.wb-bhist-list::-webkit-scrollbar{width:4px;}
.wb-bhist-list::-webkit-scrollbar-thumb{background:rgba(0,191,255,.3);border-radius:2px;}
.wb-bhist-row{display:flex;gap:8px;align-items:flex-start;padding:6px 8px;
  border-radius:7px;background:rgba(255,255,255,.025);
  border:1px solid rgba(255,255,255,.04);font-size:11px;}
.wb-bhist-r{flex-shrink:0;font-weight:900;color:#cc88ff;
  font-family:'Courier New',monospace;font-size:10px;letter-spacing:.5px;
  min-width:24px;}
.wb-bhist-evs{flex:1;display:flex;flex-wrap:wrap;gap:4px 8px;}
.wb-bhist-evs .ev{font-family:'Courier New',monospace;font-size:11px;
  font-weight:700;white-space:nowrap;}
.wb-bhist-evs .ev.me{color:#00FF9F;}
.wb-bhist-evs .ev.crit{color:#FFD700;}
.wb-bhist-evs .ev.boss{color:#ff5577;}
.wb-bhist-empty{padding:40px 12px;text-align:center;font-size:11px;
  color:rgba(255,255,255,.4);}
.wb-bhist-ok{padding:11px;border-radius:11px;text-align:center;cursor:pointer;
  background:linear-gradient(135deg,#0066ff,#003ba3);color:#fff;
  font-size:12px;font-weight:900;letter-spacing:1.5px;
  box-shadow:0 0 18px rgba(0,100,255,.35);}
.wb-bhist-ok:active{transform:scale(.97);}

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
