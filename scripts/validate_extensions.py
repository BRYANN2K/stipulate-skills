#!/usr/bin/env python3
"""Validate the shipped catalogue, portable references, and editorial case shape."""
import json
from pathlib import Path
import re

from install_extensions import CATALOG, PHASES, package


def validate():
    catalog = json.loads((CATALOG/'catalog.json').read_text())
    assert catalog['schema_version'] == 1
    names = [entry['id'] for entry in catalog['extensions']]
    assert len(names) == len(set(names)) == 28, 'Expected 28 unique extension ids'
    assert set(names) == {p.name for p in CATALOG.iterdir() if p.is_dir()}
    for name in names:
        base = package(name)
        assert not list(base.rglob('SKILL.md')), 'Extensions must not become discovery skills'
        manifest = json.loads((base/'extension.json').read_text())
        assert isinstance(manifest['description'], str) and manifest['description'].strip()
        for phase in PHASES:
            path = base/manifest[phase]
            content = path.read_text()
            assert content.strip() and len(content.split()) <= 1200, f'Unbounded phase reference: {path}'
            assert not re.search(r'AC-[A-Z0-9]+-\d+', content), f'Non-engine criterion id: {path}'
            for target in re.findall(r'\]\(([^)]+)\)', content):
                if target.startswith(('https://', 'http://', '#')):
                    continue
                relative = Path(target.split('#')[0])
                assert not relative.is_absolute() and '..' not in relative.parts, f'Nonportable link: {path}'
                assert (base/relative).is_file(), f'Broken link: {path}: {target}'
        cases = json.loads((base/'evaluation.json').read_text())
        assert cases['schema_version'] == 1 and cases['extension'] == name
        assert {c['id'] for c in cases['cases']} == {'relevant','irrelevant','existing','insufficient'}
        assert {c['expected'] for c in cases['cases']} == {'select','do-not-select','inspect-and-reuse','failed-or-unverified'}
        assert all(c['prompt'].strip() and c['reason'].strip() for c in cases['cases'])
        assert 'https://' in (base/'sources.md').read_text()
    return {'packages': len(names), 'phase_references': len(names)*4, 'editorial_cases':len(names)*4,
            'behavioral_evaluation_performed':False}


if __name__ == '__main__':
    print(json.dumps(validate(), indent=2))
