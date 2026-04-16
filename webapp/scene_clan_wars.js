/* ============================================================
   ClanScene._renderWars — клан-войны:
   - текущая активная война (счёт A vs B + таймер)
   - входящий вызов (Принять/Отклонить, лидеру)
   - выбор клана для вызова из топа (лидеру если нет войны)
   ============================================================ */

Object.assign(ClanScene.prototype, {

  _renderWars(W, H) {
    txt(this, W/2, 80, '⚔️ КЛАН-ВОЙНЫ', 14, '#ffc83c', true).setOrigin(0.5);
    txt(this, W/2, 100, '24ч · победа в любом бою = +1 очко · награда: 200🪙 +2💎 каждому', 9, '#a8b4d8').setOrigin(0.5);
    const load = txt(this, W/2, 150, 'Загрузка...', 12, '#a8c4ff').setOrigin(0.5);

    Promise.all([get('/api/clan/war'), get('/api/clan')]).then(([wd, cd]) => {
      load.destroy();
      if (!wd.ok) { txt(this, W/2, 150, '❌ '+(wd.reason||'Нет клана'), 12, '#dc3c46').setOrigin(0.5); return; }
      const myCid = wd.my_clan_id;
      const isLeader = !!cd.is_leader;
      const war = wd.war;
      let y = 130;

      if (war) {
        const isA = (war.clan_a === myCid);
        const myScore = isA ? war.score_a : war.score_b;
        const opScore = isA ? war.score_b : war.score_a;
        const opCid   = isA ? war.clan_b : war.clan_a;
        const status = war.status; // pending|active

        // Карточка статуса
        const cardH = 110;
        const cg = this.add.graphics();
        const stroke = status === 'active' ? 0xffc83c : 0x7ec8ff;
        cg.fillStyle(0x161920, 1); cg.fillRoundedRect(8, y, W-16, cardH, 12);
        cg.lineStyle(2, stroke, 0.85); cg.strokeRoundedRect(8, y, W-16, cardH, 12);

        if (status === 'pending') {
          const incoming = !isA;
          txt(this, W/2, y+16, incoming ? '📨 ВЫЗОВ ПРИНЯТ?' : '⏳ ОЖИДАНИЕ ОТВЕТА', 12, '#ffd166', true).setOrigin(0.5);
          txt(this, W/2, y+38, incoming ? `Клан #${war.clan_a} вызывает вас!` : `Вы вызвали клан #${war.clan_b}`, 12, '#ffffff').setOrigin(0.5);
          if (incoming && isLeader) {
            const bw = (W - 48) / 2, bh = 36, by = y + 60;
            const okG = this.add.graphics(); okG.fillStyle(0x1e3028,1); okG.fillRoundedRect(16, by, bw, bh, 8);
            okG.lineStyle(1.5, 0x60c060, 0.9); okG.strokeRoundedRect(16, by, bw, bh, 8);
            txt(this, 16+bw/2, by+bh/2, '✓ Принять', 13, '#a0e0a0', true).setOrigin(0.5);
            this.add.zone(16, by, bw, bh).setOrigin(0).setInteractive({ useHandCursor: true })
              .on('pointerup', () => this._warDecide('accept', war.id));
            const noG = this.add.graphics(); noG.fillStyle(0x2a1416,1); noG.fillRoundedRect(32+bw, by, bw, bh, 8);
            noG.lineStyle(1.5, 0xc06870, 0.9); noG.strokeRoundedRect(32+bw, by, bw, bh, 8);
            txt(this, 32+bw+bw/2, by+bh/2, '✕ Отклонить', 13, '#c06870', true).setOrigin(0.5);
            this.add.zone(32+bw, by, bw, bh).setOrigin(0).setInteractive({ useHandCursor: true })
              .on('pointerup', () => this._warDecide('decline', war.id));
          } else {
            txt(this, W/2, y+78, incoming ? 'Только лидер может ответить' : 'Жди ответа лидера соперника', 10, '#a8b4d8').setOrigin(0.5);
          }
        } else {
          // active
          txt(this, W/2, y+16, '⚔️ ИДЁТ ВОЙНА', 12, '#ffc83c', true).setOrigin(0.5);
          txt(this, W/4, y+44, 'ВЫ', 11, '#a8c4ff', true).setOrigin(0.5);
          txt(this, 3*W/4, y+44, `Клан #${opCid}`, 11, '#c08080', true).setOrigin(0.5);
          txt(this, W/4, y+66, String(myScore), 26, '#a0e0a0', true).setOrigin(0.5);
          txt(this, W/2, y+66, ':', 22, '#ffffff', true).setOrigin(0.5);
          txt(this, 3*W/4, y+66, String(opScore), 26, '#c06870', true).setOrigin(0.5);
          txt(this, W/2, y+95, '⏱️ ' + this._formatTimeLeft(war.ends_at), 11, '#ffd166', true).setOrigin(0.5);
        }
        y += cardH + 12;
      } else if (isLeader) {
        // Нет войны — лидер может вызвать клан из топа
        txt(this, W/2, y+10, 'ВЫЗВАТЬ КЛАН НА ВОЙНУ', 11, '#a8b4d8', true).setOrigin(0.5);
        y += 32;
        get('/api/clan/top').then(d => {
          (d.clans||[]).filter(c => c.id !== myCid).slice(0,5).forEach(c => {
            const bg = this.add.graphics();
            bg.fillStyle(0x141720,1); bg.fillRoundedRect(8, y, W-16, 38, 8);
            bg.lineStyle(1, 0x2a3460, 0.8); bg.strokeRoundedRect(8, y, W-16, 38, 8);
            const EM = { light:'☀️', dark:'🌑', neutral:'⚖️' };
            txt(this, 16, y+19, EM[c.emblem]||'⚖️', 14).setOrigin(0,0.5);
            txt(this, 38, y+19, `[${c.tag}] ${c.name.slice(0,12)}`, 12, '#ffffff', true).setOrigin(0,0.5);
            const bw = 72, bh = 26, bx = W-12-bw, by = y + 6;
            const cb = this.add.graphics();
            cb.fillStyle(0x2a1416,1); cb.fillRoundedRect(bx, by, bw, bh, 7);
            cb.lineStyle(1, 0xc06870, 0.9); cb.strokeRoundedRect(bx, by, bw, bh, 7);
            txt(this, bx+bw/2, by+bh/2, '⚔️ Вызвать', 10, '#ffd166', true).setOrigin(0.5);
            this.add.zone(bx, by, bw, bh).setOrigin(0).setInteractive({ useHandCursor: true })
              .on('pointerup', () => this._warChallenge(c.id, c.name));
            y += 42;
          });
        });
      } else {
        txt(this, W/2, y+20, '😴 Войн нет', 13, '#a8b4d8').setOrigin(0.5);
        txt(this, W/2, y+40, 'Только лидер может бросить вызов', 10, '#666b80').setOrigin(0.5);
      }
    }).catch(() => load.setText('❌ Нет соединения'));

    makeBackBtn(this, '← Назад', () => {
      tg?.HapticFeedback?.impactOccurred('light');
      this.scene.restart({ sub: 'main' });
    });
  },

  async _warChallenge(targetId, targetName) {
    if (this._busy) return; this._busy = true;
    try {
      const res = await post('/api/clan/war/challenge', { target_clan_id: targetId });
      if (res.ok) { tg?.HapticFeedback?.notificationOccurred('success'); this._toast('⚔️ Вызов отправлен '+targetName); this.time.delayedCall(700, ()=>this.scene.restart({sub:'wars'})); }
      else this._toast('❌ '+res.reason);
    } catch(_) { this._toast('❌ Нет соединения'); }
    this._busy = false;
  },

  async _warDecide(action, warId) {
    if (this._busy) return; this._busy = true;
    try {
      const res = await post('/api/clan/war/'+action, { war_id: warId });
      if (res.ok) { tg?.HapticFeedback?.notificationOccurred('success'); this._toast(action==='accept' ? '⚔️ Война началась!' : '❌ Отклонено'); this.time.delayedCall(700, ()=>this.scene.restart({sub:'wars'})); }
      else this._toast('❌ '+res.reason);
    } catch(_) { this._toast('❌ Нет соединения'); }
    this._busy = false;
  },

});
