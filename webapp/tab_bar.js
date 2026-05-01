/* ============================================================
   TabBar — общий нижний таббар для всех экранов.
   TabBar.build(scene, { activeKey, onInternal }) → { objs, btns }
   TabBar.setActive(btns, key) — перерисовать активное состояние
   TabBar.navigate(scene, key, onInternal) — переход по тапу
   ============================================================ */

const TABBAR_H = 76;

window.TabBar = {
  HEIGHT: TABBAR_H,

  TABS: [
    { key: 'profile', label: 'Профиль', icon: 'profile', col: 0x22d3ee, imgKey: 'tab_profile' },
    { key: 'clan',    label: 'Клан',    icon: 'clan',    col: 0xfb7185, imgKey: 'tab_clan'    },
    { key: 'stats',   label: 'Герой',   icon: 'stats',   col: 0x818cf8, imgKey: 'tab_stats'   },
    { key: 'boss',    label: 'Босс',    icon: 'boss',    col: 0xfb923c, imgKey: 'tab_boss'    },
    { key: 'rating',  label: 'Рейтинг', icon: 'rating',  col: 0xfbbf24, imgKey: 'tab_rating'  },
    { key: 'more',    label: 'Меню',    icon: 'more',    col: 0xa78bfa, imgKey: 'tab_more'    },
  ],

  navigate(scene, key, onInternal) {
    // Внутренние табы: синхронная смена панели, гонок нет — гардить не нужно.
    if (onInternal && (key === 'profile' || key === 'more' || key === 'battle')) {
      onInternal(key);
      return;
    }
    // Внешние табы: гардим, чтобы touchup той же сцены не кинул второй scene.start.
    // Гард сбросит TabBar.build новой сцены на next create().
    if (scene._tabNavGuard) return;
    scene._tabNavGuard = true;
    // Fallback: если scene.start по какой-то причине не дошёл до TabBar.build
    // (ошибка, неизвестный ключ), разблокируем гард через 1.5с, чтобы игра не
    // застряла намертво. Нормальный путь: build() сбросит гард раньше таймера.
    if (scene._tabNavGuardTimer) { clearTimeout(scene._tabNavGuardTimer); }
    scene._tabNavGuardTimer = setTimeout(() => {
      scene._tabNavGuard = false;
      scene._tabNavGuardTimer = null;
    }, 1500);

    // ВАЖНО: всегда передаём явные данные ({}) — Phaser 3 при scene.start без
    // data сохраняет ПРЕДЫДУЩИЕ данные (settings.data). Без этого: профиль →
    // Stats(openWardrobe:true) → выход → Профиль → тап Герой → scene.start('Stats')
    // → init() получает старые {openWardrobe:true} → опять открывается гардероб.
    if (key === 'profile' || key === 'more') { scene.scene.start('Menu', { returnTab: key }); return; }
    if (key === 'clan')   { scene.scene.start('Clan',      {}); return; }
    if (key === 'stats')  { scene.scene.start('Stats',     {}); return; }
    if (key === 'boss')   { scene.scene.start('WorldBoss', {}); return; }
    if (key === 'rating') { scene.scene.start('Rating',    {}); return; }
  },

  setActive(btns, activeKey) {
    Object.entries(btns).forEach(([k, btn]) => {
      const active = k === activeKey;
      btn.activeBubble?.setVisible(active);
      if (btn.iconImg) {
        btn.iconImg.setAlpha(active ? 1 : 0.85);
        // Aura активного таба ярче (2.5×) — заметная подсветка силуэта
        if (btn.auraImg) btn.auraImg.setAlpha(active ? 0.42 : 0.16);
        if (btn.glowFx) btn.glowFx.outerStrength = active ? 6 : 2;
      } else if (btn.iconG && btn.iconName) {
        btn.iconG.clear();
        TAB_ICONS[btn.iconName](btn.iconG, 0, 0, btn.tabCol || 0x22d3ee, active ? 2 : 1.4);
      }
      if (btn.labelTxt) btn.labelTxt.setStyle({ color: btn.hexCol || '#c4b5fd' });
    });
  },

  build(scene, opts = {}) {
    // Сцена переиспользуется Phaser'ом между scene.start — свойства экземпляра
    // (в т.ч. _tabNavGuard) выживают shutdown. Сбрасываем на каждый build,
    // иначе гард из прошлой жизни сцены заблокирует табы после возврата.
    scene._tabNavGuard = false;
    if (scene._tabNavGuardTimer) { clearTimeout(scene._tabNavGuardTimer); scene._tabNavGuardTimer = null; }
    try { scene.input.enabled = true; } catch(_) {}

    const activeKey  = opts.activeKey || null;
    const onInternal = opts.onInternal || null;
    const depth      = (opts.depth != null) ? opts.depth : 100;

    const W = scene.game.canvas.width;
    const H = scene.game.canvas.height;
    const TAB_H = TABBAR_H;
    const objs = [];
    const _t = (o) => { if (o && o.setDepth) o.setDepth(depth); objs.push(o); return o; };

    const tabs  = this.TABS;
    const tabW  = W / tabs.length;
    const tabTop = H - TAB_H;
    const btns  = {};

    const panel = _t(scene.add.graphics());
    panel.fillStyle(0x07041a, 0.96);
    panel.fillRect(0, tabTop, W, TAB_H);
    panel.lineStyle(1, 0xffffff, 0.1);
    panel.lineBetween(0, tabTop, W, tabTop);

    tabs.forEach((tab, i) => {
      const cx = tabW * i + tabW / 2;
      const iy = tabTop + 26;
      const hexCol = '#' + tab.col.toString(16).padStart(6, '0');
      const isActive = tab.key === activeKey;

      // Активное состояние: без рамки, только 3 точки-индикатор сверху + glow на иконке.
      const activeBubble = _t(scene.add.graphics());
      activeBubble.fillStyle(tab.col, 0.4);   activeBubble.fillCircle(cx, tabTop + 6, 5);
      activeBubble.fillStyle(tab.col, 1.0);   activeBubble.fillCircle(cx, tabTop + 6, 3);
      activeBubble.fillStyle(0xffffff, 0.85); activeBubble.fillCircle(cx, tabTop + 6, 1.5);
      activeBubble.setVisible(isActive);

      const useImg = tab.imgKey && scene.textures.exists(tab.imgKey);
      let iconG = null, iconImg = null, iconContainer, glowFx = null;
      let auraImg = null;
      if (useImg) {
        iconImg = scene.add.image(0, 0, tab.imgKey).setDisplaySize(42, 42);
        iconImg.setAlpha(isActive ? 1 : 0.85);
        // Aura — "сияние силуэта самой иконки" через tintFill-копию (НЕ preFX!).
        // preFX.addGlow на Android Telegram WebView лотерейно роняет случайный
        // таб в "цветной квадрат" (раз Профиль = белый, раз Клан = оранжевый).
        // tintFill-копия — обычный sprite, рендерится стабильно. Силуэт иконки
        // в цвете таба, чуть крупнее (×1.16), за основной иконкой → визуально
        // создаёт «ауру предмета», а не круг сзади.
        auraImg = scene.add.image(0, 0, tab.imgKey).setDisplaySize(49, 49);
        auraImg.setTintFill(tab.col);
        auraImg.setAlpha(isActive ? 0.42 : 0.16);
        // Ambient floor — мягкое цветное пятно под иконкой (предмет «светит на
        // поверхность»). Eллипс, не круг.
        const ambient = scene.add.graphics();
        const _aA = isActive ? 0.22 : 0.09;
        ambient.fillStyle(tab.col, _aA);     ambient.fillEllipse(0, 22, 32, 5);
        ambient.fillStyle(tab.col, _aA*0.5); ambient.fillEllipse(0, 22, 48, 8);
        iconContainer = _t(scene.add.container(cx, iy, [ambient, auraImg, iconImg]));
      } else {
        iconG = scene.add.graphics();
        TAB_ICONS[tab.icon](iconG, 0, 0, tab.col, isActive ? 2 : 1.4);
        iconContainer = _t(scene.add.container(cx, iy, [iconG]));
      }

      const labelTxt = _t(txt(scene, cx, tabTop + 57, tab.label, 9, hexCol).setOrigin(0.5));

      btns[tab.key] = { activeBubble, iconContainer, iconG, iconImg, auraImg, glowFx, labelTxt, iconName: tab.icon, tabCol: tab.col, hexCol };

      // Премиум-эффекты для Профиля: золотой glow + pulse. Без рамки (PNG с
      // прозрачным фоном). Реакция на тап — общая, как у других табов.
      if (tab.key === 'profile' && typeof TabProfilePremium !== 'undefined') {
        TabProfilePremium.apply(scene, btns[tab.key], isActive);
      }

      const zone = _t(scene.add.zone(cx, tabTop + TAB_H / 2, tabW, TAB_H).setInteractive({ useHandCursor: true }));

      // Ripple — один объект на кнопку, переиспользуется. Не добавляет новые
      // объекты в children.list при каждом тапе (ранее засорял recomputeMax).
      const rippleG = scene.add.graphics().setDepth(depth);
      rippleG.fillStyle(tab.col, 0.35); rippleG.fillCircle(0, 0, 12);
      const ripple = _t(scene.add.container(cx, iy, [rippleG]));
      ripple.setScale(0).setAlpha(0);

      zone.on('pointerdown', () => {
        scene.tweens.killTweensOf(ripple);
        ripple.setScale(0.3).setAlpha(1);
        scene.tweens.add({ targets: ripple, scaleX: 3.6, scaleY: 3.6, alpha: 0, duration: 420, ease: 'Quad.easeOut' });
        if (iconG) { iconG.clear(); TAB_ICONS[tab.icon](iconG, 0, 0, tab.col, 2.2); }
        if (iconImg) iconImg.setAlpha(1);
        scene.tweens.killTweensOf(iconContainer);
        scene.tweens.add({ targets: iconContainer, scaleX: 1.3, scaleY: 1.3, duration: 80, ease: 'Back.easeOut' });
      });
      zone.on('pointerout', () => {
        scene.tweens.killTweensOf(iconContainer);
        scene.tweens.add({ targets: iconContainer, scaleX: 1, scaleY: 1, duration: 130, ease: 'Sine.easeOut' });
        const a = tab.key === activeKey;
        if (iconG) { iconG.clear(); TAB_ICONS[tab.icon](iconG, 0, 0, tab.col, a ? 2 : 1.4); }
        if (iconImg) iconImg.setAlpha(a ? 1 : 0.85);
      });
      zone.on('pointerup', (pointer) => {
        scene.tweens.killTweensOf(iconContainer);
        scene.tweens.add({ targets: iconContainer, scaleX: 1, scaleY: 1, duration: 150, ease: 'Back.easeOut' });
        // Отличаем тап от свайпа по расстоянию, а не по совпадению зон pointerdown/up.
        // Раньше было «только если pointerdown и pointerup на одной вкладке», но из-за
        // мелкого дёргания пальца на мобилке pointerdown часто попадал на соседнюю зону,
        // и тап пропадал «раз через два». 20px — щадящий порог для тач-экранов.
        try { if (pointer?.getDistance?.() > 20) return; } catch (_) {}
        if (typeof Sound !== 'undefined' && Sound.tab) Sound.tab();
        if (typeof tg !== 'undefined') tg?.HapticFeedback?.selectionChanged();
        if (tab.key === activeKey) return;
        TabBar.navigate(scene, tab.key, onInternal);
      });
    });

    // TabBar объекты не скроллятся вместе с контентом — зафиксированы камерой.
    objs.forEach(o => { try { o.setScrollFactor?.(0); } catch(_) {} });
    // Сбрасываем scrollY камеры при каждой пересборке таббара (смена таба/сцены).
    try { scene.cameras.main.setScroll(0, 0); } catch(_) {}
    // Пальцевый/колёсиком скролл контента (если контент не влезает).
    TabBar._enableScroll(scene);

    return { objs, btns };
  },

  // Включает drag/wheel-скролл камеры для контента. Идемпотентно (вешается 1 раз на сцену).
  // maxScroll пересчитывается динамически по getBounds детей на каждом pointerdown/wheel.
  _enableScroll(scene) {
    if (scene._tbScrollOn) return;
    scene._tbScrollOn = true;
    const H = scene.game.canvas.height;
    const viewH = H - TABBAR_H;
    const cam = scene.cameras.main;
    let startY = 0, startScroll = 0, dragging = false, maxScroll = 0;
    let _maxDirty = true;

    // Помечаем dirty при смене таба — снаружи вызывается scene._tbInvalidateScroll?.()
    scene._tbInvalidateScroll = () => { _maxDirty = true; };

    const recomputeMax = () => {
      if (!_maxDirty) return;
      _maxDirty = false;
      let contentMaxY = 0;
      scene.children.list.forEach(o => {
        if (o.scrollFactorY === 0) return;
        try {
          const b = o.getBounds?.();
          if (b && b.bottom > contentMaxY) contentMaxY = b.bottom;
        } catch(_) {}
      });
      maxScroll = Math.max(0, contentMaxY - viewH + 16);
    };

    scene.input.on('pointerdown', (pointer, over) => {
      if (over && over.length > 0) return;          // started over interactive → skip
      if (pointer.y > H - TABBAR_H) return;          // on tab bar → skip
      recomputeMax();
      if (maxScroll <= 0) return;
      startY = pointer.y;
      startScroll = cam.scrollY;
      dragging = true;
    });
    scene.input.on('pointermove', (pointer) => {
      if (!dragging || !pointer.isDown) return;
      const next = Phaser.Math.Clamp(startScroll + (startY - pointer.y), 0, maxScroll);
      cam.setScroll(0, next);
    });
    const stop = () => { dragging = false; };
    scene.input.on('pointerup', stop);
    scene.input.on('pointerupoutside', stop);

    scene.input.on('wheel', (_p, _go, _dx, dy) => {
      recomputeMax();
      if (maxScroll <= 0) return;
      const next = Phaser.Math.Clamp(cam.scrollY + dy * 0.5, 0, maxScroll);
      cam.setScroll(0, next);
    });
  },
};
