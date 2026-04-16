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
