/* ============================================================
   MenuScene — challenge: бейдж входящих, меню кандидатов,
                          HTML-модал ввода ника.
   ============================================================ */

Object.assign(MenuScene.prototype, {

  /* Нарисовать/скрыть красный бейдж "!" у кнопки "Мои вызовы".
     Позицию кнопки сохраняет _buildBattlePanel в this._challengesBtnPos. */
  _drawChallengesBadge(hasIncoming) {
    try { this._challengesBadge?.bg?.destroy(); this._challengesBadge?.t?.destroy(); } catch (_) {}
    this._challengesBadge = null;
    if (!hasIncoming) return;
    const pos = this._challengesBtnPos;
    const panel = this._panels?.battle;
    if (!pos || !panel) return;
    const bx = pos.x + pos.w - 10;
    const by = pos.y + 10;
    const bg = this.add.graphics();
    try { bg.removeFromDisplayList(); } catch (_) {}
    bg.fillStyle(0xe03030, 1);
    bg.fillCircle(bx, by, 8);
    bg.lineStyle(1.5, 0xffdca0, 0.9);
    bg.strokeCircle(bx, by, 8);
    const t = txt(this, bx, by, '!', 11, '#ffffff', true).setOrigin(0.5);
    try { t.removeFromDisplayList(); } catch (_) {}
    panel.add(bg); panel.add(t);
    this._challengesBadge = { bg, t };
  },

  /* Обновить бейдж: запрос /pending и отрисовка */
  async _refreshChallengesBadge() {
    try {
      const r = await get('/api/battle/challenge/pending');
      this._drawChallengesBadge(!!(r && r.ok && r.pending));
    } catch (_) {}
  },

  /* Меню выбора из найденных кандидатов. TG popup даёт максимум 3 кнопки,
     поэтому кладём 2 верхних кандидата + "Отмена". Если их больше —
     строку с остальными показываем в тексте. */
  _showCandidatesPopup(candidates, onPick) {
    const list = (candidates || []).slice(0, 5);
    const top = list.slice(0, 2);
    const rest = list.slice(2);
    const restText = rest.length
      ? `\nЕщё: ${rest.map(c => '@' + c.username).join(', ')}\n(введите полный ник)`
      : '';
    const msg = `Нашлось ${list.length} игроков:\n${top.map(c => `• @${c.username} · ур.${c.level} · ⭐${c.rating}`).join('\n')}${restText}`;
    const buttons = top.map((c, i) => ({ id: `pick_${i}`, type: 'default', text: `@${c.username}` }));
    buttons.push({ id: 'cancel', type: 'cancel', text: 'Отмена' });
    if (tg?.showPopup) {
      tg.showPopup({ title: '🎯 Выбор соперника', message: msg, buttons }, (btnId) => {
        if (!btnId || btnId === 'cancel') return;
        const idx = parseInt(btnId.replace('pick_', ''), 10);
        const picked = top[idx];
        if (picked) onPick(picked.username);
      });
    } else {
      const names = list.map((c, i) => `${i + 1}. @${c.username}`).join('\n');
      const idx = parseInt(window.prompt(`Выберите номер:\n${names}`, '1'), 10);
      if (Number.isFinite(idx) && list[idx - 1]) onPick(list[idx - 1].username);
    }
  },

  /* HTML-оверлей для ввода ника (взамен window.prompt).
     cb(value) — value=null при отмене, иначе строка. */
  /* Полоска ожидания после отправки вызова. Live-countdown + кнопка отмены.
     Закрывается извне через MenuScene._closeWaitingChallenge() — из WS
     (battle_started / challenge_declined) или по таймеру expires. */
  _showWaitingChallenge(nick, challengeId, expiresAt) {
    try { document.getElementById('_waitChMod')?.remove(); } catch (_) {}
    const d = document.createElement('div');
    d.id = '_waitChMod';
    d.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(8,6,18,0.78);display:flex;align-items:center;justify-content:center;padding:20px;font-family:-apple-system,Roboto,Segoe UI,sans-serif;';
    d.innerHTML =
      '<div style="background:#1a1828;border:1px solid rgba(80,150,255,0.55);border-radius:14px;padding:18px 18px 14px;width:100%;max-width:300px;box-shadow:0 8px 32px rgba(0,0,0,0.5);text-align:center;">'
      + '<div style="color:#5096ff;font-size:14px;font-weight:600;margin-bottom:6px;">⏳ Ждём ответа</div>'
      + '<div style="color:#fff;font-size:16px;font-weight:700;margin-bottom:4px;">@' + nick + '</div>'
      + '<div id="_waitChTimer" style="color:#ffc83c;font-size:22px;font-weight:800;font-family:Consolas,monospace;margin:8px 0 12px;letter-spacing:2px;">--:--</div>'
      + '<button id="_waitChCancel" style="width:100%;padding:11px;background:#aa1a22;color:#fff;border:0;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;">🚫 Отменить вызов</button>'
      + '</div>';
    document.body.appendChild(d);
    const fmt = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
    const tick = () => {
      const left = Math.max(0, Math.floor((expiresAt * 1000 - Date.now()) / 1000));
      const t = d.querySelector('#_waitChTimer');
      if (t) t.textContent = fmt(left);
      if (left <= 0) {
        this._closeWaitingChallenge();
        this._toast('⌛ Соперник не ответил');
      }
    };
    tick();
    this._waitChIntv = setInterval(tick, 1000);
    d.querySelector('#_waitChCancel').onclick = async () => {
      try { await post('/api/battle/challenge/cancel', { challenge_id: challengeId }); } catch (_) {}
      this._closeWaitingChallenge();
      this._toast('🚫 Вызов отменён');
    };
  },

  _closeWaitingChallenge() {
    try { document.getElementById('_waitChMod')?.remove(); } catch (_) {}
    if (this._waitChIntv) { try { clearInterval(this._waitChIntv); } catch (_) {} this._waitChIntv = null; }
  },

  /* Splash «🎯 @nick принял! Готовься 3-2-1» перед стартом боя.
     Показывается на стороне вызывающего после WS battle_started. */
  _showAcceptedSplash(oppName, cb) {
    try { document.getElementById('_acceptSpl')?.remove(); } catch (_) {}
    const d = document.createElement('div');
    d.id = '_acceptSpl';
    d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(8,6,18,0.92);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,Roboto,sans-serif;animation:_aspIn .18s ease-out;';
    d.innerHTML =
      '<style>@keyframes _aspIn{from{opacity:0}to{opacity:1}}@keyframes _aspNum{0%{transform:scale(.4);opacity:0}40%{transform:scale(1.2);opacity:1}100%{transform:scale(1);opacity:1}}</style>'
      + '<div style="color:#3cc864;font-size:14px;font-weight:700;letter-spacing:1.5px;text-shadow:0 0 12px #3cc86477;">🎯 СОПЕРНИК ПРИНЯЛ</div>'
      + '<div style="color:#fff;font-size:22px;font-weight:800;margin-top:6px;">@' + (oppName || 'Соперник') + '</div>'
      + '<div id="_aspNum" style="color:#ffc83c;font-size:78px;font-weight:900;margin-top:14px;text-shadow:0 0 24px #ffc83c99;font-family:Consolas,monospace;animation:_aspNum .9s ease-out;">3</div>'
      + '<div style="color:#aaaacc;font-size:11px;margin-top:8px;letter-spacing:2px;">ПРИГОТОВЬСЯ</div>';
    document.body.appendChild(d);
    let n = 3;
    const numEl = d.querySelector('#_aspNum');
    const tick = () => {
      n--;
      if (n <= 0) {
        try { d.remove(); } catch (_) {}
        if (cb) cb();
        return;
      }
      numEl.textContent = String(n);
      numEl.style.animation = 'none';
      void numEl.offsetWidth;
      numEl.style.animation = '_aspNum .9s ease-out';
    };
    setTimeout(tick, 900);
    setTimeout(tick, 1800);
    setTimeout(tick, 2700);
  },

  _promptNickname(cb) {
    try { document.getElementById('_nickModal')?.remove(); } catch (_) {}
    const d = document.createElement('div');
    d.id = '_nickModal';
    d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(8,6,18,0.82);display:flex;align-items:center;justify-content:center;padding:20px;font-family:-apple-system,Roboto,Segoe UI,sans-serif;';
    d.innerHTML =
      '<div style="background:#1a1828;border:1px solid rgba(255,200,60,0.55);border-radius:14px;padding:18px 18px 14px;width:100%;max-width:320px;box-shadow:0 8px 32px rgba(0,0,0,0.5);">'
      + '<div style="color:#ffc83c;font-size:15px;font-weight:600;margin-bottom:4px;">🎯 Вызов по нику</div>'
      + '<div style="color:#ddddff;font-size:11px;margin-bottom:10px;">Введите ник соперника (без @)</div>'
      + '<input id="_nickInput" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" '
      +   'style="width:100%;padding:11px 12px;background:#0f0d1a;border:1px solid #4a4670;border-radius:8px;color:#fff;font-size:14px;box-sizing:border-box;outline:none;" />'
      + '<div style="display:flex;gap:8px;margin-top:12px;">'
      +   '<button id="_nickCancel" style="flex:1;padding:10px;background:#2a2840;color:#ccc;border:0;border-radius:8px;font-size:12px;cursor:pointer;">Отмена</button>'
      +   '<button id="_nickOk"     style="flex:1;padding:10px;background:#ffc83c;color:#1a1828;border:0;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;">Отправить</button>'
      + '</div></div>';
    document.body.appendChild(d);
    const inp = d.querySelector('#_nickInput');
    setTimeout(() => { try { inp.focus(); } catch (_) {} }, 60);
    let done = false;
    const close = (val) => {
      if (done) return; done = true;
      try { d.remove(); } catch (_) {}
      cb(val);
    };
    d.querySelector('#_nickCancel').onclick = () => close(null);
    d.querySelector('#_nickOk').onclick = () => close(inp.value);
    inp.onkeydown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); close(inp.value); }
      else if (e.key === 'Escape') { e.preventDefault(); close(null); }
    };
    d.onclick = (e) => { if (e.target === d) close(null); };
  },

});
