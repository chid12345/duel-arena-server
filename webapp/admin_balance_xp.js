// admin_balance_xp.js — XP-вкладка админ-панели.
// Подключается ПЕРЕД admin_balance.js — его функции и константы видны как глобальные.

const XP_FIELDS = [
  ["XP_BASE_WIN",            "Базовый XP за победу (ур.1)",  20,  300, 1],
  ["XP_GROWTH_START",        "Стартовая точка кривой",       50,  300, 1],
  ["XP_GROWTH_RATE",         "Скорость роста",               50,  500, 5],
  ["XP_GROWTH_POWER",        "Степень кривой",               1.0, 2.5, 0.05],
  ["XP_DEFEAT_FRACTION",     "XP за поражение (доля)",       0.0, 0.5, 0.01],
  ["XP_TO_NEXT_BASE",        "База XP до ур.2",              200, 800, 10],
  ["XP_TO_NEXT_LIN",         "Линейный рост XP-порога",      5,   50,  1],
  ["XP_TO_NEXT_BREAK1",      "Точка перелома 1 (уровень)",   10,  60,  1],
  ["XP_TO_NEXT_BREAK1_BONUS","+бонус роста после перелома 1", 0,   30,  1],
  ["XP_TO_NEXT_BREAK2",      "Точка перелома 2 (уровень)",   30,  80,  1],
  ["XP_TO_NEXT_BREAK2_BONUS","+бонус роста после перелома 2", 0,   30,  1],
  ["PREMIUM_XP_BUFF",        "Премиум +% к XP",              1.0, 2.0, 0.01],
];

function renderXpLevels(rows) {
  const tb = document.querySelector("#xp-levels-table tbody");
  if (!tb) return;
  tb.innerHTML = rows.map(r => {
    const dW = deltaCell(r.actual_win, r.formula_win);
    const dN = deltaCell(r.actual_next, r.formula_next);
    const big = Math.abs((r.actual_win - r.formula_win) / Math.max(1, r.formula_win)) > 0.10
             || Math.abs((r.actual_next - r.formula_next) / Math.max(1, r.formula_next)) > 0.10;
    return `<tr class="${big ? 'row-warn' : ''}">
      <td>ур. ${r.level}</td>
      <td class="num">${r.actual_win}</td>
      <td class="num">${r.formula_win}</td>
      <td class="num">${dW}</td>
      <td class="num">${r.actual_next}</td>
      <td class="num">${r.formula_next}</td>
      <td class="num">${dN}</td>
    </tr>`;
  }).join("");
}

function renderXpQuests(rows) {
  const tb = document.querySelector("#xp-quests-table tbody");
  if (!tb) return;
  tb.innerHTML = rows.map(r => {
    const big = Math.abs((r.actual - r.formula) / Math.max(1, r.formula)) > 0.10;
    return `<tr class="${big ? 'row-warn' : ''}">
      <td>${r.freq}</td><td>${r.diff}</td>
      <td class="num">${r.actual}</td>
      <td class="num">${r.formula}</td>
      <td class="num">${deltaCell(r.actual, r.formula)}</td>
    </tr>`;
  }).join("");
}

async function saveXp() {
  if (!CONFIG || !CONFIG.xp_anchor) return;
  try {
    await api("/api/admin/balance/save_xp", { anchor: CONFIG.xp_anchor });
    toast("✓ Сохранено в xp_economy.json");
    setTimeout(reloadConfig, 500);
  } catch (e) {
    toast("Ошибка сохранения XP: " + e.message, true);
  }
}
