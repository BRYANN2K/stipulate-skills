#!/usr/bin/env python3
"""Prepare Stip and make the bundled domain catalog available in one project.

Preserve existing configured packages (including disabled or customized ones).
This does not select extensions for a change or load domain instructions.
"""
import argparse
import json
from pathlib import Path
import sys
import install_extensions
import workflow


def setup(root):
    workflow.require(root.is_dir() and root.resolve() == root,
                     'Use an existing physical project directory.')
    catalog = workflow.read_json(install_extensions.CATALOG / 'catalog.json')
    workflow.require(catalog.get('schema_version') == 1, 'Unsupported bundled catalog.')
    names = [record['id'] for record in catalog['extensions']]
    workflow.require(len(names) == len(set(names)), 'Duplicate catalog ids.')
    # Check distribution integrity before creating any project metadata.
    for name in names:
        install_extensions.package(name)
    with workflow.lock(root):
        boot = workflow.bootstrap(root, None)
        config = workflow.config(root)
        preserved = sorted(set(names) & set(config['extensions']))
        missing = [name for name in names if name not in config['extensions']]
        result = install_extensions.install(root, missing) if missing else {'available': []}
    return {**boot, 'catalog_packages': len(names),
            'added': [entry['id'] for entry in result['available']],
            'preserved': preserved, 'selected_for_changes': [],
            'message': 'Select relevant enabled extensions during stip-explore. Existing configuration and packages were preserved.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, help='Existing physical project root')
    args = parser.parse_args()
    print(json.dumps(setup(Path(args.root).absolute()), indent=2))


if __name__ == '__main__':
    try:
        main()
    except (workflow.WorkflowError, OSError, ValueError, KeyError, TypeError) as exc:
        print(json.dumps({'error': str(exc)}), file=sys.stderr)
        raise SystemExit(1)
