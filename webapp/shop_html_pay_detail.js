/* ═══════════════════════════════════════════════════════════
   Shop HTML Pay Detail — модалка деталей для Stars/USDT товаров
   Расширяет ShopHtmlPay методами _showCombinedDetail / _showStarterDetail
   Источник данных: ShopHtmlPay._pkgs() (см. shop_html_pay.js)
   ═══════════════════════════════════════════════════════════ */
(() => {

const _BOX_DESCS = {
  'box_epic_e2': 'USDT-свиток + 2–4 алмазных · 20% шанс Титана · 8% Premium 7 дн. · 3% +100💎',
  'box_epic_e3': 'USDT-свиток + XP×2 + алм. + золотой · 10% шанс Титана · 5% Premium 3 дн.',
};

// ── Общий CSS для модалок (вставляется один раз) ─────────────────────────────
const CSS_ID = 'spd-css';
if (!document.getElementById(CSS_ID)) {
  const s = document.createElement('style');
  s.id = CSS_ID;
  s.textContent = `
.spd-overlay{position:fixed;inset:0;z-index:9300;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,10,.88);backdrop-filter:blur(12px)}
.spd-card{position:relative;width:100%;max-width:340px;background:linear-gradient(160deg,#0e0220 0%,#080118 55%,#04040e 100%);border-radius:18px;padding:20px 18px 18px;overflow:hidden}
.spd-card::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,255,220,.018) 3px 4px);pointer-events:none}
.spd-card::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 20% 10%,rgba(255,40,170,.08),transparent 50%),radial-gradient(circle at 80% 80%,rgba(0,230,255,.07),transparent 50%);pointer-events:none}
.spd-close{position:absolute;top:10px;right:12px;width:28px;height:28px;display:grid;place-items:center;font-size:20px;cursor:pointer;color:rgba(0,240,255,.5);border-radius:50%;border:1px solid rgba(0,240,255,.2);z-index:2;transition:all .15s}
.spd-close:hover{color:#00f0ff;border-color:#00f0ff;box-shadow:0 0 10px rgba(0,240,255,.4)}
.spd-ico{text-align:center;margin:4px 0 12px;line-height:1;position:relative;z-index:1}
.spd-name{font-size:20px;font-weight:800;color:#fff;text-align:center;margin-bottom:5px;letter-spacing:.3px;text-shadow:0 0 18px rgba(0,240,255,.45);position:relative;z-index:1}
.spd-sub{font-size:10px;font-weight:700;text-align:center;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px;position:relative;z-index:1}
.spd-desc{font-size:14px;color:#c0d8ff;text-align:center;line-height:1.55;margin-bottom:14px;position:relative;z-index:1}
.spd-line{height:1px;margin:0 -4px 14px;position:relative;z-index:1}
.spd-badge{text-align:center;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:800;margin-bottom:12px;letter-spacing:.3px;position:relative;z-index:1}
.spd-badge-fire{background:rgba(255,170,51,.15);border:1px solid rgba(255,170,51,.5);color:#ffcc55;box-shadow:0 0 12px rgba(255,170,51,.2)}
.spd-btn{width:100%;padding:14px 0;border-radius:11px;border:none;font-size:15px;font-weight:800;letter-spacing:1px;cursor:pointer;transition:all .2s;text-transform:uppercase;margin-bottom:8px;position:relative;z-index:1;overflow:hidden}
.spd-btn::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.12),transparent);pointer-events:none}
.spd-btn:active{transform:scale(.97)}
.spd-btn-s{background:linear-gradient(135deg,#7a4400,#c87800,#ffc107);color:#1a0800;box-shadow:0 0 22px rgba(255,193,7,.45),0 4px 15px rgba(0,0,0,.5);text-shadow:0 1px 0 rgba(255,255,255,.2)}
.spd-btn-s:hover{box-shadow:0 0 30px rgba(255,193,7,.65),0 4px 15px rgba(0,0,0,.5);filter:brightness(1.08)}
.spd-btn-u{background:linear-gradient(135deg,#004d33,#00994d,#00e676);color:#001a0d;box-shadow:0 0 22px rgba(0,230,118,.45),0 4px 15px rgba(0,0,0,.5);text-shadow:0 1px 0 rgba(255,255,255,.15)}
.spd-btn-u:hover{box-shadow:0 0 30px rgba(0,230,118,.65),0 4px 15px rgba(0,0,0,.5);filter:brightness(1.08)}
.spd-btn-danger{background:linear-gradient(135deg,#6a0000,#cc1111,#ff3333);color:#fff;box-shadow:0 0 22px rgba(255,51,51,.45),0 4px 15px rgba(0,0,0,.5)}
.spd-btn-danger:hover{box-shadow:0 0 30px rgba(255,51,51,.65),0 4px 15px rgba(0,0,0,.5);filter:brightness(1.08)}
.spd-hint{text-align:center;font-size:11px;color:rgba(0,200,255,.45);margin-top:2px;letter-spacing:.3px;position:relative;z-index:1}
.spd-strike{font-size:12px;opacity:.5;text-decoration:line-through;margin-left:6px;font-weight:400}
`;
  document.head.appendChild(s);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function _rarityStyle(r) {
  const map = {
    l: { border:'rgba(255,140,0,.7)',  glow:'rgba(255,140,0,.35)',  sub:'rgba(255,180,60,.8)',   subTxt:'◆ Легендарный' },
    e: { border:'rgba(180,79,255,.7)', glow:'rgba(180,79,255,.3)',  sub:'rgba(200,100,255,.8)',   subTxt:'◆ Эпический'   },
    r: { border:'rgba(0,200,255,.6)',  glow:'rgba(0,200,255,.25)',  sub:'rgba(0,210,255,.8)',     subTxt:'◆ Редкий'      },
    d: { border:'rgba(255,51,51,.65)', glow:'rgba(255,51,51,.3)',   sub:'rgba(255,90,90,.8)',     subTxt:'⚠ Опасное действие' },
  };
  return map[r] || map.r;
}

function _openModal(id) {
  let el = document.getElementById(id);
  if (!el) { el = document.createElement('div'); el.id = id; document.body.appendChild(el); }
  return el;
}

// ═══════════════════════════════════════════════════════════════════════════════

Object.assign(window.ShopHtmlPay = window.ShopHtmlPay || {}, {

  // ── Универсальная детальная карточка (Stars + USDT) ─────────────────────────
  _showCombinedDetail(starsId, usdtId) {
    const d = ShopHtmlPay._pkgs() || {};
    const allStars = [...(d.stars || []), ...(d.stars_scrolls || [])];
    const allUsdt  = [...(d.crypto || []), ...(d.usdt_scrolls || [])];
    const sp = starsId ? allStars.find(x => x.id === starsId) : null;
    const up = usdtId  ? allUsdt.find(x => x.id === usdtId)  : null;
    const base = sp || up; if (!base) return;

    const el = _openModal('shop-combined-detail');
    el.className = 'spd-overlay';

    // meta
    const isReset = !!(base.full_reset);
    const isPrem  = !!(base.premium || base.id === 'premium');
    const isBox   = (base.scroll_id || '').startsWith('box_');
    const isLeg   = (base.id || '').includes('titan');
    const isFirst = !!(base.first_purchase);
    const r = isReset ? 'd' : isPrem ? 'e' : isLeg ? 'l' : isBox ? 'e' : 'r';
    const rs = _rarityStyle(r);

    const name = isPrem ? 'Premium подписка'
               : isReset ? 'Сброс прогресса'
               : (base.label || '').replace(/^[^\s]+\s/, '');

    const subLine = isPrem ? '21 день · значок · бонусы'
               : isReset ? 'необратимо · только прогресс'
               : rs.subTxt;

    const desc = isPrem ? '⭐ +25% XP и Золото · 📦 Ежедневный ящик\n🏷 Скидки в магазине · 👑 Значок Premium'
               : isReset ? 'Уровень и статы обнулятся.\nЗолото, алмазы и инвентарь сохраняются.'
               : isBox ? (_BOX_DESCS[base.scroll_id] || '🎁 Ящик → в Рюкзак — открой и получи дроп')
               : (base.desc ? `${base.desc} · в Рюкзак` : '📜 Свиток → в Рюкзак — применишь перед боем');

    const icoHtml = isPrem ? '<div style="font-size:72px;line-height:1">👑</div>'
      : isReset ? '<img src="reset_icon.png?v=2" style="width:72px;height:72px;object-fit:contain;filter:drop-shadow(0 0 14px rgba(255,51,51,.7))">'
      : isBox   ? '<img src="chest_epic.png" style="width:72px;height:72px;object-fit:contain;filter:drop-shadow(0 0 14px rgba(255,200,80,.55))">'
      : isLeg   ? '<img src="scroll_titan.png" style="width:72px;height:72px;object-fit:contain;filter:drop-shadow(0 0 16px rgba(255,140,0,.8))">'
      : !base.scroll_id ? '<div style="font-size:72px;line-height:1">💎</div>'
      : '<img src="scroll_icon.png" style="width:72px;height:72px;object-fit:contain;filter:drop-shadow(0 0 14px rgba(0,200,255,.55))">';

    // First-purchase strikethrough
    const _nS = {'100':150,'300':350,'500':500};
    const _nU = {'100':'2.99','300':'6.99','500':'9.99'};
    const _d  = base.diamonds ? String(base.diamonds) : '';
    const strikeS = isFirst && sp && _nS[_d] ? `<span class="spd-strike">⭐${_nS[_d]}</span>` : '';
    const strikeU = isFirst && up && _nU[_d] ? `<span class="spd-strike">$${_nU[_d]}</span>`  : '';

    const sRow = sp ? `<button class="spd-btn spd-btn-${isReset ? 'danger' : 's'}" data-act-s>⭐ ${sp.stars} Stars${strikeS}</button>` : '';
    const uRow = up ? `<button class="spd-btn spd-btn-${isReset ? 'danger' : 'u'}" data-act-u>💲 ${up.usdt} USDT${strikeU}</button>` : '';

    const firstBadge = isFirst
      ? `<div class="spd-badge spd-badge-fire">🔥 Скидка первой покупки · только 1 раз</div>` : '';

    el.innerHTML = `
<div class="spd-card" style="border:1px solid ${rs.border};box-shadow:0 0 40px ${rs.glow},0 16px 50px rgba(0,0,0,.8)">
  <div class="spd-close" data-close>×</div>
  <div class="spd-ico">${icoHtml}</div>
  <div class="spd-name">${name}</div>
  <div class="spd-sub" style="color:${rs.sub}">${subLine}</div>
  ${firstBadge}
  <div class="spd-desc">${desc.replace(/\n/g,'<br>')}</div>
  <div class="spd-line" style="background:linear-gradient(90deg,transparent,${rs.border},transparent)"></div>
  ${sRow}${uRow}
  ${sp && up ? '<div class="spd-hint">⭐ Stars — моментально &nbsp;·&nbsp; 💲 USDT — крипто</div>' : ''}
</div>`;

    el.querySelector('[data-close]')?.addEventListener('click', () => el.remove());
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });
    el.querySelector('[data-act-s]')?.addEventListener('click', () => { el.remove(); ShopHtmlPay._buyStars(starsId); });
    el.querySelector('[data-act-u]')?.addEventListener('click', () => { el.remove(); ShopHtmlPay._buyCrypto(usdtId); });
  },

  // ── Стартовый пак ───────────────────────────────────────────────────────────
  _showStarterDetail(starsId, usdtId, sPkg, uPkg, cryptoEnabled) {
    const el = _openModal('shop-combined-detail');
    el.className = 'spd-overlay';

    const sRow = sPkg
      ? `<button class="spd-btn spd-btn-s" data-act-s>⭐ ${sPkg.stars} Stars</button>`
      : '';
    const uRow = (uPkg && cryptoEnabled)
      ? `<button class="spd-btn spd-btn-u" data-act-u>💲 ${uPkg.usdt} USDT</button>`
      : '';

    el.innerHTML = `
<div class="spd-card" style="border:1px solid rgba(255,170,51,.6);box-shadow:0 0 40px rgba(255,140,0,.3),0 16px 50px rgba(0,0,0,.8)">
  <div class="spd-close" data-close>×</div>
  <div class="spd-ico"><div style="font-size:64px;line-height:1;filter:drop-shadow(0 0 16px rgba(255,170,51,.6))">🎁</div></div>
  <div class="spd-name" style="text-shadow:0 0 18px rgba(255,170,51,.5)">Стартовый пак</div>
  <div class="spd-sub" style="color:rgba(255,200,80,.85)">только 1 раз · скидка ×4 от цены</div>
  <div style="background:rgba(255,140,0,.08);border:1px solid rgba(255,140,0,.25);border-radius:12px;padding:10px 14px;margin-bottom:14px;position:relative;z-index:1">
    <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.07)">
      <span style="font-size:22px;width:28px;text-align:center">💎</span>
      <span style="font-size:14px;color:#fff;font-weight:700">200 алмазов</span>
      <span style="font-size:11px;color:rgba(0,220,255,.6);margin-left:auto">моментально</span>
    </div>
    <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.07)">
      <span style="font-size:22px;width:28px;text-align:center">👑</span>
      <span style="font-size:14px;color:#fff;font-weight:700">Premium 14 дней</span>
      <span style="font-size:11px;color:rgba(0,220,255,.6);margin-left:auto">+25% XP и Золото</span>
    </div>
    <div style="display:flex;align-items:center;gap:10px;padding:7px 0">
      <span style="font-size:22px;width:28px;text-align:center">🏔️</span>
      <span style="font-size:14px;color:#fff;font-weight:700">2× Свиток Титана</span>
      <span style="font-size:11px;color:rgba(0,220,255,.6);margin-left:auto">+15 всё · 7 боёв</span>
    </div>
  </div>
  <div class="spd-line" style="background:linear-gradient(90deg,transparent,rgba(255,170,51,.45),transparent)"></div>
  <div style="text-align:center;font-size:12px;color:rgba(255,210,100,.55);margin-bottom:12px;position:relative;z-index:1">Ценность ~$17 · доступно по цене</div>
  ${sRow}${uRow}
  ${sRow && uRow ? '<div class="spd-hint">⭐ Stars — моментально &nbsp;·&nbsp; 💲 USDT — крипто</div>' : ''}
</div>`;

    el.querySelector('[data-close]')?.addEventListener('click', () => el.remove());
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });
    el.querySelector('[data-act-s]')?.addEventListener('click', () => { el.remove(); ShopHtmlPay._buyStars(starsId); });
    el.querySelector('[data-act-u]')?.addEventListener('click', () => { el.remove(); ShopHtmlPay._buyCrypto(usdtId); });
  },

  // ── Совместимость: Stars-only детальная карточка ────────────────────────────
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
    ShopHtmlPay._showCombinedDetail(id, null);
  },

  // ── Совместимость: USDT-only детальная карточка ─────────────────────────────
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
    ShopHtmlPay._showCombinedDetail(null, id);
  },
});
})();
