import type { Recipe } from "@/shared/domain/recipe-schema";
import type { ShoppingList } from "@/shared/domain/shopping";
import { pickResumable, type CookingSession } from "@/shared/domain/session";
import { recordView, type RecentView } from "@/shared/domain/history";
import type { SavedRecipe } from "@/shared/domain/user";
import type {
  HistoryRepository,
  RecipeRepository,
  SavedRepository,
  SessionRepository,
  ShoppingRepository,
} from "./repositories";
import { StoreError } from "./repositories";

/** In-memory adapters — used by tests and previews. No persistence. */
export class MemoryRecipes implements RecipeRepository {
  constructor(private readonly recipes: Recipe[]) {}

  async list(): Promise<Recipe[]> {
    return [...this.recipes];
  }

  async getById(id: string): Promise<Recipe> {
    const found = this.recipes.find((r) => r.id === id);
    if (!found) throw new StoreError("not-found", `recipe '${id}' not found`);
    return found;
  }

  async getBySlug(slug: string): Promise<Recipe> {
    const found = this.recipes.find((r) => r.slug === slug);
    if (!found) throw new StoreError("not-found", `recipe '${slug}' not found`);
    return found;
  }
}

export class MemorySaved implements SavedRepository {
  private readonly ids = new Map<string, Set<string>>();

  async listIds(ownerId: string): Promise<string[]> {
    return [...(this.ids.get(ownerId) ?? [])];
  }

  async save(entry: SavedRecipe): Promise<void> {
    const set = this.ids.get(entry.ownerId) ?? new Set<string>();
    set.add(entry.recipeId);
    this.ids.set(entry.ownerId, set);
  }

  async unsave(ownerId: string, recipeId: string): Promise<void> {
    this.ids.get(ownerId)?.delete(recipeId);
  }
}

export class MemoryShopping implements ShoppingRepository {
  private readonly lists = new Map<string, ShoppingList>();

  async load(ownerId: string): Promise<ShoppingList | null> {
    return this.lists.get(ownerId) ?? null;
  }

  async store(list: ShoppingList): Promise<void> {
    this.lists.set(list.ownerId, list);
  }
}

export class MemorySessions implements SessionRepository {
  private readonly sessions = new Map<string, CookingSession>();

  async latestForRecipe(recipeId: string): Promise<CookingSession | null> {
    const candidates = [...this.sessions.values()]
      .filter((s) => s.recipeId === recipeId && s.status !== "completed")
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return candidates[0] ?? null;
  }

  async latestResumable(): Promise<CookingSession | null> {
    return pickResumable([...this.sessions.values()]);
  }

  async getById(id: string): Promise<CookingSession> {
    const found = this.sessions.get(id);
    if (!found) throw new StoreError("not-found", `session '${id}' not found`);
    return found;
  }

  async store(session: CookingSession): Promise<void> {
    this.sessions.set(session.id, session);
  }
}

export class MemoryHistory implements HistoryRepository {
  private views: RecentView[] = [];

  async list(): Promise<RecentView[]> {
    return [...this.views];
  }

  async record(recipeId: string, now: number): Promise<void> {
    this.views = recordView(this.views, recipeId, now);
  }
}
