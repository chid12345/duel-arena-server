/* ============================================================
   ShopHtmlPremBox — иконка ежедневного ящика в шапке магазина
   Пульсирует если не забрал, гаснет если забрал
   ============================================================ */

window.ShopHtmlPremBox = {

  _timerId: null,
  _tweenId: null,

  async initHeaderBtn() {
    const hdr = document.getElementById('sh-prembox-hdr');
    if (!hdr) return;
    hdr.style.display = 'flex';

    let res;
    try { res = await get('/api/shop/premium_box/status'); } catch(_) { return; }
    if (!res?.ok || !res.is_premium) { hdr.style.display = 'none'; return; }

    if (!res.ok || res.claimed) {
      this._setDark(hdr, res.seconds_until_reset || 0);
    } else {
      this._setGlow(hdr);
    }
    hdr.onclick = () => this._claim(hdr);
  },

  _setGlow(hdr) {
    clearInterval(this._timerId);
    const ico = document.getElementById('sh-prembox-hdr-ico');
    const lbl = document.getElementById('sh-prembox-hdr-lbl');
    if (ico) {
      ico.style.opacity = '1';
      ico.style.animation = 'premhdr-glow 1.4s ease-in-out infinite';
    }
    if (lbl) { lbl.textContent = 'ЗАБРАТЬ'; lbl.style.color = '#ffd700'; lbl.style.opacity = '1'; }
  },

  _setDark(hdr, seconds) {
    clearInterval(this._timerId);
    const ico = document.getElementById('sh-prembox-hdr-ico');
    const lbl = document.getElementById('sh-prembox-hdr-lbl');
    if (ico) { ico.style.filter = 'grayscale(1) brightness(.3)'; ico.style.animation = 'none'; ico.style.opacity = '.3'; }
    if (!lbl) return;
    let secs = seconds || 0;
    const _fmt = s => {
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    };
    lbl.style.color = 'rgba(255,255,255,.3)';
    lbl.textContent = _fmt(secs);
    this._timerId = setInterval(() => {
      secs--;
      if (secs <= 0) { clearInterval(this._timerId); lbl.textContent = 'скоро'; return; }
      lbl.textContent = _fmt(secs);
    }, 1000);
  },

  async _claim(hdr) {
    const ico = document.getElementById('sh-prembox-hdr-ico');
    if (ico) { ico.style.animation = 'none'; ico.style.opacity = '.5'; }
    try {
      const box = await post('/api/shop/premium_daily_box', {});
      if (box?.ok && box?.box_opened) {
        ShopHtml._showPremBoxReveal(box.items || []);
        ShopHtml.bumpInvBadge?.();
        this._setDark(hdr, box.seconds_until_reset || 0);
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
      } else {
        ShopHtml.toast(box?.reason || 'Уже получен сегодня', true);
        this._setDark(hdr, box?.seconds_until_reset || 0);
      }
    } catch(_) {
      ShopHtml.toast('Ошибка соединения', true);
      this._setGlow(hdr);
    }
  },

};
