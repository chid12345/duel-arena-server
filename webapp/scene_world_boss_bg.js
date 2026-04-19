/* ============================================================
   WorldBossScene — bg: динамический фон рейда по HP босса.
   Чем меньше HP — тем «агрессивнее» цвет под градиентом.
   Пороги: 75% / 50% / 25% (на 25% — пульсация).
   Закон 9: отдельный дом для динамической палитры фона.
   ============================================================ */

Object.assign(WorldBossScene.prototype, {

  _ensureBossBgLayer() {
    if (this._bossBgOverlay) return;
    // глубина 1: над градиентом _extraBg (глубина 0 по умолчанию),
    // но под UI-панелями (которые рисуются позже и имеют свою глубину).
    try {
      const rect = this.add.rectangle(this.W/2, this.H/2, this.W, this.H, 0xff4030, 0)
                       .setDepth(1);
      this._bossBgOverlay = rect;
    } catch(_) {}
  },

  // Уровень тревоги по HP-доле. 0=спокойно, 1=жёлтый, 2=оранж, 3=красный/пульс.
  _bgLevelByHp(hpPct) {
    if (hpPct >= 0.75) return 0;
    if (hpPct >= 0.50) return 1;
    if (hpPct >= 0.25) return 2;
    return 3;
  },

  _updateBossBg(hpPct) {
    this._ensureBossBgLayer();
    if (!this._bossBgOverlay) return;
    const lvl = this._bgLevelByHp(hpPct);
    if (lvl === this._bossBgLevel) return; // без изменений
    this._bossBgLevel = lvl;

    // Останавливаем предыдущую пульсацию если была.
    try { this._bossBgTween?.stop?.(); this._bossBgTween = null; } catch(_) {}

    // Уровень 0 = цвет типа босса (fire/ice/...); 1–3 — общая тревожная палитра.
    const typeHex = (this._state?.active?.boss_bg_hex | 0) || 0x4a3a5a;
    const presets = {
      0: { color: typeHex,  alpha: 0.10 }, // амбиент по типу босса
      1: { color: 0xd4a530, alpha: 0.12 }, // тревожный жёлтый
      2: { color: 0xd4642a, alpha: 0.18 }, // опасный оранж
      3: { color: 0xd8202c, alpha: 0.24 }, // ярость красный
    };
    const p = presets[lvl] || presets[0];
    try {
      this._bossBgOverlay.setFillStyle(p.color, 1);
      // плавный переход альфы
      this.tweens.add({
        targets: this._bossBgOverlay,
        alpha: p.alpha,
        duration: 500,
        ease: 'Sine.easeOut',
      });
      // пульсация только на 3-м уровне
      if (lvl === 3) {
        this._bossBgTween = this.tweens.add({
          targets: this._bossBgOverlay,
          alpha: { from: 0.18, to: 0.30 },
          duration: 900,
          yoyo: true,
          repeat: -1,
          delay: 500,
        });
      }
    } catch(_) {}
  },

  _clearBossBg() {
    try { this._bossBgTween?.stop?.(); } catch(_) {}
    try { this._bossBgOverlay?.destroy?.(); } catch(_) {}
    this._bossBgTween = null;
    this._bossBgOverlay = null;
    this._bossBgLevel = undefined;
  },

  /* ── Портрет босса — медальон с эмодзи ─────────────────────── */
  _renderBossPortrait(W, y, emoji, typeHex) {
    const cx = W / 2;
    const R  = 38;
    const cy = y + R + 8;

    // Мягкое свечение цвета типа босса
    const glw = this.add.graphics().setDepth(2);
    glw.fillStyle(typeHex, 0.18);
    glw.fillCircle(cx, cy, R + 14);
    glw._wbChild = true;

    // Цветное кольцо
    const ring = this.add.graphics().setDepth(3);
    ring.lineStyle(2, typeHex, 0.80);
    ring.strokeCircle(cx, cy, R + 3);
    ring._wbChild = true;

    // Тёмный круг-фон
    const bg = this.add.graphics().setDepth(3);
    bg.fillStyle(0x0d0b1e, 0.97);
    bg.fillCircle(cx, cy, R);
    bg._wbChild = true;

    // Большой эмодзи босса
    const et = this.add.text(cx, cy, emoji, { fontSize: '52px', resolution: 2 })
                  .setOrigin(0.5).setDepth(4);
    et._wbChild = true;

    // Пульсация кольца при уязвимости
    try {
      if (this._state?.active?.vulnerable) {
        this.tweens.add({
          targets: ring, alpha: { from: 0.5, to: 1.0 },
          duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      }
    } catch(_) {}

    return (R + 8) * 2 + 6; // высота блока
  },

});
