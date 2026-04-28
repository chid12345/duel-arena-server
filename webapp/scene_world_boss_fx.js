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

    // 3а) Игрок умер → драматический красный экран + вибро.
    if (newPs?.is_dead && !prevPs?.is_dead) {
      this._fxDeathFlash();
    }

    // 3б) Игроку прилетел урон → красная вспышка по HP-тексту + лог в историю.
    if (newPs && typeof newPs.current_hp === 'number'
        && typeof prevPs.current_hp === 'number'
        && newPs.current_hp < prevPs.current_hp) {
      if (this._plHpT) this._fxFlashText(this._plHpT);
      try { window.WBHtml?.checkBossHit?.(prevPs.current_hp, newPs.current_hp); } catch(_) {}
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

  _fxDeathFlash() {
    try { this._fxShake('heavy'); } catch(_) {}
    try { tg?.HapticFeedback?.notificationOccurred?.('error'); } catch(_) {}
    const W = this.W, H = this.H;
    try {
      const rect = this.add.rectangle(W/2, H/2, W, H, 0x550000, 0.75).setDepth(9998);
      const lbl = txt(this, W/2, H/2, '💀 ВЫ ПАЛИ В БОЮ', 20, '#ff4444')
                    .setOrigin(0.5).setDepth(9999);
      lbl.setStroke('#000000', 6);
      this.tweens.add({
        targets: [rect, lbl], alpha: { from: 1, to: 0 },
        duration: 1500, ease: 'Sine.easeOut', delay: 700,
        onComplete: () => { try { rect.destroy(); lbl.destroy(); } catch(_) {} },
      });
    } catch(_) {}
  },

  // Карточка игрока из топа — вызывается при тапе по строке топа в бою.
  _showTopPlayerCard(p) {
    document.getElementById('wb-top-pcard')?.remove();
    const _e = s => String(s||'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    const colors = ['#9b30ff','#ff44cc','#00E5FF','#ffaa00','#44ff88'];
    const bg = colors[((p.user_id||0) % colors.length)];
    const av = `<div style="width:48px;height:48px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;font-size:22px;margin:0 auto 6px">⚔</div>`;
    const ov = document.createElement('div');
    ov.id = 'wb-top-pcard'; ov.className = 'wb-gth-pcard-ov';
    ov.innerHTML = `<div class="wb-gth-pcard">
      <div class="wb-gth-pcard-x">×</div>
      ${av}
      <div class="wb-gth-pcard-name">${_e(p.name||'Игрок')}</div>
      <div class="wb-gth-pcard-lv">Ур. ${p.level||'?'} · Атк ${p.atk||'?'}</div>
      <div class="wb-gth-pcard-msg">⚔ Урон: ${(p.total_damage||0).toLocaleString('ru')}</div>
      <div class="wb-gth-pcard-msg">💥 Криты: ${p.crits||0} · ❤️ HP: ${p.hp||0}/${p.max_hp||100}</div>
    </div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    ov.addEventListener('click', e => {
      if (e.target === ov || e.target.classList.contains('wb-gth-pcard-x')) {
        ov.classList.remove('open');
        setTimeout(() => ov.remove(), 200);
      }
    });
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
