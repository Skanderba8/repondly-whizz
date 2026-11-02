"""Parse allowlisted CSR blocks and select same-message duplicates by approved bonus."""

import re
import unicodedata
from decimal import Decimal


class ReportError(ValueError):
    pass


def normalize_name(value: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", value).split()).casefold()


MONEY = r"((?:[0-9]+|[0-9]{1,3}(?:,[0-9]{3})+)\.[0-9]{2})"
TOTAL = re.compile(r"Total for the day:\s*\$" + MONEY + r"\s*-\s*([0-9]+(?:\.[0-9]{1,2})?)\s+POINTS\s*", re.I)
METRICS = {
    "new_subscriptions": re.compile(r"New subs issued:\s*([0-9]+)\s+bikes?;\s*\$" + MONEY + r"\s*", re.I),
    "bikes_and_batteries": re.compile(r"Bikes and batteries sold:\s*([0-9]+)\s+units?;\s*\$" + MONEY + r"\s*", re.I),
    "rtf": re.compile(r"RTF:\s*([0-9]+);\s*\$" + MONEY + r"\s*", re.I),
    "rtc": re.compile(r"RTC:\s*([0-9]+);\s*\$" + MONEY + r"\s*", re.I),
    "accessories": re.compile(r"Accessories sold:\s*([0-9]+)\s+units?;\s*\$" + MONEY + r"\s*", re.I),
}


def cents(value: str) -> int:
    return int(Decimal(value.replace(",", "")) * 100)


def select_message_duplicate(rows: list[dict]) -> dict:
    first = rows[0]
    if all(row == first for row in rows):
        return first
    if any(row["rtf_revenue_cents"] is None for row in rows):
        raise ReportError("Same-message duplicates have missing RTF revenue; highest bonus cannot be determined")
    # Compare exact cents using the shared approved rates, without payout rounding.
    bonuses = [Decimal(row["points"]) * 50 + Decimal(row["rtf_revenue_cents"]) * Decimal("0.025") for row in rows]
    highest = max(bonuses)
    winners = [row for row, bonus in zip(rows, bonuses) if bonus == highest]
    winner = winners[0]
    if any(row != winner for row in winners):
        raise ReportError("Same-message duplicates tie for highest bonus with different fields; owner reconciliation required")
    return winner


def parse_report(text: str, team_names: list[str], location_names: list[str]) -> list[dict]:
    if not re.search(r"Productivity Update", text, re.I):
        return []
    if not re.search(r"Yesterday[’']s Results", text, re.I):
        raise ReportError("Unrecognized work-date wording; manual reconciliation required")
    locations = re.findall(r"^\s*Location:\s*(.+?)\s*$", text, re.M | re.I)
    allowed_locations = {normalize_name(name) for name in location_names}
    if len(locations) != 1:
        labels = ", ".join(repr(label[:120]) for label in locations[:8]) or "none"
        raise ReportError(f"Expected one Location field; found {len(locations)} ({labels}). No results imported from this message")
    if normalize_name(locations[0]) not in allowed_locations:
        actual = repr(locations[0][:120])
        expected = ", ".join(repr(label[:120]) for label in location_names)
        raise ReportError(f"Report Location is {actual}; configured labels are {expected}. Verify the store and update its location_names in collector/config.local.json")
    sections = re.split(r"^\s*CSRs\s*$", text, flags=re.M | re.I)
    if len(sections) != 2:
        raise ReportError("Expected exactly one CSR section")
    body = re.split(r"^\s*Low productivity", sections[1], maxsplit=1, flags=re.M | re.I)[0]
    team = {normalize_name(name): name for name in team_names}
    if len(team) != len(team_names):
        raise ReportError("Ambiguous team roster")
    blocks: list[tuple[str, list[str]]] = []
    current_name: str | None = None
    current_lines: list[str] = []
    for raw_line in body.splitlines():
        line = raw_line.strip().lstrip("• ").strip()
        if not line:
            continue
        metric_line = bool(re.match(r"(?:New subs issued|Bikes and batteries sold|RTF|RTC|Accessories sold|Total for the day):", line, re.I))
        if not metric_line:
            if current_name:
                blocks.append((current_name, current_lines))
            current_name = team.get(normalize_name(line))
            current_lines = []
        elif current_name:
            current_lines.append(line)
    if current_name:
        blocks.append((current_name, current_lines))

    candidates: dict[str, list[dict]] = {}
    for name, lines in blocks:
        totals = [match for line in lines if (match := TOTAL.fullmatch(line))]
        if len(totals) != 1:
            raise ReportError("A matched CSR has no unambiguous points total")
        activity: dict[str, int | None] = {"total_revenue_cents": cents(totals[0].group(1))}
        rtf_revenue: int | None = None
        for key, pattern in METRICS.items():
            matches = [match for line in lines if (match := pattern.fullmatch(line))]
            if len(matches) > 1:
                raise ReportError("Repeated activity field")
            activity[key] = int(matches[0].group(1)) if matches else None
            activity[f"{key}_revenue_cents"] = cents(matches[0].group(2)) if matches else None
            if key == "rtf":
                rtf_revenue = activity[f"{key}_revenue_cents"]
        candidates.setdefault(name, []).append({"report_name": name, "points": str(Decimal(totals[0].group(2))), "rtf_revenue_cents": rtf_revenue, "activity": activity})
    # This grouping exists only for this parse call, which receives one Telegram message.
    return [select_message_duplicate(rows) for rows in candidates.values()]
