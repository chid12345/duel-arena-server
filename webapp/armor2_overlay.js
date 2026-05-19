/* ============================================================
   Armor2HTML — пустой оверлей вкладки «БРОНЯ» (7-й слот профиля).
   Каркас аналогичен ArmorHTML/WeaponHTML/HelmetHTML: заголовок,
   крестик закрытия, TabBarHTML.hide()/show(). Контент пока пустой —
   игрок видит «Скоро…», наполнение определится позже.
   ============================================================ */
(() => {

let _currentScene = null;

function close() {
  document.getElementById('ar2-root')?.remove();
  try { if (_currentScene) _currentScene.input.enabled = true; } catch (_) {}
  try { if (typeof TabBarHTML !== 'undefined') TabBarHTML.show(); } catch (_) {}
}

function open(scene) {
  try { if (typeof EquipmentSlotsHTML !== 'undefined') EquipmentSlotsHTML.close(); } catch (_) {}
  try { if (typeof TabBarHTML !== 'undefined') TabBarHTML.hide(); } catch (_) {}
  _currentScene = scene;
  try { scene.input.enabled = false; } catch (_) {}
  if (typeof WardrobeHTML !== 'undefined') WardrobeHTML._injectCSS();
  close();

  const wrap = document.createElement('div');
  wrap.id = 'ar2-root';
  wrap.className = 'wd-overlay';
  wrap.innerHTML = `
    <div class="wd-panel">
      <div class="wd-head">
        <span class="wd-title">🛡 Броня</span>
        <button class="wd-close" id="ar2-close">✕</button>
      </div>
      <div class="wd-grid" id="ar2-grid">
        <div class="wd-empty" style="padding:48px 16px;text-align:center;color:#8899cc;font-size:12px;line-height:1.6">
          Скоро…
        </div>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  document.getElementById('ar2-close').onclick = () => {
    tg?.HapticFeedback?.impactOccurred('light');
    try { window.GhostTapGuard?.block?.(300); } catch (_) {}
    close();
    try {
      const sc = _currentScene;
      if (sc._panels?.profile) {
        try { sc._panels.profile.destroy(true); } catch (_) {}
        sc._panels.profile = null;
      }
      sc._buildProfilePanel();
      try { sc.input.enabled = true; } catch (_) {}
      sc._switchTab('profile');
    } catch (_) {
      try { _currentScene.input.enabled = true; } catch (_2) {}
      _currentScene.scene.start('Menu', { returnTab: 'profile' });
    }
  };
  wrap.addEventListener('touchmove', e => e.stopPropagation(), { passive: false });
}

window.Armor2HTML = { open, close };
})();
