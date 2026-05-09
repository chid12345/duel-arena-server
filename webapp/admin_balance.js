// admin_balance.js — админ-панель балансной сетки.
// fetch к /api/admin/balance/* с initData из Telegram WebApp.

let TG = null;
let INIT_DATA = "";
let TOKEN = "";
let CONFIG = null;

function $(id) { return document.getElementById(id); }
function toast(msg, isError) {
  const el = $("toast");
  el.textContent = msg;
  el.className = "toast show" + (isError ? " error" : "");
  setTimeout(() => el.classList.remove("show"), 3000);
}

async function api(endpoint, payload) {
  const auth = TOKEN ? { token: TOKEN } : { init_data: INIT_DATA };
  const body = Object.assign(auth, payload || {});
  const r = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`${r.status}: ${txt}`);
  }
  return r.json();
}

// ── ANCHOR ─────────────────────────────────────────────
const ANCHOR_FIELDS = [
  ["PU_TO_GOLD",        "1 час игры (золота)",     50,  1000, 1],
  ["GOLD_TO_DIAMOND",   "1 алмаз = N золота",      30,  200,  1],
  ["STAR_TO_DIAMOND",   "1 ⭐ = N 💎",              0.1, 3.0,  0.05],
  ["USDT_TO_DIAMOND",   "1 USDT = N 💎",           20,  80,   0.5],
  ["PVP_WIN_GOLD",      "Победа PvP (золота)",     5,   100,  1],
  ["PVP_DEFEAT_GOLD",   "Поражение PvP (золота)",  0,   30,   1],
  ["DAILY_BONUS_GOLD",  "Ежедневный бонус",        10,  300,  1],
  ["PREMIUM_GOLD_BUFF", "Премиум +% к золоту",     1.0, 1.5,  0.01],
  ["PREMIUM_XP_BUFF",   "Премиум +% к XP",         1.0, 1.5,  0.01],
  ["PREMIUM_DROP_BUFF", "Премиум +% к дропу",      1.0, 1.4,  0.01],
  ["BOX_EV_RATIO",      "EV ящика от цены",        0.5, 1.0,  0.01],
  ["BOX_JACKPOT_BUDGET","Доля под джекпот",        0.0, 0.3,  0.01],
];

const FACTOR_FIELDS = [
  ["gold",    "price_factor (gold)",    0.01, 0.30, 0.001],
  ["diamond", "price_factor (diamond)", 0.05, 1.00, 0.005],
  ["star",    "price_factor (star)",    0.05, 1.00, 0.005],
  ["usdt",    "price_factor (usdt)",    0.05, 1.00, 0.005],
];

// XP_FIELDS, renderXpLevels/Quests, saveXp — определены в admin_balance_xp.js

function buildSliders(containerId, fields, source, scopeName) {
  const c = $(containerId);
  c.innerHTML = "";
  for (const [key, label, min, max, step] of fields) {
    const val = source[key];
    if (val === undefined) continue;
    const row = document.createElement("div");
    row.className = "slider-row";
    row.innerHTML =
      `<label>${label}</label>` +
      `<input type="range" min="${min}" max="${max}" step="${step}" value="${val}"
              data-scope="${scopeName}" data-key="${key}">` +
      `<input type="number" min="${min}" max="${max}" step="${step}" value="${val}"
              data-scope="${scopeName}" data-key="${key}">`;
    c.appendChild(row);
  }
}

document.addEventListener("input", (e) => {
  const scope = e.target.dataset.scope;
  const key = e.target.dataset.key;
  if (!scope || !key) return;
  const val = parseFloat(e.target.value);
  if (Number.isNaN(val)) return;
  const peers = document.querySelectorAll(
    `[data-scope="${scope}"][data-key="${key}"]`);
  peers.forEach(p => { if (p !== e.target) p.value = val; });
  if (scope === "anchor") CONFIG.economy.anchor[key] = val;
  else if (scope === "factor") CONFIG.economy.price_factor[key] = val;
  else if (scope === "xp") {
    if (!CONFIG.xp_anchor) CONFIG.xp_anchor = {};
    CONFIG.xp_anchor[key] = val;
  }
});

// ── QUESTS / SHOP TABLES ──────────────────────────────
function deltaCell(actual, formula) {
  if (formula === 0) return "—";
  const d = ((actual - formula) / formula * 100).toFixed(0);
  const cls = actual > formula ? "delta-up" : actual < formula ? "delta-down" : "delta-zero";
  return `<span class="${cls}">${d > 0 ? "+" : ""}${d}%</span>`;
}

function renderQuests(rows) {
  const tb = document.querySelector("#quests-table tbody");
  tb.innerHTML = rows.map(r => {
    const cur = `${r.current.gold}🪙 + ${r.current.diamond}💎`;
    const frm = `${r.formula.gold}🪙 + ${r.formula.diamond}💎`;
    const dG = deltaCell(r.current.gold, r.formula.gold);
    return `<tr><td>${r.freq}</td><td>${r.diff}</td><td>${cur}</td><td>${frm}</td><td class="num">${dG}</td></tr>`;
  }).join("");
}

function renderShop(rows) {
  const tb = document.querySelector("#shop-table tbody");
  tb.innerHTML = rows.map(r => {
    const sym = r.currency === "gold" ? "🪙" : "💎";
    const big = Math.abs((r.current_price - r.formula_price) / Math.max(1, r.formula_price)) > 0.25;
    return `<tr class="${big ? 'row-warn' : ''}">
      <td>${r.id}</td><td>${r.name || ''}</td><td>${r.tab}</td>
      <td>${r.rarity}</td><td>${r.tier}</td><td class="num">${r.power}</td>
      <td class="num">${r.current_price}${sym}</td>
      <td class="num">${r.formula_price}${sym}</td>
      <td class="num">${deltaCell(r.current_price, r.formula_price)}</td>
    </tr>`;
  }).join("");
}

// ── INIT ───────────────────────────────────────────────
async function reloadConfig() {
  try {
    CONFIG = await api("/api/admin/balance/config");
    $("server-status").textContent =
      `economy.json v${CONFIG.economy.version} · ${Object.keys(CONFIG.shop_tags.items || {}).length} тэгов магазина · загружено`;
    buildSliders("anchor-sliders", ANCHOR_FIELDS, CONFIG.economy.anchor, "anchor");
    buildSliders("factor-sliders", FACTOR_FIELDS, CONFIG.economy.price_factor || {}, "factor");
    const audit = await api("/api/admin/balance/audit");
    renderQuests(audit.quests);
    renderShop(audit.shop);
    if (audit.xp_anchor) {
      CONFIG.xp_anchor = audit.xp_anchor;
      buildSliders("xp-anchor-sliders", XP_FIELDS, audit.xp_anchor, "xp");
    }
    if (audit.xp_levels) renderXpLevels(audit.xp_levels);
    if (audit.xp_quests) renderXpQuests(audit.xp_quests);
    if (audit.season_pass && typeof renderSeason === "function") renderSeason(audit.season_pass);
    toast("Конфиг загружен ✓");
  } catch (e) {
    $("server-status").textContent = `Ошибка: ${e.message}`;
    toast("Ошибка загрузки: " + e.message, true);
  }
}

async function saveConfig() {
  if (!CONFIG) return;
  try {
    const r = await api("/api/admin/balance/save", {
      anchor: CONFIG.economy.anchor,
      price_factor: CONFIG.economy.price_factor,
    });
    toast("✓ Сохранено в economy.json");
    setTimeout(reloadConfig, 500);
  } catch (e) {
    toast("Ошибка сохранения: " + e.message, true);
  }
}

document.querySelectorAll(".tab").forEach(t => {
  t.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    $("panel-" + t.dataset.tab).classList.add("active");
  });
});

window.addEventListener("DOMContentLoaded", () => {
  // Сначала пробуем токен из URL (?token=...) — режим прямого доступа из браузера
  const urlParams = new URLSearchParams(window.location.search);
  TOKEN = urlParams.get("token") || "";

  // Если токена нет — пробуем Telegram WebApp initData
  if (!TOKEN) {
    TG = window.Telegram && window.Telegram.WebApp;
    if (TG) {
      TG.ready();
      TG.expand();
      INIT_DATA = TG.initData || "";
    }
  }

  if (!TOKEN && !INIT_DATA) {
    $("server-status").textContent =
      "⚠ Нет авторизации. Откройте через /admin в боте, или добавьте ?token=ВАШ_ТОКЕН в URL.";
    return;
  }
  reloadConfig();
});
