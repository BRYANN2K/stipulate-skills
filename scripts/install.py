#!/usr/bin/env python3
"""Install or remove only the seven owned skills. No network or global configuration edits."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import sys
import tempfile

ROOT=Path(__file__).resolve().parents[1]
OWNER='.spec-workflow-owner.json'

def hashes(folder):
    result={}
    for p in folder.rglob('*'):
        if p.is_symlink():raise ValueError(f'Unexpected symlink: {p}')
        if p.is_file() and p.name!=OWNER and '__pycache__' not in p.parts:
            result[str(p.relative_to(folder))]=hashlib.sha256(p.read_bytes()).hexdigest()
    return result

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--destination',required=True)
    parser.add_argument('--uninstall',action='store_true')
    parser.add_argument('--dry-run',action='store_true')
    args=parser.parse_args()
    dest=Path(args.destination).expanduser().absolute()
    if dest.resolve()!=dest:raise ValueError('Use a physical destination path.')
    sources=sorted((ROOT/'skills').glob('spec-*'))
    if len(sources)!=7:raise ValueError('Expected exactly seven core packages.')
    for source in sources:
        target=dest/source.name
        if target.exists() or target.is_symlink():
            if target.is_symlink():raise ValueError(f'Will not replace symlink: {target}')
            owner=target/OWNER
            if not owner.is_file():raise ValueError(f'Foreign directory: {target}')
            record=json.loads(owner.read_text())
            if record.get('owner')!='BRYANN2K/spec-workflow' or record.get('files')!=hashes(target):
                raise ValueError(f'Changed or foreign installation: {target}; preserve and reconcile it first.')
    if args.dry_run:
        print(json.dumps({'action':'uninstall' if args.uninstall else 'install','destination':str(dest),'skills':[p.name for p in sources]},indent=2));return
    dest.mkdir(parents=True,exist_ok=True)
    for source in sources:
        target=dest/source.name
        if args.uninstall:
            if target.exists():shutil.rmtree(target)
            continue
        staged=Path(tempfile.mkdtemp(prefix='.spec-install-',dir=dest))
        try:
            shutil.copytree(source,staged,dirs_exist_ok=True,ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
            (staged/OWNER).write_text(json.dumps({'owner':'BRYANN2K/spec-workflow','version':'2.0.0','files':hashes(staged)},indent=2)+'\n')
            backup=dest/(source.name+'.previous-install')
            if backup.exists():raise ValueError(f'Recovery directory exists: {backup}')
            if target.exists():target.rename(backup)
            try:staged.rename(target)
            except Exception:
                if backup.exists():backup.rename(target)
                raise
            if backup.exists():shutil.rmtree(backup)
        finally:
            if staged.exists():shutil.rmtree(staged)
    print(json.dumps({'status':'uninstalled' if args.uninstall else 'installed','destination':str(dest),'skills':[p.name for p in sources]},indent=2))
if __name__=='__main__':
    try:main()
    except (ValueError,OSError) as exc:print(str(exc),file=sys.stderr);sys.exit(1)
