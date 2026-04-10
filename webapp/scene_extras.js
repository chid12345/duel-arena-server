/* ============================================================
   scene_extras.js — дополнительные экраны TMA:
     QuestsScene   ('Quests')     — ежедневные задания
     SummaryScene  ('Summary')    — сводка профиля
    TitanTopScene ('TitanTop')   — недельный топ Башни титанов
     BattlePassScene ('BattlePass') — прогресс Боевого пропуска
     ClanScene     ('Clan')       — клан
     ShopScene     ('Shop')       — магазин
   ============================================================ */

/* ─────────────────────────────────────────────────────────────
   Общие вспомогалки для extra-сцен
   ───────────────────────────────────────────────────────────── */

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

/* ═══════════════════════════════════════════════════════════
   QUESTS SCENE — ежедневные задания + логин-бонус
   ═══════════════════════════════════════════════════════════ */
class QuestsScene extends Phaser.Scene {
  constructor() { super('Quests'); }

  init(data) {
    this._tab = (data && data.tab) ? data.tab : 'daily';
  }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    _extraBg(this, W, H);
    _extraHeader(this, W, '📋', 'ЗАДАНИЯ', '');
    _extraBack(this);
    this._buildTabBar(W);
    this._loading = txt(this, W/2, H/2, 'Загрузка...', 14, '#9999bb').setOrigin(0.5);
    get('/api/quests').then(d => this._render(d, W, H)).catch(() => {
      if (this._loading) this._loading.setText('❌ Нет соединения');
    });
  }

  /* ── Вкладки ─────────────────────────────────────────────── */
  _buildTabBar(W) {
    const tabs = [
      { key: 'daily',  label: '📅 Ежедневные' },
      { key: 'weekly', label: '📋 Еженедельные' },
    ];
    const tabW = (W - 16) / tabs.length;
    const ty   = 76, th = 28;
    this._tabObjs = {};
    tabs.forEach((tab, i) => {
      const tx    = 8 + i * tabW;
      const activ = this._tab === tab.key;
      const bg    = this.add.graphics();
      bg.fillStyle(activ ? 0x2a3060 : C.bgPanel, activ ? 1 : 0.7);
      bg.fillRoundedRect(tx, ty, tabW - 4, th, 8);
      if (activ) { bg.lineStyle(1.5, C.blue, 0.7); bg.strokeRoundedRect(tx, ty, tabW - 4, th, 8); }
      const t = txt(this, tx + (tabW-4)/2, ty + th/2, tab.label, 11,
        activ ? '#ffffff' : '#8888aa', activ).setOrigin(0.5);
      this._tabObjs[tab.key] = { bg, t };
      this.add.zone(tx, ty, tabW - 4, th).setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', () => {
          if (this._tab === tab.key) return;
          tg?.HapticFeedback?.selectionChanged?.();
          this.scene.restart({ tab: tab.key });
        });
    });
  }

  _render(data, W, H) {
    this._loading?.destroy(); this._loading = null;
    if (!data.ok) { txt(this, W/2, H/2, '❌ Ошибка', 14, '#dc3c46').setOrigin(0.5); return; }
    const q = data.quest || {};
    const d = data.daily || {};
    const w = data.weekly || {};
    const startY = 112;
    if (this._tab === 'daily')  this._buildDailyTab(q, d, W, H, startY);
    else                        this._buildWeeklyTab(w, W, H, startY);
  }

  /* ══ ЕЖЕДНЕВНАЯ ВКЛАДКА ══════════════════════════════════════ */
  _buildDailyTab(q, d, W, H, y) {
    y = this._buildDailyBonus(d, W, y);
    y += 10;

    const battles = q.battles_played || 0;
    const wins    = q.battles_won    || 0;
    const claimed = q.reward_claimed || false;
    const done    = q.is_completed   || false;
    const gold    = q.reward_gold    || 55;
    const xp      = q.reward_xp      || 150;

    /* Заголовок секции + badge «Готово!» */
    txt(this, 14, y, 'КВЕСТ ДНЯ', 10, '#9999bb', true);
    if (done && !claimed) {
      const bdg = this.add.graphics();
      bdg.fillStyle(0x1a4010, 1); bdg.fillRoundedRect(W-100, y-4, 92, 18, 5);
      txt(this, W-54, y+5, '🎁 Готово!', 10, '#3cc864', true).setOrigin(0.5);
    }
    y += 16;

    const tasks = [
      { icon: '⚔️', label: 'Сыграй 5 боёв',  cur: battles, max: 5, color: C.blue },
      { icon: '🏆', label: 'Одержи 3 победы', cur: wins,    max: 3, color: C.gold },
    ];
    tasks.forEach((task, i) => {
      const th = 54, tx = 8, tw = W-16, ty2 = y + i*(th+6);
      const ok = task.cur >= task.max;
      const bg = this.add.graphics();
      bg.fillStyle(ok ? 0x0e1e10 : C.bgPanel, 0.92);
      bg.fillRoundedRect(tx, ty2, tw, th, 10);
      bg.lineStyle(1.5, ok ? task.color : C.dark, ok ? 0.6 : 0.2);
      bg.strokeRoundedRect(tx, ty2, tw, th, 10);
      txt(this, tx+18, ty2+th/2, task.icon, 19).setOrigin(0.5);
      txt(this, tx+36, ty2+9,  task.label, 12, ok ? '#3cc864' : '#ccccee', ok);
      txt(this, tx+36, ty2+24, `${Math.min(task.cur,task.max)} / ${task.max}`, 10, '#9999bb', true);
      makeBar(this, tx+36, ty2+40, tw-80, 4, Math.min(1, task.cur/task.max), task.color, C.dark, 3);
      txt(this, tw, ty2+th/2, ok ? '✅' : '🔒', 15).setOrigin(1, 0.5);
    });
    y += tasks.length * 60 + 6;

    /* Натиск-задание */
    const eWins = q.endless_wins || 0;
    const eDone = eWins >= 3;
    const eBg = this.add.graphics();
    eBg.fillStyle(eDone ? 0x1a0e00 : C.bgPanel, 0.92);
    eBg.fillRoundedRect(8, y, W-16, 52, 10);
    eBg.lineStyle(1.5, eDone ? 0xdc3c46 : C.dark, eDone ? 0.6 : 0.2);
    eBg.strokeRoundedRect(8, y, W-16, 52, 10);
    txt(this, 22, y+26, '🔥', 18).setOrigin(0.5);
    txt(this, 38, y+9, 'Победи 3 врага в Натиске', 12, eDone ? '#ff8855' : '#ccccee', eDone);
    txt(this, 38, y+23, `${Math.min(eWins,3)} / 3`, 10, '#9999bb', true);
    makeBar(this, 38, y+38, W-98, 4, Math.min(1, eWins/3), 0xdc3c46, C.dark, 3);
    txt(this, W-14, y+24, eDone ? '✅' : '🔒', 15).setOrigin(1, 0.5);
    if (eDone) txt(this, W-14, y+8, '+80🪙 +1💎', 9, '#ff8855', true).setOrigin(1, 0);
    y += 60;

    /* ── КНОПКА СБОРА ─────────────────────────────────────── */
    if (claimed) {
      const okG = this.add.graphics();
      okG.fillStyle(0x0a1a0a, 0.8); okG.fillRoundedRect(16, y, W-32, 42, 10);
      okG.lineStyle(1, C.green, 0.4); okG.strokeRoundedRect(16, y, W-32, 42, 10);
      txt(this, W/2, y+21, '✅ Награда получена — возвращайся завтра', 11, '#3cc864').setOrigin(0.5);
    } else if (done) {
      /* Пульсирующая кнопка */
      const clBg = this.add.graphics();
      const _drawCl = (pressed) => {
        clBg.clear();
        clBg.fillStyle(pressed ? 0xcc9000 : 0xffc83c, 1);
        clBg.fillRoundedRect(16, y, W-32, 46, 12);
        if (!pressed) { clBg.fillStyle(0xffffff, 0.13); clBg.fillRoundedRect(18, y+2, W-36, 20, 10); }
      };
      _drawCl(false);
      this.tweens.add({ targets: clBg, alpha: 0.82, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const clT = txt(this, W/2, y+23, `🎁  Забрать  +${gold}🪙  +${xp}⭐`, 13, '#1a1a28', true).setOrigin(0.5);
      const clZ = this.add.zone(16, y, W-32, 46).setOrigin(0).setInteractive({ useHandCursor: true });
      clZ.on('pointerdown', () => { _drawCl(true); tg?.HapticFeedback?.impactOccurred('heavy'); });
      clZ.on('pointerout',  () => _drawCl(false));
      clZ.on('pointerup',   () => {
        if (this._claimBusy) return;
        this._claimBusy = true;
        clZ.disableInteractive();
        clT.setText('⏳ Получаем...');
        this._claimQuest(clBg, clT, gold, xp, W, y);
      });
    } else {
      txt(this, W/2, y+14, '⚔️ Выполни задания — здесь появится кнопка сбора', 10, '#666688').setOrigin(0.5);
    }

    txt(this, W/2, H-44, '🔄 Обновляется каждый день в 00:00', 9, '#555577').setOrigin(0.5);
  }

  /* ── Логин-бонус ─────────────────────────────────────────── */
  _buildDailyBonus(d, W, y) {
    const canClaim = d.can_claim, streak = d.streak || 0, bonus = d.bonus || 40;
    const bh = 80;
    const bg = this.add.graphics();
    bg.fillStyle(canClaim ? 0x0e2010 : C.bgPanel, 0.95);
    bg.fillRoundedRect(8, y, W-16, bh, 12);
    bg.lineStyle(2, canClaim ? C.green : C.dark, canClaim ? 0.7 : 0.25);
    bg.strokeRoundedRect(8, y, W-16, bh, 12);
    txt(this, 22, y+11, '🎁', 18);
    txt(this, 48, y+10, 'Ежедневный бонус', 12, canClaim ? '#3cc864' : '#8888aa', true);
    txt(this, 48, y+26, `Серия: ${streak} ${streak >= 7 ? '🔥' : '📅'} дней`, 10, '#9999bb');
    const dotW = (W - 72) / 7;
    for (let i = 0; i < 7; i++) {
      const dx = 48 + i * dotW;
      const ok = i < (streak % 7 || (streak > 0 && streak % 7 === 0 ? 7 : 0));
      const dg = this.add.graphics();
      dg.fillStyle(ok ? C.gold : C.dark, 1); dg.fillRoundedRect(dx, y+44, dotW-3, 7, 3);
      txt(this, dx+(dotW-3)/2, y+57, String(i+1), 7, ok ? '#ffc83c' : '#7777aa').setOrigin(0.5);
    }
    if (canClaim) {
      /* Кнопка сбора — широкая, сразу бросается в глаза */
      const bw = W-32, bh2 = 28, bx = 16, by2 = y + bh + 4;
      const btnG = this.add.graphics();
      btnG.fillStyle(C.green, 1); btnG.fillRoundedRect(bx, by2, bw, bh2, 8);
      btnG.fillStyle(0xffffff, 0.12); btnG.fillRoundedRect(bx+2, by2+2, bw-4, 12, 6);
      const btnT = txt(this, bx+bw/2, by2+bh2/2, `🎁 Забрать ежедневный бонус  +${bonus}🪙`, 12, '#1a1a28', true).setOrigin(0.5);
      this.tweens.add({ targets: btnG, alpha: 0.82, duration: 750, yoyo: true, repeat: -1 });
      const zone = this.add.zone(bx, by2, bw, bh2).setOrigin(0).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => { btnG.clear(); btnG.fillStyle(0x20a050,1); btnG.fillRoundedRect(bx,by2,bw,bh2,8); tg?.HapticFeedback?.impactOccurred('medium'); });
      zone.on('pointerout',  () => { btnG.clear(); btnG.fillStyle(C.green,1); btnG.fillRoundedRect(bx,by2,bw,bh2,8); });
      zone.on('pointerup', () => {
        if (this._claimBusy) return;
        this._claimBusy = true;
        zone.disableInteractive();
        btnT.setText('⏳...');
        this._claimDaily(btnG, btnT, bx, by2, bw, bh2, bonus);
      });
      return y + bh + bh2 + 8;
    } else {
      txt(this, W-24, y+bh/2, '✅', 15).setOrigin(1, 0.5);
      return y + bh;
    }
  }

  /* ══ ЕЖЕНЕДЕЛЬНАЯ ВКЛАДКА ════════════════════════════════════ */
  _buildWeeklyTab(w, W, H, y) {
    const list = Array.isArray(w.quests) ? w.quests : [];
    const readyCount = list.filter(q => q.is_completed && !q.reward_claimed).length;
    txt(this, 14, y, `ЗАДАНИЯ НЕДЕЛИ  (выполнено: ${list.filter(q=>q.is_completed).length}/${list.length})`, 10, '#9999bb', true);
    if (readyCount > 0) {
      const bdg = this.add.graphics();
      bdg.fillStyle(0x1a4010, 1); bdg.fillRoundedRect(W-108, y-4, 100, 18, 5);
      txt(this, W-58, y+5, `🎁 ${readyCount} к получению`, 10, '#3cc864', true).setOrigin(0.5);
    }
    y += 16;

    list.forEach((q, i) => {
      const done = q.is_completed, claimed = q.reward_claimed;
      const isEndless = q.key.includes('endless');
      /* Высота карточки: если есть кнопка — увеличиваем */
      const qh = (done && !claimed) ? 90 : 66;
      const qy = y;
      y += qh + 8;

      const borderCol = claimed ? C.gold : done ? C.green : C.dark;
      const bg = this.add.graphics();
      bg.fillStyle(claimed ? 0x1a1500 : done ? (isEndless ? 0x1a0800 : 0x081a08) : C.bgPanel, 0.92);
      bg.fillRoundedRect(8, qy, W-16, qh, 10);
      bg.lineStyle(1.5, borderCol, claimed || done ? 0.65 : 0.2);
      bg.strokeRoundedRect(8, qy, W-16, qh, 10);

      const icon = q.key.includes('pvp') ? '⚔️' : q.key.includes('titan') ? '🗿' :
                   q.key.includes('endless') ? '🔥' : q.key.includes('streak') ? '🔥' : '📌';
      txt(this, 22, qy+32, icon, 18).setOrigin(0.5);
      txt(this, 40, qy+9,  q.label, 11, done ? (isEndless ? '#ff8855' : '#3cc864') : '#ccccee', done);
      txt(this, 40, qy+24, `${Math.min(q.current, q.target)} / ${q.target}`, 9, '#9999bb', true);
      makeBar(this, 40, qy+38, W-160, 4, Math.min(1, q.current/q.target),
        isEndless ? 0xdc3c46 : (done ? C.green : C.blue), C.dark, 3);

      /* Награда — компактно справа */
      txt(this, W-14, qy+10, `+${q.reward_gold}🪙`, 10, '#ffc83c', true).setOrigin(1, 0);
      if (q.reward_diamonds > 0)
        txt(this, W-14, qy+24, `+${q.reward_diamonds}💎`, 10, '#3cc8dc', true).setOrigin(1, 0);
      if (q.reward_xp > 0)
        txt(this, W-14, qy+38, `+${q.reward_xp}⭐`, 9, '#b45aff', true).setOrigin(1, 0);

      if (claimed) {
        txt(this, W/2, qy+52, '✅ Получено', 10, '#ffc83c', true).setOrigin(0.5);
      } else if (done) {
        /* Широкая кнопка во всю карточку */
        const bw = W-36, bh = 28, bx = 18, by2 = qy+56;
        const btnG = this.add.graphics();
        btnG.fillStyle(isEndless ? 0xdc3c46 : C.green, 1);
        btnG.fillRoundedRect(bx, by2, bw, bh, 7);
        btnG.fillStyle(0xffffff, 0.1); btnG.fillRoundedRect(bx+2, by2+2, bw-4, 11, 5);
        const rLabel = `🎁 Забрать  +${q.reward_gold}🪙${q.reward_diamonds>0?' +'+q.reward_diamonds+'💎':''}`;
        const btnT = txt(this, bx+bw/2, by2+bh/2, rLabel, 11, '#1a1a28', true).setOrigin(0.5);
        const zone = this.add.zone(bx, by2, bw, bh).setOrigin(0).setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => { btnG.clear(); btnG.fillStyle(isEndless?0xaa2020:0x28a050,1); btnG.fillRoundedRect(bx,by2,bw,bh,7); tg?.HapticFeedback?.impactOccurred('medium'); });
        zone.on('pointerout',  () => { btnG.clear(); btnG.fillStyle(isEndless?0xdc3c46:C.green,1); btnG.fillRoundedRect(bx,by2,bw,bh,7); });
        zone.on('pointerup', () => {
          if (this._claimBusy) return;
          this._claimBusy = true;
          zone.disableInteractive();
          btnT.setText('⏳ Получаем...');
          post('/api/quests/weekly_claim', { claim_key: q.key })
            .catch(() => ({ ok: false }))
            .then(res => {
              if (res.ok) {
                tg?.HapticFeedback?.notificationOccurred('success');
                Sound.questDone();
                if (res.player) State.player = res.player;
                btnG.clear(); btnG.fillStyle(0x0a1a0a,0.8); btnG.fillRoundedRect(bx,by2,bw,bh,7);
                btnT.setText(`✅ +${q.reward_gold}🪙 получено!`);
                _rewardAnim(this, { gold: q.reward_gold, diamonds: q.reward_diamonds, xp: q.reward_xp },
                  () => { this._claimBusy = false; this.scene.restart({ tab: 'weekly' }); });
              } else {
                this._claimBusy = false;
                zone.setInteractive({ useHandCursor: true });
                btnT.setText(res.reason || '❌ Ошибка');
                this.time.delayedCall(1500, () => btnT.setText(rLabel));
              }
            });
        });
      } else {
        txt(this, W/2, qy+52, '🔒 Выполни задание', 9, '#666688').setOrigin(0.5);
      }
    });
    txt(this, W/2, H-42, '🔄 Обновляется каждую неделю (Пн 00:00)', 9, '#555577').setOrigin(0.5);
  }

  /* ── Получить ежедневный бонус ─────────────────────────── */
  async _claimDaily(btnG, btnT, bx, by, bw, bh, bonus) {
    try {
      const res = await post('/api/daily/claim');
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        Sound.buy();
        if (res.player) State.player = res.player;
        btnG.clear(); btnG.fillStyle(0x0a1a0a,0.8); btnG.fillRoundedRect(bx,by,bw,bh,8);
        btnT.setText(`✅ +${res.bonus || bonus}🪙 зачислено!`);
        _rewardAnim(this, { gold: res.bonus || bonus },
          () => { this._claimBusy = false; this.scene.restart({ tab: 'daily' }); });
      } else {
        this._claimBusy = false;
        btnG.clear(); btnG.fillStyle(C.green,1); btnG.fillRoundedRect(bx,by,bw,bh,8);
        btnT.setText(res.reason || 'Уже получено');
      }
    } catch(_) {
      this._claimBusy = false;
      btnG.clear(); btnG.fillStyle(C.green,1); btnG.fillRoundedRect(bx,by,bw,bh,8);
      btnT.setText('❌ Нет соединения');
    }
  }

  /* ── Получить награду за основной квест ─────────────────── */
  async _claimQuest(clBg, clT, gold, xp, W, btnY) {
    try {
      const res = await post('/api/quests/claim');
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        Sound.questDone();
        if (res.player) State.player = res.player;
        clBg.clear(); clBg.fillStyle(0x0a1a0a,0.8); clBg.fillRoundedRect(16, btnY, W-32, 46, 12);
        clT.setText(`✅ +${res.gold||gold}🪙  +${res.xp||xp}⭐ — зачислено!`);
        _rewardAnim(this, { gold: res.gold || gold, xp: res.xp || xp },
          () => { this._claimBusy = false; this.scene.restart({ tab: 'daily' }); });
      } else {
        this._claimBusy = false;
        clT.setText(res.reason || '❌ Ошибка');
        this.time.delayedCall(1500, () => clT.setText(`🎁 Забрать +${gold}🪙 +${xp}⭐`));
      }
    } catch(_) {
      this._claimBusy = false;
      clT.setText('❌ Нет соединения');
    }
  }

  /* ── Анимация начисления ресурсов ───────────────────────── */
  _toast(msg) {
    const t = txt(this, this.W/2, this.H - 80, msg, 12, '#ffc83c', true).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 36, duration: 2400, onComplete: () => t.destroy() });
  }
}

/* ═══════════════════════════════════════════════════════════
   SUMMARY SCENE — полная сводка профиля
   ═══════════════════════════════════════════════════════════ */
class SummaryScene extends Phaser.Scene {
  constructor() { super('Summary'); }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    _extraBg(this, W, H);

    const p = State.player;
    if (!p) { this.scene.start('Menu'); return; }

    _extraHeader(this, W, '📋', 'СВОДКА', `@${p.username}  ·  Уровень ${p.level}`);

    const total  = (p.wins || 0) + (p.losses || 0);
    const wr     = total > 0 ? Math.round(p.wins / total * 100) : 0;
    const scroll = this.add.container(0, 0);
    let y = 88;

    /* ── Основные числа ── */
    const statCards = [
      { label: '⭐ Рейтинг',    value: p.rating || 0,   color: '#ffc83c' },
      { label: '💎 Кристаллы', value: p.diamonds || 0,  color: '#3cc8dc' },
      { label: '🥇 Победы',    value: p.wins || 0,       color: '#3cc864' },
      { label: '💀 Поражения', value: p.losses || 0,     color: '#dc3c46' },
      { label: '⚔️ Боёв всего',value: total,             color: '#8888aa' },
      { label: '🎯 Винрейт',   value: `${wr}%`,          color: wr > 50 ? '#3cc864' : '#dc3c46' },
    ];

    const cw = (W - 40) / 2, ch = 56;
    statCards.forEach((s, i) => {
      const cx = 16 + (i % 2) * (cw + 8);
      const cy = y + Math.floor(i / 2) * (ch + 8);
      const bg = this.add.graphics();
      bg.fillStyle(C.bgPanel, 0.92);
      bg.fillRoundedRect(cx, cy, cw, ch, 10);
      bg.lineStyle(1, C.dark, 0.8);
      bg.strokeRoundedRect(cx, cy, cw, ch, 10);
      scroll.add(bg);
      scroll.add(txt(this, cx + 8, cy + 8,  s.label, 12, '#8888aa'));
      scroll.add(txt(this, cx + 8, cy + 28, String(s.value), 16, s.color, true));
    });
    y += Math.ceil(statCards.length / 2) * (ch + 8) + 12;

    /* ── Характеристики персонажа ── */
    scroll.add(txt(this, 16, y, 'ХАРАКТЕРИСТИКИ', 11, '#9999bb', true));
    y += 20;
    const attrs = [
      { n: 'STR', v: p.strength   || 0, color: C.red    },
      { n: 'AGI', v: p.agility    || 0, color: C.green  },
      { n: 'INT', v: p.intellect  || 0, color: C.blue   },
      { n: 'VIT', v: p.vitality   || 0, color: C.purple },
      { n: 'LCK', v: p.luck       || 0, color: C.gold   },
    ];
    attrs.forEach((a, i) => {
      const ax = 16 + i * ((W - 32) / 5);
      const aw = (W - 32) / 5 - 6;
      const maxV = 100;
      const pct  = Math.min(1, a.v / maxV);
      const bg2  = this.add.graphics();
      bg2.fillStyle(C.dark, 0.8);
      bg2.fillRoundedRect(ax, y, aw, 8, 4);
      bg2.fillStyle(a.color, 1);
      bg2.fillRoundedRect(ax, y, Math.max(8, Math.round(aw * pct)), 8, 4);
      scroll.add(bg2);
      scroll.add(txt(this, ax + aw / 2, y + 14, `${a.n} ${a.v}`, 11, '#aaaacc').setOrigin(0.5));
    });
    y += 32;

    /* ── HP / EXP ── */
    const hpPct  = (p.current_hp || 0) / Math.max(1, p.max_hp || 1);
    const expPct = (p.exp || 0) / Math.max(1, p.exp_to_next || 1);

    scroll.add(makeBar(this, 16, y,     W - 32, 12, hpPct,  C.red,  C.dark));
    scroll.add(txt(this, W / 2, y + 6, `HP ${p.current_hp || 0}/${p.max_hp || 0}`, 11, '#f0f0fa').setOrigin(0.5));
    y += 20;
    scroll.add(makeBar(this, 16, y,     W - 32, 10, expPct, C.blue, C.dark));
    scroll.add(txt(this, W / 2, y + 5, `EXP ${p.exp || 0}/${p.exp_to_next || '?'}`, 11, '#8888aa').setOrigin(0.5));
    y += 24;

    /* ── Свободные очки ── */
    if (p.free_stats > 0) {
      const fb = this.add.graphics();
      fb.fillStyle(C.gold, 0.18);
      fb.fillRoundedRect(16, y, W - 32, 38, 10);
      fb.lineStyle(1.5, C.gold, 0.5);
      fb.strokeRoundedRect(16, y, W - 32, 38, 10);
      scroll.add(fb);
      scroll.add(txt(this, W / 2, y + 19,
        `⚡ ${p.free_stats} свободных очка характеристик`, 12, '#ffc83c').setOrigin(0.5));
      y += 48;
    }

    _extraBack(this);
  }
}

/* ═══════════════════════════════════════════════════════════
   TITAN TOP SCENE — недельный топ Башни титанов
   ═══════════════════════════════════════════════════════════ */
class TitanTopScene extends Phaser.Scene {
  constructor() { super('TitanTop'); }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    _extraBg(this, W, H);
    _extraHeader(this, W, '🗿', 'ТОП БАШНИ', 'Недельный рейтинг Башни титанов');
    _extraBack(this);
    this._loading = txt(this, W / 2, H / 2, 'Загрузка...', 14, '#9999bb').setOrigin(0.5);
    get('/api/titans/top').then(d => this._render(d, W, H)).catch(() => {
      this._loading?.setText('❌ Нет соединения');
    });
  }

  _render(data, W, H) {
    this._loading?.destroy();
    if (!data.ok) {
      txt(this, W / 2, H / 2, '❌ Ошибка', 14, '#dc3c46').setOrigin(0.5);
      return;
    }
    const lb = data.leaders || [];
    txt(this, W / 2, 82, `Неделя: ${data.week_key || '-'}`, 12, '#8888aa').setOrigin(0.5);

    makePanel(this, 8, 98, W - 16, 62, 10, 0.95);
    txt(this, 16, 108, '🎁 Награды:', 12, '#ffc83c', true);
    txt(this, 16, 128, '1 место: 150💎 · 2: 90💎 · 3: 60💎 · 4-10: 25💎', 11, '#c0c0e0');
    txt(this, 16, 145, 'Титулы: Покоритель / Гроза / Титаноборец', 10, '#666688');

    const listY = 172;
    txt(this, 16, listY - 18, 'ЛИДЕРЫ', 12, '#9999bb', true);
    const rowH = 40;
    const maxShow = Math.max(1, Math.floor((H - listY - 80) / rowH));

    lb.slice(0, maxShow).forEach((row, i) => {
      const ry = listY + i * rowH;
      const bg = this.add.graphics();
      bg.fillStyle(C.bgPanel, 0.86);
      bg.fillRoundedRect(8, ry, W - 16, rowH - 4, 8);
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      txt(this, 18, ry + 11, medal, i < 3 ? 14 : 11, '#ffc83c').setOrigin(0);
      txt(this, 52, ry + 9, row.username || `User${row.user_id}`, 12, '#d0d0ee', true);
      txt(this, 52, ry + 24, `🗿 Этаж: ${row.weekly_best_floor || 0}`, 11, '#777799');
      txt(this, W - 16, ry + 17, `#${row.weekly_best_floor || 0}`, 12, '#ffc83c', true).setOrigin(1, 0.5);
    });

    if (!lb.length) {
      txt(this, W / 2, H / 2 + 20, '😴 Пока никто не прошёл Башню', 13, '#9999bb').setOrigin(0.5);
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   BATTLEPASS SCENE — прогресс Battle Pass
   ═══════════════════════════════════════════════════════════ */
class BattlePassScene extends Phaser.Scene {
  constructor() { super('BattlePass'); }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    _extraBg(this, W, H);
  _extraHeader(this, W, '🌟', 'БОЕВОЙ ПРОПУСК', 'Ежесезонные награды');
    _extraBack(this);
    this._claimBtns = {};
    this._loading = txt(this, W/2, H/2, 'Загрузка...', 14, '#9999bb').setOrigin(0.5);
    get('/api/battlepass').then(d => this._render(d, W, H)).catch(() => {
      this._loading?.setText('❌ Нет соединения');
    });
  }

  _render(data, W, H) {
    this._loading?.destroy();
    if (!data.ok) { txt(this, W/2, H/2, '❌ Ошибка', 14, '#dc3c46').setOrigin(0.5); return; }

    const bp             = data.bp             || {};
    const tiers          = data.tiers          || [];
    const endlessTiers   = data.endless_tiers  || [];
    const battles        = bp.battles_done     || 0;
    const wins           = bp.wins_done        || 0;
    const endlessDone    = data.endless_done   || 0;
    const endlessClaimed = data.endless_tier_claimed || 0;
    const claimed        = bp.last_claimed_tier || 0;

    txt(this, W/2, 84, `Боёв: ${battles}  ·  Побед: ${wins}  ·  🔥 Натиск: ${endlessDone}`, 11, '#8888aa').setOrigin(0.5);

    /* ── Обычные тиры ── */
    const startY = 104, rowH = 60;
    tiers.forEach((tier, i) => {
      const ry      = startY + i * rowH;
      const done    = battles >= tier.battles_needed && wins >= tier.wins_needed;
      const isClaim = done && claimed < tier.tier;
      const gotIt   = claimed >= tier.tier;
      const bg = this.add.graphics();
      const borderCol = gotIt ? C.gold : done ? C.green : C.dark;
      bg.fillStyle(C.bgPanel, 0.92);
      bg.fillRoundedRect(8, ry, W-16, rowH-6, 10);
      bg.lineStyle(1.5, borderCol, gotIt ? 0.7 : done ? 0.5 : 0.2);
      bg.strokeRoundedRect(8, ry, W-16, rowH-6, 10);
      const numBg = this.add.graphics();
      numBg.fillStyle(gotIt ? C.gold : done ? C.green : C.dark, 1);
      numBg.fillCircle(26, ry + (rowH-6)/2, 14);
      txt(this, 26, ry + (rowH-6)/2, String(tier.tier), 12, gotIt||done ? '#1a1a28' : '#8888aa', true).setOrigin(0.5);
      const condColor = done ? '#3cc864' : '#8888aa';
      txt(this, 48, ry + 8, `⚔️ ${tier.battles_needed} боёв  /  🏆 ${tier.wins_needed} побед`, 11, condColor);
      const barW = W - 156;
      makeBar(this, 48, ry + 24, barW, 5, Math.min(1, battles/tier.battles_needed), C.blue, C.dark, 3);
      makeBar(this, 48, ry + 33, barW, 5, Math.min(1, wins/tier.wins_needed), C.gold, C.dark, 3);
      txt(this, W-106, ry+8,  `💎${tier.diamonds}`, 11, '#3cc8dc');
      txt(this, W-106, ry+22, `💰${tier.gold}`,      11, '#ffc83c');
      if (gotIt) {
        txt(this, W-30, ry+(rowH-6)/2, '✅', 15).setOrigin(0.5);
      } else if (isClaim) {
        const bw=52, bh=24, bx=W-66, by2=ry+(rowH-6)/2-bh/2;
        const btnG = this.add.graphics();
        btnG.fillStyle(C.green,1); btnG.fillRoundedRect(bx,by2,bw,bh,7);
        const btnT = txt(this,bx+bw/2,by2+bh/2,'Взять',10,'#1a1a28',true).setOrigin(0.5);
        this.add.zone(bx,by2,bw,bh).setOrigin(0).setInteractive({useHandCursor:true})
          .on('pointerdown',()=>{btnG.clear();btnG.fillStyle(0x28a050,1);btnG.fillRoundedRect(bx,by2,bw,bh,7);})
          .on('pointerup',()=>this._claimTier(tier.tier,btnG,btnT,bg,bx,by2,bw,bh,ry,rowH))
          .on('pointerout',()=>{btnG.clear();btnG.fillStyle(C.green,1);btnG.fillRoundedRect(bx,by2,bw,bh,7);});
      } else {
        txt(this, W-30, ry+(rowH-6)/2, '🔒', 13).setOrigin(0.5);
      }
    });

    /* ── Натиск-бонусы ── */
    let ny = startY + tiers.length * rowH + 10;
    const sepG = this.add.graphics();
    sepG.lineStyle(1, 0xdc3c46, 0.4); sepG.lineBetween(8, ny, W-8, ny);
    txt(this, W/2, ny+4, '🔥 НАТИСК-БОНУСЫ', 10, '#ff8855', true).setOrigin(0.5);
    ny += 16;
    endlessTiers.forEach(et => {
      const ey    = ny;
      const done2 = endlessDone >= et.needed;
      const got   = endlessClaimed >= et.tier;
      const canCl = done2 && !got;
      const ebG   = this.add.graphics();
      ebG.fillStyle(got ? 0x1a1000 : done2 ? 0x1a0e00 : C.bgPanel, 0.92);
      ebG.fillRoundedRect(8, ey, W-16, 46, 9);
      ebG.lineStyle(1.5, got ? C.gold : done2 ? 0xdc3c46 : C.dark, got||done2 ? 0.6 : 0.2);
      ebG.strokeRoundedRect(8, ey, W-16, 46, 9);
      txt(this, 22, ey+23, '🔥', 16).setOrigin(0.5);
      txt(this, 40, ey+10, et.label, 11, done2 ? '#ff8855' : '#9999bb', done2);
      makeBar(this, 40, ey+26, W-148, 5, Math.min(1, endlessDone/et.needed), 0xdc3c46, C.dark, 3);
      txt(this, 40+(W-148)*Math.min(1,endlessDone/et.needed)+4, ey+22, `${Math.min(endlessDone,et.needed)}/${et.needed}`, 8, '#ff8855').setOrigin(0,0.5);
      txt(this, W-106, ey+6,  `💎${et.diamonds}`, 10, '#3cc8dc');
      txt(this, W-106, ey+20, `🪙${et.gold}`,      10, '#ffc83c');
      if (got) {
        txt(this, W-30, ey+23, '✅', 14).setOrigin(0.5);
      } else if (canCl) {
        const bw=52,bh=22,bx=W-66,by2=ey+12;
        const bG=this.add.graphics(); bG.fillStyle(0xdc3c46,1); bG.fillRoundedRect(bx,by2,bw,bh,7);
        const bT=txt(this,bx+bw/2,by2+bh/2,'Взять',10,'#ffffff',true).setOrigin(0.5);
        this.add.zone(bx,by2,bw,bh).setOrigin(0).setInteractive({useHandCursor:true})
          .on('pointerdown',()=>{bG.clear();bG.fillStyle(0xaa2020,1);bG.fillRoundedRect(bx,by2,bw,bh,7);tg?.HapticFeedback?.impactOccurred('medium');})
          .on('pointerup',()=>this._claimEndlessTier(et.tier,bG,bT,bx,by2,bw,bh))
          .on('pointerout',()=>{bG.clear();bG.fillStyle(0xdc3c46,1);bG.fillRoundedRect(bx,by2,bw,bh,7);});
      } else {
        txt(this, W-30, ey+23, '🔒', 13).setOrigin(0.5);
      }
      ny += 52;
    });
  }

  async _claimTier(tier, btnG, btnT, bg, bx, by2, bw, bh, ry, rowH) {
    tg?.HapticFeedback?.impactOccurred('medium');
    btnT?.setText('...');
    try {
      const res = await post('/api/battlepass/claim', { tier });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        Sound.questDone();
        btnG.setAlpha(0.4); btnT?.setText('✅');
        _rewardAnim(this, { gold: res.gold || 0, diamonds: res.diamonds || 0 },
          () => this.scene.restart());
      } else {
        btnG.clear(); btnG.fillStyle(C.green,1); btnG.fillRoundedRect(bx,by2,bw,bh,8);
        btnT?.setText(res.reason || 'Ошибка');
        this.time.delayedCall(1500, () => { btnT?.setText('Взять'); });
      }
    } catch (_) {
      btnG.clear(); btnG.fillStyle(C.green,1); btnG.fillRoundedRect(bx,by2,bw,bh,8);
      btnT?.setText('Ошибка');
    }
  }

  async _claimEndlessTier(tier, bG, bT, bx, by2, bw, bh) {
    tg?.HapticFeedback?.impactOccurred('medium');
    bT.setText('...');
    try {
      const res = await post('/api/battlepass/claim_endless', { tier });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        Sound.questDone();
        bG.setAlpha(0.4); bT.setText('✅');
        _rewardAnim(this, { gold: res.gold || 0, diamonds: res.diamonds || 0 },
          () => this.scene.restart());
      } else {
        bG.clear(); bG.fillStyle(0xdc3c46,1); bG.fillRoundedRect(bx,by2,bw,bh,7);
        bT.setText(res.reason || 'Ошибка');
        this.time.delayedCall(1500, () => bT.setText('Взять'));
      }
    } catch (_) {
      bG.clear(); bG.fillStyle(0xdc3c46,1); bG.fillRoundedRect(bx,by2,bw,bh,7);
      bT.setText('Ошибка');
    }
  }

  _toast(msg) {
    const t = txt(this, this.W/2, this.H - 80, msg, 13, '#ffc83c', true).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 40, duration: 2500, onComplete: () => t.destroy() });
  }
}

/* ═══════════════════════════════════════════════════════════
   CLAN SCENE — полная клановая система
   ═══════════════════════════════════════════════════════════ */
class ClanScene extends Phaser.Scene {
  constructor() { super('Clan'); }

  init(data) {
    this._subview = (data && data.sub) ? data.sub : 'main';
    this._busy = false;
  }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    _extraBg(this, W, H);
    /* Заголовок и кнопку «Назад» рисуем только НЕ для чата — в чате своя шапка */
    if (this._subview !== 'chat') {
      _extraHeader(this, W, '⚔️', 'КЛАН', 'Кланы · Поиск · Рейтинг');
      /* Из подразделов возвращаемся в главный экран клана, из main — в Menu */
      if (this._subview === 'main') {
        _extraBack(this, 'Menu', 'more');   /* → Menu → вкладка Еще */
      } else {
        makeBackBtn(this, 'Назад', () => {
          tg?.HapticFeedback?.impactOccurred('light');
          this.scene.restart({ sub: 'main' });
        });
      }
    }
    this._loading = txt(this, W/2, H/2, 'Загрузка...', 14, '#9999bb').setOrigin(0.5);
    get('/api/clan').then(d => this._route(d, W, H)).catch(() => {
      this._loading?.setText('❌ Нет соединения');
    });
  }

  _route(data, W, H) {
    this._loading?.destroy();
    if (!data.ok) {
      txt(this, W/2, H/2 - 10, '❌ Ошибка загрузки', 14, '#dc3c46').setOrigin(0.5);
      txt(this, W/2, H/2 + 14, data.reason || 'Попробуйте позже', 11, '#9999bb').setOrigin(0.5);
      return;
    }
    try {
      if (data.clan) {
        if (this._subview === 'chat') this._renderChat(data, W, H);
        else                          this._renderMyClan(data, W, H);
      } else {
        if      (this._subview === 'search') this._renderSearch(W, H);
        else if (this._subview === 'create') this._renderCreate(W, H);
        else if (this._subview === 'top')    this._renderTop(W, H);
        else                                  this._renderNoClan(W, H);
      }
    } catch(e) {
      console.error('ClanScene render error:', e);
      txt(this, W/2, H/2, '⚠️ Ошибка: ' + e.message, 11, '#dc3c46').setOrigin(0.5);
    }
  }

  /* ══ НЕТ КЛАНА ══════════════════════════════════════════ */
  _renderNoClan(W, H) {
    txt(this, W/2, 90, '🏰', 34).setOrigin(0.5);
    txt(this, W/2, 128, 'Вы не состоите в клане', 15, '#a0a0cc').setOrigin(0.5);
    txt(this, W/2, 150, 'Вступайте и участвуйте в клановых войнах!', 12, '#9090cc').setOrigin(0.5);

    const btns = [
      { label: '🔍  Найти клан',   col: C.blue,   sub: 'search' },
      { label: '➕  Создать клан', col: C.purple, sub: 'create' },
      { label: '🏆  Топ кланов',   col: C.dark,   sub: 'top', border: C.gold },
    ];
    btns.forEach((b, i) => {
      const by = 176 + i * 58, bh = 46;
      const bg = this.add.graphics();
      bg.fillStyle(b.col, b.col === C.dark ? 0.7 : 0.9);
      bg.fillRoundedRect(16, by, W-32, bh, 12);
      if (b.border) { bg.lineStyle(1.5, b.border, 0.5); bg.strokeRoundedRect(16,by,W-32,bh,12); }
      txt(this, W/2, by + bh/2, b.label, 14, '#f0f0fa', true).setOrigin(0.5);
      this.add.zone(16, by, W-32, bh).setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { bg.clear(); bg.fillStyle(C.dark,1); bg.fillRoundedRect(16,by,W-32,bh,12); tg?.HapticFeedback?.impactOccurred('light'); })
        .on('pointerout',  () => { bg.clear(); bg.fillStyle(b.col,b.col===C.dark?0.7:0.9); bg.fillRoundedRect(16,by,W-32,bh,12); if(b.border){bg.lineStyle(1.5,b.border,0.5);bg.strokeRoundedRect(16,by,W-32,bh,12);} })
        .on('pointerup',   () => this.scene.restart({ sub: b.sub }));
    });
    txt(this, W/2, 176 + 3*58 + 8, 'Создание клана стоит 200 🪙', 12, '#9090cc').setOrigin(0.5);
  }

  /* ══ МОЙ КЛАН ═══════════════════════════════════════════ */
  _renderMyClan(data, W, H) {
    const clan     = data.clan;
    const members  = data.members || [];
    const isLeader = data.is_leader;
    let y = 84;

    const trunc = (s, n) => s && s.length > n ? s.slice(0, n) + '…' : (s || '');

    /* ── Инфо-панель клана ─────────────────────────────── */
    const infoH = 80;
    makePanel(this, 8, y, W-16, infoH, 12);

    /* Тег слева */
    txt(this, 20, y+12, `[${clan.tag}]`, 14, '#ffc83c', true);
    /* Название */
    txt(this, 20, y+32, trunc(clan.name, 20), 16, '#f0f0fa', true);
    /* Статы */
    txt(this, 20, y+56, `👥 ${members.length}/20  ·  🏆 ${clan.wins}  ·  Ур.${clan.level}`, 12, '#a0a0cc');
    if (isLeader) txt(this, W-20, y+14, '👑 Лидер', 12, '#ffc83c', true).setOrigin(1, 0);
    y += infoH + 10;

    /* ── Заголовок списка ──────────────────────────────── */
    txt(this, 16, y, `УЧАСТНИКИ  (${members.length}/20)`, 13, '#7070aa', true);
    y += 22;

    /* ── Список участников ─────────────────────────────── */
    const rowH    = 44;
    /* 64 = зона кнопок внизу (42px кнопка + 22px отступы) */
    const maxShow = Math.min(members.length, Math.floor((H - y - 64) / rowH));

    members.slice(0, maxShow).forEach((m, i) => {
      const ry = y + i * rowH;
      const isLdr = m.role === 'leader';
      const bg = this.add.graphics();
      bg.fillStyle(isLdr ? 0x2a2010 : C.bgPanel, 0.85);
      bg.fillRoundedRect(8, ry, W-16, rowH-3, 8);
      if (isLdr) { bg.lineStyle(1.5, C.gold, 0.4); bg.strokeRoundedRect(8, ry, W-16, rowH-3, 8); }

      txt(this, 22, ry + rowH/2 - 4, isLdr ? '👑' : '⚔️', 15).setOrigin(0, 0.5);
      txt(this, 44, ry+10, trunc(m.username || `User${m.user_id}`, 17), 13,
        isLdr ? '#ffc83c' : '#e0e0f8', isLdr);
      txt(this, 44, ry+27, `Ур.${m.level}  ·  ${m.wins} побед`, 11, '#7070aa');

      /* Роль/кнопка */
      if (isLdr) {
        txt(this, W-18, ry + rowH/2, 'Лидер', 11, '#ffc83c', true).setOrigin(1, 0.5);
      } else if (isLeader) {
        /* Кнопка «👑 Передать» — только для текущего лидера */
        const bx = W - 82, bw = 70, bh = 26, by2 = ry + (rowH-3)/2 - 13;
        const tBg = this.add.graphics();
        tBg.fillStyle(0x3a2800, 1); tBg.fillRoundedRect(bx, by2, bw, bh, 7);
        tBg.lineStyle(1, C.gold, 0.6); tBg.strokeRoundedRect(bx, by2, bw, bh, 7);
        txt(this, bx + bw/2, by2 + bh/2, '👑 Передать', 10, '#ffc83c').setOrigin(0.5);
        this.add.zone(bx, by2, bw, bh).setOrigin(0).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => { tBg.clear(); tBg.fillStyle(0x5a3c00,1); tBg.fillRoundedRect(bx,by2,bw,bh,7); tg?.HapticFeedback?.impactOccurred('medium'); })
          .on('pointerout',  () => { tBg.clear(); tBg.fillStyle(0x3a2800,1); tBg.fillRoundedRect(bx,by2,bw,bh,7); tBg.lineStyle(1,C.gold,0.6); tBg.strokeRoundedRect(bx,by2,bw,bh,7); })
          .on('pointerup',   () => this._showTransferConfirm(m, W, H));
      }
    });

    if (members.length > maxShow) {
      txt(this, W/2, y + maxShow*rowH + 6, `+ ещё ${members.length - maxShow} участников`, 12, '#8888cc').setOrigin(0.5);
    }

    /* ── Кнопки внизу ───────────────────────────────────── */
    /* Кнопки: высота 42px, нижний отступ 14px → btnZone = H - 56 */
    const btnZone = H - 56;

    /* Кнопка «💬 Чат» */
    const chatBtnW = isLeader ? W-32 : Math.round((W-40)/2);
    const chatBg = this.add.graphics();
    chatBg.fillStyle(0x1a4a8a, 1); chatBg.fillRoundedRect(16, btnZone, chatBtnW, 42, 10);
    chatBg.lineStyle(1.5, 0x5096ff, 0.7); chatBg.strokeRoundedRect(16, btnZone, chatBtnW, 42, 10);
    txt(this, 16 + chatBtnW/2, btnZone+21, '💬  Чат клана', 13, '#a8d4ff', true).setOrigin(0.5);
    this.add.zone(16, btnZone, chatBtnW, 42).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { chatBg.clear(); chatBg.fillStyle(0x0e2a5a,1); chatBg.fillRoundedRect(16,btnZone,chatBtnW,42,10); tg?.HapticFeedback?.impactOccurred('light'); })
      .on('pointerout',  () => { chatBg.clear(); chatBg.fillStyle(0x1a4a8a,1); chatBg.fillRoundedRect(16,btnZone,chatBtnW,42,10); chatBg.lineStyle(1.5,0x5096ff,0.7); chatBg.strokeRoundedRect(16,btnZone,chatBtnW,42,10); })
      .on('pointerup',   () => this.scene.restart({ sub: 'chat' }));

    if (!isLeader) {
      /* Кнопка «Покинуть» справа */
      const lx = 16 + chatBtnW + 8, lw = W - 32 - chatBtnW - 8;
      const bg2 = this.add.graphics();
      bg2.fillStyle(0x4a1010, 1); bg2.fillRoundedRect(lx, btnZone, lw, 42, 10);
      bg2.lineStyle(1.5, C.red, 0.7); bg2.strokeRoundedRect(lx, btnZone, lw, 42, 10);
      txt(this, lx + lw/2, btnZone+21, '🚪 Выйти', 13, '#ff6666', true).setOrigin(0.5);
      this.add.zone(lx, btnZone, lw, 42).setOrigin(0).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { bg2.clear(); bg2.fillStyle(0x6a1818,1); bg2.fillRoundedRect(lx,btnZone,lw,42,10); tg?.HapticFeedback?.impactOccurred('medium'); })
        .on('pointerout',  () => { bg2.clear(); bg2.fillStyle(0x4a1010,1); bg2.fillRoundedRect(lx,btnZone,lw,42,10); bg2.lineStyle(1.5,C.red,0.7); bg2.strokeRoundedRect(lx,btnZone,lw,42,10); })
        .on('pointerup',   () => this._leaveClan());
    } else {
      /* Подсказка лидеру — ВЫШЕ кнопки, не перекрывает её */
      txt(this, W/2, btnZone - 16, '👑 Передайте роль, чтобы покинуть клан', 11, '#8888cc').setOrigin(0.5);
    }
  }

  /* ══ ЧАТ КЛАНА ══════════════════════════════════════════ */
  _renderChat(data, W, H) {
    const clan = data.clan;
    this._chatMyId = data.my_user_id;

    const stopTimer = () => {
      if (this._chatTimer) { this._chatTimer.remove(false); this._chatTimer = null; }
    };

    /* ── Шапка (полная ширина) ── */
    const hdrH = 58;
    const hdrG = this.add.graphics();
    hdrG.fillStyle(0x1a3060, 1);
    hdrG.fillRoundedRect(0, 0, W, hdrH, 0);
    hdrG.lineStyle(1.5, 0xffc83c, 0.5);
    hdrG.lineBetween(0, hdrH, W, hdrH);

    /* ← В клан (слева) */
    const backG = this.add.graphics();
    backG.fillStyle(0x2a4a8a, 1); backG.fillRoundedRect(10, 12, 80, 34, 9);
    txt(this, 50, 29, '← В клан', 12, '#a8d4ff', true).setOrigin(0.5);
    this.add.zone(10, 12, 80, 34).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { backG.clear(); backG.fillStyle(0x1a2a5a,1); backG.fillRoundedRect(10,12,80,34,9); })
      .on('pointerout',  () => { backG.clear(); backG.fillStyle(0x2a4a8a,1); backG.fillRoundedRect(10,12,80,34,9); })
      .on('pointerup', () => {
        tg?.HapticFeedback?.impactOccurred('light');
        stopTimer();
        this.scene.restart({ sub: 'main' });  /* явно указываем main — не чат */
      });

    /* Название клана по центру */
    txt(this, W/2, 20, '💬 ЧАТ КЛАНА', 13, '#ffc83c', true).setOrigin(0.5);
    txt(this, W/2, 40, `[${clan.tag}] ${clan.name}`, 11, '#8888bb').setOrigin(0.5);

    /* 🔄 кнопка справа */
    const rG = this.add.graphics();
    rG.fillStyle(0x2a4a8a, 1); rG.fillRoundedRect(W-50, 12, 38, 34, 9);
    txt(this, W-31, 29, '🔄', 14).setOrigin(0.5);
    this.add.zone(W-50, 12, 38, 34).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerup', () => this._chatLoad(msgAreaY, msgAreaH, W));

    /* ── Поле ввода + кнопка (выше нижнего края) ── */
    const inputH = 44, inputY = H - inputH - 56;  /* 56px от низа = выше таббара */
    const sendW  = 58, inpW = W - 16 - 8 - sendW - 8;

    /* фон строки ввода */
    const inpRowG = this.add.graphics();
    inpRowG.fillStyle(0x12204a, 1);
    inpRowG.fillRect(0, inputY - 6, W, inputH + 12);

    this._chatInput = this._makeInput(W, inputY, inpW, inputH, '✏️ Написать сообщение...', 200, 16);

    const sbx = 16 + inpW + 8;
    const sendG = this.add.graphics();
    sendG.fillStyle(0x3a7aff, 1); sendG.fillRoundedRect(sbx, inputY, sendW, inputH, 10);
    txt(this, sbx + sendW/2, inputY + inputH/2, '➤', 17, '#ffffff', true).setOrigin(0.5);
    this.add.zone(sbx, inputY, sendW, inputH).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { sendG.clear(); sendG.fillStyle(0x2050d0,1); sendG.fillRoundedRect(sbx,inputY,sendW,inputH,10); })
      .on('pointerout',  () => { sendG.clear(); sendG.fillStyle(0x3a7aff,1); sendG.fillRoundedRect(sbx,inputY,sendW,inputH,10); })
      .on('pointerup', () => this._sendChatMsg(msgAreaY, msgAreaH, W));

    /* ── Область сообщений (между шапкой и строкой ввода) ── */
    const msgAreaY = hdrH + 6;
    const msgAreaH = inputY - 6 - msgAreaY - 6;

    const msgsG = this.add.graphics();
    msgsG.fillStyle(C.bgPanel, 0.4);
    msgsG.fillRoundedRect(8, msgAreaY, W-16, msgAreaH, 8);

    /* ── Загрузчик и рендер ── */
    this._msgObjs = [];

    this._chatLoad = (aY, aH, cW) => {
      this._msgObjs.forEach(o => { try { o.destroy(); } catch(_){} });
      this._msgObjs = [];
      const spin = txt(this, cW/2, aY+aH/2, '⏳ Загрузка...', 12, '#9090cc').setOrigin(0.5);
      this._msgObjs.push(spin);

      get('/api/clan/chat').then(d => {
        spin.destroy();
        this._msgObjs = this._msgObjs.filter(o => o !== spin);
        const msgs = d.messages || [];

        if (!msgs.length) {
          const e = txt(this, cW/2, aY+aH/2, '💬 Напишите первым!', 12, '#8888cc').setOrigin(0.5);
          this._msgObjs.push(e); return;
        }

        const lineH = 40;
        const maxL  = Math.floor(aH / lineH);
        msgs.slice(-maxL).forEach((m, i) => {
          const isMe = (m.user_id === this._chatMyId);
          const my   = aY + aH - (Math.min(msgs.length, maxL) - i) * lineH;
          const bg   = this.add.graphics();
          bg.fillStyle(isMe ? 0x1a3a7a : 0x1e1c34, 0.95);
          bg.fillRoundedRect(10, my+2, cW-20, lineH-4, 8);
          const nc = isMe ? '#7ab4ff' : '#ffc83c';
          const maxMsgCh = Math.floor((cW - 32) / 7);  // ~7px/символ при 12px
          const nameStr  = isMe ? 'Вы' : (m.username||'Игрок').slice(0, 14);
          const msgStr   = (m.message||'').slice(0, maxMsgCh);
          const t1 = txt(this, 20, my+10, nameStr, 12, nc, true);
          const t2 = txt(this, 20, my+24, msgStr,  12, '#e8e8ff');
          const t3 = txt(this, cW-14, my+10, m.time_str||'', 11, '#8888cc').setOrigin(1, 0);
          this._msgObjs.push(bg, t1, t2, t3);
        });
      }).catch(() => { spin.setText('❌ Нет соединения'); });
    };

    this._chatLoad(msgAreaY, msgAreaH, W);

    this._chatTimer = this.time.addEvent({
      delay: 20000, loop: true,
      callback: () => this._chatLoad(msgAreaY, msgAreaH, W),
    });
  }

  async _sendChatMsg(msgAreaY, msgAreaH, W) {
    if (this._busy) return;
    const msg = this._chatInput?.value?.trim() || '';
    if (!msg) { this._toast('✏️ Введите сообщение'); return; }
    this._busy = true;
    try {
      const res = await post('/api/clan/chat/send', { message: msg });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        if (this._chatInput) this._chatInput.value = '';
        if (this._chatLoad) this._chatLoad(msgAreaY, msgAreaH, W);
      } else { this._toast('❌ ' + (res.reason || 'Ошибка')); }
    } catch(_) { this._toast('❌ Нет соединения'); }
    this._busy = false;
  }

  /* ══ ПОИСК ═══════════════════════════════════════════════ */
  _renderSearch(W, H) {
    /* Шапка заканчивается на y=72, даём 12px отступ → y=84 для строки поиска */
    makePanel(this, 8, 80, W-16, 48, 10, 0.8);
    txt(this, 20, 91, '🔍 Введите имя или тег клана:', 11, '#9999bb');
    this._inputEl = this._makeInput(W, 104, W-32, 32, 'Железный Кулак / ЖК...');

    const sbG = this.add.graphics();
    sbG.fillStyle(C.blue, 0.9); sbG.fillRoundedRect(16, 140, W-32, 40, 10);
    txt(this, W/2, 160, '🔍 Найти', 13, '#ffffff', true).setOrigin(0.5);
    this.add.zone(16, 140, W-32, 40).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { sbG.clear(); sbG.fillStyle(0x1040a0,1); sbG.fillRoundedRect(16,140,W-32,40,10); tg?.HapticFeedback?.impactOccurred('light'); })
      .on('pointerout',  () => { sbG.clear(); sbG.fillStyle(C.blue,0.9); sbG.fillRoundedRect(16,140,W-32,40,10); })
      .on('pointerup', () => this._doSearch(W));

    txt(this, W/2, 192, 'Все кланы:', 11, '#7777aa').setOrigin(0.5);
    this._resultsY = 204;
    this._resultsContainer = this.add.container(0, 0);
    get('/api/clan/top').then(d => this._showSearchResults(d.clans || [], W));
  }

  /* gameX — необязательная x-координата в игровых пикселях; если null — центрирует */
  _makeInput(W, y, w, h, placeholder, maxLen = 20, gameX = null) {
    const el = document.createElement('input');
    el.type = 'text'; el.placeholder = placeholder; el.maxLength = maxLen;
    const canvasLeft = Math.round((window.innerWidth - W) / 2);
    const left = gameX !== null
      ? Math.round(canvasLeft + gameX)
      : Math.round((window.innerWidth - w) / 2);
    const top  = Math.round(y + (window.innerHeight - this.H) / 2);
    el.style.cssText = `position:fixed;left:${left}px;top:${top}px;width:${w}px;height:${h}px;
      padding:0 12px;background:#1e3878;color:#f0f0fa;border:2px solid #5096ffaa;
      border-radius:10px;font-size:14px;outline:none;z-index:999;
      overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
      box-sizing:border-box;`;
    document.body.appendChild(el);
    this.events.once('shutdown', () => el.remove());
    this.events.once('destroy',  () => el.remove());
    return el;
  }

  async _doSearch(W) {
    if (this._busy) return;
    this._busy = true;
    const q = this._inputEl?.value?.trim() || '';
    try {
      const d = await get('/api/clan/search', { q });
      this._showSearchResults(d.clans || [], W);
    } catch(_) { this._toast('❌ Нет соединения'); }
    this._busy = false;
  }

  _showSearchResults(clans, W) {
    this._resultsContainer?.removeAll(true);
    const y0 = this._resultsY || 198;
    if (!clans.length) {
      this._resultsContainer.add(txt(this, W/2, y0+20, '😔 Ничего не найдено', 12, '#9999bb').setOrigin(0.5));
      return;
    }
    clans.forEach((c, i) => {
      const ry = y0 + i * 48;
      const bg = this.add.graphics();
      bg.fillStyle(C.bgPanel, 0.9); bg.fillRoundedRect(8, ry, W-16, 44, 10);
      bg.lineStyle(1, C.dark, 0.6); bg.strokeRoundedRect(8, ry, W-16, 44, 10);
      const joinG = this.add.graphics();
      joinG.fillStyle(C.green, 0.85); joinG.fillRoundedRect(W-74, ry+8, 60, 28, 8);
      const joinT = txt(this, W-44, ry+22, 'Вступить', 11, '#1a1a28', true).setOrigin(0.5);
      this._resultsContainer.add([
        bg,
        txt(this, 18, ry+8,  `[${c.tag}]`, 12, '#ffc83c', true),
        txt(this, 18, ry+26, (s => s.length > 20 ? s.slice(0,20)+'…' : s)(c.name||''), 11, '#c0c0e0'),
        txt(this, W-82, ry+8,  `👥 ${c.member_count}/20`, 11, '#9999bb'),
        txt(this, W-82, ry+26, `🏆 ${c.wins}`, 11, '#ffc83c'),
        joinG, joinT,
        this.add.zone(W-74, ry+8, 60, 28).setOrigin(0).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => { joinG.clear(); joinG.fillStyle(0x28a050,1); joinG.fillRoundedRect(W-74,ry+8,60,28,8); tg?.HapticFeedback?.impactOccurred('medium'); })
          .on('pointerout',  () => { joinG.clear(); joinG.fillStyle(C.green,0.85); joinG.fillRoundedRect(W-74,ry+8,60,28,8); })
          .on('pointerup',   () => this._joinClan(c.id, c.name, joinT)),
      ]);
    });
  }

  /* ══ СОЗДАНИЕ ════════════════════════════════════════════ */
  _renderCreate(W, H) {
    txt(this, W/2, 86, '➕ СОЗДАТЬ КЛАН', 14, '#ffc83c', true).setOrigin(0.5);
    txt(this, W/2, 104, 'Стоимость: 200 🪙  ·  Максимум 20 участников', 11, '#8080cc').setOrigin(0.5);

    /* Поле: название */
    makePanel(this, 8, 118, W-16, 152, 12);
    txt(this, 20, 128, 'Название клана', 12, '#a0a0cc', true);
    txt(this, 20, 144, '3–20 символов, например: Железный Кулак', 11, '#9090cc');
    this._nameEl = this._makeInput(W, 158, W-32, 36, 'Железный Кулак', 20);

    txt(this, 20, 204, 'Тег клана', 12, '#a0a0cc', true);
    txt(this, 20, 220, '2–4 символа, например: ЖК', 11, '#9090cc');
    this._tagEl  = this._makeInput(W, 232, (W-32)/2, 36, 'ЖК', 4);

    const btnY = 280;
    const bgC  = this.add.graphics();
    bgC.fillStyle(C.purple, 0.9); bgC.fillRoundedRect(16, btnY, W-32, 48, 12);
    bgC.fillStyle(0xffffff, 0.08); bgC.fillRoundedRect(18, btnY+2, W-36, 22, 10);
    const btnT = txt(this, W/2, btnY+24, '⚔️  Основать клан  (200 🪙)', 14, '#ffffff', true).setOrigin(0.5);
    this.add.zone(16, btnY, W-32, 48).setOrigin(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { bgC.clear(); bgC.fillStyle(0x6600cc,1); bgC.fillRoundedRect(16,btnY,W-32,48,12); tg?.HapticFeedback?.impactOccurred('heavy'); })
      .on('pointerout',  () => { bgC.clear(); bgC.fillStyle(C.purple,0.9); bgC.fillRoundedRect(16,btnY,W-32,48,12); })
      .on('pointerup',   () => this._doCreate(btnT));

    txt(this, W/2, btnY+60, 'Имя и тег должны быть уникальны', 11, '#8888cc').setOrigin(0.5);
  }

  /* ══ ТОП КЛАНОВ ══════════════════════════════════════════ */
  _renderTop(W, H) {
    txt(this, W/2, 86, '🏆 ТОП КЛАНОВ', 14, '#ffc83c', true).setOrigin(0.5);
    const load2 = txt(this, W/2, 140, 'Загрузка...', 13, '#7070aa').setOrigin(0.5);
    get('/api/clan/top').then(d => {
      load2.destroy();
      const clans = d.clans || [];
      if (!clans.length) { txt(this, W/2, 140, '😔 Кланов пока нет', 13, '#7070aa').setOrigin(0.5); return; }
      let y = 112;
      const rowH = 50;
      clans.slice(0, Math.floor((H - 160) / rowH)).forEach((c, i) => {
        const isTop = i < 3;
        const bg = this.add.graphics();
        bg.fillStyle(isTop ? 0x2a2010 : C.bgPanel, 0.92);
        bg.fillRoundedRect(8, y, W-16, rowH-3, 10);
        if (isTop) { bg.lineStyle(1.5, C.gold, 0.6); bg.strokeRoundedRect(8,y,W-16,rowH-3,10); }
        const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`;
        txt(this, 20, y + (rowH-3)/2, medal, isTop?17:13, '#ffc83c').setOrigin(0, 0.5);
        const ttr = (s, n) => s && s.length > n ? s.slice(0, n) + '…' : (s || '');
        txt(this, 48, y+10, `[${c.tag}] ${ttr(c.name, 16)}`, 13, isTop?'#ffc83c':'#e0e0f8', isTop);
        txt(this, 48, y+27, `🏆 ${c.wins} побед  ·  👥 ${c.member_count}чел`, 11, '#8888bb');
        txt(this, W-18, y + (rowH-3)/2, `Ур.${c.level}`, 12, '#a0a0cc').setOrigin(1, 0.5);
        y += rowH;
      });
    }).catch(() => load2.setText('❌ Ошибка'));
  }

  /* ══ ДЕЙСТВИЯ ════════════════════════════════════════════ */
  async _joinClan(clanId, clanName, btnT) {
    if (this._busy) return; this._busy = true;
    btnT?.setText('...');
    try {
      const res = await post('/api/clan/join', { clan_id: clanId });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success'); Sound.questDone();
        if (res.player) State.player = res.player;
        this._toast(`⚔️ Вы вступили в клан ${clanName}!`);
        this.time.delayedCall(700, () => this.scene.restart());
      } else { this._toast(`❌ ${res.reason}`); btnT?.setText('Вступить'); }
    } catch(_) { this._toast('❌ Нет соединения'); btnT?.setText('Вступить'); }
    this._busy = false;
  }

  async _doCreate(btnT) {
    if (this._busy) return;
    const name = this._nameEl?.value?.trim() || '';
    const tag  = this._tagEl?.value?.trim()  || '';
    if (name.length < 3) { this._toast('❌ Название минимум 3 символа'); return; }
    if (tag.length  < 2) { this._toast('❌ Тег минимум 2 символа'); return; }
    this._busy = true; btnT?.setText('Создаём...');
    try {
      const res = await post('/api/clan/create', { name, tag });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success'); Sound.levelUp();
        if (res.player) State.player = res.player;
        this._toast(`🏰 Клан [${res.tag}] ${res.name} основан!`);
        this.time.delayedCall(700, () => this.scene.restart());
      } else { this._toast(`❌ ${res.reason}`); btnT?.setText('⚔️  Основать клан  (200 🪙)'); }
    } catch(_) { this._toast('❌ Нет соединения'); btnT?.setText('⚔️  Основать клан  (200 🪙)'); }
    this._busy = false;
  }

  async _leaveClan() {
    if (this._busy) return; this._busy = true;
    try {
      const res = await post('/api/clan/leave');
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        if (res.player) State.player = res.player;
        this._toast('🚪 Вы покинули клан');
        this.time.delayedCall(600, () => this.scene.restart());
      } else { this._toast(`❌ ${res.reason}`); }
    } catch(_) { this._toast('❌ Нет соединения'); }
    this._busy = false;
  }

  _showTransferConfirm(member, W, H) {
    /* Затемнение */
    const ov = this.add.graphics().setDepth(90);
    ov.fillStyle(0x000000, 0.6); ov.fillRect(0, 0, W, H);

    /* Попап */
    const pw = W - 48, ph = 168, px = 24, py = Math.round((H - ph) / 2);
    const D = 92;
    const bg = this.add.graphics().setDepth(D);
    bg.fillStyle(0x1e3060, 1); bg.fillRoundedRect(px, py, pw, ph, 14);
    bg.lineStyle(2, 0xffc83c, 0.9); bg.strokeRoundedRect(px, py, pw, ph, 14);

    txt(this, px+pw/2, py+22, '👑 Передача лидерства', 14, '#ffc83c', true)
      .setOrigin(0.5).setDepth(D);
    txt(this, px+pw/2, py+46, 'Передать лидерство игроку:', 11, '#a8c4ff')
      .setOrigin(0.5).setDepth(D);
    txt(this, px+pw/2, py+66, `${member.username || `User${member.user_id}`}`, 14, '#f0f0fa', true)
      .setOrigin(0.5).setDepth(D);
    txt(this, px+pw/2, py+86, 'Отменить нельзя! Вы станете обычным участником.', 10, '#888888')
      .setOrigin(0.5).setDepth(D);

    const destroy = () => {
      [ov, bg, ...this._transferObjs].forEach(o => { try { o.destroy(); } catch(_){} });
      this._transferObjs = [];
    };

    /* Кнопка «Отмена» */
    const cx = px+8, cw = (pw-24)/2, ch = 38, cy = py+116;
    const cBg = this.add.graphics().setDepth(D);
    cBg.fillStyle(0x303060, 1); cBg.fillRoundedRect(cx, cy, cw, ch, 9);
    const cT = txt(this, cx+cw/2, cy+ch/2, '❌ Отмена', 12, '#a0a0ff', true)
      .setOrigin(0.5).setDepth(D);
    this.add.zone(cx, cy, cw, ch).setOrigin(0).setDepth(D+5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { cBg.clear(); cBg.fillStyle(0x202040,1); cBg.fillRoundedRect(cx,cy,cw,ch,9); })
      .on('pointerout',  () => { cBg.clear(); cBg.fillStyle(0x303060,1); cBg.fillRoundedRect(cx,cy,cw,ch,9); })
      .on('pointerup', () => { tg?.HapticFeedback?.impactOccurred('light'); destroy(); });

    /* Кнопка «Передать» */
    const ox = cx+cw+8, ow = cw;
    const oBg = this.add.graphics().setDepth(D);
    oBg.fillStyle(0x3a2800, 1); oBg.fillRoundedRect(ox, cy, ow, ch, 9);
    oBg.lineStyle(1.5, 0xffc83c, 0.8); oBg.strokeRoundedRect(ox, cy, ow, ch, 9);
    const oT = txt(this, ox+ow/2, cy+ch/2, '👑 Передать', 12, '#ffc83c', true)
      .setOrigin(0.5).setDepth(D);
    const oZ = this.add.zone(ox, cy, ow, ch).setOrigin(0).setDepth(D+5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { oBg.clear(); oBg.fillStyle(0x5a4000,1); oBg.fillRoundedRect(ox,cy,ow,ch,9); tg?.HapticFeedback?.impactOccurred('heavy'); })
      .on('pointerout',  () => { oBg.clear(); oBg.fillStyle(0x3a2800,1); oBg.fillRoundedRect(ox,cy,ow,ch,9); oBg.lineStyle(1.5,0xffc83c,0.8); oBg.strokeRoundedRect(ox,cy,ow,ch,9); })
      .on('pointerup', () => { destroy(); this._transferLeader(member.user_id); });

    this._transferObjs = [cBg, cT, oBg, oT, oZ,
      this.add.zone(0, 0, W, H).setOrigin(0).setDepth(89).setInteractive()
        .on('pointerup', () => destroy()),
    ];
  }

  async _transferLeader(newLeaderId) {
    if (this._busy) return; this._busy = true;
    try {
      const res = await post('/api/clan/transfer_leader', { new_leader_id: newLeaderId });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        this._toast('👑 Лидерство передано!');
        this.time.delayedCall(700, () => this.scene.restart({ sub: 'main' }));
      } else { this._toast(`❌ ${res.reason}`); }
    } catch(_) { this._toast('❌ Нет соединения'); }
    this._busy = false;
  }

  _toast(msg) {
    const t = txt(this, this.W/2, this.H-80, msg, 12, '#ffc83c', true).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: t, alpha: 0, y: t.y-36, duration: 2400, onComplete: () => t.destroy() });
  }
}

/* ═══════════════════════════════════════════════════════════
   NATISK SCENE — бесконечный режим выживания "Натиск"
   ═══════════════════════════════════════════════════════════ */
class NatiskScene extends Phaser.Scene {
  constructor() { super('Natisk'); }

  create() {
    const { width: W, height: H } = this.game.canvas;
    this.W = W; this.H = H;
    _extraBg(this, W, H);
    _extraHeader(this, W, '🔥', 'НАТИСК', 'Выживи как можно дольше на арене');
    _extraBack(this, 'Menu', 'battle');

    this._loading = txt(this, W/2, H/2, 'Загрузка...', 14, '#9999bb').setOrigin(0.5);
    get('/api/endless/status').then(d => this._render(d, W, H)).catch(() => {
      if (this._loading) this._loading.setText('❌ Нет соединения');
    });
  }

  _render(d, W, H) {
    if (this._loading) { this._loading.destroy(); this._loading = null; }
    if (!d.ok) { txt(this, W/2, H/2, '❌ Ошибка', 14, '#dc3c46').setOrigin(0.5); return; }

    const p = d.progress;

    /* ── Брошенный заход — сервер сбросит его при старте нового ── */
    // Если is_active, просто показываем меню; /api/endless/start сам завершит старый заход

    let y = 84;

    /* ── Рекорд ── */
    if (p.best_wave > 0) {
      makePanel(this, 8, y, W-16, 36, 10, 0.9);
      txt(this, 20, y+10, '🏆 Лучший результат:', 12, '#ffc83c', true);
      txt(this, W-16, y+10, `Волна ${p.best_wave}`, 13, '#ffffff', true).setOrigin(1, 0);
      y += 46;
    }

    {
      /* ── Попытки ── */
      const attG = this.add.graphics();
      attG.fillStyle(C.bgPanel, 0.9); attG.fillRoundedRect(8, y, W-16, 50, 10);
      const dots = '🔥'.repeat(Math.min(d.attempts_left, 5)) + (d.attempts_left > 5 ? `+${d.attempts_left-5}` : '') || '💀';
      txt(this, 20, y+10, 'Попытки:', 12, '#9999bb', true);
      txt(this, 20, y+28, dots, 14);
      txt(this, W-16, y+18, `${d.attempts_left} / ${d.base_attempts}`, 15, '#ffc83c', true).setOrigin(1, 0.5);
      y += 58;

      if (d.attempts_left > 0) {
        /* Кнопка "Начать" */
        const startG = this.add.graphics();
        startG.fillStyle(0xaa1a1a, 1); startG.fillRoundedRect(16, y, W-32, 52, 12);
        startG.fillStyle(0xffffff, 0.08); startG.fillRoundedRect(18, y+2, W-36, 24, 10);
        startG.lineStyle(2, 0xff4444, 0.7); startG.strokeRoundedRect(16, y, W-32, 52, 12);
        txt(this, W/2, y+26, '🔥  Начать Натиск', 15, '#ffffff', true).setOrigin(0.5);
        this.add.zone(16, y, W-32, 52).setOrigin(0).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => { startG.clear(); startG.fillStyle(0x880000,1); startG.fillRoundedRect(16,y,W-32,52,12); tg?.HapticFeedback?.impactOccurred('heavy'); })
          .on('pointerup',   () => this._startFight());
        y += 62;
      } else {
        makePanel(this, 8, y, W-16, 44, 10, 0.7);
        txt(this, W/2, y+13, '💀 Попытки закончились', 13, '#cc6666', true).setOrigin(0.5);
        txt(this, W/2, y+31, 'Восстановятся завтра', 11, '#9999bb').setOrigin(0.5);
        y += 54;
      }

      /* ── Купить попытки ── */
      y += 4;
      txt(this, W/2, y, '— купить попытки —', 11, '#7777aa').setOrigin(0.5);
      y += 16;

      /* За золото (1/день) */
      const halfW = (W-28)/2;
      const canGold = d.can_buy_gold && d.player_gold >= d.gold_cost;
      const gG = this.add.graphics();
      gG.fillStyle(canGold ? 0x2a2010 : C.dark, canGold ? 0.9 : 0.5);
      gG.fillRoundedRect(8, y, halfW, 42, 10);
      if (canGold) { gG.lineStyle(1.5, C.gold, 0.5); gG.strokeRoundedRect(8, y, halfW, 42, 10); }
      txt(this, 8+halfW/2, y+12, '+1 попытка', 11, canGold ? '#ffc83c' : '#666688', canGold).setOrigin(0.5);
      txt(this, 8+halfW/2, y+28, `${d.gold_cost} 🪙`, 12, canGold ? '#ffdca0' : '#555566', canGold).setOrigin(0.5);
      if (canGold) {
        this.add.zone(8, y, halfW, 42).setOrigin(0).setInteractive({ useHandCursor: true })
          .on('pointerup', () => this._buyAttempt('gold'));
      }

      /* За алмазы (5 штук) */
      const dBx = 8 + halfW + 12;
      const canDia = d.player_diamonds >= d.diamond_cost;
      const dG = this.add.graphics();
      dG.fillStyle(canDia ? 0x0a2035 : C.dark, canDia ? 0.9 : 0.5);
      dG.fillRoundedRect(dBx, y, halfW, 42, 10);
      if (canDia) { dG.lineStyle(1.5, 0x3cc8dc, 0.5); dG.strokeRoundedRect(dBx, y, halfW, 42, 10); }
      txt(this, dBx+halfW/2, y+12, '+3 попытки', 11, canDia ? '#3cc8dc' : '#666688', canDia).setOrigin(0.5);
      txt(this, dBx+halfW/2, y+28, `${d.diamond_cost} 💎`, 12, canDia ? '#a8e8ff' : '#555566', canDia).setOrigin(0.5);
      if (canDia) {
        this.add.zone(dBx, y, halfW, 42).setOrigin(0).setInteractive({ useHandCursor: true })
          .on('pointerup', () => this._buyAttempt('diamond'));
      }
      y += 52;
    }

    /* ── Задания ── */
    y += 10;
    const dailyWins  = d.daily_endless_wins  || 0;
    const weeklyWins = (d.weekly_endless || {}).weekly_wins || 0;
    const weeklyWave = (d.weekly_endless || {}).best_wave   || 0;
    const questsH = 88;
    makePanel(this, 8, y, W-16, questsH, 10, 0.85);
    txt(this, 20, y+8, '📋 Задания Натиска', 11, '#ffc83c', true);
    // Ежедневное
    const dDone = dailyWins >= 3;
    const dBar  = Math.min(1, dailyWins / 3);
    const bW    = W - 64;
    txt(this, 20, y+26, `🌅 Победи 3 врага сегодня  ${dailyWins}/3`, 10, dDone ? '#3cc864' : '#ccccee');
    const dBg = this.add.graphics();
    dBg.fillStyle(0x222233, 1); dBg.fillRoundedRect(20, y+38, bW, 6, 3);
    dBg.fillStyle(dDone ? 0x3cc864 : 0xdc3c46, 1); dBg.fillRoundedRect(20, y+38, Math.max(6, bW * dBar), 6, 3);
    if (dDone) txt(this, W-16, y+26, '✅ +80🪙 +1💎', 10, '#3cc864', true).setOrigin(1, 0);
    // Недельное победы
    const wDone = weeklyWins >= 10;
    const wBar  = Math.min(1, weeklyWins / 10);
    txt(this, 20, y+52, `📅 Победи 10 врагов за неделю  ${weeklyWins}/10`, 10, wDone ? '#3cc864' : '#ccccee');
    const wBg = this.add.graphics();
    wBg.fillStyle(0x222233, 1); wBg.fillRoundedRect(20, y+64, bW, 6, 3);
    wBg.fillStyle(wDone ? 0x3cc864 : 0x5096ff, 1); wBg.fillRoundedRect(20, y+64, Math.max(6, bW * wBar), 6, 3);
    if (wDone) txt(this, W-16, y+52, '✅ +200🪙 +3💎', 10, '#3cc864', true).setOrigin(1, 0);
    // Недельное волна
    const wvDone = weeklyWave >= 5;
    txt(this, 20, y+76, `🌊 Дойди до 5 волны за неделю  ${weeklyWave}/5  ${wvDone ? '✅ +250🪙 +3💎' : ''}`, 10, wvDone ? '#3cc864' : '#ccccee');
    y += questsH + 8;

    /* ── Правила ── */
    makePanel(this, 8, y, W-16, 100, 10, 0.7);
    const rulesBase = [
      '🏁  Каждый заход начинается с полного HP',
      '⚔️  HP между боями сохраняется (не между заходами)',
      '📈  Волны 1-3 лёгкие — дальше сложнее',
      '💚  Каждые 5 побед: +10% HP восстановления',
    ];
    rulesBase.forEach((r, i) => {
      txt(this, 20, y + 8 + i * 21, r, 10, '#ddddff');
    });
    const premLine = d.is_premium
      ? '👑 Premium активен: +5 попыток/день'
      : '👑 Premium: +5 бесплатных попыток/день';
    txt(this, W/2, y + 88, premLine, 10, d.is_premium ? '#ffc83c' : '#aabbcc').setOrigin(0.5);
  }

  async _startFight() {
    if (this._busy) return;
    this._busy = true;
    try {
      const res = await post('/api/endless/start', {});
      if (!res.ok) { this._toast('❌ ' + (res.reason || 'Ошибка')); this._busy = false; return; }
      State.battle    = res.battle;
      State.endlessWave = res.wave;
      tg?.HapticFeedback?.impactOccurred('heavy');
      this.scene.start('Battle');
    } catch(_) {
      this._toast('❌ Нет соединения');
    }
    this._busy = false;
  }

  async _abandon() {
    if (this._busy) return;
    this._busy = true;
    try {
      await post('/api/endless/abandon', {});
    } catch(_) {}
    this._busy = false;
    this.scene.restart();
  }

  async _buyAttempt(kind) {
    if (this._busy) return;
    this._busy = true;
    try {
      const res = await post('/api/endless/buy_attempt', { kind });
      if (res.ok) {
        tg?.HapticFeedback?.notificationOccurred('success');
        this._toast(`✅ Куплено попыток: ${res.bought}`);
        this.time.delayedCall(600, () => this.scene.restart());
      } else {
        this._toast('❌ ' + (res.reason || 'Ошибка'));
      }
    } catch(_) { this._toast('❌ Нет соединения'); }
    this._busy = false;
  }

  _toast(msg) {
    const t = txt(this, this.W/2, this.H - 140, msg, 12, '#ffffff', true).setOrigin(0.5);
    this.time.delayedCall(2000, () => { try { t.destroy(); } catch(_){} });
  }
}
