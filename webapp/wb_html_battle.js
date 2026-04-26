/* wb_html_battle.js — киберпанк-экран боя WB. CSS → wb_html_battle_css.js */
(() => {
  function _fmtSec(s) {
    if (s == null || s < 0) return '—';
    return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  }
  function _esc(v) { return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

  function _renderBattle(root, s) {
    window.WBHtml.resetBattleLogic?.();
    try { Object.keys(sessionStorage).filter(k=>k.startsWith('wb_bought_')).forEach(k=>sessionStorage.removeItem(k)); } catch(_) {}
    window.WBBattleCSS?.inject();
    if (s.active && (s.active.current_hp||0) <= 0) { root.innerHTML = `<div class="wb-victwait"><div class="wb-victwait-em">🏆</div><div class="wb-victwait-t">ПОБЕДА!</div><div class="wb-victwait-s">Ожидание расчёта наград...</div></div>`; return; }
    const a = s.active, ps = s.player_state;
    const pct  = a.max_hp > 0 ? Math.round(a.current_hp / a.max_hp * 100) : 0;
    const ppct = ps?.max_hp > 0 ? Math.round(ps.current_hp / ps.max_hp * 100) : 85;
    const rcnt = Math.max(s.registrants_count || 0, ps ? 1 : 0);
    const top3 = (s.top || []).slice(0, 3);
    const isDead = ps?.is_dead;
    const phase = pct > 50 ? 'ФАЗА 1' : pct > 20 ? 'ФАЗА 2 🔥' : 'ФИНАЛ ☠️';

    // Ticker entries from top players
    const tickItems = top3.map(t =>
      `<span>⚔ <span class="wb-tn">${_esc(t.name||'?')}</span> нанёс <span class="wb-td">${(t.damage||0).toLocaleString('ru')}</span></span>`
    ).join('<span style="color:rgba(255,255,255,.1)">◆</span>');
    const tickContent = tickItems || '<span>⚔ Рейд активен — наноси урон боссу!</span>';

    const ghosts = top3.map((t, i) => {
      const pos = [
        'left:12%;bottom:55%', 'left:72%;bottom:60%', 'left:35%;bottom:75%'
      ][i];
      return `<div class="wb-ghost" style="${pos};animation-delay:${i*1.3}s">${['⚔️','🛡️','🧙'][i]}</div>`;
    }).join('');

    const deadHTML = `
      <div class="wb-dead">
        <div class="wb-dead-t">💀 Вы пали в бою</div>
        <div style="font-size:10px;color:#667;margin-bottom:4px">Используй свиток воскрешения</div>
        <div class="wb-res-row">
          <div class="wb-res-b" data-act="res" data-t="res_30"><span class="ri">💊</span>30% HP<br><small style="color:#666">500 🔥</small></div>
          <div class="wb-res-b" data-act="res" data-t="res_60"><span class="ri">💉</span>60% HP<br><small style="color:#666">40 💠</small></div>
          <div class="wb-res-b" data-act="res" data-t="res_100"><span class="ri">✨</span>100% HP<br><small style="color:#666">80 💠</small></div>
        </div>
        <div style="margin-top:8px;cursor:pointer;font-size:10px;color:#556;padding:7px;border:1px solid rgba(255,255,255,.07);border-radius:8px;" data-act="back">🚪 Покинуть бой</div>
      </div>`;

    const fmtHp = v => v >= 1000 ? Math.round(v/1000)+'K' : String(v||0);
    root.innerHTML = `
<div class="wb-bhdr2">
  <div class="wb-bhdr2-top">
    <div class="wb-bhdr2-l">
      <div class="wb-back2" data-act="back">←</div>
      <div class="wb-bhdr2-title">⚡ BOSS RAID</div>
    </div>
    <div class="wb-bhdr2-r">
      <div class="wb-phase">${phase}</div>
      <div class="wb-btimer2"><div class="wb-tdot"></div><div class="wb-tval" id="wb-bl-timer">${_fmtSec(a.seconds_left)}</div></div>
    </div>
  </div>
  <div class="wb-hp2-sec">
    <div class="wb-hp2-lbl">HP</div>
    <div class="wb-hp2-track"><div class="wb-hp2-fill" id="wb-boss-bar" style="width:${pct}%"></div><div class="wb-hp2-segs">${'<i></i>'.repeat(24)}</div></div>
    <div class="wb-hp2-nums" id="wb-boss-nums">${fmtHp(a.current_hp)} / ${fmtHp(a.max_hp)}</div>
  </div>
</div>
<div class="wb-ticker"><div class="wb-ticker-in">${tickContent}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${tickContent}</div></div>
<div class="wb-boss-zone" id="wb-boss-zone" data-act="hit">
  <div class="wb-rage2" id="wb-rage2"${pct<50?' class="wb-rage2 on"':''}></div>
  ${ghosts}
  ${[['5%','38%','×',0.4,4.2],['87%','27%','⚡',1.2,3.8],['18%','68%','🔥',2.1,4.6],['78%','62%','💧',0.9,3.5],['55%','16%','◈',1.7,4.4],['32%','78%','✦',2.6,3.9]].map(([l,t,e,d,du])=>`<div class="wb-ghost" style="left:${l};top:${t};animation-delay:${d}s;animation-duration:${du}s">${e}</div>`).join('')}
  <img class="wb-bimg2" id="wb-bimg" src="bosses/${_esc(a.boss_sprite||'boss_lich.png')}"
    data-glow="${_esc(a.boss_glow||'#9b30ff')}"
    onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<div class=\\'wb-bem2\\' id=\\'wb-bem\\'>${_esc(a.boss_emoji||'🐉')}</div>')"/>
  <div class="wb-wp" style="top:22%;left:52%" data-act="hit"></div>
  <div class="wb-wp" style="top:40%;left:63%" data-act="hit"></div>
  <div class="wb-wp" style="top:55%;left:38%" data-act="hit"></div>
  <div class="wb-tap-hint">⚡ ТАП — УДАР ⚡</div>
</div>
${isDead ? deadHTML : (ps ? `<div class="wb-plhp"><span class="wb-plhp-i">❤️</span><div class="wb-plhp-tr"><div class="wb-plhp-f" id="wb-pl-bar" style="width:${ppct}%"></div></div><span class="wb-plhp-v" id="wb-pl-hp">${ps.current_hp||0}/${ps.max_hp||100}</span></div>` : '')}
<div class="wb-ultra">
  <div class="wb-ultra-lbl">УЛЬТА</div>
  <div class="wb-ultra-track"><div class="wb-ultra-fill" id="wb-ultra-fill" style="width:0%"></div></div>
  <div class="wb-ultra-btn" id="wb-ultra-btn">УДАР</div>
</div>
<div class="wb-skills">
  <div class="wb-skill atk" data-act="skill-info" data-sk="atk">
    <div class="ws-icon">⚔️</div><div class="ws-name">АТАКА</div>
    <div class="wb-cd-ov"><div class="wb-cd-num" id="wb-cd-atk">—</div></div>
  </div>
  <div class="wb-skill shld" data-act="skill-info" data-sk="shld">
    <div class="ws-icon">🛡️</div><div class="ws-name">ЩИТ</div>
    <div class="wb-cd-ov"><div class="wb-cd-num">—</div></div>
  </div>
  <div class="wb-skill ult" data-act="skill-info" data-sk="ult">
    <div class="ws-icon">💥</div><div class="ws-name">УЛЬТА</div>
    <div class="wb-cd-ov"><div class="wb-cd-num">—</div></div>
  </div>
  <div class="wb-skill auto" data-act="skill-info" data-sk="auto">
    <div class="ws-icon">🤖</div><div class="ws-name">АВТО</div>
    <div class="wb-cd-ov" style="opacity:0"></div>
  </div>
</div>
<div class="wb-pcard-ov" id="wb-pcov">
  <div class="wb-pcard" id="wb-pc">
    <div class="wb-pc-hdl"></div>
    <div class="wb-pc-hdr">
      <div class="wb-pc-av" id="wb-pc-av">🧙</div>
      <div><div class="wb-pc-name" id="wb-pc-n">—</div><div class="wb-pc-tag" id="wb-pc-t">—</div><div class="wb-pc-cl" id="wb-pc-c">—</div></div>
      <div class="wb-pc-x" id="wb-pc-x">✕</div>
    </div>
    <div class="wb-pc-stats">
      <div class="wb-pc-st"><div class="sv" id="wb-pc-atk">—</div><div class="sl">УРОН</div></div>
      <div class="wb-pc-st"><div class="sv" id="wb-pc-dmg">—</div><div class="sl">НАНЕСЕНО</div></div>
      <div class="wb-pc-st"><div class="sv" id="wb-pc-con">—</div><div class="sl">ВКЛАД</div></div>
    </div>
    <div class="wb-pc-hps">
      <div class="wb-pc-hpr"><div class="wb-pc-hpl">★ HP В БОЮ</div><div class="wb-pc-hpv" id="wb-pc-hpv">—</div></div>
      <div class="wb-pc-hpt"><div class="wb-pc-hpf" id="wb-pc-hpf" style="width:80%"></div></div>
    </div>
    <div class="wb-pc-raid">
      <div class="wb-pc-rr"><div class="wb-pc-ri">⚔️</div><div class="wb-pc-rl">Урон по боссу</div><div class="wb-pc-rv d" id="wb-pc-rdmg">—</div></div>
      <div class="wb-pc-rr"><div class="wb-pc-ri">💥</div><div class="wb-pc-rl">Критов в рейде</div><div class="wb-pc-rv y" id="wb-pc-rct">—</div></div>
    </div>
  </div>
</div>`;
    _bindBattle(root, s);
    // Apply boss glow color as CSS variable for animated drop-shadow
    requestAnimationFrame(() => {
      const img = document.getElementById('wb-bimg');
      if (img) img.style.setProperty('--boss-glow', a.boss_glow || '#9b30ff');
    });
  }

  // Храним последнее состояние для root-listener (биндим только один раз).
  let _lastBattleState = null;
  function _bindBattle(root, s) {
    _lastBattleState = s;
    const sc = window.WBHtml._scene;
    (s.top || []).forEach((t, i) => {
      root.querySelectorAll('.wb-ghost')[i]?.addEventListener('click', () => _openCard(t, _lastBattleState || s));
    });
    document.getElementById('wb-pc-x')?.addEventListener('click', () =>
      document.getElementById('wb-pcov')?.classList.remove('open'));
    document.getElementById('wb-pcov')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
    });
    if (root.__wbBattleBound) return;
    root.__wbBattleBound = true;
    root.addEventListener('click', e => {
      const s = _lastBattleState || {};
      const sc = window.WBHtml._scene;  // всегда актуальная сцена
      const el = e.target.closest('[data-act]'); if (!el) return;
      window.WBHtml._lastTap = { x: e.clientX, y: e.clientY };
      const act = el.dataset.act;
      if (act === 'hit')        _onHit(root, sc);
      else if (act === 'res')   sc?._resurrect?.(el.dataset.t);
      else if (act === 'back')  { try { if (s.active?.spawn_id) localStorage.setItem('wb_left_raid', String(s.active.spawn_id)); } catch(_) {} window.WBHtml.close(); sc?.scene?.start?.('WorldBoss'); }
      else if (act === 'use-scroll') window.WBHtml._htmlScrollPicker?.(s, sc);
      else if (act === 'shield')     window.WBHtml.toast?.('🛡 Блок активирован');
      else if (act === 'ult')        window.WBHtml.toast?.('💥 Ульта не готова');
      else if (act === 'skill-info') _showSkillInfo(el.dataset.sk, sc, s);
    });
    document.getElementById('wb-ultra-btn')?.addEventListener('click', () => window.WBHtml.fireUltra?.());
  }

  function _onHit(root, sc) {
    sc?._onHit?.();
    const bimg = document.getElementById('wb-bimg') || document.getElementById('wb-bem');
    if (bimg) { bimg.classList.remove('wb-hit'); void bimg.offsetWidth; bimg.classList.add('wb-hit'); }
    const zone = document.getElementById('wb-boss-zone');
    if (zone) { zone.style.transform='scale(.98)'; setTimeout(() => zone.style.transform='', 100); }
  }

  // Запоминаем какие скиллы уже видел игрок навсегда — не показываем
  // обучающий попап после первого знакомства.
  const _SEEN_KEY = 'wb_seen_skill_';
  function _hasSeenSkill(sk) {
    try { return localStorage.getItem(_SEEN_KEY + sk) === '1'; } catch(_) { return false; }
  }
  function _markSkillSeen(sk) {
    try { localStorage.setItem(_SEEN_KEY + sk, '1'); } catch(_) {}
  }

  const _SKILL_INFO = {
    atk:  { icon:'⚔️', name:'АТАКА',  cd:'3 сек',      act:'hit',        tip:'Базовый урон',
             desc:'Наносит урон боссу. Урон зависит от характеристики «Сила» и экипировки.',
             tipTxt:'Усиль Силу → больше урона. Используй свиток «+Урон» для буста.' },
    shld: { icon:'🛡️', name:'ЩИТ',   cd:'8 сек',      act:'shield',     tip:'Защита',
             desc:'Снижает входящий урон на 30% на 2 секунды. Помогает выжить в финальных фазах.',
             tipTxt:'Используй когда у босса менее 20% HP — финальная фаза наносит x2 урон.' },
    ult:  { icon:'💥', name:'УЛЬТА',  cd:'По шкале',   act:'ult',        tip:'Суперудар',
             desc:'Мощный удар — тройной урон от обычной атаки. Шкала наполняется с каждым ударом.',
             tipTxt:'Бей чаще — шкала наполняется быстрее. Выпускай ульту на финальной фазе.' },
    auto: { icon:'🤖', name:'АВТО',   cd:'👑 Premium',   act:'auto-toggle', tip:'Автоатака',
             desc:'Только для подписчиков. Тапает за тебя обычными ударами и применяет бусты из инвентаря. Без штрафа к награде.',
             tipTxt:'QTE «10/10» и уворот от сильного удара — нажимай сам, бот их не делает.' },
  };

  function _useSkillDirect(info, sc, s) {
    const root = document.getElementById('wb-root'), W = window.WBHtml;
    if (W.isSkillOnCD?.(info.act==='hit'?'atk':info.act==='shield'?'shld':info.act==='ult'?'ult':'')) { W.toast?.('⏱ Перезарядка'); return; }
    if (info.act === 'hit') { _onHit(root, sc); W.startSkillCD?.('atk'); }
    else if (info.act === 'shield') { W.toast?.('🛡 Блок активирован'); W.startSkillCD?.('shld'); }
    else if (info.act === 'ult')   { W.fireUltSkill?.(); W.startSkillCD?.('ult'); }
    else if (info.act === 'auto-toggle') {
      // Премиум-гейт: АВТО доступен только подписчикам.
      const isPremium = !!(s?.is_premium || _lastBattleState?.is_premium);
      if (!isPremium) {
        W.toast?.('👑 АВТО доступен только подписчикам');
        try { window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('warning'); } catch(_) {}
        return;
      }
      const btn = root?.querySelector('.wb-skill.auto');
      const on = btn?.classList.toggle('auto-on');
      W.setAutoAttack?.(on);
      W.toast?.(on ? '🤖 Авто-бой включён · бусты применяются' : '🤖 Авто-бой выключен');
    }
  }

  function _showSkillInfo(sk, sc, s) {
    const info = _SKILL_INFO[sk]; if (!info) return;
    if (_hasSeenSkill(sk)) { _useSkillDirect(info, sc, s); return; }
    _markSkillSeen(sk);
    document.getElementById('wb-sinfo-ov')?.remove();
    const ov = document.createElement('div'); ov.id = 'wb-sinfo-ov'; ov.className = 'wb-sinfo-ov';
    // Особый кейс: АВТО без премиума — показываем «Купить подписку» вместо «ИСПОЛЬЗОВАТЬ».
    const isPremium = !!(s?.is_premium || _lastBattleState?.is_premium);
    const isAutoLocked = sk === 'auto' && !isPremium;
    const btnLabel = isAutoLocked ? '👑 КУПИТЬ ПОДПИСКУ' : 'ИСПОЛЬЗОВАТЬ';
    const cdLabel = isAutoLocked ? '🔒 ЗАБЛОКИРОВАНО' : `⏱ ПЕРЕЗАРЯДКА: ${info.cd}`;
    const descTxt = isAutoLocked
      ? 'АВТО — премиум-фича. С подпиской: бьёт за тебя обычными ударами, применяет бусты из инвентаря, без штрафа к награде.'
      : info.desc;
    ov.innerHTML = `<div class="wb-sinfo">
      <div class="wb-sinfo-hdl"></div>
      <div class="wb-sinfo-ic">${info.icon}</div>
      <div class="wb-sinfo-title">${info.name}</div>
      <div class="wb-sinfo-cd">${cdLabel}</div>
      <div class="wb-sinfo-desc">${descTxt}</div>
      <div class="wb-sinfo-tip">
        <div class="wb-sinfo-tip-t">💡 СОВЕТ</div>
        <div class="wb-sinfo-tip-v">${info.tipTxt}</div>
      </div>
      <div class="wb-sinfo-use" id="wb-sinfo-use">${btnLabel}</div>
    </div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('open'));
    const close = () => { ov.classList.remove('open'); setTimeout(() => ov.remove(), 250); };
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    document.getElementById('wb-sinfo-use')?.addEventListener('click', () => {
      close();
      if (isAutoLocked) {
        // Открываем магазин с подпиской: закрываем WB-оверлей и стартуем Shop scene.
        try { window.WBHtml?.close?.(); } catch(_) {}
        try { sc?.scene?.start?.('Shop'); } catch(_) {
          window.WBHtml?.toast?.('👑 Открой магазин и купи подписку');
        }
        return;
      }
      _useSkillDirect(info, sc, s);
    });
    try { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); } catch(_) {}
  }

  function _openCard(p, s) {
    const hp = p.hp || p.current_hp || 800, mhp = p.max_hp || 1000;
    const pct = Math.round(Math.min(100, Math.max(0, (hp / mhp) * 100)));
    document.getElementById('wb-pc-av').textContent  = p.emoji || '⚔️';
    document.getElementById('wb-pc-n').textContent   = p.name || 'Игрок';
    document.getElementById('wb-pc-t').textContent   = `Ур. ${p.level || '?'}`;
    document.getElementById('wb-pc-c').textContent   = p.clan || 'Без клана';
    document.getElementById('wb-pc-atk').textContent = (p.atk || 0).toLocaleString('ru') || '—';
    document.getElementById('wb-pc-dmg').textContent = (p.damage || 0).toLocaleString('ru');
    document.getElementById('wb-pc-con').textContent = (p.contribution || 0) + '%';
    document.getElementById('wb-pc-hpv').textContent = `${hp} / ${mhp} HP`;
    document.getElementById('wb-pc-hpf').style.width = pct + '%';
    document.getElementById('wb-pc-rdmg').textContent = (p.damage || 0).toLocaleString('ru');
    document.getElementById('wb-pc-rct').textContent  = p.crits || '—';
    document.getElementById('wb-pcov')?.classList.add('open');
  }

  function updateHUD(state) {
    const a = state?.active; if (!a) return;
    const pct = a.max_hp > 0 ? Math.round(a.current_hp / a.max_hp * 100) : 0;
    const bar=document.getElementById('wb-boss-bar'); if (bar) { bar.style.width=pct+'%'; bar.style.background=pct<25?'linear-gradient(90deg,#FF0000,#FF2200)':pct<50?'linear-gradient(90deg,#FF4400,#FF6600)':'linear-gradient(90deg,#880033,#cc0055,#ff3377)'; } window.WBHtml.checkQteTrigger?.(pct); window.WBHtml.checkPhaseTransition?.(pct);
    const nums = document.getElementById('wb-boss-nums');
    if (nums) nums.textContent = `${(a.current_hp||0).toLocaleString('ru')} / ${(a.max_hp||0).toLocaleString('ru')} · ${pct}%`;
    const timer = document.getElementById('wb-bl-timer'); if (timer) timer.textContent = _fmtSec(a.seconds_left);
    const ps = state.player_state;
    if (ps) {
      const ppct = ps.max_hp > 0 ? Math.round(ps.current_hp / ps.max_hp * 100) : 0;
      const pb = document.getElementById('wb-pl-bar'); if (pb) pb.style.width = ppct + '%';
      const ph = document.getElementById('wb-pl-hp');  if (ph) ph.textContent = `${ps.current_hp}/${ps.max_hp}`;
    }
    const lc = document.getElementById('wb-live-cnt');
    if (lc) { const rc = Math.max(state.registrants_count||0, state.player_state?1:0); lc.textContent = rc + '👥'; }
    // rage vignette
    const rage = document.getElementById('wb-rage2');
    if (rage) rage.classList.toggle('on', pct < 50);
  }

  function addHitLog(dmg, isCrit, tx, ty) {
    const zone = document.getElementById('wb-boss-zone'); if (!zone) return;
    const r = zone.getBoundingClientRect();
    const lt = window.WBHtml._lastTap;
    if (tx == null && lt) { tx = lt.x; ty = lt.y; }
    const x = (tx != null ? tx - r.left : r.width/2) + (Math.random()-.5)*60;
    const y = (ty != null ? ty - r.top  : r.height/2) + (Math.random()-.5)*30;
    const el = document.createElement('div');
    el.className = 'wb-dmg-num' + (isCrit ? ' crit' : '');
    el.textContent = isCrit ? `💥 ${dmg.toLocaleString('ru')}!` : `+${dmg.toLocaleString('ru')}`;
    const fs = isCrit ? (20+Math.random()*12) : (13+Math.random()*8);
    const cl = isCrit ? '#FFD700' : ((window.WBHtml.getCombo?.()||0) > 5 ? '#FF4400' : '#FF6680');
    el.style.cssText = `left:${x}px;top:${y}px;font-size:${fs}px;color:${cl};text-shadow:0 0 8px ${cl};`;
    zone.appendChild(el);
    setTimeout(() => el.remove(), 950);
    window.WBHtml.addUltraEnergy?.(.04 + Math.random() * .02);
    window.WBHtml.bumpCombo?.();
  }

  function setUltraFill(pct) {
    const fill = document.getElementById('wb-ultra-fill');
    if (fill) fill.style.width = Math.min(100, Math.max(0, pct)) + '%';
    const btn = document.getElementById('wb-ultra-btn');
    if (!btn) return;
    const ready = pct >= 100;
    btn.classList.toggle('ready', ready);
    btn.innerHTML = ready ? '⚡ УДАР!' : 'УДАР';
  }

  function setSkillCooldown(sk, seconds) {
    const el = document.querySelector(`.wb-skill.${sk}`);
    if (!el) return;
    el.classList.toggle('cd', seconds > 0);
    const num = el.querySelector('.wb-cd-num');
    if (num) num.textContent = seconds > 0 ? seconds : '—';
  }

  Object.assign(window.WBHtml, { _renderBattle, updateHUD, addHitLog, setUltraFill, setSkillCooldown });
  Object.defineProperty(window.WBHtml, '_scene', {
    get() { return window.WBHtml.__scene; },
    set(v) { window.WBHtml.__scene = v; },
    configurable: true
  });
})();
