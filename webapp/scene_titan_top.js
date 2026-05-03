/* ============================================================
   TitanTopScene — недельный топ Башни титанов
   ============================================================ */

class TitanTopScene extends Phaser.Scene {
  constructor() { super('TitanTop'); }

  shutdown() {
    this.children.getAll().forEach(o => { try { o.destroy(); } catch(_) {} });
  }

  create() {
    try { window._closeAllTabOverlays?.(); } catch(_) {}
    try { if (typeof TabBarHTML !== 'undefined') TabBarHTML.hide(); } catch(_) {}
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    _extraBg(this, W, H);
    _extraHeader(this, W, '🗿', 'ТОП БАШНИ', 'Недельный рейтинг Башни титанов');
    _extraBack(this);
    this._loading = txt(this, W / 2, H / 2, 'Загрузка...', 14, '#ddddff').setOrigin(0.5);
    get('/api/titans/top').then(d => this._render(d, W, H)).catch(() => {
      this._loading?.setText('❌ Нет соединения');
    });
  }

  _render(data, W, H) {
    this._loading?.destroy();
    if (!data.ok) {
      txt(this, W / 2, H / 2, '❌ Ошибка', 14, '#dc3c46').setOrigin(0.5);
      return;
    }
    const lb = data.leaders || [];
    txt(this, W / 2, 82, `Неделя: ${data.week_key || '-'}`, 12, '#ccccee').setOrigin(0.5);

    makePanel(this, 8, 98, W - 16, 62, 10, 0.95);
    txt(this, 16, 108, '🎁 Награды:', 12, '#ffc83c', true);
    txt(this, 16, 128, '1 место: 150💎 · 2: 90💎 · 3: 60💎 · 4-10: 25💎', 11, '#c0c0e0');
    txt(this, 16, 145, 'Титулы: Покоритель / Гроза / Титаноборец', 10, '#aaaacc');

    const listY = 172;
    txt(this, 16, listY - 18, 'ЛИДЕРЫ', 12, '#ddddff', true);
    const rowH = 40;
    const maxShow = Math.max(1, Math.floor((H - listY - 80) / rowH));

    lb.slice(0, maxShow).forEach((row, i) => {
      const ry = listY + i * rowH;
      const bg = this.add.graphics();
      bg.fillStyle(C.bgPanel, 0.86);
      bg.fillRoundedRect(8, ry, W - 16, rowH - 4, 8);
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      txt(this, 18, ry + 11, medal, i < 3 ? 14 : 11, '#ffc83c').setOrigin(0);
      txt(this, 52, ry + 9, row.username || `User${row.user_id}`, 12, '#d0d0ee', true);
      txt(this, 52, ry + 24, `🗿 Этаж: ${row.weekly_best_floor || 0}`, 11, '#bbbbcc');
      txt(this, W - 16, ry + 17, `#${row.weekly_best_floor || 0}`, 12, '#ffc83c', true).setOrigin(1, 0.5);
    });

    if (!lb.length) {
      txt(this, W / 2, H / 2 + 20, '😴 Пока никто не прошёл Башню', 13, '#ddddff').setOrigin(0.5);
    }
  }
}
