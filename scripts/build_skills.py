#!/usr/bin/env python3
"""Package one canonical engine into seven independently installable skills."""
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'scripts/workflow.py').read_bytes()
check='--check' in sys.argv
failed=[]
for p in sorted((ROOT/'skills').glob('spec-*/SKILL.md')):
    target=p.parent/'scripts/workflow.py'
    if check:
        if not target.exists() or target.read_bytes()!=source:failed.append(str(target))
    else:
        target.parent.mkdir(exist_ok=True)
        target.write_bytes(source)
if failed:
    print('Stale packaged runtimes: '+', '.join(failed),file=sys.stderr)
    sys.exit(1)
print('Seven runtime copies match canonical source.' if check else 'Packaged skill runtimes.')
