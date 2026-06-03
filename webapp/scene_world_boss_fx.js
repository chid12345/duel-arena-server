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

    // 2) Появился новый бит в crown_flags → shake + тост + дрожь босса.
    const oldCF = prevA.crown_flags | 0;
    const newCF = newA.crown_flags  | 0;
    const added = (~oldCF) & newCF; // только новые биты
    if (added) {
      const labels = newA.crown_labels || {};
      this._fxDomShake();  // видимая тряска боя (DOM)
      // бит 0 = 75% (лёгкий), бит 1 = 50% (средний), бит 2 = 25% (тяжёлый).
      if (added & 0b100) {            // 25% — имя фишки + Хаос
        this._fxShake('heavy'); this._fxBossTremble('heavy');
        this._fxHtmlAnnounce(labels[4] || 'ХАОС', '#ff5a3c', true);
        this._fxBossEvent('25% · ' + (labels[4] || 'Хаос'), '#ff5a3c');
        this._fxChaosOverlay();
      } else if (added & 0b010) {     // 50% — анонс ярости покажет _fxEnrageAnnounce
        this._fxShake('medium'); this._fxBossTremble('medium');
      } else if (added & 0b001) {     // 75% — имя фишки если включена, иначе общий
        this._fxShake('light'); this._fxBossTremble('light');
        this._fxHtmlAnnounce(labels[1] || 'КОРОННЫЙ УДАР', '#ffaa3c');
        this._fxBossEvent('75% · ' + (labels[1] || 'Коронный удар'), '#ffaa3c');
      } else {
        this._fxShake('light');
      }
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

    // 4) Переход 1→2 стадия (ярость на 50% HP) → анонс с именем фишки типа.
    const prevStage = (prevA.stage | 0) || 1;
    const newStage  = (newA.stage  | 0) || 1;
    if (newStage >= 2 && prevStage < 2) {
      this._fxEnrageAnnounce((newA.crown_labels || {})[2]);
    }
  },

  _fxEnrageAnnounce(abilityName) {
    if (this._enrageShown) return;
    this._enrageShown = true;
    try { this._fxShake('heavy'); } catch(_) {}
    try { this._fxDomShake(); } catch(_) {}
    try { this._fxBossTremble('heavy'); } catch(_) {}
    try { this._fxBossEnragedGlow(); } catch(_) {}
    try { this._fxHtmlAnnounce(abilityName || 'БОСС РАЗЪЯРЁН', '#ff6a30', true); } catch(_) {}
    try { this._fxBossEvent('50% · ' + (abilityName || 'Ярость'), '#ff6a30'); } catch(_) {}
    try { tg?.HapticFeedback?.notificationOccurred?.('warning'); } catch(_) {}
    try {
      const W = this.W, H = this.H;
      // Имя фишки типа (напр. «Плавится ядро») или общий «Босс разъярён».
      const head = abilityName ? `⚡ ${String(abilityName).toUpperCase()} ⚡` : '⚡ БОСС РАЗЪЯРЁН ⚡';
      const lbl = txt(this, W/2, H/2, head, 22, '#ff6a30')
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

  // Тост с именем фишки сверху-центра (короны/пороги, кроме 50% и 25%).
  _fxAbilityToast(text, color) {
    try {
      const W = this.W, H = this.H;
      const lbl = txt(this, W/2, H * 0.34, `⚡ ${String(text).toUpperCase()} ⚡`,
                      18, color || '#ff8a3c').setOrigin(0.5).setDepth(10001);
      lbl.setStroke('#200000', 5);
      this.tweens.add({
        targets: lbl, alpha: { from: 1, to: 0 },
        y: H * 0.28, scale: { from: 0.9, to: 1.25 },
        duration: 1600, ease: 'Sine.easeOut',
        onComplete: () => { try { lbl.destroy(); } catch(_) {} },
      });
    } catch(_) {}
  },

  // Картинка босса дёргается (CSS-класс на #wb-boss-zone, авто-снятие).
  _fxBossTremble(intensity) {
    try {
      const z = document.getElementById('wb-boss-zone');
      if (!z) return;
      z.classList.remove('wb-rage-quake'); void z.offsetWidth; // рестарт анимации
      z.classList.add('wb-rage-quake');
      const dur = intensity === 'heavy' ? 700 : intensity === 'medium' ? 480 : 340;
      setTimeout(() => { try { z.classList.remove('wb-rage-quake'); } catch(_) {} }, dur);
    } catch(_) {}
  },

  // Стойкое алое свечение зоны после ярости (до конца рейда / пересоздания).
  _fxBossEnragedGlow() {
    try { document.getElementById('wb-boss-zone')?.classList.add('wb-enraged'); } catch(_) {}
  },

  // ── HTML-эффекты: бой рисуется DOM-слоем поверх Phaser, поэтому тосты/тряска
  //    должны быть в DOM, иначе их не видно (Phaser-текст лежит ПОД боем). ──
  _fxEnsureCss() {
    if (document.getElementById('wb-fx-css')) return;
    const s = document.createElement('style'); s.id = 'wb-fx-css';
    s.textContent = `
      .wb-fx-ann{position:fixed;left:50%;top:30%;transform:translate(-50%,-50%) scale(.7);
        z-index:2147483000;pointer-events:none;font-weight:900;letter-spacing:1px;
        text-align:center;white-space:nowrap;padding:10px 18px;border-radius:14px;
        background:rgba(10,0,20,.62);border:1px solid rgba(255,120,60,.45);
        text-shadow:0 0 14px rgba(0,0,0,.9);opacity:0;
        animation:wb-fx-pop 1.9s cubic-bezier(.2,1,.4,1) forwards;}
      @keyframes wb-fx-pop{
        0%{opacity:0;transform:translate(-50%,-50%) scale(.7)}
        14%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}
        26%{transform:translate(-50%,-50%) scale(1)}
        78%{opacity:1}
        100%{opacity:0;transform:translate(-50%,-58%) scale(1.04)}}
      #wb-root.wb-fx-shake{animation:wb-fx-shk .42s ease-in-out;}
      @keyframes wb-fx-shk{0%,100%{transform:translate(0,0)}
        15%{transform:translate(-5px,3px)}30%{transform:translate(6px,-3px)}
        45%{transform:translate(-6px,-2px)}60%{transform:translate(5px,3px)}
        75%{transform:translate(-3px,2px)}}
      .wb-fx-events{position:fixed;left:8px;top:62px;z-index:2147482000;pointer-events:none;
        display:flex;flex-direction:column;gap:4px;max-width:64%;}
      .wb-fx-evt{font-size:11px;font-weight:800;line-height:1.25;padding:4px 9px;border-radius:9px;
        background:rgba(8,0,18,.72);border:1px solid rgba(255,120,60,.4);color:#ffd0a8;
        box-shadow:0 2px 8px rgba(0,0,0,.55);opacity:0;
        animation:wb-fx-evt-in .25s ease forwards;}
      @keyframes wb-fx-evt-in{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:none}}
    `;
    document.head.appendChild(s);
  },

  // Видимый поверх боя тост-анонс фишки (DOM).
  _fxHtmlAnnounce(text, color, big) {
    try {
      this._fxEnsureCss();
      const host = document.getElementById('wb-root') || document.body;
      const el = document.createElement('div');
      el.className = 'wb-fx-ann';
      el.style.color = color || '#ffae5c';
      el.style.fontSize = (big ? 23 : 17) + 'px';
      el.style.borderColor = (color || '#ff7a3c') + '88';
      el.textContent = '⚡ ' + String(text).toUpperCase() + ' ⚡';
      host.appendChild(el);
      setTimeout(() => { try { el.remove(); } catch(_) {} }, 2000);
    } catch(_) {}
  },

  // Накопительная лента событий босса слева — висит ~8с, до 4 строк.
  // Чтобы не прозевать порог в быстром бою (баннер мелькает, а тут остаётся).
  _fxBossEvent(text, color) {
    try {
      this._fxEnsureCss();
      const host = document.getElementById('wb-root') || document.body;
      let box = document.getElementById('wb-fx-events');
      if (!box) {
        box = document.createElement('div');
        box.id = 'wb-fx-events'; box.className = 'wb-fx-events';
        host.appendChild(box);
      }
      // Новый рейд → чистим ленту прошлого боя (spawn_id сменился).
      const sid = String(this._state?.active?.spawn_id || '');
      if (box.dataset.spawn !== sid) { box.innerHTML = ''; box.dataset.spawn = sid; }
      const line = document.createElement('div');
      line.className = 'wb-fx-evt';
      if (color) { line.style.borderColor = color + '88'; line.style.color = color; }
      line.textContent = text;
      box.appendChild(line);
      // Висят ВЕСЬ бой (не 8 сек) — чтобы порог нельзя было прозевать.
      while (box.children.length > 5) box.removeChild(box.firstChild);
    } catch(_) {}
  },

  // DOM-тряска всего боевого экрана (Phaser-камера не видна под HTML-боем).
  _fxDomShake() {
    try {
      const r = document.getElementById('wb-root');
      if (!r) return;
      r.classList.remove('wb-fx-shake'); void r.offsetWidth;
      r.classList.add('wb-fx-shake');
      setTimeout(() => { try { r.classList.remove('wb-fx-shake'); } catch(_) {} }, 450);
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
