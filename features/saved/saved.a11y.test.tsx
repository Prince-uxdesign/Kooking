// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalSaved, SAVED_KEY } from "@/shared/data/local";
import { MemorySaved } from "@/shared/data/memory";
import type { SavedRepository } from "@/shared/data/repositories";
import { StoreError } from "@/shared/data/repositories";
import { createSavedStore, replaceSavedStore } from "@/shared/data/saved-store";
import type { RecipeSummary } from "@/shared/domain/discovery";
import { axeViolations, describeViolations } from "@/shared/testing/axe";
import { act, mount, type Mounted } from "@/shared/testing/render";
import { RecipeGrid } from "@/shared/ui/RecipeGrid";
import { SaveButton } from "./SaveButton";
import { SavedAnnouncer } from "./SavedAnnouncer";
import { SavedRecipesScreen } from "./SavedRecipesScreen";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

let mounted: Mounted | null = null;
const settle = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });

function useStore(repo: SavedRepository = new MemorySaved()) {
  let t = 1000;
  const store = createSavedStore(repo, { now: () => ++t });
  replaceSavedStore(store);
  return { store, repo };
}

beforeEach(() => window.localStorage.clear());
afterEach(async () => {
  await mounted?.unmount();
  mounted = null;
  replaceSavedStore(null);
});

const clean = async (el: Element) =>
  expect(describeViolations(await axeViolations(el))).toEqual([]);

const recipe = (id: string, title: string, categories: string[] = ["rice"]): RecipeSummary =>
  ({
    id,
    slug: id,
    title,
    totalMinutes: 35,
    servings: 4,
    stepCount: 3,
    categories,
    demo: true,
  }) as RecipeSummary;
const catalog = [recipe("r1", "Jollof Rice"), recipe("r2", "Egusi Soup", ["stews-soups"])];

const pressed = (root: HTMLElement, title: string) =>
  [...root.querySelectorAll(`button[aria-label="Save ${title}"]`)].map((b) =>
    b.getAttribute("aria-pressed"),
  );

describe("save buttons", () => {
  it("every button for a recipe updates together, and the change is announced once", async () => {
    useStore();
    mounted = await mount(
      <main>
        <h1>Home</h1>
        <SaveButton recipeId="r1" title="Jollof Rice" />
        <SaveButton recipeId="r1" title="Jollof Rice" variant="featured" />
        <h2>Explore recipes</h2>
        <RecipeGrid recipes={catalog} from="/" />
        <SavedAnnouncer />
      </main>,
    );
    await settle();
    const root = mounted.container;
    expect(pressed(root, "Jollof Rice")).toEqual(["false", "false", "false"]);

    const button = root.querySelector('button[aria-label="Save Jollof Rice"]') as HTMLButtonElement;
    button.focus();
    await act(async () => button.click());
    await settle();
    expect(pressed(root, "Jollof Rice")).toEqual(["true", "true", "true"]);
    expect(pressed(root, "Egusi Soup")).toEqual(["false"]);
    const status = [...root.querySelectorAll('[role="status"]')].map((s) => s.textContent);
    expect(status).toContain("Saved Jollof Rice.");
    expect(document.activeElement).toBe(button); // focus stays put
    await clean(root);
  });

  it("is a real, keyboard-operable button with a 44px target and doesn't follow the card link", async () => {
    useStore();
    mounted = await mount(<RecipeGrid recipes={catalog} from="/recipes" />);
    await settle();
    const b = mounted.container.querySelector('button[aria-label="Save Egusi Soup"]')!;
    expect(b.tagName).toBe("BUTTON");
    expect(b.className).toContain("h-11 w-11");
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    await act(async () => void b.dispatchEvent(click));
    expect(click.defaultPrevented).toBe(true);
  });

  it("persists to device storage and survives a reload", async () => {
    useStore(new LocalSaved());
    mounted = await mount(<SaveButton recipeId="r2" title="Egusi Soup" />);
    await settle();
    await act(async () => (mounted!.container.querySelector("button") as HTMLElement).click());
    await settle();
    expect(JSON.parse(window.localStorage.getItem(SAVED_KEY)!)).toEqual([
      expect.objectContaining({ ownerId: "guest", recipeId: "r2" }),
    ]);
    await mounted.unmount();

    // "Refresh": a brand-new store reading the same storage.
    useStore(new LocalSaved());
    mounted = await mount(<SaveButton recipeId="r2" title="Egusi Soup" />);
    await settle();
    expect(pressed(mounted.container, "Egusi Soup")).toEqual(["true"]);
  });

  it("a failed save rolls back and shows a dismissible notice", async () => {
    const repo = new MemorySaved();
    repo.save = () => Promise.reject(new StoreError("unavailable", "full"));
    useStore(repo);
    mounted = await mount(
      <main>
        <h1>Explore</h1>
        <SaveButton recipeId="r1" title="Jollof Rice" />
        <SavedAnnouncer />
      </main>,
    );
    await settle();
    await act(async () => (mounted!.container.querySelector("button") as HTMLElement).click());
    await settle();
    expect(pressed(mounted.container, "Jollof Rice")).toEqual(["false"]);
    const alert = mounted.container.querySelector('[role="alert"]')!;
    expect(alert.textContent).toMatch(/Couldn't update your saved recipes/);
    await clean(mounted.container);
    await act(async () =>
      (alert.querySelector('button[aria-label="Dismiss"]') as HTMLElement).click(),
    );
    expect(mounted.container.querySelector('[role="alert"]')).toBeNull();
  });
});

describe("Saved screen", () => {
  const screen = () => (
    <main>
      <h1>Saved</h1>
      <SavedRecipesScreen catalog={catalog} />
    </main>
  );

  it("empty: explains and links back to discovery", async () => {
    useStore();
    mounted = await mount(screen());
    await settle();
    expect(mounted.container.querySelector("h2")?.textContent).toBe("No saved recipes yet");
    const link = mounted.container.querySelector('a[href="/recipes"]')!;
    expect(link.textContent).toBe("Explore recipes");
    await clean(mounted.container);
  });

  it("lists saved recipes newest first, linking to the recipe with a way back", async () => {
    const { store } = useStore();
    await store.setSaved("r1", true);
    await store.setSaved("r2", true);
    mounted = await mount(screen());
    await settle();
    const titles = [...mounted.container.querySelectorAll("h3")].map((h) => h.textContent);
    expect(titles).toEqual(["Egusi Soup", "Jollof Rice"]);
    const link = mounted.container.querySelector("h3 a")!;
    expect(link.getAttribute("href")).toContain("/recipes/r2");
    expect(link.getAttribute("href")).toContain("from=%2Fsaved");
    expect(mounted.container.textContent).toContain("2 saved recipes");
    await clean(mounted.container);
  });

  it("removing from the list offers Undo, moves focus to it, and Undo restores the place", async () => {
    const { store } = useStore();
    await store.setSaved("r1", true);
    await store.setSaved("r2", true);
    mounted = await mount(screen());
    await settle();
    const remove = mounted.container.querySelector(
      'button[aria-label="Save Egusi Soup"]',
    ) as HTMLButtonElement;
    remove.focus();
    await act(async () => remove.click());
    await settle();
    expect(mounted.container.textContent).toContain("Removed Egusi Soup from saved.");
    const undo = [...mounted.container.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Undo",
    )!;
    expect(document.activeElement).toBe(undo); // the pressed button went away with its card
    await clean(mounted.container);
    await act(async () => undo.click());
    await settle();
    expect([...mounted.container.querySelectorAll("h3")].map((h) => h.textContent)).toEqual([
      "Egusi Soup",
      "Jollof Rice",
    ]);
  });

  it("recipes that are no longer available are explained and can be removed", async () => {
    const { store } = useStore();
    await store.setSaved("r1", true);
    await store.setSaved("deleted-recipe", true);
    mounted = await mount(screen());
    await settle();
    expect(mounted.container.textContent).toContain("1 saved recipe is no longer available");
    expect(mounted.container.querySelectorAll("h3")).toHaveLength(1);
    await clean(mounted.container);
    const remove = [...mounted.container.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Remove it",
    )!;
    await act(async () => remove.click());
    await settle();
    expect(store.isSaved("deleted-recipe")).toBe(false);
    expect(store.isSaved("r1")).toBe(true);
    expect(mounted.container.textContent).not.toContain("no longer available");
  });

  it("only unavailable recipes: the empty state shows with the notice", async () => {
    const { store } = useStore();
    await store.setSaved("gone", true);
    mounted = await mount(screen());
    await settle();
    expect(mounted.container.textContent).toContain("no longer available");
    expect(mounted.container.textContent).toContain("No saved recipes yet");
  });

  it("many saved recipes get a labelled filter", async () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      recipe(
        `m${i}`,
        i === 3 ? "Egusi Soup" : `Rice dish ${i}`,
        i === 3 ? ["stews-soups"] : ["rice"],
      ),
    );
    const { store } = useStore();
    for (const r of many) await store.setSaved(r.id, true);
    mounted = await mount(
      <main>
        <h1>Saved</h1>
        <SavedRecipesScreen catalog={many} />
      </main>,
    );
    await settle();
    const input = mounted.container.querySelector("input") as HTMLInputElement;
    expect(mounted.container.querySelector(`label[for="${input.id}"]`)!.textContent).toBe(
      "Filter saved recipes",
    );
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(async () => {
      setter.call(input, "soup");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect([...mounted.container.querySelectorAll("h3")].map((h) => h.textContent)).toEqual([
      "Egusi Soup",
    ]);
    expect(mounted.container.textContent).toContain("1 of 8 saved recipes");
    await clean(mounted.container);
  });

  it("storage that can't be read shows an error with a retry, not an empty list", async () => {
    const repo = new MemorySaved();
    repo.list = () => Promise.reject(new StoreError("unavailable", "blocked"));
    useStore(repo);
    mounted = await mount(screen());
    await settle();
    const alert = mounted.container.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain("aren't available on this device");
    expect(alert.textContent).toContain("still browse recipes and cook");
    expect(mounted.container.textContent).not.toContain("No saved recipes yet");
    await clean(mounted.container);
  });

  it("corrupted storage still shows whatever could be salvaged", async () => {
    window.localStorage.setItem(
      SAVED_KEY,
      JSON.stringify([{ ownerId: "guest", recipeId: "r1", savedAt: 5 }, { broken: true }, 42]),
    );
    useStore(new LocalSaved());
    mounted = await mount(screen());
    await settle();
    expect([...mounted.container.querySelectorAll("h3")].map((h) => h.textContent)).toEqual([
      "Jollof Rice",
    ]);
  });

  it("shows a loading state before the device's list is read", async () => {
    const repo = new MemorySaved();
    repo.list = () => new Promise(() => {}); // never resolves
    useStore(repo);
    mounted = await mount(screen());
    expect(mounted.container.querySelector('[role="status"]')!.textContent).toContain(
      "Loading your saved recipes",
    );
  });
});
