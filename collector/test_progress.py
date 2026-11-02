import unittest
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace

from progress import Progress, incremental_messages, stream_key


class ProgressTests(unittest.TestCase):
    def test_restart_preserves_cursor_and_failed_message_until_success(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / "progress.sqlite3"
            progress = Progress(path)
            progress.record("source", 10, True)
            progress.record("source", 20, False)
            progress.close()
            reopened = Progress(path)
            try:
                self.assertEqual(reopened.cursor("source"), 20)
                self.assertEqual(reopened.pending("source"), [10])
                reopened.record("source", 10, False)
                self.assertEqual(reopened.cursor("source"), 20)
                self.assertEqual(reopened.pending("source"), [])
                self.assertEqual(reopened.cursor("another-source"), 0)
            finally:
                reopened.close()

    def test_new_mapping_or_earlier_start_has_independent_progress(self):
        store = {"chat_id": 1}
        original = stream_key("https://example.invalid", store, "2026-07-01", [("example", None)])
        mapped = stream_key("https://example.invalid", store, "2026-07-01", [("example", "account")])
        earlier = stream_key("https://example.invalid", store, "2026-06-01", [("example", None)])
        self.assertNotEqual(original, mapped)
        self.assertNotEqual(original, earlier)


class FakeClient:
    def __init__(self):
        self.options = None
        self.requested_ids = []

    async def get_messages(self, entity, ids):
        self.requested_ids.append(ids)
        return SimpleNamespace(id=ids)

    async def iter_messages(self, entity, **options):
        self.options = options
        yield SimpleNamespace(id=30)


class IncrementalTests(unittest.IsolatedAsyncioTestCase):
    async def test_retry_then_only_newer_messages(self):
        with TemporaryDirectory() as directory:
            progress = Progress(Path(directory) / "progress.sqlite3")
            try:
                progress.record("source", 10, True)
                progress.record("source", 20, False)
                client = FakeClient()
                earliest = datetime(2026, 7, 2, tzinfo=timezone.utc)
                messages = [message.id async for message in incremental_messages(
                    client, "group", progress, "source", earliest, False)]
                self.assertEqual(messages, [10, 30])
                self.assertEqual(client.options, {"limit": None, "reverse": True, "min_id": 20})
                self.assertEqual(client.requested_ids, [10])
            finally:
                progress.close()

    async def test_explicit_rescan_uses_date_instead_of_saved_cursor(self):
        with TemporaryDirectory() as directory:
            progress = Progress(Path(directory) / "progress.sqlite3")
            try:
                progress.record("source", 20, False)
                client = FakeClient()
                earliest = datetime(2026, 7, 2, tzinfo=timezone.utc)
                async for message in incremental_messages(client, "group", progress, "source", earliest, True):
                    pass
                self.assertNotIn("min_id", client.options)
                self.assertLess(client.options["offset_date"], earliest)
                self.assertEqual(progress.cursor("source"), 20)
            finally:
                progress.close()
