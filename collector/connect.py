"""Interactive local account/source setup. Reads Telegram; never sends messages."""

import asyncio
import json
import os
from pathlib import Path

from telethon import TelegramClient, utils
from topics import matches_topic


async def main():
    for key in ("TELEGRAM_API_ID", "TELEGRAM_API_HASH"):
        if not os.environ.get(key):
            raise ValueError(f"Set {key} in this terminal first")
    root = Path(__file__).resolve().parent
    target = root / "config.local.json"
    template = json.loads((root / "config.example.json").read_text(encoding="utf-8-sig"))
    config = json.loads(target.read_text(encoding="utf-8-sig")) if target.exists() else {"stores": [], "team_names": template["team_names"]}
    session = Path(os.environ.get("TELEGRAM_SESSION_PATH", ".secrets/telegram-owner"))
    session.parent.mkdir(parents=True, exist_ok=True)
    client = TelegramClient(str(session), int(os.environ["TELEGRAM_API_ID"]), os.environ["TELEGRAM_API_HASH"])
    await client.start()
    try:
        for index, store in enumerate(template["stores"], 1):
            print(f"{index}. {store['name']}")
        store_index = int(input("Store number to connect: ")) - 1
        if not 0 <= store_index < len(template["stores"]):
            raise ValueError("Choose a listed store number")
        store = dict(template["stores"][store_index])
        existing_store = next((entry for entry in config["stores"] if entry["name"] == store["name"]), None)
        if existing_store:
            store.update(existing_store)
        search = input("Part of the Telegram group title: ").strip().casefold()
        if not search:
            raise ValueError("Enter part of the group title")
        dialogs = await client.get_dialogs()
        matches = [dialog for dialog in dialogs if dialog.is_group and search in dialog.name.casefold()]
        if not matches:
            raise ValueError("No matching groups found in this account")
        for index, dialog in enumerate(matches, 1):
            print(f"{index}. {dialog.name} ({utils.get_peer_id(dialog.entity)})")
        group_index = int(input("Group number: ")) - 1
        if not 0 <= group_index < len(matches):
            raise ValueError("Choose a listed group number")
        group = matches[group_index]
        if getattr(group.entity, "forum", False):
            store["topic"] = "general"
            print("This group uses topics. Looking for reports in General only.")
        else:
            store.pop("topic", None)
        reports = []
        async for message in client.iter_messages(group.entity, limit=500):
            if not matches_topic(message, store.get("topic")):
                continue
            if "productivity update" in (message.raw_text or "").casefold() and message.sender_id is not None:
                reports.append(message)
                if len(reports) == 10:
                    break
        if not reports:
            raise ValueError("No productivity report found in the latest 500 messages")
        for index, report in enumerate(reports, 1):
            print(f"{index}. Message {report.id}, sent {report.date.isoformat()}, sender ID {report.sender_id}")
        report_index = int(input("Choose a message you verified is from Whizz IT Assistant in Telegram: ")) - 1
        if not 0 <= report_index < len(reports):
            raise ValueError("Choose a listed message number")
        store["chat_id"] = utils.get_peer_id(group.entity)
        store["sender_id"] = reports[report_index].sender_id
        location = input(f"Exact Location value in that report [{store['name']}]: ").strip()
        if location and location not in store["location_names"]:
            store["location_names"].append(location)
        config["stores"] = [entry for entry in config["stores"] if entry["name"] != store["name"]] + [store]
        target.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Connected {store['name']}. Saved source IDs locally. No reports were imported. Run again to add another store.")
    finally:
        await client.disconnect()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except ValueError as error:
        print(f"Setup stopped: {error}")
        raise SystemExit(1) from None
