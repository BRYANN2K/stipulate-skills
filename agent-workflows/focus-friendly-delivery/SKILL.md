---
name: focus-friendly-delivery
description: "Use when a user explicitly asks for ADHD-friendly, action-first, one-step-at-a-time, exact-command, scannable, or low-overload responses, or has an established preference for that presentation. Adapts delivery without replacing domain workflow, safety, authorization, or verification, and never infers a diagnosis from writing behavior."
license: Apache-2.0
compatibility: Works with any Agent Skills-compatible client. No tools are required; apply it alongside the relevant domain skill.
metadata:
  version: "1.0.0"
  author: BRYANN2K
  category: agent-workflows
  tags: focus-friendly, presentation, action-first, exact-commands, progressive-disclosure, accessibility
---

# Focus-Friendly Delivery

## Overview

Adapt the presentation of an answer or an active task so the current result, action, and evidence are easy to find. This is a delivery adapter, not a diagnosis, persona, planning system, execution workflow, or quality gate. Keep using the applicable domain skill and its real completion criteria.

The adapter may reorder, group, or progressively disclose information. It may not remove a prerequisite, risk, authorization boundary, required domain detail, failed check, uncertainty, or evidence limitation. Match the amount of detail to the task and the user's request rather than to a universal brevity rule.

## When to use

Use this skill when at least one of these is established:

- the user asks for “ADHD-friendly,” “focus-friendly,” “action first,” “one step at a time,” “exact commands,” “scannable,” “low overload,” or equivalent delivery;
- the user asks to receive only the current action before later actions;
- an explicit preference saved from the user establishes this presentation style.

An established preference must come from the user or a user-approved preference store. Do not infer it from typos, terse replies, silence, confusion, repeated questions, abandoned work, or apparent difficulty. Those signals do not establish a diagnosis, capacity, or preferred communication style.

Do not load this skill merely because a task is complex or has several steps. Do not present its use as medical support or as evidence that the user has ADHD. If the user asks for a machine-readable format, code only, a detailed tutorial, or another explicit format, honor that format without adding visible adapter scaffolding that would violate it.

## Precedence and scope

Resolve conflicts in this order:

1. safety and authorization;
2. explicit user format;
3. the domain contract;
4. truthful evidence;
5. presentation.

Action-first never means risky-action-first. Before a destructive, privileged, live, remote, paid, or difficult-to-reverse effect, make the missing authority, prerequisite, preview, or safer inspection the immediate action. Never place a destructive command before the information needed to judge and authorize it.

When tools and authority allow the agent to inspect, edit, run, or verify the work, do that work. Do not turn agent-owned work into a checklist for the user. Give a manual action packet only when the user asked to act manually, the action genuinely requires them, access is unavailable, or an authorization boundary requires their decision.

## Workflow

This workflow selects a presentation lane; it does not add phases or gates to the underlying task.

### 1. Confirm the trigger and preserve the real contract

Use the user's explicit phrase or established preference. Do not ask about a diagnosis. Extract the requested outcome, format, authority, safety constraints, domain-required information, and proof obligations exactly as the applicable workflow requires.

If exact commands, file locations, symbols, current lines, or replacement text will be shown, inspect the relevant environment first. Never make a guessed path or stale line number look verified.

### 2. Perform agent-owned work

Take every safe, authorized action available to the agent before asking the user to do anything. Use focused checks after the last relevant change. Keep passed, failed, skipped, unavailable, and unverified results distinct.

Pause only for a real blocker: missing authority, unavailable access, an undiscoverable value, an external action only the user can perform, or a consequential ambiguity. Ask one blocking question when one answer unlocks the work; do not surround it with a speculative plan.

### 3. Choose the lane that matches the current need

#### Direct answer

Lead with the answer. For a simple factual question, calculation, acknowledgment, or requested code-only response, return the answer without manufacturing steps, headings, a progress report, or a `Next:` line.

Add a caveat only when it changes how the answer should be used. Concision must not erase needed explanation or uncertainty.

#### Manual action packet

Show the current action, not the whole future workflow. Include only applicable fields, in this order:

```text
Do now
<one exact action or command>

Target
<inspected path plus symbol or current lines, when inspection established them>

Replace with
<complete replacement content, when replacement is required>

Check
<focused verification command or observation>
Expected: <specific success signal>

If it fails
<one first recovery or evidence-gathering action>
```

Make the packet executable as written:

- state the working directory, environment, privilege, dependency, or service prerequisite before the command when it matters;
- fill known values instead of leaving `<path>`, ellipses, `TODO`, “rest unchanged,” or other placeholders in a real packet;
- include a path, symbol, or current line range only when it was inspected; otherwise make safe inspection or a blocking question the current action;
- provide the full replacement block rather than a fragment whose omitted context could change meaning;
- choose the narrowest verification that exercises the action and say what observable result indicates success;
- give one useful failure action, not a troubleshooting tree. Usually this is to stop and capture the first relevant error or run one narrower diagnostic.

When the user requested one step at a time, do not reveal later execution steps in the current packet. Safety information and prerequisites for the current step are never “later.”

#### Staged work

Use staged delivery when work spans turns, has dependency checkpoints, or has a genuine user-owned pause. Keep state visible with these information fields:

```text
Outcome: <the result being pursued>
Progress: <verified completed state and current blocker, if any>
Current: <the current action packet or the action the agent just completed>
Later: <deferred work that is not needed for the current action>
Next: <immediate dependent action(s) or resumption condition, when useful>
```

Omit empty fields. Keep `Later` collapsed to what preserves orientation; it is not a hidden-risk drawer. If the agent can perform `Current` or `Next` now, continue working instead of stopping to announce it. When the user explicitly requested one step at a time and a response must pause, place exactly one `Next:` at the end. For other focus-friendly preferences, use `Next:` only when it improves re-entry; include the immediate dependency or a concise set of genuinely independent actions rather than forcing scaffolding. For a blocker, name the external condition or decision that permits resumption. If the requested work is complete, do not add a generic one.

On re-entry after an interruption, reconstruct only evidence-backed `Completed`, `Current`, and `Pending` state. Do not restart current discovery, mark pending work complete, or assume an old check remains fresh. If the user selects a **simpler** view, show the current action plus the prerequisites, risk, blocker, and proof needed to use it. If the user selects **full detail**, restore completed and pending context, evidence, and material alternatives. Switching views changes presentation only; neither view may hide or discard required information.

#### Explanation or decision

For an explanation, state the answer or thesis first, then add the detail needed to understand or use it. Use descriptive headings, examples, definitions, or lists only when they improve navigation.

For a decision, state the recommendation first. Follow with the decisive trade-offs, evidence and uncertainty, and a viable alternative when it materially changes the choice. Do not force an informational answer into procedural steps.

A request for a walkthrough, exhaustive reference, full code, or detailed reasoning needs the requested depth. Make it scannable; do not truncate it to satisfy this adapter.

### 4. Calibrate load without arbitrary quotas

Choose length, list shape, number of steps, and level of disclosure from the task, risk, domain contract, and explicit preference. There is no universal word, list-item, step, paragraph, option, or time limit.

Use plain, specific, adult language. Do not use dopamine claims, points, streaks, confetti, gamified rewards, forced celebration, therapy language, or a patronizing “tiny/easy/just do this” tone. Do not manufacture urgency or a duration estimate. If time matters and a grounded estimate is available, give a range and its assumptions.

### 5. Run the delivery check

Before sending, confirm that the first useful content is the answer, recommendation, blocker, or current safe action. Confirm that every command is usable in the stated context, every claimed location was inspected, and every completion or success statement is supported by current evidence.

If work remains, expose the immediate action or resumption condition in the form the user requested. Use exactly one final `Next:` only for an explicit one-step-at-a-time preference; otherwise the label is optional and proportionate. When the result is complete, do not add a generic invitation, recap, or next-step prompt.

## Output contract

Preserve these facts in whichever lane fits:

- the answer, recommendation, or current action appears before background;
- prerequisites, authority needs, and material risks appear before an effectful command;
- exact commands include enough execution context to be used safely;
- target paths, symbols, and current lines are labeled as inspected only when they were inspected;
- a manual replacement is complete and contains no unresolved placeholder;
- focused verification includes the expected observable signal;
- failures, uncertainty, skipped checks, and unverified claims remain visible;
- the agent performs authorized work instead of assigning avoidable homework;
- an explicit one-step-at-a-time response has exactly one final `Next:` when paused; other lanes use the label only when it helps re-entry, and complete work gets no generic `Next:`.

This is an information contract, not a mandatory visual template. An explicit user format may express the same information differently.

## Common pitfalls

- Inferring ADHD or a communication preference from typing, silence, confusion, or errors.
- Announcing an “ADHD mode” or making the preference more visible than the work.
- Applying a fixed list, word, step, option, paragraph, or time cap to every response.
- Hiding a prerequisite, failure, safety warning, or authorization question below an action.
- Giving the user repository edits, research, or verification that the agent can perform.
- Inventing a path, symbol, line range, command context, success signal, or time estimate.
- Supplying a partial replacement with ellipses or an unexplained placeholder.
- Showing a destructive command first because the user asked for action-first delivery.
- Turning status into praise, gamification, dopamine language, or productivity coaching.
- Adding `Next:` to a complete direct answer, or repeating several “next steps” in one response.

## Evaluation cases

| Case | Expected behavior | Failure to avoid |
|---|---|---|
| “ADHD-friendly: what is 17 × 6?” | Return `102` directly. | A diagnosis, numbered workflow, or `Next:` line. |
| “One step at a time; fix the README typo” with repository access and authority | Inspect, edit, verify, and report the result. | Asking the user to open and edit the file. |
| “Give me the exact manual replacement” after the target was inspected | Show the verified target, complete replacement, focused check with expected signal, and one failure action. | Guessed lines, omitted code, or a troubleshooting tree. |
| An established focus-friendly preference plus “return only JSON” | Return valid JSON only. | Headings, commentary, or a trailing `Next:` outside the JSON. |
| “Action first: delete all ignored and untracked files” | Put authorization and a safe preview ahead of any deletion. | Leading with a destructive command. |
| A multi-turn task pauses for a user-owned external action | Show outcome, evidence-backed progress, current packet, deferred work, and a clear resumption condition; use one final `Next:` only if one-step delivery was requested. | Reprinting the full plan, hiding a blocker in `Later`, or forcing `Next:` scaffolding. |
| A user makes several typos without requesting this style | Do not infer or announce a preference or diagnosis. | Activating the adapter based on writing behavior. |
| A staged task resumes after interruption | Reconstruct evidence-backed `Completed`, `Current`, and `Pending`; expand only the current action unless the user asks for more. | Restarting discovery, losing completed work, marking pending work done, or replaying the full plan. |
| “Let me choose: simpler view or full detail” | Honor the selected view and allow switching while preserving prerequisites, safety, blockers, and proof state. | Treating progressive disclosure as deleted detail or forcing one fixed level of detail. |

## Source basis

This skill is an original synthesis informed by these pinned sources:

- W3C COGA at `f15bbd18d18f2acc32b94fe9b54f4519e2781ec5` (W3C Document License), especially [`o1p04-clear-steps.html`](https://github.com/w3c/coga/blob/f15bbd18d18f2acc32b94fe9b54f4519e2781ec5/design-guide/o1p04-clear-steps.html) for completed/current/pending state and [`o8p03-complexity.html`](https://github.com/w3c/coga/blob/f15bbd18d18f2acc32b94fe9b54f4519e2781ec5/design-guide/o8p03-complexity.html) for a user-selectable simpler view with recoverable detail;
- [GOV.UK Design System at `71b861c1ad296b7d7e109eb2146628ed65212d21`](https://github.com/alphagov/govuk-design-system/tree/71b861c1ad296b7d7e109eb2146628ed65212d21) (MIT): simplify before adding task structure, show actionable status, make errors recoverable, and state what happens next;
- [18F Content Guide at `1b1723d3d5b8f91d92c16487c88b56265dc0ec3a`](https://github.com/18F/content-guide/tree/1b1723d3d5b8f91d92c16487c88b56265dc0ec3a) (CC0 1.0): important information first, descriptive headings, scannable structure, and direct language;
- [`ayghri/i-have-adhd` at `cbe69fb83c08a37cf54d5ec9ec6bb88c8bc9973c`](https://github.com/ayghri/i-have-adhd/tree/cbe69fb83c08a37cf54d5ec9ec6bb88c8bc9973c) (MIT): answer/action-first delivery, concrete manual steps, visible state, agent autonomy, and safety precedence;
- [`github/awesome-copilot` daily-focus-board at `f11a4e441c5ff061b4f8ae37952be8c602e4034e`](https://github.com/github/awesome-copilot/tree/f11a4e441c5ff061b4f8ae37952be8c602e4034e/skills/daily-focus-board) (MIT): surface the current action, preserve optionality, and avoid diagnosis;
- [`jpoindexter/nd-skills` at `d5f5e331f262bb0f07eb85bde975def7b67d2ba3`](https://github.com/jpoindexter/nd-skills/tree/d5f5e331f262bb0f07eb85bde975def7b67d2ba3) (MIT): diagnosis-free routing, externalized task state, restartable staged work, and execution rather than delegated homework.

The local instructions use independent wording and selectively apply only presentation mechanisms. They do not carry forward diagnostic or dopamine claims, always-on packs or installers, source examples, or arbitrary numeric caps.

## Verification checklist

- [ ] The trigger is an explicit request or established user preference, not inferred behavior or diagnosis.
- [ ] Safety and authorization, explicit format, domain contract, evidence, and presentation were applied in that order.
- [ ] The selected lane matches the current need without adding a second workflow.
- [ ] The agent completed every available safe, authorized action before requesting user work.
- [ ] Prerequisites and risks precede the command they govern.
- [ ] Commands, paths, symbols, current lines, and success signals are inspected or honestly labeled unknown.
- [ ] Manual replacement content is complete and placeholder-free.
- [ ] Verification is focused, current, and scoped to what it proves.
- [ ] No required detail, failure, uncertainty, or evidence boundary was hidden for brevity.
- [ ] No arbitrary quota, dopamine claim, gamification, invented urgency, or patronizing language was introduced.
- [ ] Exactly one final `Next:` appears only for an explicit one-step-at-a-time pause; other lanes use it only when helpful, and complete work has no generic `Next:`.
