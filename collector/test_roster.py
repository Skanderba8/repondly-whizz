import unittest

from roster import select_roster


class RosterTests(unittest.TestCase):
    def test_team_mode_uses_only_the_approved_roster_without_mutating_local_settings(self):
        configured = ["Morgan Example"]
        approved = ["Morgan Example", "Taylor Example"]
        self.assertEqual(select_roster(configured, approved, True), approved)
        self.assertEqual(configured, ["Morgan Example"])

    def test_existing_own_only_mode_stays_available(self):
        self.assertEqual(select_roster(["Morgan Example"], ["Taylor Example"], False), ["Morgan Example"])

    def test_ambiguous_normalized_names_are_rejected(self):
        with self.assertRaises(ValueError):
            select_roster([], ["Morgan Example", " MORGAN  EXAMPLE "], True)


if __name__ == "__main__":
    unittest.main()
