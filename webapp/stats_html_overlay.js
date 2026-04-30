/* ============================================================
   Stats HTML Overlay — вкладка «Герой» (Вариант C: SEGMENTED · Неон)
   4 под-вкладки: СТАТЫ · БОНУСЫ · РЮКЗАК · РЕЙТИНГ
   Нижний TabBar не трогает — обрезан bottom:76px как у clan-overlay

   Зависит от:
     - stats_html_overlay_css.js    → window.StatsHTMLCSS.inject()
     - stats_html_overlay_pages.js  → window.StatsHTMLPages.{WT,statsHTML,bonusHTML,invHTML,rateHTML}
     - stats_html_items.js          → window.StatsHTMLItems.{showItemDetail,showReplaceDialog}
     - INVENTORY_META (scene_inventory_overlay.js)
   ============================================================ */
(() => {
const _esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let _scene=null, _inv=null, _currentTab='st', _invSubTab='scrolls', _openGen=0;

function _render(){
  const P = window.StatsHTMLPages;
  // tank_1/agile_2/crit_0 → tank/agile/crit (скины не должны ломать имя класса в шапке)
  const p=State.player, _wtKey=String(p?.warrior_type||'').split('_')[0];
  const wt=(P?.WT||{})[_wtKey]||P?.WT?.tank||{name:'',icon:''};
  const root=document.getElementById('st-root'); if(!root) return;
  const _bv=window.BUILD_VERSION||'0';
  const name=_esc((p.username||'Герой').slice(0,16));
  const sub=`УР.${p.level} · ★ ${p.rating||0} · ${_esc(wt.name)}`;
  const fs=p.free_stats|0;
  const ptsTxt=fs>0?`⚡ ${fs}`:'✅';
  root.innerHTML=`<div class="st-panel">
    <div class="st-hdr">
      <span class="st-back" data-act="back">‹</span>
      <div class="st-av" data-act="wardrobe">${wt.icon}</div>
      <div class="st-bd"><div class="st-n">${name}</div><div class="st-sb">${sub}</div></div>
      <div class="st-pts${fs>0?'':' zero'}">${ptsTxt}</div>
    </div>
    <div class="st-seg">
      <div class="s${_currentTab==='st'?' on':''}" data-tab="st"><span class="sk" style="background-image:url('hero_tab_stats.png?v=${_bv}')"></span><div class="lb">СТАТЫ</div></div>
      <div class="s${_currentTab==='bo'?' on':''}" data-tab="bo"><span class="sk" style="background-image:url('hero_tab_bonus.png?v=${_bv}')"></span><div class="lb">БОНУСЫ</div></div>
      <div class="s${_currentTab==='in'?' on':''}" data-tab="in"><span class="sk" style="background-image:url('hero_tab_inv.png?v=${_bv}')"></span><div class="lb">РЮКЗАК</div></div>
      <div class="s${_currentTab==='ra'?' on':''}" data-tab="ra"><span class="sk" style="background-image:url('hero_tab_rate.png?v=${_bv}')"></span><div class="lb">РЕЙТИНГ</div></div>
    </div>
    <div class="st-page${_currentTab==='st'?' on':''}" data-p="st">${_currentTab==='st'?P.statsHTML(p):''}</div>
    <div class="st-page${_currentTab==='bo'?' on':''}" data-p="bo">${_currentTab==='bo'?P.bonusHTML(p,_inv):''}</div>
    <div class="st-page${_currentTab==='in'?' on':''}" data-p="in">${_currentTab==='in'?P.invHTML(_inv,_invSubTab):''}</div>
    <div class="st-page${_currentTab==='ra'?' on':''}" data-p="ra">${_currentTab==='ra'?P.rateHTML(p):''}</div>
  </div>`;
}

async function _onClick(e){
  const el=e.target.closest('[data-act],[data-tab],[data-itab]'); if(!el) return;
  try{window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');}catch(_){}
  if(el.dataset.tab){ _currentTab=el.dataset.tab; _render(); return; }
  if(el.dataset.itab){ _invSubTab=el.dataset.itab; _render(); return; }
  const act=el.dataset.act;
  // Захватываем ссылку на сцену ДО close() — иначе _scene=null и scene.start не отработает.
  const scn=_scene;
  if(act==='back'){ close(); scn?.scene?.start('Menu', { returnTab:'profile' }); return; }
  if(act==='wardrobe'){ try{ await scn?._openAvatarPanel?.(); }catch(_){} return; }
  if(act==='shop'){ close(); scn?.scene?.start('Shop'); return; }
  if(act==='train'){
    const key=el.dataset.stat; if(!key) return;
    const res=await scn?._trainFromHTML?.(key);
    if(res?.ok){
      try{ await _refreshInv(); }catch(_){}
      _render();
    } else if(res?.reason){
      scn?._showToast?.(res.reason==='no_free_stats'?'❌ Нет свободных статов':'❌ Ошибка');
    }
    return;
  }
  if(act==='apply'){
    const itemId=el.dataset.item; if(!itemId) return;
    await _applyItem(itemId, false);
    return;
  }
  if(act==='stat_info'){
    const key=el.dataset.stat; if(!key) return;
    window.StatsHTMLInfo?.showStatInfo(key, State.player);
    return;
  }
  if(act==='card'){
    const itemId=el.dataset.item; if(!itemId) return;
    const META=(window.INVENTORY_META?.ITEM_META)||{};
    const meta=META[itemId]; if(!meta) return;
    const qty=(_inv?.inventory||[]).find(x=>x.item_id===itemId)?.quantity||0;
    window.StatsHTMLItems?.showItemDetail({ itemId, meta, qty,
      onApply: ()=>_applyItem(itemId, false) });
    return;
  }
}

async function _applyItem(itemId, replace){
  try{
    const res=await post('/api/shop/apply', { item_id:itemId, replace:!!replace });
    if(res?.conflict){
      const META=(window.INVENTORY_META?.ITEM_META)||{};
      window.StatsHTMLItems?.showReplaceDialog({
        newItemId:itemId, newMeta:META[itemId],
        activeBuff:{ type:res.active_buff_type, charges:res.active_charges },
        onConfirm:()=>_applyItem(itemId, true),
      });
      return;
    }
    if(res?.ok){
      if(res.player){ State.player=res.player; State.playerLoadedAt=Date.now(); }
      await _refreshInv();
      _render();
      try{ _scene?._showToast?.(res.msg||'✅ Применено'); }catch(_){}
    } else {
      _scene?._showToast?.(`❌ ${res?.reason||'Ошибка'}`);
    }
  } catch(_){
    _scene?._showToast?.('❌ Нет соединения');
  }
}

async function _refreshInv(){
  try{ const d=await get('/api/shop/inventory'); if(d?.ok) _inv=d; }catch(_){}
}

function _fitToCanvas(root){
  // Привязываем оверлей к canvas, а не к viewport: при FIT-скейле canvas может не
  // заполнять высоту окна, тогда `bottom:76px` съедает TabBar и меню «пропадает».
  try{
    const c=document.querySelector('canvas');
    if(!c) return;
    const r=c.getBoundingClientRect();
    const canvasH=c.height||700;
    const tabBarCss=(r.height*76)/canvasH;
    root.style.top=r.top+'px';
    root.style.left=r.left+'px';
    root.style.width=r.width+'px';
    root.style.right='auto';
    root.style.bottom='auto';
    root.style.height=Math.max(0,r.height-tabBarCss)+'px';
  }catch(_){}
}

async function open(scene, opts){
  window.StatsHTMLCSS?.inject();
  close();
  _scene=scene;
  const _myGen = ++_openGen;
  const initTab=(opts?.tab)||'st';
  _currentTab=['st','bo','in','ra'].includes(initTab)?initTab:'st';
  await _refreshInv();
  // Если close() вызвали пока _refreshInv ждал (смена сцены) — не открываем
  if(_myGen !== _openGen || !scene.scene?.isActive()) return;
  const root=document.createElement('div'); root.id='st-root'; root.className='st-overlay';
  document.body.appendChild(root);
  _fitToCanvas(root);
  const onResize=()=>_fitToCanvas(root);
  window.addEventListener('resize', onResize);
  root._onResize=onResize;
  root.addEventListener('click', _onClick);
  root.addEventListener('touchmove', e => e.stopPropagation(), { passive:true });
  _render();
}
function close(){
  ++_openGen;  // инвалидирует любой pending open()
  // Закрываем item/stat попапы и восстанавливаем canvas до смены сцены.
  try{ window.StatsHTMLInfo?.close?.(); }catch(_){}
  try{ window.StatsHTMLItems?.close?.(); }catch(_){}
  // Страховка: если попап попал в DOM другим путём (или был удалён без _close),
  // canvas мог остаться с pointerEvents:'none' — и Phaser перестал ловить тапы.
  try{ const c=document.querySelector('canvas'); if(c) c.style.pointerEvents=''; }catch(_){}
  const r=document.getElementById('st-root');
  if(r?._onResize){ try{ window.removeEventListener('resize', r._onResize); }catch(_){} }
  r?.remove();
  _scene=null;
}

window.StatsHTML = { open, close, refresh:_render };
})();
