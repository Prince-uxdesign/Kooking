import collectionsJson from "@/content/collections.json";
import ingredientsJson from "@/content/ingredients.json";
import { SEED_RECIPES } from "@/content/seed";
import { collectionsSchema, type Collection } from "@/shared/domain/collections";
import { z } from "zod";
import {
  recipeSchema,
  reusableIngredientSchema,
  type ReusableIngredient,
} from "@/shared/domain/recipe-schema";
import { MemoryRecipes } from "./memory";
import type { CollectionRepository, IngredientRepository, RecipeRepository } from "./repositories";
import { StoreError } from "./repositories";

/**
 * App-wide recipe catalog. Today: seed JSON parsed through the schema
 * (fails closed — an invalid payload rejects the call rather than
 * rendering half a recipe). Later: a CMS/Supabase adapter behind the
 * same RecipeRepository interface.
 */
class SeedCatalog implements RecipeRepository {
  private repo: MemoryRecipes | null = null;

  private load(): MemoryRecipes {
    this.repo ??= new MemoryRecipes(SEED_RECIPES.map((raw) => recipeSchema.parse(raw)));
    return this.repo;
  }

  async list() {
    return this.load().list();
  }

  async getById(id: string) {
    return this.load().getById(id);
  }

  async getBySlug(slug: string) {
    return this.load().getBySlug(slug);
  }
}

const catalog = new SeedCatalog();

export function getRecipeRepository(): RecipeRepository {
  return catalog;
}

/** Collections parse through the schema too; an invalid file rejects the call. */
class ContentCollections implements CollectionRepository {
  private all: Collection[] | null = null;

  private load(): Collection[] {
    this.all ??= collectionsSchema.parse(collectionsJson);
    return this.all;
  }

  async list() {
    return [...this.load()];
  }

  async getBySlug(slug: string) {
    const found = this.load().find((c) => c.slug === slug);
    if (!found) throw new StoreError("not-found", `collection '${slug}' not found`);
    return found;
  }
}

const collections = new ContentCollections();

export function getCollectionRepository(): CollectionRepository {
  return collections;
}

/** Ingredient catalog. Parsed through the schema; ids must be unique. */
class ContentIngredients implements IngredientRepository {
  private all: ReusableIngredient[] | null = null;

  async list() {
    if (!this.all) {
      const parsed = z.array(reusableIngredientSchema).parse(ingredientsJson);
      if (new Set(parsed.map((i) => i.id)).size !== parsed.length) {
        throw new StoreError("invalid", "ingredient ids must be unique");
      }
      this.all = parsed;
    }
    return [...this.all];
  }
}

const ingredients = new ContentIngredients();

export function getIngredientRepository(): IngredientRepository {
  return ingredients;
}
