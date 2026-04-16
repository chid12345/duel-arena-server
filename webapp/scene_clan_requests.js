/* ============================================================
   ClanScene — заявки на вступление:
   - подача заявки в закрытый клан (через превью)
   - список заявок для лидера (отдельный сабвью 'requests')
   ============================================================ */

Object.assign(ClanScene.prototype, {

  async _submitJoinRequest(clanId, btnT) {
    if (this._busy) return; this._busy = true;
    btnT?.setText('...');
    try {
      const res = await post('/api/clan/request_join', { clan_id: clanId });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        this._toast('📨 Заявка отправлена!');
        btnT?.setText('✔ Заявка отправлена');
      } else {
        this._toast('❌ ' + (res.reason||'Ошибка'));
        btnT?.setText('🔒 Подать заявку');
      }
    } catch(_) {
      this._toast('❌ Нет соединения');
      btnT?.setText('🔒 Подать заявку');
    }
    this._busy = false;
  },

  _renderRequests(W, H) {
    txt(this, W/2, 80, '📨 ЗАЯВКИ В КЛАН', 13, '#ffc83c', true).setOrigin(0.5);
    const load = txt(this, W/2, 140, 'Загрузка...', 12, '#a8c4ff').setOrigin(0.5);
    get('/api/clan/requests').then(d => {
      load.destroy();
      if (!d.ok) {
        txt(this, W/2, 140, '❌ '+(d.reason||'Ошибка'), 12, '#dc3c46').setOrigin(0.5);
        return;
      }
      const reqs = d.requests || [];
      if (!reqs.length) {
        txt(this, W/2, 140, '✨ Заявок пока нет', 13, '#a8c4ff').setOrigin(0.5);
        txt(this, W/2, 162, 'Игроки увидят клан в поиске и подадут заявку', 10, '#a8b4d8').setOrigin(0.5);
        return;
      }
      let y = 110; const rowH = 56;
      reqs.slice(0, Math.floor((H-200)/rowH)).forEach((r) => {
        const bg = this.add.graphics();
        bg.fillStyle(0x141720, 1); bg.fillRoundedRect(8, y, W-16, rowH-4, 9);
        bg.lineStyle(1.2, 0x2a3460, 0.85); bg.strokeRoundedRect(8, y, W-16, rowH-4, 9);

        txt(this, 16, y+8, (r.username||`User${r.user_id}`).slice(0,18), 13, '#ffffff', true);
        txt(this, 16, y+28, `Ур.${r.level}  ·  🏆 ${r.wins}`, 11, '#a8b4d8');

        // Кнопки ✓ / ✕
        const bw = 36, bh = 28, gap = 6;
        const okX = W - 14 - bw;
        const noX = okX - gap - bw;
        const by = y + (rowH-4)/2 - 14;

        const okG = this.add.graphics();
        okG.fillStyle(0x1e3028, 1); okG.fillRoundedRect(okX, by, bw, bh, 7);
        okG.lineStyle(1, 0x304838, 0.9); okG.strokeRoundedRect(okX, by, bw, bh, 7);
        txt(this, okX+bw/2, by+bh/2, '✓', 16, '#a0e0a0', true).setOrigin(0.5);
        this.add.zone(okX, by, bw, bh).setOrigin(0).setInteractive({ useHandCursor: true })
          .on('pointerup', async () => {
            tg?.HapticFeedback?.impactOccurred('medium');
            const res = await post('/api/clan/request_accept', { request_id: r.id });
            if (res.ok) { this._toast('✅ Принят!'); this.time.delayedCall(400, () => this.scene.restart({sub:'requests'})); }
            else this._toast('❌ '+res.reason);
          });

        const noG = this.add.graphics();
        noG.fillStyle(0x2a1416, 1); noG.fillRoundedRect(noX, by, bw, bh, 7);
        noG.lineStyle(1, 0x4a2024, 0.9); noG.strokeRoundedRect(noX, by, bw, bh, 7);
        txt(this, noX+bw/2, by+bh/2, '✕', 14, '#c06870', true).setOrigin(0.5);
        this.add.zone(noX, by, bw, bh).setOrigin(0).setInteractive({ useHandCursor: true })
          .on('pointerup', async () => {
            tg?.HapticFeedback?.impactOccurred('light');
            const res = await post('/api/clan/request_reject', { request_id: r.id });
            if (res.ok) { this._toast('❌ Отклонено'); this.time.delayedCall(300, () => this.scene.restart({sub:'requests'})); }
            else this._toast('❌ '+res.reason);
          });
        y += rowH;
      });
    }).catch(() => load.setText('❌ Нет соединения'));

    makeBackBtn(this, '← Назад', () => {
      tg?.HapticFeedback?.impactOccurred('light');
      this.scene.restart({ sub: 'main' });
    });
  },

});
