# Launch thread for X

Post 1 carries the native video and no link: links in the first post reduce reach on X. Pin post 2 as the first reply. Each post stays under 280 characters (X counts a link as 23).

Before posting:

- Push `main`, so `npx github:BRYANN2K/stipulate-skills` installs the Claude Code mod.
- Use the film version with the original alert sound, not the Metal Gear Solid one (copyright).
- Keep the music credit.

## 1/ (native video, no link)

I built the Claude Code mod I wanted: you sign the spec, a crew of Claude models ships it.

Works in the terminal and the desktop app.

## 2/ (reply, pin it)

Install in your project:
npx github:BRYANN2K/stipulate-skills --agent claude-code

Source, docs and screenshots: github.com/BRYANN2K/stipulate-skills

How it works ↓

## 3/

1. /stip-explore: you and the orchestrator settle the problem, the edge cases and which domain extensions apply (security, backend, CLI…). Nothing is coded yet.

## 4/

2. /stip-validate writes the spec: scope, numbered acceptance criteria, and a task plan with an owner for each file. Only you can approve it, with a button. The model can't approve its own work.

## 5/

3. Apply: each task goes to a worker with its own model and effort, for example Opus to build, Haiku to research, Sonnet for docs. Writers run in parallel git worktrees and can only touch the files they own.

## 6/

4. Check: a different session verifies every criterion against the integrated result and records pass, fail or unverified, with evidence. A failure goes back to the same task as a correction.

## 7/

5. Docs, then archive: the spec is promoted, the change is filed with who ran what on which model, and one scoped local commit is made. Nothing is pushed for you.

## 8/

The skills also work in Codex and OpenCode. The guards coordinate the agents; they are not a sandbox. Apache-2.0.

Music: Better Days by Infraction

## After posting

Answer every reply during the first hour: replies are the strongest ranking signal on X.
