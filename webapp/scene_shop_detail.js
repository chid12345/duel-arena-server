/* ═══════════════════════════════════════════════════════════
   ShopScene detail — обёртка для глобального item_detail_popup.
   _showItemDetail(item) / _closeItemDetail()
   ═══════════════════════════════════════════════════════════ */

Object.assign(ShopScene.prototype, {

  _showItemDetail(item) {
    const isDia = item.currency === 'diamonds';
    const canBuy = this._canAfford(item);
    const pIcon = isDia ? '💎' : '🪙';
    const p = State.player;

    showItemDetailPopup(this, {
      icon: item.icon,
      name: item.name,
      desc: item.desc || '',
      badge: item.badge || null,
      badgeRisk: item.risk || false,
      hpPct: item.hpPct || null,
      hpCur: p?.current_hp || 0,
      hpMax: p?.max_hp || 0,
      price: item.price,
      currency: item.currency,
      canAct: canBuy,
      actionLabel: canBuy
        ? `${pIcon} ${item.price} — Купить`
        : `Нужно ${item.price} ${isDia ? '💎' : '🪙'}`,
      actionFn: () => {
        if (!canBuy) { this._toastNoMoney(item); return; }
        closeItemDetailPopup(this);
        this._doBuy(item);
      },
    });
  },

  _closeItemDetail() {
    closeItemDetailPopup(this);
  },
});
