#!/usr/bin/env python3
"""Validate packaging, names, portable runtime copies and registry coverage."""
import build_skills
import json
from pathlib import Path
import re
import sys
ROOT=Path(__file__).resolve().parents[1]
EXPECTED={'stip-bootstrap','stip-explore','stip-validate','stip-apply','stip-check','stip-docs','stip-archive'}
def main():
    if build_skills.check_generated():raise ValueError('Stale generated files; run scripts/build_skills.py')
    records=json.loads((ROOT/'skill-registry.json').read_text())['skills']
    names=[r['name'] for r in records]
    if len(names)!=len(set(names)) or set(names)!=EXPECTED:raise ValueError('Core command registry mismatch')
    canonical=(ROOT/'scripts/workflow.py').read_bytes()
    for record in records:
        folder=ROOT/record['path'];text=(folder/'SKILL.md').read_text()
        if not text.startswith('---\n'):raise ValueError(f'Missing frontmatter: {folder}')
        front=text.split('---',2)[1]
        for field in ('name','description','license'):
            if not re.search(r'^'+field+r':\s*\S',front,re.M):raise ValueError(f'Missing {field}: {folder}')
        if f"name: {record['name']}\n" not in front:raise ValueError('Name does not match registry')
        if (folder/'scripts/workflow.py').read_bytes()!=canonical:raise ValueError('Stale runtime copy; run scripts/build_skills.py')
    print('PASS: seven core interfaces, metadata and packaged runtimes. This is not behavioral certification.')
if __name__=='__main__':
    try:main()
    except (ValueError,OSError,KeyError) as e:print(str(e),file=sys.stderr);sys.exit(1)
