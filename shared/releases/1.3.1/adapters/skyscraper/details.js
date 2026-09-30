import * as THREE from "three";
import {
  part,
  box,
  cylinder,
  ring,
  mesh,
  mergePart,
} from "@engine/geometry.js";
import {
  detailOption,
  detailRule,
  booleanRule,
  detailed,
  choices,
  toggle,
} from "@engine/options.js";
export function enrichBuilding(params, legacy = false) {
  return {
    ...params,
    detailVersion: legacy ? 0 : 1,
    facadeType:
      params.archetype === "deco"
        ? "vertical"
        : params.archetype === "slab"
          ? "bands"
          : "grid",
    entranceOn: true,
    terracesOn: true,
    servicesOn: true,
    roofOn: true,
    mastOn: legacy || params.mast > 0.02,
    windowsOn: true,
    plazaOn: true,
    treesOn: true,
  };
}
export const BUILDING_SCHEMA = {
  detailVersion: detailRule,
  facadeType: { type: "enum", values: ["grid", "vertical", "bands"] },
  roofType: {
    type: "enum",
    values: [
      "flat",
      "prism",
      "pyramid",
      "trunc",
      "overhangPyramid",
      "overhangPrism",
    ],
  },
  layout: {
    type: "enum",
    values: ["single", "twins", "row", "quads", "cross"],
  },
  ...Object.fromEntries(
    [
      "entranceOn",
      "terracesOn",
      "servicesOn",
      "roofOn",
      "mastOn",
      "windowsOn",
      "plazaOn",
      "treesOn",
    ].map((key) => [key, booleanRule]),
  ),
};
export const BUILDING_OPTIONS = [
  detailOption,
  choices(
    "facadeType",
    "Facade rhythm",
    [
      ["grid", "Framed grid"],
      ["vertical", "Vertical fins"],
      ["bands", "Floor bands"],
    ],
    detailed,
  ),
  choices("roofType", "Roof form", [
    ["flat", "Flat"],
    ["prism", "Gable"],
    ["pyramid", "Pyramid"],
    ["trunc", "Truncated pyramid"],
    ["overhangPyramid", "Overhang pyramid"],
    ["overhangPrism", "Overhang gable"],
  ]),
  choices("layout", "Tower layout", [
    ["single", "Single"],
    ["twins", "Twins"],
    ["row", "Row"],
    ["quads", "Four towers"],
    ["cross", "Cross"],
  ]),
  toggle("entranceOn", "Entrance & canopy"),
  toggle(
    "terracesOn",
    "Terrace planters",
    (p) => detailed(p) && p.sections > 1 && p.setback > 0,
  ),
  toggle(
    "servicesOn",
    "Roof equipment",
    (p) => detailed(p) && p.roofOn && p.roofType === "flat",
  ),
  toggle("windowsOn", "Facade windows", () => true),
  toggle("roofOn", "Roof", () => true),
  toggle("mastOn", "Antenna", (p) => p.roofOn),
  toggle("plazaOn", "Plaza", () => true),
  toggle("treesOn", "Plaza trees", (p) => p.plazaOn),
];
export function addTowerDetails(root, p, mats, sections, top, baseH) {
  if (!detailed(p)) return;
  const W = p.width,
    D = p.depth;
  const facade = part(root, "Facade trim");
  for (const section of sections) {
    const { w, d, x, z, y, h } = section,
      t = Math.max(0.1, Math.min(w, d) * 0.013);
    for (const side of [-1, 1]) {
      if (p.facadeType === "bands") {
        if (side === 1)
          for (let yy = y; yy < y + h; yy += p.floorH)
            box(
              facade,
              mats.trim,
              [w + t * 2, t, d + t * 2],
              [x, yy + t * 0.5, z],
            );
      } else {
        const columns =
          p.facadeType === "vertical" ? Math.max(2, Math.floor(w / p.colW)) : 1;
        for (let i = 0; i <= columns; i++)
          box(
            facade,
            mats.trim,
            [t, h, t * 1.8],
            [
              x - w / 2 + (w * i) / columns,
              y + h / 2,
              z + side * (d / 2 + t * 0.4),
            ],
          );
        const rows =
          p.facadeType === "vertical" ? Math.max(2, Math.floor(d / p.colW)) : 1;
        for (let i = 1; i < rows; i++)
          box(
            facade,
            mats.trim,
            [t * 1.8, h, t],
            [
              x + side * (w / 2 + t * 0.4),
              y + h / 2,
              z - d / 2 + (d * i) / rows,
            ],
          );
        if (side === 1)
          box(
            facade,
            mats.trim,
            [w + t * 2, t, d + t * 2],
            [x, y + h - t * 0.5, z],
          );
      }
    }
  }
  mergePart(facade);
  if (p.entranceOn) {
    const group = part(root, "Entrance"),
      doorH = Math.min(
        p.floorH * 1.15,
        Math.max(baseH * 0.85, p.floorH * 0.65),
      ),
      doorW = Math.min(W * 0.5, p.floorH * 1.9),
      z = D / 2 + 0.08,
      t = Math.max(0.12, W * 0.012);
    box(group, mats.glass, [doorW, doorH, 0.045], [0, doorH / 2, z]);
    for (const x of [-doorW / 2, 0, doorW / 2])
      box(group, mats.trim, [t, doorH + 0.1, 0.08], [x, doorH / 2, z + 0.04]);
    box(group, mats.trim, [doorW + t * 2, t, 0.08], [0, doorH, z + 0.04]);
    box(
      group,
      mats.roof,
      [doorW * 1.25, t * 1.25, Math.min(D * 0.24, 3)],
      [0, doorH + 0.28, z + D * 0.06],
    );
    for (const x of [-doorW * 0.23, doorW * 0.23])
      box(
        group,
        mats.mast,
        [t * 0.5, doorH * 0.18, 0.04],
        [x, doorH * 0.5, z + 0.075],
      );
    box(
      group,
      mats.plaza,
      [doorW * 1.25, 0.18, D * 0.12],
      [0, 0.09, z + D * 0.025],
    );
    mergePart(group);
  }
  if (p.terracesOn) {
    const group = part(root, "Terraces");
    for (let i = 1; i < sections.length; i++) {
      const previous = sections[i - 1],
        next = sections[i],
        y = next.y;
      const ledges = [
        {
          width: previous.z + previous.d / 2 - (next.z + next.d / 2),
          x: next.x,
          z: previous.z + previous.d / 2,
        },
        {
          width: next.z - next.d / 2 - (previous.z - previous.d / 2),
          x: next.x,
          z: previous.z - previous.d / 2,
        },
      ];
      for (let side = 0; side < ledges.length; side++) {
        const ledge = ledges[side];
        if (ledge.width < 0.55) continue;
        const size = Math.min(ledge.width * 0.6, 1.4),
          zz = ledge.z + (side === 0 ? -1 : 1) * ledge.width * 0.5;
        for (const x of [next.x - next.w * 0.29, next.x + next.w * 0.29]) {
          box(group, mats.plaza, [size * 1.2, 0.4, size], [x, y + 0.2, zz]);
          const shrub = mesh(
            group,
            new THREE.IcosahedronGeometry(size * 0.42, 0),
            mats.foliage,
            [x, y + 0.52, zz],
          );
          shrub.scale.y = 0.7;
        }
      }
      const width = previous.x + previous.w / 2 - (next.x + next.w / 2);
      if (width > 0.55) {
        const size = Math.min(width * 0.6, 1.4),
          x = previous.x + previous.w / 2 - width * 0.5;
        box(group, mats.plaza, [size, 0.4, size * 1.2], [x, y + 0.2, next.z]);
        mesh(
          group,
          new THREE.IcosahedronGeometry(size * 0.42, 0),
          mats.foliage,
          [x, y + 0.52, next.z],
        );
      }
    }
    mergePart(group);
  }
  if (p.servicesOn && p.roofOn && p.roofType === "flat") {
    const group = part(root, "Roof equipment"),
      s = Math.min(top.w, top.d) * 0.16,
      y = top.y + Math.max(0.3, top.d * 0.03);
    for (const side of [-1, 1]) {
      const pos = [top.x + side * top.w * 0.22, y + s * 0.2, top.z];
      box(group, mats.roof, [s, s * 0.4, s], pos);
      const vent = ring(group, mats.mast, s * 0.32, s * 0.035, [
        pos[0],
        y + s * 0.42,
        pos[2],
      ]);
      vent.rotation.x = Math.PI / 2;
      cylinder(
        group,
        mats.trim,
        s * 0.22,
        s * 0.025,
        [pos[0], y + s * 0.42, pos[2]],
        8,
      );
    }
    mergePart(group);
  }
}
