import { buildBuilding } from "./builder.js";
import {
  ARCHETYPES,
  SLIDERS,
  paramsFromSeed,
  getDerived,
  setDerived,
} from "./params.js";
import { STYLES } from "./styles.js";
import { schemaFromSamples } from "@engine/state.js";
import {
  enrichBuilding,
  BUILDING_SCHEMA,
  BUILDING_OPTIONS,
} from "./details.js";
const samples = Object.keys(ARCHETYPES).flatMap((key) =>
  [0, 1, 42, 12345, 4294967295].map((seed) => paramsFromSeed(seed, key)),
);
export const adapter = {
  id: "skyscraper",
  path: "low-poly-skyscraper-generator",
  label: "Skyscraper",
  noun: "skyscraper",
  filePrefix: "building",
  defaultLook: "day",
  defaultType: null,
  colorKey: "body",
  colorLabel: "Hue",
  archetypes: ARCHETYPES,
  sliders: SLIDERS,
  styles: STYLES,
  paramsFromSeed,
  getDerived,
  setDerived,
  schema: schemaFromSamples(samples, SLIDERS, BUILDING_SCHEMA),
  enrich: enrichBuilding,
  legacyConfig: (params) => params?.detailVersion === undefined,
  options: BUILDING_OPTIONS,
  optionsLabel: "Architecture & parts",
  firstType: "deco",
  build: buildBuilding,
  materials: (style, params) => style.materials(params),
  paletteSlots: {
    body: "body",
    roof: "roof",
    mast: "accent",
    plaza: "ground",
    foliage: "foliage",
    trunk: "trunk",
    trim: "trim",
    glass: "glass",
  },
  camera: {
    fov: 45,
    near: 0.5,
    far: 5000,
    min: 6,
    max: 1200,
    direction: [0.85, 0.4, 1],
  },
};
