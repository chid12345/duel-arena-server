/* ============================================================
   Tasks HTML — вкладка 🏆 Достижения + попап при тапе
   ============================================================ */
window.TasksHTML_Achieve = function(achievements) {
  const _e = window._TasksHTML_esc;
  if (!achievements.length) return '<div class="tsk-loading">Нет достижений</div>';

  const CSS = `<style id="tsk-ach-style">
.ta-banner{margin:8px 12px 0;padding:9px 14px;border-radius:11px;background:rgba(0,240,255,.06);border:1px solid rgba(0,240,255,.35);font-size:11px;font-weight:700;color:#55d0ff;text-align:center;box-shadow:0 0 12px rgba(0,240,255,.1)}
.ta-list{padding:0 12px;display:flex;flex-direction:column;gap:5px;margin-top:4px}
.ta-card{padding:7px 9px;border-radius:11px;background:linear-gradient(135deg,rgba(12,3,24,.95),rgba(5,5,15,.95));border:1px solid rgba(0,240,255,.2);position:relative;display:flex;gap:0;align-items:stretch;cursor:pointer}
.ta-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,#00f0ff,rgba(0,240,255,.05));border-radius:3px 0 0 3px}
@keyframes taGlow{0%,100%{box-shadow:0 0 8px rgba(0,240,255,.1)}50%{box-shadow:0 0 20px rgba(0,240,255,.25)}}
.ta-card.claim{border-color:rgba(0,240,255,.55);animation:taGlow 2s ease-in-out infinite}
.ta-card.claim::before{background:linear-gradient(180deg,#00f0ff,#ff3ba8)}
.ta-card.alldone{border-color:rgba(80,100,130,.2);opacity:.4}
.ta-body{flex:1;min-width:0}
.ta-ic{font-size:16px;margin-bottom:1px}
.ta-nm{font-size:11px;font-weight:700;color:#fff}
.ta-nm.active{color:#55d0ff}
.ta-ds{font-size:8px;color:#80c8ff;opacity:.75;margin-top:1px}
.ta-pg{font-size:9px;font-weight:700;color:#ffe888;margin-top:4px}
.ta-pg.done{color:#ffd166}
.ta-bw{margin-top:4px;height:4px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden}
.ta-bf{height:100%;border-radius:3px}
.ta-bf.blue{background:linear-gradient(90deg,#5096ff,#00f0ff);box-shadow:0 0 6px rgba(0,240,255,.35)}
.ta-bf.gold{background:linear-gradient(90deg,#ffc83c,#ffd166);box-shadow:0 0 6px rgba(255,200,60,.35)}
.ta-right{width:76px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border-left:1px solid rgba(0,240,255,.1);padding-left:9px;margin-left:9px}
.ta-tier{font-size:8px;color:#80c8ff;font-weight:700;letter-spacing:.3px}
.ta-rg{font-size:10px;font-weight:700;color:#ffd166}
.ta-rd{font-size:9px;font-weight:700;color:#cc88ff}
.ta-dsep{margin:8px 12px 4px;padding:6px 14px;border-radius:9px;background:rgba(255,215,0,.05);border:1px solid rgba(255,215,0,.18);font-size:9px;font-weight:700;color:#ffd700;text-align:center;letter-spacing:.5px}
@keyframes taHeadScan{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
@keyframes taHeadPulse{0%,100%{box-shadow:0 0 16px rgba(255,59,168,.25),0 0 32px rgba(0,240,255,.15)}50%{box-shadow:0 0 24px rgba(255,59,168,.45),0 0 48px rgba(0,240,255,.3)}}
.ta-head{position:relative;margin:10px 12px 6px;padding:11px 14px;border-radius:12px;background:linear-gradient(135deg,rgba(20,0,35,.92),rgba(5,5,18,.92),rgba(0,30,40,.92));border:1px solid rgba(255,59,168,.55);overflow:hidden;animation:taHeadPulse 2.6s ease-in-out infinite}
.ta-head::before{content:"";position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,#ff3ba8,#00f0ff,transparent)}
.ta-head::after{content:"";position:absolute;top:0;left:0;width:30%;height:100%;background:linear-gradient(90deg,transparent,rgba(0,240,255,.08),transparent);animation:taHeadScan 3.2s linear infinite;pointer-events:none}
.ta-head-row{display:flex;align-items:center;gap:10px;position:relative;z-index:1}
.ta-head-ic{font-size:22px;filter:drop-shadow(0 0 6px #ff3ba8)}
.ta-head-l{flex:1;min-width:0}
.ta-head-t{font-size:11px;font-weight:900;letter-spacing:1.5px;color:#ff7acb;text-shadow:0 0 8px rgba(255,59,168,.6);text-transform:uppercase}
.ta-head-c{font-size:9px;color:#80d8ff;letter-spacing:.5px;margin-top:1px;opacity:.85}
.ta-head-c b{color:#00f0ff;text-shadow:0 0 6px rgba(0,240,255,.6);font-size:11px}
.ta-head-c i{color:#ffd166;font-style:normal;text-shadow:0 0 6px rgba(255,209,102,.5);font-weight:800}
.ta-head-bar{margin-top:8px;height:5px;border-radius:3px;background:rgba(10,5,25,.7);border:1px solid rgba(0,240,255,.15);overflow:hidden;position:relative;z-index:1}
.ta-head-bf{height:100%;border-radius:3px;background:linear-gradient(90deg,#ff3ba8,#cc44dd,#00f0ff);box-shadow:0 0 10px rgba(255,59,168,.6),0 0 16px rgba(0,240,255,.4)}
</style>`;

  const sorted = [...achievements].sort((a,b) => {
    const rank = x => x.all_done ? -1 : (x.can_claim_tier !== null ? 2 : 1);
    return rank(b) - rank(a);
  });

  const ready = sorted.filter(a => a.can_claim_tier !== null && !a.all_done).length;

  function _achCard(a) {
    if (a.all_done) {
      return `<div class="ta-card alldone" data-ach-popup='${_e(JSON.stringify({label:a.label,desc:a.desc,max:a.max_tier}))}'>
  <div class="ta-body">
    <div class="ta-ic">${_e((a.label||'').split(' ')[0])}</div>
    <div class="ta-nm">${_e((a.label||'').replace(/^[^ ]+ /,''))}</div>
    <div class="ta-ds">${_e(a.desc||'')}</div>
  </div>
  <div class="ta-right">
    <div class="ta-tier" style="color:#445566">MAX ${a.max_tier}/${a.max_tier}</div>
    <div style="font-size:10px;color:#556677">✅</div>
  </div>
</div>`;
    }

    const canClaim = a.can_claim_tier !== null;
    const pPct = Math.min(100, Math.round(
      (a.current - a.prev_target) / Math.max(1, a.next_target - a.prev_target) * 100
    ));
    const dispCur = Math.min(a.current, a.next_target);
    const icon = (a.label||'').split(' ')[0];
    const name = (a.label||'').replace(/^[^ ]+ /,'');
    const popupData = _e(JSON.stringify({icon,name,desc:a.desc,cur:dispCur,max:a.next_target,rg:a.next_gold,rd:a.next_diamonds,tier:a.claimed_tier,maxTier:a.max_tier,canClaim}));

    return `<div class="ta-card${canClaim?' claim':''}" data-ach-popup='${popupData}'>
  <div class="ta-body">
    <div class="ta-ic">${_e(icon)}</div>
    <div class="ta-nm${canClaim?' active':''}">${_e(name)}</div>
    <div class="ta-ds">${_e(a.desc||'')}</div>
    <div class="ta-pg${canClaim?' done':''}">${dispCur} / ${a.next_target} · ${pPct}%${canClaim?' ✓':''}</div>
    <div class="ta-bw"><div class="ta-bf ${canClaim?'gold':'blue'}" style="width:${pPct}%"></div></div>
  </div>
  <div class="ta-right">
    <div class="ta-tier">УР. ${a.claimed_tier} / ${a.max_tier}</div>
    ${a.next_gold ? `<div class="ta-rg">+${a.next_gold}💰</div>` : ''}
    ${a.next_diamonds ? `<div class="ta-rd">+${a.next_diamonds}💎</div>` : ''}
    ${canClaim
      ? `<button class="tsk-gift-btn" data-claim-ach="${_e(a.key)}|${a.can_claim_tier}" style="color:#ff3ba8"><img src="task_gift.png" alt=""><span>ВЗЯТЬ</span></button>`
      : `<div class="tsk-lock">🔒</div>`}
  </div>
</div>`;
  }

  const inProgress = sorted.filter(a => !a.all_done);
  const allDone    = sorted.filter(a => a.all_done);

  const total = achievements.length;
  const doneN = allDone.length;
  const headPct = total > 0 ? Math.min(100, Math.round(doneN / total * 100)) : 0;

  const headHTML = `<div class="ta-head">
  <div class="ta-head-row">
    <span class="ta-head-ic">🏆</span>
    <div class="ta-head-l">
      <div class="ta-head-t">ДОСТИЖЕНИЯ</div>
      <div class="ta-head-c">пройдено <b>${doneN}</b> из <i>${total}</i> · ${headPct}%</div>
    </div>
  </div>
  <div class="ta-head-bar"><div class="ta-head-bf" style="width:${headPct}%"></div></div>
</div>`;

  return `${CSS}
${headHTML}
${ready > 0 ? `<div class="ta-banner">🎁 Готово к получению: ${ready} достижени${ready===1?'е':ready<5?'я':'й'}</div>` : ''}
<div class="ta-list">${inProgress.map(_achCard).join('')}</div>
${allDone.length ? `<div class="ta-dsep">✅ ЗАВЕРШЁННЫЕ ДОСТИЖЕНИЯ (${doneN}/${total})</div><div class="ta-list">${allDone.map(_achCard).join('')}</div>` : ''}
<div class="tsk-reset">🏆 Достижения не сбрасываются</div>`;
};

/* ── Попап при тапе на достижение ── */
window.TasksHTML_attachAchPopups = function(root, scene) {
  root.querySelectorAll('[data-ach-popup]').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.tsk-gift-btn, [data-claim-ach]')) return;
      try {
        const d = JSON.parse(card.dataset.achPopup);
        if (d.max) {
          window.TasksHTML_showPopup({ icon: '🏆', name: (d.label||'').replace(/^[^ ]+ /,''), desc: `${d.desc||''}\n\n✅ Все ${d.max} уровней пройдены!`, badge: `MAX ${d.max}/${d.max}` });
        } else {
          window.TasksHTML_showPopup({
            icon: d.icon, name: d.name,
            desc: d.desc || 'Продолжай играть для прогресса!',
            badge: `Ур. ${d.tier} / ${d.maxTier}`,
            progress: true, progressCur: d.cur, progressMax: d.max,
            rewards: { gold: d.rg, diamonds: d.rd },
          });
        }
      } catch(_) {}
    });
  });
};
