"use client";

import { Bookmark, Flame, Heart, Home, ListChecks, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Badge,
  BottomNav,
  BottomSheet,
  Button,
  Card,
  Checkbox,
  CollectionHeading,
  CompactRecipeCard,
  EmptyCollectionState,
  EmptyState,
  ErrorState,
  FeaturedRecipeCard,
  HorizontalRecipeList,
  IconButton,
  IngredientRow,
  Loading,
  Modal,
  NavItem,
  Progress,
  QuantityInput,
  RecipeCard,
  SearchInput,
  SectionHeading,
  Select,
  Skeleton,
  TextInput,
  TimerDisplay,
  Toast,
  Toggle,
} from "@/shared/ui";

const swatches = [
  ["Pepper 500", "#FF6A26", "Primary fills, CTAs, active nav — ink text on top"],
  ["Pepper 600", "#F0571A", "Hover / pressed fill"],
  ["Pepper 700", "#B83E0C", "Orange text (rare)"],
  ["Pepper 100", "#FFEBDD", "Checked rows, soft chips"],
  ["Ink 900", "#15120F", "Text, dark cards, floating nav"],
  ["Ink 500", "#69625B", "Secondary text, meta"],
  ["Surface 50", "#FAF9F7", "Landing page paper"],
  ["Surface 100", "#F4F1EC", "Cards, chips, search, fields"],
  ["Surface 200", "#EBE7E1", "Photo placeholders, hover"],
  ["White", "#FFFFFF", "App page, icon circles on gray"],
  ["Success", "#0E7A34", "Have it + icon"],
  ["Warning", "#B54708", "Caution + icon"],
  ["Error", "#B42318", "Errors + icon"],
  ["Info / focus", "#175CD3", "Swappable, focus ring + icon"],
];

/** Showcase-only frame: white with a hairline, so gray components stay visible. */
function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-3xl border border-line-default bg-white p-5">{children}</div>;
}

export default function DesignSystemPage() {
  const [query, setQuery] = useState("");
  const [servings, setServings] = useState(4);
  const [toggles, setToggles] = useState({ wake: true, voice: false });
  const [modal, setModal] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [have, setHave] = useState<Record<string, boolean>>({ rice: true });
  const [saved, setSaved] = useState<Record<string, boolean>>({ jollof: true });
  const [secs, setSecs] = useState(600);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setSecs((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (secs === 0) setRunning(false);
  }, [secs]);

  return (
    <main id="main-content" className="mx-auto w-full max-w-[1120px] px-5 pb-24 pt-8 sm:px-6">
      <Badge>Fork · Design system · Clean Kitchen</Badge>
      <h1 className="mt-3 text-[2rem] font-semibold leading-10 sm:text-[2.5rem] sm:leading-[48px]">
        Foundations, not screens
      </h1>
      <p className="mt-2 max-w-2xl text-[1rem] leading-7 text-ink-600">
        Reusable tokens and components for the cooking journey. Full home and recipe pages are out
        of scope — this page only proves the primitives compose, respond, and stay accessible.
      </p>

      {/* Color */}
      <section aria-labelledby="ds-color" className="mt-10">
        <SectionHeading
          title="Color tokens"
          description="Pepper orange is action. White page, soft gray cards, near-black ink. Flat: no shadows, no gradients. Status always pairs color with icon and text."
        />
        <div id="ds-color" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {swatches.map(([name, hex, use]) => (
            <Card key={name} className="flex flex-col gap-2">
              <span
                aria-hidden
                className="h-14 rounded-2xl border border-line-default"
                style={{ background: hex }}
              />
              <span className="text-sm font-medium">{name}</span>
              <span className="tnum text-[0.8125rem] text-ink-500">{hex}</span>
              <span className="text-[0.8125rem] leading-5 text-ink-500">{use}</span>
            </Card>
          ))}
        </div>
      </section>

      {/* Type */}
      <section aria-labelledby="ds-type" className="mt-10">
        <SectionHeading
          title="Typography"
          description="Host Grotesk, with IBM Plex Mono for small labels. Semibold titles, regular body, medium labels — never heavy. Tabular numerals for quantities and timers."
        />
        <Panel>
          <p className="text-[1.875rem] font-semibold leading-9">Jollof rice for Sunday</p>
          <h2 className="mt-2 text-[1.25rem] font-semibold">Section heading 20px</h2>
          <p className="mt-2 text-[1.0625rem] leading-[1.65]">
            Step body: stir the tomato base on medium heat until the oil rises to the surface, about
            ten minutes. Quantities stay inline and tabular:{" "}
            <span className="tnum font-medium">400 g</span> rice,{" "}
            <span className="tnum font-medium">2 cups</span> stock.
          </p>
          <p className="mt-2 text-sm text-ink-500">
            Labels and buttons 15px medium; metadata 13px regular.
          </p>
        </Panel>
      </section>

      {/* Buttons */}
      <section aria-labelledby="ds-buttons" className="mt-10">
        <SectionHeading title="Buttons" />
        <Panel>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Start cooking</Button>
            <Button variant="secondary">Kitchen check</Button>
            <Button variant="secondary">Add to list</Button>
            <Button variant="dark">Try again</Button>
            <Button variant="tertiary">View all</Button>
            <IconButton label="Save recipe">
              <Heart size={20} />
            </IconButton>
            <IconButton label="Add ingredient">
              <Plus size={20} />
            </IconButton>
            <IconButton label="Search" variant="primary">
              <Search size={20} />
            </IconButton>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>
          <Button variant="primary" size="lg" className="mt-4 w-full">
            Start cooking
          </Button>
        </Panel>
      </section>

      {/* Inputs */}
      <section aria-labelledby="ds-inputs" className="mt-10">
        <SectionHeading
          title="Inputs"
          description="Every control has a real label. Placeholders are hints only."
        />
        <div className="grid gap-3 md:grid-cols-2">
          <Panel>
            <div className="flex flex-col gap-4">
              <TextInput label="List item" placeholder="e.g. Smoked fish" />
              <TextInput
                label="Nickname"
                defaultValue="Mama's pot"
                error="Use at least 3 characters in this demo."
              />
              <SearchInput label="Search" value={query} onChange={setQuery} />
              <Select label="Sort recipes" defaultValue="fast">
                <option value="fast">Fastest first</option>
                <option value="az">A to Z</option>
              </Select>
            </div>
          </Panel>
          <Panel>
            <div className="flex flex-col gap-3">
              <Checkbox label="Long-grain rice" description="Required · 400 g for 4 servings" />
              <Toggle
                label="Keep screen awake"
                description="Uses Wake Lock where supported"
                checked={toggles.wake}
                onChange={(v) => setToggles((t) => ({ ...t, wake: v }))}
              />
              <Toggle
                label="Read steps aloud"
                description="System voice, touch parity kept"
                checked={toggles.voice}
                onChange={(v) => setToggles((t) => ({ ...t, voice: v }))}
              />
              <QuantityInput label="Servings" value={servings} onChange={setServings} />
            </div>
          </Panel>
        </div>
      </section>

      {/* Badges + cards + ingredients */}
      <section aria-labelledby="ds-content" className="mt-10">
        <SectionHeading
          title="Badges, cards, ingredients"
          description="Ingredient status is icon plus text — color is redundant by design."
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone="success">Ready to cook</Badge>
          <Badge tone="warning">2 missing</Badge>
          <Badge tone="error">Out of stock</Badge>
          <Badge tone="info">Swappable</Badge>
          <Badge>Staple</Badge>
          <Badge tone="primary">Vegetarian</Badge>
          <Badge tone="accent" icon={<Flame aria-hidden size={14} />}>
            In progress
          </Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <RecipeCard
              title="Smoky party jollof (demo)"
              meta="Sample content — chef-validated recipes arrive later"
              minutes={45}
              difficulty="medium"
              categories={["Rice"]}
              demo
              saved={!!saved.jollof}
              onSaveToggle={() => setSaved((s) => ({ ...s, jollof: !s.jollof }))}
              href="#"
            />
            <CompactRecipeCard
              title="Quick fried ripe plantain"
              minutes={15}
              difficulty="easy"
              category="Sides"
              demo
              saved={!!saved.plantain}
              onSaveToggle={() => setSaved((s) => ({ ...s, plantain: !s.plantain }))}
              href="#"
            />
          </div>
          <Panel>
            <h3 className="mb-3 text-[1.0625rem] font-medium">Stew base · 4 servings</h3>
            <ul className="flex flex-col gap-2">
              <IngredientRow
                name="Long-grain rice"
                quantity="400 g"
                role="required"
                checked={!!have.rice}
                onToggle={(v) => setHave((h) => ({ ...h, rice: v }))}
              />
              <IngredientRow
                name="Tomato paste"
                quantity="70 g"
                role="substitutable"
                checked={!!have.tomato}
                onToggle={(v) => setHave((h) => ({ ...h, tomato: v }))}
                note="Fixed swap list only — no AI substitutes"
              />
              <IngredientRow
                name="Fried plantain"
                quantity="to serve"
                role="garnish"
                checked={!!have.plantain}
                onToggle={(v) => setHave((h) => ({ ...h, plantain: v }))}
              />
            </ul>
          </Panel>
        </div>
      </section>

      {/* Featured Recipe & Collections */}
      <section aria-labelledby="ds-collections" className="mt-10">
        <SectionHeading
          title="Featured recipe & collections"
          description="Anchor dark frame for hero recipes, horizontal carousels for thumb navigation, and quiet empty collection states."
        />
        <div className="mt-4 flex flex-col gap-6">
          <FeaturedRecipeCard
            title="Smoky Party Jollof Rice"
            href="#"
            minutes={45}
            servings={6}
            difficulty="medium"
            demo
            saved={!!saved.jollof}
            onSaveToggle={() => setSaved((s) => ({ ...s, jollof: !s.jollof }))}
          />

          <div>
            <CollectionHeading
              title="Quick dinners"
              meta="4 recipes"
              description="Under 30 minutes, one pot on the fire."
            />
            <div className="mt-3">
              <HorizontalRecipeList label="Quick dinners showcase">
                <li className="w-[185px] shrink-0 snap-start sm:w-[220px]">
                  <RecipeCard
                    title="Egg & Pepper Sauce"
                    minutes={20}
                    difficulty="easy"
                    demo
                    saved={!!saved.egg}
                    onSaveToggle={() => setSaved((s) => ({ ...s, egg: !s.egg }))}
                    href="#"
                  />
                </li>
                <li className="w-[185px] shrink-0 snap-start sm:w-[220px]">
                  <RecipeCard
                    title="Boiled Yam & Plantain"
                    minutes={25}
                    difficulty="easy"
                    demo
                    saved={!!saved.yam}
                    onSaveToggle={() => setSaved((s) => ({ ...s, yam: !s.yam }))}
                    href="#"
                  />
                </li>
                <li className="w-[185px] shrink-0 snap-start sm:w-[220px]">
                  <RecipeCard
                    title="Fried Plantain (Dodo)"
                    minutes={15}
                    difficulty="easy"
                    demo
                    saved={!!saved.dodo}
                    onSaveToggle={() => setSaved((s) => ({ ...s, dodo: !s.dodo }))}
                    href="#"
                  />
                </li>
              </HorizontalRecipeList>
            </div>
          </div>

          <EmptyCollectionState
            title="No soup recipes yet"
            message="Authentic Nigerian soups are being tested and validated. Browse rice and sides in the meantime."
            action={<Button variant="secondary">Browse all recipes</Button>}
          />
        </div>
      </section>

      {/* Overlays */}
      <section aria-labelledby="ds-overlays" className="mt-10">
        <SectionHeading title="Dialogs and sheets" />
        <Panel>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setModal(true)}>
              Open dialog
            </Button>
            <Button variant="secondary" onClick={() => setSheet(true)}>
              Open bottom sheet
            </Button>
          </div>
        </Panel>
        <Modal
          title="Discard changes?"
          description="Demo dialog — Esc or backdrop closes it."
          open={modal}
          onClose={() => setModal(false)}
        >
          <div className="flex gap-3">
            <Button variant="primary" onClick={() => setModal(false)}>
              Keep editing
            </Button>
            <Button variant="tertiary" onClick={() => setModal(false)}>
              Discard
            </Button>
          </div>
        </Modal>
        <BottomSheet title="Servings" open={sheet} onClose={() => setSheet(false)}>
          <QuantityInput label="Servings" value={servings} onChange={setServings} />
        </BottomSheet>
      </section>

      {/* Feedback */}
      <section aria-labelledby="ds-feedback" className="mt-10">
        <SectionHeading title="Feedback and states" />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Toast
              tone="success"
              title="Saved to shopping list"
              message="3 items · for 4 servings"
            />
            <Toast
              tone="warning"
              title="2 ingredients missing"
              message="Add them before you start."
            />
            <Toast
              tone="error"
              title="Couldn't load recipe"
              message="Check connection and retry."
            />
            <Toast tone="info" title="Update available" message="Apply after you finish cooking." />
          </div>
          <div className="flex flex-col gap-3">
            <Panel>
              <Loading label="Fetching cached recipes…" />
            </Panel>
            <EmptyState
              title="No saved recipes yet"
              message="Save a recipe to find it here, even offline."
              action={<Button variant="secondary">Browse demo card</Button>}
            />
            <ErrorState onRetry={() => {}} />
            <Panel>
              <Skeleton />
            </Panel>
          </div>
        </div>
      </section>

      {/* Nav / progress / timer */}
      <section aria-labelledby="ds-cook" className="mt-10">
        <SectionHeading
          title="Navigation, progress, timer"
          description="Cooking primitives: large targets, tabular time, text with every bar."
        />
        <div className="grid gap-3 lg:grid-cols-2">
          <Panel>
            <BottomNav label="Demo">
              <NavItem label="Home" active icon={<Home size={20} />} />
              <NavItem label="Search" icon={<Search size={20} />} />
              <NavItem label="Lists" icon={<ListChecks size={20} />} />
              <NavItem label="Saved" icon={<Bookmark size={20} />} />
            </BottomNav>
            <div className="mt-4">
              <Progress current={4} total={8} />
            </div>
          </Panel>
          <div className="flex flex-col gap-3">
            <TimerDisplay
              label="Simmer stew"
              seconds={secs}
              running={running}
              onToggle={() => setRunning((r) => !r)}
              onReset={() => {
                setRunning(false);
                setSecs(600);
              }}
            />
            <Panel>
              <p className="text-sm leading-6 text-ink-600">
                Timer is display only here. Countdown ownership stays in the cooking-session module
                per Phase 1.
              </p>
            </Panel>
          </div>
        </div>
      </section>

      <footer className="mt-12 border-t border-line-default pt-4 text-[0.8125rem] text-ink-500">
        <p>
          Validated at 320 / 375 / 390 / 430 / 768 / 1024 / 1280px via responsive layout (single
          codebase, no forked trees). No real recipes, ratings, or endorsements shown — placeholders
          only.
        </p>
      </footer>
    </main>
  );
}
