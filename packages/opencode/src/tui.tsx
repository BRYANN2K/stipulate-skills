import { Plugin } from "@opencode/plugin/tui";
import type { Context, DialogSelectOption } from "@opencode/plugin/tui/context";
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import { Stip } from "./rpc";
import { profileOptions } from "./profile-options.mjs";

type Profile = {
  model?: string;
  effort?: string;
  fast?: boolean | "inherit";
  agent?: string;
  fallbacks?: string[];
};
type Settings = {
  version?: number;
  defaults?: Profile & { max_workers?: number; max_shared_writers?: number };
  clients?: Record<
    string,
    {
      roles?: Record<string, Profile>;
      phases?: Record<string, Profile>;
      phase_roles?: Record<string, Record<string, Profile>>;
    }
  >;
};
type Scope = "project" | "local" | "personal";
type CatalogEntry = {
  ref: string;
  name: string;
  variants: { id?: string; effort?: string | null; fast?: boolean }[];
  fastSupported: boolean;
};
type Job = Record<string, unknown> & {
  status?: string;
  acceptance?: string;
  role?: string;
  sessionID?: string;
  session_id?: string;
  taskID?: string;
  task_id?: string;
  title?: string;
};
type Snapshot = {
  available: boolean;
  changeID?: string;
  changes: { id: string; phase: string; archived: boolean }[];
  cycle: { label: string; status: string; detail?: string }[];
  extensions: (string | { id?: string; name?: string })[];
  jobs: Job[];
  helpers?: Job[];
  settings: Settings;
  settingsByScope?: Partial<Record<Scope, Settings>>;
  settingsRevision: string;
  catalog: CatalogEntry[];
  coordinator?: unknown;
  viewOnly?: boolean;
  error?: string;
};
type EditorTarget = { role?: string; phase?: string };
type ArtifactKind =
  | "proposal"
  | "spec"
  | "tasks"
  | "evidence"
  | "execution-plan";
type NativeChild = ReturnType<Context["data"]["session"]["list"]>[number];
const ROLES = [
  "backend",
  "api",
  "frontend",
  "security",
  "verification",
  "documentation",
  "research",
  "architecture",
  "design",
  "database",
  "cloud",
  "delivery",
  "communication",
];
const PHASES = ["explore", "validate", "apply", "check", "docs"];
const BUSY = new Set([
  "starting",
  "running",
  "waiting",
  "waiting_permission",
  "waiting_input",
  "unknown",
  "interrupting",
]);
const EMPTY: Snapshot = {
  available: false,
  changes: [],
  cycle: [],
  extensions: [],
  jobs: [],
  settings: {},
  settingsRevision: "",
  catalog: [],
};

function plain(value: unknown, fallback = "Unavailable"): string {
  if (value === undefined || value === null || value === "") return fallback;
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ")
    : String(value);
}
/** RPC errors are often plain objects, not Error instances. Never serialize
 * request bodies, headers or arbitrary config values into a terminal notice. */
function errorText(error: unknown): string {
  const seen = new WeakSet<object>();
  const fields = [
    "message",
    "detail",
    "description",
    "title",
    "type",
    "_tag",
    "name",
    "code",
    "status",
    "statusCode",
    "details",
    "issues",
    "errors",
    "error",
    "cause",
    "data",
  ];
  const redact = (text: string) =>
    text
      .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [redacted]")
      .replace(
        /((?:authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|password)\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;}]+)/gi,
        "$1[redacted]",
      );
  function describe(value: unknown, depth = 0): string[] {
    if (value === null || value === undefined || depth > 4) return [];
    if (typeof value === "string" || typeof value === "number")
      return [redact(plain(value))];
    if (typeof value !== "object" || seen.has(value)) return [];
    seen.add(value);
    if (Array.isArray(value))
      return value.slice(0, 8).flatMap((item) => describe(item, depth + 1));
    const object = value as Record<string, unknown>;
    const parts = fields.flatMap((key) => {
      const item = object[key];
      if (item === undefined) return [];
      const detail = describe(item, depth + 1);
      return ["code", "status", "statusCode"].includes(key)
        ? detail.map((text) => `${key}: ${text}`)
        : detail;
    });
    return parts.length
      ? parts
      : [
          `Unrecognized error (${
            Object.keys(object)
              .filter((key) => /^[a-zA-Z_]+$/.test(key))
              .slice(0, 8)
              .join(", ") || "no diagnostic fields"
          })`,
        ];
  }
  return (
    [...new Set(describe(error))].join(" · ").slice(0, 2400) ||
    "Request failed without a diagnostic message."
  );
}
function title(value: string) {
  return value.replace(
    /(^|-)([a-z])/g,
    (_all, prefix, letter) => `${prefix ? " " : ""}${letter.toUpperCase()}`,
  );
}
function crop(value: string, length = 30) {
  const chars = [...value];
  return chars.length > length
    ? chars.slice(0, Math.max(length - 1, 1)).join("") + "…"
    : value;
}
function modelText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "inherit";
  const v = value as Record<string, unknown>;
  if (typeof v.ref === "string") return v.ref;
  if (typeof v.model === "object") return modelText(v.model);
  if (v.providerID && (v.id || v.modelID || v.model))
    return `${v.providerID}/${v.id || v.modelID || v.model}${v.variant ? "#" + v.variant : ""}`;
  return typeof v.model === "string" ? v.model : "inherit";
}
function jobTask(job: Job) {
  return plain(
    job.title ??
      job.objective ??
      job.task ??
      job.description ??
      job.taskID ??
      job.task_id,
    "Assigned task",
  );
}
function jobID(job: Job) {
  return plain(job.taskID ?? job.task_id, "");
}
function jobSession(job: Job) {
  return job.sessionID ?? job.session_id;
}
function jobStatus(job: Job) {
  if (job.kind === "helper")
    return job.status === "returned"
      ? "findings returned"
      : (job.status ?? "unknown");
  if (job.status === "cancelled" || job.status === "interrupted")
    return "cancelled";
  if (job.acceptance === "accepted") return "accepted";
  if (job.acceptance === "rejected") return "needs correction";
  if (job.status === "returned" || job.status === "completed")
    return "awaiting review";
  return plain(job.status, "unknown").replaceAll("_", " ");
}
function latestAttempts(jobs: Job[]): Map<string, Job> {
  const result = new Map<string, Job>();
  for (const job of jobs) {
    const key = jobID(job);
    const previous = result.get(key);
    if (!previous || Number(job.attempt ?? 0) >= Number(previous.attempt ?? 0))
      result.set(key, job);
  }
  return result;
}
function jobIcon(job: Job) {
  const status = jobStatus(job);
  return status === "accepted"
    ? "✓"
    : status === "awaiting review"
      ? "◐"
      : status === "running"
        ? "●"
        : ["failed", "needs correction"].includes(status)
          ? "!"
          : status === "cancelled"
            ? "×"
            : "○";
}
function elapsed(job: Job) {
  const raw = job.started_at ?? job.startedAt ?? job.created_at;
  if (!raw) return "";
  const start = typeof raw === "number" ? raw : Date.parse(String(raw));
  const endRaw =
    job.finished_at ??
    job.completed_at ??
    job.finishedAt ??
    (!BUSY.has(job.status ?? "") ? job.updated_at : undefined);
  const end = endRaw
    ? typeof endRaw === "number"
      ? endRaw
      : Date.parse(String(endRaw))
    : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "";
  const seconds = Math.max(0, Math.floor((end - start) / 1000));
  return seconds < 60
    ? `${seconds}s`
    : `${Math.floor(seconds / 60)}m${String(seconds % 60).padStart(2, "0")}`;
}
function fastText(value: unknown) {
  return value === true ? "On" : value === false ? "Off" : "Inherit";
}
function profileAt(
  settings: Settings,
  target: EditorTarget,
  create = false,
): Profile {
  if (!target.role && !target.phase) {
    if (create) settings.defaults ??= {};
    return settings.defaults ?? {};
  }
  if (create) {
    settings.clients ??= {};
    settings.clients.opencode ??= {};
  }
  const client = settings.clients?.opencode;
  if (!client) return {};
  if (target.role && target.phase) {
    if (create) {
      client.phase_roles ??= {};
      client.phase_roles[target.phase] ??= {};
      client.phase_roles[target.phase][target.role] ??= {};
    }
    return client.phase_roles?.[target.phase]?.[target.role] ?? {};
  }
  const kind = target.role ? "roles" : "phases";
  const key = target.role ?? target.phase!;
  if (create) {
    client[kind] ??= {};
    client[kind]![key] ??= {};
  }
  return client[kind]?.[key] ?? {};
}
function effectiveProfile(settings: Settings, target: EditorTarget): Profile {
  const client = settings.clients?.opencode;
  const result: Profile = {
    model: "inherit",
    effort: "inherit",
    fast: "inherit",
  };
  for (const layer of [
    settings.defaults,
    target.phase ? client?.phases?.[target.phase] : undefined,
    target.role ? client?.roles?.[target.role] : undefined,
    target.phase && target.role
      ? client?.phase_roles?.[target.phase]?.[target.role]
      : undefined,
  ]) {
    if (!layer) continue;
    if (layer.model !== undefined && layer.model !== result.model) {
      result.effort = "inherit";
      result.fast = "inherit";
    }
    Object.assign(result, layer);
  }
  return result;
}
function mergeSettings(base: Settings, overlay: Settings): Settings {
  const out = structuredClone(base) as Record<string, unknown>;
  const merge = (a: Record<string, unknown>, b: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(b)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        if (!a[key] || typeof a[key] !== "object" || Array.isArray(a[key]))
          a[key] = {};
        merge(
          a[key] as Record<string, unknown>,
          value as Record<string, unknown>,
        );
      } else a[key] = structuredClone(value);
    }
  };
  merge(out, overlay as Record<string, unknown>);
  return out as Settings;
}

export default Plugin.define({
  id: "stipulate.tui",
  setup(context) {
    const rpc = context.client.rpc(Stip);
    const location = context.location ?? context.data.location.default();
    const options = { location };
    let disposed = false;
    let dialogBusy = false;
    const sessionID = () => {
      const route = context.ui.router.current();
      return route.type === "session" ? route.sessionID : undefined;
    };
    const notice = (
      message: string,
      variant: "error" | "success" | "info" = "info",
    ) => context.ui.toast.show({ title: "Stipulate", message, variant });
    async function snapshot(id = sessionID()): Promise<Snapshot> {
      return (await rpc.snapshot({ sessionID: id }, options)) as Snapshot;
    }
    function guarded(action: () => Promise<void>) {
      return async () => {
        if (dialogBusy || disposed) return;
        dialogBusy = true;
        try {
          await action();
        } catch (error) {
          notice(errorText(error), "error");
        } finally {
          dialogBusy = false;
        }
      };
    }
    const choose = <T,>(
      label: string,
      entries: DialogSelectOption<T>[],
      current?: T,
    ) => context.ui.dialog.select({ title: label, options: entries, current });

    function nativeChildren(
      id: string | undefined,
      jobs: Job[],
    ): NativeChild[] {
      if (!id) return [];
      const root = context.data.session.root(id);
      const family = new Set([root, ...context.data.session.family(root)]);
      const tracked = new Set(jobs.map(jobSession).filter(Boolean));
      return context.data.session
        .list()
        .filter(
          (child) =>
            child.id !== root &&
            !!child.parentID &&
            family.has(child.id) &&
            !tracked.has(child.id) &&
            !child.time.archived,
        )
        .sort((a, b) => a.time.created - b.time.created);
    }
    function nativeStatus(child: NativeChild): string {
      if ((context.data.session.permission.list(child.id) ?? []).length)
        return "waiting for permission";
      if (context.data.session.status(child.id) === "running") return "running";
      return child.outcome === "succeeded"
        ? "completed"
        : child.outcome === "failed"
          ? "failed"
          : child.outcome === "interrupted"
            ? "interrupted"
            : "idle";
    }
    async function nativeDetails(child: NativeChild) {
      const status = nativeStatus(child);
      const selected = await choose("Native session · observed activity", [
        {
          title: plain(child.title, "Untitled native child"),
          value: "details",
          description: `Status: ${status}\nNative agent: ${plain(child.agent)}\nSession model: ${modelText(child.model)}\nSession: ${child.id}\nNo Stip task or acceptance is associated with this child.`,
        },
        {
          title: "Open native session",
          value: "open",
          description: "Read its real conversation and tool activity.",
        },
      ]);
      if (selected === "open") {
        context.ui.dialog.clear();
        context.ui.router.navigate({ type: "session", sessionID: child.id });
      } else if (selected === "details")
        await context.ui.dialog.alert({
          title: plain(child.title, "Native child"),
          message: `Status: ${status}\nNative agent: ${plain(child.agent)}\nSession model: ${modelText(child.model)}\nSession: ${child.id}\n\nObserved native activity only. This is not a mapped Stip role, a task acceptance or proof that a workflow stage passed. Discovery remains in the main conversation.`,
        });
    }

    async function artifact(changeID: string, kind: ArtifactKind) {
      const result = (await rpc.artifact({ changeID, kind }, options)) as {
        text: string;
      };
      context.ui.dialog.set({ size: "xlarge", centered: true });
      context.ui.dialog.show(() => (
        <box
          padding={1}
          flexDirection="column"
          maxHeight={Math.max(8, context.renderer.height - 6)}
        >
          <text fg={context.theme.text.default}>
            <b>
              {title(kind)} · {plain(changeID)}
            </b>
          </text>
          <scrollbox height={Math.max(6, context.renderer.height - 11)} focused>
            <text fg={context.theme.text.default} wrapMode="word">
              {result.text}
            </text>
          </scrollbox>
          <text fg={context.theme.text.subdued}>
            Esc to close · viewing does not change workflow state
          </text>
        </box>
      ));
    }

    async function pickChange(data: Snapshot, id = sessionID()) {
      if (data.viewOnly) {
        notice("Choose the change from the main coordinator session.");
        return;
      }
      if (!id) {
        notice("Open a project session before selecting a change.");
        return;
      }
      const selected = await choose(
        "Stipulate · choose a change",
        data.changes.map((change) => ({
          title: change.id,
          value: change.id,
          description: `${change.phase}${change.archived ? " · archived" : ""}`,
          category: change.archived ? "Archive" : "Active changes",
        })),
        data.changeID,
      );
      if (selected !== undefined)
        await rpc.bind({ sessionID: id, changeID: selected }, options);
    }

    async function workerDetails(
      job: Job,
      changeID?: string,
      historical = false,
      viewOnly = false,
    ) {
      const id = jobSession(job);
      const resolved = (job.resolved ?? job.profile) as
        | Record<string, unknown>
        | undefined;
      const requested = (job.requested ?? resolved?.requested) as
        | Record<string, unknown>
        | undefined;
      const model = modelText(job.actual_model ?? job.actualModel);
      const selectedModel = modelText(job.model ?? resolved?.model);
      const files = job.files ?? job.write_paths;
      const detail = [
        viewOnly
          ? "Read-only child view. Review contributions in the main coordinator session."
          : "",
        `${title(plain(job.role, "worker"))} · ${jobStatus(job)}${elapsed(job) ? " · " + elapsed(job) : ""}`,
        `Attempt ${plain(job.attempt, "unknown")}${historical ? " · history; a newer attempt exists" : " · current"}`,
        jobTask(job),
        `Runtime model: ${model === "inherit" ? "Not confirmed" : model}`,
        `Selected model: ${selectedModel}`,
        `Resolved effort: ${plain(job.effort ?? resolved?.effort, "Not confirmed")} · Fast: ${job.fast !== undefined || resolved?.fast !== undefined ? fastText(job.fast ?? resolved?.fast) : "Not confirmed"}`,
        requested
          ? `Requested: ${modelText(requested.model)} · ${plain(requested.effort, "inherit")} · Fast ${fastText(requested.fast)}`
          : "",
        job.criteria
          ? `Criteria: ${Array.isArray(job.criteria) ? job.criteria.join(" · ") : plain(job.criteria)}`
          : "",
        job.lastTool || job.last_tool
          ? `Last tool: ${plain(job.lastTool ?? job.last_tool)}`
          : "",
        job.error || job.reason
          ? `Reason: ${plain(job.error ?? job.reason)}`
          : "",
        files
          ? `Files: ${Array.isArray(files) ? files.map((value) => plain(value)).join(", ") : plain(files)}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
      const active = BUSY.has(job.status ?? "");
      const returned =
        !viewOnly &&
        !historical &&
        ["returned", "completed"].includes(job.status ?? "") &&
        job.acceptance !== "accepted";
      const action = await choose("Stipulate · worker details", [
        {
          title: "Task and effective settings",
          value: "details",
          description: `${title(plain(job.role, "worker"))} · ${jobStatus(job)} · inspect model, scope and evidence`,
        },
        {
          title: "Open native session",
          value: "open",
          disabled: !id,
          description: id ?? "No native session has been associated yet.",
        },
        {
          title: "Inspect result",
          value: "result",
          disabled: !job.result && !job.summary,
          description: "View returned output before accepting it.",
        },
        {
          title: "Accept contribution",
          value: "accept",
          disabled: !returned || !changeID,
          description:
            "Record review acceptance. This does not pass criteria or advance the lifecycle.",
        },
        {
          title: "Request correction",
          value: "reject",
          disabled: !returned || !changeID,
          description: "Record the missing behavior for the coordinator.",
        },
        {
          title: "Cancel task",
          value: "interrupt",
          disabled: viewOnly || historical || !active || !id || !changeID,
          description: historical
            ? "Inspect or stop this earlier attempt in its native session."
            : "Stop the owned native worker; preserve edits already made.",
        },
      ]);
      if (action === "details") {
        await context.ui.dialog.alert({
          title: "Worker details",
          message: detail,
        });
        return;
      }
      if (action === "open" && id) {
        context.ui.dialog.clear();
        context.ui.router.navigate({ type: "session", sessionID: id });
        return;
      }
      if (action === "result") {
        await context.ui.dialog.alert({
          title: "Returned contribution",
          message: plain(job.result ?? job.summary),
        });
        return;
      }
      if (
        action &&
        ["accept", "reject", "interrupt"].includes(action) &&
        changeID
      ) {
        const reason = await context.ui.dialog.prompt({
          title:
            action === "accept"
              ? "What did you verify?"
              : action === "reject"
                ? "What needs correction?"
                : "Cancellation reason",
          description:
            action === "accept"
              ? "Acceptance requires an inspected result; worker completion alone is not evidence."
              : "This note stays with the task.",
        });
        if (!reason?.trim()) return;
        const fresh = await snapshot();
        if (fresh.viewOnly)
          throw new Error(
            "Return to the main coordinator session to review or cancel a contribution.",
          );
        const latest = fresh.jobs
          .filter((item) => jobID(item) === jobID(job))
          .sort((a, b) => Number(b.attempt ?? 0) - Number(a.attempt ?? 0))[0];
        if (
          fresh.changeID !== changeID ||
          !latest ||
          latest.run_id !== job.run_id
        )
          throw new Error(
            "This task attempt changed. Reopen the current worker before taking action.",
          );
        await rpc.action(
          {
            changeID,
            taskID: jobID(job),
            runID: plain(job.run_id, ""),
            action: action as "accept" | "reject" | "interrupt",
            reason: reason.trim(),
          },
          options,
        );
        notice(
          action === "interrupt"
            ? "Cancellation requested; refresh to confirm the native status."
            : "Contribution review recorded.",
          "success",
        );
      }
    }

    async function statusMenu(id = sessionID()) {
      const data = await snapshot(id);
      const observed = nativeChildren(id, [
        ...data.jobs,
        ...(data.helpers ?? []),
      ]);
      const latest = latestAttempts(data.jobs);
      const items: DialogSelectOption<string>[] = [
        {
          title: data.changeID ?? "Select a change",
          value: "change",
          description: data.available
            ? "Choose the spec associated with this session."
            : "Run /stip-bootstrap in this project first.",
        },
        ...data.cycle.map((stage) => ({
          title: `${stage.status === "complete" ? "✓" : stage.status === "active" ? "▶" : "○"} ${stage.label}${stage.detail ? " · " + stage.detail : ""}`,
          value: `stage:${stage.label}`,
          category: "Workflow",
          description: "Inspect its artifacts; does not execute the phase.",
        })),
        ...data.jobs.map((job, index) => ({
          title: `${jobIcon(job)} ${title(plain(job.role, "worker"))} · ${jobStatus(job)} · attempt ${plain(job.attempt, "?")}`,
          value: `job:${index}`,
          category:
            latest.get(jobID(job)) === job
              ? "Current native workers"
              : "History · earlier attempts",
          description: jobTask(job),
        })),
        ...(data.helpers ?? []).map((job, index) => ({
          title: `${jobIcon(job)} ${title(plain(job.role, "research"))} · ${jobStatus(job)}`,
          value: `helper:${index}`,
          category: "Research helpers · findings only",
          description: jobTask(job),
        })),
        ...observed.map((child, index) => ({
          title: `${nativeStatus(child) === "running" ? "●" : "○"} ${plain(child.title, "Native child")}`,
          value: `native:${index}`,
          category: "Other session helpers · observed only",
          description: `${nativeStatus(child)} · ${plain(child.agent)} · ${modelText(child.model)}`,
        })),
        {
          title: "Settings",
          value: "settings",
          category: "Configuration",
          description: "Model-dependent profiles for native OpenCode workers.",
        },
      ];
      const value = await choose("Stipulate", items);
      if (value === "change") await pickChange(data, id);
      else if (value === "settings") await settingsMenu();
      else if (value?.startsWith("job:")) {
        const job = data.jobs[Number(value.slice(4))];
        await workerDetails(
          job,
          data.changeID,
          latest.get(jobID(job)) !== job,
          data.viewOnly,
        );
      } else if (value?.startsWith("helper:")) {
        await workerDetails(
          data.helpers![Number(value.slice(7))],
          undefined,
          false,
          true,
        );
      } else if (value?.startsWith("native:"))
        await nativeDetails(observed[Number(value.slice(7))]);
      else if (value?.startsWith("stage:") && data.changeID)
        await stageArtifact(data.changeID, value.slice(6));
    }
    async function stageArtifact(changeID: string, stage: string) {
      const kind: ArtifactKind = ["Explore", "Bootstrap"].includes(stage)
        ? "proposal"
        : stage === "Validate"
          ? "spec"
          : stage === "Apply"
            ? "execution-plan"
            : "evidence";
      await artifact(changeID, kind);
    }

    async function settingsMenu() {
      let data = await snapshot();
      let scope: Scope = "project";
      let draft: Settings = structuredClone(
        data.settingsByScope?.[scope] ?? data.settings,
      );
      const start = () =>
        JSON.stringify(data.settingsByScope?.[scope] ?? data.settings);
      const dirty = () => JSON.stringify(draft) !== start();
      const effective = () => {
        if (!data.settingsByScope) return draft;
        const layers = { ...data.settingsByScope, [scope]: draft };
        return mergeSettings(
          mergeSettings(layers.personal ?? {}, layers.project ?? {}),
          layers.local ?? {},
        );
      };
      const atScope = () => {
        if (!data.settingsByScope) return draft;
        const layers = { ...data.settingsByScope, [scope]: draft };
        if (scope === "personal") return layers.personal ?? {};
        const shared = mergeSettings(
          layers.personal ?? {},
          layers.project ?? {},
        );
        return scope === "project"
          ? shared
          : mergeSettings(shared, layers.local ?? {});
      };
      const catalogModel = (profile: Profile) => {
        const ref =
          profile.model && profile.model !== "inherit"
            ? profile.model
            : modelText(data.coordinator);
        return data.catalog.find((model) => model.ref === ref.split("#")[0]);
      };
      async function editProfile(target: EditorTarget) {
        const label =
          target.phase && target.role
            ? `${title(target.phase)} · ${title(target.role)}`
            : title(target.role ?? target.phase ?? "default worker");
        for (;;) {
          const requested = profileAt(draft, target);
          const resolved = effectiveProfile(atScope(), target);
          const model = catalogModel(resolved);
          const supported = profileOptions(
            resolved,
            model,
            modelText(data.coordinator),
          );
          const key = await choose(`${label} · ${scope}`, [
            {
              title: `Model       ${plain(requested.model, "Inherit")}`,
              value: "model",
              description: `Effective: ${model?.name ?? modelText(data.coordinator)}`,
            },
            {
              title: `Effort      ${plain(requested.effort, "Inherit")}`,
              value: "effort",
              description: model
                ? "Only settings advertised for the selected model."
                : "Select a known model first.",
              disabled: !model,
            },
            {
              title: `Fast        ${fastText(requested.fast)}`,
              value: "fast",
              description: model?.fastSupported
                ? "Priority speed where available; may increase usage."
                : "No verified Fast option for this model.",
              disabled: !model?.fastSupported,
            },
            {
              title: `Native agent ${plain(requested.agent, "Stip worker")}`,
              value: "agent",
              description: "Optional binding to an existing OpenCode subagent.",
            },
            {
              title: "Reset to inherit",
              value: "reset",
              description:
                "Reset model, effort, Fast and native-agent binding for this profile.",
            },
            { title: "Done", value: "done" },
          ]);
          if (!key || key === "done") return;
          const profile = profileAt(draft, target, true);
          if (key === "reset") {
            Object.assign(profile, {
              model: "inherit",
              effort: "inherit",
              fast: "inherit",
              agent: "inherit",
            });
            delete profile.fallbacks;
            continue;
          }
          if (key === "model") {
            const selected = await context.ui.dialog.select({
              title: `${label} · choose model`,
              placeholder: "Search OpenCode models…",
              current: profile.model ?? "inherit",
              options: [
                {
                  title: "Inherit coordinator",
                  value: "inherit",
                  description: modelText(data.coordinator),
                },
                ...data.catalog.map((item) => ({
                  title: item.name,
                  value: item.ref,
                  description: item.ref,
                  category: item.ref.split("/")[0],
                })),
              ],
            });
            if (selected !== undefined) {
              Object.assign(profile, {
                model: selected,
                effort: "inherit",
                fast: "inherit",
              });
              delete profile.agent;
            }
          } else if (key === "effort" && model) {
            const choices = supported.efforts;
            const effort = await choose(
              `${label} · effort`,
              [
                {
                  title: "Inherit / model default",
                  value: "inherit",
                  disabled: !supported.inheritEffort,
                  description:
                    "Preserve the coordinator variant or this model’s default effort.",
                },
                ...choices.map((value) => ({ title: value, value })),
              ],
              profile.effort ?? "inherit",
            );
            if (effort !== undefined) profile.effort = effort;
          } else if (key === "fast" && model?.fastSupported) {
            const speed = await choose<"inherit" | "on" | "off">(
              `${label} · Fast`,
              [
                {
                  title: "Inherit / model default",
                  value: "inherit",
                  disabled: !supported.inheritFast,
                  description:
                    "Preserve the coordinator variant or this model’s default speed.",
                },
                {
                  title: "On",
                  value: "on",
                  disabled: !supported.fastOn,
                  description:
                    "Use the verified speed tier. May increase usage.",
                },
                {
                  title: "Off",
                  value: "off",
                  disabled: !supported.fastOff,
                  description: "Use standard speed with this effort.",
                },
              ],
              profile.fast === true
                ? "on"
                : profile.fast === false
                  ? "off"
                  : "inherit",
            );
            if (speed !== undefined)
              profile.fast = speed === "inherit" ? "inherit" : speed === "on";
          } else if (key === "agent") {
            await context.data.location.agent.sync(location);
            const agents = context.data.location.agent.list(location) ?? [];
            const selected = await choose(
              "Bind a native OpenCode agent",
              [
                { title: "Use a Stip worker", value: "inherit" },
                ...agents
                  .filter(
                    (agent) =>
                      agent.mode === "subagent" || agent.mode === "all",
                  )
                  .map((agent) => ({
                    title: agent.name ?? agent.id,
                    value: agent.id,
                    description: agent.description ?? agent.id,
                  })),
              ],
              profile.agent ?? "inherit",
            );
            if (selected !== undefined) profile.agent = selected;
          }
        }
      }
      for (;;) {
        const profiles = effective().clients?.opencode?.roles ?? {};
        const roles = [...new Set([...ROLES, ...Object.keys(profiles)])].filter(
          (role) => role !== "discovery" && role !== "coordinator",
        );
        const selected = await choose(
          `Stipulate settings · ${scope}${dirty() ? " · unsaved" : ""}`,
          [
            {
              title: "Coordinator · current session",
              value: "coordinator",
              disabled: true,
              description: `${modelText(data.coordinator)} · discovery stays in the main conversation`,
            },
            {
              title: "Default worker",
              value: "default",
              description: `Model ${plain(effective().defaults?.model, "inherit")} · effort ${plain(effective().defaults?.effort, "inherit")} · Fast ${fastText(effective().defaults?.fast)}`,
            },
            ...roles.map((role) => {
              const p = effectiveProfile(effective(), { role });
              return {
                title: title(role),
                value: `role:${role}`,
                category: "Specialist profiles",
                description: `${plain(p.model, "inherit")} · ${plain(p.effort, "inherit")} · Fast ${fastText(p.fast)}`,
              };
            }),
            { title: "Add a role", value: "add-role", category: "Advanced" },
            { title: "Phase overrides", value: "phases", category: "Advanced" },
            {
              title: `Concurrent workers · ${effective().defaults?.max_workers ?? 2}`,
              value: "concurrency",
              category: "Advanced",
              description:
                "Coordinator excluded. One writer in a shared checkout.",
            },
            {
              title: `Save scope · ${scope}`,
              value: "scope",
              category: "Configuration",
              description:
                "Project is shared; local is private to this project; personal applies across projects.",
            },
            {
              title: "Review changes",
              value: "review",
              category: "Configuration",
              disabled: !dirty(),
            },
            {
              title: "Save",
              value: "save",
              category: "Configuration",
              disabled: !dirty(),
              description:
                "Applies to future tasks. Running workers keep their original settings.",
            },
            {
              title: dirty() ? "Discard and close" : "Close",
              value: "close",
              category: "Configuration",
            },
          ],
        );
        if (!selected || selected === "close") {
          if (
            !dirty() ||
            (await context.ui.dialog.confirm({
              title: "Discard unsaved settings?",
              message: "No files have been changed.",
              label: { confirm: "Discard", cancel: "Keep editing" },
            }))
          )
            return;
        } else if (selected === "default") await editProfile({});
        else if (selected.startsWith("role:"))
          await editProfile({ role: selected.slice(5) });
        else if (selected === "add-role") {
          const role = await context.ui.dialog.prompt({
            title: "Add a specialist role",
            placeholder: "accessibility",
            description:
              "Lowercase letters, digits and hyphens. Discovery stays with the coordinator.",
          });
          if (
            role &&
            /^[a-z][a-z0-9-]{0,47}$/.test(role) &&
            !["discovery", "coordinator"].includes(role)
          ) {
            profileAt(draft, { role }, true);
            await editProfile({ role });
          } else if (role)
            notice(
              "Use a lowercase specialist name; discovery and coordinator are reserved.",
              "error",
            );
        } else if (selected === "phases") {
          const phase = await choose(
            "Choose a phase override",
            PHASES.map((value) => ({ title: title(value), value })),
          );
          if (phase) {
            const role = await choose(`${title(phase)} · choose profile`, [
              { title: "Phase default", value: "*" },
              ...roles.map((value) => ({ title: title(value), value })),
            ]);
            if (role)
              await editProfile(role === "*" ? { phase } : { phase, role });
          }
        } else if (selected === "concurrency") {
          const count = await choose(
            "Maximum concurrent workers",
            [1, 2, 3, 4, 6, 8].map((value) => ({
              title: `${value} worker${value === 1 ? "" : "s"}`,
              value,
            })),
            effective().defaults?.max_workers ?? 2,
          );
          if (count) {
            draft.defaults ??= {};
            draft.defaults.max_workers = count;
            draft.defaults.max_shared_writers = 1;
          }
        } else if (selected === "scope") {
          if (dirty()) {
            notice("Save or discard these edits before switching scope.");
            continue;
          }
          const next: Scope | undefined = await choose<Scope>(
            "Settings scope",
            [
              {
                title: "This project",
                value: "project",
                description: "Shared .workflow/config.json",
              },
              {
                title: "Local to this project",
                value: "local",
                description: "Private .workflow/local.json",
              },
              {
                title: "Personal defaults",
                value: "personal",
                description: "OpenCode preferences used across projects",
              },
            ],
            scope,
          );
          if (next) {
            scope = next;
            draft = structuredClone(
              data.settingsByScope?.[scope] ?? data.settings,
            );
          }
        } else if (selected === "review") {
          await context.ui.dialog.alert({
            title: `Settings to save · ${scope}`,
            message: JSON.stringify(draft, null, 2),
          });
        } else if (selected === "save") {
          let result: { saved: boolean; warning?: string };
          try {
            result = await rpc.settings(
              { value: draft, scope, revision: data.settingsRevision },
              options,
            );
            if (!result.saved)
              throw new Error("The server did not confirm persistence.");
          } catch (error) {
            await context.ui.dialog.alert({
              title: "Save was not confirmed",
              message:
                errorText(error) +
                "\nYour edits remain in this menu. Reopen settings to check the persisted values before retrying.",
            });
            continue;
          }
          notice(`Saved ${scope} settings for future workers.`, "success");
          if (result.warning) {
            await context.ui.dialog.alert({
              title: "Settings saved",
              message: result.warning,
            });
          }
          try {
            data = await snapshot();
            draft = structuredClone(
              data.settingsByScope?.[scope] ?? data.settings,
            );
          } catch (error) {
            await context.ui.dialog.alert({
              title: "Settings saved · refresh unavailable",
              message:
                errorText(error) +
                "\nYour settings were saved. Reopen /stip-settings to load their current revision.",
            });
            return;
          }
        }
      }
    }

    function Sidebar(props: { sessionID: string }) {
      const [data, setData] = createSignal<Snapshot>(EMPTY);
      const [error, setError] = createSignal("");
      const [showHistory, setShowHistory] = createSignal(false);
      const [showNativeHistory, setShowNativeHistory] = createSignal(false);
      let mounted = true;
      let pending = false;
      const controller = new AbortController();
      async function refresh() {
        if (pending || !mounted) return;
        const id = props.sessionID;
        pending = true;
        try {
          const next = (await rpc.snapshot(
            { sessionID: id },
            { ...options, signal: controller.signal },
          )) as Snapshot;
          if (mounted && id === props.sessionID) {
            setData(next);
            setError(next.error ? errorText(next.error) : "");
          }
        } catch (cause) {
          if (mounted) setError(errorText(cause));
        } finally {
          pending = false;
        }
      }
      createEffect(() => {
        props.sessionID;
        setData(EMPTY);
        void refresh();
      });
      onMount(() => {
        const timer = setInterval(() => void refresh(), 2000);
        onCleanup(() => clearInterval(timer));
      });
      onCleanup(() => {
        mounted = false;
        controller.abort();
      });
      const latest = createMemo(() => latestAttempts(data().jobs));
      // Keep older active/unknown attempts visible until their execution is
      // reconciled. Historical rejected/returned outcomes do not crowd the cycle.
      const compactJobs = createMemo(() =>
        data().jobs.filter(
          (job) =>
            latest().get(jobID(job)) === job || BUSY.has(job.status ?? ""),
        ),
      );
      const historyCount = createMemo(
        () =>
          data().jobs.filter((job) => latest().get(jobID(job)) !== job).length,
      );
      const activeJobs = createMemo(() =>
        compactJobs().filter(
          (job) =>
            BUSY.has(job.status ?? "") ||
            jobStatus(job) === "awaiting review" ||
            jobStatus(job) === "needs correction",
        ),
      );
      const oldJobs = createMemo(() =>
        compactJobs().filter((job) => !activeJobs().includes(job)),
      );
      const visibleJobs = createMemo(() => [
        ...activeJobs(),
        ...(showHistory() ? oldJobs() : oldJobs().slice(-2)),
      ]);
      const running = createMemo(
        () => data().jobs.filter((job) => job.status === "running").length,
      );
      const observed = createMemo(() =>
        nativeChildren(props.sessionID, [
          ...data().jobs,
          ...(data().helpers ?? []),
        ]),
      );
      const nativeActive = createMemo(() =>
        observed().filter((child) =>
          ["running", "waiting for permission"].includes(nativeStatus(child)),
        ),
      );
      const nativeHistory = createMemo(() =>
        observed().filter((child) => !nativeActive().includes(child)),
      );
      const visibleNative = createMemo(() => [
        ...nativeActive(),
        ...(showNativeHistory() ? nativeHistory() : nativeHistory().slice(-2)),
      ]);
      const color = (status: string) =>
        ["failed", "stale", "needs correction"].includes(status)
          ? context.theme.text.feedback.error.default
          : status === "active" || status === "running"
            ? context.theme.text.status.running
            : status === "complete" || status === "accepted"
              ? context.theme.text.feedback.success.default
              : context.theme.text.subdued;
      return (
        <box flexDirection="column" gap={0} paddingTop={1} flexShrink={0}>
          <text
            fg={context.theme.text.default}
            onMouseUp={guarded(() => statusMenu(props.sessionID))}
          >
            <b>STIPULATE</b>
          </text>
          <text
            fg={context.theme.text.default}
            onMouseUp={guarded(() => pickChange(data(), props.sessionID))}
          >
            {crop(data().changeID ?? "Select a change", 32)} ▾
          </text>
          <Show when={error()}>
            <text
              fg={context.theme.text.feedback.error.default}
              wrapMode="word"
              onMouseUp={guarded(async () => {
                await context.ui.dialog.alert({
                  title: "Stipulate request error",
                  message: error(),
                });
              })}
            >
              {crop(error(), 160)} · select for details
            </text>
          </Show>
          <Show
            when={data().available}
            fallback={
              <text fg={context.theme.text.subdued}>Run /stip-bootstrap</text>
            }
          >
            <box flexDirection="column" paddingTop={1}>
              <For each={data().cycle}>
                {(stage) => (
                  <text
                    fg={color(stage.status)}
                    onMouseUp={guarded(async () => {
                      if (data().changeID)
                        await stageArtifact(data().changeID!, stage.label);
                    })}
                  >
                    {stage.status === "complete"
                      ? "✓"
                      : stage.status === "active"
                        ? "▶"
                        : ["failed", "stale"].includes(stage.status)
                          ? "!"
                          : "○"}{" "}
                    {stage.label}
                    {stage.detail ? ` · ${stage.detail}` : ""}
                  </text>
                )}
              </For>
            </box>
            <Show when={data().extensions.length > 0}>
              <text fg={context.theme.text.subdued} marginTop={1}>
                EXTENSIONS
              </text>
              <text fg={context.theme.text.default} wrapMode="word">
                {data()
                  .extensions.map((ext) =>
                    typeof ext === "string" ? ext : (ext.name ?? ext.id ?? ""),
                  )
                  .join(" · ")}
              </text>
            </Show>
            <text fg={context.theme.text.subdued} marginTop={1}>
              AGENTS · {running()} running
            </text>
            <Show
              when={data().jobs.length}
              fallback={
                <text fg={context.theme.text.subdued}>
                  No tracked Stip task yet
                </text>
              }
            >
              <For each={visibleJobs()}>
                {(job) => (
                  <box flexDirection="column">
                    <text
                      fg={color(jobStatus(job))}
                      onMouseUp={guarded(() =>
                        workerDetails(
                          job,
                          data().changeID,
                          latest().get(jobID(job)) !== job,
                          data().viewOnly,
                        ),
                      )}
                    >
                      {jobIcon(job)}{" "}
                      {crop(title(plain(job.role, "worker")), 18)}
                      {elapsed(job) ? ` · ${elapsed(job)}` : ""}
                    </text>
                    <text
                      fg={context.theme.text.subdued}
                      onMouseUp={guarded(() =>
                        workerDetails(
                          job,
                          data().changeID,
                          latest().get(jobID(job)) !== job,
                          data().viewOnly,
                        ),
                      )}
                    >
                      {" "}
                      {crop(
                        job.status === "running"
                          ? jobTask(job)
                          : jobStatus(job),
                        31,
                      )}
                    </text>
                    <Show when={latest().get(jobID(job)) !== job}>
                      <text
                        fg={context.theme.text.subdued}
                        onMouseUp={guarded(() =>
                          workerDetails(
                            job,
                            data().changeID,
                            latest().get(jobID(job)) !== job,
                            data().viewOnly,
                          ),
                        )}
                      >
                        {" "}
                        Earlier attempt · still active
                      </text>
                    </Show>
                  </box>
                )}
              </For>
              <Show when={oldJobs().length > 2}>
                <text
                  fg={context.theme.text.subdued}
                  onMouseUp={() => setShowHistory(!showHistory())}
                >
                  {showHistory()
                    ? "− Collapse history"
                    : `+ ${oldJobs().length - 2} earlier results`}
                </text>
              </Show>
              <Show when={historyCount() > 0}>
                <text
                  fg={context.theme.text.subdued}
                  onMouseUp={guarded(() => statusMenu(props.sessionID))}
                >
                  History · {historyCount()} earlier attempt
                  {historyCount() === 1 ? "" : "s"}
                </text>
              </Show>
            </Show>
          </Show>
          <Show when={(data().helpers ?? []).length > 0}>
            <text fg={context.theme.text.subdued} marginTop={1}>
              RESEARCH HELPERS ·{" "}
              {
                (data().helpers ?? []).filter((job) => job.status === "running")
                  .length
              }{" "}
              running
            </text>
            <For
              each={(data().helpers ?? [])
                .filter((job) => BUSY.has(job.status ?? ""))
                .concat(
                  (data().helpers ?? [])
                    .filter((job) => !BUSY.has(job.status ?? ""))
                    .slice(-2),
                )}
            >
              {(job) => (
                <box flexDirection="column">
                  <text
                    fg={color(job.status ?? "unknown")}
                    onMouseUp={guarded(() =>
                      workerDetails(job, undefined, false, true),
                    )}
                  >
                    {jobIcon(job)}{" "}
                    {crop(title(plain(job.role, "research")), 18)} ·{" "}
                    {jobStatus(job)}
                  </text>
                  <text
                    fg={context.theme.text.subdued}
                    onMouseUp={guarded(() =>
                      workerDetails(job, undefined, false, true),
                    )}
                  >
                    {crop(jobTask(job), 31)}
                  </text>
                </box>
              )}
            </For>
          </Show>
          <Show when={observed().length > 0}>
            <text fg={context.theme.text.subdued} marginTop={1}>
              SESSION HELPERS ·{" "}
              {
                nativeActive().filter(
                  (child) => nativeStatus(child) === "running",
                ).length
              }{" "}
              running
            </text>
            <text fg={context.theme.text.subdued}>
              Observed · not linked to this spec
            </text>
            <For each={visibleNative()}>
              {(child) => (
                <box flexDirection="column">
                  <text
                    fg={color(nativeStatus(child))}
                    onMouseUp={guarded(() => nativeDetails(child))}
                  >
                    {nativeStatus(child) === "running"
                      ? "●"
                      : nativeStatus(child) === "failed"
                        ? "!"
                        : "○"}{" "}
                    {crop(plain(child.title, "Native child"), 29)}
                  </text>
                  <text
                    fg={context.theme.text.subdued}
                    onMouseUp={guarded(() => nativeDetails(child))}
                  >
                    {" "}
                    {crop(
                      `${plain(child.agent, "Native agent")} · ${nativeStatus(child)}`,
                      31,
                    )}
                  </text>
                  <text
                    fg={context.theme.text.subdued}
                    onMouseUp={guarded(() => nativeDetails(child))}
                  >
                    {" "}
                    {crop(modelText(child.model), 31)}
                  </text>
                </box>
              )}
            </For>
            <Show when={nativeHistory().length > 2}>
              <text
                fg={context.theme.text.subdued}
                onMouseUp={() => setShowNativeHistory(!showNativeHistory())}
              >
                {showNativeHistory()
                  ? "− Collapse session history"
                  : `+ ${nativeHistory().length - 2} earlier helpers`}
              </text>
            </Show>
          </Show>
          <text
            fg={context.theme.text.subdued}
            marginTop={1}
            onMouseUp={guarded(settingsMenu)}
          >
            ⚙ /stip-settings
          </text>
        </box>
      );
    }

    const unregisterSidebar = context.ui.slot({
      append: "sidebar.content",
      render: (props) => <Sidebar sessionID={props.sessionID} />,
    });
    const unregisterCommands = context.ui.slot({
      append: "app",
      render: () => {
        context.keymap.layer(() => ({
          mode: "global",
          commands: [
            {
              id: "stipulate.settings",
              title: "Stipulate settings",
              group: "Stipulate",
              palette: true,
              slash: { name: "stip-settings" },
              run: guarded(settingsMenu),
            },
            {
              id: "stipulate.status",
              title: "Stipulate workflow and workers",
              group: "Stipulate",
              palette: true,
              slash: { name: "stip-status" },
              run: guarded(() => statusMenu()),
            },
          ],
        }));
        return null;
      },
    });
    return () => {
      disposed = true;
      unregisterSidebar();
      unregisterCommands();
    };
  },
});
