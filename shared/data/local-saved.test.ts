import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalSaved, SAVED_KEY } from "./local";
import { StoreError } from "./repositories";

/** A localStorage stand-in that can be made to fail. */
function fakeStorage() {
  const data = new Map<string, string>();
  const state = { blockReads: false, blockWrites: false };
  const localStorage = {
    getItem: (k: string) => {
      if (state.blockReads) throw new Error("SecurityError");
      return data.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (state.blockWrites) throw new Error("QuotaExceededError");
      data.set(k, v);
    },
    removeItem: (k: string) => void data.delete(k),
  };
  return { data, state, localStorage };
}

let storage: ReturnType<typeof fakeStorage>;
beforeEach(() => {
  storage = fakeStorage();
  vi.stubGlobal("window", { localStorage: storage.localStorage });
});
afterEach(() => vi.unstubAllGlobals());

const entry = (recipeId: string, savedAt: number) => ({ ownerId: "guest", recipeId, savedAt });

describe("LocalSaved", () => {
  it("saves and unsaves by recipe id, newest first", async () => {
    const repo = new LocalSaved();
    await repo.save(entry("r1", 1));
    await repo.save(entry("r2", 2));
    expect(await repo.listIds("guest")).toEqual(["r2", "r1"]);
    await repo.unsave("guest", "r1");
    expect(await repo.listIds("guest")).toEqual(["r2"]);
  });

  it("survives a refresh (a new instance reads the same storage)", async () => {
    await new LocalSaved().save(entry("r1", 1));
    expect(await new LocalSaved().listIds("guest")).toEqual(["r1"]);
  });

  it("never stores a duplicate, even when saved twice", async () => {
    const repo = new LocalSaved();
    await repo.save(entry("r1", 1));
    await repo.save(entry("r1", 5));
    const stored = JSON.parse(storage.data.get(SAVED_KEY)!);
    expect(stored).toEqual([entry("r1", 5)]);
  });

  it("stores ids only (no recipe content)", async () => {
    await new LocalSaved().save(entry("r1", 1));
    expect(Object.keys(JSON.parse(storage.data.get(SAVED_KEY)!)[0]).sort()).toEqual([
      "ownerId",
      "recipeId",
      "savedAt",
    ]);
  });

  it("unreadable JSON reads as empty and is cleaned up", async () => {
    storage.data.set(SAVED_KEY, "{not json");
    expect(await new LocalSaved().list("guest")).toEqual([]);
    expect(storage.data.get(SAVED_KEY)).toBe("[]");
  });

  it("a partly damaged list keeps its good entries (and drops duplicates)", async () => {
    storage.data.set(
      SAVED_KEY,
      JSON.stringify([entry("r1", 1), { recipeId: 7 }, entry("r2", 2), entry("r1", 3)]),
    );
    const repo = new LocalSaved();
    expect(await repo.listIds("guest")).toEqual(["r1", "r2"]);
    expect(JSON.parse(storage.data.get(SAVED_KEY)!)).toHaveLength(2);
  });

  it("reports blocked storage instead of pretending the list is empty", async () => {
    storage.state.blockReads = true;
    await expect(new LocalSaved().list("guest")).rejects.toMatchObject({
      code: "unavailable",
    });
  });

  it("a failed write throws a StoreError and leaves the stored list as it was", async () => {
    const repo = new LocalSaved();
    await repo.save(entry("r1", 1));
    storage.state.blockWrites = true;
    await expect(repo.save(entry("r2", 2))).rejects.toBeInstanceOf(StoreError);
    storage.state.blockWrites = false;
    expect(await repo.listIds("guest")).toEqual(["r1"]);
  });

  it("returns nothing on the server (no window)", async () => {
    vi.unstubAllGlobals();
    expect(await new LocalSaved().list("guest")).toEqual([]);
  });
});
