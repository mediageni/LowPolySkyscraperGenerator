// Skyscraper parameters: archetype presets + seed -> params, URL (de)serialization.
// Pure data, no Three.js. Mirrors xyz's Godot generator: a building is a vertical
// stack of boxy SECTIONS (with per-step setbacks) on a BASE, topped by a ROOF, and
// optionally repeated in a COMBINE layout (twins / quads / row / cross).

import { makeRng, rng } from "@engine/rng.js";

const r2 = (v) => Math.round(v * 1000) / 1000;

// Defaults every archetype inherits; archetypes override the distinctive bits.
// [lo,hi] number pair = sampled range. Array of strings = random pick. Scalar = fixed.
const BASE = {
  width: [11, 20],
  depth: [11, 20],
  height: [45, 110],
  sections: [1, 3], // vertical stacked boxes (rounded, clamped 1..6)
  setback: [0.06, 0.16], // per-step inset as a fraction of the section's size
  setbackMode: ["all", "all", "two", "one"],
  progression: [-0.2, 0.08], // section-height arithmetic progression (− = shorter up top)
  baseType: ["straight", "extruded", "inset"],
  baseHeight: [0.05, 0.1], // base height as a fraction of total height
  baseInset: [0.08, 0.18], // extrude/inset amount as a fraction of footprint
  roofType: ["flat", "flat", "prism", "pyramid", "trunc"],
  roofHeight: [5, 13], // metres, used by non-flat roofs
  mast: 0, // antenna/spire fraction (0 = none)
  floorH: [3.2, 4.2], // vertical window pitch (storey height) in metres
  colW: [2.8, 3.8], // horizontal window pitch in metres
  winFill: [0.55, 0.78], // fraction of each cell that is glazing
  litChance: [0.32, 0.6], // share of windows lit at night
  layout: "single", // single | twins | quads | row | cross
  layoutGap: [4, 8],
  layoutVary: [0, 0.25],
};

export const ARCHETYPES = {
  tower: {
    label: "Tower",
    sections: [2, 4],
    setback: [0.08, 0.16],
    setbackMode: ["all"],
    roofType: ["prism", "flat", "trunc"],
    height: [60, 130],
    width: [12, 18],
    depth: [12, 18],
  },
  setback: {
    label: "Setback",
    sections: [3, 6],
    setback: [0.12, 0.22],
    setbackMode: ["all", "two"],
    progression: [-0.3, -0.08],
    roofType: ["flat", "trunc"],
    baseType: ["extruded", "straight"],
    height: [70, 145],
    width: [16, 26],
    depth: [16, 26],
  }, // NYC wedding-cake
  spire: {
    label: "Spire",
    sections: [2, 4],
    setback: [0.1, 0.18],
    setbackMode: ["all"],
    roofType: ["pyramid", "prism", "overhangPyramid"],
    roofHeight: [10, 22],
    mast: [0.3, 0.7],
    height: [85, 160],
    width: [10, 16],
    depth: [10, 16],
  }, // Empire / Chrysler
  slab: {
    label: "Slab",
    sections: [1, 2],
    setback: [0.0, 0.05],
    setbackMode: ["two"],
    roofType: ["flat"],
    height: [40, 85],
    width: [20, 34],
    depth: [10, 16],
    floorH: [3.4, 4.4],
  },
  deco: {
    label: "Deco",
    sections: [3, 5],
    setback: [0.1, 0.18],
    setbackMode: ["all", "two"],
    roofType: ["prism", "overhangPrism", "pyramid"],
    baseType: ["extruded"],
    height: [70, 135],
    width: [14, 22],
    depth: [14, 22],
  },
  twins: {
    label: "Twins",
    sections: [2, 3],
    setback: [0.06, 0.12],
    setbackMode: ["all"],
    roofType: ["flat", "prism"],
    height: [70, 125],
    width: [10, 15],
    depth: [10, 15],
    layout: "twins",
    layoutGap: [4, 8],
    layoutVary: [0, 0.3],
  },
  plaza: {
    label: "Plaza",
    sections: [1, 3],
    setback: [0.06, 0.14],
    roofType: ["flat", "prism"],
    layout: ["quads", "row", "cross"],
    height: [40, 95],
    width: [8, 13],
    depth: [8, 13],
    layoutGap: [4, 8],
    layoutVary: [0.1, 0.4],
  },
};
export const ARCHETYPE_KEYS = Object.keys(ARCHETYPES);

// Sliders the UI builds from (each edits one numeric param in place).
export const SLIDERS = [
  { key: "width", label: "Width", min: 6, max: 36, step: 0.5 },
  { key: "depth", label: "Depth", min: 6, max: 36, step: 0.5 },
  { key: "height", label: "Height", min: 24, max: 180, step: 1 },
  { key: "sections", label: "Sections", min: 1, max: 6, step: 1 },
  { key: "setback", label: "Setback", min: 0, max: 0.3, step: 0.01 },
  { key: "roofHeight", label: "Roof height", min: 0, max: 24, step: 0.5 },
  { key: "floorH", label: "Storey height", min: 2.6, max: 5, step: 0.1 },
  { key: "colW", label: "Window pitch", min: 2, max: 5, step: 0.1 },
  { key: "winFill", label: "Glazing", min: 0.3, max: 0.92, step: 0.01 },
  { key: "litChance", label: "Lit windows", min: 0, max: 1, step: 0.02 },
];

function sample(r, spec) {
  if (Array.isArray(spec)) {
    if (
      spec.length === 2 &&
      typeof spec[0] === "number" &&
      typeof spec[1] === "number"
    )
      return r2(rng.range(r, spec[0], spec[1]));
    return rng.pick(r, spec);
  }
  return spec;
}

const PARAM_KEYS = Object.keys(BASE);

export function paramsFromSeed(seed, archetype) {
  const r = makeRng(seed);
  const key =
    archetype && ARCHETYPES[archetype]
      ? archetype
      : rng.pick(r, ARCHETYPE_KEYS);
  const a = { ...BASE, ...ARCHETYPES[key] };
  const p = { seed: seed >>> 0, archetype: key };
  for (const k of PARAM_KEYS) p[k] = sample(r, a[k]);
  p.color = {
    body: {
      h: r2(r()),
      s: r2(rng.range(r, 0.04, 0.3)),
      l: r2(rng.range(r, 0.46, 0.72)),
    },
    win: {
      h: r2(rng.range(r, 0.07, 0.14)),
      s: r2(rng.range(r, 0.5, 0.9)),
      l: r2(rng.range(r, 0.6, 0.78)),
    },
  };
  return p;
}

export function setDerived(p, key, value) {
  p[key] = value;
}
export const getDerived = (p, key) => p[key];

export { encodeConfig, decodeConfig } from "@engine/state.js";
