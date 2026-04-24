/* ============================================================
   MenuScene — фоновая (lazy) подгрузка PNG экипировки.
   Boot грузит только воинов (быстрый старт), а тяжёлые ~96 PNG
   (armor/weapon/helmet/boots/shield/ring, ~50 МБ) подкачиваются
   ПОСЛЕ показа меню. Слот, для которого текстура ещё не пришла,
   рендерится как emoji-фолбэк (см. _drawEqSlot → textures.exists).
   После завершения — перерисовываем профильную панель.
   ============================================================ */

const _LAZY_EQUIPMENT_ASSETS = [
  // armor
  ['armor_free1','armor_free1.png'], ['armor_free2','armor_free2.png'],
  ['armor_free3','armor_free3.png'], ['armor_free4','armor_free4.png'],
  ['armor_gold1','armor_gold1.png'], ['armor_gold2','armor_gold2.png'],
  ['armor_gold3','armor_gold3.png'], ['armor_gold4','armor_gold4.png'],
  ['armor_dia1','armor_dia1.png'],   ['armor_dia2','armor_dia2.png'],
  ['armor_dia3','armor_dia3.png'],   ['armor_dia4','armor_dia4.png'],
  ['armor_mythic1','armor_mythic1.png'], ['armor_mythic2','armor_mythic2.png'],
  ['armor_mythic3','armor_mythic3.png'], ['armor_mythic4','armor_mythic4.png'],
  // weapons
  ['weapon_sword_free','weapon_sword_free.png'], ['weapon_sword_rare','weapon_sword_rare.png'],
  ['weapon_sword_epic','weapon_sword_epic.png'], ['weapon_sword_mythic','weapon_sword_mythic.png'],
  ['weapon_axe_free','weapon_axe_free.png'],     ['weapon_axe_rare','weapon_axe_rare.png'],
  ['weapon_axe_epic','weapon_axe_epic.png'],     ['weapon_axe_mythic','weapon_axe_mythic.png'],
  ['weapon_club_free','weapon_club_free.png'],   ['weapon_club_rare','weapon_club_rare.png'],
  ['weapon_club_epic','weapon_club_epic.png'],   ['weapon_club_mythic','weapon_club_mythic.png'],
  ['weapon_gs_free','weapon_gs_free.png'],       ['weapon_gs_rare','weapon_gs_rare.png'],
  ['weapon_gs_epic','weapon_gs_epic.png'],       ['weapon_gs_mythic','weapon_gs_mythic.png'],
  // helmets
  ['helmet_free1','helmet_free1.png'], ['helmet_free2','helmet_free2.png'],
  ['helmet_free3','helmet_free3.png'], ['helmet_free4','helmet_free4.png'],
  ['helmet_gold1','helmet_gold1.png'], ['helmet_gold2','helmet_gold2.png'],
  ['helmet_gold3','helmet_gold3.png'], ['helmet_gold4','helmet_gold4.png'],
  ['helmet_dia1','helmet_dia1.png'],   ['helmet_dia2','helmet_dia2.png'],
  ['helmet_dia3','helmet_dia3.png'],   ['helmet_dia4','helmet_dia4.png'],
  ['helmet_mythic1','helmet_mythic1.png'], ['helmet_mythic2','helmet_mythic2.png'],
  ['helmet_mythic3','helmet_mythic3.png'], ['helmet_mythic4','helmet_mythic4.png'],
  // boots
  ['boots_free1','boots_free1.png'], ['boots_free2','boots_free2.png'],
  ['boots_free3','boots_free3.png'], ['boots_free4','boots_free4.jpeg'],
  ['boots_gold1','boots_gold1.png'], ['boots_gold2','boots_gold2.jpg'],
  ['boots_gold3','boots_gold3.jpg'], ['boots_gold4','boots_gold4.jpg'],
  ['boots_dia1','boots_dia1.jpg'],   ['boots_dia2','boots_dia2.jpg'],
  ['boots_dia3','boots_dia3.jpg'],   ['boots_dia4','boots_dia4.jpg'],
  ['boots_mythic1','boots_mythic1.jpeg'], ['boots_mythic2','boots_mythic2.jpeg'],
  ['boots_mythic3','boots_mythic3.jpeg'], ['boots_mythic4','boots_mythic4.jpeg'],
  // shields
  ['shield_free1','shield_free1.jpeg'], ['shield_free2','shield_free2.jpeg'],
  ['shield_free3','shield_free3.jpeg'], ['shield_free4','shield_free4.jpeg'],
  ['shield_gold1','shield_gold1.jpeg'], ['shield_gold2','shield_gold2.jpeg'],
  ['shield_gold3','shield_gold3.jpeg'], ['shield_gold4','shield_gold4.jpeg'],
  ['shield_dia1','shield_dia1.png'],    ['shield_dia2','shield_dia2.png'],
  ['shield_dia3','shield_dia3.png'],    ['shield_dia4','shield_dia4.png'],
  ['shield_mythic1','shield_mythic1.png'], ['shield_mythic2','shield_mythic2.png'],
  ['shield_mythic3','shield_mythic3.png'], ['shield_mythic4','shield_mythic4.png'],
  // rings
  ['ring_free1','ring_free1.png'], ['ring_free2','ring_free2.png'],
  ['ring_free3','ring_free3.png'], ['ring_free4','ring_free4.png'],
  ['ring_gold1','ring_gold1.png'], ['ring_gold2','ring_gold2.png'],
  ['ring_gold3','ring_gold3.png'], ['ring_gold4','ring_gold4.png'],
  ['ring_dia1','ring_dia1.png'],   ['ring_dia2','ring_dia2.png'],
  ['ring_dia3','ring_dia3.png'],   ['ring_dia4','ring_dia4.png'],
  ['ring_mythic1','ring_mythic1.png'], ['ring_mythic2','ring_mythic2.png'],
  ['ring_mythic3','ring_mythic3.png'], ['ring_mythic4','ring_mythic4.png'],
];

Object.assign(MenuScene.prototype, {

  /* Собирает ключи текстур для НАДЕТЫХ предметов — чтобы грузить их
     в приоритетной (первой) партии. Берём и item_id-специфичный ключ,
     и rarity-фолбэк: карта рендеринга (_drawEqSlot) пробует по очереди. */
  _getEquippedTextureKeys() {
    const keys = new Set();
    const eq = State.equipment || {};
    // Броня: wardrobe-косметика или статовая-по-rarity
    if (State.wardrobeEquipped?.textureKey) keys.add(State.wardrobeEquipped.textureKey);
    if (eq.armor?.rarity && typeof getArmorTextureKey === 'function') {
      const k = getArmorTextureKey(eq.armor.rarity);
      if (k) keys.add(k);
    }
    // Оружие
    if (eq.weapon && typeof getWeaponTextureKey === 'function') {
      const k = getWeaponTextureKey(eq.weapon.item_id) || getWeaponTextureKeyByRarity(eq.weapon.rarity);
      if (k) keys.add(k);
    }
    // Шлем (belt)
    if (eq.belt && typeof getHelmetTextureKey === 'function') {
      const k = getHelmetTextureKey(eq.belt.item_id) || getHelmetTextureKeyByRarity(eq.belt.rarity);
      if (k) keys.add(k);
    }
    // Сапоги
    if (eq.boots && typeof getBootsTextureKey === 'function') {
      const k = getBootsTextureKey(eq.boots.item_id) || getBootsTextureKeyByRarity(eq.boots.rarity);
      if (k) keys.add(k);
    }
    // Щит
    if (eq.shield && typeof getShieldTextureKey === 'function') {
      const k = getShieldTextureKey(eq.shield.item_id) || getShieldTextureKeyByRarity(eq.shield.rarity);
      if (k) keys.add(k);
    }
    // Кольца
    for (const slot of ['ring1', 'ring2']) {
      if (eq[slot] && typeof getRingTextureKey === 'function') {
        const k = getRingTextureKey(eq[slot].item_id) || getRingTextureKeyByRarity(eq[slot].rarity);
        if (k) keys.add(k);
      }
    }
    return keys;
  },

  _rebuildProfileAfterLazy() {
    try {
      if (!this.scene?.isActive?.()) return;
      if (this._panels?.profile) {
        this._panels.profile.destroy(true);
        this._panels.profile = null;
      }
      this._buildProfilePanel();
      if (this._activeTab === 'profile' && typeof this._switchTab === 'function') {
        this._switchTab('profile');
      }
    } catch(e) {
      console.warn('[LazyEq] rebuild profile failed:', e);
    }
  },

  /* Awaitable: грузит ТОЛЬКО надетые предметы (6 PNG, ~3МБ).
     Используется перед _buildProfilePanel, чтобы профиль сразу
     открылся с реальными картинками — без emoji/вектор-фолбэка.
     Таймаут 5с: если сеть совсем плохая, не держим загрузкой навсегда —
     показываем профиль с вектор-фолбэком, а когда PNG всё-таки придут,
     делаем ребилд панели. */
  _preloadEquippedTextures() {
    const priorityKeys = this._getEquippedTextureKeys();
    const todo = _LAZY_EQUIPMENT_ASSETS
      .filter(([k]) => priorityKeys.has(k) && !this.textures.exists(k));
    if (!todo.length) return Promise.resolve();

    return new Promise(resolve => {
      let resolvedAt = 0;
      const _resolveOnce = () => { if (resolvedAt) return; resolvedAt = Date.now(); resolve(); };

      for (const [k, p] of todo) this.load.image(k, p);
      this.load.once('complete', () => {
        // Если таймаут уже отрезолвил (>100ms назад) — профиль построен
        // с вектор-фолбэком, теперь перерисовываем с настоящими PNG.
        if (resolvedAt && Date.now() - resolvedAt > 100) {
          this._rebuildProfileAfterLazy();
        }
        _resolveOnce();
      });
      this.load.on('loaderror', f => console.warn('[LazyEq] priority loaderror:', f?.key, f?.src));
      this.load.start();

      // Fail-safe: 5с лимит. Лучше показать профиль с вектор-фолбэком,
      // чем держать игрока на «Загрузка…» при слабой/отвалившейся сети.
      setTimeout(_resolveOnce, 5000);
    });
  },

  /* Фоновая догрузка остальных текстур (для Рюкзака/Equipment).
     Запускается ПОСЛЕ показа профиля — не блокирует UI. */
  _lazyLoadRestTextures() {
    if (this._lazyRestStarted) return;
    this._lazyRestStarted = true;

    const priorityKeys = this._getEquippedTextureKeys();
    const todo = _LAZY_EQUIPMENT_ASSETS
      .filter(([k]) => !priorityKeys.has(k) && !this.textures.exists(k));
    if (!todo.length) return;

    this.load.on('loaderror', f => console.warn('[LazyEq] rest loaderror:', f?.key, f?.src));
    for (const [k, p] of todo) this.load.image(k, p);
    this.load.start();
  },

});
