/**
 * Technique guide for Cooking Mode: the "how do I actually do that?"
 * help a new cook would otherwise search for. Each technique is matched
 * to a step by what its instruction says, so recipes need no extra data.
 *
 * Content rules: general kitchen technique only, in plain words, with
 * signs to look for and fixes when it goes wrong. Never recipe-specific
 * numbers, never claims that a recipe was tested.
 */

export interface TechniqueFix {
  /** The problem, as the cook would say it. */
  problem: string;
  fix: string;
}

export interface Technique {
  id: string;
  /** Short name shown on the help card, e.g. "Rinsing rice". */
  title: string;
  /** One line on why it matters. */
  why: string;
  /** How to do it, in order. */
  how: string[];
  /** How you know it's right. */
  signs: string[];
  fixes: TechniqueFix[];
  /** Matched against the step instruction (case-insensitive). */
  match: RegExp;
}

export const TECHNIQUES: Technique[] = [
  {
    id: "rinse-rice",
    title: "Rinsing rice",
    why: "Washing off loose starch keeps the grains separate instead of sticky.",
    how: [
      "Put the rice in a big bowl and cover it with cold water.",
      "Swirl and rub the grains gently between your hands for a few seconds.",
      "Tip the bowl and pour off the cloudy water, holding the rice back with your hand.",
      "Repeat until the water is only slightly cloudy, then drain in a sieve.",
    ],
    signs: ["The water stays mostly clear when you swirl.", "No grit or husks float to the top."],
    fixes: [
      {
        problem: "Grains keep escaping when I pour",
        fix: "Pour slowly over a sieve, or let the rice settle for a few seconds first.",
      },
      {
        problem: "The water never runs fully clear",
        fix: "That's normal. Three or four changes of water is enough.",
      },
    ],
    match: /\brins(e|ed|ing)\b[^.]*\brice\b|\brinsed rice\b/i,
  },
  {
    id: "blend-pepper",
    title: "Blending peppers and tomatoes",
    why: "The blend is the base of the dish; its texture changes how the dish cooks.",
    how: [
      "Cut big items (tomatoes, onion, tatashe) into halves or quarters so the blades catch them.",
      "Add the softest, juiciest pieces first, then the rest.",
      "Add only a splash of water, just enough to get the blades turning.",
      "Blend in short bursts if the recipe says coarse; run it until silky if it says smooth.",
    ],
    signs: [
      "Smooth: no visible bits when you tilt the jug.",
      "Coarse: small bits you can still see, like a rough salsa.",
    ],
    fixes: [
      {
        problem: "The blades just spin",
        fix: "Stop, push everything down with a spoon, and add a tablespoon of water at a time.",
      },
      {
        problem: "My eyes or hands sting from the scotch bonnet",
        fix: "Don't touch your face. Wash your hands with soap, or rub them with a little oil first and then wash.",
      },
    ],
    match: /\b(blend|pulse) the\b|\bcoarsely blend\b|\bin the blender\b/i,
  },
  {
    id: "reduce",
    title: "Boiling down (reducing)",
    why: "Cooking off the water concentrates flavour and stops the dish turning out watery.",
    how: [
      "Use a wide pot with the lid off so steam can escape.",
      "Keep it at a steady bubble, not a wild boil that splashes.",
      "Stir every few minutes, scraping the bottom, so it doesn't catch.",
      "Check the level against where it started.",
    ],
    signs: [
      "The level has dropped to about half (or what the step says).",
      "It looks thicker: a spoon dragged through leaves a trail for a moment.",
    ],
    fixes: [
      {
        problem: "It's spitting everywhere",
        fix: "Turn the heat down a little and half-cover the pot with the lid tilted.",
      },
      {
        problem: "It's sticking or smells scorched",
        fix: "Lower the heat, stir from the bottom, and don't scrape the burnt layer into the rest.",
      },
    ],
    match: /\breduced by\b|\breduc(e|es|ing)\b|\bwater has cooked off\b|\bboil (it )?uncovered\b/i,
  },
  {
    id: "fry-tomato-paste",
    title: "Frying tomato paste",
    why: "Raw paste tastes sour and metallic. Frying sweetens it and deepens the colour.",
    how: [
      "Add the paste to the hot oil and spread it out with your spoon.",
      "Stir often over medium heat so it doesn't stick.",
      "Keep going until the colour changes; this usually takes a few minutes.",
    ],
    signs: [
      "Bright red turns a deeper brick red.",
      "It smells sweeter and less sharp.",
      "Oil starts to show at the edges.",
    ],
    fixes: [
      {
        problem: "It's sticking and darkening fast",
        fix: "Lower the heat and add a tablespoon of water or of the blended base, then keep stirring.",
      },
    ],
    match: /\btomato paste\b/i,
  },
  {
    id: "oil-rises",
    title: "Frying the base until the oil rises",
    why: "When the oil separates, the water has cooked out and the raw taste has gone.",
    how: [
      "Keep the heat at medium and stir every few minutes, scraping the bottom.",
      "Let it bubble gently between stirs; it thickens as the water cooks off.",
      "Look at the surface and the edges of the pot, not just the middle.",
    ],
    signs: [
      "A layer of oil pools on top and at the edges instead of mixing in.",
      "The base is thick, glossy and deeper in colour.",
      "It no longer smells raw or sour.",
    ],
    fixes: [
      {
        problem: "It's been ages and the oil hasn't risen",
        fix: "It just needs more time. Keep stirring and let more water cook off; don't add more oil.",
      },
      {
        problem: "It's catching at the bottom",
        fix: "Lower the heat, stir more often, and add a splash of water or stock if needed.",
      },
    ],
    match: /\boil (rises|floats|separates)\b|\buntil the oil\b/i,
  },
  {
    id: "soften-onions",
    title: "Softening onions",
    why: "Soft onions melt into the dish and add sweetness instead of crunch.",
    how: [
      "Heat the oil first; a slice of onion should sizzle gently when it goes in.",
      "Add the onions and stir so they're coated in oil.",
      "Cook on medium, stirring now and then.",
    ],
    signs: [
      "They turn see-through and soft.",
      "They smell sweet, with maybe a little golden colour at the edges.",
    ],
    fixes: [
      {
        problem: "They're browning too fast",
        fix: "Turn the heat down and add a tiny splash of water.",
      },
    ],
    match: /\bfry (the )?(sliced |chopped )?onions?\b|\bonions? (and garlic )?until soft\b/i,
  },
  {
    id: "steam-rice",
    title: "Cooking rice covered, without stirring",
    why: "Trapped steam cooks the grains evenly. Stirring breaks them and makes them mushy.",
    how: [
      "Level the rice so it's just under the liquid.",
      "Cover the pot with foil, then press the lid on top to seal it.",
      "Turn the heat to low and leave it. Don't lift the lid every few minutes.",
      "To check, taste a few grains from the top after the time is up.",
    ],
    signs: [
      "The liquid has been absorbed and the surface has small holes in it.",
      "Grains are soft all the way through, with no hard white centre.",
    ],
    fixes: [
      {
        problem: "The liquid is gone but the rice is still hard",
        fix: "Sprinkle over a few tablespoons of hot water or stock, seal again and cook on low a little longer.",
      },
      {
        problem: "I can smell burning",
        fix: "Turn the heat off. Spoon the good rice from the top into another pot and don't scrape the bottom.",
      },
      {
        problem: "It's soggy",
        fix: "Take the lid off and leave it on the lowest heat for a few minutes so the steam escapes.",
      },
    ],
    match: /\brice\b.*\b(cover with foil|don'?t stir|cover tightly|steam on low)\b/i,
  },
  {
    id: "deep-fry",
    title: "Frying in hot oil",
    why: "Oil at the right heat fries crisp and golden; too cool and food soaks up oil.",
    how: [
      "Use a deep pan and fill it no more than a third full.",
      "Heat on medium. Test with one small piece or a drop of batter first.",
      "Fry in batches so the pieces aren't crowded and the oil stays hot.",
      "Lower food in gently, away from you; never drop it from high up.",
    ],
    signs: [
      "The test piece sizzles straight away and rises (for batter) within a few seconds.",
      "Pieces turn evenly golden and float more as they cook.",
    ],
    fixes: [
      {
        problem: "The oil is smoking",
        fix: "It's too hot. Turn the heat off and let it cool for a few minutes before trying again.",
      },
      {
        problem: "Food is greasy and pale",
        fix: "The oil wasn't hot enough or the pan was crowded. Fry fewer pieces and wait between batches.",
      },
      {
        problem: "The oil catches fire",
        fix: "Turn off the heat and cover the pan with a lid or a damp towel. Never use water.",
      },
    ],
    match:
      /\bheat the oil in (a|the) (deep )?pan\b|\bfry(,)? turning\b|\bin hot oil\b|\bfry until golden\b|\binto the oil\b/i,
  },
  {
    id: "peel-beans",
    title: "Peeling beans",
    why: "Skins make moi moi and akara gritty and grey; peeled beans blend smooth and pale.",
    how: [
      "Soak the beans for about 10 minutes first so the skins loosen.",
      "Take a handful and rub firmly between your palms.",
      "Add plenty of water, stir, and let the skins float up. Pour them off.",
      "Repeat until the beans are white, picking off any stubborn skins.",
    ],
    signs: ["The beans are creamy white with almost no dark skins left."],
    fixes: [
      {
        problem: "The skins won't come off",
        fix: "Soak a little longer, or pulse the beans for a second in a dry blender to crack them, then rub again.",
      },
    ],
    match: /\bskins?\b.*\bbeans?\b|\bbeans?\b.*\bskins?\b|\bpeeled beans\b/i,
  },
  {
    id: "simmer",
    title: "Simmering",
    why: "Gentle heat lets flavours mix without breaking the ingredients up or catching.",
    how: [
      "Bring it to a boil, then turn the heat down.",
      "Find the point where only small bubbles break the surface now and then.",
      "Stir occasionally and check it isn't sticking.",
    ],
    signs: ["Lazy bubbles, not a rolling boil.", "The sauce is slowly thickening."],
    fixes: [
      {
        problem: "It keeps boiling hard",
        fix: "Move the pot to a smaller burner or tilt the lid so some steam escapes.",
      },
    ],
    match: /\bsimmer(ed|ing)?\b/i,
  },
  {
    id: "boil-meat",
    title: "Cooking meat until tender",
    why: "Tough cuts like goat and beef need slow cooking; the stock they make flavours the dish.",
    how: [
      "Season the meat and let it steam in its own juices for a few minutes, lid on.",
      "Add the water, bring to a boil, then lower the heat and cover.",
      "Check every 15 minutes and top up with hot water if it gets low.",
    ],
    signs: ["A fork goes in easily and the meat pulls apart with a little pressure."],
    fixes: [
      {
        problem: "It's still tough",
        fix: "Keep simmering. Tough meat just needs more time; top up with hot water, not cold.",
      },
      {
        problem: "Too much stock left",
        fix: "Save it. It's flavour for the soup or stew, and keeps in the fridge for a few days.",
      },
    ],
    match:
      /\buntil (the )?(beef|goat|meat)\b|\b(goat|beef|chicken|meat)\b.*\bboil until\b|\bsteam in its own juices\b/i,
  },
  {
    id: "season-taste",
    title: "Seasoning and tasting",
    why: "Salt and stock cubes vary a lot; only tasting tells you where the dish is.",
    how: [
      "Add salt a little at a time: a pinch, stir, then taste.",
      "Taste from a clean spoon, and let it cool for a second first.",
      "Remember stock cubes are salty; taste before adding more salt.",
    ],
    signs: ["It tastes savoury and full, not flat, and not sharp with salt."],
    fixes: [
      {
        problem: "I added too much salt",
        fix: "Add more of the unsalted parts (water, blended tomato, or plain cooked rice or beans) and simmer a little.",
      },
      {
        problem: "It tastes flat",
        fix: "Usually it needs a little more salt. Add a pinch at a time and taste again.",
      },
    ],
    match: /\bseason with salt\b|\btaste and adjust the salt\b|\btaste:/i,
  },
  {
    id: "palm-oil",
    title: "Heating palm oil",
    why: "Warm palm oil carries its flavour into the soup; overheated oil turns bitter and smoky.",
    how: [
      "Heat it on medium for about 2 minutes, until it's runny and shimmering.",
      "Watch it closely; add the next ingredient before it smokes.",
      "Keep the kitchen ventilated and a lid within reach.",
    ],
    signs: ["The oil is thin and glossy and a slice of onion sizzles in it."],
    fixes: [
      {
        problem: "It's smoking",
        fix: "Turn off the heat and let it cool a little before carrying on.",
      },
    ],
    match: /\bpalm oil\b/i,
  },
  {
    id: "greens",
    title: "Cooking leafy greens",
    why: "Greens cook in minutes; a little too long and they go dark and lose their bite.",
    how: [
      "Wash leaves well in a bowl of water; lift them out so the grit stays behind.",
      "Slice or chop them, and squeeze out excess water if the recipe says so.",
      "Add them right at the end and stir just until they collapse.",
    ],
    signs: ["The leaves are wilted and bright green, not dull olive."],
    fixes: [
      {
        problem: "The dish went watery after adding greens",
        fix: "Squeeze them harder next time. For now, cook uncovered for a minute or two.",
      },
    ],
    match:
      /\b(spinach|ugu|scent leaf|leaves)\b.*\b(wilt|stir in|squeeze|chopped)\b|\bwilted\b|\bsqueeze out\b/i,
  },
  {
    id: "egusi-lumps",
    title: "Cooking egusi in lumps",
    why: "Letting the egusi paste set before stirring gives the soup its soft, curd-like lumps.",
    how: [
      "Mix the ground egusi with a little stock or water into a thick paste you can shape.",
      "Drop it into the hot base in small spoonfuls, spread out.",
      "Don't stir. Cover and cook on low until the lumps firm up.",
      "Then stir gently to break them into smaller curds.",
    ],
    signs: ["The lumps hold their shape when you nudge them with a spoon."],
    fixes: [
      {
        problem: "The egusi dissolved into a smooth sauce",
        fix: "It was stirred too soon. It still tastes good; next time leave it covered longer before stirring.",
      },
    ],
    match: /\begusi\b/i,
  },
  {
    id: "stir-fry",
    title: "Stir-frying",
    why: "High heat and quick tossing cook vegetables while they stay crisp and bright.",
    how: [
      "Get the pan or wok very hot before the oil goes in.",
      "Have everything chopped and ready; it moves fast.",
      "Keep the food moving and don't overfill the pan.",
    ],
    signs: ["Vegetables are bright and tender-crisp, not soft and watery."],
    fixes: [
      {
        problem: "Everything is steaming and soggy",
        fix: "The pan is too full or not hot enough. Cook in smaller batches.",
      },
    ],
    match: /\bstir-?fry\b|\bwok\b|\btossing\b/i,
  },
  {
    id: "steam-moi-moi",
    title: "Steaming in a water bath",
    why: "Gentle steam sets the bean batter evenly without drying it out.",
    how: [
      "Stand the filled containers in a pot and pour boiling water about a third of the way up.",
      "Cover the pot tightly so the steam stays in.",
      "Keep it at a gentle boil and top up with boiling water when it gets low.",
    ],
    signs: ["A knife or toothpick pushed into the middle comes out clean.", "The top is firm."],
    fixes: [
      {
        problem: "Water got into the moi moi",
        fix: "The water was too high or boiling too hard. Lower the level and the heat for the rest.",
      },
      {
        problem: "Still soft in the middle",
        fix: "Steam a little longer, then test again.",
      },
    ],
    match: /\bramekins?\b|\bwater (a third of the way )?up their sides\b/i,
  },
  {
    id: "garri",
    title: "Making eba",
    why: "The ratio of garri to hot water decides whether eba is soft or firm.",
    how: [
      "Use water that's properly boiling, not just hot.",
      "Sprinkle the garri evenly and let it soak for a minute without stirring.",
      "Fold and press it firmly against the bowl with a wooden spoon until smooth.",
    ],
    signs: ["Smooth, with no dry grains or lumps, and soft enough to pinch."],
    fixes: [
      {
        problem: "It's too hard",
        fix: "Add a splash of boiling water and keep folding.",
      },
      {
        problem: "It's too soft",
        fix: "Sprinkle in a little more garri and fold it through.",
      },
    ],
    match: /\bgarri\b|\bfold firmly\b/i,
  },
  {
    id: "dough-rise",
    title: "Letting a batter rise",
    why: "Yeast needs warmth and time to make puff-puff light and airy.",
    how: [
      "Use warm water, like a comfortable bath, never hot; hot water kills yeast.",
      "Cover the bowl and leave it somewhere warm, away from draughts.",
      "Check it after about 45 minutes.",
    ],
    signs: ["It has roughly doubled and is full of bubbles."],
    fixes: [
      {
        problem: "It hasn't risen",
        fix: "Move it somewhere warmer and give it more time. If nothing happens after 2 hours, the yeast may be old.",
      },
    ],
    match: /\b(rise|yeast)\b/i,
  },
  {
    id: "fluff-rice",
    title: "Fluffing rice",
    why: "Loosening the grains lets steam escape so they stay separate.",
    how: [
      "Use a fork, not a spoon.",
      "Lift the rice from the bottom and turn it over gently, don't mash.",
    ],
    signs: ["Separate grains, no clumps."],
    fixes: [
      {
        problem: "It's clumping",
        fix: "Leave the lid off for a few minutes after fluffing so it can dry a little.",
      },
    ],
    match: /\bfluff\b/i,
  },
  {
    id: "soak",
    title: "Soaking",
    why: "Soaking softens skins and shortens cooking.",
    how: [
      "Cover with plenty of water; the beans will swell.",
      "Leave for the time the recipe says, then drain.",
    ],
    signs: ["The beans look plumper and the skins wrinkle or slip."],
    fixes: [
      {
        problem: "I forgot to soak",
        fix: "Cover with boiling water and leave for 30 minutes instead.",
      },
    ],
    match: /\bsoak the beans\b/i,
  },
  {
    id: "plantain",
    title: "Choosing and slicing plantain",
    why: "Ripeness decides sweetness: yellow with black spots fries sweet and caramelised.",
    how: [
      "Cut off both ends, slit the skin lengthwise and peel it away.",
      "Slice on a slant to get bigger, even pieces.",
      "Keep the slices the same thickness so they cook together.",
    ],
    signs: ["Even slices about as thick as your little finger."],
    fixes: [
      {
        problem: "The plantain is very green",
        fix: "Green plantain won't fry sweet. Use it for boiling or chips, or wait a few days.",
      },
    ],
    match: /\bplantains?\b.*\b(peel|slice)\b|\bslit the skin\b/i,
  },
  {
    id: "whip-batter",
    title: "Beating air into bean batter",
    why: "Air is what makes akara puff up light inside instead of frying flat and dense.",
    how: [
      "Use a wooden spoon or whisk and beat in one direction, hard, for a few minutes.",
      "Only add salt right before frying; it makes the batter go runny if it sits.",
    ],
    signs: [
      "The batter looks paler and fluffier, a bit like whipped cream.",
      "A small drop floats when you drop it into a glass of water.",
    ],
    fixes: [
      {
        problem: "The akara spreads flat in the oil",
        fix: "The batter is too wet or not beaten enough. Beat it longer and blend with less water next time.",
      },
    ],
    match: /\bbeat the paste\b|\bwork in air\b/i,
  },
  {
    id: "moi-moi-batter",
    title: "Getting moi moi batter right",
    why: "The thickness of the batter decides whether moi moi sets soft and smooth or dense.",
    how: [
      "Whisk in the oil and seasoning first, then add warm water a spoonful at a time.",
      "Stop and check the pour after each addition.",
    ],
    signs: ["It pours slowly from the spoon in a thick ribbon, like thick pancake batter."],
    fixes: [
      {
        problem: "It's too thick to pour",
        fix: "Add a little more warm water and whisk again.",
      },
      {
        problem: "It's very runny",
        fix: "It will still set, just softer. Steam it a little longer and test with a knife.",
      },
    ],
    match: /\bpancake batter\b|\bpours like\b/i,
  },
];

/** Techniques a step's instruction calls for, in the order they come up (max `limit`). */
export function techniquesFor(instruction: string, limit = 3): Technique[] {
  return TECHNIQUES.map((t) => ({ t, at: instruction.search(t.match) }))
    .filter(({ at }) => at >= 0)
    .sort((a, b) => a.at - b.at)
    .slice(0, limit)
    .map(({ t }) => t);
}
