"""Windowless Task Scheduler entry point. No Telegram or database logic lives here."""

import os
from pathlib import Path
import subprocess


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    powershell = Path(os.environ['SystemRoot']) / 'System32/WindowsPowerShell/v1.0/powershell.exe'
    try:
        result = subprocess.run(
            [str(powershell), '-NoLogo', '-NoProfile', '-NonInteractive',
             '-ExecutionPolicy', 'Bypass', '-File', str(root / 'collector/desktop.ps1'),
             '-Mode', 'Scheduled'],
            cwd=root,
            creationflags=subprocess.CREATE_NO_WINDOW,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
        return result.returncode
    except OSError:
        private_directory = root / '.secrets'
        private_directory.mkdir(exist_ok=True)
        (private_directory / 'collector-launch-error.txt').write_text(
            'Hidden launcher failed to start PowerShell. Rerun Fix scraper popups.cmd.',
            encoding='utf-8',
        )
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
