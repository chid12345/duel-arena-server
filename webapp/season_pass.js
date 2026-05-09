// season_pass.js — Mini App страница боевого пропуска для игрока.

let TG = null;
let INIT_DATA = "";
let STATE = null;

function $(id) { return document.getElementById(id); }
function toast(msg, isError) {
  const el = $("toast");
  el.textContent = msg;
  el.className = "bp-toast show" + (isError ? " error" : "");
  setTimeout(() => el.classList.remove("show"), 2500);
}

async function api(endpoint, payload) {
  const body = Object.assign({ init_data: INIT_DATA }, payload || {});
  const r = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`${r.status}: ${t.slice(0, 100)}`);
  }
  return r.json();
}

function goBack() {
  if (TG && TG.close) TG.close();
  else history.back();
}

function fmtReward(r) {
  if (!r || Object.keys(r).length === 0) {
    return `<span class="empty">— нет —</span>`;
  }
  const parts = [];
  if (r.gold)    parts.push(`<span class="gold">${r.gold} 🪙</span>`);
  if (r.diamond) parts.push(`<span class="dia">${r.diamond} 💎</span>`);
  if (r.item)    parts.push(`<span class="item">📦 ${r.item}</span>`);
  return parts.join(" ");
}

function fmtDaysLeft(endsAt) {
  if (!endsAt) return "";
  try {
    const end = new Date(endsAt.replace(" ", "T"));
    const days = Math.max(0, Math.ceil((end - new Date()) / 86400000));
    return `до конца сезона: ${days} дн.`;
  } catch { return ""; }
}

function renderHeader(s, p) {
  $("season-name").textContent = `🔥 ${s.name || "Сезон"}`;
  $("season-meta").textContent = fmtDaysLeft(s.ends_at);
  $("level-big").textContent = p.level;
  const pts = p.points;
  const total = p.next_level_at;
  if (total) {
    $("points-text").textContent = `${pts} / ${total} BP`;
    const prevTotal = p.level * p.points_per_level;
    const pct = Math.min(100, Math.max(0, (pts - prevTotal) / p.points_per_level * 100));
    $("bar-fill").style.width = `${pct}%`;
    $("next-text").textContent = `до уровня ${p.level + 1}: ${total - pts} BP`;
  } else {
    $("points-text").textContent = `${pts} BP — пасс пройден!`;
    $("bar-fill").style.width = "100%";
    $("next-text").textContent = `Максимальный уровень ${p.max_level} достигнут 🏆`;
  }

  // Premium-row: либо «активирован», либо кнопка «купить»
  const pr = $("premium-row");
  if (p.has_premium) {
    pr.innerHTML = `<div class="bp-premium-active">✓ Premium-трек активирован</div>`;
  } else {
    const sub = STATE.premium_subscription || {};
    pr.innerHTML = `<button class="bp-buy-premium" onclick="buyPremium()">
      💎 Активировать Premium-трек · ${sub.stars_price || "?"} ⭐
    </button>`;
  }
}

function renderLevels(levels, hasPremium) {
  const c = $("bp-levels");
  if (!levels || levels.length === 0) {
    c.innerHTML = `<div class="bp-loading">Награды не настроены.</div>`;
    return;
  }
  c.innerHTML = levels.map(l => {
    const reached = l.reached;
    const freeR = fmtReward(l.free);
    const premR = fmtReward(l.premium);
    const freeBtn = _btn(l, "free", reached);
    const premBtn = _btn(l, "premium", reached, hasPremium);
    return `
      <div class="bp-level-row">
        <div class="bp-card ${reached ? '' : 'locked'}">
          <div class="bp-reward">${freeR}</div>
          ${freeBtn}
        </div>
        <div class="bp-level-circle ${reached ? 'reached' : ''}">${l.level}</div>
        <div class="bp-card premium ${reached && hasPremium ? '' : 'locked'}">
          <div class="bp-reward">${premR}</div>
          ${premBtn}
        </div>
      </div>`;
  }).join("");
}

function _btn(l, track, reached, hasPremiumOverride) {
  const claimed = track === "free" ? l.free_claimed : l.premium_claimed;
  const reward = track === "free" ? l.free : l.premium;
  if (!reward || Object.keys(reward).length === 0) return "";
  if (claimed) {
    return `<button class="bp-claim claimed" disabled>✓ Получено</button>`;
  }
  if (!reached) {
    return `<button class="bp-claim locked" disabled>🔒 Уровень ${l.level}</button>`;
  }
  if (track === "premium" && hasPremiumOverride === false) {
    return `<button class="bp-claim locked" disabled>💎 Нужен Premium</button>`;
  }
  return `<button class="bp-claim ready" onclick="claim(${l.level}, '${track}')">🎁 Забрать</button>`;
}

async function claim(level, track) {
  try {
    const r = await api("/api/season_pass/claim", { level, track });
    if (!r.ok) {
      const reasons = {
        already_claimed: "Уже получено",
        level_not_reached: "Уровень ещё не достигнут",
        premium_required: "Нужен Premium-трек",
        no_reward_at_level: "На этом уровне наград нет",
      };
      toast(reasons[r.reason] || r.reason || "Ошибка", true);
      return;
    }
    toast("✓ Награда получена!");
    if (r.state) {
      STATE = r.state;
      renderHeader(STATE.season, STATE.progress);
      renderLevels(STATE.levels, STATE.progress.has_premium);
    }
  } catch (e) {
    toast("Ошибка: " + e.message, true);
  }
}

async function buyPremium() {
  if (!TG || !TG.openInvoice) {
    toast("Открой через бота /pass — нужен Telegram WebApp", true);
    return;
  }
  try {
    const r = await api("/api/season_pass/buy_premium_invoice");
    if (!r.ok || !r.invoice_link) {
      toast("Не получилось создать счёт: " + (r.detail || ""), true);
      return;
    }
    TG.openInvoice(r.invoice_link, (status) => {
      if (status === "paid") {
        toast("✓ Premium активирован!");
        setTimeout(load, 800);  // дать боту время обработать webhook
      } else if (status === "cancelled") {
        toast("Покупка отменена", true);
      } else if (status === "failed") {
        toast("Платёж не прошёл", true);
      }
    });
  } catch (e) {
    toast("Ошибка: " + e.message, true);
  }
}

async function load() {
  try {
    STATE = await api("/api/season_pass/state");
    renderHeader(STATE.season, STATE.progress);
    renderLevels(STATE.levels, STATE.progress.has_premium);
  } catch (e) {
    $("season-name").textContent = "Ошибка загрузки";
    $("season-meta").textContent = e.message;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  TG = window.Telegram && window.Telegram.WebApp;
  if (TG) {
    TG.ready(); TG.expand();
    INIT_DATA = TG.initData || "";
  }
  if (!INIT_DATA) {
    $("season-name").textContent = "⚠ Откройте через бота";
    return;
  }
  load();
});
