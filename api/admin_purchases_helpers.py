"""Вспомогательные функции для страницы /admin/purchases."""


def _fmt_payload(payload: str) -> str:
    """Человекочитаемое описание покупки из payload."""
    if not payload:
        return "—"
    if ":usdt_scroll:" in payload:
        sid = payload.split(":usdt_scroll:", 1)[1].strip()
        return f"Свиток: {sid}"
    if ":premium:" in payload:
        return "👑 Premium"
    if ":full_reset:" in payload:
        return "🔄 Сброс прогресса"
    if ":avatar:" in payload:
        aid = payload.split(":avatar:", 1)[1].strip()
        return f"Образ: {aid}"
    if ":usdt_slot:" in payload:
        return "💠 Легендарный образ"
    if ":usdt_reset:" in payload:
        cid = payload.split(":usdt_reset:", 1)[1].strip()
        return f"🔄 Сброс образа: {cid}"
    if ":diamonds:" in payload:
        d = payload.split(":diamonds:", 1)[1].strip()
        return f"💎 {d} алмазов"
    return payload


def _pkg_label(package_id: str, diamonds: int, stars: int) -> str:
    labels = {
        "d100": "100 💎", "d300": "300 💎", "d500": "500 💎",
        "premium": "👑 Premium",
    }
    return labels.get(package_id, f"{package_id} / {diamonds}💎 за {stars}⭐")
