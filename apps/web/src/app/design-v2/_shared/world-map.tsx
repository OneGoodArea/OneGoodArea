"use client";

import { useMemo } from "react";
import { feature } from "topojson-client";
import { geoEqualEarth, geoPath, geoCentroid } from "d3-geo";
import worldTopo from "world-atlas/countries-110m.json";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import "./world-map.css";

/* WorldMap — real geography in Plotted brand styling.

   AR-204 PR 2 / commit 6 (section 5 reskin).

   Uses world-atlas (Natural Earth) at 110m resolution to project
   real country coastlines onto SVG paths via d3-geo's Equal Earth
   projection. Renders each country as a hairline outline at low
   opacity (the "world in periphery"). The UK is identified by ISO
   numeric code (826), drawn at full opacity + filled, with a halo
   ring + "UK" label as the focal point.

   Equal Earth projection chosen over Mercator: Mercator distorts
   high latitudes badly (Greenland looks bigger than Africa). Equal
   Earth is area-accurate and feels less aggressive.

   No DOM-side projection math — everything's precomputed once at
   render via useMemo. */

const UK_ISO = "826"; // United Kingdom (ISO 3166-1 numeric)

interface World {
  /* `key` is the stable array index from the topology, not an ISO
     code. Some features in Natural Earth 110m have no `id` (notably
     Antarctica and a few small islands); falling back to index keeps
     React keys unique without inventing IDs. */
  countries: Array<{ key: number; d: string }>;
  ukPath: string;
  ukCenter: { x: number; y: number };
}

/* Round to a fixed decimal precision. Critical for hydration: d3-geo
   trig math produces floats that differ in the 13th decimal between
   Node (SSR) and V8 (client), which React's prop diff catches as a
   hydration mismatch. 2 decimals is well above any SVG-visible
   precision on a 1000x500 viewBox. */
const round2 = (n: number) => Math.round(n * 100) / 100;

function buildWorld(): World {
  /* Cast: topojson-specification types are loose around objects. */
  const topo = worldTopo as unknown as Topology<{
    countries: GeometryCollection<{ name?: string }>;
  }>;

  const collection = feature(
    topo,
    topo.objects.countries
  ) as FeatureCollection<Geometry, { name?: string }>;

  /* Equal Earth projection, scaled to fit a 1000x500 viewBox.
     Centered on Greenwich (lon 0) + slight pan north so the
     equator sits below the visual midpoint (Europe / UK get
     more vertical room).

     .digits(2) rounds every coordinate in the generated path
     strings to 2 decimals, killing the per-environment trig
     drift that breaks hydration. */
  const projection = geoEqualEarth()
    .scale(180)
    .translate([500, 260]);
  const pathGen = geoPath(projection).digits(2);

  const countries: Array<{ key: number; d: string }> = [];
  let ukPath = "";
  let ukCenter = { x: 482, y: 154 };

  collection.features.forEach((f, i) => {
    const id = String(f.id ?? "");
    const d = pathGen(f as Feature<Geometry, { name?: string }>) ?? "";
    if (!d) return;
    if (id === UK_ISO) {
      ukPath = d;
      const [cx, cy] = projection(geoCentroid(f as Feature<Geometry, { name?: string }>)) ?? [482, 154];
      ukCenter = { x: round2(cx), y: round2(cy) };
    } else {
      countries.push({ key: i, d });
    }
  });

  return { countries, ukPath, ukCenter };
}

export function WorldMap() {
  /* useMemo wants an inline function expression so react-hooks plugin
     can analyse deps. buildWorld is pure + deps-free; wrap inline. */
  const world = useMemo(() => buildWorld(), []);

  return (
    <svg
      viewBox="0 0 1000 500"
      className="oga-world-map"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      {/* World countries — hairline outlines, low opacity. The
          "world in periphery." */}
      <g className="oga-world-map__countries">
        {world.countries.map((c) => (
          <path key={c.key} d={c.d} className="oga-world-map__country" />
        ))}
      </g>

      {/* UK halo — double ring, the outer ring pulses subtly */}
      <circle
        cx={world.ukCenter.x}
        cy={world.ukCenter.y}
        r={42}
        className="oga-world-map__halo oga-world-map__halo--outer"
      />
      <circle
        cx={world.ukCenter.x}
        cy={world.ukCenter.y}
        r={28}
        className="oga-world-map__halo oga-world-map__halo--inner"
      />

      {/* UK shape itself — filled + stroked at full opacity. */}
      <path d={world.ukPath} className="oga-world-map__uk" />
    </svg>
  );
}
