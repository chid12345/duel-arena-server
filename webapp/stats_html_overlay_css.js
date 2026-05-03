/* ============================================================
   Stats HTML Overlay — CSS (выделено из stats_html_overlay.js)
   Экспорт: window.StatsHTMLCSS.inject()
   ============================================================ */
(() => {
const CSS = `
.st-overlay{position:fixed;top:0;left:0;right:0;bottom:76px;z-index:9000;background:radial-gradient(ellipse at top,#1a0830 0%,#05020f 70%),#000;color:#e6f7ff;overflow-y:auto;overflow-x:hidden;font-family:-apple-system,"Segoe UI",Roboto,sans-serif;display:flex;justify-content:center}
.st-overlay::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,255,220,.025) 3px 4px);pointer-events:none;z-index:1}
.st-panel{width:100%;max-width:430px;position:relative;z-index:2;padding:0 0 20px}
.st-hdr{margin:10px;padding:10px 12px;border-radius:14px;background:linear-gradient(135deg,rgba(255,59,168,.1),rgba(0,240,255,.08));border:1px solid #00f0ff;box-shadow:0 0 14px rgba(0,240,255,.3),inset 0 0 10px rgba(0,240,255,.06);display:flex;align-items:center;gap:10px;position:relative}
.st-hdr::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#ff3ba8,transparent)}
@keyframes stBackGlow{0%,100%{text-shadow:0 0 8px #00f5ff,0 0 18px rgba(0,245,255,.3);opacity:.75}50%{text-shadow:0 0 16px #00f5ff,0 0 32px rgba(0,245,255,.6);opacity:1}}
.st-back{display:inline-flex;flex-direction:column;align-items:center;line-height:1;font-size:30px;color:#00f5ff;cursor:pointer;padding:2px 10px 2px 0;user-select:none;animation:stBackGlow 2s ease-in-out infinite}
.st-back::after{content:'НАЗАД';font-size:6px;font-weight:700;letter-spacing:1.2px;color:rgba(0,245,255,.6);margin-top:-1px}
.st-back:active{transform:scale(.88)}
.st-av{width:46px;height:46px;display:grid;place-items:center;font-size:26px;flex-shrink:0;filter:drop-shadow(0 0 12px #ff3ba8) drop-shadow(0 0 5px #ff3ba8);cursor:pointer}
.st-bd{flex:1;min-width:0}
.st-n{font-size:13px;font-weight:800;color:#fff;text-shadow:0 0 5px #00f0ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st-sb{font-size:10px;color:#00f0ff;margin-top:2px;text-shadow:0 0 4px currentColor;letter-spacing:.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st-pts{padding:6px 10px;border-radius:8px;font-size:10px;font-weight:800;background:rgba(255,59,168,.12);color:#ff3ba8;border:1px solid #ff3ba8;text-shadow:0 0 4px currentColor;box-shadow:0 0 8px rgba(255,59,168,.4);white-space:nowrap;animation:stPulse 1.4s ease-in-out infinite;cursor:default}
.st-pts.zero{animation:none;background:rgba(156,220,254,.08);color:#9cffa8;border-color:#9cffa8;box-shadow:0 0 6px rgba(156,255,168,.3)}
@keyframes stPulse{0%,100%{box-shadow:0 0 6px rgba(255,59,168,.35)}50%{box-shadow:0 0 14px rgba(255,59,168,.7)}}
.st-seg{margin:0 8px 10px;padding:0;background:transparent;border:none;box-shadow:none;display:grid;grid-template-columns:repeat(4,1fr);gap:4px}
.st-seg .s{position:relative;padding:4px 0 6px;text-align:center;cursor:pointer;user-select:none;transition:transform .15s}
.st-seg .s:active{transform:scale(.94)}
.st-seg .s .sk{display:block;width:56px;height:56px;margin:0 auto 3px;background-repeat:no-repeat;background-position:center;background-size:contain;transition:filter .25s, transform .25s}
.st-seg .s .lb{font-size:9.5px;font-weight:800;letter-spacing:.5px;color:#80c8ff;text-shadow:0 0 4px rgba(0,240,255,.25);transition:color .25s, text-shadow .25s}
.st-seg .s[data-tab="st"] .sk{filter:drop-shadow(0 0 4px rgba(255,59,168,.45)) drop-shadow(0 1px 1px rgba(0,0,0,.55))}
.st-seg .s[data-tab="bo"] .sk{filter:drop-shadow(0 0 4px rgba(255,190,70,.5))  drop-shadow(0 1px 1px rgba(0,0,0,.55))}
.st-seg .s[data-tab="in"] .sk{filter:drop-shadow(0 0 4px rgba(0,240,255,.5))   drop-shadow(0 1px 1px rgba(0,0,0,.55))}
.st-seg .s[data-tab="ra"] .sk{filter:drop-shadow(0 0 4px rgba(130,180,255,.55)) drop-shadow(0 1px 1px rgba(0,0,0,.55))}
.st-seg .s.on .sk{animation:stSkinPulse 1.7s ease-in-out infinite}
.st-seg .s[data-tab="st"].on .sk{filter:drop-shadow(0 0 10px rgba(255,59,168,.95)) drop-shadow(0 0 22px rgba(255,59,168,.5))}
.st-seg .s[data-tab="bo"].on .sk{filter:drop-shadow(0 0 10px rgba(255,200,80,1))   drop-shadow(0 0 22px rgba(255,170,40,.55))}
.st-seg .s[data-tab="in"].on .sk{filter:drop-shadow(0 0 10px rgba(0,240,255,.95)) drop-shadow(0 0 22px rgba(0,240,255,.5))}
.st-seg .s[data-tab="ra"].on .sk{filter:drop-shadow(0 0 10px rgba(130,180,255,1)) drop-shadow(0 0 22px rgba(80,140,255,.55))}
.st-seg .s[data-tab="st"].on .lb{color:#ff5ec0;text-shadow:0 0 6px currentColor}
.st-seg .s[data-tab="bo"].on .lb{color:#ffcc44;text-shadow:0 0 6px currentColor}
.st-seg .s[data-tab="in"].on .lb{color:#33f0ff;text-shadow:0 0 6px currentColor}
.st-seg .s[data-tab="ra"].on .lb{color:#9bbfff;text-shadow:0 0 6px currentColor}
@keyframes stSkinPulse{0%,100%{transform:scale(1.05)}50%{transform:scale(1.13)}}
.st-page{display:none}
.st-page.on{display:block}
.st-srow{margin:0 10px 8px;padding:10px 12px;border-radius:12px;background:linear-gradient(90deg,rgba(15,5,30,.88),rgba(5,5,15,.88));border:1px solid rgba(0,240,255,.35);display:grid;grid-template-columns:28px 1fr auto 36px;gap:10px;align-items:center}
.st-srow .ic{font-size:20px;filter:drop-shadow(0 0 6px currentColor);text-align:center}
.st-srow.s1{border-color:#ff3ba8;box-shadow:0 0 10px rgba(255,59,168,.2)} .st-srow.s1 .ic{color:#ff3ba8}
.st-srow.s2{border-color:#00f0ff;box-shadow:0 0 10px rgba(0,240,255,.2)} .st-srow.s2 .ic{color:#00f0ff}
.st-srow.s3{border-color:#a06bff;box-shadow:0 0 10px rgba(160,107,255,.2)} .st-srow.s3 .ic{color:#a06bff}
.st-srow.s4{border-color:#9cffa8;box-shadow:0 0 10px rgba(156,255,168,.2)} .st-srow.s4 .ic{color:#9cffa8}
.st-srow .mid .n{font-size:12px;font-weight:800;color:#fff;text-shadow:0 0 4px currentColor;letter-spacing:.3px}
.st-srow .mid .sv{font-size:9.5px;color:#80c8ff;margin-top:2px;opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st-srow .val{font-size:18px;font-weight:800;color:#fff;text-shadow:0 0 6px currentColor;min-width:28px;text-align:right}
.st-srow.s1 .val{color:#ff3ba8} .st-srow.s2 .val{color:#00f0ff} .st-srow.s3 .val{color:#a06bff} .st-srow.s4 .val{color:#9cffa8}
.st-srow .ad{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#ff3ba8,#a01e6e);color:#fff;font-size:17px;font-weight:800;display:grid;place-items:center;cursor:pointer;box-shadow:0 0 10px rgba(255,59,168,.5);user-select:none;transition:transform .1s}
.st-srow .ad:active{transform:scale(.92)}
.st-srow .ad.off{background:rgba(30,20,50,.7);box-shadow:none;color:#5a4e78;cursor:default}
.st-dash{margin:0 10px 10px;padding:10px 8px;border-radius:12px;background:linear-gradient(135deg,rgba(255,59,168,.06),rgba(0,240,255,.06));border:1px solid rgba(0,240,255,.3);box-shadow:0 0 8px rgba(0,240,255,.1);display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
.st-dash .cc{text-align:center;padding:2px 0}
.st-dash .cc .v{font-size:14px;font-weight:800;text-shadow:0 0 6px currentColor}
.st-dash .cc .l{font-size:8px;color:#80c8ff;margin-top:2px;text-transform:uppercase;letter-spacing:.4px}
.st-wrd{margin:0 10px 10px;padding:10px;border-radius:12px;background:linear-gradient(90deg,rgba(0,240,255,.08),rgba(156,255,168,.04));border:1px dashed rgba(0,240,255,.4);display:flex;align-items:center;justify-content:center;gap:8px;font-size:12px;font-weight:800;color:#9cffa8;cursor:pointer;user-select:none;text-shadow:0 0 4px currentColor}
.st-wrd:active{opacity:.7}
.st-bon{margin:0 10px 8px;padding:10px 12px;border-radius:12px;background:linear-gradient(90deg,rgba(15,5,30,.88),rgba(5,5,15,.88));border:1px solid rgba(0,240,255,.4);box-shadow:0 0 10px rgba(0,240,255,.15)}
.st-bon .t{font-size:11px;font-weight:800;color:#00f0ff;margin-bottom:8px;letter-spacing:.5px;text-transform:uppercase;text-shadow:0 0 6px currentColor;padding-bottom:6px;border-bottom:1px solid rgba(0,240,255,.2)}
.st-bon .r{display:flex;justify-content:space-between;padding:5px 0;font-size:11px;border-bottom:1px solid rgba(0,240,255,.08);gap:10px}
.st-bon .r:last-child{border:none}
.st-bon .r .k{color:#80c8ff;flex:1;min-width:0}
.st-bon .r .v{font-weight:800;color:#9cffa8;text-shadow:0 0 5px currentColor;white-space:nowrap}
.st-bon .r .v.neg{color:#f87171}
.st-bon .em{padding:14px 8px;text-align:center;color:#5a4e78;font-size:11px}
.st-invbtn{margin:0 10px;padding:14px;border-radius:12px;background:linear-gradient(135deg,rgba(255,59,168,.14),rgba(168,85,247,.08));border:1px solid #ff3ba8;box-shadow:0 0 12px rgba(255,59,168,.35);display:flex;align-items:center;justify-content:center;gap:10px;font-size:13px;font-weight:800;color:#fff;cursor:pointer;text-shadow:0 0 6px #ff3ba8;user-select:none}
.st-invbtn:active{opacity:.8}
.st-invtabs{margin:0 10px 8px;padding:3px;background:rgba(10,5,25,.92);border:1px solid rgba(0,240,255,.4);border-radius:10px;box-shadow:0 0 8px rgba(0,240,255,.15);display:grid;grid-template-columns:repeat(4,1fr);gap:3px}
.st-invtabs .it{padding:7px 2px;text-align:center;font-size:9.5px;font-weight:800;color:#80c8ff;border-radius:8px;cursor:pointer;user-select:none;letter-spacing:.3px}
.st-invtabs .it.on{background:linear-gradient(135deg,#00f0ff,#0088a8);color:#05020f;text-shadow:none;box-shadow:0 0 10px rgba(0,240,255,.5)}
.st-it{margin:0 10px 6px;padding:9px 10px;border-radius:11px;background:linear-gradient(90deg,rgba(15,5,30,.88),rgba(5,5,15,.88));border:1px solid rgba(0,240,255,.3);display:grid;grid-template-columns:34px 1fr auto;gap:8px;align-items:center;box-shadow:0 0 6px rgba(0,240,255,.08)}
.st-it-ic{font-size:22px;text-align:center;filter:drop-shadow(0 0 4px currentColor);color:#ffd166}
.st-it-bd{min-width:0}
.st-it-n{font-size:12px;font-weight:800;color:#fff;text-shadow:0 0 4px #00f0ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st-it-d{font-size:9.5px;color:#80c8ff;opacity:.85;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st-it-q{font-size:9px;color:#ffd166;margin-top:2px;font-weight:700}
.st-it-b{padding:7px 9px;border-radius:8px;background:linear-gradient(135deg,#ff3ba8,#a01e6e);color:#fff;font-size:10px;font-weight:800;cursor:pointer;user-select:none;box-shadow:0 0 8px rgba(255,59,168,.45);white-space:nowrap}
.st-it-b:active{transform:scale(.94)}
.st-it-b.boss{background:linear-gradient(135deg,#00aaff,#0055a8);box-shadow:0 0 8px rgba(0,170,255,.5)}
`;
function inject(){
  if (document.getElementById('st-style')) return;
  const s = document.createElement('style');
  s.id = 'st-style'; s.textContent = CSS;
  document.head.appendChild(s);
}
window.StatsHTMLCSS = { inject };
})();
