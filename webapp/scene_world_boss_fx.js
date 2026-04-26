/* ============================================================
   WorldBossScene — fx: визуальные эффекты по WS-тикам.
   Диффим prev vs new и дергаем shake/flash/overlay.
   Закон 9: отдельный дом для эффектов, чтобы не раздувать ext.
   ============================================================ */

Object.assign(WorldBossScene.prototype, {

  // Главный диспетчер: вызывать из _onWsTick ДО перезаписи this._state.
  _applyWsEffects(p) {
    const prevA  = this._state?.active || {};
    const prevPs = this._state?.player_state || {};
    const newA   = p?.boss || {};
    const newPs  = p?.player || null;

    // 1) Боссу прилетел урон → красная вспышка по бару.
    if (typeof newA.hp === 'number' && typeof prevA.current_hp === 'number'
        && newA.hp < prevA.current_hp && this._bossHpBar) {
      this._fxFlashBar(this._bossHpBar);
    }

    // 2) Появился новый бит в crown_flags → shake (интенсивность по биту).
    const oldCF = prevA.crown_flags | 0;
    const newCF = newA.crown_flags  | 0;
    const added = (~oldCF) & newCF; // только новые биты
    if (added) {
      // бит 0 = 75% (лёгкий), бит 1 = 50% (средний), бит 2 = 25% (тяжёлый).
      if (added & 0b100) { this._fxShake('heavy'); this._fxChaosOverlay(); }
      else if (added & 0b010) this._fxShake('medium');
      else if (added & 0b001) this._fxShake('light');
      else this._fxShake('light');
    }

    // 3) Игроку прилетел урон → красная вспышка по HP-тексту.
    if (newPs && typeof newPs.current_hp === 'number'
        && typeof prevPs.current_hp === 'number'
        && newPs.current_hp < prevPs.current_hp) {
      if (this._plHpT) this._fxFlashText(this._plHpT);
      // Кровавый Демон: при ударе босса фон вспыхивает алым
      try {
        const z = document.getElementById('wb-boss-zone');
        if (z && z.classList.contains('bt-demon')) {
          z.classList.remove('wb-flash-rage'); void z.offsetWidth;
          z.classList.add('wb-flash-rage');
          setTimeout(() => z.classList.remove('wb-flash-rage'), 400);
        }
      } catch(_) {}
    }

    // 4) Переход 1→2 стадия (ярость на 50% HP) → анонс + тяжёлый shake.
    const prevStage = (prevA.stage | 0) || 1;
    const newStage  = (newA.stage  | 0) || 1;
    if (newStage >= 2 && prevStage < 2) {
      this._fxEnrageAnnounce();
    }
  },

  _fxEnrageAnnounce() {
    if (this._enrageShown) return;
    this._enrageShown = true;
    try { this._fxShake('heavy'); } catch(_) {}
    try { tg?.HapticFeedback?.notificationOccurred?.('warning'); } catch(_) {}
    try {
      const W = this.W, H = this.H;
      const lbl = txt(this, W/2, H/2, '⚡ БОСС РАЗЪЯРЁН ⚡', 22, '#ff6a30')
                    .setOrigin(0.5).setDepth(10001);
      lbl.setStroke('#200000', 5);
      this.tweens.add({
        targets: lbl, alpha: { from: 1, to: 0 },
        scale: { from: 1.0, to: 1.6 },
        duration: 1800, ease: 'Sine.easeOut',
        onComplete: () => { try { lbl.destroy(); } catch(_) {} },
      });
    } catch(_) {}
  },

  _fxShake(intensity) {
    const cam = this.cameras?.main;
    if (!cam) return;
    const map = {
      light:  [180, 0.004],
      medium: [300, 0.010],
      heavy:  [500, 0.018],
    };
    const [dur, amp] = map[intensity] || map.light;
    try { cam.shake(dur, amp); } catch(_) {}
    try { tg?.HapticFeedback?.impactOccurred(intensity === 'heavy' ? 'heavy' : 'medium'); } catch(_) {}
  },

  _fxFlashBar(bar) {
    // bar — результат _addBarPair, у него .bg/.fg либо .fill. Мигаем тинтом fill.
    const node = bar?.fg || bar?.fill || bar?.bar || null;
    if (!node || !node.setTint) return;
    try {
      node.setTint(0xffffff);
      this.time.delayedCall(120, () => { try { node.clearTint(); } catch(_) {} });
    } catch(_) {}
  },

  _fxFlashText(txtObj) {
    if (!txtObj?.setColor) return;
    const orig = '#f0f0fa';
    try {
      txtObj.setColor('#ff4060');
      this.time.delayedCall(180, () => { try { txtObj.setColor(orig); } catch(_) {} });
    } catch(_) {}
  },

  _fxChaosOverlay() {
    if (this._chaosOverlay) return; // уже висит
    const W = this.W, H = this.H;
    try {
      const rect = this.add.rectangle(W/2, H/2, W, H, 0xff0000, 0.22).setDepth(9999);
      const lbl = txt(this, W/2, 96, '⚡ ХАОС ⚡', 20, '#ffdd66').setOrigin(0.5).setDepth(10000);
      lbl.setStroke('#400000', 4);
      this._chaosOverlay = rect;
      this._chaosLabel   = lbl;
      // лёгкая пульсация
      this.tweens.add({ targets: rect, alpha: { from: 0.12, to: 0.28 },
                        duration: 600, yoyo: true, repeat: -1 });
      this.time.delayedCall(10000, () => {
        try { this._chaosOverlay?.destroy(); } catch(_) {}
        try { this._chaosLabel?.destroy(); } catch(_) {}
        this._chaosOverlay = null; this._chaosLabel = null;
      });
    } catch(_) {}
  },

});
