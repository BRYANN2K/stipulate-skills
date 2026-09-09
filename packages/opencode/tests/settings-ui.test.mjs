import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { profileOptions } from "../src/profile-options.mjs";
import { capabilities, resolveProfile } from "../src/routing.mjs";
import { ProjectStore, atomic, hash } from "../src/store.mjs";

const models = [
  {
    providerID: "probe",
    id: "model",
    settings: { reasoningEffort: "low" },
    variants: [
      {
        id: "high-fast",
        settings: { reasoningEffort: "high", serviceTier: "priority" },
      },
    ],
  },
];
const catalog = capabilities(models)[0];
const parent = { providerID: "probe", id: "model" };

test("menus resolve an inherited counterpart instead of treating it as any effort or speed", () => {
  const options = profileOptions(
    { model: "inherit", effort: "inherit", fast: "inherit" },
    catalog,
    "probe/model",
  );
  assert.deepEqual(options.efforts, ["low"]);
  assert.equal(options.fastOn, false);
  assert.equal(options.fastOff, true);
  assert.equal(options.inheritEffort, true);
  assert.equal(options.inheritFast, true);
  assert.throws(
    () =>
      resolveProfile(
        { defaults: { effort: "high" } },
        "backend",
        "apply",
        parent,
        models,
      ),
    /combination/,
  );
});

test("inherited coordinator variants and explicit model defaults remain distinct", () => {
  const inherited = profileOptions(
    { model: "inherit" },
    catalog,
    "probe/model#high-fast",
  );
  assert.deepEqual(inherited.efforts, ["high"]);
  assert.equal(inherited.fastOn, true);
  assert.equal(inherited.fastOff, false);
  const explicit = profileOptions(
    { model: "probe/model" },
    catalog,
    "probe/model#high-fast",
  );
  assert.deepEqual(explicit.efforts, ["low"]);
  assert.equal(explicit.fastOn, false);
});

test("inherit entries are disabled when they would break an explicit counterpart", () => {
  const options = profileOptions(
    { model: "inherit", effort: "high", fast: true },
    catalog,
    "probe/model",
  );
  assert.equal(options.inheritEffort, false);
  assert.equal(options.inheritFast, false);
  assert.deepEqual(options.efforts, ["high"]);
  assert.equal(options.fastOn, true);
});

test("every menu offer resolves without silently changing the other dimension", () => {
  for (const ref of ["probe/model", "probe/model#high-fast"]) {
    const current = {
      ...parent,
      ...(ref.includes("#") ? { variant: "high-fast" } : {}),
    };
    for (const effort of ["inherit", "low", "high"]) {
      for (const fast of ["inherit", true, false]) {
        const profile = { model: "inherit", effort, fast };
        const options = profileOptions(profile, catalog, ref);
        for (const value of [
          ...options.efforts,
          ...(options.inheritEffort ? ["inherit"] : []),
        ])
          assert.doesNotThrow(() =>
            resolveProfile(
              { defaults: { ...profile, effort: value } },
              "backend",
              "apply",
              current,
              models,
            ),
          );
        for (const value of [
          ...(options.fastOn ? [true] : []),
          ...(options.fastOff ? [false] : []),
          ...(options.inheritFast ? ["inherit"] : []),
        ])
          assert.doesNotThrow(() =>
            resolveProfile(
              { defaults: { ...profile, fast: value } },
              "backend",
              "apply",
              current,
              models,
            ),
          );
      }
    }
  }
});

test("unresolved models and variants do not invent capability choices", () => {
  for (const ref of ["inherit", "probe/missing", "probe/model#missing"]) {
    const options = profileOptions({ model: "inherit" }, catalog, ref);
    assert.deepEqual(options.efforts, []);
    assert.equal(options.fastOn, false);
    assert.equal(options.inheritEffort, false);
  }
});

test("stale scope saves reject concurrent preferences even when an override masks them", () => {
  const root = realpathSync(
    mkdtempSync(join(tmpdir(), "stip-settings-review-")),
  );
  try {
    const store = new ProjectStore(root, {
      personal: join(root, "personal.json"),
    });
    atomic(store.personal, { orchestration: { defaults: { max_workers: 2 } } });
    atomic(join(root, ".workflow/config.json"), {
      orchestration: { defaults: { max_workers: 8 } },
    });
    const draft = store.settingsByScope().personal;
    const oldMerged = hash(store.settings());
    const revision = hash(store.settingsByScope());
    atomic(store.personal, { orchestration: { defaults: { max_workers: 3 } } });
    assert.equal(
      hash(store.settings()),
      oldMerged,
      "Project override masks the concurrent edit",
    );
    assert.throws(
      () => store.saveSettings(draft, "personal", revision),
      /changed elsewhere/,
    );
    assert.equal(store.settingsByScope().personal.defaults.max_workers, 3);
    store.saveSettings(draft, "personal", hash(store.settingsByScope()));
    assert.equal(store.settingsByScope().personal.defaults.max_workers, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
