/* wb_html_rewards_info.js — попап «🏆 Что получишь» в лобби WB.
   Расширяет window.WBHtml: showRewardsInfo(state).
   Тексты человечные, без формул и процентов — игроки пришли играть. */
(() => {
  const CSS = `
.wb-rinfo-ov{position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;
  background:rgba(0,0,0,.78);backdrop-filter:blur(6px);
  opacity:0;pointer-events:none;transition:opacity .22s;}
.wb-rinfo-ov.open{opacity:1;pointer-events:all;}
.wb-rinfo{position:relative;width:calc(100% - 36px);max-width:360px;border-radius:18px;
  overflow:hidden;background:linear-gradient(180deg,#1a002e 0%,#06030f 100%);
  border:1px solid rgba(255,200,80,.35);
  box-shadow:0 10px 60px rgba(255,180,40,.25),0 2px 24px rgba(0,0,0,.85);
  transform:scale(.9) translateY(10px);opacity:0;
  transition:transform .26s cubic-bezier(.32,1.2,.5,1),opacity .2s;
  max-height:90vh;overflow-y:auto;}
.wb-rinfo-ov.open .wb-rinfo{transform:scale(1) translateY(0);opacity:1;}
.wb-rinfo::-webkit-scrollbar{display:none}
.wb-rinfo{scrollbar-width:none}

.wb-rinfo-x{position:absolute;top:10px;right:12px;width:28px;height:28px;border-radius:50%;
  background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);
  display:flex;align-items:center;justify-content:center;cursor:pointer;
  font-size:14px;color:rgba(255,255,255,.55);line-height:1;z-index:2;}

.wb-rinfo-h{padding:22px 20px 12px;text-align:center;
  border-bottom:1px solid rgba(255,200,80,.12);}
.wb-rinfo-h-em{font-size:36px;line-height:1;margin-bottom:6px;
  filter:drop-shadow(0 0 14px rgba(255,200,80,.6));}
.wb-rinfo-h-t{font-size:15px;font-weight:900;letter-spacing:2px;
  background:linear-gradient(90deg,#ffd700,#ff88aa);-webkit-background-clip:text;
  background-clip:text;color:transparent;}

.wb-rinfo-sec{padding:14px 16px 6px;}
.wb-rinfo-sec-h{font-size:11px;font-weight:900;letter-spacing:1.5px;margin-bottom:8px;
  display:flex;align-items:center;gap:6px;}
.wb-rinfo-sec.win .wb-rinfo-sec-h{color:#3cff8c;}
.wb-rinfo-sec.lose .wb-rinfo-sec-h{color:#ff7b7b;}
.wb-rinfo-row{display:flex;align-items:flex-start;gap:10px;
  padding:8px 10px;margin-bottom:5px;border-radius:9px;
  background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);
  font-size:11.5px;color:rgba(255,255,255,.85);line-height:1.4;}
.wb-rinfo-row .ic{font-size:18px;flex-shrink:0;line-height:1;}
.wb-rinfo-row .tx{flex:1;}
.wb-rinfo-row .tx b{color:#fff;}
.wb-rinfo-row.gold{background:rgba(255,200,40,.07);border-color:rgba(255,200,40,.2);}
.wb-rinfo-row.scroll{background:rgba(180,80,255,.07);border-color:rgba(180,80,255,.22);}
.wb-rinfo-row.cross{opacity:.55;}

.wb-rinfo-tip{margin:6px 16px 4px;padding:9px 12px;border-radius:10px;
  background:rgba(0,200,100,.05);border:1px solid rgba(0,200,100,.15);
  font-size:10.5px;color:rgba(255,255,255,.7);line-height:1.45;}

.wb-rinfo-ok{margin:14px 16px 18px;padding:13px;border-radius:12px;text-align:center;
  cursor:pointer;background:linear-gradient(135deg,#FF0055,#cc0044);
  color:#fff;font-size:13px;font-weight:900;letter-spacing:2px;
  box-shadow:0 0 20px rgba(255,0,85,.4);transition:transform .12s;}
.wb-rinfo-ok:active{transform:scale(.97);}
`;

  function _inject() {
    if (document.getElementById('wb-style-rinfo')) return;
    const s = document.createElement('style');
    s.id = 'wb-style-rinfo'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function _close() {
    const ov = document.getElementById('wb-rinfo-ov');
    if (!ov) return;
    ov.classList.remove('open');
    setTimeout(() => ov.remove(), 240);
  }

  function showRewardsInfo(_state) {
    _inject();
    document.getElementById('wb-rinfo-ov')?.remove();

    const ov = document.createElement('div');
    ov.id = 'wb-rinfo-ov'; ov.className = 'wb-rinfo-ov';
    ov.innerHTML = `
      <div class="wb-rinfo">
        <div class="wb-rinfo-x" id="wb-rinfo-x">×</div>
        <div class="wb-rinfo-h">
          <div class="wb-rinfo-h-em">🏆</div>
          <div class="wb-rinfo-h-t">ЧТО ПОЛУЧИШЬ</div>
        </div>

        <div class="wb-rinfo-sec win">
          <div class="wb-rinfo-sec-h">✅ ЕСЛИ УБЬЁМ БОССА</div>
          <div class="wb-rinfo-row">
            <div class="ic">💰</div>
            <div class="tx"><b>Много золота</b><br><span style="opacity:.65">чем больше урона нанёс — тем больше</span></div>
          </div>
          <div class="wb-rinfo-row">
            <div class="ic">⭐</div>
            <div class="tx"><b>Много опыта</b><br><span style="opacity:.65">прокачка персонажа</span></div>
          </div>
          <div class="wb-rinfo-row">
            <div class="ic">💎</div>
            <div class="tx"><b>Алмазы — топ-3 по урону</b><br><span style="opacity:.65">кто бил больше всех</span></div>
          </div>
          <div class="wb-rinfo-row gold">
            <div class="ic">💠</div>
            <div class="tx"><b>Алмазный сундук</b> — лидеру по урону<br><span style="opacity:.65">премиум-вещи и шанс на джекпот</span></div>
          </div>
          <div class="wb-rinfo-row scroll">
            <div class="ic">✨</div>
            <div class="tx"><b>Редкий свиток «+12 ко всем пассивкам»</b><br><span style="opacity:.65">очень редко · удача 5% случайному игроку</span></div>
          </div>
        </div>

        <div class="wb-rinfo-sec lose">
          <div class="wb-rinfo-sec-h">❌ ЕСЛИ НЕ УСПЕЛИ</div>
          <div class="wb-rinfo-row">
            <div class="ic">💰</div>
            <div class="tx"><b>Чуть-чуть золота</b><br><span style="opacity:.65">утешение за труд</span></div>
          </div>
          <div class="wb-rinfo-row">
            <div class="ic">⭐</div>
            <div class="tx"><b>Чуть-чуть опыта</b></div>
          </div>
          <div class="wb-rinfo-row cross">
            <div class="ic">🚫</div>
            <div class="tx">Алмазов, сундука и свитка не будет</div>
          </div>
        </div>

        <div class="wb-rinfo-tip">
          💡 <b>Бей босса больше всех</b> — получишь алмазный сундук и больше золота.
        </div>

        <div class="wb-rinfo-ok" id="wb-rinfo-ok">ПОНЯТНО</div>
      </div>`;

    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));

    ov.addEventListener('click', e => {
      if (e.target === ov || e.target.id === 'wb-rinfo-x' || e.target.id === 'wb-rinfo-ok') {
        _close();
      }
    });
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch(_) {}
  }

  Object.assign(window.WBHtml = window.WBHtml || {}, { showRewardsInfo });
})();
