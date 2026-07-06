# fitcss

A SASS utility that generates CSS utility classes using a modular scale. Instead of hand-picking spacing and font-size values, you define a ratio and a number of steps, to get a proportional set of classes for every breakpoint.

## How it works

Every numeric class (`m-1`, `p-3`, `font-2`) is a step on a scale. Given a base value and a ratio, each step multiplies the previous one:

```
base × ratio⁰  ->  step 1 (base)
base × ratio¹  ->  step 2
base × ratio²  ->  step 3
…
```

The ratio can vary per breakpoint, so the scale can expand or contract as the viewport grows.

## Setup

Compile `scss/fit.scss`. All configuration lives in `scss/_config.scss`, that is the only file you need to edit.

```
scss/
  _config.scss   -> edit this
  fit.scss       -> compile this
```

### Global syntax

```scss
modifier: '-',
prefix_number_with_modifier: true,
breakpoint_logic: 'min-width',
```

| Key                           | Description                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `modifier`                    | Separator between the class name and scale number. `'-'` -> `.m-1`; `''` -> `.m1` |
| `prefix_number_with_modifier` | When `false`, the modifier is dropped before numbers.                             |
| `breakpoint_logic`            | `'min-width'` for mobile-first, `'max-width'` for desktop-first.                  |

### Breakpoints

```scss
breakpoints: (
  small: (
    size: toEm(510px, 16px),
    syntax: "\\@sm",
  ),
  medium: (
    size: toEm(780px, 16px),
    syntax: "\\@md",
  ),
  large: (
    size: toEm(1020px, 16px),
    syntax: "\\@lg",
  )
);
```

Each entry produces a `@media` rule and a responsive class variant suffixed with `syntax`. Add, remove, or rename entries freely.

The iteration order is **base first** (no media query), then each breakpoint top-to-bottom. This order is what the `ratio` and `neg_ratio` lists in scale configs are indexed against — position 1 is always the base, position 2 is the first breakpoint, and so on.

> The `ratio`/`neg_ratio` lists in `spacing` and `font_size` must have exactly `n + 1` values, where `n` is the number of breakpoints.

### Axis

Controls which directional variants are generated for spacing utilities (`.mt`, `.pb`, `.mx`, …).

```scss
axis: (
  top: (
    property: (
      "top",
    ),
    syntax: "t",
  ),
  bottom: (
    property: (
      "bottom",
    ),
    syntax: "b",
  ),
  left: (
    property: (
      "left",
    ),
    syntax: "l",
  ),
  right: (
    property: (
      "right",
    ),
    syntax: "r",
  ),
  y: (
    property: (
      "top",
      "bottom",
    ),
    syntax: "y",
  ),
  x: (
    property: (
      "left",
      "right",
    ),
    syntax: "x",
  )
);
```

`property` is a list of the CSS properties set by the class. `syntax` is the single character suffix. Remove any entry to stop generating that direction.

### Spacing scale

Generates margin and padding classes (`.m-1`, `.pt3`, `.mx-2\@md`, etc).

```scss
spacing: (
  ratio: 1.067 1.1 1.12 1.2,
  neg_ratio: 1.067 1.1 1.12 1.2,
  max_step: 5,
  min_step: 5,
  base_positive: 0.25,
  base_negative: 0.25
);
```

| Key             | Description                                                                 |
| --------------- | --------------------------------------------------------------------------- |
| `ratio`         | Multiplier list for the positive scale, one value per breakpoint iteration. |
| `neg_ratio`     | Multiplier list for the negative scale.                                     |
| `max_step`      | Number of steps generated above the base value.                             |
| `min_step`      | Number of steps generated below the base value.                             |
| `base_positive` | Starting `rem` value for the upward scale.                                  |
| `base_negative` | Starting `rem` value for the downward scale.                                |

With `max_step: 5` and `min_step: 5` the output spans steps `-5` through `5` (step `0` is omitted; a hard-coded zero class `.m0` / `.p0` is added separately).

---

### Font-size scale

Generates font-size classes (`.font1`, `.font-2`, `.font3\@lg`, etc). Same structure as `spacing`; values are in `em`.

```scss
font_size: (
  ratio: 1.067 1.1 1.12 1.2,
  neg_ratio: 1.067 1.1 1.12 1.2,
  max_step: 3,
  min_step: 2,
  base_positive: 1,
  base_negative: 1
);
```

### Modules

Set any module to `false` to exclude it from the compiled output entirely.

```scss
modules: (color: true, spacing: true, font_size: true);
```

### Colors

Generates `.color-*` and `.bg-*` utility classes. Tones are derived automatically from each hue's base color.

```scss
colors: (
  lighter_steps: 3,
  darker_steps: 2,

  hues: (
    slate: (
      base: #64748b,
      lighter_end: 95,
      darker_end: 5,
      lighter_sat_increase: 0,
      darker_sat_increase: 0,
    ),
  )
);
```

#### Global settings

| Key             | Description                                       |
| --------------- | ------------------------------------------------- |
| `lighter_steps` | Number of lighter tones generated above the base. |
| `darker_steps`  | Number of darker tones generated below the base.  |

#### Per-hue settings

| Key                    | Description                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `base`                 | The seed color. Hue is taken from here and held constant across all generated tones.                                             |
| `lighter_end`          | Target HSL lightness (0–100) of the lightest generated step. Equal steps are interpolated from the base lightness to this value. |
| `darker_end`           | Target HSL lightness (0–100) of the darkest generated step.                                                                      |
| `lighter_sat_increase` | Saturation added per lighter step, expressed as a multiplier of the base saturation. `0` leaves saturation unchanged.            |
| `darker_sat_increase`  | Same, for darker steps.                                                                                                          |

#### Generated class names

| Tone         | Class             |
| ------------ | ----------------- |
| `base`       | `.color-slate`    |
| Lighter (+1) | `.color-slate-1`  |
| Lighter (+2) | `.color-slate-2`  |
| Darker (−1)  | `.color-slate--1` |
| Darker (−2)  | `.color-slate--2` |

All color classes are also generated as background classes: `.bg-slate`, `.bg-slate-1`, etc. Every tone is available at every configured breakpoint: `.color-slate-1\@md`.

## Removing unused classes

fitcss outputs a class for every configured step, axis, and breakpoint combination. In production use [PurgeCSS](https://purgecss.com) to strip the classes that aren't referenced in your project.

```
npm install
npm run purge
```

`npm run purge` reads `purgecss.config.cjs` at the root. By default it scans `*.html` files alongside the compiled CSS. Point the `content` array at your own templates, components, or scripts before shipping:

```js
// purgecss.config.cjs
content: ['src/**/*.{html,js,jsx,ts,tsx,vue,svelte}'],
```

**A custom extractor is required.** fitcss uses characters that fall outside PurgeCSS's default regex:

| Character | Example class | Reason            |
| --------- | ------------- | ----------------- |
| `@`       | `.mt-1@sm`    | breakpoint suffix |
| `--`      | `.mt--1`      | negative step     |

The bundled config includes an extractor that handles both. If you write your own PurgeCSS config, copy the `extractors` block from `purgecss.config.cjs` or classes will be incorrectly purged.

## Preview

Generates a static HTML page rendering every class produced by your current `_config.scss`: colors, type scale, spacing, and box-shadow steps, grouped by breakpoint so you can check the scale visually.

```
npm start
```

This compiles `scss/fit.scss` (`build.js`), then reads `scss/_config.scss` and renders `preview.mustache` into `preview.html` (`preview.js`). Open `preview.html` in a browser to view it.

## Design Considerations

### Use tighter ratios on small screens, wider on large

A modular scale amplifies itself with every step. A ratio of `1.2` feels comfortable on a desktop where you have room for contrast, but on a small screen the jumps between steps become too large relative to the available space, large values get enormous and small values get cramped.

A good rule of thumb: start with a subtle ratio on mobile (`1.067` or `1.100`) and graduate upward as the viewport grows:

```
mobile  ->  1.067
tablet  ->  1.100
desktop ->  1.200
```

This is exactly what the per-breakpoint `ratio` list is designed for. The same class index produces a proportionally larger value on bigger screens without writing a single media query by hand.

#### Common ratio reference

Ratio names come from musical intervals:

| Name             | Ratio   |
| ---------------- | ------- |
| Minor second     | `1.067` |
| Major second     | `1.125` |
| Minor third      | `1.200` |
| Major third      | `1.250` |
| Perfect fourth   | `1.333` |
| Augmented fourth | `1.414` |
| Perfect fifth    | `1.500` |
| Golden ratio     | `1.6`   |
| Octave           | `2.000` |

### Use a tighter `neg_ratio` than `ratio`

The negative scale (steps below the base) governs sub-base font sizes and fine-grained spacing. These values are already small to begin with, so a wide ratio shrinks them toward zero very quickly a few steps in, the values become too small to be useful or readable.

Keep `neg_ratio` equal to or smaller than `ratio`. A practical approach: lock `neg_ratio` to the mobile ratio value regardless of breakpoint, or use a fixed value like `1.067` across the board. The positive scale can open up as the screen grows; the negative scale rarely needs to.

```scss
font_size: (
  ratio: 1.067 1.1 1.12 1.2,
  // expands with viewport
  neg_ratio: 1.067 1.067 1.067 1.067,
  // stays tight at every size
  ...
);
```

### Keep step counts modest

The number of usable steps is bounded by readability at the extremes. With a `base_positive` of `1em` and a ratio of `1.2`, step 5 is already `≈ 2.49em` and step 10 is `≈ 6.19em`. Similarly, step `-5` at `neg_ratio: 1.067` is `≈ 0.72em`, approaching the floor of legibility.

A range of `±5` steps is usually sufficient for font sizes. Spacing can afford more steps since there is no legibility floor, but past `±7` or so the extreme values rarely see use.

### Spacing and font scales don't need to match

Nothing requires the spacing ratio to equal the font-size ratio. Typography often benefits from a slightly wider ratio to create clear hierarchy, while spacing benefits from a tighter one to keep layout consistent across many element sizes.

### Boost saturation on light and dark tones to prevent washed-out colors

When a color is pushed toward very high or very low lightness, it naturally loses apparent strength — the hue becomes faint and the color looks grey or washed out.

`lighter_sat_increase` and `darker_sat_increase` compensate for this. Each is a multiplier applied against the base saturation per step, so the color gets progressively more saturated as it moves away from the base — counteracting the perceptual weakening.

```scss
slate: (
  base: #64748b,
  // saturation ≈ 14.5%
  lighter_end: 95,
  darker_end: 5,
  lighter_sat_increase: 0.3,
  // each lighter step adds 14.5% × 0.3 ≈ 4.3% saturation
  darker_sat_increase: 0.2
);
```

A value of `0` (the default) leaves saturation flat across all tones. Start with small values — `0.1` to `0.4` — and increase until the lightest and darkest tones feel like they belong to the same color family as the base.
