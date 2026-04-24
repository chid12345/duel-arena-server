/* ============================================================
   WorldBossScene — UI helpers: панели, бары, кнопки, таймеры.
   Все созданные узлы помечаются `_wbChild=true`, чтобы _render()
   мог их очищать при перерисовке.
   ============================================================ */

Object.assign(WorldBossScene.prototype, {

  _addPanel(x, y, w, h) {
    const g = this.add.graphics();
    g.fillStyle(0x080018, 0.95); g.fillRoundedRect(x, y, w, h, 8);
    g.lineStyle(1, 0x2a0055, 0.9); g.strokeRoundedRect(x, y, w, h, 8);
    g._wbChild = true; return g;
  },

  _addText(x, y, s, size, color, bold) {
    const t = txt(this, x, y, s, size, color, bold);
    t._wbChild = true; return t;
  },

  _addBarPair(x, y, w, h, cur, max, col) {
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0020, 1); bg.fillRoundedRect(x, y, w, h, 4);
    bg._wbChild = true;
    const fg = this.add.graphics(); fg._wbChild = true;
    const lbl = txt(this, x + w/2, y + h/2, `${cur}/${max}`, 9, '#ffffff', true).setOrigin(0.5);
    lbl._wbChild = true;
    const draw = (c, m) => {
      fg.clear();
      const pct = m > 0 ? Math.max(0, Math.min(1, c/m)) : 0;
      fg.fillStyle(col, 1);
      fg.fillRoundedRect(x, y, Math.max(2, w * pct), h, 4);
      lbl.setText(`${c}/${m}`);
    };
    draw(cur, max);
    return { update: draw };
  },

  _addCrownRow(x, y, w, flags) {
    const g = this.add.graphics(); g._wbChild = true;
    const thirds = w / 3;
    [[0b001, '75%'], [0b010, '50%'], [0b100, '25%']].forEach(([bit, label], i) => {
      const cx = x + i * thirds + thirds / 2;
      const done = (flags & bit) !== 0;
      g.fillStyle(done ? 0xffc83c : 0x333344, 0.85);
      g.fillCircle(cx, y + 10, 7);
      const lt = txt(this, cx, y + 10, label, 8, done ? '#000' : '#888', true).setOrigin(0.5);
      lt._wbChild = true;
    });
    return g;
  },

  _bigBtn(x, y, w, h, color, label, cb) {
    const g = this.add.graphics(); g._wbChild = true;
    g.fillStyle(color, 0.97); g.fillRoundedRect(x, y, w, h, 6);
    const lt = txt(this, x + w/2, y + h/2, label, 13, '#ffffff', true).setOrigin(0.5);
    lt._wbChild = true;
    const z = this.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
    z._wbChild = true;
    // Защита от ghost-tap: pointerup после перехода сцен мог прилететь сюда
    // с pointerdown'ом от другого объекта (таббар старой сцены) → случайный удар.
    let _pressed = false;
    const _createdAt = Date.now();
    z.on('pointerdown', () => { _pressed = true; tg?.HapticFeedback?.impactOccurred('medium'); });
    // pointerout НЕ сбрасываем — на мобильном лёгкое скольжение пальца
    // вызывает pointerout до pointerup и кнопка «молчит».
    z.on('pointerup',   () => {
      if (!_pressed) return;                           // pointerdown был не на этой кнопке
      if (Date.now() - _createdAt < 200) return;       // кнопка слишком свежая — игнорим ghost-tap
      _pressed = false;
      if (typeof cb === 'function') cb();
    });
    z.on('pointercancel', () => { _pressed = false; }); // настоящая отмена (напр. входящий звонок)
    return { g, lt, z };
  },

  _toast(msg) {
    const t = txt(this, this.W/2, this.H - 150, msg, 12, '#ffffff', true).setOrigin(0.5);
    t._wbChild = true;
    this.time.delayedCall(1500, () => { try { t.destroy(); } catch(_){} });
  },

  // Большой постоянный тост — НЕ уничтожается render(), живёт 3.5с.
  // Используется для важных событий: клейм награды, сундук и т.п.
  _toastSplash(lines) {
    // Убираем предыдущий если есть
    if (this._splashEl) {
      this._splashEl.forEach(o => { try { o.destroy(); } catch(_){} });
      this._splashEl = null;
    }
    const W = this.W;
    const lineH = 22, pad = 14;
    const h = pad * 2 + lines.length * lineH;
    const y = this.H / 2 - h / 2;
    const bg = this.add.graphics().setDepth(500);
    bg.fillStyle(0x0d0020, 0.97); bg.fillRoundedRect(20, y, W - 40, h, 8);
    bg.lineStyle(2, 0xff0088, 0.8); bg.strokeRoundedRect(20, y, W - 40, h, 8);
    const texts = lines.map((l, i) => {
      const t = txt(this, W / 2, y + pad + i * lineH + lineH / 2, l.text, l.size || 12,
                    l.color || '#ffffff', !!l.bold).setOrigin(0.5).setDepth(501);
      return t;
    });
    this._splashEl = [bg, ...texts];
    this.time.delayedCall(3500, () => {
      if (this._splashEl) {
        this._splashEl.forEach(o => { try { o.destroy(); } catch(_){} });
        this._splashEl = null;
      }
    });
  },

  _fmtSec(s) {
    if (s == null || s < 0) return '—';
    const mm = Math.floor(s / 60), ss = s % 60;
    return `${mm}:${ss.toString().padStart(2, '0')}`;
  },

  _fmtCountdown(iso) {
    try {
      const target = new Date(iso).getTime();
      const delta = Math.max(0, Math.floor((target - Date.now()) / 1000));
      const hh = Math.floor(delta / 3600);
      const mm = Math.floor((delta % 3600) / 60);
      const ss = delta % 60;
      return hh > 0
        ? `${hh}:${mm.toString().padStart(2,'0')}:${ss.toString().padStart(2,'0')}`
        : `${mm}:${ss.toString().padStart(2,'0')}`;
    } catch(_) { return '—'; }
  },
});
