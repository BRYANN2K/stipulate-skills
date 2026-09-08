#!/usr/bin/env python3
"""Install seven explicit OpenCode slash commands without replacing custom files."""
import argparse
import json
from pathlib import Path
import sys

BASE = Path(__file__).resolve().parents[1]
CATALOG = BASE / 'assets/opencode-commands'
if not CATALOG.is_dir():
    CATALOG = BASE / 'skills/stip-bootstrap/assets/opencode-commands'


def install(destination, dry_run=False):
    destination = Path(destination).expanduser().absolute()
    if destination.resolve() != destination:
        raise ValueError('Use a physical destination path, without symlinks.')
    sources = sorted(CATALOG.glob('stip-*.md'))
    if len(sources) != 7:
        raise ValueError('Expected seven command templates.')
    pending = []
    for source in sources:
        target = destination / source.name
        if target.is_symlink():
            raise ValueError(f'Will not replace symlink: {target}')
        if target.exists():
            if not target.is_file() or target.read_bytes() != source.read_bytes():
                raise ValueError(f'Conflicting command: {target}; preserve and reconcile it first.')
        else:
            pending.append((source, target))
    created = []
    if not dry_run:
        destination.mkdir(parents=True, exist_ok=True)
        try:
            for source, target in pending:
                with target.open('xb') as stream:
                    created.append(target)
                    stream.write(source.read_bytes())
        except OSError:
            for target in created:
                target.unlink()
            raise
    return {'destination': str(destination), 'dry_run': dry_run,
            'commands': [p.stem for p in sources], 'added': [p.name for _, p in pending]}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--destination', required=True)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    try:
        print(json.dumps(install(args.destination, args.dry_run), indent=2))
    except (OSError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
