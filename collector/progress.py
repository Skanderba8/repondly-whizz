"""Private local cursors and retry IDs. Report content stays in Supabase."""

import hashlib
import json
import sqlite3
from pathlib import Path


def stream_key(project: str, store: dict, since: str, identities: list[tuple[str, str | None]]) -> str:
    scope = {"version": 1, "project": project.rstrip("/"), "store": store,
             "since": since, "identities": sorted(identities)}
    return hashlib.sha256(json.dumps(scope, sort_keys=True).encode()).hexdigest()


class Progress:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(path)
        self.connection.execute("create table if not exists cursors (stream text primary key, message_id integer not null)")
        self.connection.execute("create table if not exists retries (stream text not null, message_id integer not null, primary key (stream, message_id))")
        self.connection.commit()

    def cursor(self, stream: str) -> int:
        row = self.connection.execute("select message_id from cursors where stream = ?", (stream,)).fetchone()
        return row[0] if row else 0

    def pending(self, stream: str) -> list[int]:
        return [row[0] for row in self.connection.execute(
            "select message_id from retries where stream = ? order by message_id", (stream,))]

    def record(self, stream: str, message_id: int, failed: bool):
        # Queue a retry and advance together. A crash can never silently skip a failed message.
        with self.connection:
            if failed:
                self.connection.execute("insert or ignore into retries values (?, ?)", (stream, message_id))
            else:
                self.connection.execute("delete from retries where stream = ? and message_id = ?", (stream, message_id))
            self.connection.execute(
                "insert into cursors values (?, ?) on conflict(stream) do update set message_id = max(cursors.message_id, excluded.message_id)",
                (stream, message_id),
            )

    def close(self):
        self.connection.close()


async def incremental_messages(client, entity, progress: Progress, stream: str, earliest, rescan: bool):
    cursor = 0 if rescan else progress.cursor(stream)
    # Retry individual failures without downloading the intervening history again.
    if not rescan:
        for message_id in progress.pending(stream):
            message = await client.get_messages(entity, ids=message_id)
            if message is None:
                print(f"Pending source message {message_id} is unavailable; retained for owner reconciliation.", flush=True)
            else:
                yield message
    options = {"limit": None, "reverse": True}
    if cursor:
        options["min_id"] = cursor
    else:
        # Telegram offsets are exclusive. Include a message at the exact lower boundary.
        from datetime import timedelta
        options["offset_date"] = earliest - timedelta(seconds=1)
    async for message in client.iter_messages(entity, **options):
        yield message
