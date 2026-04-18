/* ============================================================
   RatingScene — ext3: _buildBossTab (топ урона в последнем рейде)
   ============================================================ */

Object.assign(RatingScene.prototype, {

  async _buildBossTab(W, H) {
    const startY = 114;
    try {
      const res = RatingScene._cache.boss ||
        (RatingScene._cache.boss = await get('/api/rating/world_boss'));
      if (!this._alive) return;
      if (!res.ok) throw new Error(res.reason || 'bad');

      if (!res.spawn) {
        txt(this, W / 2, H / 2 - 20, '☠️', 36).setOrigin(0.5);
        txt(this, W / 2, H / 2 + 24, 'Рейдов ещё не было', 14, '#ddddff').setOrigin(0.5);
        txt(this, W / 2, H / 2 + 44, 'Первый рейд скоро!', 11, '#8888aa').setOrigin(0.5);
        return;
      }

      this._renderBossTab(res, W, H, startY);
    } catch (e) {
      txt(this, W / 2, H / 2, '❌ Нет соединения', 14, '#ff4455').setOrigin(0.5);
    }
  },

  _renderBossTab(res, W, H, startY) {
    const spawn  = res.spawn;
    const top    = res.top    || [];
    const myUid  = State.player?.user_id;
    const myPos  = res.my_pos;
    const myDmg  = res.my_damage || 0;

    // ── Заголовок рейда ──────────────────────────────────────
    const statusIcon = spawn.status === 'won' ? '✅' : '💀';
    const bossLabel  = `${statusIcon} ${spawn.boss_name || 'Титан'}`;
    txt(this, W / 2, startY + 4,  bossLabel, 13, '#ffc83c', true).setOrigin(0.5);

    const endedStr = spawn.ended_at
      ? new Date(String(spawn.ended_at).replace(' ', 'T'))
          .toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
      : '—';
    txt(this, W / 2, startY + 20, `⏱ Завершён: ${endedStr}`, 11, '#ccccee').setOrigin(0.5);

    // Счётчик участников
    const partLabel = `👥 Участников: ${top.length > 0 ? spawn.total_participants || top.length : 0}`;
    txt(this, W / 2, startY + 36, partLabel, 10, '#8888bb').setOrigin(0.5);

    // ── Список топ-10 ────────────────────────────────────────
    const listY = startY + 52;
    const rowH  = 40;
    const maxShow = Math.max(1, Math.floor((H - listY - 112) / rowH));

    if (!top.length) {
      txt(this, W / 2, listY + 40, '📭 Никто не участвовал', 13, '#ddddff').setOrigin(0.5);
      return;
    }

    const medalStyles = [
      { bg: 0x201a08, bd: 0xdaa520, circle: 0xdaa520, cAlpha: 0.45, numCol: '#ffd700' },
      { bg: 0x181c28, bd: 0x7a8aaa, circle: 0x7a8aaa, cAlpha: 0.45, numCol: '#aabbcc' },
      { bg: 0x1c1610, bd: 0x8a6630, circle: 0x8a6630, cAlpha: 0.45, numCol: '#cc9955' },
    ];

    top.slice(0, maxShow).forEach((p, i) => {
      const ry   = listY + i * rowH;
      const isMe = p.user_id === myUid;
      const ms   = medalStyles[i];
      const bg   = this.add.graphics();

      if (isMe) {
        bg.fillStyle(0x141828, 0.98);
        bg.fillRoundedRect(8, ry, W - 16, rowH - 4, 8);
        bg.lineStyle(2, C.blue, 0.7);
        bg.strokeRoundedRect(8, ry, W - 16, rowH - 4, 8);
      } else if (ms) {
        bg.fillStyle(ms.bg, 0.95);
        bg.fillRoundedRect(8, ry, W - 16, rowH - 4, 8);
        bg.lineStyle(1.5, ms.bd, 0.7);
        bg.strokeRoundedRect(8, ry, W - 16, rowH - 4, 8);
      } else {
        bg.fillStyle(0x161422, 0.9);
        bg.fillRoundedRect(8, ry, W - 16, rowH - 4, 8);
        bg.lineStyle(1, 0x2a2844, 0.6);
        bg.strokeRoundedRect(8, ry, W - 16, rowH - 4, 8);
      }

      // Ранг-кружок
      const cx = 24, cy = ry + (rowH - 4) / 2;
      bg.fillStyle(ms ? ms.circle : 0x28243c, ms ? ms.cAlpha : 0.8);
      bg.fillCircle(cx, cy, 13);
      txt(this, cx, cy, `${i + 1}`, 11, ms ? ms.numCol : '#ccccee', true).setOrigin(0.5);

      // Имя + смерть
      const name    = (p.username || `User${p.user_id}`).slice(0, 12);
      const deadTag = p.is_dead ? ' 💀' : '';
      txt(this, 44, ry + 9,  name + deadTag, 13, isMe ? '#5096ff' : '#f0f0fa', isMe);
      txt(this, 44, ry + 24, `⚔️ ${p.hits_count || 0} уд.`, 10, '#aaaacc');

      // Урон справа
      const dmgK = p.total_damage >= 1000
        ? `${(p.total_damage / 1000).toFixed(1)}k`
        : `${p.total_damage}`;
      txt(this, W - 12, cy, `🔥 ${dmgK}`, 13, '#ff8844', true).setOrigin(1, 0.5);
    });

    // ── Позиция игрока (если не в топе) ─────────────────────
    if (!myPos || myPos > maxShow) {
      const myBY = H - 108;
      const myBG = this.add.graphics();
      myBG.fillStyle(0x161426, 0.97);
      myBG.fillRoundedRect(10, myBY, W - 20, 44, 10);
      myBG.fillStyle(0xff6622, 0.7);
      myBG.fillRect(18, myBY, W - 36, 2);
      myBG.lineStyle(1, 0x2a2844, 0.5);
      myBG.strokeRoundedRect(10, myBY, W - 20, 44, 10);
      txt(this, W / 2, myBY + 13, 'Ваш результат в рейде', 10, '#ccccdd').setOrigin(0.5);
      const posStr  = myPos  ? `#${myPos}` : 'не участвовал';
      const dmgStr  = myDmg  ? `🔥 ${myDmg}` : '—';
      txt(this, W / 2, myBY + 30, `${posStr}  ·  ${dmgStr}`, 14, '#ff8844', true).setOrigin(0.5);
    }
  },

});
