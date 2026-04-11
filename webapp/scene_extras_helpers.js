/* ============================================================
   Вспомогательные функции для extra-сцен:
   _rewardAnim, _extraBg, _extraBack, _extraHeader
   ============================================================ */

/**
 * _rewardAnim(scene, rewards, onDone)
 * Анимация получения награды: вспышка + всплывающие монеты / кристаллы / XP.
 * rewards: { gold, diamonds, xp }   — нулевые поля пропускаются.
 * onDone:  callback через ~900ms.
 */
function _rewardAnim(scene, rewards = {}, onDone) {
  const W  = scene.W || scene.game.canvas.width;
  const H  = scene.H || scene.game.canvas.height;
  const cx = W / 2;
  const cy = Math.round(H * 0.48);

  /* 1. Фоновая вспышка */
  const flash = scene.add.graphics().setDepth(88);
  flash.fillStyle(0xffc83c, 0.16);
  flash.fillRect(0, 0, W, H);
  scene.tweens.add({ targets: flash, alpha: 0, duration: 500, onComplete: () => flash.destroy() });

  /* 2. Взрыв конфетти-кружков */
  const COLS = [0xffc83c, 0x3cc8dc, 0xb45aff, 0x3cc864, 0xff4488, 0xff8800, 0x5096ff];
  for (let i = 0; i < 22; i++) {
    const angle = (i / 22) * Math.PI * 2;
    const dist  = Phaser.Math.Between(55, 130);
    const r     = Phaser.Math.Between(3, 8);
    const col   = Phaser.Utils.Array.GetRandom(COLS);
    const c     = scene.add.circle(cx, cy, r, col, 0.9).setDepth(89);
    scene.tweens.add({
      targets: c,
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      alpha: 0, scaleX: 0.15, scaleY: 0.15,
      duration: Phaser.Math.Between(420, 750),
      delay:    Phaser.Math.Between(0, 120),
      ease: 'Quad.easeOut',
      onComplete: () => c.destroy(),
    });
  }

  /* 3. Иконки наград */
  const items = [];
  if ((rewards.gold     || 0) > 0) items.push({ icon: '🪙', n: rewards.gold,     color: '#ffc83c' });
  if ((rewards.diamonds || 0) > 0) items.push({ icon: '💎', n: rewards.diamonds,  color: '#3cc8dc' });
  if ((rewards.xp       || 0) > 0) items.push({ icon: '⭐', n: rewards.xp,        color: '#ffe066' });
  if (!items.length)               items.push({ icon: '🎁', n: 0,                 color: '#ffc83c' });

  const gap = Math.min(80, (W - 40) / Math.max(items.length, 1));
  const startX = cx - (items.length - 1) * gap / 2;

  items.forEach((item, i) => {
    const ix  = startX + i * gap;
    const iy  = cy;

    /* Большая иконка: pop-in → плавно вверх-исчезает */
    const iconT = txt(scene, ix, iy, item.icon, 38).setOrigin(0.5).setDepth(92).setScale(0);
    scene.tweens.add({
      targets: iconT, scale: 1.15, duration: 280, ease: 'Back.easeOut',
      onComplete: () => {
        scene.tweens.add({ targets: iconT, scale: 1, duration: 80 });
        scene.tweens.add({
          targets: iconT, y: iy - 72, alpha: 0,
          duration: 650, delay: 380, ease: 'Quad.easeIn',
          onComplete: () => iconT.destroy(),
        });
      },
    });

    /* Сумма под иконкой */
    if (item.n > 0) {
      const amtT = txt(scene, ix, iy + 32, `+${item.n}`, 17, item.color, true)
        .setOrigin(0.5).setDepth(93).setAlpha(0);
      scene.tweens.add({
        targets: amtT, alpha: 1, y: iy + 24, duration: 220, delay: 120,
        onComplete: () => {
          scene.tweens.add({
            targets: amtT, y: iy - 44, alpha: 0,
            duration: 600, delay: 380, ease: 'Quad.easeIn',
            onComplete: () => amtT.destroy(),
          });
        },
      });
    }
  });

  /* 4. Надпись «Получено!» */
  const label = txt(scene, cx, cy - 44, '✅  Получено!', 15, '#ffffff', true)
    .setOrigin(0.5).setDepth(93).setAlpha(0);
  scene.tweens.add({
    targets: label, alpha: 1, y: label.y - 6, duration: 260, delay: 60,
    onComplete: () => {
      scene.tweens.add({ targets: label, alpha: 0, duration: 400, delay: 500, onComplete: () => label.destroy() });
    },
  });

  if (onDone) scene.time.delayedCall(920, onDone);
}

function _extraBg(scene, W, H) {
  const g = scene.add.graphics();
  g.fillGradientStyle(C.bg, C.bg, C.bgMid, C.bgMid, 1);
  g.fillRect(0, 0, W, H);
  /* Сетка убрана: 50+ lineBetween при opacity 0.03 давали лишние draw-call */
}

function _extraBack(scene, dest = 'Menu', returnTab = 'more') {
  makeBackBtn(scene, 'Назад', () => {
    tg?.HapticFeedback?.impactOccurred('light');
    scene.scene.start(dest, returnTab ? { returnTab } : undefined);
  });
}

function _extraHeader(scene, W, icon, title, sub) {
  makePanel(scene, 8, 8, W - 16, 64, 12);
  /* Левые 46px = зона кнопки «‹»; текст начинается с x=60 */
  const maxCh  = Math.floor((W - 72) / 9);   // ~9px на символ при font-size 15
  const trunc  = (s, n) => s && s.length > n ? s.slice(0, n - 1) + '…' : (s || '');
  txt(scene, 60, 20, icon + '  ' + trunc(title, maxCh), 15, '#ffc83c', true);
  if (sub) txt(scene, 60, 44, trunc(sub, Math.floor((W - 72) / 6.5)), 10, '#9999bb');
}
