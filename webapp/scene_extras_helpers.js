/* ============================================================
   Вспомогательные функции для extra-сцен:
   _rewardAnim, _extraBg, _extraBack, _extraHeader
   ============================================================ */

/**
 * _rewardAnim(scene, rewards, onDone)
 * Overlay-панель с наградами: затемнение + pop-in карточка + конфетти.
 * rewards: { gold, diamonds, xp }   — нулевые поля пропускаются.
 * onDone:  callback через ~1300ms.
 * Работает одинаково на мобиле и ПК.
 */
function _rewardAnim(scene, rewards = {}, onDone) {
  const W  = scene.W || scene.game.canvas.width;
  const H  = scene.H || scene.game.canvas.height;
  const cx = W / 2;
  const cy = Math.round(H / 2);

  const items = [];
  if ((rewards.gold     || 0) > 0) items.push({ icon: '🪙', n: rewards.gold,    color: '#ffd166' });
  if ((rewards.diamonds || 0) > 0) items.push({ icon: '💎', n: rewards.diamonds, color: '#5dd8f0' });
  if ((rewards.xp       || 0) > 0) items.push({ icon: '⭐', n: rewards.xp,       color: '#ffe066' });
  if (!items.length)               items.push({ icon: '🎁', n: 0,                color: '#ffd166' });

  /* 1. Тёмное затемнение всего экрана */
  const dim = scene.add.graphics().setDepth(90);
  dim.fillStyle(0x000000, 0.65);
  dim.fillRect(0, 0, W, H);
  dim.setAlpha(0);
  scene.tweens.add({ targets: dim, alpha: 1, duration: 180 });

  /* 2. Панель-карточка по центру */
  const panW = Math.min(W - 48, 280), panH = 140;
  const panX = cx - panW / 2, panY = cy - panH / 2 - 10;
  const panel = scene.add.graphics().setDepth(91).setScale(0.6).setAlpha(0);
  panel.fillStyle(0x1a1f30, 1);
  panel.fillRoundedRect(panX, panY, panW, panH, 16);
  panel.lineStyle(2, 0xffd166, 0.9);
  panel.strokeRoundedRect(panX, panY, panW, panH, 16);
  scene.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });

  /* 3. «✅ Получено!» */
  const titleT = txt(scene, cx, panY + 26, '✅  Получено!', 16, '#ffffff', true)
    .setOrigin(0.5).setDepth(92).setAlpha(0);
  scene.tweens.add({ targets: titleT, alpha: 1, duration: 200, delay: 120 });

  /* 4. Иконки наград в ряд */
  const gap = Math.min(72, (panW - 24) / items.length);
  const startX = cx - (items.length - 1) * gap / 2;
  items.forEach((item, i) => {
    const ix = startX + i * gap;
    const iconT = txt(scene, ix, panY + 62, item.icon, 28)
      .setOrigin(0.5).setDepth(92).setScale(0).setAlpha(0);
    scene.tweens.add({ targets: iconT, scale: 1, alpha: 1, duration: 220, delay: 160 + i * 60, ease: 'Back.easeOut' });
    if (item.n > 0) {
      const amtT = txt(scene, ix, panY + 98, `+${item.n}`, 14, item.color, true)
        .setOrigin(0.5).setDepth(92).setAlpha(0);
      scene.tweens.add({ targets: amtT, alpha: 1, duration: 180, delay: 240 + i * 60 });
    }
  });

  /* 5. Конфетти вокруг панели */
  const COLS = [0xffc83c, 0x3cc8dc, 0xb45aff, 0x3cc864, 0xff4488, 0x5096ff];
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2;
    const dist  = Phaser.Math.Between(60, 120);
    const r     = Phaser.Math.Between(3, 7);
    const col   = Phaser.Utils.Array.GetRandom(COLS);
    const c     = scene.add.circle(cx, cy, r, col, 0.9).setDepth(93).setScale(0);
    scene.tweens.add({
      targets: c,
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      scaleX: 1, scaleY: 1,
      duration: 200, delay: 80, ease: 'Back.easeOut',
      onComplete: () => {
        scene.tweens.add({
          targets: c, alpha: 0, scaleX: 0.1, scaleY: 0.1,
          duration: Phaser.Math.Between(300, 600), delay: 200,
          ease: 'Quad.easeIn', onComplete: () => c.destroy(),
        });
      },
    });
  }

  /* 6. Fade-out всей панели + onDone */
  const all = [dim, panel, titleT];
  scene.tweens.add({
    targets: all, alpha: 0, duration: 350, delay: 900,
    onComplete: () => all.forEach(o => { try { o.destroy(); } catch(_) {} }),
  });

  /* Двойной запуск onDone: game-таймер + window.setTimeout (fallback для ПК) */
  let _called = false;
  const _call = () => { if (_called) return; _called = true; if (onDone) onDone(); };
  if (scene.time) scene.time.delayedCall(1260, _call);
  setTimeout(_call, 1400);
}

function _extraBg(scene, W, H) {
  const g = scene.add.graphics();
  g.fillGradientStyle(C.bg, C.bg, C.bgMid, C.bgMid, 1);
  g.fillRect(0, 0, W, H);
  // Фон зафиксирован — при drag-скролле контента не уезжает за край.
  try { g.setScrollFactor?.(0); } catch(_) {}
}

function _extraBack(scene, dest = 'Menu', returnTab = 'more') {
  makeBackBtn(scene, 'Назад', () => {
    tg?.HapticFeedback?.impactOccurred('light');
    // ВАЖНО: всегда передаём явный объект ({}). Phaser 3 при scene.start без
    // data сохраняет ПРЕДЫДУЩИЕ данные → старые флаги (openWardrobe и пр.)
    // ломают навигацию на следующей сцене.
    scene.scene.start(dest, returnTab ? { returnTab } : {});
  });
}

function _extraHeader(scene, W, icon, title, sub) {
  const panel = makePanel(scene, 8, 8, W - 16, 64, 12);
  /* Левые 46px = зона кнопки «‹»; текст начинается с x=60 */
  const maxCh  = Math.floor((W - 72) / 9);   // ~9px на символ при font-size 15
  const trunc  = (s, n) => s && s.length > n ? s.slice(0, n - 1) + '…' : (s || '');
  const t1 = txt(scene, 60, 20, icon + '  ' + trunc(title, maxCh), 15, '#ffc83c', true);
  const t2 = sub ? txt(scene, 60, 44, trunc(sub, Math.floor((W - 72) / 6.5)), 10, '#ddddff') : null;
  // Шапка зафиксирована на экране — не уезжает при drag-скролле.
  try { panel.setScrollFactor?.(0); t1.setScrollFactor?.(0); t2?.setScrollFactor?.(0); } catch(_) {}
}
