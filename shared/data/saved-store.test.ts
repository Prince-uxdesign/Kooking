import { describe, expect, it, vi } from "vitest";
import { MemorySaved } from "./memory";
import { StoreError, type SavedRepository } from "./repositories";
import { createSavedStore } from "./saved-store";

const flush = () => new Promise((r) => setTimeout(r, 0));

function setup(repo: SavedRepository = new MemorySaved()) {
  let t = 1000;
  const store = createSavedStore(repo, { now: () => ++t });
  const unsubscribe = store.subscribe(() => {});
  return { store, repo, unsubscribe };
}

/** A repository whose writes (or reads) can be made to fail. */
function flaky() {
  const inner = new MemorySaved();
  const fail = { reads: false, writes: false };
  const repo: SavedRepository = {
    list: (o) => (fail.reads ? Promise.reject(new StoreError("unavailable", "x")) : inner.list(o)),
    listIds: (o) => inner.listIds(o),
    save: (e) =>
      fail.writes ? Promise.reject(new StoreError("unavailable", "full")) : inner.save(e),
    unsave: (o, id) =>
      fail.writes ? Promise.reject(new StoreError("unavailable", "full")) : inner.unsave(o, id),
  };
  return { repo, inner, fail };
}

describe("saved store", () => {
  it("loads on first subscriber, then is ready", async () => {
    const { store } = setup();
    expect(store.getSnapshot().status).toBe("loading");
    await flush();
    expect(store.getSnapshot()).toMatchObject({ status: "ready", entries: [] });
  });

  it("saves and unsaves, updating at once and in storage", async () => {
    const { store, repo } = setup();
    const p = store.toggle("r1", "Jollof Rice");
    await p;
    expect(store.isSaved("r1")).toBe(true);
    expect(await repo.listIds("guest")).toEqual(["r1"]);
    expect(store.getSnapshot().announcement).toBe("Saved Jollof Rice.");
    await store.toggle("r1", "Jollof Rice");
    expect(store.isSaved("r1")).toBe(false);
    expect(await repo.listIds("guest")).toEqual([]);
    expect(store.getSnapshot().announcement).toBe("Removed Jollof Rice from saved.");
  });

  it("updates optimistically before the write lands", async () => {
    const { store } = setup();
    await flush();
    const p = store.setSaved("r1", true);
    expect(store.isSaved("r1")).toBe(true);
    await p;
  });

  it("prevents duplicates: saving a saved recipe is a no-op", async () => {
    const { store, repo } = setup();
    await store.setSaved("r1", true);
    const save = vi.spyOn(repo, "save");
    expect(await store.setSaved("r1", true)).toBe(true);
    expect(save).not.toHaveBeenCalled();
    expect(store.getSnapshot().entries).toHaveLength(1);
  });

  it("fast repeated taps settle in order (even number of taps → back to unsaved)", async () => {
    const { store, repo } = setup();
    await flush();
    await Promise.all([
      store.toggle("r1"),
      store.toggle("r1"),
      store.toggle("r1"),
      store.toggle("r1"),
    ]);
    expect(store.isSaved("r1")).toBe(false);
    expect(await repo.listIds("guest")).toEqual([]);
  });

  it("rolls back and explains when the write fails", async () => {
    const { repo, fail } = flaky();
    const { store } = setup(repo);
    await store.setSaved("keep", true);
    fail.writes = true;
    expect(await store.setSaved("r1", true, "Jollof Rice")).toBe(false);
    expect(store.isSaved("r1")).toBe(false);
    expect(store.isSaved("keep")).toBe(true);
    expect(store.getSnapshot().error).toMatch(/Couldn't update/);
    expect(store.getSnapshot().announcement).toBe("Couldn't save Jollof Rice.");
    // A failed unsave puts it back, with its original save time.
    const before = store.getSnapshot().entries[0];
    expect(await store.setSaved("keep", false)).toBe(false);
    expect(store.getSnapshot().entries).toEqual([before]);
    store.dismissError();
    expect(store.getSnapshot().error).toBeNull();
  });

  it("is 'unavailable' when storage can't be read, and recovers on reload", async () => {
    const { repo, fail } = flaky();
    fail.reads = true;
    const { store } = setup(repo);
    await flush();
    expect(store.getSnapshot().status).toBe("unavailable");
    expect(store.getSnapshot().error).toMatch(/still browse and cook/);
    fail.reads = false;
    await store.reload();
    expect(store.getSnapshot().status).toBe("ready");
  });

  it("picks up changes made elsewhere (another tab) on reload", async () => {
    const { store, repo } = setup();
    await flush();
    await repo.save({ ownerId: "guest", recipeId: "other-tab", savedAt: 5 });
    await store.reload();
    expect(store.isSaved("other-tab")).toBe(true);
  });

  it("Undo can restore the original save time (and so the original order)", async () => {
    const { store } = setup();
    await store.setSaved("old", true);
    await store.setSaved("new", true);
    const oldAt = store.getSnapshot().entries.find((e) => e.recipeId === "old")!.savedAt;
    await store.setSaved("old", false);
    await store.setSaved("old", true, "Old", oldAt);
    expect(store.getSnapshot().entries.map((e) => e.recipeId)).toEqual(["new", "old"]);
  });

  it("scopes everything to its owner (ready for accounts)", async () => {
    const repo = new MemorySaved();
    await repo.save({ ownerId: "account-1", recipeId: "theirs", savedAt: 1 });
    const store = createSavedStore(repo, { ownerId: "guest" });
    store.subscribe(() => {});
    await flush();
    expect(store.getSnapshot().entries).toEqual([]);
  });
});
