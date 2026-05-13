/* ============================================================
   MenuScene — Premium Box: кнопка в профиле рядом с Premium-бейджем
   ============================================================ */

/** Универсальное окно «что выпало из премиум-ящика».
 *  Работает независимо от магазина — на главном экране ShopHtml не определён.
 *  После закрытия — перезагрузка сцены, чтобы счётчики алмазов/золота обновились. */
function _showPremBoxRevealDOM(items, onClose) {
  const ID = 'menu-prem-box';
  let el = document.getElementById(ID);
  if (!el) { el = document.createElement('div'); el.id = ID; document.body.appendChild(el); }
  const rows = (items || []).map(it => `
    <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,215,0,.1)">
      <span style="font-size:22px;flex-shrink:0">${it.icon||'🎁'}</span>
      <div><div style="font-size:12px;font-weight:700;color:#fff">${it.name||it.item_id||''}</div>
      <div style="font-size:10px;color:rgba(255,255,255,.45)">${it.desc||''}</div></div>
    </div>`).join('');
  const close = () => { try { document.getElementById(ID)?.remove(); } catch(_) {} if (typeof onClose === 'function') onClose(); };
  el.innerHTML = `
    <div style="position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.88);padding:20px">
      <div style="width:100%;max-width:340px;background:linear-gradient(180deg,#14100a,#09060a);border:1px solid rgba(255,215,0,.5);border-radius:18px;padding:20px 16px 16px;box-shadow:0 0 32px rgba(255,215,0,.22)">
        <div style="text-align:center;font-size:28px;margin-bottom:4px">👑</div>
        <div style="text-align:center;font-size:15px;font-weight:800;color:#ffd700;letter-spacing:1px">ЕЖЕДНЕВНЫЙ ЯЩИК</div>
        <div style="text-align:center;font-size:10px;color:rgba(255,215,0,.5);margin-bottom:14px;letter-spacing:.5px">PREMIUM · СЕГОДНЯШНЯЯ НАГРАДА</div>
        ${rows || '<div style="text-align:center;color:rgba(255,255,255,.5);padding:10px">Награда выдана</div>'}
        <div style="font-size:10px;color:rgba(255,255,255,.3);text-align:center;margin-top:10px">→ алмазы на счёт, свитки в Рюкзак</div>
        <button id="${ID}-ok" style="width:100%;margin-top:12px;padding:11px;border-radius:10px;border:none;background:linear-gradient(135deg,#b87a08,#ffd700);color:#1a1000;font-size:13px;font-weight:800;cursor:pointer;letter-spacing:.5px">✅ Отлично!</button>
      </div>
    </div>`;
  document.getElementById(`${ID}-ok`)?.addEventListener('click', close);
  try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success'); } catch(_) {}
}

Object.assign(MenuScene.prototype, {

  async _claimPremBoxProfile(boxImg, boxGlow, boxZone, onSuccess) {
    if (this._premBoxBusy) return;
    this._premBoxBusy = true;
    try { boxZone.disableInteractive(); } catch(_) {}
    this.tweens.killTweensOf(boxImg);
    if (boxGlow) this.tweens.killTweensOf(boxGlow);
    boxImg.setAlpha(0.5);
    if (boxGlow) boxGlow.setAlpha(0);

    try {
      const box = await post('/api/shop/premium_daily_box', {});
      if (box?.ok && box?.box_opened) {
        boxImg.setAlpha(0.22);
        if (boxGlow) boxGlow.setAlpha(0);
        // Обновляем State.player из ответа — алмазы/предметы сразу видны на экране
        if (box.player && State.player) {
          State.player.diamonds = box.player.diamonds ?? State.player.diamonds;
          State.player.gold     = box.player.gold     ?? State.player.gold;
        }
        // Запускаем обратный отсчёт в кнопке — сколько секунд до следующего сброса
        if (typeof onSuccess === 'function') onSuccess(box.seconds_until_reset || 0);
        // Универсальное окно «что выпало» (DOM, не зависит от ShopHtml).
        // После закрытия перезапускаем сцену, чтобы счётчики алмазов/золота обновились.
        _showPremBoxRevealDOM(box.items || [], () => {
          try {
            const sc = this.scene;
            if (sc && sc.isActive('Menu')) sc.restart({ player: State.player });
          } catch(_) {}
        });
      } else {
        this.tweens.killTweensOf(boxImg);
        if (boxGlow) this.tweens.killTweensOf(boxGlow);
        boxImg.setAlpha(0.22);
        if (boxGlow) boxGlow.setAlpha(0);
        this._toast('👑 ' + (box?.reason || 'Уже получен сегодня'));
      }
    } catch(_) {
      this._premBoxBusy = false;
      boxImg.setAlpha(1);
      if (boxGlow) boxGlow.setAlpha(0.28);
      try { boxZone.setInteractive({ useHandCursor: true }); } catch(_) {}
      this._toast('❌ Нет соединения');
    }
    this._premBoxBusy = false;
  },

});
