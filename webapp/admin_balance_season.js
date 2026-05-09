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
    return `<tr><td>${label}</td><td class='num'><b>${pts}</b> BP</td></tr>`;
  }).join("");
}

function renderSeasonRewards(levels, premSub) {
  const tb = document.querySelector("#season-rewards-table tbody");
  if (!tb) return;
  tb.innerHTML = levels.map(l => `<tr>
    <td><b>Ур. ${l.level}</b></td>
    <td>${fmtReward(l.free)}</td>
    <td style='background: rgba(210,168,255,.05);'>${fmtReward(l.premium)}</td>
  </tr>`).join("");
  const priceEl = document.getElementById("season-prem-price");
  if (priceEl && premSub) {
    priceEl.textContent = `${premSub.stars_price || "—"} ⭐ / ${premSub.usdt_price || "—"} USDT`;
  }
}

function renderSeason(sp) {
  if (!sp) return;
  renderSeasonInfo(sp);
  renderSeasonPoints(sp.points_for_action || {});
  renderSeasonRewards(sp.rewards_levels || [], sp.premium_subscription || {});
}
