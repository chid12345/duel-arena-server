/* ============================================================
   MenuScene — ext5b: _buildInviteStats, _buildInviteInfo,
                      _soon, _toast
   ============================================================ */

Object.assign(MenuScene.prototype, {

  _buildInviteStats(rd, px, pw, cY, D, at, statsObjs, activeTab) {
    const link         = rd.link || `https://t.me/ZenDuelArena_bot?start=ref_${State.player?.user_id}`;
    const inv          = rd.invited_count     || 0;
    const prem         = rd.paying_subscribers || 0;
    const usdtBal      = rd.usdt_balance       || 0;
    const usdtTotal    = rd.total_reward_usdt  || 0;
    const canWithdraw  = rd.can_withdraw       || false;
    const cooldownH    = rd.cooldown_hours     || 0;
    const withdrawMin  = rd.withdraw_min       || 5;

    const stW = (pw - 32) / 2;
    const s1x = px+12, s2x = px+16+stW, sH = 50;

    const s1 = this.add.graphics().setDepth(D);
    s1.fillStyle(0x2a50a0,1); s1.fillRoundedRect(s1x,cY,stW,sH,10);
    s1.lineStyle(1.5,0x5096ff,0.6); s1.strokeRoundedRect(s1x,cY,stW,sH,10);
    const s1l = at(s1x+stW/2, cY+14, '👥 Приглашено',  11, '#a8c4ff');
    const s1v = at(s1x+stW/2, cY+34, `${inv}`, 18, '#ffffff', true);

    const s2 = this.add.graphics().setDepth(D);
    s2.fillStyle(0x2a50a0,1); s2.fillRoundedRect(s2x,cY,stW,sH,10);
    s2.lineStyle(1.5,0xffc83c,0.5); s2.strokeRoundedRect(s2x,cY,stW,sH,10);
    const s2l = at(s2x+stW/2, cY+14, '💰 USDT заработано', 11, '#a8c4ff');
    const s2v = at(s2x+stW/2, cY+34, `$${usdtTotal.toFixed(2)}`, 18, '#ffc83c', true);

    let premTxt = null;
    if (prem > 0) premTxt = at(px+pw/2, cY+sH+10, `⭐ Из них купили Premium: ${prem}`, 11, '#ffc83c');

    const balY = cY + sH + (prem > 0 ? 28 : 12);
    let balObjs = [];
    if (usdtBal > 0) {
      const balBg = this.add.graphics().setDepth(D);
      balBg.fillStyle(0x1a4a18, 1); balBg.fillRoundedRect(px+10, balY, pw-20, 38, 9);
      balBg.lineStyle(1.5, 0x3cc864, 0.7); balBg.strokeRoundedRect(px+10, balY, pw-20, 38, 9);
      const balL = at(px+pw/2, balY+12, '💸 Доступно к выводу', 11, '#a8ffb8');
      const balV = at(px+pw/2, balY+28, `$${usdtBal.toFixed(4)} USDT`, 14, '#3cc864', true);
      balObjs = [balBg, balL, balV];
    } else {
      const noBalT = at(px+pw/2, balY+10, `Баланс: $0.00 — зарабатывай приглашая`, 11, '#aaaaff');
      balObjs = [noBalT];
    }
    statsObjs.push(...balObjs);

    const lbY = balY + (usdtBal > 0 ? 48 : 28);
    const lbLbl = at(px+pw/2, lbY, 'Твоя реферальная ссылка:', 11, '#a8c4ff');
    const lb = this.add.graphics().setDepth(D);
    lb.fillStyle(0x0e2060,1); lb.fillRoundedRect(px+10,lbY+12,pw-20,28,8);
    lb.lineStyle(1,0x5096ff,0.5); lb.strokeRoundedRect(px+10,lbY+12,pw-20,28,8);
    const lbTxt = at(px+pw/2, lbY+26, link.replace('https://',''), 10, '#7ab4ff');

    const cbY = lbY + 50;
    const halfW = (pw - 28) / 2;
    const cbg = this.add.graphics().setDepth(D);
    cbg.fillStyle(0x3a7aff,1); cbg.fillRoundedRect(px+10,cbY,halfW,38,10);
    cbg.fillStyle(0xffffff,0.12); cbg.fillRoundedRect(px+10,cbY+2,halfW,16,8);
    const cbT = at(px+10+halfW/2, cbY+19, '📋 Скопировать', 12, '#ffffff', true);
    const cbZ = this.add.zone(px+10,cbY,halfW,38).setOrigin(0).setDepth(65)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { cbg.clear(); cbg.fillStyle(0x2060e0,1); cbg.fillRoundedRect(px+10,cbY,halfW,38,10); })
      .on('pointerout',  () => { cbg.clear(); cbg.fillStyle(0x3a7aff,1); cbg.fillRoundedRect(px+10,cbY,halfW,38,10); cbg.fillStyle(0xffffff,0.12); cbg.fillRoundedRect(px+10,cbY+2,halfW,16,8); })
      .on('pointerup', () => {
        tg?.HapticFeedback?.notificationOccurred('success');
        navigator.clipboard?.writeText(link)
          .then(() => this._toast('✅ Ссылка скопирована!'))
          .catch(() => { tg?.openLink?.(link); });
      });

    const sbx = px+12+halfW+6;
    const sbg = this.add.graphics().setDepth(D);
    sbg.fillStyle(0x1a7a48,1); sbg.fillRoundedRect(sbx,cbY,halfW,38,10);
    const sbT = at(sbx+halfW/2, cbY+19, '💬 Поделиться', 12, '#ffffff', true);
    const sbZ = this.add.zone(sbx,cbY,halfW,38).setOrigin(0).setDepth(65)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { sbg.clear(); sbg.fillStyle(0x0f5030,1); sbg.fillRoundedRect(sbx,cbY,halfW,38,10); })
      .on('pointerout',  () => { sbg.clear(); sbg.fillStyle(0x1a7a48,1); sbg.fillRoundedRect(sbx,cbY,halfW,38,10); })
      .on('pointerup', () => {
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('⚔️ Присоединяйся к Duel Arena — PvP-арена в Telegram!')}`;
        tg?.openLink?.(shareUrl);
      });

    const wdY = cbY + 46;
    let wdObjs = [];

    if (canWithdraw) {
      let wdBusy = false;
      const wdg = this.add.graphics().setDepth(D);
      wdg.fillStyle(0x1a5a30,1); wdg.fillRoundedRect(px+10,wdY,pw-20,38,10);
      wdg.lineStyle(1.5,0x3cc864,0.7); wdg.strokeRoundedRect(px+10,wdY,pw-20,38,10);
      const wdT = at(px+pw/2, wdY+19, `💸  Вывести $${usdtBal.toFixed(2)} USDT`, 13, '#3cc864', true);
      const wdZ = this.add.zone(px+10,wdY,pw-20,38).setOrigin(0).setDepth(65)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { wdg.clear(); wdg.fillStyle(0x0f3820,1); wdg.fillRoundedRect(px+10,wdY,pw-20,38,10); tg?.HapticFeedback?.impactOccurred('heavy'); })
        .on('pointerout',  () => { wdg.clear(); wdg.fillStyle(0x1a5a30,1); wdg.fillRoundedRect(px+10,wdY,pw-20,38,10); wdg.lineStyle(1.5,0x3cc864,0.7); wdg.strokeRoundedRect(px+10,wdY,pw-20,38,10); })
        .on('pointerup', async () => {
          if (wdBusy) return; wdBusy = true;
          wdT.setText('⏳ Переводим через @CryptoBot...');
          tg?.HapticFeedback?.impactOccurred('heavy');
          try {
            const res = await post('/api/referral/withdraw');
            if (res.ok) {
              tg?.HapticFeedback?.notificationOccurred('success');
              wdg.clear(); wdg.fillStyle(0x0f3030,1); wdg.fillRoundedRect(px+10,wdY,pw-20,38,10);
              wdT.setText(`✅ $${res.amount?.toFixed(2)} USDT отправлен!`).setStyle({ color:'#7affb8' });
              this._toast('✅ USDT отправлен через @CryptoBot!');
            } else if (res.cryptobot_required) {
              wdT.setText(`💸  Вывести $${usdtBal.toFixed(2)} USDT`);
              this._toast('📲 Откройте @CryptoBot в Telegram один раз');
              tg?.openLink?.('https://t.me/CryptoBot');
              wdBusy = false;
            } else {
              wdT.setText(`💸  Вывести $${usdtBal.toFixed(2)} USDT`);
              this._toast(`❌ ${res.reason}`);
              wdBusy = false;
            }
          } catch(_) {
            wdT.setText(`💸  Вывести $${usdtBal.toFixed(2)} USDT`);
            this._toast('❌ Нет соединения');
            wdBusy = false;
          }
        });
      wdObjs = [wdg, wdT, wdZ];
    } else if (cooldownH > 0) {
      const cdg = this.add.graphics().setDepth(D);
      cdg.fillStyle(0x1e2240, 1); cdg.fillRoundedRect(px+10,wdY,pw-20,38,10);
      cdg.lineStyle(1, 0x444488, 0.5); cdg.strokeRoundedRect(px+10,wdY,pw-20,38,10);
      const cdT = at(px+pw/2, wdY+13, `⏳ Следующий вывод через ${cooldownH}ч`, 12, '#6060aa');
      const cdS = at(px+pw/2, wdY+29, 'Вывод доступен раз в сутки', 10, '#bbbbee');
      wdObjs = [cdg, cdT, cdS];
    } else {
      const ng = this.add.graphics().setDepth(D);
      ng.fillStyle(0x1a1a30, 1); ng.fillRoundedRect(px+10,wdY,pw-20,38,10);
      ng.lineStyle(1, 0x333366, 0.5); ng.strokeRoundedRect(px+10,wdY,pw-20,38,10);
      const nT = at(px+pw/2, wdY+13, `💰 Минимум $${withdrawMin} для вывода`, 12, '#aaaaff');
      const nS = at(px+pw/2, wdY+29, `У вас: $${usdtBal.toFixed(2)} USDT · зарабатывай больше`, 10, '#bbbbee');
      wdObjs = [ng, nT, nS];
    }
    statsObjs.push(...wdObjs);

    statsObjs.push(s1,s1l,s1v, s2,s2l,s2v, lb,lbLbl,lbTxt, cbg,cbT,cbZ, sbg,sbT,sbZ);
    if (premTxt) statsObjs.push(premTxt);
    statsObjs.forEach(o => o?.setVisible?.(activeTab === 'stats'));
  },

  _buildInviteInfo(px, pw, cY, D, at, infoObjs, activeTab) {
    const iY = cY;
    const rows = [
      { icon:'1️⃣', title:'Поделись ссылкой с другом',              sub:'Кнопка «Скопировать» на вкладке «Статистика»' },
      { icon:'2️⃣', title:'Друг регистрируется по ссылке',          sub:'Один раз — привязка навсегда' },
      { icon:'3️⃣', title:'Друг покупает Premium — ты получаешь USDT', sub:'Бонус USDT зачисляется автоматически' },
    ];
    rows.forEach((r, i) => {
      const ry = iY + i * 44;
      const rg = this.add.graphics().setDepth(D).setVisible(false);
      rg.fillStyle(0x2a50a0,1); rg.fillRoundedRect(px+10,ry,pw-20,40,9);
      const ri = at(px+28, ry+20, r.icon, 14).setVisible(false);
      const rt = txt(this, px+48, ry+11, r.title, 12, '#f0f0fa', true).setDepth(D).setVisible(false);
      const rs = txt(this, px+48, ry+27, r.sub,   10, '#a8c4ff').setDepth(D).setVisible(false);
      infoObjs.push(rg, ri, rt, rs);
    });

    const schY = iY + rows.length * 44 + 6;
    const schTitleBg = this.add.graphics().setDepth(D).setVisible(false);
    schTitleBg.fillStyle(0x0e2060,1);
    schTitleBg.fillRoundedRect(px+10, schY, pw-20, 26, 8);
    const schTitle = at(px+pw/2, schY+13, '💰 СХЕМА ВОЗНАГРАЖДЕНИЙ', 12, '#ffc83c', true).setVisible(false);
    infoObjs.push(schTitleBg, schTitle);

    const tiers = [
      { range:'1–10 Premium-покупок',  pct:'5% разово с покупки → USDT',         col:'#7adfaa' },
      { range:'11–30 Premium-покупок', pct:'7% разово с покупки → USDT',         col:'#5ac8f0' },
      { range:'31+ Premium-покупок',   pct:'10% всегда с каждой покупки → USDT', col:'#ffc83c' },
    ];
    tiers.forEach((t, i) => {
      const ty = schY + 30 + i * 34;
      const tg2 = this.add.graphics().setDepth(D).setVisible(false);
      tg2.fillStyle(i%2===0 ? 0x243878 : 0x1e3060, 1);
      tg2.fillRoundedRect(px+10, ty, pw-20, 30, 6);
      const tl = txt(this, px+16, ty+9,  t.range, 10, '#dce8ff').setOrigin(0,0).setDepth(D).setVisible(false);
      const tv = txt(this, px+16, ty+21, t.pct,   11, t.col, true).setOrigin(0,0).setDepth(D).setVisible(false);
      infoObjs.push(tg2, tl, tv);
    });
  },

  _soon(name) { this._toast(`🚧 ${name} — скоро!`); },

  _toast(msg) {
    const { W, H } = this;
    const t = txt(this, W / 2, H - this.TAB_H - 22, msg, 12, '#ffc83c', true)
      .setOrigin(0.5).setAlpha(0).setDepth(20);
    this.tweens.add({ targets: t, alpha: 1, duration: 200, hold: 1600, yoyo: true,
      onComplete: () => t.destroy() });
  },

});
