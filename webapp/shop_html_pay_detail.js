/* ═══════════════════════════════════════════════════════════
   Shop HTML Pay Detail — модалка деталей для Stars/USDT товаров
   Расширяет ShopHtmlPay методами _showStarsDetail / _showUsdtDetail
   Источник данных: ShopHtmlPay._pkgs() (см. shop_html_pay.js)
   ═══════════════════════════════════════════════════════════ */
(() => {

function _meta(p, currency) {
  // currency: 'stars' | 'usdt'
  const id = p.id || '';
  const isBox = (p.scroll_id || '').startsWith('box_');
  const isLeg = id.includes('titan');
  const r = isLeg ? 'l' : isBox ? 'e' : 'r';
  const isDia = !p.scroll_id;
  const icon = isDia ? '💎' : (isBox ? '🎲' : isLeg ? '🏔️' : '📜');
  const name = isDia ? `${p.diamonds} алмазов` : (p.label || '').replace(/^[^\s]+\s/, '');
  const desc = isDia
    ? (currency === 'stars' ? 'Алмазы зачислятся на счёт мгновенно' : 'Алмазы зачислятся на счёт после оплаты')
    : 'Свиток отправится в Рюкзак — применишь перед боем';
  return { icon, name, desc, rarity: r };
}

Object.assign(window.ShopHtmlPay = window.ShopHtmlPay || {}, {
  _showStarsDetail(id) {
    const d = ShopHtmlPay._pkgs() || {};
    const p = [...(d.stars || []), ...(d.stars_scrolls || [])].find(x => x.id === id);
    if (!p) return;
    if (p.id === 'premium' || p.premium) {
      ShopHtml.showDetail({
        icon: '👑', name: 'Premium подписка (21 день)',
        desc: '+15% XP · ежедневный ящик · скидки в магазине · значок премиум',
        price: p.stars, currency: 'stars', rarity: 'e',
        actionLabel: `Активировать ⭐ ${p.stars}`,
        action: () => ShopHtmlPay._buyStars(id),
      });
      return;
    }
    const m = _meta(p, 'stars');
    ShopHtml.showDetail({
      ...m, price: p.stars, currency: 'stars',
      actionLabel: `Оплатить ⭐ ${p.stars}`,
      action: () => ShopHtmlPay._buyStars(id),
    });
  },

  _showUsdtDetail(id) {
    const d = ShopHtmlPay._pkgs() || {};
    const p = [...(d.crypto || []), ...(d.usdt_scrolls || [])].find(x => x.id === id);
    if (!p) return;
    if (p.full_reset) {
      ShopHtml.showDetail({
        icon: '🔄', name: 'Сброс прогресса',
        desc: 'Уровень и статы обнулятся. Золото, алмазы и инвентарь сохраняются. Действие необратимо.',
        price: p.usdt, currency: 'usdt', rarity: 'd',
        actionLabel: `Сбросить за 💲 ${p.usdt}`, btnClass: 'btn-danger',
        action: () => ShopHtmlPay._buyCrypto(id),
      });
      return;
    }
    if (p.premium) {
      ShopHtml.showDetail({
        icon: '👑', name: 'Premium подписка (21 день)',
        desc: '+15% XP · ежедневный ящик · скидки в магазине · значок премиум',
        price: p.usdt, currency: 'usdt', rarity: 'e',
        actionLabel: `Активировать 💲 ${p.usdt}`,
        action: () => ShopHtmlPay._buyCrypto(id),
      });
      return;
    }
    const m = _meta(p, 'usdt');
    ShopHtml.showDetail({
      ...m, price: p.usdt, currency: 'usdt',
      actionLabel: `Оплатить 💲 ${p.usdt}`,
      action: () => ShopHtmlPay._buyCrypto(id),
    });
  },
});
})();
