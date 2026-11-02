"""Owner-run, read-only Telegram account collector. Never imported by the web app."""

import argparse
import asyncio
import json
import os
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

from telethon import TelegramClient, utils
from telethon.errors import FloodWaitError

from report_parser import ReportError, normalize_name, parse_report
from topics import matches_topic
from roster import select_roster
from progress import Progress, incremental_messages, stream_key


class CollectorError(RuntimeError):
    pass


def database(method: str, table: str, filters: dict | None = None, payload: dict | None = None):
    base = os.environ["SUPABASE_URL"].rstrip("/")
    if not base.startswith("https://"):
        raise CollectorError("The collector requires an HTTPS Supabase URL")
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    url = f"{base}/rest/v1/{table}"
    if filters:
        url += "?" + urlencode(filters)
    request = Request(url, data=json.dumps(payload).encode() if payload is not None else None, method=method,
                      headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json", "Prefer": "return=minimal"})
    try:
        with urlopen(request, timeout=30) as response:
            body = response.read()
            return json.loads(body) if body else None
    except HTTPError as error:
        # Never print backend response bodies, employee data, or credentials.
        raise CollectorError(f"Database request failed (HTTP {error.code}); retry after reconciliation") from None
    except OSError:
        raise CollectorError("Database connection failed; retry the same scan") from None


def load_configuration(path: str, mapped_team: bool = True):
    config = json.loads(Path(path).read_text(encoding="utf-8-sig"))
    approved = json.loads(Path(__file__).with_name("config.example.json").read_text(encoding="utf-8-sig"))["team_names"]
    config["team_names"] = select_roster(config["team_names"], approved, mapped_team)
    names = config["team_names"]
    stores = config["stores"]
    if not names or not all(isinstance(name, str) and name.strip() for name in names):
        raise CollectorError("Configure the team roster")
    if len({normalize_name(name) for name in names}) != len(names):
        raise CollectorError("Roster names must be unambiguous")
    chats: set[int] = set()
    for store in stores:
        if not isinstance(store.get("chat_id"), int) or not isinstance(store.get("sender_id"), int):
            raise CollectorError("Set every configured store's exact numeric group and assistant sender IDs; remove unconfigured stores from the local config")
        if store["chat_id"] in chats:
            raise CollectorError("Each configured group must identify one store")
        chats.add(store["chat_id"])
        ZoneInfo(store["timezone"])
        if store.get("topic") not in (None, "general"):
            raise CollectorError("Store topic must be general or unset")
        if not store.get("location_names"):
            raise CollectorError("Configure each store's exact report location names")
    if not stores:
        raise CollectorError("Configure at least one store")
    return config


def persist_report(row: dict):
    identity = {"source_chat_id": f"eq.{row['source_chat_id']}", "source_message_id": f"eq.{row['source_message_id']}", "owner_id": f"eq.{row['owner_id']}"}
    existing = database("GET", "productivity_reports", {**identity, "select": "owner_id,store_id,work_date,points,rtf_revenue_cents,activity,source_chat_id,source_message_id,source_sent_at"})
    if existing:
        previous = existing[0]
        fields = ("owner_id", "store_id", "work_date", "rtf_revenue_cents", "activity", "source_chat_id", "source_message_id")
        if any(previous[field] != row[field] for field in fields) or Decimal(str(previous["points"])) != Decimal(row["points"]):
            raise CollectorError("A previously imported report changed; owner reconciliation is required")
        return False
    # A different message for the same person/store/day must never silently add or replace points.
    daily = database("GET", "productivity_reports", {"owner_id": f"eq.{row['owner_id']}", "store_id": f"eq.{row['store_id']}", "work_date": f"eq.{row['work_date']}", "select": "id"})
    if daily:
        raise CollectorError("A different report already covers this person/store/day; owner reconciliation is required")
    database("POST", "productivity_reports", payload=row)
    return True


async def scan(client: TelegramClient, config: dict, since: date, progress: Progress, rescan: bool = False):
    # Resolve only explicitly configured group IDs. Other dialog contents are never read.
    dialogs = await client.get_dialogs()
    entities = {utils.get_peer_id(dialog.entity): dialog.entity for dialog in dialogs}
    people = await asyncio.to_thread(database, "GET", "tracker_people", {"select": "user_id,report_name"})
    store_rows = await asyncio.to_thread(database, "GET", "tracker_stores", {"select": "id,name,timezone"})
    people_by_name = {normalize_name(person["report_name"]): person for person in people}
    if len(people_by_name) != len(people):
        raise CollectorError("Database report names are ambiguous")
    mapped = [name for name in config["team_names"] if normalize_name(name) in people_by_name]
    print(f"Roster: {len(mapped)} mapped of {len(config['team_names'])} configured names. Earliest requested work date: {since.isoformat()}.", flush=True)
    for name in config["team_names"]:
        if normalize_name(name) not in people_by_name:
            print(f"Roster mapping needed: {name}. This name will be skipped; no account is inferred.", flush=True)
    stores_by_name = {normalize_name(store["name"]): store for store in store_rows}
    imported, unchanged, unmapped, issues = 0, 0, 0, 0
    coverage = {normalize_name(name): {"imported": 0, "unchanged": 0, "issues": 0, "dates": set()} for name in config["team_names"]}
    for store in config["stores"]:
        first_work_date = None
        last_work_date = None
        before_imported, before_unchanged, before_issues = imported, unchanged, issues
        database_store = stores_by_name.get(normalize_name(store["name"]))
        entity = entities.get(store["chat_id"])
        if not database_store or database_store["timezone"] != store["timezone"] or entity is None:
            raise CollectorError("Store timezone or group access does not match the configured source")
        zone = ZoneInfo(store["timezone"])
        # Include the first report date after the selected work date. Scan by original sent time, not edit time.
        earliest = datetime.combine(since + timedelta(days=1), time.min, tzinfo=zone)
        identities = [(normalize_name(name), people_by_name.get(normalize_name(name), {}).get("user_id")) for name in config["team_names"]]
        stream = stream_key(os.environ["SUPABASE_URL"], {**store, "database_store_id": database_store["id"]}, since.isoformat(), identities)
        print(f"{store['name']}: saved message {progress.cursor(stream)}, {len(progress.pending(stream))} pending retries.", flush=True)
        async for message in incremental_messages(client, entity, progress, stream, earliest, rescan):
            if message.date < earliest:
                progress.record(stream, message.id, False)
                continue
            if not matches_topic(message, store.get("topic")):
                progress.record(stream, message.id, False)
                continue
            if message.sender_id != store["sender_id"] or not message.raw_text:
                progress.record(stream, message.id, False)
                continue
            try:
                results = parse_report(message.raw_text, config["team_names"], store["location_names"])
            except ReportError as error:
                issues += 1
                print(f"Source {store['chat_id']}/{message.id}: {error}", flush=True)
                progress.record(stream, message.id, True)
                continue
            message_failed = False
            work_date = (message.date.astimezone(zone).date() - timedelta(days=1)).isoformat()
            for result in results:
                report_name = result.pop("report_name")
                person = people_by_name.get(normalize_name(report_name))
                person_coverage = coverage[normalize_name(report_name)]
                if person is None:
                    unmapped += 1
                    message_failed = True
                    print(f"Unmapped team member: {report_name}. Link this exact report_name to their account in tracker_people.", flush=True)
                    continue
                row = {**result, "owner_id": person["user_id"], "store_id": database_store["id"], "work_date": work_date,
                       "source_chat_id": str(store["chat_id"]), "source_message_id": message.id,
                       "source_sent_at": message.date.astimezone(timezone.utc).isoformat()}
                try:
                    inserted = await asyncio.to_thread(persist_report, row)
                    imported += int(inserted)
                    unchanged += int(not inserted)
                    person_coverage["imported"] += int(inserted)
                    person_coverage["unchanged"] += int(not inserted)
                    person_coverage["dates"].add(work_date)
                    first_work_date = min(first_work_date, work_date) if first_work_date else work_date
                    last_work_date = max(last_work_date, work_date) if last_work_date else work_date
                except CollectorError as error:
                    issues += 1
                    message_failed = True
                    person_coverage["issues"] += 1
                    print(f"Source {store['chat_id']}/{message.id}, {report_name}: {error}", flush=True)
            progress.record(stream, message.id, message_failed)
        pending_count = len(progress.pending(stream))
        if pending_count:
            # Includes unavailable/deleted messages retained in the retry queue.
            issues += pending_count
            print(f"{store['name']}: {pending_count} messages remain pending; collection will retry them.", flush=True)
        print(f"{store['name']}: {imported - before_imported} imported, {unchanged - before_unchanged} unchanged, {issues - before_issues} issues. Observed mapped work dates: {first_work_date or 'none'} to {last_work_date or 'none'}. Coverage is not verified.", flush=True)
    for name in config["team_names"]:
        person_coverage = coverage[normalize_name(name)]
        dates = person_coverage["dates"]
        status = "mapped" if normalize_name(name) in people_by_name else "MAPPING NEEDED"
        print(f"{name} ({status}): {person_coverage['imported']} imported, {person_coverage['unchanged']} unchanged, {person_coverage['issues']} issues; {len(dates)} observed work dates, {min(dates) if dates else 'none'} to {max(dates) if dates else 'none'}. Coverage is not verified.", flush=True)
    print(f"Scan complete: {imported} imported, {unchanged} unchanged, {unmapped} unmatched account mappings, {issues} issues.", flush=True)
    return issues + unmapped


async def main():
    parser = argparse.ArgumentParser(description="Read configured assistant reports using your own Telegram account")
    parser.add_argument("--config", default="collector/config.local.json")
    parser.add_argument("--since", required=True, type=date.fromisoformat, help="Earliest local work date to read (YYYY-MM-DD)")
    parser.add_argument("--watch", action="store_true", help="Repeat scans every 120 seconds while this process stays running")
    parser.add_argument("--rescan", action="store_true", help="Explicitly reread history from --since to reconcile edits or missing database rows")
    roster_mode = parser.add_mutually_exclusive_group()
    roster_mode.add_argument("--mapped-team", dest="mapped_team", action="store_true", help="Use the approved team roster (default); import only exact mapped names")
    roster_mode.add_argument("--configured-roster", dest="mapped_team", action="store_false", help="Explicitly use only the local config's team_names")
    parser.set_defaults(mapped_team=True)
    args = parser.parse_args()
    config = load_configuration(args.config, args.mapped_team)
    for variable in ("TELEGRAM_API_ID", "TELEGRAM_API_HASH", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"):
        if not os.environ.get(variable):
            raise CollectorError(f"Set {variable} in the private process environment")
    session_path = Path(os.environ.get("TELEGRAM_SESSION_PATH", ".secrets/telegram-owner"))
    session_path.parent.mkdir(parents=True, exist_ok=True)
    progress = Progress(Path(".secrets/collector-progress.sqlite3"))
    client = TelegramClient(str(session_path), int(os.environ["TELEGRAM_API_ID"]), os.environ["TELEGRAM_API_HASH"])
    try:
        await client.start()
        rescan = args.rescan
        while True:
            try:
                issues = await scan(client, config, args.since, progress, rescan)
                # An explicit reconciliation scan happens once, then watch resumes incrementally.
                rescan = False
                if not args.watch:
                    if issues:
                        raise CollectorError("Some messages or account mappings need reconciliation; no conflicting totals were overwritten")
                    break
                await asyncio.sleep(120)
            except FloodWaitError as error:
                if not args.watch:
                    raise CollectorError(f"Telegram requested a wait of {error.seconds} seconds; run again later") from None
                await asyncio.sleep(error.seconds + 1)
            except (CollectorError, OSError) as error:
                if not args.watch:
                    raise
                print(f"Collection interrupted: {error}. Retrying from saved progress in 120 seconds.", flush=True)
                await asyncio.sleep(120)
    finally:
        progress.close()
        await client.disconnect()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (CollectorError, KeyError, ValueError) as error:
        print(f"Collector stopped: {error}", flush=True)
        raise SystemExit(1) from None
