// Extract UK (and Ireland) SVG path from world-atlas topojson 110m.
// Output: a single-quoted JS snippet you can paste into client.tsx.
const fs = require("fs");
const path = require("path");

const t = JSON.parse(fs.readFileSync(path.join(__dirname, "world-50m.json"), "utf8"));
const { scale, translate } = t.transform;
const arcs = t.arcs;

// Decode a single quantized arc → absolute [lng, lat] points.
function decodeArc(arc) {
  let x = 0, y = 0;
  return arc.map(([dx, dy]) => {
    x += dx;
    y += dy;
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
  });
}

// Given an arc index (possibly ~i for reversed), return ordered points.
function arcPoints(i) {
  const rev = i < 0;
  const idx = rev ? ~i : i;
  const pts = decodeArc(arcs[idx]);
  return rev ? pts.slice().reverse() : pts;
}

// Stitch a ring of arc indices into a continuous list of points.
function ringPoints(ringArcIdxs) {
  const out = [];
  ringArcIdxs.forEach((ai, k) => {
    const pts = arcPoints(ai);
    // drop the first point of each arc after the first to avoid dupes
    const slice = k === 0 ? pts : pts.slice(1);
    out.push(...slice);
  });
  return out;
}

// Find countries by name.
const countries = t.objects.countries.geometries;
const wanted = ["United Kingdom", "Ireland"];
const hits = countries.filter(c => wanted.includes(c.properties && c.properties.name));

console.error("Found:", hits.map(h => h.properties.name));

// Build SVG path(s). Uses simple Mercator-esque projection mapped into 320×360 viewBox.
const VB_W = 320, VB_H = 360;
const BOUNDS = { minLat: 49.7, maxLat: 60.9, minLng: -10.9, maxLng: 2.2 };
function toXY([lng, lat]) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * VB_W;
  const y = VB_H - ((lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * VB_H;
  return [x, y];
}

function pathFromGeometry(g) {
  // MultiPolygon: [[[arcIdxs ring1], [ring2]...], [poly2 rings...]]
  // Polygon: [[ring1 arcIdxs], [ring2]...]
  const polys = g.type === "MultiPolygon" ? g.arcs : [g.arcs];
  const parts = [];
  for (const rings of polys) {
    for (const ring of rings) {
      const pts = ringPoints(ring);
      if (pts.length < 3) continue;
      const d = pts.map((p, i) => {
        const [x, y] = toXY(p);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      }).join("");
      parts.push(d + "Z");
    }
  }
  return parts.join("");
}

const result = hits.map(h => ({
  name: h.properties.name,
  path: pathFromGeometry(h),
}));

console.log(JSON.stringify(result, null, 2));
