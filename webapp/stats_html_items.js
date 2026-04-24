/* ============================================================
   Stats HTML Items — карточка предмета + стилизованный confirm замены
   Заменяет нативный window.confirm и добавляет попап с описанием
   предмета при клике на карточку свитка/зелья/сундука.
   ============================================================ */
(() => {
const CSS = `
.hi-bg{position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;animation:hiFade .18s ease}
@keyframes hiFade{from{opacity:0}to{opacity:1}}
.hi-mdl{width:300px;max-width:calc(100vw - 32px);border-radius:18px;padding:18px 16px 14px;background:linear-gradient(135deg,rgba(20,0,35,.98),rgba(5,5,18,.98));border:1.5px solid #00f0ff;box-shadow:0 0 36px rgba(0,240,255,.35),0 24px 60px rgba(0,0,0,.7);animation:hiPop .22s cubic-bezier(.34,1.56,.64,1);position:relative}
.hi-mdl.warn{border-color:#ffaa33;box-shadow:0 0 36px rgba(255,170,51,.35),0 24px 60px rgba(0,0,0,.7)}
.hi-mdl.boss{border-color:#5096ff;box-shadow:0 0 36px rgba(80,150,255,.35),0 24px 60px rgba(0,0,0,.7)}
.hi-mdl.box{border-color:#ff3ba8;box-shadow:0 0 36px rgba(255,59,168,.35),0 24px 60px rgba(0,0,0,.7)}
@keyframes hiPop{from{opacity:0;transform:scale(.86) translateY(10px)}to{opacity:1;transform:none}}
.hi-x{position:absolute;top:8px;right:10px;width:28px;height:28px;display:grid;place-items:center;color:#80c8ff;font-size:18px;font-weight:800;cursor:pointer;user-select:none;opacity:.7}
.hi-x:active{opacity:1}
.hi-ic{width:72px;height:72px;margin:4px auto 8px;display:grid;place-items:center;font-size:48px;filter:drop-shadow(0 0 14px currentColor) drop-shadow(0 0 6px currentColor);color:#00f0ff}
.hi-mdl.warn .hi-ic{color:#ffaa33}
.hi-mdl.boss .hi-ic{color:#5096ff}
.hi-mdl.box  .hi-ic{color:#ff3ba8}
.hi-t{text-align:center;font-size:15px;font-weight:800;color:#fff;text-shadow:0 0 8px currentColor;margin-bottom:6px;letter-spacing:.3px}
.hi-mdl.warn .hi-t{color:#ffcc66}
.hi-mdl.boss .hi-t{color:#aaddff}
.hi-mdl.box  .hi-t{color:#ffa8d8}
.hi-d{text-align:center;font-size:11.5px;color:#9cc8ff;line-height:1.45;margin-bottom:10px;padding:0 6px}
.hi-q{text-align:center;font-size:10.5px;color:#ffd166;font-weight:700;margin-bottom:14px;text-shadow:0 0 5px currentColor}
.hi-warn{margin:8px 0 10px;padding:7px 10px;border-radius:9px;background:rgba(255,80,80,.1);border:1px solid rgba(255,80,80,.4);font-size:10.5px;color:#ff8a8a;text-align:center;letter-spacing:.2px}
.hi-cmp{display:grid;grid-template-columns:1fr;gap:7px;margin:4px 0 10px}
.hi-cmp .lb{font-size:9.5px;color:#80c8ff;letter-spacing:.5px;text-transform:uppercase;margin-bottom:3px;opacity:.85;text-align:center}
.hi-row{padding:9px 10px;border-radius:10px;background:rgba(15,8,30,.9);border:1px solid rgba(0,240,255,.3);display:grid;grid-template-columns:34px 1fr;gap:9px;align-items:center}
.hi-row.old{border-color:rgba(136,140,170,.4);background:rgba(15,10,25,.85)}
.hi-row.old .hi-row-ic{color:#9aa}
.hi-row.new{border-color:rgba(0,240,255,.55);box-shadow:0 0 10px rgba(0,240,255,.2)}
.hi-row-ic{font-size:22px;text-align:center;filter:drop-shadow(0 0 5px currentColor);color:#00f0ff}
.hi-row-bd{min-width:0}
.hi-row-n{font-size:11.5px;font-weight:800;color:#fff;text-shadow:0 0 3px #00f0ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hi-row.old .hi-row-n{color:#c8ccdd;text-shadow:none}
.hi-row-d{font-size:9.5px;color:#80c8ff;opacity:.85;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hi-row.old .hi-row-d{color:#8890a8}
.hi-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px}
.hi-btns.one{grid-template-columns:1fr}
.hi-b{height:40px;border-radius:10px;display:grid;place-items:center;font-size:12px;font-weight:800;cursor:pointer;user-select:none;border:1px solid currentColor;background:rgba(10,5,25,.9);box-shadow:0 0 10px currentColor;transition:transform .1s;letter-spacing:.2px}
.hi-b:active{transform:scale(.95)}
.hi-b.cancel{color:#80c8ff;box-shadow:0 0 6px rgba(128,200,255,.4)}
.hi-b.ok{color:#00f0ff}
.hi-b.warn{color:#ffaa33}
.hi-b.boss{color:#5096ff}
.hi-b.box{color:#ff3ba8}
.hi-b.info{color:#80c8ff;opacity:.85;cursor:default;box-shadow:none}
`;
const _esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function _injectCSS(){if(document.getElementById('hi-style'))return;const s=document.createElement('style');s.id='hi-style';s.textContent=CSS;document.head.appendChild(s);}

const BUFF_LBL = {
  strength:'⚔️ Сила', endurance:'🌀 Ловкость', stamina:'🛡 Выносливость',
  crit:'🎯 Интуиция', armor_pct:'🔰 Броня', dodge_pct:'💨 Уворот',
  hp_bonus:'❤️ HP', double_pct:'⚡ Двойной удар', accuracy:'👁 Точность',
  lifesteal_pct:'🩸 Вампиризм', gold_pct:'💰 Золото', xp_pct:'📚 Опыт',
};
const BUFF_ICON = {
  strength:'⚔️', endurance:'🌀', stamina:'🛡', crit:'🎯',
  armor_pct:'🔰', dodge_pct:'💨', hp_bonus:'❤️', double_pct:'⚡',
  accuracy:'👁', lifesteal_pct:'🩸', gold_pct:'💰', xp_pct:'📚',
};

function _cvs(){ return document.querySelector('canvas'); }

function _close(){
  document.getElementById('hi-bg')?.remove();
  try{ _cvs().style.pointerEvents = ''; }catch(_){}
}

function _mount(html, onClick){
  _injectCSS();
  _close();
  const bg = document.createElement('div');
  bg.id = 'hi-bg'; bg.className = 'hi-bg';
  bg.innerHTML = html;
  document.body.appendChild(bg);
  // Пока попап открыт — canvas не должен ловить тапы.
  try{ _cvs().style.pointerEvents = 'none'; }catch(_){}
  bg.addEventListener('touchstart', e => e.stopPropagation(), { passive:true });
  bg.addEventListener('click', e => {
    if (e.target === bg){ _close(); return; }
    const el = e.target.closest('[data-hi]'); if (!el) return;
    const act = el.dataset.hi;
    try{ window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(act==='ok'?'heavy':'light'); }catch(_){}
    if (act === 'close' || act === 'cancel'){ _close(); return; }
    try{ onClick?.(act); }catch(e){ console.error(e); }
  });
}

/* Карточка предмета с описанием и кнопкой действия */
function showItemDetail({ itemId, meta, qty, onApply }){
  if (!meta) return;
  const isBox  = itemId.startsWith('box_');
  const isBoss = meta.tab === 'boss';
  const cls = isBoss ? 'boss' : (isBox ? 'box' : '');
  const btnCls = isBoss ? 'boss' : (isBox ? 'box' : 'ok');
  const btnLbl = isBoss ? '⚔ Применяется в рейде' : (isBox ? '🎲 Открыть' : '✨ Применить');
  const btn = isBoss
    ? `<div class="hi-b info">${_esc(btnLbl)}</div>`
    : `<div class="hi-b ${btnCls}" data-hi="ok">${_esc(btnLbl)}</div>`;
  const html = `
    <div class="hi-mdl ${cls}" role="dialog">
      <div class="hi-x" data-hi="close">✕</div>
      <div class="hi-ic">${_esc(meta.icon||'📦')}</div>
      <div class="hi-t">${_esc(meta.name||itemId)}</div>
      <div class="hi-d">${_esc(meta.desc||'')}</div>
      ${qty>0?`<div class="hi-q">В рюкзаке: ×${qty|0}</div>`:''}
      ${isBoss?'<div class="hi-warn">Открой вкладку ⚔ Мировой Босс — там применишь в слот рейда</div>':''}
      <div class="hi-btns"><div class="hi-b cancel" data-hi="cancel">Отмена</div>${btn}</div>
    </div>`;
  _mount(html, (act) => { _close(); if (act === 'ok') onApply?.(); });
}

/* Диалог замены активного свитка */
function showReplaceDialog({ newItemId, newMeta, activeBuff, onConfirm }){
  const actType = activeBuff?.type || '';
  const actLbl  = BUFF_LBL[actType] || actType || 'свиток';
  const actIcon = BUFF_ICON[actType] || '✨';
  const ch = activeBuff?.charges;
  const chTxt = (ch!=null) ? `осталось ${ch} ${ch===1?'бой':(ch<5?'боя':'боёв')}` : '';
  const html = `
    <div class="hi-mdl warn" role="dialog">
      <div class="hi-x" data-hi="close">✕</div>
      <div class="hi-ic">⚠️</div>
      <div class="hi-t">Свиток уже активен</div>
      <div class="hi-cmp">
        <div>
          <div class="lb">Сейчас действует</div>
          <div class="hi-row old">
            <div class="hi-row-ic">${_esc(actIcon)}</div>
            <div class="hi-row-bd"><div class="hi-row-n">${_esc(actLbl)}</div><div class="hi-row-d">${_esc(chTxt||'активен')}</div></div>
          </div>
        </div>
        <div>
          <div class="lb">Заменить на</div>
          <div class="hi-row new">
            <div class="hi-row-ic">${_esc(newMeta?.icon||'📜')}</div>
            <div class="hi-row-bd"><div class="hi-row-n">${_esc(newMeta?.name||newItemId)}</div><div class="hi-row-d">${_esc(newMeta?.desc||'')}</div></div>
          </div>
        </div>
      </div>
      <div class="hi-warn">🔥 Старый свиток сгорит полностью</div>
      <div class="hi-btns">
        <div class="hi-b cancel" data-hi="cancel">Отмена</div>
        <div class="hi-b warn" data-hi="ok">🔥 Заменить</div>
      </div>
    </div>`;
  _mount(html, (act) => { _close(); if (act === 'ok') onConfirm?.(); });
}

window.StatsHTMLItems = { showItemDetail, showReplaceDialog, close: _close, injectCSS: _injectCSS };
})();
