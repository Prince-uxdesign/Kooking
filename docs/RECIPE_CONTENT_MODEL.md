# Kooking — Recipe Content Model (Phase 12)

Status: **Implemented, tested, and validated as structured domain data.**
Schema source: `shared/domain/recipe-schema.ts`.
Seed reference: `content/seed/demo-tomato-rice.json` (explicitly demo, trivially replaceable).

## 1. What a Recipe Is

A recipe is a strictly validated, domain-modeled JSON data entity representing complete culinary knowledge decoupled from presentation layers. It ensures that UI components never maintain unstructured free-text recipes or bespoke hard-coded representations.

### Top-Level Recipe Fields

| Field            | Type                                             | Description                                                                                  |
| ---------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `id`             | `string` (1–100 chars)                           | Stable, immutable identifier.                                                                |
| `slug`           | `string` (1–120 chars)                           | URL-safe slug (`[a-z0-9-]+`), reserved slugs excluded (`categories`, `collections`).         |
| `title`          | `string` (1–140 chars)                           | Clean culinary title / name of the dish.                                                     |
| `description`    | `string` (max 1000 chars, optional)              | Contextual summary of the dish.                                                              |
| `image`          | `{ src: string, alt: string }` (optional)        | Main image and accessible alternative description.                                           |
| `categories`     | `RecipeCategory[]` (1–3 items)                   | Structured categorization from defined enum (e.g. `rice`, `stews-soups`, `swallow`).         |
| `tags`           | `string[]` (max 10 items, `[a-z0-9-]+`)          | Search and curation taxonomy tags (e.g. `one-pot`, `weeknight`).                             |
| `baseServings`   | `number` (integer 1–24)                          | Baseline serving yield calibrated for the recipe's ingredient quantities.                    |
| `timeMinutes`    | `{ prep: number, cook: number, total: number }`  | Honest time math. Invariant: `total === prep + cook`.                                        |
| `difficulty`     | `"easy" \| "medium" \| "challenging"` (optional) | Content-assigned effort level. Absent means "not assessed".                                  |
| `equipment`      | `RecipeEquipment[]` (default `[]`)               | Explicit cookware, prep tools, and utensils required.                                        |
| `ingredients`    | `RecipeIngredient[]` (1–60 lines)                | Structured ingredient usages referencing the pantry catalog.                                 |
| `steps`          | `RecipeStep[]` (1–60 steps)                      | Contiguously ordered instructions with cues, heat, and timers.                               |
| `notes`          | `string[]` (max 20 items, default `[]`)          | Chef guidance, cultural context, resting directions, and troubleshooting.                    |
| `contentVersion` | `number` (integer ≥ 1)                           | Monotonically increasing version counter for schema & content migrations.                    |
| `status`         | `RecipeStatus`                                   | Lifecycle status: `draft`, `in_review`, `tested`, `approved`, `published`.                   |
| `provenance`     | `RecipeProvenance` (optional)                    | Editorial and culinary attribution, author, source, and review history.                      |
| `demo`           | `boolean` (default `false`)                      | Flag marking sample/seed data. Demo recipes cannot be marked tested, approved, or published. |
| `testedBy`       | `string` (optional)                              | Verifiable culinary tester identity. Mandatory for `tested`, `approved`, and `published`.    |
| `createdAt`      | `string` (ISO 8601 timestamp, optional)          | Timestamp of content creation. Mandatory for `published`.                                    |
| `updatedAt`      | `string` (ISO 8601 timestamp, optional)          | Timestamp of last revision. Invariant: `updatedAt >= createdAt`.                             |

---

## 2. Reusable Ingredients vs. Recipe Usages

Ingredient definitions are decoupled from their use in individual recipes:

1. **Reusable Ingredient Catalog (`ReusableIngredient` in `content/ingredients.json`)**:
   Represents ingredient identity at the pantry level:
   - `id`: Stable catalog key (e.g. `demo:long-grain-rice`).
   - `name`: Common food name (e.g. `Long-grain rice`).
   - `category`: Pantry category (e.g. `grains`, `produce`, `seasoning`).
   - `defaultUnit`: Optional fallback unit.
   - `aliases`: Regional / cultural search terms (e.g. `["ewa", "beans"]`).

2. **Recipe Ingredient Line (`RecipeIngredient`)**:
   Represents the contextual consumption of that ingredient in a specific dish:
   - `id`: Stable line identifier unique within the recipe.
   - `ingredientId`: Reference into the reusable catalog.
   - `quantity`: Amount (`number` or `null` for `to-taste`).
   - `unit`: Measurement unit from closed enum (`g`, `ml`, `tsp`, `piece`, etc., or `null` for `to-taste`).
   - `preparation`: Mise en place instruction (e.g. `rinsed`, `diced`, `peeled`).
   - `role`: Requirement level:
     - `required`: Non-negotiable base ingredient; blocks readiness checks.
     - `substitutable`: Key ingredient with chef-approved alternatives; blocks until confirmed.
     - `optional`: Enhances flavor but dish succeeds without it; never blocks readiness.
     - `garnish`: Finishing touch served on side or top; never blocks readiness.
   - `scaling`: Scaling behavior (`linear`, `discrete`, `approximate`, `to-taste`, `manual`).
   - `substitutes`: Chef-approved substitute ingredient references or descriptors (mandatory if `substitutable`, forbidden otherwise; cannot include the ingredient itself).
   - `note`: Contextual culinary note for the cook (e.g. `Season gradually`).
   - `constraint`: Recipe-specific boundary (e.g. `Must be drained thoroughly before steaming`).

---

## 3. Step Model

Every recipe step is an ordered culinary directive:

- `id`: Stable step identifier unique within the recipe.
- `order`: 1-indexed, contiguous integer sequence (`1, 2, 3, ...`).
- `instruction`: Clear, active prose instruction.
- `ingredientIds`: Ingredient lines used in this specific step.
- `ingredientQuantities`: Optional per-step allocation map (`{ [lineId]: quantity }`) for partial uses.
- `preparationNotes`: Pre-action preparation note.
- `heat`: Descriptive heat level (`low`, `medium-low`, `medium`, `medium-high`, `high`).
- `estimatedMinutes`: Advisory duration guidance.
- `timer`: Active timer configuration (`{ durationSeconds: number, label?: string }`). Timers under 5s or over 24h are rejected.
- `sensoryCue`: Visual, auditory, or olfactory indicator (e.g. `Oil gathers at the edges and raw smell fades`).
- `completionNote`: Objective physical completion test (e.g. `Grains separate and stand, not mushy`).

> [!NOTE]
> **Timer vs. Completion Condition**: A timer measures elapsed time, whereas a completion condition (`completionNote` / `sensoryCue`) determines actual culinary readiness. Real cooking depends on heat, pan conductance, and ingredient humidity, so steps distinguish between passive time and active completion cues.

---

## 4. Equipment Model

Recipes specify necessary cookware and utensils via `RecipeEquipment`:

- `id`: Equipment identifier (e.g. `pot`, `colander`, `spoon`).
- `name`: Clear equipment title (e.g. `Heavy-bottomed cooking pot with tight lid`).
- `category`: Classification (e.g. `cookware`, `prep`, `utensil`).
- `notes`: Rationale (e.g. `Prevents scorching at base and traps steam`).
- `optional`: Boolean flag indicating if item is nice-to-have or strictly required.

The presentation layer (`deriveEquipment`) merges explicit equipment with step-level requirements to guarantee complete mise en place readiness.

---

## 5. Recipe Provenance & Status Lifecycle

### Lifecycle State Machine

```
draft  ──>  in_review  ──>  tested  ──>  approved  ──>  published
  ^             │              │             │              │
  └─────────────┴──────────────┴─────────────┴──────────────┘
                    (returns to in_review permitted)
```

- `draft`: Work-in-progress content.
- `in_review`: Submitted for editorial and culinary assessment.
- `tested`: Verified through physical cooking by a named tester (`testedBy`).
- `approved`: Reviewed and signed off for distribution.
- `published`: Publicly accessible; requires `testedBy` and valid `createdAt`.

### Provenance Tracking (`recipeProvenanceSchema`)

- `source`: Originating archive or kitchen (e.g. `Internal Test Kitchen`).
- `author`: Content author / recorder.
- `reviewedBy`: Designated reviewer or culinary editor.
- `reviewNotes`: Review feedback or verification records.
- `license`: Content license / copyright notice.

### Honesty Guardrails

1. Demo fixtures carry `demo: true` and are **strictly forbidden** from carrying `tested`, `approved`, or `published` status.
2. The UI is barred from displaying "chef-tested" or similar badges unless `isChefTested(status)` evaluates to true.
3. Published recipes must carry immutable `createdAt` and chronological `updatedAt` (`updatedAt >= createdAt`).

---

## 6. Content Independence

The domain recipe model is strictly independent of UI presentation:

- **Recipe Detail**: Renders overview, nutrition/time badges, equipment, categorized ingredients, prep directives, and tips.
- **Kitchen Check**: Evaluates ingredient readiness against required, substitutable, and optional roles.
- **Servings Scaler**: Computes clean fractional and metric scaling per ingredient behavior without modifying step prose.
- **Cooking Mode**: Drives hands-free step guidance, heat management, and countdown timers.
- **Shopping Lists**: Aggregates shoppable items from structured ingredients, excluding `to-taste` lines.
- **Future Voice / Agent Interfaces**: Steps and sensory cues can be consumed directly by voice synthesizers.

---

## 7. Examples of Structured Recipe Records

### Valid Structured Recipe (Demo Seed)

```json
{
  "id": "demo-tomato-rice",
  "slug": "demo-tomato-rice",
  "title": "Demo Tomato Rice (SAMPLE — not a real recipe)",
  "description": "Seed fixture for schema and domain tests. Replace with chef-validated content. Never publish.",
  "categories": ["rice"],
  "tags": ["demo", "sample"],
  "baseServings": 4,
  "timeMinutes": { "prep": 10, "cook": 25, "total": 35 },
  "equipment": [
    {
      "id": "pot",
      "name": "Heavy-bottomed cooking pot with tight lid",
      "category": "cookware",
      "notes": "Prevents scorching at base and traps steam"
    }
  ],
  "ingredients": [
    {
      "id": "demo-rice",
      "ingredientId": "demo:long-grain-rice",
      "quantity": 400,
      "unit": "g",
      "preparation": "rinsed",
      "role": "required",
      "scaling": "linear",
      "constraint": "Must be drained thoroughly before steaming"
    },
    {
      "id": "demo-tomato-paste",
      "ingredientId": "demo:tomato-paste",
      "quantity": 70,
      "unit": "g",
      "role": "substitutable",
      "scaling": "linear",
      "substitutes": ["demo:tomato-puree"],
      "constraint": "Fry until raw tin flavour is eliminated"
    },
    {
      "id": "demo-salt",
      "ingredientId": "demo:salt",
      "quantity": null,
      "unit": null,
      "role": "optional",
      "scaling": "to-taste",
      "note": "Season gradually"
    }
  ],
  "steps": [
    {
      "id": "demo-step-1",
      "order": 1,
      "instruction": "Rinse the rice until the water runs mostly clear, then drain.",
      "ingredientIds": ["demo-rice"],
      "ingredientQuantities": { "demo-rice": 400 }
    },
    {
      "id": "demo-step-2",
      "order": 2,
      "instruction": "Simmer the tomato base on medium heat until the oil rises.",
      "ingredientIds": ["demo-tomato-paste", "demo-salt"],
      "ingredientQuantities": { "demo-tomato-paste": 70, "demo-salt": null },
      "heat": "medium",
      "timer": { "durationSeconds": 600, "label": "Simmer base" },
      "sensoryCue": "Oil gathers at the edges and the sharp raw smell fades.",
      "completionNote": "Base looks glossy, not watery."
    }
  ],
  "notes": [
    "Do not open the lid frequently during the final steaming step to avoid losing trapped moisture."
  ],
  "provenance": {
    "source": "Internal Test Kitchen",
    "author": "Kooking Seed Engineering",
    "reviewedBy": "Culinary Test Pipeline",
    "reviewNotes": "Seed mock dataset verifying schema compliance",
    "license": "CC0-1.0"
  },
  "contentVersion": 1,
  "status": "draft",
  "demo": true,
  "createdAt": "2026-03-01T10:00:00.000Z",
  "updatedAt": "2026-03-01T10:00:00.000Z"
}
```

### Invalid Structured Recipe Examples

#### Example A: Invalid Step Ordering & Broken Ingredient Reference

```json
{
  "id": "bad-ordering",
  "slug": "bad-ordering",
  "title": "Bad Ordering Dish",
  "categories": ["rice"],
  "baseServings": 4,
  "timeMinutes": { "prep": 10, "cook": 10, "total": 20 },
  "ingredients": [
    {
      "id": "ing-1",
      "ingredientId": "demo:rice",
      "quantity": 100,
      "unit": "g",
      "role": "required",
      "scaling": "linear"
    }
  ],
  "steps": [
    { "id": "s-1", "order": 1, "instruction": "Prep", "ingredientIds": ["ing-1"] },
    { "id": "s-2", "order": 3, "instruction": "Cook", "ingredientIds": ["missing-line"] }
  ],
  "contentVersion": 1,
  "status": "draft"
}
```

**Validation Errors:**

- `step orders must be contiguous from 1 (found 3 at position 2)`
- `step 3 references unknown ingredient line 'missing-line'`

#### Example B: Self-Substitution & Time Math Inconsistency

```json
{
  "id": "bad-sub-and-time",
  "slug": "bad-sub-and-time",
  "title": "Bad Substitutions Dish",
  "categories": ["rice"],
  "baseServings": 4,
  "timeMinutes": { "prep": 10, "cook": 10, "total": 35 },
  "ingredients": [
    {
      "id": "ing-rice",
      "ingredientId": "demo:long-grain-rice",
      "quantity": 100,
      "unit": "g",
      "role": "substitutable",
      "scaling": "linear",
      "substitutes": ["demo:long-grain-rice"]
    }
  ],
  "steps": [{ "id": "s-1", "order": 1, "instruction": "Cook rice", "ingredientIds": ["ing-rice"] }],
  "contentVersion": 1,
  "status": "draft"
}
```

**Validation Errors:**

- `total must equal prep + cook — derive, don't decorate`
- `substitute list cannot contain the ingredient itself ('demo:long-grain-rice')`

#### Example C: Demo Marked as Published

```json
{
  "id": "bad-demo-status",
  "slug": "bad-demo-status",
  "title": "Demo Published Dish",
  "categories": ["rice"],
  "baseServings": 2,
  "timeMinutes": { "prep": 5, "cook": 5, "total": 10 },
  "ingredients": [
    {
      "id": "ing-salt",
      "ingredientId": "demo:salt",
      "quantity": null,
      "unit": null,
      "role": "optional",
      "scaling": "to-taste"
    }
  ],
  "steps": [{ "id": "s-1", "order": 1, "instruction": "Season", "ingredientIds": ["ing-salt"] }],
  "contentVersion": 1,
  "demo": true,
  "status": "published",
  "testedBy": "Fabricated Chef"
}
```

**Validation Error:**

- `demo content cannot be marked as 'published' — must remain in draft or in_review`
