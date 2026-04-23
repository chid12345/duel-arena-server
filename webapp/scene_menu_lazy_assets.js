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

  _lazyLoadEquipmentTextures() {
    if (this._lazyEqStarted) return;
    this._lazyEqStarted = true;

    const todo = _LAZY_EQUIPMENT_ASSETS.filter(([k]) => !this.textures.exists(k));
    if (!todo.length) return;

    for (const [k, p] of todo) this.load.image(k, p);

    this.load.on('loaderror', f => console.warn('[LazyEq] loaderror:', f?.key, f?.src));

    this.load.once('complete', () => {
      // Перерисовать профильную панель только если игрок до сих пор её видит,
      // и не открыт никакой HTML-overlay (wardrobe/weapon/etc.) — иначе ребилд
      // под открытым оверлеем создаст визуальный мусор.
      try {
        if (this._activeTab !== 'profile') return;
        if (!this.scene?.isActive?.()) return;
        if (this._panels?.profile) {
          this._panels.profile.destroy(true);
          this._panels.profile = null;
        }
        this._buildProfilePanel();
        // _switchTab убрать не нужно — _buildProfilePanel добавляет панель
        // в displayList только если она активна. Но на всякий случай:
        if (typeof this._switchTab === 'function') {
          this._switchTab('profile');
        }
      } catch(e) {
        console.warn('[LazyEq] rebuild profile failed:', e);
      }
    });

    // Запускаем загрузку (after create — Phaser поддерживает динамическое добавление файлов)
    this.load.start();
  },

});
