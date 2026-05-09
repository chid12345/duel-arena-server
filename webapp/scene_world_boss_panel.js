/* scene_world_boss_panel.js — live-панель участников рейда (HTML overlay).
   Боковая полупрозрачная полоска справа: ник, last_action, HP, урон.
   Тап на строку → карточка игрока (bottom sheet). */

Object.assign(WorldBossScene.prototype, {

  _buildRaidPanel() {
    if (this._raidPanelEl) return;
    const el = document.createElement('div');
    el.id = 'wb-raid-panel';
    el.innerHTML =
      '<div class="wbp-hdr">' +
        '<span class="wbp-title">РЕЙД</span>' +
        '<span class="wbp-live"><span class="wbp-dot"></span>LIVE</span>' +
        '<button class="wbp-tog" aria-label="свернуть">◀</button>' +
      '</div>' +
      '<div class="wbp-list"></div>';
    document.body.appendChild(el);
    this._raidPanelEl = el;
    this._raidCollapsed = false;
    this._raidPrevHits = {};
    el.querySelector('.wbp-tog').addEventListener('click', e => {
      e.stopPropagation();
      this._raidCollapsed = !this._raidCollapsed;
      el.classList.toggle('collapsed', this._raidCollapsed);
      el.querySelector('.wbp-tog').textContent = this._raidCollapsed ? '▶' : '◀';
    });
    _wbpInjectCSS();
  },

  _updateRaidPanel(participants) {
    if (!participants?.length) return;
    if (!this._raidPanelEl) this._buildRaidPanel();
    this._raidLastP = participants;

    const prev = this._raidPrevHits;
    const next = {};
    const flash = new Set();
    for (const p of participants) {
      const ago = p.last_hit_ago ?? 999;
      if (!p.is_dead && (prev[p.user_id] === undefined || prev[p.user_id] >= 3) && ago < 3)
        flash.add(p.user_id);
      next[p.user_id] = ago;
    }
    this._raidPrevHits = next;

    const totalDmg = participants.reduce((s, p) => s + (p.damage || 0), 0) || 1;
    const RANK_C = ['#ffd700','#aaddff','#ff8833'];

    const rows = participants.map((p, i) => {
      const hpPct = p.max_hp > 0 ? Math.round(p.hp / p.max_hp * 100) : 0;
      const hpC = p.is_dead ? '#440011' : hpPct > 50 ? '#00cc55' : hpPct > 25 ? '#ffaa00' : '#ff3344';
      const bC  = RANK_C[i] || 'rgba(255,255,255,.1)';
      const act = p.is_dead ? '💀' : p.last_action === 'crit' ? '✨' : '⚔️';
      const dmgTxt = p.damage >= 1000 ? (p.damage/1000).toFixed(1)+'k' : String(p.damage);
      const cls   = 'wbp-row' + (p.is_dead ? ' dead' : '') + (flash.has(p.user_id) ? ' flash' : '');
      return '<div class="' + cls + '" style="border-left-color:' + bC + '" data-i="' + i + '">' +
        '<div class="wbp-r1">' +
          '<span class="wbp-rk" style="color:' + (RANK_C[i]||'#445566') + '">#' + (i+1) + '</span>' +
          '<span class="wbp-act">' + act + '</span>' +
          '<span class="wbp-nk">' + _wbpEsc(p.name) + '</span>' +
          '<span class="wbp-dm">' + dmgTxt + '</span>' +
        '</div>' +
        '<div class="wbp-bar"><div class="wbp-fill" style="width:' + hpPct + '%;background:' + hpC + '"></div></div>' +
      '</div>';
    }).join('');

    const list = this._raidPanelEl.querySelector('.wbp-list');
    list.innerHTML = rows;
    list.querySelectorAll('[data-i]').forEach(r => {
      r.addEventListener('click', () => this._openRaidCard(participants[+r.dataset.i], totalDmg));
    });
  },

  _openRaidCard(p, totalDmg) {
    document.getElementById('wbp-card-bg')?.remove();
    const pct = Math.round((p.damage || 0) / (totalDmg || 1) * 100);
    const hpPct = p.max_hp > 0 ? Math.round(p.hp / p.max_hp * 100) : 0;
    const hpC = p.is_dead ? '#ff3344' : hpPct > 50 ? '#00cc55' : hpPct > 25 ? '#ffaa00' : '#ff3344';
    const icons = {warrior:'⚔️',mage:'🔮',archer:'🏹',paladin:'🛡️',rogue:'🗡️'};
    const ico  = icons[p.warrior_type] || '⚔️';
    const statusLine = p.is_dead
      ? '<span style="color:#ff4466">💀 Погиб в бою</span>'
      : '<span style="color:#00cc55">❤️ Жив · ' + p.hp + ' HP</span>';
    const bg = document.createElement('div');
    bg.id = 'wbp-card-bg';
    bg.innerHTML =
      '<div id="wbp-card">' +
        '<div class="wbpc-hdr">' +
          '<div class="wbpc-ico">' + ico + '</div>' +
          '<div><div class="wbpc-name">' + _wbpEsc(p.name) + '</div>' +
               '<div class="wbpc-sub">Ур. ' + p.level + ' · ' + statusLine + '</div></div>' +
        '</div>' +
        '<div class="wbpc-hp-wrap"><div class="wbpc-hp-fill" style="width:' + hpPct + '%;background:' + hpC + '"></div></div>' +
        '<div class="wbpc-hp-lbl">' + p.hp + ' / ' + p.max_hp + ' HP</div>' +
        '<div class="wbpc-stats">' +
          '<div class="wbpc-stat"><div class="wbpc-sl">УРОН</div><div class="wbpc-sv">' + (p.damage||0).toLocaleString() + '</div></div>' +
          '<div class="wbpc-stat"><div class="wbpc-sl">ВКЛАД</div><div class="wbpc-sv">' + pct + '%</div></div>' +
          '<div class="wbpc-stat"><div class="wbpc-sl">ПОСЛЕДНЕЕ</div><div class="wbpc-sv" style="font-size:18px">' + (p.is_dead?'💀':p.last_action==='crit'?'✨ КРИТ':'⚔️ УДАР') + '</div></div>' +
        '</div>' +
        '<button class="wbpc-close">Закрыть</button>' +
      '</div>';
    document.body.appendChild(bg);
    bg.addEventListener('click', e => { if (e.target === bg) bg.remove(); });
    bg.querySelector('.wbpc-close').addEventListener('click', () => bg.remove());
  },

  _destroyRaidPanel() {
    this._raidPanelEl?.remove(); this._raidPanelEl = null;
    document.getElementById('wbp-card-bg')?.remove();
    this._raidPrevHits = {}; this._raidLastP = null;
  },

});

function _wbpEsc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function _wbpInjectCSS() {
  if (document.getElementById('wbp-css')) return;
  const s = document.createElement('style');
  s.id = 'wbp-css';
  s.textContent = `
#wb-raid-panel{position:fixed;top:78px;right:0;width:102px;z-index:9600;
  background:rgba(5,2,18,.78);border-left:1px solid rgba(0,229,255,.18);
  border-radius:10px 0 0 10px;backdrop-filter:blur(10px);overflow:hidden;
  transition:width .2s;font-family:'Segoe UI',sans-serif}
#wb-raid-panel.collapsed{width:26px}
#wb-raid-panel.collapsed .wbp-list{display:none}
#wb-raid-panel.collapsed .wbp-title,#wb-raid-panel.collapsed .wbp-live{display:none}
.wbp-hdr{display:flex;align-items:center;justify-content:space-between;
  padding:4px 5px;border-bottom:1px solid rgba(0,229,255,.1)}
.wbp-title{font-size:7px;color:#00e5ff;letter-spacing:1.5px;font-weight:700}
.wbp-live{display:flex;align-items:center;gap:2px;font-size:7px;color:#00ff88}
.wbp-dot{width:4px;height:4px;background:#00ff88;border-radius:50%;
  box-shadow:0 0 4px #00ff88;animation:wbpPulse 1.4s ease infinite}
@keyframes wbpPulse{0%,100%{opacity:1}50%{opacity:.3}}
.wbp-tog{background:none;border:none;color:#00e5ff;font-size:9px;cursor:pointer;padding:0;opacity:.6}
.wbp-list{max-height:400px;overflow-y:auto;scrollbar-width:none}
.wbp-list::-webkit-scrollbar{display:none}
.wbp-row{padding:4px 5px 3px;border-left:2px solid transparent;cursor:pointer;
  transition:background .12s}
.wbp-row:hover{background:rgba(0,229,255,.07)}
.wbp-row.dead{opacity:.38}
.wbp-row.flash{animation:wbpFlash .55s ease}
@keyframes wbpFlash{0%{background:rgba(0,229,255,.28)}100%{background:transparent}}
.wbp-r1{display:flex;align-items:center;gap:2px}
.wbp-rk{font-size:8px;font-weight:700;width:12px}
.wbp-act{font-size:9px;width:13px;text-align:center}
.wbp-nk{font-size:8px;color:#cce4ff;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:42px}
.wbp-dm{font-size:8px;color:#778899;white-space:nowrap}
.wbp-bar{height:2px;background:rgba(255,255,255,.07);border-radius:1px;overflow:hidden;margin-top:2px}
.wbp-fill{height:100%;border-radius:1px;transition:width .5s}
#wbp-card-bg{position:fixed;inset:0;z-index:9700;background:rgba(0,0,0,.72);
  backdrop-filter:blur(5px);display:flex;align-items:flex-end;justify-content:center}
#wbp-card{background:linear-gradient(180deg,#0e0028 0%,#060014 100%);
  border:1px solid rgba(0,229,255,.22);border-radius:18px 18px 0 0;
  width:100%;max-width:390px;padding:18px 18px 30px;
  animation:wbpUp .22s ease}
@keyframes wbpUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
.wbpc-hdr{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.wbpc-ico{font-size:30px;width:46px;height:46px;display:flex;align-items:center;
  justify-content:center;background:rgba(0,229,255,.07);
  border:1px solid rgba(0,229,255,.2);border-radius:12px}
.wbpc-name{font-size:15px;font-weight:700;color:#fff}
.wbpc-sub{font-size:11px;color:#6688aa;margin-top:3px}
.wbpc-hp-wrap{background:rgba(255,255,255,.08);border-radius:5px;height:7px;overflow:hidden;margin-bottom:4px}
.wbpc-hp-fill{height:100%;border-radius:5px;transition:width .4s}
.wbpc-hp-lbl{font-size:9px;color:#445566;text-align:right;margin-bottom:12px}
.wbpc-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.wbpc-stat{background:rgba(255,255,255,.04);border-radius:9px;padding:8px 6px;text-align:center}
.wbpc-sl{font-size:8px;color:#445577;letter-spacing:1px;margin-bottom:4px}
.wbpc-sv{font-size:15px;font-weight:700;color:#fff}
.wbpc-close{width:100%;padding:11px;margin-top:14px;background:none;
  border:1px solid rgba(0,229,255,.2);border-radius:10px;
  color:#00e5ff;font-size:13px;cursor:pointer;letter-spacing:1px}
  `;
  document.head.appendChild(s);
}
