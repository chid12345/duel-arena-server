/* ============================================================
   StatsScene — распределение свободных статов
   Открывается из MenuScene: this.scene.start('Stats')
   ============================================================ */

class StatsScene extends Phaser.Scene {
  constructor() { super('Stats'); }

  init(data) {
    this._initData = data || {};
    if (data && data.player) State.player = data.player;
  }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W;
    this.H = H;
    this._busy = false;
    this._statRows = {};

    this._drawBg(W, H);
    this._buildHeader(W);
    this._buildBattleStats(W);
    this._buildStatRows(W, H);
    this._buildCombatPreview(W, H);
    this._buildAvatarBtn(W, H);
    this._buildBackBtn(W, H);

    // После restart от wardrobe-действия — открыть гардероб заново
    const d = this._initData;
    if (d.reopenWardrobe && d.wardrobePayload) {
      this._renderAvatarOverlay(d.wardrobePayload);
      if (d.toast) this._showToast(d.toast);
    }
  }

  /* ── Фон ─────────────────────────────────────────────── */
  _drawBg(W, H) {
    const g = this.add.graphics();
    g.fillGradientStyle(0x05040e, 0x05040e, 0x0c0a1c, 0x0c0a1c, 1);
    g.fillRect(0, 0, W, H);
  }

  /* ── Шапка ───────────────────────────────────────────── */
  _buildHeader(W) {
    const p = State.player;
    makePanel(this, 8, 8, W - 16, 62, 12);

    /* Кнопка «‹» занимает x=10..54 — контент начинаем с x=60 */
    // Бейдж уровня (сдвинут вправо от кнопки «‹»)
    const bg = this.add.graphics();
    bg.fillStyle(C.gold, 1);
    bg.fillRoundedRect(60, 18, 52, 26, 7);
    txt(this, 86, 31, `УР.${p.level}`, 13, '#1a1a28', true).setOrigin(0.5);

    const uname = (p.username || '').slice(0, 14);
    txt(this, 122, 20, uname, 14, '#f0f0fa', true);
    txt(this, 122, 38, `★ ${p.rating}  ·  ГЕРОЙ`, 10, '#ffc83c');

    // Счётчик свободных статов
    this._fsBadge = this._makeFsBadge(W, p.free_stats);
  }

  _makeFsBadge(W, count) {
    if (this._fsBadgeObjs) {
      this._fsBadgeObjs.forEach(o => o.destroy());
    }
    const active = count > 0;
    const bx = W - 16;
    const bg = this.add.graphics();
    bg.fillStyle(active ? C.purple : C.dark, active ? 0.85 : 0.5);
    bg.fillRoundedRect(bx - 78, 19, 78, 30, 9);
    if (active) {
      bg.lineStyle(1.5, C.purple, 0.7);
      bg.strokeRoundedRect(bx - 78, 19, 78, 30, 9);
    }
    const label = txt(this, bx - 39, 34,
      active ? `⚡ ${count} свободн.` : '✅ все вложены',
      10, active ? '#f0f0fa' : '#ddddff', active
    ).setOrigin(0.5);

    if (active) {
      this.tweens.add({
        targets: bg, alpha: 0.55,
        duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
    this._fsBadgeObjs = [bg, label];
    return { bg, label };
  }

  /* ── Боевая статистика (под заголовком) ──────────────── */
  _buildBattleStats(W) {
    const p     = State.player;
    const wins  = p.wins   || 0;
    const losses= p.losses || 0;
    const total = wins + losses;
    const wr    = total > 0 ? Math.round(wins / total * 100) : 0;
    const streak= p.win_streak || 0;

    const y = 74;
    makePanel(this, 8, y, W - 16, 34, 8, 0.85);

    const cols = [
      { v: String(wins),   sub: 'Победы',   col: '#3cc864' },
      { v: String(losses), sub: 'Пораж.',   col: '#dc3c46' },
      { v: `${wr}%`,       sub: 'Винрейт',  col: '#ffc83c' },
      { v: String(streak), sub: 'Серия 🔥', col: '#ff8844' },
    ];
    const cw = (W - 16) / cols.length;
    cols.forEach((c, i) => {
      const cx = 8 + cw * (i + 0.5);
      txt(this, cx, y + 10, c.v,   13, c.col, true).setOrigin(0.5);
      txt(this, cx, y + 24, c.sub,  8, '#ddddff').setOrigin(0.5);
    });
  }

  /* ── Строки статов ───────────────────────────────────── */
  _buildStatRows(W, H) {
    const p = State.player;

    // Заголовок секции (scan-style)
    const sepG = this.add.graphics();
    sepG.lineStyle(1, 0x1a2a50, 0.9);
    sepG.lineBetween(8, 112, W - 8, 112);
    txt(this, 14, 108, '◈  СКАНИРОВАНИЕ ГЕРОЯ', 9, '#1a3a6a').setOrigin(0, 1);

    const STATS = [
      {
        key:      'strength',
        icon:     '💪',
        label:    'Сила',
        color:    C.red,
        valFn:    q => q.strength,
        effectFn: q => `~${q.dmg} урона`,
        desc:     'Увеличивает урон по противнику',
      },
      {
        key:      'agility',
        icon:     '🤸',
        label:    'Ловкость',
        color:    C.cyan,
        valFn:    q => q.agility,
        effectFn: q => `${q.dodge_pct}% уворот`,
        desc:     'Шанс уклониться от удара',
      },
      {
        key:      'intuition',
        icon:     '💥',
        label:    'Интуиция',
        color:    C.purple,
        valFn:    q => q.intuition,
        effectFn: q => `${q.crit_pct}% крит`,
        desc:     'Шанс нанести критический удар',
      },
      {
        key:      'stamina',
        icon:     '🛡',
        label:    'Выносливость',
        color:    C.green,
        valFn:    q => q.stamina,
        effectFn: q => `${q.armor_pct}% броня`,
        desc:     '+2 HP за каждое вложение',
      },
    ];

    // Область: от 116px (после панели боевой статистики) до начала combat preview
    const areaTop = 116;
    const areaBot = H * 0.70;
    const rowH    = (areaBot - areaTop) / STATS.length;

    STATS.forEach((s, i) => {
      const y = areaTop + i * rowH;
      this._statRows[s.key] = this._buildStatRow(s, 8, y, W - 16, rowH - 5, p);
    });
  }

  shutdown() {
    this.time.removeAllEvents();
    // Явно уничтожаем все объекты сцены — гарантия что ничего не "призраком" остаётся
    this.children.getAll().forEach(o => { try { o.destroy(); } catch(_) {} });
  }
}
