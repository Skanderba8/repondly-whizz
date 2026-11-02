"""Exact roster selection; never infer identities from similar names."""

from report_parser import normalize_name


def select_roster(configured: list[str], approved: list[str], mapped_team: bool) -> list[str]:
    names = approved if mapped_team else configured
    if not names or any(not isinstance(name, str) or not name.strip() for name in names):
        raise ValueError("Configure a nonempty roster of full names")
    if len({normalize_name(name) for name in names}) != len(names):
        raise ValueError("Roster names must be unambiguous")
    return list(names)
