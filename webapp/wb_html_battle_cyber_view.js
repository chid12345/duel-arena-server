/* ============================================================
   wb_html_battle_cyber_view.js — рендер HTML боевого экрана.
   Экспорт: window.CyberView.render(root, state) — пишет innerHTML в #wb-root.
   Биндинги — в wb_html_battle_cyber.js.
   ============================================================ */
(() => {
  const ZONES = ['HEAD','TORSO','LEGS'];
  const ZONE_NAME = { HEAD:'Голова', TORSO:'Тело', LEGS:'Ноги' };
  const fmtSec = s => s == null || s < 0 ? '—' : Math.floor(s/60) + ':' + String(s%60).padStart(2,'0');
  const fmtHp = v => (Number(v) || 0).toLocaleString('ru');
  const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;');

  function _zonesHTML(side) {
    const lbl = side === 'atk' ? '⚔ АТАКА' : '🛡 ЗАЩИТА';
    return `<div class="cy-col cy-col-${side}"><div class="cy-col-lbl">${lbl}</div>${
      ZONES.map(z => `<div class="cy-zbtn" data-side="${side}" data-zone="${z}"><img src="battle_icons/${z === 'HEAD' ? 'head' : z === 'TORSO' ? 'torso' : 'legs'}.png"><div class="cy-lbl">${ZONE_NAME[z]}</div></div>`).join('')
    }</div>`;
  }

  function _deadHTML(a) {
    return `<div class="cy-dead">
      <div class="cy-dead-t">💀 Вы пали в бою</div>
      <div class="cy-dead-sub">Используй свиток воскрешения или дождись окончания</div>
      <div class="cy-dead-row">
        <div class="cy-dead-b" data-act="res" data-t="res_30"><span class="ic">💊</span>30% HP<br><small>500 🪙</small></div>
        <div class="cy-dead-b" data-act="res" data-t="res_60"><span class="ic">💉</span>60% HP<br><small>1 500 🪙</small></div>
        <div class="cy-dead-b" data-act="res" data-t="res_100"><span class="ic">✨</span>100% HP<br><small>3 000 🪙</small></div>
      </div>
      <div class="cy-dead-tmr">⏳ До конца рейда: <span id="cy-dead-timer">${fmtSec(a.seconds_left)}</span></div>
    </div>`;
  }

  function _bottomHTML(ps) {
    return `<div class="cy-bottom">
      <div class="cy-acts">
        <div class="cy-dice" id="cy-dice" title="Автоудар"><img src="btn_autoattack.png" alt="автоудар"></div>
        <div class="cy-apply" id="cy-apply"><div class="cy-apply-text" id="cy-apply-text">⚔ Совершить ход</div></div>
      </div>
      <div class="cy-lower">
        <div class="cy-ult-row">
          <div class="cy-ult-lbl">⚡ УЛЬТА</div>
          <div class="cy-ult-track"><div class="cy-ult-fill" id="cy-ult-fill"></div></div>
        </div>
        <div class="cy-php-row">
          <div class="cy-php-ic">❤</div>
          <div class="cy-php-track"><div class="cy-php-fill" id="cy-pl-bar" style="width:${ps?.max_hp > 0 ? Math.round(ps.current_hp/ps.max_hp*100) : 100}%"></div></div>
          <div class="cy-php-nums" id="cy-pl-hp">${ps?.current_hp || 0} / ${ps?.max_hp || 0}</div>
        </div>
      </div>
    </div>`;
  }

  function render(root, s) {
    if (!s || !s.active) { root.innerHTML = ''; return; }
    const a = s.active, ps = s.player_state;

    if ((a.current_hp || 0) <= 0) {
      root.innerHTML = `<div class="cy-victory"><div class="cy-victory-em">🏆</div><div class="cy-victory-t">ПОБЕДА</div><div class="cy-victory-s">Расчёт наград...</div></div>`;
      return;
    }

    // Нормализуем классы — убираем bt-* и старый wbz-fill, ставим cy + новый bt-{type}
    root.className = (root.className || '').split(/\s+/).filter(c => !c.startsWith('bt-') && c !== 'cy' && c !== 'wbz-fill').join(' ');
    root.classList.add('cy');
    const bt = (a.boss_type || 'lich').replace(/[^a-z]/g,'') || 'lich';
    root.classList.add('bt-' + bt);

    const pct = a.max_hp > 0 ? Math.round(a.current_hp / a.max_hp * 100) : 0;
    const phase = pct > 50 ? 'ФАЗА 1' : pct > 20 ? 'ФАЗА 2' : 'ФИНАЛ ☠';
    const isDead = !!ps?.is_dead;
    const sprite = a.boss_sprite || ('boss_' + bt + '.png');

    root.innerHTML = `
      <div class="cy-hdr">
        <div class="cy-hdr-row">
          <div class="cy-back" data-act="back">‹</div>
          <div class="cy-title-wrap">
            <div class="cy-title">${esc(a.boss_emoji || '⚡')} ${esc(a.boss_name || 'BOSS')}</div>
            <div class="cy-title-sub">BOSS RAID · ${esc(a.boss_type_label || 'РЕЙД АКТИВЕН')}</div>
          </div>
          <div class="cy-phase">${phase}</div>
          <div class="cy-timer"><div class="cy-timer-dot"></div><div class="cy-timer-val" id="cy-bl-timer">${fmtSec(a.seconds_left)}</div></div>
        </div>
        <div class="cy-bhp">
          <div class="cy-bhp-lbl">HP</div>
          <div class="cy-bhp-track">
            <div class="cy-bhp-fill" id="cy-boss-bar" style="width:${pct}%"></div>
            <div class="cy-bhp-segs">${'<i></i>'.repeat(12)}</div>
          </div>
          <div class="cy-bhp-nums" id="cy-boss-nums">${fmtHp(a.current_hp)} / ${fmtHp(a.max_hp)} · ${pct}%</div>
        </div>
        <div class="cy-hdr-bottom">
          <div class="cy-clog" id="cy-clog" data-act="clog" title="Полная история раундов">
            <div class="cy-clog-empty" id="cy-clog-empty">— РАУНД ЕЩЁ НЕ СЫГРАН —</div>
            <div class="cy-clog-row" id="cy-clog-p2" style="display:none">
              <span class="cy-clog-tag p2">P2</span>
              <span class="cy-clog-zone atk" id="cy-p2-atk">—</span>
              <span class="cy-clog-res" id="cy-p2-atk-r">—</span>
            </div>
            <div class="cy-clog-row" id="cy-clog-p1" style="display:none">
              <span class="cy-clog-tag p1">P1</span>
              <span class="cy-clog-zone atk" id="cy-p1-atk">—</span>
              <span class="cy-clog-res" id="cy-p1-atk-r">—</span>
              <span class="cy-clog-arr">·</span>
              <span class="cy-clog-zone def" id="cy-p1-def">—</span>
              <span class="cy-clog-res" id="cy-p1-def-r">—</span>
            </div>
          </div>
          <div class="cy-auto" id="cy-auto" title="Автобой (премиум)"><img src="btn_auto.png" alt="АВТО"></div>
        </div>
      </div>
      <div class="cy-arena" id="cy-arena">
        <img class="cy-boss" id="cy-boss" src="bosses/${esc(sprite)}?v=a10" onerror="this.style.display='none'">
        ${ps && !isDead ? _zonesHTML('atk') + _zonesHTML('def') : ''}
      </div>
      ${isDead
        ? _deadHTML(a)
        : (ps
            ? _bottomHTML(ps)
            : `<div class="cy-bottom"><div class="cy-acts"><div class="cy-apply ready" data-act="enter"><div class="cy-apply-text">⚔ ВОЙТИ В БОЙ</div></div></div></div>`)}`;

    if (window.WBHtml?._autoOn) root.querySelector('#cy-auto')?.classList.add('on');
  }

  window.CyberView = { render, ZONES, ZONE_NAME, fmtSec };
})();
