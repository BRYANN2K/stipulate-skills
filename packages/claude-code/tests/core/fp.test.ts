// Attempt 10: the main-session filter refuses the ENGINE (and approval tokens), not the `.workflow/`
// folder. False positives found in verification, plus the true positives that must stay refused.
import { describe, expect, test } from 'claude-code/testing'

import { mainBash, workerBash } from '../../hooks/core/guards.ts'
import { ROOT, World, delegateAndLaunch, install, parse } from './harness.ts'

describe('main-session Bash: .workflow paths are not the engine', () => {
  const allowed = [
    `cd /p/.workflow/.runtime/c/worktrees/t-1 && python3 -c "import sys;sys.path.insert(0,'src');import a;print(a.greet('Ann'))"`,
    `python3 -c "print(1)" > .workflow/changes/c/notes.txt`,
    `cd /p/.workflow/.runtime/c/worktrees/t-1 && python3 -m pytest -q`,
    `python3 -c "import json;print(json.load(open('.workflow/config.json')))"`,
    `cat .workflow/changes/c/spec.md | python3 -c "import sys; print(len(sys.stdin.read()))"`,
    `python3 scripts/workflow.py status c --compact`,
    `python3 scripts/workflow.py runtime show c`,
  ]
  for (const c of allowed)
    test(`allowed: ${c}`, () => {
      expect(mainBash(c)).toBeNull()
    })

  const refused = [
    `python3 -c "import subprocess;subprocess.run(['python3','scripts/workflow.py','approve','c','--by','user','--ack-user-approval'])"`,
    `python3 -c "import subprocess;subprocess.run(['python3','scripts/work'+'flow.py','appr'+'ove','c'])"`,
    `python3 -c "import runpy; runpy.run_path('scripts/' + 'workflow' + '.py')" approve c`,
    `python3 -m scripts.workflow approve c --by user --ack-user-approval`,
    `python3 -m workflow runtime review c --task t --decision accepted --reason xxxxxxxx`,
    `python3 $(echo c2NyaXB0cy93b3JrZmxvdy5weQ== | base64 -d) approve c`,
    `echo cHl0aG9u | base64 -d | sh`,
    `python3 scripts/workflow.py runtime settle c --task t --attempt 1 --status returned`,
    `X=approve; python3 scripts/workflow.py $X c --by user --ack`,
    `python3 .workflow/../scripts/workflow.py approve c --by user --ack`,
  ]
  for (const c of refused)
    test(`refused: ${c}`, () => {
      expect(mainBash(c)).not.toBeNull()
    })

  test('workers: the module form and assembled names are the engine too', () => {
    expect(workerBash('python3 -m scripts.workflow check c --results r.json')).not.toBeNull()
    expect(workerBash(`python3 -c "import runpy; runpy.run_path('scripts/work' + 'flow.py')"`)).not.toBeNull()
    expect(workerBash('python3 -c "print(open(\'.workflow/changes/c/spec.md\').read())"')).toBeNull()
  })
})

describe('integration reports skipped build artefacts', () => {
  test('a successful integration that skipped caches says so; no cleanup advice', async ($, on) => {
    const w = new World()
    w.files.set(`${ROOT}/.workflow/config.json`, JSON.stringify({ orchestration: { clients: { 'claude-code': { defaults: { max_workers: 3, max_shared_writers: 2 } } } } }))
    w.integrateSkipped = [
      { path: 'src/core/__pycache__/a.cpython-312.pyc', reason: 'build artefact' },
      { path: '.pytest_cache/v/cache/nodeids', reason: 'build artefact' },
      { path: 'src/core/local.env', reason: 'gitignored' },
    ]
    install(on, w)
    await $.session.start({ cwd: ROOT, surface: null, isInteractive: true })
    const agent = (await delegateAndLaunch($, w, 'core')).agent_id as string
    await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't', agentId: agent, reason: 'answer' } as never)
    const out = parse(await $.tool.call({ tool: 'mcp__stipulate__stip_contribution', change_id: 'demo', task_id: 'core', decision: 'accepted', reason: 'checked the diff and tests' } as never))
    expect(out.integration.note).toMatch(/2 build artefacts \(__pycache__, \.pytest_cache\) and 1 gitignored file/)
    expect(out.integration.skipped).toHaveLength(3)
  })
})
