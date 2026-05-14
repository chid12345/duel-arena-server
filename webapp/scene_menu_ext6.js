/* ============================================================
   MenuScene — ext6: _switchTab
   ============================================================ */

Object.assign(MenuScene.prototype, {

  /* Рисует аватарку в container по центру (cx,cy) радиусом r.
     Берёт badge и tier из State.player (новая система образов). */
  _drawAvatarPreview(container, cx, cy, r, _unused, level) {
    const p = State.player || {};
    const badge = p.avatar_badge || '💀';
    const tier = (p.avatar_tier || 'base').toLowerCase();

    const tierColors = {
      base:      { fill: 0x1e1e3a, ring: 0x555588 },
      gold:      { fill: 0x1a2844, ring: 0x3388cc },
      diamond:   { fill: 0x2a1444, ring: 0x8844cc },
      premium:   { fill: 0x2a1800, ring: 0xcc8822 },
      sub:       { fill: 0x2a0a20, ring: 0xff6b9d },
      referral:  { fill: 0x0a2a1a, ring: 0x44cc66 },
      elite:     { fill: 0x2a2000, ring: 0xffd700 },
    };
    const tc = tierColors[tier] || tierColors.base;

    const g = this.make.graphics({}, false);
    g.fillStyle(tc.fill, 1); g.fillCircle(cx, cy, r);
    g.lineStyle(2, tc.ring, 0.9); g.strokeCircle(cx, cy, r);
    container.add(g);

    container.add(this.make.text({ x: cx, y: cy, text: badge,
      style: { fontSize: `${Math.round(r * 1.1)}px` },
    }, false).setOrigin(0.5));
  },

  _switchTab(key) {
    // ВАЖНО: _activeTab обновляем СРАЗУ — до любых операций с объектами.
    // Если что-то ниже бросит исключение, гард в TabBar pointerup
    // ('tab.key === liveActive → return') увидит правильное состояние
    // и не заблокирует повторный тап навсегда.
    this._activeTab = key;
    try { this.cameras?.main?.setScroll?.(0, 0); } catch(_) {}

    // Слоты экипировки — HTML overlay: показываем только на профиле
    try {
      if (typeof EquipmentSlotsHTML !== 'undefined') {
        if (key === 'profile') EquipmentSlotsHTML.refresh(this);
        else                   EquipmentSlotsHTML.close();
      }
    } catch(_) {}

    // Страховка: если профильная панель пропала (уничтожена/исключение при build) —
    // перестраиваем налету, чтобы не показывать чёрный экран.
    if (key === 'profile' && !this._panels?.profile) {
      try {
        this._buildProfilePanel();
      } catch(e) {
        // Раньше ошибка глоталась → игрок видел пустой профиль и не понимал
        // что произошло. Теперь явный лог + visible баннер для диагностики.
        console.error('[ProfileBug] _buildProfilePanel failed in _switchTab:', e);
        try {
          if (window.Notif?.push) {
            window.Notif.push('⚠️', 'Ошибка профиля: ' + (e?.message || e), '#dc3c46', 4500);
          }
        } catch(_) {}
        // Делаем ОДНУ повторную попытку через 200мс — на случай если ошибка
        // была из-за гонки с lazy-load (текстуры ещё не приехали).
        if (!this._profileRetryScheduled) {
          this._profileRetryScheduled = true;
          this.time.delayedCall(200, () => {
            this._profileRetryScheduled = false;
            if (!this.scene?.isActive?.()) return;
            if (this._panels?.profile) return;
            try { this._buildProfilePanel(); if (this._activeTab === 'profile') this._switchTab('profile'); }
            catch(e2) { console.error('[ProfileBug] retry also failed:', e2); }
          });
        }
      }
    }

    const _setInputDeep = (container, enable) => {
      if (!container?.list) return;
      container.list.forEach(child => {
        if (child.input) {
          if (enable) { child.setActive(true); try { this.input.enable(child); } catch(_) {} }
          else { try { this.input.disable(child); } catch(_) {} child.setActive(false); }
        }
        if (child.list) _setInputDeep(child, enable);
      });
    };

    try {
      Object.entries(this._panels).forEach(([k, c]) => {
        if (!c) return;
        const v = k === key;
        // Страховка: если контейнер не попал в displayList (исключение при build) — добавляем.
        if (v && !this.sys.displayList.exists(c)) {
          try { this.sys.displayList.add(c); } catch(_) {}
        }
        c.setVisible(v);
        c.setActive(v);
        if (v) { c.setAlpha(1); c.setPosition(0, 0); }
        _setInputDeep(c, v);
      });
    } catch(_) {}

    if (key === 'profile') this._loadProfileBuffs();
    try { if (this._dailyBonusOverlay) this._dailyBonusOverlay.setVisible(key === 'profile'); } catch(_) {}
    try {
      Object.entries(this._tabBtns).forEach(([k, btn]) => {
        const active = k === key;
        btn.activeBubble?.setVisible(active);
        if (btn.iconImg) {
          btn.iconImg.setAlpha(active ? 1 : 0.85);
          if (btn.auraImg) btn.auraImg.setAlpha(active ? 0.42 : 0.16);
        } else if (btn.iconG && btn.iconName) {
          btn.iconG.clear();
          TAB_ICONS[btn.iconName](btn.iconG, 0, 0, btn.tabCol || 0x22d3ee, active ? 2 : 1.4);
        }
        btn.labelTxt?.setStyle?.({ color: btn.hexCol || '#c4b5fd' });
      });
    } catch(_) {}
    try { if (typeof TabBarHTML !== 'undefined') TabBarHTML.setActive(key); } catch(_) {}
    this._tbInvalidateScroll?.();
    if (typeof ScreenHints !== 'undefined') ScreenHints.show('menu_' + key);
  },

});
