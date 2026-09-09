import { Rpc } from "@opencode/plugin/rpc";
import { z } from "zod";
export const Stip = Rpc.define({
  id: "stipulate",
  events: {},
  methods: {
    snapshot: {
      input: z.object({
        sessionID: z.string().optional(),
        changeID: z.string().optional(),
      }),
      output: z.any(),
    },
    bind: {
      input: z.object({ sessionID: z.string(), changeID: z.string() }),
      output: z.any(),
    },
    settings: {
      input: z.object({
        value: z.any(),
        scope: z.enum(["project", "local", "personal"]),
        revision: z.string(),
      }),
      output: z.any(),
    },
    artifact: {
      input: z.object({
        changeID: z.string(),
        kind: z.enum([
          "proposal",
          "spec",
          "tasks",
          "evidence",
          "execution-plan",
        ]),
      }),
      output: z.any(),
    },
    action: {
      input: z.object({
        changeID: z.string(),
        taskID: z.string(),
        runID: z.string().optional(),
        action: z.enum(["accept", "reject", "interrupt"]),
        reason: z.string().optional(),
      }),
      output: z.any(),
    },
  },
});
