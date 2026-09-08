#!/usr/bin/env python3
"""Generate portable runtimes and the bootstrap skill's complete domain catalog."""
from pathlib import Path
import shutil
import sys
ROOT = Path(__file__).resolve().parents[1]


def generated_files():
    result = {}
    for p in sorted((ROOT/'skills').glob('stip-*/SKILL.md')):
        result[p.parent/'scripts/workflow.py'] = ROOT/'scripts/workflow.py'
    bootstrap = ROOT/'skills/stip-bootstrap'
    for name in ('setup_stip.py', 'install_extensions.py'):
        result[bootstrap/'scripts'/name] = ROOT/'scripts'/name
    for source in sorted((ROOT/'extensions').rglob('*')):
        if source.is_symlink():
            raise ValueError(f'Unexpected catalog symlink: {source}')
        if source.is_file() and '__pycache__' not in source.parts and source.suffix != '.pyc':
            result[bootstrap/'assets/extensions'/source.relative_to(ROOT/'extensions')] = source
    return result


def check_generated():
    mapping = generated_files()
    errors = [str(p.relative_to(ROOT)) for p,s in mapping.items()
              if p.is_symlink() or not p.is_file() or p.read_bytes() != s.read_bytes()]
    target = ROOT/'skills/stip-bootstrap/assets/extensions'
    errors += [str(p.relative_to(ROOT)) for p in target.rglob('*')
               if (p.is_file() or p.is_symlink()) and p not in mapping]
    return errors


def main():
    if '--check' not in sys.argv:
        mapping = generated_files()
        target = ROOT/'skills/stip-bootstrap/assets/extensions'
        if target.exists():
            shutil.rmtree(target)  # Generated catalog only; edit canonical extensions/.
        for destination, source in mapping.items():
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(source.read_bytes())
    errors = check_generated()
    if errors:
        print('Stale generated packages: '+', '.join(errors), file=sys.stderr)
        raise SystemExit(1)
    print('Seven runtime copies and bundled bootstrap catalog match canonical sources.')


if __name__ == '__main__':
    main()
