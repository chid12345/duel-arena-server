/* ============================================================
   StatsScene — «Герой» (segmented neon UI через StatsHTML)
   Тонкая оболочка: рисуем фон, открываем HTML-оверлей, строим TabBar.
   Прокачка стата → _trainFromHTML → /api/player/train → refresh overlay.
   ============================================================ */

class StatsScene extends Phaser.Scene {
  constructor() { super('Stats'); }

  init(data) {
    this._initData = data || {};
    this._sceneGen = (this._sceneGen || 0) + 1;
    this._avatarBusy = false;
    if (data && data.player) State.player = data.player;
  }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    this._busy = false;

    const d = this._initData;

    // Зачищаем любые HTML-оверлеи из прошлых сцен, иначе старый гардероб может «повиснуть»
    // поверх и казаться, будто вкладка Герой открывает Броню.
    // Универсальная страховка: закрываем ВСЕ TabBar-оверлеи (вкл. ClanHTML и др.).
    try { window._closeAllTabOverlays?.(); } catch(_) {}

    // Режим прямого открытия гардероба из профиля — Hero-UI не строим
    if (d.openWardrobe) {
      this._openedFromProfile = true;
      this._drawBg(W, H);
      this._openAvatarPanel?.();
      return;
    }

    this._drawBg(W, H);
    TabBar.build(this, { activeKey: 'stats' });

    // HTML-оверлей строит шапку, сегментированное меню и 4 под-вкладки.
    // Если пришли из магазина по кнопке «🎒 Моё» — сразу открываем РЮКЗАК.
    const initTab = d.openInventory ? 'in' : 'st';
    try { StatsHTML?.open?.(this, { tab: initTab }); } catch(e) { console.warn('[Stats] StatsHTML.open failed', e); }

    if (typeof ScreenHints !== 'undefined') ScreenHints.show('stats');

    // После restart от wardrobe-действия — открыть гардероб заново
    if (d.reopenWardrobe && d.wardrobePayload) {
      this._renderAvatarOverlay?.(d.wardrobePayload);
      if (d.toast) this._showToast(d.toast);
    }
  }

  /* ── Фон ─────────────────────────────────────────────── */
  _drawBg(W, H) {
    const g = this.add.graphics();
    g.fillGradientStyle(0x05040e, 0x05040e, 0x0c0a1c, 0x0c0a1c, 1);
    g.fillRect(0, 0, W, H);
    try { g.setScrollFactor?.(0); } catch(_) {}
  }

  /* ── Прокачка через HTML-кнопку: API + обновление State ─ */
  async _trainFromHTML(statKey) {
    if (this._busy) return { ok:false, reason:'busy' };
    if ((State.player.free_stats|0) <= 0) return { ok:false, reason:'no_free_stats' };
    this._busy = true;
    try {
      try { tg?.HapticFeedback?.impactOccurred('medium'); } catch(_) {}
      const res = await post('/api/player/train', { stat: statKey });
      if (res?.ok) {
        State.player = res.player;
        State.playerLoadedAt = Date.now();
        try { tg?.HapticFeedback?.notificationOccurred('success'); } catch(_) {}
      }
      return res || { ok:false, reason:'unknown' };
    } catch(_) {
      return { ok:false, reason:'network' };
    } finally {
      this._busy = false;
    }
  }

  /* ── Toast (ошибки из HTML-оверлея) ──────────────────── */
  _showToast(msg) {
    const t = txt(this, this.W / 2, this.H - 88, msg, 12, '#ff4455', true)
      .setOrigin(0.5).setAlpha(0).setDepth(10000);
    this.tweens.add({
      targets: t, alpha: 1,
      duration: 200, hold: 1400, yoyo: true,
      onComplete: () => t.destroy(),
    });
  }

  update() { try { this._wardrobeScrollFn?.(); } catch(_) {} }

  shutdown() {
    // Порядок важен: сперва гасим обновления/таймеры/кастомные колбеки,
    // затем закрываем HTML-оверлеи, и только потом бьём Phaser-объекты.
    try { this.time?.removeAllEvents?.(); } catch(_) {}
    try { this.tweens?.killAll?.(); } catch(_) {}
    this._wardrobeScrollFn = null;
    this._invOverlay = null;
    this._invData = null;
    this._busy = false;
    this._invBusy = false;
    // Без сброса TabBar._enableScroll при повторном входе в Stats видит
    // _tbScrollOn=true и НЕ навешивает pointerdown/pointermove/wheel —
    // скролл ломается, часть жестов уходит «в никуда» (эффект «зависания»).
    this._tbScrollOn = false;
    try { StatsHTML?.close?.(); } catch(_) {}
    try { WardrobeHTML?.close?.(); } catch(_) {}
    // Снимок детей: destroy() удаляет объект из children.getAll(), живой итератор
    // пропустил бы половину — и часть объектов пережила бы shutdown, появляясь
    // призраками в следующей сцене (частая причина «зависания» на выходе).
    const kids = this.children?.getAll?.().slice() || [];
    kids.forEach(o => { try { o.destroy(); } catch(_) {} });
  }
}
