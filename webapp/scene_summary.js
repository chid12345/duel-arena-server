/* ============================================================
   SummaryScene — полная сводка профиля
   ============================================================ */

class SummaryScene extends Phaser.Scene {
  constructor() { super('Summary'); }

  create() {
    try { window._closeAllTabOverlays?.(); } catch(_) {}
    try { if (typeof TabBarHTML !== 'undefined') TabBarHTML.hide(); } catch(_) {}
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    _extraBg(this, W, H);

    const p = State.player;
    if (!p) { this.scene.start('Menu', {}); return; }

    _extraHeader(this, W, '📋', 'СВОДКА', `@${p.username}  ·  Уровень ${p.level}`);

    const total  = (p.wins || 0) + (p.losses || 0);
    const wr     = total > 0 ? Math.round(p.wins / total * 100) : 0;
    const scroll = this.add.container(0, 0);
    let y = 88;

    /* ── Основные числа ── */
    const statCards = [
      { label: '⭐ Рейтинг',    value: p.rating || 0,   color: '#ffc83c' },
      { label: '💎 Кристаллы', value: p.diamonds || 0,  color: '#3cc8dc' },
      { label: '🥇 Победы',    value: p.wins || 0,       color: '#3cc864' },
      { label: '💀 Поражения', value: p.losses || 0,     color: '#dc3c46' },
      { label: '⚔️ Боёв всего',value: total,             color: '#ccccee' },
      { label: '🎯 Винрейт',   value: `${wr}%`,          color: wr > 50 ? '#3cc864' : '#dc3c46' },
    ];

    const cw = (W - 40) / 2, ch = 56;
    statCards.forEach((s, i) => {
      const cx = 16 + (i % 2) * (cw + 8);
      const cy = y + Math.floor(i / 2) * (ch + 8);
      const bg = this.add.graphics();
      bg.fillStyle(C.bgPanel, 0.92);
      bg.fillRoundedRect(cx, cy, cw, ch, 10);
      bg.lineStyle(1, C.dark, 0.8);
      bg.strokeRoundedRect(cx, cy, cw, ch, 10);
      scroll.add(bg);
      scroll.add(txt(this, cx + 8, cy + 8,  s.label, 12, '#ccccee'));
      scroll.add(txt(this, cx + 8, cy + 28, String(s.value), 16, s.color, true));
    });
    y += Math.ceil(statCards.length / 2) * (ch + 8) + 12;

    /* ── Характеристики персонажа ── */
    scroll.add(txt(this, 16, y, 'ХАРАКТЕРИСТИКИ', 11, '#ddddff', true));
    y += 20;
    const attrs = [
      { n: 'STR', v: p.strength   || 0, color: C.red    },
      { n: 'AGI', v: p.agility    || 0, color: C.green  },
      { n: 'INT', v: p.intellect  || 0, color: C.blue   },
      { n: 'VIT', v: p.vitality   || 0, color: C.purple },
      { n: 'LCK', v: p.luck       || 0, color: C.gold   },
    ];
    attrs.forEach((a, i) => {
      const ax = 16 + i * ((W - 32) / 5);
      const aw = (W - 32) / 5 - 6;
      const maxV = 100;
      const pct  = Math.min(1, a.v / maxV);
      const bg2  = this.add.graphics();
      bg2.fillStyle(C.dark, 0.8);
      bg2.fillRoundedRect(ax, y, aw, 8, 4);
      bg2.fillStyle(a.color, 1);
      bg2.fillRoundedRect(ax, y, Math.max(8, Math.round(aw * pct)), 8, 4);
      scroll.add(bg2);
      scroll.add(txt(this, ax + aw / 2, y + 14, `${a.n} ${a.v}`, 11, '#ddddff').setOrigin(0.5));
    });
    y += 32;

    /* ── HP / EXP ── */
    const hpPct  = (p.current_hp || 0) / Math.max(1, p.max_hp || 1);
    const expPct = (p.exp || 0) / Math.max(1, p.exp_to_next || 1);

    scroll.add(makeBar(this, 16, y,     W - 32, 12, hpPct,  C.red,  C.dark));
    scroll.add(txt(this, W / 2, y + 6, `HP ${p.current_hp || 0}/${p.max_hp || 0}`, 11, '#f0f0fa').setOrigin(0.5));
    y += 20;
    scroll.add(makeBar(this, 16, y,     W - 32, 10, expPct, C.blue, C.dark));
    scroll.add(txt(this, W / 2, y + 5, `EXP ${p.exp || 0}/${p.exp_to_next || '?'}`, 11, '#ccccee').setOrigin(0.5));
    y += 24;

    /* ── Свободные очки ── */
    if (p.free_stats > 0) {
      const fb = this.add.graphics();
      fb.fillStyle(C.gold, 0.18);
      fb.fillRoundedRect(16, y, W - 32, 38, 10);
      fb.lineStyle(1.5, C.gold, 0.5);
      fb.strokeRoundedRect(16, y, W - 32, 38, 10);
      scroll.add(fb);
      scroll.add(txt(this, W / 2, y + 19,
        `⚡ ${p.free_stats} свободных очка характеристик`, 12, '#ffc83c').setOrigin(0.5));
      y += 48;
    }

    _extraBack(this);
  }

  shutdown() {
    this.time.removeAllEvents();
    this.children.getAll().forEach(o => { try { o.destroy(); } catch(_) {} });
  }
}
