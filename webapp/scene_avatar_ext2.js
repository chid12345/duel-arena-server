/* ═══════════════════════════════════════════════════════════
   AvatarScene ext2 — попап детали + покупка/экипировка
   ═══════════════════════════════════════════════════════════ */

Object.assign(AvatarScene.prototype, {

  _onAvatarTap(av) {
    if (!av) return;
    tg?.HapticFeedback?.selectionChanged();
    Sound.click();
    this._showAvatarDetail(av);
  },

  _showAvatarDetail(av) {
    const isEq = av.equipped, isUn = av.unlocked;
    const tier = _AV_TIER[av.rarity] || _AV_TIER.common;
    const pl = this._priceLabel(av);
    const isPaid = av.currency === 'stars' || av.currency === 'usdt_stars';

    // Stats pills
    const stats = [];
    if (av.effective_strength)  stats.push({ label: `С +${av.effective_strength}`,  color: '#ff8888', bg: 0x441111 });
    if (av.effective_endurance) stats.push({ label: `Л +${av.effective_endurance}`, color: '#55ddff', bg: 0x113344 });
    if (av.effective_crit)      stats.push({ label: `И +${av.effective_crit}`,      color: '#cc77ff', bg: 0x331155 });
    if (av.effective_hp_flat)   stats.push({ label: `В +${av.effective_hp_flat}`,   color: '#55ff99', bg: 0x114422 });

    // Для Stars/USDT — кастомный попап с двумя кнопками
    if (isPaid && !isUn) {
      this._showPaidPopup(av, stats, tier);
      return;
    }

    // Для остальных — стандартный попап
    let actionLabel = null, actionFn = null, canAct = true;
    if (isEq) {
      actionLabel = '✓ Уже экипирован'; canAct = false;
    } else if (isUn) {
      actionLabel = '⚔️ Экипировать';
      actionFn = () => { closeItemDetailPopup(this); this._doEquip(av); };
    } else if (av.currency === 'free') {
      actionLabel = '🆓 Получить бесплатно';
      actionFn = () => { closeItemDetailPopup(this); this._doBuyGold(av); };
    } else if (av.currency === 'gold') {
      const p = State.player;
      canAct = p && (p.gold || 0) >= av.price;
      actionLabel = canAct ? `🪙 ${av.price} — Купить` : `Нужно ${av.price} 💰`;
      actionFn = () => { if (!canAct) return; closeItemDetailPopup(this); this._doBuyGold(av); };
    } else if (av.currency === 'diamonds') {
      const p = State.player;
      canAct = p && (p.diamonds || 0) >= av.price;
      actionLabel = canAct ? `💎 ${av.price} — Купить` : `Нужно ${av.price} 💎`;
      actionFn = () => { if (!canAct) return; closeItemDetailPopup(this); this._doBuyGold(av); };
    } else if (av.currency === 'subscription') {
      actionLabel = '👑 Нужна Premium подписка'; canAct = false;
    } else if (av.currency === 'referral') {
      actionLabel = '🤝 Пригласи 5+ друзей'; canAct = false;
    }

    showItemDetailPopup(this, {
      icon: av.badge || '?',
      name: (av.name || av.id).replace(/^[^\s]+\s/, ''),
      desc: av.description || '',
      stats, badge: tier.label, canAct, actionLabel, actionFn,
      currency: av.currency === 'diamonds' ? 'diamonds' : 'gold',
    });
  },

  /* ─── Попап для Stars/USDT аватарок с двумя кнопками ─── */
  _showPaidPopup(av, stats, tier) {
    closeItemDetailPopup(this);
    const W = this.W, H = this.H;
    const layer = []; this._itemDetailLayer = layer;
    const dB = 200;
    const openedAt = Date.now();

    // Dim
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.82).setDepth(dB).setInteractive();
    dim.on('pointerup', () => { if (Date.now() - openedAt > 250) closeItemDetailPopup(this); });
    layer.push(dim);

    const pW = W - 40, pX = 20, pH = 270, pY = Math.round((H - pH) / 2);

    // Panel
    const pg = this.add.graphics().setDepth(dB + 1);
    pg.fillStyle(C.bgPanel, 0.98); pg.fillRoundedRect(pX, pY, pW, pH, 14);
    pg.lineStyle(2, C.gold, 0.4); pg.strokeRoundedRect(pX, pY, pW, pH, 14);
    layer.push(pg);

    // Block zone
    const bz = this.add.zone(pX + pW / 2, pY + pH / 2, pW, pH).setInteractive().setDepth(dB + 1);
    bz.on('pointerup', () => {}); layer.push(bz);

    // Close X
    const cg = this.add.graphics().setDepth(dB + 2);
    cg.fillStyle(0x3a2020, 1); cg.fillRoundedRect(pX + pW - 34, pY + 8, 26, 22, 7);
    cg.lineStyle(1, 0xff6666, 0.6); cg.strokeRoundedRect(pX + pW - 34, pY + 8, 26, 22, 7);
    layer.push(cg);
    layer.push(txt(this, pX + pW - 21, pY + 19, '✕', 12, '#ffaaaa', true).setOrigin(0.5).setDepth(dB + 3));
    const cz = this.add.zone(pX + pW - 21, pY + 19, 30, 26).setInteractive({ useHandCursor: true }).setDepth(dB + 4);
    cz.on('pointerup', () => { if (Date.now() - openedAt > 250) closeItemDetailPopup(this); });
    layer.push(cz);

    let cy = pY + 16;
    const cx = W / 2;

    // Icon + Name
    layer.push(txt(this, cx, cy + 18, av.badge || '?', 32).setOrigin(0.5).setDepth(dB + 2));
    cy += 40;
    layer.push(txt(this, cx, cy, (av.name || '').replace(/^[^\s]+\s/, ''), 14, '#ffe888', true).setOrigin(0.5).setDepth(dB + 2));
    cy += 18;
    layer.push(txt(this, cx, cy, tier.label, 10, tier.lc, true).setOrigin(0.5).setDepth(dB + 2));
    cy += 16;

    // Stats pills
    if (stats.length) {
      const pillW = Math.min(70, Math.floor((pW - 48) / stats.length) - 4);
      const totalPW = stats.length * (pillW + 4) - 4;
      let px = cx - totalPW / 2;
      stats.forEach(s => {
        const spg = this.add.graphics().setDepth(dB + 2);
        spg.fillStyle(s.bg || 0x222230, 0.9); spg.fillRoundedRect(px, cy, pillW, 18, 6);
        layer.push(spg);
        layer.push(txt(this, px + pillW / 2, cy + 9, s.label, 9, s.color, true).setOrigin(0.5).setDepth(dB + 3));
        px += pillW + 4;
      });
      cy += 26;
    }

    // Description
    const descObj = this.add.text(cx, cy, av.description || '', {
      fontSize: '12px', fontFamily: 'Arial', color: '#c8a878', align: 'center',
      wordWrap: { width: pW - 48 }, lineSpacing: 4,
    }).setOrigin(0.5, 0).setDepth(dB + 2);
    layer.push(descObj);
    cy += descObj.height + 12;

    // Stars button
    const starsPrice = av.currency === 'usdt_stars' ? '590' : String(av.price || 50);
    const btnW = pW - 40, btnH = 36, btnX = pX + 20;
    const sg = this.add.graphics().setDepth(dB + 2);
    sg.fillStyle(0x0e2838, 1); sg.fillRoundedRect(btnX, cy, btnW, btnH, 10);
    sg.lineStyle(2, 0x3cc8dc, 0.7); sg.strokeRoundedRect(btnX, cy, btnW, btnH, 10);
    layer.push(sg);
    layer.push(txt(this, cx, cy + btnH / 2, `⭐ ${starsPrice} Stars — Купить`, 13, '#3ce8ff', true).setOrigin(0.5).setDepth(dB + 3));
    const sz = this.add.zone(cx, cy + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true }).setDepth(dB + 4);
    sz.on('pointerup', () => { closeItemDetailPopup(this); this._doBuyStars(av); });
    layer.push(sz);
    cy += btnH + 8;

    // USDT button
    const usdtPrice = av.usdt_price || (av.currency === 'usdt_stars' ? '11.99' : '1.00');
    const ug = this.add.graphics().setDepth(dB + 2);
    ug.fillStyle(0x1a3a1a, 1); ug.fillRoundedRect(btnX, cy, btnW, btnH, 10);
    ug.lineStyle(2, 0x44cc66, 0.7); ug.strokeRoundedRect(btnX, cy, btnW, btnH, 10);
    layer.push(ug);
    layer.push(txt(this, cx, cy + btnH / 2, `💵 $${usdtPrice} USDT — Купить`, 13, '#88ffaa', true).setOrigin(0.5).setDepth(dB + 3));
    const uz = this.add.zone(cx, cy + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true }).setDepth(dB + 4);
    uz.on('pointerup', () => { closeItemDetailPopup(this); this._doBuyCrypto(av); });
    layer.push(uz);

    // Animate
    layer.forEach(o => { if (o !== dim && o.setAlpha) o.setAlpha(0); });
    this.tweens.add({ targets: layer.filter(o => o !== dim && o.setAlpha), alpha: 1, duration: 180, ease: 'Power2' });
  },

  /* ─── API ─── */
  async _doBuyGold(av) {
    try {
      const j = await post('/api/avatars/buy', { avatar_id: av.id });
      if (j.ok) {
        if (j.player) State.player = j.player;
        if (j.avatars) { State.avatarsCache = { avatars: j.avatars, equipped: this._equipped, at: Date.now() }; }
        else { State.avatarsCache = null; }
        tg?.HapticFeedback?.notificationOccurred('success');
        this.scene.restart({ tab: this._tab });
      } else { tg?.showAlert?.(j.reason || 'Ошибка'); }
    } catch (_) { tg?.showAlert?.('Ошибка сети'); }
  },

  async _doEquip(av) {
    try {
      const j = await post('/api/avatars/equip', { avatar_id: av.id });
      if (j.ok) {
        if (j.player) State.player = j.player;
        if (j.avatars) { State.avatarsCache = { avatars: j.avatars, equipped: av.id, at: Date.now() }; }
        else { State.avatarsCache = null; }
        State.avatarId = av.id;
        try { localStorage.setItem('da_avatar', av.id); } catch(_) {}
        const menu = this.scene.get('Menu');
        if (menu?._panels?.profile) { menu._panels.profile.destroy(); menu._panels.profile = null; }
        tg?.HapticFeedback?.notificationOccurred('success');
        this.scene.restart({ tab: this._tab });
      } else { tg?.showAlert?.(j.reason || 'Ошибка'); }
    } catch (_) { tg?.showAlert?.('Ошибка сети'); }
  },

  async _doBuyStars(av) {
    const isElite = av.currency === 'usdt_stars';
    const url = isElite ? '/api/avatars/elite/stars_invoice' : '/api/avatars/premium/stars_invoice';
    const cUrl = isElite ? '/api/avatars/elite/stars_confirm' : '/api/avatars/premium/stars_confirm';
    try {
      const j = await post(url, { avatar_id: av.id });
      if (j.ok && j.invoice_url) {
        if (typeof tg?.openInvoice !== 'function') {
          const _au = j.invoice_url || '';
          try {
            if (_au.startsWith('https://t.me/') || _au.startsWith('tg://')) tg?.openTelegramLink?.(_au);
            else tg?.openLink?.(_au);
          } catch(_) {}
          if (_au) try { window.open(_au, '_blank'); } catch(_) {}
          tg?.showAlert?.('⭐ Счёт Stars открыт — оплатите и вернитесь');
          return;
        }
        tg.openInvoice(j.invoice_url, async (status) => {
          if (status === 'paid' || status === 'pending') {
            let confirmed = false;
            if (status === 'paid') {
              try {
                const r = await post(cUrl, { avatar_id: av.id });
                if (r.ok && r.avatars && r.avatars.length) {
                  // Применяем ответ сервера напрямую — нет лишнего GET запроса
                  this._avatars = r.avatars;
                  if (r.player) State.player = r.player;
                  confirmed = true;
                  closeItemDetailPopup(this);
                  tg?.HapticFeedback?.notificationOccurred('success');
                  this._renderList();
                  return;
                }
              } catch (_) {}
            }
            // fallback: полный рестарт (бот-хендлер должен был разблокировать)
            tg?.HapticFeedback?.notificationOccurred('success');
            this.scene.restart({ tab: this._tab });
          }
        });
      } else { tg?.showAlert?.(j.reason || 'Ошибка'); }
    } catch (_) { tg?.showAlert?.('Ошибка сети'); }
  },

  async _doBuyCrypto(av) {
    const isElite = av.currency === 'usdt_stars';
    const url = isElite ? '/api/avatars/elite/crypto_invoice' : '/api/avatars/premium/crypto_invoice';
    try {
      const j = await post(url, { avatar_id: av.id });
      if (j.ok && j.invoice_url) {
        const _u2 = j.invoice_url || '';
        if (j.web_app_url) tg?.openLink?.(j.web_app_url);
        else if (_u2.includes('startapp=')) tg?.openLink?.(_u2);
        else tg?.openTelegramLink?.(_u2);
        // Подписываемся на WS-событие avatar_unlocked: обновим сцену когда придёт
        const _prevHandler = State.ws?.onmessage;
        if (State.ws) {
          State.ws.onmessage = (e) => {
            try {
              const msg = JSON.parse(e.data);
              if (msg.event === 'avatar_unlocked') {
                State.ws.onmessage = _prevHandler;
                tg?.HapticFeedback?.notificationOccurred('success');
                this.scene.restart({ tab: this._tab });
                return;
              }
            } catch (_) {}
            if (_prevHandler) _prevHandler(e);
          };
        }
      } else { tg?.showAlert?.(j.reason || 'Ошибка'); }
    } catch (_) { tg?.showAlert?.('Ошибка сети'); }
  },
});
