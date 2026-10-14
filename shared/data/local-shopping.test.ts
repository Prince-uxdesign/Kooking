import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addPersonalItem,
  emptyList,
  setItemChecked,
  validateDraft,
} from "@/shared/domain/shopping";
import { LocalShopping } from "./local";

/** Minimal in-memory localStorage so the real adapter runs in Node. */
function installStorage() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  (globalThis as unknown as { window: unknown }).window = { localStorage };
  return store;
}

describe("LocalShopping persistence", () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = installStorage();
  });
  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  const item = (name: string) => {
    const r = validateDraft({ name, qtyText: "", unit: "", note: "", category: "" });
    if (!r.ok) throw new Error();
    return r.value;
  };

  it("survives a refresh (a new adapter instance reads the same data)", async () => {
    let list = addPersonalItem(emptyList("guest", 1), item("Bread"), { id: "a", now: 2 }).list;
    list = setItemChecked(list, "a", true, 3);
    await new LocalShopping().store(list);

    const reloaded = await new LocalShopping().load("guest");
    expect(reloaded?.items[0]).toMatchObject({ name: "Bread", checked: true });
  });

  it("keeps lists separate per owner", async () => {
    await new LocalShopping().store(
      addPersonalItem(emptyList("guest", 1), item("Bread"), { id: "a", now: 2 }).list,
    );
    await new LocalShopping().store(
      addPersonalItem(emptyList("user-2", 1), item("Milk"), { id: "b", now: 2 }).list,
    );
    expect((await new LocalShopping().load("guest"))!.items.map((i) => i.name)).toEqual(["Bread"]);
    expect((await new LocalShopping().load("user-2"))!.items.map((i) => i.name)).toEqual(["Milk"]);
  });

  it("returns nothing for an anonymous visitor with no list yet", async () => {
    expect(await new LocalShopping().load("guest")).toBeNull();
  });

  it("drops a corrupt stored list instead of crashing", async () => {
    store.set("kooking:lists:v1", "{not json");
    expect(await new LocalShopping().load("guest")).toBeNull();
  });

  it("reads Phase 20 items saved before the new fields existed", async () => {
    store.set(
      "kooking:lists:v1",
      JSON.stringify([
        {
          id: "list_guest",
          ownerId: "guest",
          updatedAt: 1,
          items: [
            {
              id: "shop:r:l",
              origin: "recipe",
              recipeId: "r",
              name: "Rice",
              unit: "g",
              qty: 100,
              checked: false,
              createdAt: 1,
            },
          ],
        },
      ]),
    );
    const list = await new LocalShopping().load("guest");
    expect(list!.items[0]).toMatchObject({ name: "Rice", needsClarification: false });
  });
});
