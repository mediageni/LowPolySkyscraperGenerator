// Pure builder: params -> THREE.Group (a flat-shaded low-poly skyscraper).
// A building is a BASE + a vertical stack of setback SECTIONS + a ROOF, optionally
// repeated in a layout. Windows are drawn by a shader patched into the body material:
// a world-space grid on vertical faces only, lit per-cell at night (xyz's approach).

import * as THREE from "three";
import {
  makeWindowMaterial as gridMaterial,
  materializeWindows,
} from "@engine/materials.js";
export const makeWindowMaterial = (options) =>
  gridMaterial({ ...options, kind: "tower" });
import { makeRng } from "@engine/rng.js";

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// --- low-level mesh assembly (for the custom roofs) --------------------------
function tri(pos, a, b, c) {
  pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
}
function quad(pos, a, b, c, d) {
  tri(pos, a, b, c);
  tri(pos, a, c, d);
}
function meshFrom(positions, material) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function boxMesh(w, h, d, mat, cx, cy, cz) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(cx, cy + h / 2, cz);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// --- window material: standard material + a window grid in the shader ---------
// --- one tower: base + setback sections + roof -------------------------------
function buildTower(p, mats, hScale) {
  const g = new THREE.Group();
  const W = p.width,
    D = p.depth,
    Ht = p.height * hScale;
  const baseH = clamp(p.baseHeight, 0.02, 0.2) * Ht;
  const n = clamp(Math.round(p.sections), 1, 6);
  const setb = p.setback,
    mode = p.setbackMode;

  // base
  if (p.baseType === "extruded")
    g.add(
      boxMesh(
        W * (1 + p.baseInset),
        baseH,
        D * (1 + p.baseInset),
        mats.body,
        0,
        0,
        0,
      ),
    );
  else if (p.baseType === "inset")
    g.add(
      boxMesh(
        W * (1 - p.baseInset),
        baseH,
        D * (1 - p.baseInset),
        mats.body,
        0,
        0,
        0,
      ),
    );
  else g.add(boxMesh(W, baseH, D, mats.body, 0, 0, 0));

  // section heights via arithmetic progression
  const avail = Ht - baseH;
  const wts = [];
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.max(0.15, 1 + p.progression * i);
    wts.push(w);
    sum += w;
  }

  let y = baseH,
    w = W,
    d = D,
    cx = 0,
    cz = 0,
    topW = W,
    topD = D,
    topCx = 0,
    topCz = 0,
    topY = Ht;
  for (let i = 0; i < n; i++) {
    const f = Math.max(0.25, 1 - setb * i); // cumulative inset factor
    if (mode === "all") {
      w = W * f;
      d = D * f;
      cx = 0;
      cz = 0;
    } else if (mode === "two") {
      w = W;
      d = D * f;
      cx = 0;
      cz = 0;
    } else {
      w = W * f;
      cx = -(W - w) / 2;
      d = D;
      cz = 0;
    } // 'one': step on one side
    const h = (avail * wts[i]) / sum;
    g.add(boxMesh(w, h, d, mats.body, cx, y, cz));
    y += h;
    if (i === n - 1) {
      topW = w;
      topD = d;
      topCx = cx;
      topCz = cz;
      topY = y;
    }
  }

  // roof on top of the last section
  g.add(buildRoof(p, mats.roof, topW, topD, topCx, topCz, topY));

  // optional mast / antenna (spire)
  if (p.mast > 0.02) {
    const mh = p.mast * Ht * 0.5,
      t = Math.max(0.4, W * 0.04);
    g.add(
      boxMesh(
        t,
        mh,
        t,
        mats.mast,
        topCx,
        topY + (p.roofHeight || 0) * (p.roofType !== "flat" ? 1 : 0),
        topCz,
      ),
    );
  }
  return g;
}

function buildRoof(p, mat, w, d, cx, cz, baseY) {
  const t = p.roofType;
  if (t === "flat") {
    // thin parapet cap so the roofline reads
    const m = boxMesh(w, Math.max(0.3, d * 0.03), d, mat, cx, baseY, cz);
    return m;
  }
  const over = t === "overhangPyramid" || t === "overhangPrism" ? 0.12 : 0;
  const bw = (w / 2) * (1 + over),
    bd = (d / 2) * (1 + over);
  const h = p.roofHeight;
  const pos = [];
  // bottom rim corners (slight skirt for overhang roofs)
  const b = [
    [cx + bw, baseY, cz + bd],
    [cx + bw, baseY, cz - bd],
    [cx - bw, baseY, cz - bd],
    [cx - bw, baseY, cz + bd],
  ];
  if (over > 0) {
    // little vertical skirt from section top out to the overhang rim
    const s = [
      [cx + w / 2, baseY, cz + d / 2],
      [cx + w / 2, baseY, cz - d / 2],
      [cx - w / 2, baseY, cz - d / 2],
      [cx - w / 2, baseY, cz + d / 2],
    ];
    quad(pos, b[0], b[1], s[1], s[0]);
    quad(pos, b[1], b[2], s[2], s[1]);
    quad(pos, b[2], b[3], s[3], s[2]);
    quad(pos, b[3], b[0], s[0], s[3]);
  }
  if (t === "prism" || t === "overhangPrism") {
    // gable ridge along x
    const rl = [cx - bw, baseY + h, cz],
      rr = [cx + bw, baseY + h, cz];
    quad(pos, b[3], b[0], rr, rl); // +z slope
    quad(pos, b[1], b[2], rl, rr); // -z slope
    tri(pos, b[0], b[1], rr); // +x end
    tri(pos, b[2], b[3], rl); // -x end
  } else {
    // pyramid / trunc pyramid
    const ts = t === "trunc" ? 0.42 : 0.0;
    if (ts <= 0) {
      const ap = [cx, baseY + h, cz];
      tri(pos, b[0], b[1], ap);
      tri(pos, b[1], b[2], ap);
      tri(pos, b[2], b[3], ap);
      tri(pos, b[3], b[0], ap);
    } else {
      const tw = (w / 2) * ts,
        td = (d / 2) * ts;
      const u = [
        [cx + tw, baseY + h, cz + td],
        [cx + tw, baseY + h, cz - td],
        [cx - tw, baseY + h, cz - td],
        [cx - tw, baseY + h, cz + td],
      ];
      quad(pos, b[0], b[1], u[1], u[0]);
      quad(pos, b[1], b[2], u[2], u[1]);
      quad(pos, b[2], b[3], u[3], u[2]);
      quad(pos, b[3], b[0], u[0], u[3]);
      quad(pos, u[0], u[1], u[2], u[3]); // top cap
    }
  }
  return meshFrom(pos, mat);
}

// --- layouts: where the tower(s) sit -----------------------------------------
function layoutOffsets(p) {
  const span = Math.max(p.width, p.depth) + p.layoutGap;
  const vary = (i) => 1 - p.layoutVary * ((i * 0.6180339) % 1);
  switch (p.layout) {
    case "twins":
      return [
        [-span / 2, 0, 1],
        [span / 2, 0, vary(1)],
      ];
    case "row":
      return [
        [-span, 0, vary(1)],
        [0, 0, 1],
        [span, 0, vary(2)],
      ];
    case "quads":
      return [
        [-span / 2, -span / 2, 1],
        [span / 2, -span / 2, vary(1)],
        [-span / 2, span / 2, vary(2)],
        [span / 2, span / 2, vary(3)],
      ];
    case "cross":
      return [
        [0, 0, 1],
        [span, 0, vary(1)],
        [-span, 0, vary(2)],
        [0, span, vary(3)],
        [0, -span, vary(4)],
      ];
    default:
      return [[0, 0, 1]];
  }
}

// --- one scatter tree: a trunk + a faceted conifer cone or round blob --------
function makeTree(r, mats) {
  const g = new THREE.Group();
  const fr = 0.8 + r() * 1.2; // foliage radius
  const th = 2.2 + r() * 3.4; // total height
  const trunkH = th * 0.28,
    tr = Math.max(0.12, fr * 0.16);
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(tr * 0.8, tr, trunkH, 5),
    mats.trunk,
  );
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  g.add(trunk);
  if (r() < 0.65) {
    // conifer: 1-2 stacked cones
    let y = trunkH,
      fh = th - trunkH,
      rr = fr;
    const tiers = r() < 0.5 ? 2 : 1;
    for (let i = 0; i < tiers; i++) {
      const ch = (fh / tiers) * 1.25;
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(rr, ch, 6),
        mats.foliage,
      );
      cone.position.y = y + (ch / 2) * 0.82;
      cone.castShadow = true;
      g.add(cone);
      y += ch * 0.55;
      rr *= 0.72;
    }
  } else {
    // round blob
    const blob = new THREE.Mesh(
      new THREE.IcosahedronGeometry(fr, 0),
      mats.foliage,
    );
    blob.position.y = trunkH + fr * 0.85;
    blob.castShadow = true;
    g.add(blob);
  }
  return g;
}

// --- plaza slab + trees scattered in the ring around the footprint -----------
function buildPlaza(p, mats, hx, hz) {
  const g = new THREE.Group();
  const r = makeRng((p.seed ^ 0x9e3779b9) >>> 0);
  const pad = Math.max(6, Math.max(hx, hz) * 0.55);
  const PHX = hx + pad,
    PHZ = hz + pad;
  const PH = clamp(Math.max(hx, hz) * 0.06, 1.0, 3.0);

  const plaza = new THREE.Mesh(
    new THREE.BoxGeometry(PHX * 2, PH, PHZ * 2),
    mats.plaza,
  );
  plaza.position.y = PH / 2;
  plaza.receiveShadow = true;
  plaza.castShadow = true;
  g.add(plaza);

  const count = Math.min(40, Math.round(8 + (PHX + PHZ) * 0.45));
  const margin = 1.4;
  let placed = 0,
    tries = 0;
  while (placed < count && tries < count * 10) {
    tries++;
    const x = (r() * 2 - 1) * (PHX - 1.2),
      z = (r() * 2 - 1) * (PHZ - 1.2);
    if (Math.abs(x) < hx + margin && Math.abs(z) < hz + margin) continue; // keep off the building
    const t = makeTree(r, mats);
    t.position.set(x, PH, z);
    g.add(t);
    placed++;
  }
  return { group: g, plazaTop: PH };
}

export function buildBuilding(p, mats) {
  const root = new THREE.Group();
  root.name = "building";

  const towers = new THREE.Group();
  for (const [dx, dz, hs] of layoutOffsets(p)) {
    const t = buildTower(p, mats, hs);
    t.position.set(dx, 0, dz);
    towers.add(t);
  }
  // footprint extent (before lifting onto the plaza)
  const tb = new THREE.Box3().setFromObject(towers),
    tsize = new THREE.Vector3();
  tb.getSize(tsize);
  const { group: plaza, plazaTop } = buildPlaza(
    p,
    mats,
    tsize.x / 2,
    tsize.z / 2,
  );
  towers.position.y = plazaTop; // building + trees stand on the plaza
  root.add(plaza, towers);

  materializeWindows(root);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3(),
    center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  root.userData.size = size;
  root.userData.center = center;
  return root;
}
