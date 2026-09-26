# Research: SVG + CSS toolbox for an organic, hand-crafted Tree look

Resolves [issue #26](https://github.com/BengtBuecker/Sproutle/issues/26) (wayfinder research ticket, map #25).

**Question**: what SVG + CSS techniques can cheaply deliver an organic, hand-crafted look, and what are their costs and limits at world scale (hundreds of paths, pan/zoom camera, Share card re-render)?

**Standing constraints** (map #25 Notes): medium fixed to SVG + CSS; the scene is generated once by `decorateWorld` (`src/game/world.ts`), memoized, rendered in one pass (`src/components/Tree.tsx`), and must stay fast under pan/zoom; desktop-first; the same art must be repeatable in the Share card (`src/game/shareCard.ts`); day-seeded randomness stays.

Code facts used below: the camera is a CSS `transform` on the scene `<g>` (`cameraTransform`, `world.ts:122`), pan dispatches translate-only changes (`eased: false`), pinch/wheel zoom dispatches scale changes (`Tree.tsx:75`, `Tree.tsx:104`), and eased camera moves run as a 450ms CSS `transition: transform` (`index.css:176`). Share card output is a standalone SVG string downloaded as `.svg` (`shareCard.ts:107`), restyling every art element with inline attributes because CSS classes don't exist in that document (`shareCard.ts:27`).

---

## TL;DR verdicts

| Technique | Verdict | Cost at world scale |
|---|---|---|
| Tapered **fill-outline limbs** (outline-of-shape instead of stroke) | Use — biggest organic win | Zero render overhead; one-time generation |
| **Double-stroke layering** on Branches/Roots | Use (cheap ink look) | ~2× path count on limbs only |
| **Gradients** (paint servers) + layered blob canopy + radial blotches | Use for canopy, bark, sky | Near-zero; defined once in `<defs>`, referenced by hundreds |
| **Dash-based bark texture** on overlay paths | Use with one caveat | Zero; but conflicts with `pathLength` trick (below) |
| **`paint-order` halo** on Leaf labels | Use — keeps labels readable | Zero |
| **rough.js** (`roughjs`) | Optional adopt — the sketchy aesthetic in a box | One-time generation; a few × more `<path>` per shape |
| **perfect-freehand** | Optional adopt — tapered outline generator | One-time generation; fill-based output |
| `feTurbulence` **paper-grain background** (one static element, outside camera) | Use — cheapest painterly surface | One raster, cached; no per-frame cost |
| `feTurbulence`+`feDisplacementMap` **on the scene / camera group** | Avoid | Raster per filter region; re-raster on every zoom step |
| `feDisplacementMap` **on hundreds of limbs** | Avoid | CPU per-pixel noise × region × zoom re-rasters |
| `will-change: transform` on the camera group | Avoid | Trades crisp zoom for a blurry fixed bitmap |
| squiggy / mlcrough / sketchmark | Don't adopt | See library verdicts |

---

## 1. SVG filters: `feTurbulence` + `feDisplacementMap`

### What they deliver
`feTurbulence` synthesizes procedural texture (Perlin turbulence) — clouds, grain, marble — filling the entire filter primitive subregion; `feDisplacementMap` then spatially warps the source graphic by that noise, which is exactly the "wobbly hand-drawn stroke" and "painterly wobble" effect ([MDN `<feTurbulence>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feTurbulence), [MDN `<feDisplacementMap>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feDisplacementMap)). Both are Baseline-widely-available across browsers since 2015 (MDN).

Determinism: `feTurbulence` has a `seed` attribute — "the starting number for the pseudo random number generator" — so a fixed seed reproduces identical noise on every render and every player ([MDN `seed`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/seed)). This fits the day-seeded-randomness constraint directly, in parallel to `mulberry32` in `world.ts`.

### Cost model: applied broadly vs selectively
- A filter effect is **image-based**: the filtered element (with its children) is "drawn into a buffer (such as a raster image)", the filter runs on that buffer, and the output buffer is composited into the parent — the filter applies *before the compositing stage* ([Filter Effects Module Level 1, Introduction](https://drafts.csswg.org/filter-effects/#intro), non-normative). Filters never touch vector geometry; they rasterize.
- The filter region defaults to `x=-10%, y=-10%, width=120%, height=120%` of the filtered element's bounding box — oversized so effects like blur aren't clipped ([MDN `<filter>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/filter)). Cost therefore scales with the **area of the bounding box of whatever you attach the filter to**, plus per-pixel work.
- The per-pixel work is real: turbulence is computed per pixel over the whole subregion, and "more octaves also require more calculations, resulting in a negative impact on performance" ([MDN `numOctaves`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/numOctaves)).

**Broad** (filter on the camera `<g>` or on the scene): the filter region is the whole world bounding box — a viewport-sized raster at minimum. **Selective** (filter on the trunk, the Ground line, or a few hero elements): a handful of small rasters, one per element, each cheap on its own. **Static** (one full-viewport background `<rect>`): rasterized once, cached by the compositor, effectively free after first paint.

### Behavior under the camera transform
The camera mutates a CSS `transform` on the scene group. Two consequences follow from the raster model above:

1. A filtered child renders into a buffer in its local user space; the ancestor transform then scales that buffer. A displacement wobble computed at zoom 1 is rendered at whatever scale the camera applies.
2. Chrome re-rasters transformed content when its transform **scale** changes (script-driven changes; **not** CSS animations/transitions, and pure translation doesn't change the raster scale): "Starting in Chrome 53, all content is re-rastered when its transform scale changes, if it does not have the `will-change: transform` CSS property" ([Chrome Developers, "Re-rastering composited layers on scale change"](https://developer.chrome.com/blog/re-rastering-composite)). `will-change: transform` would force the content into "a fixed bitmap, which subsequently never changes under transform updates" — fast, but permanently blurry at other scales (same source).

Mapped to Sproutle's camera code: **pan** (translate-only) reuses the raster; **eased zoom** (450ms CSS transition) rasters once at the transition's scale; **direct pinch/wheel zoom** (`eased: false` in `Tree.tsx:75`) is a script-driven scale change per event — every zoom step re-rasters the subtree, and every re-raster re-runs any filter chain inside it. A world-scale turbulence+displacement filter inside the camera group is the worst case: per-pixel CPU noise over a viewport-sized region on every zoom tick. A handful of small filtered elements inside the camera is survivable; the whole scene is not. (The re-raster behavior is documented for Chrome; Firefox/Safari have analogous raster-caching tradeoffs not verified from primary sources here.)

### In the `<img>`/serialized Share card context
The Share card is a standalone SVG document string, opened directly as a `.svg` file. In-document `<defs>` (filters, gradients) and `filter="url(#id)"` references survive serialization and render fully — the image-context restrictions only bite when the SVG is used *as an image* (`<img>`, CSS `background-image`, canvas `drawImage`), where JavaScript is disabled and **external resources cannot be loaded** (inlined `data:` URLs are fine); these restrictions "don't apply when SVG content is viewed directly" ([MDN, SVG as an image](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image)). So: filters with in-document references work everywhere the Share card goes; anything needing an external stylesheet, script, or font file does not. Note the existing Share-card pattern already inlines all styling as attributes (`shareCard.ts:27`) because CSS classes from `index.css` don't exist in the serialized document — any new art technique must be expressible as inline attributes + in-document `<defs>`.

### Verdict
Use filters for **texture surfaces** (paper-grain background, optionally a displacement pass on the static backdrop), never for **wobble on world-scale geometry**. Geometric wobble belongs in path data (where the seeded `decorateWorld` already puts it — increase `bow`/taper, not filters). If any filter must live inside the camera group, keep it to a few hero elements and accept re-raster on zoom.

---

## 2. Stroke craft: tapered, variable-width, layered, dashed strokes

### There is no native tapered stroke
`stroke-width` is a **single `<length-percentage>`** per shape ([SVG 2 spec, painting §13.5.3](https://www.w3.org/TR/SVG2/painting.html)). Every SVG stroke is a constant-width outline. Variable-width/tapered strokes must be built by hand, one of two ways:

**a) Outline-of-shape instead of stroke (recommended).** Generate a closed outline polygon around the limb's centerline and `fill` it. The limb becomes an ordinary filled path: taper, flare at joints, and a pen-like end are all just geometry; it rasterizes like any fill (cheap), scales crisply under the camera, and serializes as plain `d` for the Share card. Two ways to generate the outline:
- **perfect-freehand** (library, below): `getStroke(waypoints, { size, thinning, taper, easing, smoothing })` returns the outline points of a pressure-sensitive stroke around any input points, plus a documented `getSvgPathFromStroke` helper that turns them into SVG path data ([README](https://github.com/steveruizok/perfect-freehand)). `taper: true` tapers the whole stroke; "the library was designed for rendering the types of input points generated by the movement of a human hand, but you can pass any set of points" (README) — exactly our case: feed it seeded waypoints along each Branch, get a tapered limb shape back.
- Hand-rolled quad-strips from the existing `curvedPath` waypoints (a local helper in `world.ts` — the codebase already owns seeded randomization and path math).

**b) Double-stroke layering.** Same `d`, two `<path>` elements: a wider darker stroke under a narrower lighter one (or two slightly offset strokes of the same color) — reads as inked/bark edges. Zero new machinery; the only cost is ~2× path count on limbs and Roots (a few hundred extra elements at world scale — the scene already renders hundreds; this stays vector and within the one-pass memoized render). Both layers can carry the existing `pathLength`/draw animation.

### Dash-based bark texture
`stroke-dasharray` paints alternating dash/gap lengths along the path outline ([SVG 2 spec §13.5.6](https://www.w3.org/TR/SVG2/painting.html); [MDN `stroke-dasharray`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/stroke-dasharray)) — a cheap bark or wood-grain stroke on the trunk and thick Branches. **Caveat — `pathLength` interaction**: the scene's growth animation works by setting `pathLength={1}` and `.grow path { stroke-dasharray: 1 }` (`Tree.tsx:145`, `index.css:65`), and `pathLength` rescales *all* distance computations so `stroke-dasharray` "will assume the start of the path being 0 and the end point the value defined in the `pathLength` attribute" ([MDN `pathLength`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/pathLength)). Dash-based bark therefore cannot reuse the animated paths: put bark on **separate overlay paths without `pathLength`**, using real user-unit dash lengths.

### Related stroke tools
- `vector-effect="non-scaling-stroke"` makes stroke width independent of transforms and zoom ([MDN `vector-effect`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/vector-effect)). For organic art this is mostly **counter**-productive — Branches should thicken as you zoom in, like ink. Reserve it for UI-ish survivors (height ruler) if at all. Note it applies "before any of the other compositing operations, i.e. filters, masks and clips" (MDN).
- `paint-order: stroke fill` on `<text>` paints the stroke beneath the fill ([MDN `paint-order`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/paint-order); default order is fill, stroke, markers). A wide, light, low-opacity stroke under the Leaf label's fill gives a **halo/badge** that keeps labels readable over mood-first art — directly serving the map's "labels survivable" constraint. Inlines as an attribute for the Share card.

---

## 3. Fill craft: gradients, blob canopies, blotches, paper grain

### Gradients
`<linearGradient>`/`<radialGradient>` are paint servers defined once in `<defs>` and referenced by any number of elements via `fill="url(#id)"`. Defaults do the right thing for us: `gradientUnits` defaults to `objectBoundingBox` ([MDN `<radialGradient>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/radialGradient), [MDN `<linearGradient>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/linearGradient)), so **one** radial gradient automatically fits every foliage blob's own bounding box — define once, reuse hundreds of times. `fr`/`fx`/`fy` allow off-center highlights (a soft sun-side blob on the canopy; MDN). Cost: paint-time only, no per-pixel program; vector under the camera; serializes as in-document defs for the Share card.

Suggested uses: radial green-on-green canopy depth; a subtle vertical linear gradient on the trunk fill for bark volume; sky wash behind the finale stars.

### Layered blob canopies
The scene already layers `foliage`/`foliageBack` circles at different opacities (`world.ts:389`, `index.css:85-91`). Upgrade path with no new cost class: replace circles with seeded wobbly closed outlines (blob paths) at 2–3 depth layers (two greens + opacity, as today), plus a few large low-opacity **radial blotches** on top for painterly dapple. Everything is fill + gradient + opacity — the cheapest rasterization profile there is, hundreds of elements included.

### Paper-grain background — the one place filters are cheap
One full-bleed `<rect>` with a `feTurbulence` filter (fine `baseFrequency`, desaturated to alpha via `feColorMatrix`) gives a paper/watercolor grain. Because it's a single element:
- outside the camera group (like the height ruler, `Tree.tsx:302`) it rasters once and is cached — pan/zoom never recomputes it;
- inside the camera group it still only re-rasters on **scale** changes (per the Chrome re-raster model above) — a single-rect re-raster per zoom step is acceptable, but outside is strictly cheaper;
- for the Share card, embed the same `<defs>` in the card string — a full-document paper grain behind the art, self-contained, no external references.

---

## 4. Libraries

### rough.js — `roughjs` (the sketchy incumbent)
- **What**: <9 kB graphics library drawing in a "sketchy, hand-drawn-like" style; primitives + `path(d)` accepting **existing SVG path data strings** — the current `curvedPath` output can be passed straight through ([README](https://github.com/rough-stuff/rough)).
- **License/maintenance**: MIT (repo `rough-stuff/rough`, 21.2k stars). npm `roughjs` latest **4.6.6, published 2023-11-20**; last repo push **2024-07-28**; ~14.4M downloads/week (npm registry). Dormant for ~2 years but stable, dependency-light, and load-bearing for Excalidraw and diagrams.net (README sponsors). Adopting it means adopting a frozen-but-proven API.
- **Determinism**: an explicit `seed` option (1…2^31) regenerates "the exact shape when re-generating with the same parameters" ([wiki, Options](https://github.com/rough-stuff/rough/wiki)) — maps 1:1 onto the day-seeded constraint, independent of or combined with the existing `mulberry32` seed.
- **React + Share card fit — the generator API is the key fact**: `rough.generator()` works **without any DOM** ("on the server or in a web worker"), returns serializable *drawables*, and `generator.toPaths(drawable)` returns **PathInfo objects** (`d`, `stroke`, `strokeWidth`, `fill`, `pattern`) intended for rendering as SVG paths in any order-preserving way ([wiki, RoughGenerator](https://github.com/rough-stuff/rough/wiki/RoughGenerator)). That means: render the same PathInfo as React `<path>` elements in `Tree.tsx` *and* as inline strings in `shareCard.ts` — one generation source, two renderers, exactly the map's "same art approach repeatable in the Share card".
- **Perf with hundreds of elements**: generation happens once inside the memoized `decorateWorld` call (the wiki's own motivation for generators is avoiding re-randomization on redraw). Render cost is a few `<path>` elements per shape (the sketchy look is multiple stroke passes plus an optional fill pattern) — so hundreds of limbs become on the order of a thousand paths. That is still one-pass, vector, filter-free rendering; the current scene already carries hundreds of paths plus text. Hachure fills are pattern-based (PatternInfo; wiki) and multiply paths per filled shape — use `fillStyle: 'solid'` for canopy masses and keep hachure for small accents (Leaves, Ground details) to stay lean. A `simplification` option reduces point counts on complex paths (wiki).
- **Watch out**: the npm package is **`roughjs`**, not `rough` (the latter is an unrelated package last published 2015 — npm registry).

**Alternatives in the rough.js orbit**:
- **@excalidraw/roughjs** (4.5.3, published 2023-04-09, npm) — the Excalidraw team's fork; equally quiet since 2023. No maintenance advantage over upstream today.
- **svg2roughjs** (repo `fskpf/svg2roughjs`; npm 3.2.3, **2026-03-07** — actively maintained) converts an existing SVG DOM into a rough.js rendering, with its own `seed` and a `pencilFilter` option ([npm](https://www.npmjs.com/package/svg2roughjs)). It's a DOM-in/DOM-out converter: useful as a one-off prototyping/conversion aid, not a runtime dependency for generated art.
- **mlcrough** (MIT, created 2026-05) — a modernized fork (ESM/SSR-friendly, extra fill styles) with 1 star; too green to adopt.
- **sketchmark** — a hand-drawn diagram DSL that *wraps* rough.js; wrong shape for our use.

### perfect-freehand — tapered outline generator
- **What**: `getStroke` generates "the points for a polygon based on an array of points" — outline points forming a stroke around the input; "you can render the result any way you like" (README). This is the tapered variable-width stroke engine SVG lacks natively.
- **License/maintenance**: MIT; repo `steveruizok/perfect-freehand`, 5.7k stars, last push 2026-04-13; npm 1.2.3 published 2026-02-01; ~2.4M downloads/week (the engine behind tldraw's ink). **Actively maintained.**
- **Determinism**: no RNG inside — the same input points produce the same outline (pressure is simulated from point spacing by default; README). Wobble stays ours, in the seeded generation layer; the library is a pure function.
- **React + Share card fit**: output is plain point arrays; the README ships a `getSvgPathFromStroke` helper producing SVG path data — same string feeds React `d` and the Share card string builder.
- **Cost**: generation is O(points) per limb, once; output is one filled path per limb. No render-time overhead versus a plain fill.

### Other credible candidates — none better
- **squiggy** (vector brushstroke library, ~17 kB, no deps) produces outline+hole polygons but the repo has **no license file** (GitHub API) and hasn't moved since 2021 — not adoptable.
- SVG-filter-only "hand-drawn" recipes (displacement on strokes) — covered in §1; the wrong tool at this scale.

**Library verdict**: adopt **perfect-freehand** if we want tapered limbs (or hand-roll quad-strips). Adopt **rough.js** only if the double-stroke/hachure sketch aesthetic is the chosen direction — it slots cleanly into the memoized generator + Share card pipeline via `rough.generator()`/`toPaths`, and its dormancy is a risk to note, not a blocker (small, stable, MIT). Skip everything else.

---

## 5. Techniques that break down (world scale, camera, or Share card)

1. **Scene-wide `feTurbulence`/`feDisplacementMap`** — viewport-sized raster, re-raster per direct zoom step in Chrome (script-driven scale change), per-pixel CPU noise each time (§1). The breakdown is *interactive*, not static: it looks fine in a screenshot and janks on pinch zoom.
2. **Filters on hundreds of limbs individually** — many small rasters beats one huge one, but each still breaks the vector render path and re-runs on zoom re-rasters; a few hundred filter regions is still a tax per zoom tick. Filters on a handful of hero elements (trunk, Ground) are the ceiling.
3. **`will-change: transform` on the camera group** — the tempting "fix" for #1 pins the scene to a fixed bitmap: fast transforms, blurry at every non-raster scale (Chrome blog, §1). Organic art zoomed 2.5× needs crisp re-raster.
4. **Dash bark on the existing animated paths** — `pathLength={1}` renormalizes dash calculations (MDN, §2); dash arrays on those paths silently corrupt both the bark pattern and the draw animation. Use overlay paths.
5. **CSS-class-only styling for new art** — the Share card document has no stylesheet; every new technique must be inlineable (`stroke`, `fill`, `paint-order`, `filter="url(#id)"` with in-document `<defs>`, gradients via defs). Confirmed by the existing `sceneShapes` duplication (`shareCard.ts:27`).
6. **External references anywhere in the Share card** — fonts (beyond system fallbacks), stylesheets, image URLs do not load in `<img>`/image contexts (MDN, §1). Keep the card self-contained (it already is).
7. **rough.js hachure fills at canopy scale** — pattern fills multiply paths per filled shape; hundreds of hachured blobs blow up node count for little payoff. `fillStyle: 'solid'` + gradients for masses, hachure for accents (§4).
8. **`vector-effect="non-scaling-stroke"` on Branches** — keeps twigs hairline-thin at zoom 2.5, killing the ink-thickening effect the organic look wants (§2).

---

## Recommended toolbox, ranked by organic payoff per cost

1. **Tapered fill-outline limbs** (perfect-freehand or ~30 lines of local math) for Branches, trunk, Roots — flat-out better than uniform strokes for "not a diagram".
2. **Gradients + layered seeded blob canopy + radial blotches** — painterly volume for free (paint servers, objectBoundingBox default).
3. **`paint-order` label halos** — labels survive mood-first art.
4. **Double-stroke layering and/or rough.js** for the sketchy ink pass, depending on which aesthetic direction wins; generator API keeps React and Share card in sync from one generation.
5. **One `feTurbulence` paper-grain rect** outside the camera group (plus in-card `<defs>` for the Share card) — the only filter that earns its keep.
6. **Dash bark** on dedicated overlay paths, trunks only.

---

## Sources

Primary:
- MDN [`<feTurbulence>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feTurbulence), [`<feDisplacementMap>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feDisplacementMap), [`<filter>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/filter), [`seed`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/seed), [`numOctaves`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/numOctaves)
- Filter Effects Module Level 1 — [Introduction](https://drafts.csswg.org/filter-effects/#intro) (image-based model, filter region/offscreen sizing)
- MDN [SVG as an image](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image) (image-context restrictions)
- Chrome Developers — [Re-rastering composited layers on scale change](https://developer.chrome.com/blog/re-rastering-composite)
- SVG 2 spec — [painting §13.5.3 (stroke-width)](https://www.w3.org/TR/SVG2/painting.html), §13.5.6 (stroke-dasharray); MDN [`stroke-dasharray`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/stroke-dasharray), [`pathLength`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/pathLength), [`vector-effect`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/vector-effect), [`paint-order`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/paint-order), [`<radialGradient>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/radialGradient), [`<linearGradient>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/linearGradient)
- rough.js — [README](https://github.com/rough-stuff/rough) (MIT, <9 kB, SVG paths input), [wiki Home](https://github.com/rough-stuff/rough/wiki) (roughness/bowing/seed/fillStyle/simplification), [wiki RoughGenerator](https://github.com/rough-stuff/rough/wiki/RoughGenerator) (DOM-free generator, `toPaths`, serializable drawables); npm registry (`roughjs` 4.6.6, 2023-11-20; downloads), GitHub API (rough-stuff/rough: MIT, 21.2k stars, pushed 2024-07-28)
- perfect-freehand — [README](https://github.com/steveruizok/perfect-freehand) (getStroke, options, getSvgPathFromStroke, MIT), npm registry (1.2.3, 2026-02-01; downloads), GitHub API (pushed 2026-04-13)
- svg2roughjs — [npm](https://www.npmjs.com/package/svg2roughjs) (3.2.3, 2026-03-07), repo fskpf/svg2roughjs
- @excalidraw/roughjs — npm registry (4.5.3, 2023-04-09); mlcrough — GitHub API (MIT, created 2026-05); squiggy — GitHub API (no license, pushed 2021-07)

Code (this repo): `src/game/world.ts`, `src/components/Tree.tsx`, `src/index.css`, `src/game/shareCard.ts` at `main@d90576e`.
