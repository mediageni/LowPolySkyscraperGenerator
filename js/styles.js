// Selectable visual styles. Each builds a "rig" (lights + ground + bg) and a
// material set for the building. Windows glow at night, read as glass by day.

import * as THREE from 'three';
import { makeWindowMaterial } from './builder.js';

const col = (hsl) => new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
const std = (o) => new THREE.MeshStandardMaterial({ flatShading: true, ...o });

function groundPlane(material) {
  const g = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), material);
  g.rotation.x = -Math.PI / 2; g.receiveShadow = true;
  return g;
}

function buildingMats(p, night, opts = {}) {
  const body = col(p.color.body);
  const roof = body.clone().multiplyScalar(0.7);
  const win = opts.win ? new THREE.Color(opts.win) : col(p.color.win);
  return {
    body: makeWindowMaterial({ color: body, win, floorH: p.floorH, colW: p.colW,
      winFill: p.winFill, litChance: p.litChance, night, seed: p.seed }),
    roof: std({ color: roof, metalness: 0.2, roughness: 0.7 }),
    mast: std({ color: 0xbfc7d2, metalness: 0.9, roughness: 0.3 }),
    plaza: std({ color: opts.plaza ?? 0xe7edf3, roughness: 0.96, metalness: 0.0 }),
    foliage: std({ color: opts.foliage ?? 0x3f6b48, roughness: 0.92, metalness: 0.0 }),
    trunk: std({ color: opts.trunk ?? 0x4a3724, roughness: 0.95, metalness: 0.0 }),
  };
}

// --- Night City: the hero look — dark skyline, glowing windows ---------------
const night = {
  label: 'Night City',
  background: new THREE.Color('#070d18'),
  exposure: 1.15,
  rig() {
    const g = new THREE.Group();
    g.add(new THREE.HemisphereLight(0x35507a, 0x05080f, 0.55));
    const moon = new THREE.DirectionalLight(0x9fb6e0, 0.6);
    moon.position.set(40, 90, 30); moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048); moon.shadow.camera.near = 10; moon.shadow.camera.far = 400;
    moon.shadow.camera.left = moon.shadow.camera.bottom = -140;
    moon.shadow.camera.right = moon.shadow.camera.top = 140; moon.shadow.bias = -0.0004;
    g.add(moon);
    g.add(new THREE.PointLight(0xff7b3a, 0.5, 300).translateY(6)); // warm street glow
    g.add(groundPlane(std({ color: 0x0a1120, roughness: 0.85, metalness: 0.1 })));
    const grid = new THREE.GridHelper(800, 160, 0x21465f, 0x122636);
    grid.material.transparent = true; grid.material.opacity = 0.4; grid.position.y = 0.01;
    g.add(grid);
    return g;
  },
  materials(p) { return buildingMats(p, true, { plaza: 0x141f33, foliage: 0x20392f, trunk: 0x221913 }); },
};

// --- Clean Day: neutral showroom, windows are glass ---------------------------
const day = {
  label: 'Clean Day',
  background: new THREE.Color('#cdd9e6'),
  exposure: 1.0,
  rig() {
    const g = new THREE.Group();
    g.add(new THREE.HemisphereLight(0xffffff, 0xb6c2d0, 0.85));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.7);
    sun.position.set(60, 120, 50); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.near = 10; sun.shadow.camera.far = 420;
    sun.shadow.camera.left = sun.shadow.camera.bottom = -150;
    sun.shadow.camera.right = sun.shadow.camera.top = 150; sun.shadow.bias = -0.0004;
    g.add(sun);
    g.add(new THREE.DirectionalLight(0xcfe0ff, 0.4).translateX(-40));
    g.add(groundPlane(std({ color: 0xdfe6ee, roughness: 0.95 })));
    return g;
  },
  materials(p) { return buildingMats(p, false, { plaza: 0xe9eef4, foliage: 0x3f6b48, trunk: 0x4a3724 }); },
};

// --- Synthwave: retrowave dusk, neon window glow ------------------------------
const synth = {
  label: 'Synthwave',
  background: new THREE.Color('#1a0b2e'),
  exposure: 1.2,
  rig() {
    const g = new THREE.Group();
    g.add(new THREE.HemisphereLight(0x3a2a6a, 0x100720, 0.5));
    const key = new THREE.DirectionalLight(0xff5dbb, 0.7);
    key.position.set(30, 80, -40); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.camera.near = 10; key.shadow.camera.far = 400;
    key.shadow.camera.left = key.shadow.camera.bottom = -140;
    key.shadow.camera.right = key.shadow.camera.top = 140; key.shadow.bias = -0.0004;
    g.add(key);
    g.add(new THREE.PointLight(0x21d4fd, 0.7, 320).translateY(8));
    g.add(groundPlane(std({ color: 0x140a24, roughness: 0.5, metalness: 0.3 })));
    const grid = new THREE.GridHelper(800, 120, 0xff2a9d, 0x2de2e6);
    grid.material.transparent = true; grid.material.opacity = 0.6; grid.position.y = 0.01;
    g.add(grid);
    return g;
  },
  materials(p) { return buildingMats(p, true, { win: 0x35e6ff, plaza: 0x241038, foliage: 0x1f7a64, trunk: 0x2a1840 }); },
};

export const STYLES = { night, day, synth };
export const STYLE_KEYS = Object.keys(STYLES);
