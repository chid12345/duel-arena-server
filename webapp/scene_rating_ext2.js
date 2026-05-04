/* ============================================================
   Phaser config + запуск игры
   ============================================================ */
const config = {
  type: Phaser.AUTO,
  backgroundColor: C._name === 'light' ? '#f0f2ff' : '#12121c',
  parent: document.body,
  scene: [BootScene, MenuScene, BattleScene, ResultScene, RatingScene, StatsScene, QueueScene,
          QuestsScene, SummaryScene, TitanTopScene, ClanScene, ShopScene, NatiskScene,
          WorldBossScene, TasksScene, AvatarScene, GuideScene, EquipmentScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
    width: 390,
    height: 700,
  },
  dom: { createContainer: false },
  render: {
    antialias: true,
    pixelArt: false,
  },
  // 12с timeout — достаточно даже на слабом 3G, но не бесконечно.
  loader: {
    timeout: 12000,
    maxRetries: 2,
  },
};

let _gameStarted = false;

function _launchPhaser() {
  if (_gameStarted) return;
  _gameStarted = true;
  try {
    const game = new Phaser.Game(config);
    if (window.__DEV_MODE__) window.__game = game;
  } catch(e) {
    console.error('Phaser.Game init error:', e);
    const sub = document.querySelector('#loading-screen .sub');
    if (sub) sub.textContent = '❌ Ошибка запуска. Перезапустите приложение.';
  }
}

function _initTgAndLaunch() {
  const tgNow = window.Telegram?.WebApp || tg;
  if (tgNow) {
    try { tgNow.ready(); tgNow.expand(); } catch(_) {}
    tgNow.onEvent('viewportChanged', function _onVp() {
      if (tgNow.viewportHeight > 100) {
        tgNow.offEvent('viewportChanged', _onVp);
        _launchPhaser();
      }
    });
    if (tgNow.isExpanded && tgNow.viewportHeight > 100) {
      _launchPhaser();
    } else {
      setTimeout(_launchPhaser, 700);
    }
  } else {
    _launchPhaser();
  }
}

if (window.Telegram?.WebApp || tg) {
  _initTgAndLaunch();
} else {
  setTimeout(function() { _initTgAndLaunch(); }, 1500);
}
