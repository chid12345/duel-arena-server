/* ============================================================
   Tasks HTML — вкладка ⚡ Задания (ежедневные + недельные)
   + попап при тапе на карточку
   ============================================================ */
window.TasksHTML_Daily = function(data) {
  const _e = window._TasksHTML_esc;
  const daily   = data.daily || [];
  const weekly  = data.weekly_extra || [];
  const date    = new Date().toLocaleDateString('ru-RU', {day:'numeric', month:'long'});

  function _rewardHtml(q) {
    const parts = [];
    if (q.reward_gold)     parts.push(`<span class="tw-rg">+${q.reward_gold}💰</span>`);
    if (q.reward_diamonds) parts.push(`<span class="tw-rd">+${q.reward_diamonds}💎</span>`);
    if (q.reward_xp)       parts.push(`<span class="tw-rx">+${q.reward_xp}⭐</span>`);
    return parts.join('');
  }

  function _card(q, type) {
    const done    = q.is_completed, claimed = q.reward_claimed;
    if (claimed) return '';
    const pct     = Math.min(100, Math.round((q.current / Math.max(1, q.target)) * 100));
    const icon    = (q.label||'').split(' ')[0];
    const name    = (q.label||'').replace(/^[^ ]+ /, '');
    const barCls  = done ? 'gold' : type === 'weekly' ? 'purple' : 'blue';
    const claimAttr = done ? (type==='weekly' ? `data-claim-weekly="${_e(q.key)}"` : `data-claim-daily="${_e(q.key)}"`) : '';
    const cardKey = _e(JSON.stringify({icon,name,desc:q.desc||'',cur:q.current,max:q.target,rg:q.reward_gold,rd:q.reward_diamonds,rx:q.reward_xp}));
    return `
<div class="tw-card${done?' done':''}${type==='weekly'?' weekly':''}" data-popup='${cardKey}'>
  <div class="tw-rpos">${_rewardHtml(q)}</div>
  <div class="tw-row">
    <div class="tw-ic">${_e(icon)}</div>
    <div class="tw-body">
      <div class="tw-nm${done?' done':''}">${_e(name)}</div>
      <div class="tw-ds">${_e(q.desc||'')}</div>
      <div class="tw-pg${done?' done':''}">${q.current} / ${q.target} · ${pct}%${done?' ✓':''}</div>
      <div class="tw-bw"><div class="tw-bar ${barCls}" style="width:${pct}%"></div></div>
    </div>
    <div class="tw-right">
      ${done
        ? `<button class="tsk-gift-btn" ${claimAttr}><img src="task_gift.png" alt=""><span>ЗАБРАТЬ</span></button>`
        : `<div class="tsk-lock">🔒</div>`}
    </div>
  </div>
</div>`;
  }

  const CSS = `<style id="tsk-tasks-style">
.tw-list{padding:0 12px;display:flex;flex-direction:column;gap:6px}
.tw-card{padding:9px 10px;border-radius:13px;background:linear-gradient(135deg,rgba(12,3,24,.95),rgba(5,5,15,.95));border:1px solid rgba(0,240,255,.2);position:relative;overflow:visible;cursor:pointer}
.tw-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,#00f0ff,rgba(0,240,255,.05));border-radius:3px 0 0 3px}
.tw-card.done{border-color:rgba(255,209,102,.45);box-shadow:0 0 14px rgba(255,209,102,.08)}
.tw-card.done::before{background:linear-gradient(180deg,#ffd166,rgba(255,209,102,.05))}
.tw-card.weekly::before{background:linear-gradient(180deg,#b45aff,rgba(176,90,255,.05))}
.tw-card.weekly{border-color:rgba(176,90,255,.3)}
.tw-card.weekly.done{border-color:rgba(255,209,102,.45)}
.tw-rpos{position:absolute;top:8px;right:58px;text-align:right;line-height:1.6;pointer-events:none}
.tw-card.done .tw-rpos,.tw-card:not(.done) .tw-rpos{right:12px}
.tw-card.done .tw-rpos{right:58px}
.tw-rg{color:#ffd166;font-weight:700;font-size:9px;display:block}
.tw-rd{color:#cc88ff;font-weight:700;font-size:9px;display:block}
.tw-rx{color:#88ddff;font-weight:700;font-size:9px;display:block}
.tw-row{display:flex;align-items:flex-start;gap:9px}
.tw-ic{font-size:20px;line-height:1;margin-top:2px;flex-shrink:0}
.tw-body{flex:1;min-width:0}
.tw-nm{font-size:11px;font-weight:700;color:#fff}
.tw-nm.done{color:#55d0ff}
.tw-ds{font-size:9px;color:#80c8ff;margin-top:1px;opacity:.8}
.tw-pg{font-size:9px;font-weight:700;color:#ffe888;margin-top:4px}
.tw-pg.done{color:#ffd166}
.tw-bw{margin-top:4px;height:4px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden}
.tw-bar{height:100%;border-radius:3px}
.tw-bar.blue{background:linear-gradient(90deg,#5096ff,#00f0ff);box-shadow:0 0 6px rgba(0,240,255,.4)}
.tw-bar.gold{background:linear-gradient(90deg,#ffc83c,#ffd166);box-shadow:0 0 6px rgba(255,200,60,.4)}
.tw-bar.purple{background:linear-gradient(90deg,#b45aff,#ff3ba8);box-shadow:0 0 6px rgba(180,90,255,.4)}
.tw-right{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;flex-shrink:0;width:50px;padding-bottom:1px}
</style>`;

  const dailyActive  = daily.filter(q => !q.reward_claimed);
  const dailyClaimed = daily.filter(q => q.reward_claimed).length;
  const pct = daily.length ? Math.round(dailyClaimed / daily.length * 100) : 0;

  const weeklyHtml = weekly.length ? `
<div class="tsk-sec" style="margin-top:6px">НЕДЕЛЬНЫЕ <span class="tsk-date">Сброс: Пн</span></div>
<div class="tw-list">${weekly.map(q => _card(q,'weekly')).join('')}</div>
<div class="tsk-reset">🔄 Сброс в понедельник в 00:00</div>` : '';

  return `${CSS}
<div class="tsk-sec">ЕЖЕДНЕВНЫЕ <span class="tsk-date">${_e(date)}</span></div>
<div class="tw-list">${dailyActive.length ? dailyActive.map(q => _card(q,'daily')).join('') : '<div class="tsk-loading" style="height:60px">✅ Все задания выполнены!</div>'}</div>
${dailyClaimed > 0 ? `
<div class="tsk-psum">
  <span>✅ ${dailyClaimed} / ${daily.length} выполнено</span>
  <div class="tsk-psbar"><div class="tsk-psfill" style="width:${pct}%"></div></div>
  <span style="color:#80d8ff">${pct}%</span>
</div>` : ''}
<div class="tsk-reset">🔄 Сброс каждые сутки в 00:00</div>
${weeklyHtml}`;
};

/* ── Попап при тапе на карточку задания ── */
window.TasksHTML_attachPopups = function(root, scene) {
  root.querySelectorAll('[data-popup]').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.tsk-gift-btn, [data-claim-daily], [data-claim-weekly]')) return;
      try {
        const d = JSON.parse(card.dataset.popup);
        showItemDetailPopup(scene, {
          icon: d.icon, name: d.name,
          desc: d.desc || 'Выполни задание, чтобы получить награду!',
          progress: true, progressCur: d.cur, progressMax: d.max,
          rewards: { gold: d.rg, diamonds: d.rd, xp: d.rx },
        });
      } catch(_) {}
    });
  });
};
