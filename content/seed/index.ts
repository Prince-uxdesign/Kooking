import akara from "./akara.json";
import beansPorridge from "./beans-porridge.json";
import coconutRice from "./coconut-rice.json";
import dodo from "./dodo.json";
import eba from "./eba.json";
import efoRiro from "./efo-riro.json";
import egusiSoup from "./egusi-soup.json";
import goatMeatPepperSoup from "./goat-meat-pepper-soup.json";
import jollofRice from "./jollof-rice.json";
import moiMoi from "./moi-moi.json";
import nigerianFriedRice from "./nigerian-fried-rice.json";
import puffPuff from "./puff-puff.json";
import riceAndChickenStew from "./rice-and-chicken-stew.json";
import zobo from "./zobo.json";

/**
 * Raw seed payloads in catalog (editorial) order — the first is Home's
 * featured recipe. These are real Nigerian recipes compiled from
 * published sources (see each recipe's provenance), held `in_review`
 * until a Fork kitchen test. The catalog parses everything through
 * `recipeSchema`, so adding a recipe needs no code changes.
 *
 * `demo-tomato-rice.json` stays in this folder as a test fixture only;
 * it is not part of the live catalog.
 */
export const SEED_RECIPES: unknown[] = [
  jollofRice,
  egusiSoup,
  coconutRice,
  riceAndChickenStew,
  nigerianFriedRice,
  efoRiro,
  goatMeatPepperSoup,
  beansPorridge,
  moiMoi,
  dodo,
  akara,
  puffPuff,
  eba,
  zobo,
];
