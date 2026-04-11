/* ============================================================
   USDT-слот детальный экран — расширение:
   _usdtDetailAction, _closeUsdtDetail
   ============================================================ */

StatsScene.prototype._usdtDetailAction = async function(action, item, wp) {
  if (this._avatarBusy) return;
  this._avatarBusy = true;
  try {
    if (action === "equip") {
      const res = await post("/api/wardrobe/equip", { class_id: item.class_id });
      if (res?.ok) {
        if (res.player) { State.player = res.player; State.playerLoadedAt = Date.now(); }
        this._avatarBusy = false;
        this.scene.restart({ player: State.player, reopenWardrobe: true, wardrobePayload: res, toast: "✅ Образ надет" });
        return;
      }
      this._showToast(`❌ ${res?.message || "Ошибка"}`);

    } else if (action === "unequip") {
      const res = await post("/api/wardrobe/unequip", {});
      if (res?.ok) {
        if (res.player) { State.player = res.player; State.playerLoadedAt = Date.now(); }
        this._avatarBusy = false;
        this.scene.restart({ player: State.player, reopenWardrobe: true, wardrobePayload: res, toast: "✅ Образ снят" });
        return;
      }
      this._showToast(`❌ ${res?.message || "Ошибка"}`);

    } else if (action === "apply_stats") {
      const res = await post("/api/wardrobe/usdt/apply-stats", { class_id: item.class_id });
      if (res?.ok && res.inventory_item) {
        if (res.player) { State.player = res.player; State.playerLoadedAt = Date.now(); }
        this._avatarBusy = false;
        this._openUsdtDetail({...item, _raw: res.inventory_item}, wp);
        this._showToast("✅ Сборка сохранена!");
        return;
      }
      this._showToast(`❌ ${res?.message || "Ошибка"}`);

    } else if (action === "train") {
      const res = await post("/api/wardrobe/usdt/train", { class_id: item.class_id, stat: item._stat });
      if (res?.ok && res.inventory_item) {
        if (res.player) { State.player = res.player; State.playerLoadedAt = Date.now(); }
        this._avatarBusy = false;
        this._openUsdtDetail({...item, _raw: res.inventory_item}, wp);
        return;
      }
      this._showToast(`❌ ${res?.message || "Ошибка"}`);

    } else if (action === "untrain") {
      const res = await post("/api/wardrobe/usdt/untrain", { class_id: item.class_id, stat: item._stat });
      if (res?.ok && res.inventory_item) {
        if (res.player) { State.player = res.player; State.playerLoadedAt = Date.now(); }
        this._avatarBusy = false;
        this._openUsdtDetail({...item, _raw: res.inventory_item}, wp);
        return;
      }
      this._showToast(`❌ ${res?.message || "Ошибка"}`);

    } else if (action === "set_passive") {
      const res = await post("/api/wardrobe/usdt/set-passive", { class_id: item.class_id, passive_type: item._passive });
      if (res?.ok && res.inventory_item) {
        if (res.player) { State.player = res.player; State.playerLoadedAt = Date.now(); }
        this._avatarBusy = false;
        this._openUsdtDetail({...item, _raw: res.inventory_item}, wp);
        return;
      }
      this._showToast(`❌ ${res?.message || "Ошибка"}`);

    } else if (action === "reset_invoice") {
      const res = await post("/api/wardrobe/usdt/reset-invoice", { class_id: item.class_id });
      if (res?.ok && res.invoice_url) {
        tg?.openLink?.(res.invoice_url);
        if (res.invoice_id) {
          this._pendingResetInvoice = { class_id: item.class_id, invoice_id: res.invoice_id };
        }
        this._avatarBusy = false;
        this._openUsdtDetail(item, wp);
        this._showToast("💳 Счёт открыт — оплати и нажми «Я оплатил»");
        return;
      }
      this._showToast(`❌ ${res?.reason || "Ошибка"}`);

    } else if (action === "check_reset") {
      const inv = this._pendingResetInvoice;
      if (!inv?.invoice_id) { this._showToast("❌ Нет ожидающего счёта"); }
      else {
        const res = await get("/api/wardrobe/usdt/check-reset", {
          class_id: item.class_id,
          invoice_id: String(inv.invoice_id),
        });
        if (res?.ok && res.reset_applied && res.inventory_item) {
          if (res.player) { State.player = res.player; State.playerLoadedAt = Date.now(); }
          this._pendingResetInvoice = null;
          this._avatarBusy = false;
          this._showToast("✅ Сборка сброшена! Можешь выставить статы.");
          await this._openAvatarPanel();
          return;
        }
        this._showToast(`❌ ${res?.reason || "Счёт ещё не оплачен"}`);
      }
    }
  } catch { this._showToast("❌ Ошибка сети"); }
  this._avatarBusy = false;
};

StatsScene.prototype._closeUsdtDetail = function() {
  (this._usdtDetailLayer || []).forEach(o => { try { o.destroy(); } catch {} });
  this._usdtDetailLayer = null;
};
