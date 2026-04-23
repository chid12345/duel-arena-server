/* ============================================================
   Clan HTML Search — поиск клана по тегу/имени (киберпанк)
   Поле ввода + кнопка + список результатов (карточки кланов)
   ============================================================ */
(() => {
const CSS = `
.cs-srow{display:flex;gap:8px;padding:10px 12px 6px}
.cs-sinp{flex:1;height:40px;padding:0 14px;font-size:13px;font-family:inherit;color:#e6f7ff;background:rgba(10,5,25,.85);border:1px solid #00f0ff;border-radius:12px;box-shadow:0 0 10px rgba(0,240,255,.25),inset 0 0 8px rgba(0,240,255,.08);outline:none;letter-spacing:.3px}
.cs-sinp::placeholder{color:rgba(128,200,255,.5)}
.cs-sinp:focus{border-color:#ff3ba8;box-shadow:0 0 12px rgba(255,59,168,.45),inset 0 0 8px rgba(255,59,168,.1)}
.cs-sbtn{width:78px;height:40px;border-radius:12px;display:grid;place-items:center;font-size:12px;font-weight:800;cursor:pointer;user-select:none;background:linear-gradient(135deg,#ff3ba8,#a01e6e);color:#fff;border:1px solid #ff3ba8;box-shadow:0 0 14px rgba(255,59,168,.5);text-shadow:0 0 6px rgba(0,0,0,.3);transition:transform .1s}
.cs-sbtn:active{transform:scale(.94)}
.cs-clan{margin:0 12px 8px;padding:10px 12px;border-radius:12px;display:flex;align-items:center;gap:10px;background:linear-gradient(90deg,rgba(15,5,30,.88),rgba(5,5,15,.88));border:1px solid rgba(0,240,255,.3);cursor:pointer;user-select:none;transition:transform .1s}
.cs-clan:active{transform:scale(.99)}
.cs-clan.top3{border-color:#ffd166;box-shadow:0 0 12px rgba(255,209,102,.3)}
.cs-em{width:46px;height:46px;border-radius:12px;display:grid;place-items:center;flex-shrink:0;background:linear-gradient(135deg,#1a0433,#0a0222);border:1px solid #00f0ff;box-shadow:0 0 10px rgba(0,240,255,.4);overflow:hidden}
.cs-em img{width:38px;height:38px;object-fit:contain;filter:drop-shadow(0 0 6px rgba(0,240,255,.6))}
.cs-cbody{flex:1;min-width:0}
.cs-ctag{font-size:11px;font-weight:800;color:#00f0ff;text-shadow:0 0 6px currentColor}
.cs-cnm{font-size:13px;font-weight:800;color:#fff;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cs-cst{font-size:10px;color:#80c8ff;margin-top:3px}
.cs-cst .w{color:#ffd166}
.cs-cst .o{color:#9cffa8}
.cs-eye{flex-shrink:0;width:34px;height:30px;border-radius:9px;display:grid;place-items:center;font-size:14px;color:#80d8ff;background:rgba(10,5,25,.9);border:1px solid rgba(0,240,255,.4);box-shadow:0 0 6px rgba(0,240,255,.25)}
.cs-mlabel{font-size:10px;font-weight:700;padding:6px 16px 4px;color:#00f0ff;letter-spacing:.6px;opacity:.9}
`;
function _injectCSS(){ if(document.getElementById('cs-style'))return; const s=document.createElement('style'); s.id='cs-style'; s.textContent=CSS; document.head.appendChild(s); }
const EM_IMG = { light: 'clan_em_light.png', dark: 'clan_em_dark.png', neutral: 'clan_em_neutral.png' };

function _row(c, i) {
  const trunc = window.ClanHTML._trunc, esc = window.ClanHTML._esc;
  const img = EM_IMG[c.emblem] || EM_IMG.neutral;
  const top3 = i < 3;
  return `<div class="cs-clan${top3?' top3':''}" data-act="preview" data-id="${c.id}">
    <div class="cs-em"><img src="${img}" alt=""></div>
    <div class="cs-cbody">
      <div class="cs-ctag">[${esc(c.tag||'')}] <span style="color:#ffd166">Ур.${c.level|0}</span></div>
      <div class="cs-cnm">${esc(trunc(c.name,18))}</div>
      <div class="cs-cst">👥 ${c.member_count}/20 · <span class="w">🏆 ${c.wins|0}</span> · <span class="o">🟢 ${c.online_count||0}</span></div>
    </div>
    <div class="cs-eye">👁</div>
  </div>`;
}

function _setResults(html) { const b = document.getElementById('cs-body'); if (b) b.innerHTML = html; }

async function _doSearch(q) {
  _setResults('<div class="cl-empty"><div class="em">⏳</div>Ищем...</div>');
  try {
    const d = await (q.trim() ? get('/api/clan/search', { q: q.trim() }) : get('/api/clan/top'));
    const list = d?.clans || [];
    if (!list.length) return _setResults('<div class="cl-empty"><div class="em">🔎</div>Ничего не найдено<br><span style="font-size:10px;opacity:.7">Попробуйте другой тег или имя</span></div>');
    _setResults(`<div class="cs-mlabel">НАЙДЕНО: ${list.length}</div>` + list.map(_row).join(''));
  } catch(_) { _setResults('<div class="cl-err">❌ Нет соединения</div>'); }
}

function openSearch(scene) {
  _injectCSS();
  const body = `
    <div class="cs-srow">
      <input class="cs-sinp" id="cs-q" type="text" placeholder="Тег или имя (ЖК, Железный...)" maxlength="30">
      <div class="cs-sbtn" data-act="go">Найти</div>
    </div>
    <div id="cs-body"></div>`;
  window.ClanHTML._shell(scene, '🔍', 'ПОИСК КЛАНА', body, 'Поиск по тегу или названию');
  const inp = document.getElementById('cs-q');
  document.getElementById('cl-root')?.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    try { tg?.HapticFeedback?.impactOccurred('light'); } catch(_) {}
    if (act === 'go')      { _doSearch(inp?.value || ''); }
    if (act === 'preview') { window.ClanHTML.close(); scene.scene.restart({ sub: 'preview', clanId: +el.dataset.id }); }
  });
  inp?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); _doSearch(inp.value); } });
  _doSearch('');
}

Object.assign(window.ClanHTML = window.ClanHTML || {}, { openSearch });
})();
