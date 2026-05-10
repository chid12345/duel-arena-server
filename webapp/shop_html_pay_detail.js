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
    : isLeg ? `<img src="scroll_titan.png" style="width:64px;height:64px;object-fit:contain;filter:drop-shadow(0 0 10px rgba(255,140,0,.65))">`
    : `<img src="scroll_icon.png" style="width:64px;height:64px;object-fit:contain;filter:drop-shadow(0 0 7px rgba(0,200,255,.4))">`;
  const name = isDia ? `${p.diamonds} алмазов` : (p.label || '').replace(/^[^\s]+\s/, '');
  const desc = isDia
    ? (currency === 'stars' ? 'Алмазы зачислятся на счёт мгновенно' : 'Алмазы зачислятся на счёт после оплаты')
    : isBox ? (_BOX_DESCS[p.scroll_id] || 'Ящик → в Рюкзак — открой и получи дроп')
    : (p.desc ? `${p.desc} · в Рюкзак` : 'Свиток → в Рюкзак — применишь перед боем');
  return { icon, name, desc, rarity: r };
}

Object.assign(window.ShopHtmlPay = window.ShopHtmlPay || {}, {

  _showCombinedDetail(starsId, usdtId) {
    const d = ShopHtmlPay._pkgs() || {};
    const allStars = [...(d.stars || []), ...(d.stars_scrolls || [])];
    const allUsdt  = [...(d.crypto || []), ...(d.usdt_scrolls || [])];
    const sp = starsId ? allStars.find(x => x.id === starsId) : null;
    const up = usdtId  ? allUsdt.find(x => x.id === usdtId)  : null;
    const base = sp || up; if (!base) return;

    const ID2 = 'shop-combined-detail';
    let el = document.getElementById(ID2);
    if (!el) { el = document.createElement('div'); el.id = ID2; document.body.appendChild(el); }

    // meta
    const isReset = !!(base.full_reset);
    const isPrem  = !!(base.premium || base.id === 'premium');
    const isBox   = (base.scroll_id || '').startsWith('box_');
    const isLeg   = (base.id || '').includes('titan');
    const r = isReset ? 'd' : isPrem ? 'e' : isLeg ? 'l' : isBox ? 'e' : 'r';

    const name = isPrem ? 'Premium подписка (21 день)'
               : isReset ? 'Сброс прогресса'
               : (base.label || '').replace(/^[^\s]+\s/, '');

    const desc = isPrem ? '+15% XP · ежедневный ящик · скидки · значок премиум · 21 день'
               : isReset ? 'Уровень и статы обнулятся. Золото, алмазы и инвентарь сохраняются. Действие необратимо.'
               : isBox ? (_BOX_DESCS[base.scroll_id] || 'Ящик → в Рюкзак — открой и получи дроп')
               : (base.desc ? `${base.desc} · в Рюкзак` : 'Свиток → в Рюкзак — применишь перед боем');

    const icoHtml = isPrem ? '<div style="font-size:64px;line-height:1">👑</div>'
      : isReset ? '<img src="reset_icon.png?v=2" style="width:64px;height:64px;object-fit:contain;filter:drop-shadow(0 0 9px rgba(255,51,51,.6))">'
      : isBox   ? '<img src="chest_epic.png" style="width:64px;height:64px;object-fit:contain;filter:drop-shadow(0 0 7px rgba(255,200,80,.4))">'
      : isLeg   ? '<img src="scroll_titan.png" style="width:64px;height:64px;object-fit:contain;filter:drop-shadow(0 0 10px rgba(255,140,0,.65))">'
      : !base.scroll_id ? '<div style="font-size:64px;line-height:1">💎</div>'
      : '<img src="scroll_icon.png" style="width:64px;height:64px;object-fit:contain;filter:drop-shadow(0 0 7px rgba(0,200,255,.4))"> ';

    const btnCls  = isReset ? 'btn-danger' : '';
    const sBtnCls = isReset ? 'btn-danger' : 'btn-s';
    const uBtnCls = isReset ? 'btn-danger' : 'btn-u';

    const sRow = sp ? `
      <button class="shd-btn ${sBtnCls}" data-act-s style="margin-bottom:8px">
        ⭐ ${sp.stars} Stars
      </button>` : '';
    const uRow = up ? `
      <button class="shd-btn ${uBtnCls}" data-act-u>
        💲 ${up.usdt} USDT
      </button>` : '';

    const borderColor = r === 'd' ? 'rgba(255,51,51,.55)'
      : r === 'l' ? 'rgba(255,140,0,.65)' : r === 'e' ? 'rgba(180,79,255,.6)' : 'rgba(68,136,255,.55)';

    el.style.cssText = 'position:fixed;inset:0;z-index:9300;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.82);backdrop-filter:blur(10px)';
    el.innerHTML = `
<div style="position:relative;width:100%;max-width:340px;background:linear-gradient(180deg,#0c0c1c,#06060f);border:1px solid ${borderColor};border-radius:18px;padding:20px 18px 16px;box-shadow:0 0 30px rgba(0,245,255,.15),0 12px 40px rgba(0,0,0,.7)">
  <div data-close style="position:absolute;top:8px;right:10px;width:30px;height:30px;display:grid;place-items:center;color:rgba(255,255,255,.45);font-size:22px;cursor:pointer;border-radius:50%">×</div>
  <div style="font-size:64px;text-align:center;margin:6px 0 10px;line-height:1">${icoHtml}</div>
  <div style="font-size:17px;font-weight:700;color:#fff;text-align:center;margin-bottom:6px">${name}</div>
  <div style="font-size:13px;color:rgba(220,220,240,.78);text-align:center;line-height:1.45;margin-bottom:14px">${desc}</div>
  <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(0,245,255,.3),transparent);margin:0 -4px 14px"></div>
  ${sRow}${uRow}
  ${sp && up ? '<div style="text-align:center;font-size:10px;color:rgba(85,119,170,.7);margin-top:8px">⭐ Stars — моментально &nbsp;·&nbsp; 💲 USDT — крипто</div>' : ''}
</div>`;

    el.querySelector('[data-close]')?.addEventListener('click', () => el.remove());
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });
    el.querySelector('[data-act-s]')?.addEventListener('click', () => {
      el.remove(); ShopHtmlPay._buyStars(starsId);
    });
    el.querySelector('[data-act-u]')?.addEventListener('click', () => {
      el.remove(); ShopHtmlPay._buyCrypto(usdtId);
    });
  },
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
    if (p.full_reset) {
      ShopHtml.showDetail({
        icon: '<img src="reset_icon.png?v=2" style="width:64px;height:64px;object-fit:contain;filter:drop-shadow(0 0 9px rgba(255,51,51,.6))">', name: 'Сброс прогресса',
        desc: 'Уровень и статы обнулятся. Золото, алмазы и инвентарь сохраняются. Действие необратимо.',
        price: p.stars, currency: 'stars', rarity: 'd',
        actionLabel: `Сбросить за ⭐ ${p.stars}`, btnClass: 'btn-danger',
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
        icon: '<img src="reset_icon.png?v=2" style="width:64px;height:64px;object-fit:contain;filter:drop-shadow(0 0 9px rgba(255,51,51,.6))">', name: 'Сброс прогресса',
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
