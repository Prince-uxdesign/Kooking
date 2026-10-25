/** Explore-area skeleton: title, chip row, and a 2/3-up card grid. */
export default function RecipesLoading() {
  return (
    <div role="status" aria-label="Loading recipes" className="flex flex-col gap-8">
      <div className="h-9 w-48 max-w-full animate-pulse rounded-full bg-surface-100" />
      <div className="flex gap-2 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-11 w-32 shrink-0 animate-pulse rounded-full bg-surface-100" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="aspect-[4/5] animate-pulse rounded-3xl bg-white card-edge" />
        ))}
      </div>
    </div>
  );
}
