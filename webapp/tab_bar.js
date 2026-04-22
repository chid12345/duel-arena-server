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
    { key: 'profile', label: 'Профиль', icon: 'profile', col: 0x22d3ee },
    { key: 'clan',    label: 'Клан',    icon: 'clan',    col: 0xfb7185 },
    { key: 'stats',   label: 'Герой',   icon: 'stats',   col: 0x818cf8 },
    { key: 'boss',    label: 'Босс',    icon: 'boss',    col: 0xfb923c },
    { key: 'rating',  label: 'Рейтинг', icon: 'rating',  col: 0xfbbf24 },
    { key: 'more',    label: 'Меню',    icon: 'more',    col: 0xa78bfa },
  ],

  navigate(scene, key, onInternal) {
    if (onInternal && (key === 'profile' || key === 'more' || key === 'battle')) {
      onInternal(key); return;
    }
    if (key === 'profile' || key === 'more') { scene.scene.start('Menu', { returnTab: key }); return; }
    if (key === 'clan')   { scene.scene.start('Clan');      return; }
    if (key === 'stats')  { scene.scene.start('Stats');     return; }
    if (key === 'boss')   { scene.scene.start('WorldBoss'); return; }
    if (key === 'rating') { scene.scene.start('Rating');    return; }
  },

  setActive(btns, activeKey) {
    Object.entries(btns).forEach(([k, btn]) => {
      const active = k === activeKey;
      btn.activeBubble?.setVisible(active);
      if (btn.iconG && btn.iconName) {
        btn.iconG.clear();
        TAB_ICONS[btn.iconName](btn.iconG, 0, 0, btn.tabCol || 0x22d3ee, active ? 2 : 1.4);
      }
      if (btn.labelTxt) btn.labelTxt.setStyle({ color: btn.hexCol || '#c4b5fd' });
    });
  },

  build(scene, opts = {}) {
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

      const activeBubble = _t(scene.add.graphics());
      const px = tabW * i + 5, py = tabTop + 4, pw = tabW - 10, ph = TAB_H - 8, pr = 13;
      activeBubble.lineStyle(10, tab.col, 0.12); activeBubble.strokeRoundedRect(px, py, pw, ph, pr);
      activeBubble.lineStyle(5,  tab.col, 0.25); activeBubble.strokeRoundedRect(px, py, pw, ph, pr);
      activeBubble.lineStyle(2,  tab.col, 0.18); activeBubble.strokeRoundedRect(px, py, pw, ph, pr);
      activeBubble.fillStyle(tab.col, 0.30); activeBubble.fillRoundedRect(px, py, pw, ph, pr);
      activeBubble.fillStyle(0xffffff, 0.08); activeBubble.fillRoundedRect(px + 2, py + 2, pw - 4, 14, { tl: 11, tr: 11, bl: 0, br: 0 });
      activeBubble.lineStyle(2, tab.col, 0.95); activeBubble.strokeRoundedRect(px, py, pw, ph, pr);
      activeBubble.fillStyle(tab.col, 0.4);   activeBubble.fillCircle(cx, tabTop + 6, 5);
      activeBubble.fillStyle(tab.col, 1.0);   activeBubble.fillCircle(cx, tabTop + 6, 3);
      activeBubble.fillStyle(0xffffff, 0.85); activeBubble.fillCircle(cx, tabTop + 6, 1.5);
      activeBubble.setVisible(isActive);

      const iconG = scene.add.graphics();
      TAB_ICONS[tab.icon](iconG, 0, 0, tab.col, isActive ? 2 : 1.4);
      const iconContainer = _t(scene.add.container(cx, iy, [iconG]));

      const labelTxt = _t(txt(scene, cx, tabTop + 57, tab.label, 9, hexCol).setOrigin(0.5));

      btns[tab.key] = { activeBubble, iconContainer, iconG, labelTxt, iconName: tab.icon, tabCol: tab.col, hexCol };

      const zone = _t(scene.add.zone(cx, tabTop + TAB_H / 2, tabW, TAB_H).setInteractive({ useHandCursor: true }));

      zone.on('pointerdown', () => {
        const rg = scene.add.graphics();
        rg.fillStyle(tab.col, 0.35); rg.fillCircle(0, 0, 12);
        const ripple = scene.add.container(cx, iy, [rg]).setDepth(depth);
        scene.tweens.add({ targets: ripple, scaleX: 3.6, scaleY: 3.6, alpha: 0, duration: 420, ease: 'Quad.easeOut', onComplete: () => ripple.destroy() });
        iconG.clear(); TAB_ICONS[tab.icon](iconG, 0, 0, tab.col, 2.2);
        scene.tweens.killTweensOf(iconContainer);
        scene.tweens.add({ targets: iconContainer, scaleX: 1.3, scaleY: 1.3, duration: 80, ease: 'Back.easeOut' });
      });
      zone.on('pointerout', () => {
        scene.tweens.killTweensOf(iconContainer);
        scene.tweens.add({ targets: iconContainer, scaleX: 1, scaleY: 1, duration: 130, ease: 'Sine.easeOut' });
        const a = tab.key === activeKey;
        iconG.clear(); TAB_ICONS[tab.icon](iconG, 0, 0, tab.col, a ? 2 : 1.4);
      });
      zone.on('pointerup', () => {
        scene.tweens.killTweensOf(iconContainer);
        scene.tweens.add({ targets: iconContainer, scaleX: 1, scaleY: 1, duration: 150, ease: 'Back.easeOut' });
        if (typeof Sound !== 'undefined' && Sound.tab) Sound.tab();
        if (typeof tg !== 'undefined') tg?.HapticFeedback?.selectionChanged();
        if (tab.key === activeKey) return;
        TabBar.navigate(scene, tab.key, onInternal);
      });
    });

    return { objs, btns };
  },
};
