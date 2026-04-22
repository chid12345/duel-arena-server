/* ============================================================
   Wardrobe Overlay для StatsScene
   Карточки гардероба. Детальный вид Легендарного слота → scene_wardrobe_detail.js
   Продолжение: scene_wardrobe_overlay_ext.js
   ============================================================ */

(() => {
  const TYPE_META = {
    free:     { title: "БЕСПЛ.",  color: 0x3a3a52 },
    gold:     { title: "ЗОЛОТО",  color: 0xffc83c },
    diamonds: { title: "АЛМАЗЫ", color: 0x34a6ff },
    usdt:     { title: "ЛЕГЕНДА", color: 0x39d084 },
  };

  const ICON_MAP = {
    tank_free:              "🛡️",
    agile_free:             "⚡",
    crit_free:              "🎯",
    universal_free:         "⚖️",
    berserker_gold:         "💪",
    assassin_gold:          "🗡️",
    mage_gold:              "✨",
    paladin_gold:           "🔰",
    dragonknight_diamonds:  "🐉",
    shadowdancer_diamonds:  "🌑",
    archmage_diamonds:      "🔮",
  };

  function _toCard(cls, classType, equippedId) {
    const owned = !!cls.owned;
    const icon = classType === "usdt" ? "💠" : (ICON_MAP[cls.class_id] || "⚔️");
    return {
      class_id: cls.class_id, class_type: classType,
      name: cls.name || cls.class_id,
      icon,
      strength: Number(cls.bonus_strength || 0),
      agility:  Number(cls.bonus_agility  || 0),
      intuition:Number(cls.bonus_intuition|| 0),
      endurance:Number(cls.bonus_endurance|| 0),
      special_bonus: cls.special_bonus || "",
      owned, equipped: cls.class_id === equippedId || !!cls.equipped,
      price_gold: Number(cls.price_gold || 0),
      price_diamonds: Number(cls.price_diamonds || 0),
    };
  }

  StatsScene.prototype._wardrobeCardsFromPayload = function(payload) {
    const avail = payload?.available_classes || {};
    const eqId  = payload?.equipped_class?.class_id || "";
    const cards  = [];

    for (const cls of (avail.free     || [])) cards.push(_toCard(cls, "free",     eqId));
    for (const cls of (avail.gold     || [])) cards.push(_toCard(cls, "gold",     eqId));
    for (const cls of (avail.diamonds || [])) cards.push(_toCard(cls, "diamonds", eqId));

    // Одна карточка покупки (в магазине)
    cards.push({
      class_id: "usdt_buy", class_type: "usdt", is_buy_card: true,
      name: "Легендарный образ", icon: "💠",
      strength: 0, agility: 0, intuition: 0, endurance: 0,
      special_bonus: "+19 своб. статов · -50% на сброс · своя сборка",
      owned: false, equipped: false, price_usdt: "11.99",
      price_gold: 0, price_diamonds: 0,
    });

    // Купленные USDT-слоты (в инвентаре)
    for (const item of (Array.isArray(payload?.inventory) ? payload.inventory : [])) {
      if (item.class_type !== "usdt") continue;
      cards.push({
        class_id: item.class_id, class_type: "usdt", is_usdt_slot: true,
        name: item.custom_name || "Легендарный слот", icon: "💠",
        strength: Number(item.strength_saved || 0),
        agility:  Number(item.agility_saved  || 0),
        intuition:Number(item.intuition_saved|| 0),
        endurance:Number(item.stamina_saved  || 0),
        special_bonus: "Слот сборки: +19 своб. статов · сброс -50%",
        owned: true, is_usdt_slot: true, equipped: !!item.equipped,
        price_gold: 0, price_diamonds: 0,
        _raw: item,
      });
    }
    return cards;
  };

  StatsScene.prototype._openAvatarPanel = async function() {
    if (this._avatarBusy) return;
    this._avatarBusy = true;
    const gen = this._sceneGen;
    let data;
    try   { data = await get("/api/wardrobe"); }
    catch { this._avatarBusy = false; this._showToast("❌ Гардероб: нет соединения"); return; }
    this._avatarBusy = false;
    if (this._sceneGen !== gen) return;
    if (!data?.ok) {
      this._showToast(`❌ ${data?.reason || (data?._httpStatus ? `HTTP ${data._httpStatus}` : "Ошибка гардероба")}`);
      return;
    }
    this._renderAvatarOverlay(data);
  };
})();
