/* ═══════════════════════════════════════════════════════════
   Shop HTML Pay Detail — модалка деталей для Stars/USDT товаров
   Расширяет ShopHtmlPay методами _showStarsDetail / _showUsdtDetail
   Источник данных: ShopHtmlPay._pkgs() (см. shop_html_pay.js)
   ═══════════════════════════════════════════════════════════ */
(() => {

const _BOX_DESCS = {
  'box_epic_e2': 'USDT-свиток + 2–4 алмазных · 20% шанс Титана · 8% Premium 7 дн. · 3% +100💎',
  'box_epic_e3': 'USDT-свиток + XP×2 + алм. + золотой · 10% шанс Титана · 5% Premium 3 дн.',
};

function _meta(p, currency) {
  const id = p.id || '';
  const isBox = (p.scroll_id || '').startsWith('box_');
  const isLeg = id.includes('titan');
  const r = isLeg ? 'l' : isBox ? 'e' : 'r';
  const isDia = !p.scroll_id;
  const icon = isDia ? '💎'
    : isBox ? `<img src="chest_epic.png" style="width:64px;height:64px;object-fit:contain;filter:drop-shadow(0 0 7px rgba(255,200,80,.4))">`
    : isLeg ? '🏔️'
    : `<img src="scroll_icon.png" style="width:64px;height:64px;object-fit:contain;filter:drop-shadow(0 0 7px rgba(0,200,255,.4))">`;
  const name = isDia ? `${p.diamonds} алмазов` : (p.label || '').replace(/^[^\s]+\s/, '');
  const desc = isDia
    ? (currency === 'stars' ? 'Алмазы зачислятся на счёт мгновенно' : 'Алмазы зачислятся на счёт после оплаты')
    : isBox ? (_BOX_DESCS[p.scroll_id] || 'Ящик → в Рюкзак — открой и получи дроп')
    : 'Свиток → в Рюкзак — применишь перед боем';
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
