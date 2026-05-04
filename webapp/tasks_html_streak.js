/* ============================================================
   Tasks HTML — вкладка 🔥 Стрик
   ============================================================ */
window.TasksHTML_Streak = function(streak) {
  if (!streak) return '<div class="tsk-loading">Нет данных стрика</div>';

  const _e = window._TasksHTML_esc;
  const sd      = parseInt(streak.streak_day || 0);
  const claimed = new Set(streak.days_claimed || []);
  const rewards = streak.reward_set || [];
  const ws      = (streak.week_set || 0) % 4;
  const setName = ['A','B','C','D'][ws];
  const todayClaimed = claimed.has(sd);
  const canClaim = sd > 0 && !todayClaimed;
  const todayReward = rewards[sd - 1] || {};

  const CSS = `
<style id="tsk-streak-style">
.tsk-sb{margin:12px 12px 0;padding:14px;border-radius:14px;background:linear-gradient(135deg,rgba(20,0,35,.97),rgba(5,5,18,.97));border:1px solid rgba(255,59,168,.5);box-shadow:0 0 20px rgba(255,59,168,.12);text-align:center}
@keyframes tskFire{0%,100%{transform:scale(1) rotate(-2deg);filter:drop-shadow(0 0 10px #ff9933)}50%{transform:scale(1.1) rotate(2deg);filter:drop-shadow(0 0 20px #ffcc00)}}
.tsk-sfire{font-size:48px;display:block;animation:tskFire 1.6s ease-in-out infinite;margin-bottom:4px}
.tsk-sval{font-size:34px;font-weight:900;color:#ffd166;text-shadow:0 0 20px rgba(255,209,102,.7);line-height:1}
.tsk-sunit{font-size:11px;color:#ff7acb;font-weight:700;letter-spacing:1px;margin-top:2px}
.tsk-sdesc{font-size:10px;color:#80d8ff;margin:6px 0 10px;opacity:.85}
.tsk-sdays{display:flex;justify-content:center;gap:5px;flex-wrap:wrap;margin-top:6px}
.tsk-sday{width:34px;height:38px;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;background:rgba(10,5,25,.8);border:1px solid rgba(0,240,255,.2);font-size:7px;font-weight:700;color:#80c8ff;cursor:default}
.tsk-sday.done{border-color:#ffd166;background:rgba(255,209,102,.1);color:#ffd166;box-shadow:0 0 8px rgba(255,209,102,.25)}
.tsk-sday.today{border-color:#ff3ba8;background:rgba(255,59,168,.12);color:#ff7acb;box-shadow:0 0 10px rgba(255,59,168,.35)}
.tsk-sday .sd-em{font-size:14px;line-height:1}
.tsk-sday .sd-n{font-size:7px;opacity:.7}
.tsk-sbrow{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin:10px 12px 0}
.tsk-sbc{padding:9px 6px;border-radius:12px;text-align:center;background:linear-gradient(135deg,rgba(20,5,35,.9),rgba(5,5,18,.9));border:1px solid rgba(255,59,168,.4)}
.tsk-sbc.gold{border-color:rgba(255,209,102,.5)}
.tsk-sbv{font-size:15px;font-weight:800;color:#00f0ff;text-shadow:0 0 8px currentColor}
.tsk-sbc.gold .tsk-sbv{color:#ffd166}
.tsk-sbl{font-size:8px;font-weight:700;color:#ff7acb;margin-top:3px;letter-spacing:.3px}
.tsk-sbc.gold .tsk-sbl{color:#ffe08a}
.tsk-scbtn{display:block;width:calc(100% - 24px);margin:10px 12px 0;padding:12px;border-radius:13px;border:none;cursor:pointer;font-size:13px;font-weight:800;letter-spacing:.4px;background:linear-gradient(135deg,#ff3ba8,#a01e6e);color:#fff;box-shadow:0 0 18px rgba(255,59,168,.5);transition:all .15s;user-select:none}
.tsk-scbtn:active{transform:scale(.97);box-shadow:0 0 28px rgba(255,59,168,.8)}
.tsk-scbtn.claimed{background:linear-gradient(135deg,#1a4020,#0a2010);color:#80ff9c;box-shadow:none;cursor:default}
</style>`;

  const dayNames = ['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'];
  const daysHTML = Array.from({length:7}, (_,i) => {
    const dn = i + 1;
    const isDone = claimed.has(dn) || dn < sd;
    const isToday = dn === sd;
    const cls = isDone ? 'done' : isToday ? 'today' : '';
    const em = isDone ? '✅' : isToday ? '🎁' : '—';
    return `<div class="tsk-sday ${cls}"><span class="sd-em">${em}</span><span class="sd-n">${dayNames[i]}</span></div>`;
  }).join('');

  const rGold = todayReward.gold || 0;
  const rDia  = todayReward.diamonds || 0;
  const rXp   = todayReward.xp || 0;
  const rItem = todayReward.item || '';

  const rewardStr = [rGold && `+${rGold}💰`, rDia && `+${rDia}💎`, rXp && `+${rXp}⭐`, rItem && rItem].filter(Boolean).join(' ');

  const claimBtn = canClaim
    ? `<button class="tsk-scbtn" data-claim-streak="${sd}">🎁 Забрать ${rewardStr}</button>`
    : todayClaimed
      ? `<button class="tsk-scbtn claimed" disabled>✅ Сегодня уже забрано</button>`
      : `<button class="tsk-scbtn claimed" disabled>🔒 Возвращайся завтра</button>`;

  return `${CSS}
<div class="tsk-sb">
  <span class="tsk-sfire">🔥</span>
  <div class="tsk-sval">${sd}</div>
  <div class="tsk-sunit">ДЕНЬ СТРИКА · НАБОР ${_e(setName)}</div>
  <div class="tsk-sdesc">Заходи каждый день — бонус растёт!</div>
  <div class="tsk-sdays">${daysHTML}</div>
</div>
<div class="tsk-sbrow">
  <div class="tsk-sbc gold">
    <div class="tsk-sbv">${rGold ? '+'+rGold+'💰' : '—'}</div>
    <div class="tsk-sbl">СЕГОДНЯ</div>
  </div>
  <div class="tsk-sbc">
    <div class="tsk-sbv">${7 - sd > 0 ? (7-sd)+' дн' : '✅'}</div>
    <div class="tsk-sbl">ДО КОНЦА</div>
  </div>
  <div class="tsk-sbc gold">
    <div class="tsk-sbv">${rDia ? '+'+rDia+'💎' : rXp ? '+'+rXp+'⭐' : '🎁'}</div>
    <div class="tsk-sbl">БОНУС</div>
  </div>
</div>
${claimBtn}
<div class="tsk-reset">🔄 Пропуск дня сбрасывает стрик!</div>`;
};

/* ── Компактный стрик-блок (всегда виден сверху) ── */
window.TasksHTML_StreakTop = function(streak) {
  if (!streak) return '';
  const _e = window._TasksHTML_esc;
  const sd      = parseInt(streak.streak_day || 0);
  const claimed = new Set(streak.days_claimed || []);
  const rewards = streak.reward_set || [];
  const ws      = (streak.week_set || 0) % 4;
  const setName = ['A','B','C','D'][ws];
  const todayClaimed = claimed.has(sd);
  const canClaim = sd > 0 && !todayClaimed;
  const todayReward = rewards[sd - 1] || {};
  const rGold = todayReward.gold || 0;
  const rDia  = todayReward.diamonds || 0;
  const rXp   = todayReward.xp || 0;
  const rewardStr = [rGold&&`+${rGold}💰`, rDia&&`+${rDia}💎`, rXp&&`+${rXp}⭐`].filter(Boolean).join(' ');

  const dayNames = ['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'];
  const pillsHTML = dayNames.map((name, i) => {
    const dn = i + 1;
    const isDone = claimed.has(dn) || dn < sd;
    const isToday = dn === sd;
    const cls = isDone ? 'done' : isToday ? 'today' : '';
    const r = rewards[dn - 1] || {};
    const dayData = JSON.stringify({day:dn, gold:r.gold||0, dia:r.diamonds||0, xp:r.xp||0, item:r.item||'', isDone, isToday, wasClaimed:claimed.has(dn)});
    return `<span class="tsk-spill ${cls}" data-sday='${dayData}' style="cursor:pointer">${name}${isDone?'✓':isToday?'·':''}</span>`;
  }).join('');

  const claimBtn = canClaim
    ? `<button class="tsk-sclaim-top" data-claim-streak="${sd}">🎁 ${rewardStr}</button>`
    : todayClaimed ? `<span class="tsk-sclaim-top claimed">✅ Забрано</span>` : '';

  return `<style id="tsk-streak-top-style">
.tsk-stktop{margin:10px 12px 0;padding:11px 14px;border-radius:14px;background:linear-gradient(135deg,rgba(20,0,35,.95),rgba(5,5,18,.95));border:1px solid rgba(255,59,168,.5);box-shadow:0 0 18px rgba(255,59,168,.1);display:flex;align-items:center;gap:12px}
@keyframes tskFire2{0%,100%{transform:scale(1) rotate(-2deg)}50%{transform:scale(1.1) rotate(2deg)}}
.tsk-stk-fire{font-size:30px;filter:drop-shadow(0 0 10px #ff9933);animation:tskFire2 1.6s ease-in-out infinite;flex-shrink:0}
.tsk-stk-info{flex:1;min-width:0}
.tsk-stk-label{font-size:9px;color:#ff7acb;font-weight:700;letter-spacing:.5px}
.tsk-stk-val{font-size:20px;font-weight:800;color:#ffd166;text-shadow:0 0 10px rgba(255,209,102,.5);line-height:1.1}
.tsk-stk-desc{font-size:9px;color:#80d8ff;margin-top:1px}
.tsk-stk-pills{display:flex;gap:5px;padding:7px 12px 0;flex-wrap:wrap}
.tsk-spill{padding:3px 9px;font-size:9px;font-weight:700;border-radius:10px;background:#0a0518;border:1px solid rgba(255,209,102,.3);color:#ffe08a}
.tsk-spill.done{border-color:#3cc864;color:#80ff9c}
.tsk-spill.today{border-color:#ff3ba8;color:#ff7acb;box-shadow:0 0 6px rgba(255,59,168,.3)}
.tsk-sclaim-top{background:linear-gradient(135deg,#ff3ba8,#a01e6e);border:none;border-radius:10px;padding:6px 10px;font-size:10px;font-weight:800;color:#fff;cursor:pointer;white-space:nowrap;box-shadow:0 0 10px rgba(255,59,168,.4);flex-shrink:0}
.tsk-sclaim-top:active{transform:scale(.95)}
.tsk-sclaim-top.claimed{background:rgba(60,200,100,.15);color:#80ff9c;cursor:default;border:1px solid rgba(60,200,100,.3)}
</style>
<div class="tsk-stktop">
  <span class="tsk-stk-fire">🔥</span>
  <div class="tsk-stk-info">
    <div class="tsk-stk-label">АКТИВНЫЙ СТРИК · НАБОР ${_e(setName)}</div>
    <div class="tsk-stk-val">${sd} дней</div>
    <div class="tsk-stk-desc">Заходи каждый день — бонус растёт!</div>
  </div>
  ${claimBtn}
</div>
<div class="tsk-stk-pills">${pillsHTML}</div>`;
};

/* ── Попап при тапе на день стрика ── */
window.TasksHTML_attachStreakDayPopups = function(root) {
  if (!root) return;
  root.querySelectorAll('[data-sday]').forEach(pill => {
    pill.addEventListener('click', e => {
      e.stopPropagation();
      try {
        const d = JSON.parse(pill.dataset.sday);
        const icon = d.wasClaimed ? '✅' : d.isToday ? '🎁' : d.isDone ? '✅' : '🔒';
        const status = d.wasClaimed ? 'Уже получено'
                     : d.isToday   ? 'Сегодняшний бонус — забери!'
                     : d.isDone    ? 'День пройден'
                     :               `Откроется на день ${d.day}`;
        const parts = [];
        if (d.gold) parts.push(`+${d.gold}💰`);
        if (d.dia)  parts.push(`+${d.dia}💎`);
        if (d.xp)   parts.push(`+${d.xp}⭐`);
        if (d.item) parts.push(d.item);
        const rewardLine = parts.length ? parts.join('  ') : '—';
        window.TasksHTML_showPopup?.({
          icon,
          name: `День ${d.day} стрика`,
          desc: `${status}\n\n🎁 Награда: ${rewardLine}`,
        });
      } catch(_) {}
    });
  });
};
