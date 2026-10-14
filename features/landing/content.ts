/**
 * Landing copy and demo data. Kept out of components so the words can be
 * edited without touching layout. Honesty rules (DESIGN_SYSTEM.md §10):
 * no ratings, user counts, or reviews. Stories are labelled illustrative.
 */

export const ROTATING_DISHES = [
  "jollof rice",
  "egusi soup",
  "efo riro",
  "pepper soup",
  "moi moi",
  "fried rice",
] as const;

export const MARQUEE_DISHES = [
  "Party jollof",
  "Egusi soup",
  "Efo riro",
  "Moi moi",
  "Goat meat pepper soup",
  "Fried plantain",
  "Ofada stew",
  "Yam porridge",
  "Nigerian fried rice",
  "Okra soup",
  "Beans and dodo",
  "Suya spice chicken",
];

export const MANIFESTO =
  "Most recipes assume you already know how to cook. They say “fry until the oil rises” and never say what that looks like. They’re written for four when you’re feeding six. They never ask if you actually have crayfish. Kooking does all of that, before the gas is on.";

/** Cooking Mode steps used by the hero phone and the dark spotlight. */
export const COOK_STEPS = [
  {
    title: "Blend the base",
    body: "Blend the tatashe, scotch bonnet and half the onion until smooth.",
    quantity: "3 tatashe · 2 scotch bonnet",
    cue: "Smooth, with no visible pepper seeds.",
    timer: null,
  },
  {
    title: "Fry the paste",
    body: "Fry the tomato paste in hot oil, stirring, until the oil rises.",
    quantity: "105 g tomato paste",
    cue: "Paste turns deep brick red; oil pools at the edges.",
    timer: 8 * 60,
  },
  {
    title: "Simmer the stew",
    body: "Pour in the blended base and simmer until it thickens.",
    quantity: "All of the pepper blend",
    cue: "A spoon dragged through leaves a clear line.",
    timer: 20 * 60,
  },
  {
    title: "Steam the rice",
    body: "Add the washed rice and stock. Cover tightly and steam on low.",
    quantity: "750 g rice · 1.1 l stock",
    cue: "Grains are tender; no liquid at the bottom.",
    timer: 25 * 60,
  },
] as const;

export type JourneyKey = "discover" | "check" | "shop" | "cook" | "done";

export const JOURNEY: Array<{
  key: JourneyKey;
  number: string;
  title: string;
  lead: string;
  points: string[];
}> = [
  {
    key: "discover",
    number: "01",
    title: "Pick what you’re craving",
    lead: "Browse by craving, time or occasion. Every recipe shows how long it really takes, from washing the rice to the last stir.",
    points: [
      "Search by dish or ingredient",
      "Filter by time and category",
      "Save the ones you’ll come back to",
    ],
  },
  {
    key: "check",
    number: "02",
    title: "Check your kitchen first",
    lead: "Before you start, Kitchen Check walks through what the recipe needs at your serving size. You find out you’re out of tomato paste now, not halfway through.",
    points: [
      "Quantities scale to your servings",
      "Chef-approved swaps only",
      "Optional items never block you",
    ],
  },
  {
    key: "shop",
    number: "03",
    title: "Shop only for what’s missing",
    lead: "Anything you don’t have goes onto one list, labelled with the recipe and serving size it came from. It works without signal in the market too.",
    points: ["One list for every recipe", "Add your own items", "Tick things off offline"],
  },
  {
    key: "cook",
    number: "04",
    title: "Cook one step at a time",
    lead: "Cooking Mode shows one step on a screen that stays awake. The quantity for that step is right there, along with what “done” looks like, and a timer if it needs one.",
    points: [
      "Read-aloud and voice commands",
      "Timers that survive a reload",
      "Pause now, resume after",
    ],
  },
  {
    key: "done",
    number: "05",
    title: "Serve it. Then do it again.",
    lead: "Finished cooks go into your history, so next time you know exactly what you made and for how many.",
    points: ["Cooking history", "Saved recipes", "No account needed to start"],
  },
];

/** Kitchen Check demo: a sample recipe at base servings of 4. */
export const DEMO_RECIPE = {
  title: "Party jollof rice",
  baseServings: 4,
  ingredients: [
    { id: "rice", name: "Long-grain parboiled rice", amount: 500, unit: "g", role: "required" },
    {
      id: "paste",
      name: "Tomato paste",
      amount: 70,
      unit: "g",
      role: "substitutable",
      swap: "Tomato purée",
    },
    {
      id: "tatashe",
      name: "Tatashe (red bell pepper)",
      amount: 2,
      unit: "piece",
      role: "required",
    },
    { id: "rodo", name: "Scotch bonnet", amount: 1, unit: "piece", role: "required" },
    { id: "onion", name: "Onions", amount: 2, unit: "piece", role: "required" },
    { id: "stock", name: "Chicken stock", amount: 750, unit: "ml", role: "required" },
    { id: "bay", name: "Bay leaves", amount: 2, unit: "piece", role: "optional" },
  ],
} as const;

export const STORIES = [
  {
    id: "tobi",
    photo: "jollof",
    name: "Tobi",
    place: "First flat, Yaba",
    dish: "Party jollof for six",
    hook: "Had never cooked rice that didn’t come from a pack.",
    before:
      "Burnt two pots trying to copy a video that never said how much water. Every attempt ended with a phone call home.",
    turn: "Set the recipe to six servings for the flatmates. Kitchen Check caught the missing tomato paste and pointed to the purée already in the cupboard.",
    after:
      "The cue for step four said exactly what “oil rising” looks like. The rice came out separate, smoky, and gone in twenty minutes.",
    timeline: [
      { time: "5:10 pm", text: "Opens Party jollof, sets it to 6 servings" },
      { time: "5:14 pm", text: "Kitchen Check: no tomato paste. Purée is an approved swap" },
      { time: "5:31 pm", text: "Step 4 cue: paste turns brick red, oil pools at the edge" },
      { time: "6:02 pm", text: "25-minute steam timer. Lid on, no peeking" },
      { time: "6:29 pm", text: "Done. Six plates out" },
    ],
    receipt: [
      ["Servings", "6"],
      ["Timers used", "3"],
      ["Burnt pots", "0"],
    ],
  },
  {
    id: "chidi",
    photo: "egusi",
    name: "Chidi",
    place: "Studying in Manchester",
    dish: "Egusi on a Sunday",
    hook: "5,000 km from home, and the shop had no ugu.",
    before:
      "Missed the Sunday pot of egusi. Had the ground melon seeds from a care package, plus a vague memory of how it smelled.",
    turn: "Kitchen Check listed what was missing. Spinach is on the recipe’s own approved swap list, so there was no guessing. The list went to the shop.",
    after:
      "The basement aisle had no signal, but the list still loaded and ticked off. Egusi for the flatmates, with fufu, by four.",
    timeline: [
      { time: "11:20 am", text: "Kitchen Check: 4 of 9 in the cupboard" },
      { time: "11:22 am", text: "Ugu swapped for spinach, from the approved list" },
      { time: "12:05 pm", text: "Shopping list works offline in the store basement" },
      { time: "2:40 pm", text: "Read-aloud on, hands deep in the pot" },
      { time: "3:55 pm", text: "Done. Logged in cooking history" },
    ],
    receipt: [
      ["Missing items", "5 → 0"],
      ["Swaps", "1, approved"],
      ["Signal needed", "None"],
    ],
  },
  {
    id: "amaka",
    photo: "soup",
    name: "Amaka",
    place: "New parent, Abuja",
    dish: "Pepper soup in two sittings",
    hook: "One free hand. Maybe forty quiet minutes.",
    before: "Every recipe needed two clean hands and an unbroken hour. Neither was available.",
    turn: "Turned on read-aloud and said “next” instead of touching the screen. The screen stayed awake. When the baby woke, the cook paused mid-step.",
    after:
      "After the nap, Kooking opened right back on step five with the timer intact. Pepper soup, finished in two sittings.",
    timeline: [
      { time: "7:05 pm", text: "Read-aloud on. Says “next” with a hand free" },
      { time: "7:18 pm", text: "Screen stays awake while the goat meat boils" },
      { time: "7:26 pm", text: "Baby wakes. Session paused on step 5" },
      { time: "8:40 pm", text: "Resume bar: “Pepper soup, step 5 of 8”" },
      { time: "9:12 pm", text: "Done. Hot, and eaten in peace" },
    ],
    receipt: [
      ["Hands used", "1"],
      ["Sittings", "2"],
      ["Steps lost", "0"],
    ],
  },
] as const;

export const FAQ = [
  {
    q: "What exactly is Kooking?",
    a: "A cooking companion for Nigerian food. You pick a recipe, Kooking checks what you already have, puts what’s missing on a shopping list, then guides you through cooking one step at a time with timers, read-aloud and voice commands.",
  },
  {
    q: "I’ve genuinely never cooked. Will this work for me?",
    a: "That’s who it’s built for. Every step tells you what “done” looks like (colour, smell, texture), not just how long to wait. Quantities are shown on the step that uses them, so you never scroll back up mid-stir.",
  },
  {
    q: "Do I need an account?",
    a: "No. Open it and cook. Saved recipes, lists and cooking sessions live on your device. You can sign in later if you want them synced.",
  },
  {
    q: "Does it work without internet?",
    a: "Yes, for the parts that matter in a kitchen or a market. Lists, Kitchen Check, Cooking Mode, timers and recipes you’ve already opened all work offline.",
  },
  {
    q: "Where do the recipes come from? Are they AI-generated?",
    a: "No. Recipes and their ingredient swaps are written and checked by people before they’re published. Kooking never invents a substitution. If a swap isn’t on the recipe’s approved list, it isn’t offered.",
  },
  {
    q: "Is there an app to download?",
    a: "Kooking runs in your browser, and you can install it to your home screen from there. It opens full-screen like any other app.",
  },
] as const;

/**
 * Unsplash photos (free licence), hot-linked from Unsplash's CDN as their
 * guidelines ask, credited in the footer. People photos are used as scenes,
 * never as the face of a story or testimonial.
 */
export const PHOTOS = {
  chopping: {
    id: "photo-1575467678950-0c09aad418af",
    alt: "A woman smiling as she chops vegetables at a kitchen counter",
    by: "@cdc",
    name: "CDC",
    focus: "50% 30%",
  },
  greens: {
    id: "photo-1565128404194-812ca9f4243d",
    alt: "Two people laughing in a home kitchen while one chops leafy greens",
    by: "@canweallgo",
    name: "AllGo",
    focus: "60% 40%",
  },
  sink: {
    id: "photo-1565128542755-7fe9c3ebf177",
    alt: "Two friends cooking and laughing together at a kitchen sink",
    by: "@canweallgo",
    name: "AllGo",
    focus: "50% 12%",
  },
  grill: {
    id: "photo-1765584830370-085bddbf863f",
    alt: "A hand turning spiced meat over an open-fire grill",
    by: "@1hundredimages",
    name: "1Hundred Images",
  },
  boli: {
    id: "photo-1765584829997-12ab011bb5b3",
    alt: "A woman preparing roasted plantain at an outdoor food stall",
    by: "@1hundredimages",
    name: "1Hundred Images",
  },
  market: {
    id: "photo-1722072391426-964abfef1924",
    alt: "A trader arranging plantain at a busy open-air market",
    by: "@tundeburemo",
    name: "Tunde Buremo",
  },
  egusi: {
    id: "photo-1763048443535-1243379234e2",
    alt: "Hands holding a bowl of egusi soup with assorted meat",
    by: "@babadudu19",
    name: "Babadudu",
  },
  jollof: {
    id: "photo-1665332195309-9d75071138f0",
    alt: "Jollof rice in a white dish beside grilled fish, skewers and peppers",
    by: "@keeshasskitchen",
    name: "Keesha's Kitchen",
    focus: "45% 80%",
  },
  soup: {
    id: "photo-1661588669110-81142a5b9e57",
    alt: "Two bowls of soup with boiled eggs and herbs",
    by: "@femi_oyekoya",
    name: "Femi Oyekoya",
  },
  puffpuff: {
    id: "photo-1664993090321-b2caff794431",
    alt: "Puff-puff in a basket lined with colourful fabric",
    by: "@keeshasskitchen",
    name: "Keesha's Kitchen",
  },
} as const satisfies Record<
  string,
  { id: string; alt: string; by: string; name: string; focus?: string }
>;

export type PhotoKey = keyof typeof PHOTOS;

/**
 * Testimonial wall. ILLUSTRATIVE: composites of the cooks Kooking is built
 * for, labelled as such on the page. Replace with real, consented reviews
 * at launch. No star ratings or review counts until real ones exist.
 */
export const TESTIMONIALS = [
  {
    title: "Kitchen Check saved my Sunday",
    body: "I found out I had no crayfish before I’d even washed the pot. Ten minutes at the shop instead of a ruined soup.",
    name: "Tobi A.",
    place: "Yaba",
    cooked: "Egusi · 4 servings",
  },
  {
    title: "Finally, recipes for six",
    body: "Every video is for two people. I set it to six for my flatmates and every quantity changed. The timers didn’t, which is exactly right.",
    name: "Kemi O.",
    place: "Ibadan",
    cooked: "Party jollof · 6 servings",
  },
  {
    title: "It tells you what done looks like",
    body: "“Fry until the oil rises” never made sense to me. Kooking says what colour it should be. That one line fixed my stew.",
    name: "Ifeanyi N.",
    place: "Enugu",
    cooked: "Tomato stew · 4 servings",
  },
  {
    title: "My list worked in the market",
    body: "No signal in the middle of the market, and the list still loaded. I ticked things off as I went.",
    name: "Halima B.",
    place: "Kaduna",
    cooked: "Efo riro · 3 servings",
  },
  {
    title: "Spinach is allowed. Good to know.",
    body: "The shop here never has ugu. The recipe lists spinach as an approved swap, so I didn’t have to guess and hope.",
    name: "Chidi E.",
    place: "Manchester",
    cooked: "Egusi · 4 servings",
  },
  {
    title: "I cooked with one hand",
    body: "Baby on my hip, read-aloud on, and I just said “next”. The screen never went dark on me.",
    name: "Amaka U.",
    place: "Abuja",
    cooked: "Pepper soup · 2 servings",
  },
  {
    title: "Picked up right where I stopped",
    body: "Had to leave halfway for a call. When I came back it opened on the same step with the timer still right.",
    name: "Dapo F.",
    place: "Lagos Island",
    cooked: "Ofada stew · 5 servings",
  },
  {
    title: "No sign-up wall",
    body: "I opened it and started cooking. That’s it. I only made an account weeks later to sync my list.",
    name: "Zainab K.",
    place: "Toronto",
    cooked: "Moi moi · 6 servings",
  },
] as const;
