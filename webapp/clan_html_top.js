/* ============================================================
   Clan HTML Top — топ кланов (киберпанк)
   Ранжированный список с медалями + глазиком для превью
   ============================================================ */
(() => {
const CSS = `
.ct-row{margin:0 12px 8px;padding:10px 10px 10px 6px;border-radius:12px;display:flex;align-items:center;gap:8px;background:linear-gradient(90deg,rgba(15,5,30,.88),rgba(5,5,15,.88));border:1px solid rgba(0,240,255,.25);cursor:pointer;user-select:none;transition:transform .1s}
.ct-row:active{transform:scale(.99)}
.ct-row.top3{border-color:#ffd166;box-shadow:0 0 12px rgba(255,209,102,.35);background:linear-gradient(90deg,rgba(40,25,5,.85),rgba(15,10,5,.88))}
.ct-rank{width:34px;text-align:center;font-size:18px;font-weight:800;color:#ffd166;text-shadow:0 0 8px currentColor;flex-shrink:0}
.ct-rank.num{font-size:14px;color:#80c8ff;text-shadow:none}
.ct-em{width:46px;height:46px;display:grid;place-items:center;flex-shrink:0;background:none;border:none;box-shadow:none}
.ct-em img{width:46px;height:46px;object-fit:contain;filter:drop-shadow(0 0 9px rgba(0,240,255,.6)) drop-shadow(0 0 3px rgba(0,240,255,.4))}
.ct-body{flex:1;min-width:0}
.ct-tagrow{display:flex;gap:5px;align-items:center;font-size:11px;font-weight:700}
.ct-tag{color:#00f0ff;text-shadow:0 0 5px currentColor}
.ct-lvl{color:#ff3ba8;font-size:10px}
.ct-nm{font-size:13px;font-weight:800;color:#fff;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ct-st{font-size:10px;color:#80c8ff;margin-top:2px}
.ct-st .w{color:#ffd166;font-weight:700}
.ct-eye{flex-shrink:0;width:32px;height:28px;border-radius:8px;display:grid;place-items:center;font-size:13px;color:#80d8ff;background:rgba(10,5,25,.9);border:1px solid rgba(0,240,255,.4);box-shadow:0 0 6px rgba(0,240,255,.2)}
.ct-hdr-card{margin:6px 12px 10px;padding:10px 12px;border-radius:12px;display:flex;justify-content:space-around;align-items:center;background:linear-gradient(90deg,rgba(30,20,0,.8),rgba(15,5,30,.8));border:1px solid #ffd166;box-shadow:0 0 12px rgba(255,209,102,.25)}
.ct-hc-c{text-align:center}
.ct-hc-v{font-size:16px;font-weight:800;color:#ffd166;text-shadow:0 0 6px currentColor}
.ct-hc-l{font-size:9px;color:#ffa8d8;letter-spacing:.4px;margin-top:1px}
`;
function _injectCSS(){ if(document.getElementById('ct-style'))return; const s=document.createElement('style'); s.id='ct-style'; s.textContent=CSS; document.head.appendChild(s); }
const EM_IMG = { light: 'clan_em_light.png', dark: 'clan_em_dark.png', neutral: 'clan_em_neutral.png' };

function _row(c, i) {
  const trunc = window.ClanHTML._trunc, esc = window.ClanHTML._esc;
  const img = EM_IMG[c.emblem] || EM_IMG.neutral;
  const top3 = i < 3;
  const rank = i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`;
  return `<div class="ct-row${top3?' top3':''}" data-act="preview" data-id="${c.id}">
    <div class="ct-rank${top3?'':' num'}">${rank}</div>
    <div class="ct-em"><img src="${img}" alt=""></div>
    <div class="ct-body">
      <div class="ct-tagrow"><span class="ct-tag">[${esc(c.tag||'')}]</span> <span class="ct-lvl">Ур.${c.level|0}</span></div>
      <div class="ct-nm">${esc(trunc(c.name,16))}</div>
      <div class="ct-st">👥 ${c.member_count}/20 · <span class="w">🏆 ${c.wins|0}</span> · 🟢 ${c.online_count||0}</div>
    </div>
    <div class="ct-eye">👁</div>
  </div>`;
}

async function openTop(scene) {
  _injectCSS();
  window.ClanHTML._shell(scene, '🏆', 'ТОП КЛАНОВ', '<div class="cl-empty"><div class="em">⏳</div>Загрузка...</div>', 'Лучшие по победам и уровню');
  let d;
  try { d = await get('/api/clan/top'); } catch(_) { return window.ClanHTML._setBody('<div class="cl-err">❌ Нет соединения</div>'); }
  const clans = d?.clans || [];
  if (!clans.length) return window.ClanHTML._setBody('<div class="cl-empty"><div class="em">😔</div>Кланов пока нет<br><span style="font-size:10px;opacity:.7">Создай первый клан и возглавь топ</span></div>');
  const totalMembers = clans.reduce((a, c) => a + (c.member_count|0), 0);
  const totalWins    = clans.reduce((a, c) => a + (c.wins|0), 0);
  const hdr = `<div class="ct-hdr-card">
    <div class="ct-hc-c"><div class="ct-hc-v">${clans.length}</div><div class="ct-hc-l">КЛАНОВ</div></div>
    <div class="ct-hc-c"><div class="ct-hc-v">${totalMembers}</div><div class="ct-hc-l">БОЙЦОВ</div></div>
    <div class="ct-hc-c"><div class="ct-hc-v">${totalWins}</div><div class="ct-hc-l">ПОБЕД</div></div>
  </div>`;
  window.ClanHTML._setBody(hdr + clans.map(_row).join(''));
  document.getElementById('cl-root')?.addEventListener('click', e => {
    const el = e.target.closest('[data-act="preview"]');
    if (!el) return;
    try { tg?.HapticFeedback?.impactOccurred('light'); } catch(_) {}
    window.ClanHTML.close();
    scene.scene.restart({ sub: 'preview', clanId: +el.dataset.id });
  });
}

Object.assign(window.ClanHTML = window.ClanHTML || {}, { openTop });
})();
