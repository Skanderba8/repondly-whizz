import unittest

from report_parser import ReportError, parse_report


def example(name="Morgan Example", total="17", rtf="RTF: 4; $125.60"):
    return f"""Productivity Update (Yesterday’s Results)
Location: Example Store
Mechanics
Morgan Example
TOTAL POINTS: 999
CSRs
{name}
New subs issued: 1 bikes; $80.00
Bikes and batteries sold: 0 units; $0.00
{rtf}
RTC: 2; $10.00
Accessories sold: 1 units; $5.00
Total for the day: $220.60 - {total} POINTS
Outside Person
RTF: 90; $900.00
Total for the day: $900.00 - 900 POINTS
Low productivity (< 15 points):
CSRs: Nobody
"""


class ReportParserTests(unittest.TestCase):
    def parse(self, text):
        return parse_report(text, ["Morgan Example"], ["Example Store"])

    def test_only_allowlisted_csr_and_reported_total(self):
        rows = self.parse(example())
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["points"], "17")
        self.assertEqual(rows[0]["rtf_revenue_cents"], 12560)
        self.assertEqual(rows[0]["activity"]["rtf"], 4)

    def test_normalized_full_name(self):
        self.assertEqual(len(self.parse(example(name="  MORGAN   Example  "))), 1)

    def test_substring_name_does_not_match(self):
        self.assertEqual(self.parse(example(name="Morgan Example Junior")), [])

    def test_missing_rtf_does_not_invent_zero_commission(self):
        self.assertIsNone(self.parse(example(rtf=""))[0]["rtf_revenue_cents"])

    def test_zero_points_is_a_real_observation(self):
        self.assertEqual(self.parse(example(total="0"))[0]["points"], "0")

    def test_wrong_location_rejected(self):
        with self.assertRaises(ReportError):
            self.parse(example().replace("Location: Example Store", "Location: Other Store"))

    def test_missing_total_rejected(self):
        with self.assertRaises(ReportError):
            self.parse(example().replace("Total for the day: $220.60 - 17 POINTS", ""))

    def test_unknown_date_wording_rejected(self):
        with self.assertRaises(ReportError):
            self.parse(example().replace("Yesterday’s Results", "Last Week"))

    def duplicate_report(self, points="30", rtf="RTF: 1; $0.00", name="Morgan Example"):
        block = f"{name}\n{rtf}\nTotal for the day: $0.00 - {points} POINTS\n"
        return example().replace("Outside Person\n", block + "Outside Person\n")

    def test_same_message_selects_bonus_including_rtf_instead_of_highest_points(self):
        # Original: 17 * $0.50 + $125.60 * 2.5% = $11.64.
        # Duplicate: 20 * $0.50 + $0 * 2.5% = $10.00.
        rows = self.parse(self.duplicate_report(points="20"))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["points"], "17")
        self.assertEqual(rows[0]["activity"]["rtf"], 4)

    def test_higher_later_duplicate_replaces_entire_block_without_summing(self):
        rows = self.parse(self.duplicate_report(name=" MORGAN   EXAMPLE "))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["points"], "30")
        self.assertEqual(rows[0]["rtf_revenue_cents"], 0)
        self.assertIsNone(rows[0]["activity"]["accessories"])

    def test_identical_same_message_blocks_count_once(self):
        text = example()
        block = text.split("CSRs\n", 1)[1].split("Outside Person", 1)[0]
        rows = self.parse(text.replace("Outside Person\n", block + "Outside Person\n"))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["points"], "17")

    def test_conflicting_duplicate_with_unknown_commission_requires_reconciliation(self):
        with self.assertRaisesRegex(ReportError, "missing RTF"):
            self.parse(self.duplicate_report(rtf=""))

    def test_equal_bonus_with_different_fields_requires_reconciliation(self):
        with self.assertRaisesRegex(ReportError, "tie"):
            self.parse(self.duplicate_report(points="20", rtf="RTF: 1; $65.60"))

    def test_separate_messages_keep_their_own_results(self):
        self.assertEqual(self.parse(example(total="10"))[0]["points"], "10")
        self.assertEqual(self.parse(example(total="20"))[0]["points"], "20")

    def test_different_people_are_never_compared(self):
        rows = parse_report(self.duplicate_report(name="Taylor Example"),
                            ["Morgan Example", "Taylor Example"], ["Example Store"])
        self.assertEqual([(row["report_name"], row["points"]) for row in rows],
                         [("Morgan Example", "17"), ("Taylor Example", "30")])


if __name__ == "__main__":
    unittest.main()
