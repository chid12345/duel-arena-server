/* wb_html_claim_popup.js — попап «✅ ПОЛУЧЕНО» при заборе награды рейда WB.
   Показывает НАСТОЯЩУЮ картинку сундука/свитка (через BoxIcons) + алмазы/золото/опыт.
   Стиль — киберпанк-карточка как тост награды в «Заданиях».
   Вызывается из wb_html_claim_reward_fix.js после успешного claim. */
(() => {
  const CSS = `
.wb-claim-ov{position:fixed;inset:0;z-index:10030;display:flex;align-items:center;justify-content:center;
  background:rgba(0,0,0,.82);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
  opacity:0;pointer-events:none;transition:opacity .2s;}
.wb-claim-ov.open{opacity:1;pointer-events:all;}
.wb-claim{position:relative;width:calc(100% - 64px);max-width:300px;border-radius:18px;overflow:hidden;
  background:linear-gradient(160deg,rgba(8,2,20,.99),rgba(2,4,16,.99));
  border:1px solid rgba(0,240,255,.5);text-align:center;padding:0 0 20px;
  box-shadow:0 0 28px rgba(0,240,255,.18),0 0 60px rgba(0,240,255,.07),inset 0 0 24px rgba(0,240,255,.03);
  transform:scale(.8);opacity:0;transition:transform .24s cubic-bezier(.34,1.56,.64,1),opacity .2s;}
.wb-claim-ov.open .wb-claim{transform:scale(1);opacity:1;}
.wb-claim::before{content:'';display:block;height:3px;
  background:linear-gradient(90deg,#ff3ba8,#00f0ff,#b45aff,#00f0ff,#ff3ba8);background-size:200%;
  animation:wb-claim-shift 3s linear infinite;}
@keyframes wb-claim-shift{0%{background-position:0}100%{background-position:200%}}
.wb-claim::after{content:'';position:absolute;inset:0;pointer-events:none;border-radius:18px;
  background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,255,220,.018) 3px 4px);}
.wb-claim-ttl{position:relative;z-index:1;font-size:9px;font-weight:700;color:rgba(255,255,255,.6);
  letter-spacing:3px;text-transform:uppercase;margin:16px 0 8px;}
.wb-claim-ic{position:relative;z-index:1;height:86px;display:flex;align-items:center;justify-content:center;
  margin-bottom:8px;animation:wb-claim-bob 2.4s ease-in-out infinite;}
.wb-claim-ic img{max-height:86px!important;max-width:86px!important;width:auto!important;height:auto!important;object-fit:contain;}
.wb-claim-ic .em{font-size:60px;line-height:1;filter:drop-shadow(0 0 14px rgba(0,240,255,.7));}
@keyframes wb-claim-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.wb-claim-nm{position:relative;z-index:1;font-size:14px;font-weight:800;padding:0 22px;line-height:1.3;
  background:linear-gradient(90deg,#ff3ba8,#00f0ff);-webkit-background-clip:text;background-clip:text;color:transparent;}
.wb-claim-items{position:relative;z-index:1;font-size:17px;font-weight:800;color:#ffd166;letter-spacing:1px;
  margin-top:13px;line-height:1.5;text-shadow:0 0 14px rgba(255,209,102,.85),0 2px 6px rgba(0,0,0,.85);}
`;

  const NAMES = {
    wb_diamond_chest: 'Алмазный сундук рейда',
    wb_gold_chest:    'Золотой сундук рейда',
    scroll_all_12:    'Свиток «+12 ко всем пассивкам»',
  };

  function _esc(v) { return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function _inject() {
    if (document.getElementById('wb-style-claim')) return;
    const s = document.createElement('style');
    s.id = 'wb-style-claim'; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function _iconHtml(chestType, res) {
    if (chestType === 'scroll_all_12') {
      return `<img src="scroll_icon.png" alt="" style="filter:drop-shadow(0 0 12px rgba(180,80,255,.75)) drop-shadow(0 0 3px rgba(180,80,255,.5))">`;
    }
    // Настоящая картинка сундука из единого реестра BoxIcons
    if (chestType && window.BoxIcons?.imageFor?.(chestType)) {
      return window.BoxIcons.htmlIcon(chestType, '🎁', 86);
    }
    // Сундук есть, но тип незнаком — общий ящик
    if (chestType || res?.chest_added) {
      return window.BoxIcons?.htmlIcon?.('box_common', '🎁', 86) || `<span class="em">🎁</span>`;
    }
    // Только валюта — без картинки сундука
    return `<span class="em">${(res?.diamonds > 0) ? '💎' : '🏆'}</span>`;
  }

  function _close() {
    const ov = document.getElementById('wb-claim-ov');
    if (!ov) return;
    ov.classList.remove('open');
    setTimeout(() => ov.remove(), 220);
  }

  /** reward — объект награды из state (несёт chest_type);
   *  res — ответ API claim_reward ({gold,exp,diamonds,chest_added}). */
  function showClaimReward(reward, res) {
    _inject();
    document.getElementById('wb-claim-ov')?.remove();

    const r = res || {};
    const chestType = reward?.chest_type || (r.chest_added ? 'wb_gold_chest' : null);
    const hasChest = !!chestType;

    const parts = [];
    if ((r.gold     || 0) > 0) parts.push(`+${(r.gold).toLocaleString('ru')}💰`);
    if ((r.diamonds || 0) > 0) parts.push(`+${r.diamonds}💎`);
    if ((r.exp      || 0) > 0) parts.push(`+${(r.exp).toLocaleString('ru')}⭐`);

    const name = hasChest
      ? (NAMES[chestType] || 'Сундук рейда')
      : ((r.diamonds > 0) ? 'Кристаллы' : 'Награда получена');

    const itemsHtml = parts.length ? `<div class="wb-claim-items">${parts.join('  ')}</div>` : '';

    const ov = document.createElement('div');
    ov.id = 'wb-claim-ov'; ov.className = 'wb-claim-ov';
    ov.innerHTML = `<div class="wb-claim">
      <div class="wb-claim-ttl">✅ Получено</div>
      <div class="wb-claim-ic">${_iconHtml(chestType, r)}</div>
      <div class="wb-claim-nm">${_esc(name)}</div>
      ${itemsHtml}
    </div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success'); } catch (_) {}

    // Тап по окну — закрыть сразу; иначе авто-закрытие (быстрое окно).
    ov.addEventListener('click', _close);
    setTimeout(_close, 2600);
  }

  Object.assign(window.WBHtml = window.WBHtml || {}, { showClaimReward });
})();
