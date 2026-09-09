import { Plugin } from "@opencode/plugin";
import { z } from "zod";
import { existsSync } from "node:fs";
import { relative, isAbsolute, resolve } from "node:path";
import { ProjectStore } from "./store.mjs";
import { Coordinator } from "./coordinator.mjs";
import { invariant, slug, refText, resolveProfile } from "./routing.mjs";
import { Stip } from "./rpc";

export default Plugin.define({
  id: "stipulate",
  async setup(ctx) {
    const store = new ProjectStore(ctx.location.directory);
    const registrations: Array<{ dispose: () => Promise<void> }> = [];
    let native: any;
    const definitions = new Map<string, any>();
    const activeModels = new Map<string, any>();
    const jobs = () => [
      ...store.changes().flatMap((c) =>
        (store.registry(c.id)?.jobs || []).map((j: any) => ({
          ...j,
          change_id: c.id,
        })),
      ),
      ...(store.helpers()?.jobs || []),
    ];
    const worker = (sessionID: string, agent?: string) =>
      jobs()
        .filter(
          (j) => j.session_id === sessionID || (agent && j.agent_id === agent),
        )
        .sort((a, b) => b.attempt - a.attempt)[0];
    registrations.push(
      await ctx.agent.transform((editor) => {
        for (const job of [...jobs(), ...definitions.values()]) {
          const base = editor.get(
            job.profile.requested.agent &&
              job.profile.requested.agent !== "inherit"
              ? job.profile.requested.agent
              : "general",
          );
          if (!base) continue;
          editor.update(job.agent_id, (agent) => {
            Object.assign(agent, structuredClone(base), {
              id: job.agent_id,
              name: job.agent_id,
              mode: "subagent",
              hidden: true,
              model: job.profile.model,
              description: `Stipulate ${job.role}: ${job.objective}`,
            });
            agent.system = [
              base.system || "",
              "Work only on your assigned Stipulate task. Preserve others’ changes. Do not delegate, approve contracts, accept your own contribution or modify workflow state. Return evidence to the coordinator.",
            ].join("\n");
            agent.permissions = [
              ...base.permissions,
              { action: "subagent", resource: "*", effect: "deny" },
              { action: "stip_*", resource: "*", effect: "deny" },
            ];
          });
        }
      }),
    );
    const host = {
      models: async () => (await ctx.catalog.model.list()).data,
      session: async (id: string) => {
        const session = await ctx.session.get({ sessionID: id as any });
        return {
          ...session,
          model: activeModels.get(id) || session.model,
          execution_observed: activeModels.has(id),
        };
      },
      waiting: async (id: string) =>
        (await ctx.permission.list({ sessionID: id as any })).length > 0,
      interrupt: async (id: string) => {
        await ctx.session.interrupt({ sessionID: id as any, continue: false });
        await ctx.session.wait(
          { sessionID: id as any },
          { signal: AbortSignal.timeout(15000) },
        );
        return { quiescent: true };
      },
      prepare: async (job: any) => {
        definitions.set(job.agent_id, job);
        await ctx.agent.reload();
        const agent = await ctx.agent.get({ agentID: job.agent_id } as any);
        invariant(agent, "Native worker profile could not be loaded");
      },
      spawn: async (input: any, context: any) => {
        invariant(
          native,
          "This OpenCode build does not expose the native subagent tool",
        );
        return native.execute(input, context);
      },
      childID: (result: any) => {
        const m = result.metadata || {};
        return (
          m.sessionID ||
          m.session_id ||
          m.sessionId ||
          result.output?.sessionID ||
          (typeof result.content === "string"
            ? result.content.match(/ses_[a-zA-Z0-9]+/)?.[0]
            : undefined)
        );
      },
    };
    const coordinator = new Coordinator(store, host);
    const result = (value: any) => ({
      content: JSON.stringify(value),
      metadata: { stipulate: true },
    });
    const main = async (sessionID: string) => {
      invariant(
        !(await host.session(sessionID)).parentID,
        "This operation belongs to the main coordinator",
      );
    };
    registrations.push(
      await ctx.tool.transform((editor) => {
        native = editor.get("subagent");
        const add = (
          name: string,
          description: string,
          input: any,
          execute: any,
        ) =>
          editor.add({
            name,
            description,
            input,
            execute,
            options: {
              codemode: false,
              ...(["stip_delegate", "stip_research"].includes(name)
                ? { permission: "subagent" }
                : {}),
            },
          });
        add(
          "stip_status",
          "Read current Stipulate contract and native worker status; never advances the lifecycle.",
          z.object({ change_id: z.string().optional() }),
          async (input: any, context: any) =>
            result(
              await coordinator.snapshot(context.sessionID, input.change_id),
            ),
        );
        add(
          "stip_research",
          "Ask one bounded read-only research or specialist question during exploration or validation. Uses the configured native role/phase profile; no approval or implementation task is created. Discovery stays with you. Do not call automatically. Use background:false in a private one-shot CLI run; bring returned findings into the main conversation.",
          z.object({
            question: z.string(),
            role: z.string().optional(),
            phase: z.enum(["explore", "validate"]).optional(),
            change_id: z.string().optional(),
            background: z.boolean().optional(),
          }),
          async (input: any, context: any) =>
            result(await coordinator.research(input, context)),
        );
        add(
          "stip_plan",
          "Install an execution plan before human approval. Replacing a plan invalidates approval. Discovery stays with the coordinator.",
          z.object({
            change_id: z.string(),
            plan: z.any(),
            migrate: z.boolean().optional(),
          }),
          async (input: any, context: any) => {
            await main(context.sessionID);
            slug(input.change_id);
            return result(
              await coordinator.installPlan(
                input.change_id,
                input.plan,
                input.migrate,
              ),
            );
          },
        );
        add(
          "stip_delegate",
          "Dispatch one ready approved Stipulate task to a native OpenCode child. By default returns immediately; wait for OpenCode completion notification. Use background:false to wait in a private one-shot CLI run. Dependencies need accepted contributions. Repeat only for independent work or requested correction.",
          z.object({
            change_id: z.string(),
            task_id: z.string(),
            instructions: z.string().optional(),
            correction: z.boolean().optional(),
            background: z.boolean().optional(),
          }),
          async (input: any, context: any) =>
            result(await coordinator.delegate(input, context)),
        );
        add(
          "stip_interrupt",
          "Interrupt a known native worker and wait for it to stop. An unknown launch without a session ID needs manual reconciliation.",
          z.object({
            change_id: z.string(),
            task_id: z.string(),
            reason: z.string().optional(),
          }),
          async (input: any, context: any) => {
            await main(context.sessionID);
            return result(
              await coordinator.interrupt(
                input.change_id,
                input.task_id,
                undefined,
                input.reason,
              ),
            );
          },
        );
        add(
          "stip_contribution",
          "Record the coordinator’s integration review after a native worker returns. Check files and evidence first; returned does not mean accepted.",
          z.object({
            change_id: z.string(),
            task_id: z.string(),
            decision: z.enum(["accepted", "rejected"]),
            reason: z.string(),
          }),
          async (input: any, context: any) => {
            await main(context.sessionID);
            return result(
              await coordinator.contribution(
                input.change_id,
                input.task_id,
                input.decision,
                input.reason,
              ),
            );
          },
        );
      }),
    );
    registrations.push(
      await ctx.session.hook("context", (context) => {
        activeModels.set(context.sessionID, context.model);
        const j = worker(context.sessionID, context.agent);
        if (j) {
          for (const name of Object.keys(context.tools))
            if (name === "subagent" || name.startsWith("stip_"))
              delete context.tools[name];
        }
      }),
    );
    // Narrow native filesystem permissions without changing existing allow/ask/deny decisions.
    registrations.push(
      await ctx.permission.hook("evaluate", (evaluation) => {
        const j = worker(evaluation.sessionID, evaluation.agent);
        if (!j) return;
        if (
          evaluation.action === "subagent" ||
          evaluation.action.startsWith("stip_")
        ) {
          evaluation.effect = "deny";
          return;
        }
        if (/^(write|edit|patch)(\.|$)/.test(evaluation.action)) {
          const allowed = evaluation.resources.every((resource) => {
            const p = relative(
              store.root,
              resolve(store.root, resource),
            ).replaceAll("\\", "/");
            if (
              isAbsolute(p) ||
              p.startsWith("..") ||
              /^(\.git|\.workflow)(\/|$)/i.test(p)
            )
              return false;
            return j.write_paths.some(
              (prefix: string) =>
                p.toLowerCase() === prefix.toLowerCase() ||
                p.toLowerCase().startsWith(prefix.toLowerCase() + "/"),
            );
          });
          if (!allowed) {
            evaluation.effect = "deny";
            evaluation.message =
              "Outside this Stipulate worker’s approved write ownership.";
          }
        }
      }),
    );
    registrations.push(
      await ctx.rpc.register(Stip, {
        snapshot: async (input) =>
          JSON.parse(
            JSON.stringify(
              await coordinator.snapshot(input.sessionID, input.changeID),
            ),
          ),
        bind: async (input) => {
          await main(input.sessionID);
          invariant(
            store.changes().some((c) => c.id === input.changeID),
            "Unknown change",
          );
          store.bind(input.sessionID, input.changeID);
          return JSON.parse(
            JSON.stringify(await coordinator.snapshot(input.sessionID)),
          );
        },
        settings: async (input) => {
          store.saveSettings(input.value, input.scope, input.revision);
          try {
            await ctx.agent.reload();
          } catch {
            return {
              saved: true,
              warning:
                "Settings saved. Restart OpenCode to refresh agent definitions.",
            };
          }
          return { saved: true };
        },
        artifact: async (input) =>
          store.readArtifact(input.changeID, input.kind),
        action: async (input) =>
          input.action === "interrupt"
            ? coordinator.interrupt(
                input.changeID,
                input.taskID,
                input.runID,
                input.reason,
              )
            : coordinator.contribution(
                input.changeID,
                input.taskID,
                input.action === "accept" ? "accepted" : "rejected",
                input.reason || "",
                input.runID,
              ),
      }),
    );
    return async () => {
      for (const r of registrations.reverse()) await r.dispose();
    };
  },
});
