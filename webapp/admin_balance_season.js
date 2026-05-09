// admin_balance_season.js — рендер вкладки «🏆 Сезон».
// Подключается перед admin_balance.js — функции глобальные.

const ACTION_LABELS = {
  pvp_win:        "⚔️ Победа PvP",
  pvp_loss:       "💔 Поражение PvP",
  pve_bot_win:    "🤖 Победа над ботом",
  daily_quest:    "📅 Ежедневный квест",
  weekly_quest:   "🗓 Недельный квест",
  achievement:    "🏆 Достижение (one-time)",
  wb_hit:         "🐉 Удар по WB",
  wb_top_damage:  "🥇 Top-1 урона WB",
  wb_last_hit:    "🎯 Финальный удар WB",
  tower_floor:    "🏰 Этаж Башни (×N)",
  endless_wave:   "🌊 Волна Натиска (×N)",
};

function fmtReward(r) {
  if (!r || Object.keys(r).length === 0) return "<span style='color:#7d8590'>—</span>";
  const parts = [];
  if (r.gold)    parts.push(`<b>${r.gold}</b> 🪙`);
  if (r.diamond) parts.push(`<b>${r.diamond}</b> 💎`);
  if (r.item)    parts.push(`<span style='color:#79c0ff'>${r.item}</span>`);
  return parts.join(" + ");
}

function renderSeasonInfo(sp) {
  const el = document.getElementById("season-info");
  if (!el) return;
  const s = sp.active_season;
  const cfg = sp.season_config;
  const pass = sp.pass_config;
  if (!s) {
    el.innerHTML = `<div style='color:#7d8590'>Активного сезона нет.</div>
      <div class='sub'>Сезон создастся автоматически при первом начислении BP-очков.</div>
      <div class='sub'>Имя из конфига: <b>${cfg.name || "—"}</b>, тема: ${cfg.theme || "—"},
      длительность ${cfg.season_days || 90} дней.</div>`;
    return;
  }
  el.innerHTML = `
    <div style='display:grid; grid-template-columns: 1fr 1fr; gap:16px;'>
      <div>
        <div class='sub'>Имя</div>
        <div style='font-size:18px; font-weight:600;'>${s.name}</div>
      </div>
      <div>
        <div class='sub'>Тема</div>
        <div style='font-size:18px; font-weight:600;'>${s.theme}</div>
      </div>
      <div>
        <div class='sub'>Старт</div>
        <div>${s.started_at}</div>
      </div>
      <div>
        <div class='sub'>Окончание</div>
        <div>${s.ends_at}</div>
      </div>
      <div>
        <div class='sub'>Уровней пасса</div>
        <div><b>${pass.max_level}</b> (по ${pass.points_per_level} очков)</div>
      </div>
      <div>
        <div class='sub'>Всего очков на пасс</div>
        <div><b>${pass.max_level * pass.points_per_level}</b> BP</div>
      </div>
    </div>`;
}

function renderSeasonPoints(points) {
  const tb = document.querySelector("#season-points-table tbody");
  if (!tb) return;
  tb.innerHTML = Object.entries(points).map(([action, pts]) => {
    const label = ACTION_LABELS[action] || action;
    return `<tr>
      <td>${label}</td>
      <td class='num'>
        <input type='number' min='0' max='999' value='${pts}' data-sp-action='${action}'
               style='width: 70px; background:#0d1117; color:#e6edf3; border:1px solid #30363d;
                      padding:4px; border-radius:4px; font-variant-numeric: tabular-nums;
                      text-align:right;'> BP
      </td>
    </tr>`;
  }).join("");
}

function _editFields(level, track, reward) {
  const g = reward.gold || 0;
  const d = reward.diamond || 0;
  const it = reward.item || "";
  const ds = `data-sp-level='${level}' data-sp-track='${track}'`;
  const inp = "background:#0d1117;color:#e6edf3;border:1px solid #30363d;padding:3px 6px;border-radius:4px;font-size:11px;";
  return `
    <div style='display:flex; gap:4px; flex-wrap:wrap; align-items:center; font-size:11px;'>
      <span>🪙</span>
      <input type='number' min='0' value='${g}' ${ds} data-sp-field='gold'
             style='width:60px;${inp}'>
      <span>💎</span>
      <input type='number' min='0' value='${d}' ${ds} data-sp-field='diamond'
             style='width:50px;${inp}'>
      <span>📦</span>
      <input type='text' value='${it}' ${ds} data-sp-field='item' placeholder='item id'
             style='width:120px;${inp}'>
    </div>`;
}

function renderSeasonRewards(levels, premSub) {
  const tb = document.querySelector("#season-rewards-table tbody");
  if (!tb) return;
  tb.innerHTML = levels.map(l => `<tr>
    <td><b>Ур. ${l.level}</b></td>
    <td>${_editFields(l.level, "free", l.free || {})}</td>
    <td style='background: rgba(210,168,255,.05);'>${_editFields(l.level, "premium", l.premium || {})}</td>
  </tr>`).join("");
  const priceEl = document.getElementById("season-prem-price");
  if (priceEl && premSub) {
    priceEl.textContent = `${premSub.stars_price || "—"} ⭐ / ${premSub.usdt_price || "—"} USDT`;
  }
}

async function saveSeasonPass() {
  // Собираем все правки из инпутов
  const points_for_action = {};
  document.querySelectorAll("[data-sp-action]").forEach(inp => {
    const v = parseInt(inp.value, 10);
    if (!Number.isNaN(v)) points_for_action[inp.dataset.spAction] = v;
  });
  const rewards_grid = {};
  document.querySelectorAll("[data-sp-level][data-sp-field]").forEach(inp => {
    const lv = inp.dataset.spLevel;
    const tr = inp.dataset.spTrack;
    const f = inp.dataset.spField;
    rewards_grid[lv] ||= { free: {}, premium: {} };
    rewards_grid[lv][tr] ||= {};
    if (f === "item") {
      const s = (inp.value || "").trim();
      if (s) rewards_grid[lv][tr][f] = s;
    } else {
      const v = parseInt(inp.value, 10);
      if (!Number.isNaN(v) && v > 0) rewards_grid[lv][tr][f] = v;
    }
  });
  try {
    await api("/api/admin/balance/save_season_pass", {
      points_for_action, rewards_grid,
    });
    toast("✓ Сохранено в season_pass.json");
    setTimeout(reloadConfig, 500);
  } catch (e) {
    toast("Ошибка сохранения сезона: " + e.message, true);
  }
}

function renderSeason(sp) {
  if (!sp) return;
  renderSeasonInfo(sp);
  renderSeasonPoints(sp.points_for_action || {});
  renderSeasonRewards(sp.rewards_levels || [], sp.premium_subscription || {});
}
