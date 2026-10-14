import { collectionHref, type CollectionOverview } from "@/shared/domain/collections";
import { recipeCountLabel } from "@/shared/domain/categories";
import { ListGroup, ListIcon, ListRow } from "@/shared/ui/ListGroup";
import { RecipeImage } from "@/shared/ui/RecipeImage";
import { iconForCollection, iconForRecipe } from "./category-icons";

/**
 * Collections as list rows — a different rhythm from the recipe grid.
 * A row leads with its first recipe's photo when there is one, else
 * the collection's icon.
 */
export function CollectionList({ overviews }: { overviews: CollectionOverview[] }) {
  return (
    <ListGroup label="Recipe collections">
      {overviews.map(({ collection, count, cover }) => {
        const Icon = iconForCollection(collection.rule);
        return (
          <ListRow
            key={collection.slug}
            href={collectionHref(collection.slug)}
            title={collection.title}
            meta={`${recipeCountLabel(count)} · ${collection.description}`}
            leading={
              cover.image ? (
                <RecipeImage
                  image={cover.image}
                  compact
                  FallbackIcon={iconForRecipe(cover.categories)}
                  className="h-14 w-14 shrink-0 rounded-[18px]"
                />
              ) : (
                <ListIcon>
                  <Icon size={20} strokeWidth={1.75} />
                </ListIcon>
              )
            }
          />
        );
      })}
    </ListGroup>
  );
}
