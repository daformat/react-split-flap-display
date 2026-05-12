# React split-flap display

![NPM Version](https://img.shields.io/npm/v/%40daformat%2Freact-split-flap-display)
![NPM Downloads](https://img.shields.io/npm/dm/%40daformat%2Freact-split-flap-display)  
[![Follow daformat on GitHub](https://img.shields.io/github/followers/daformat?label=Follow%20%40daformat&style=social)](https://github.com/daformat)
[![Follow daformat on X](https://img.shields.io/twitter/follow/daformat?label=Follow%20%40daformat&style=social)](https://twitter.com/daformat)

A zero-dependency React compound component that renders an animated [split-flap display](https://en.wikipedia.org/wiki/Split-flap_display), aka Solari board — like the ones you'd see in old train stations and airports. Each character flips through its character set with a 3D rotation driven entirely by CSS, and every layer (root, slot, character, flap) is exposed so you can replace any of them with your own markup.

## Demo

https://hello-mat.com/design-engineering/component/split-flap-display

## Features

- Zero runtime dependencies (just React `>= 18`)
- Pure-CSS 3D flip animation, hardware-accelerated
- Flips through every character between the previous and next value, like the real thing
- Per-slot character sets (perfect for clocks, score boards, alpha-numeric mixed displays, …)
- Automatic ellipsis when the value overflows the available slots
- Fires an optional callback when every slot has finished flipping
- **Compound, headless API**: drop-in by default, or compose `Root` / `Slot` / `Character` / `Flap` to plug in Tailwind, CSS modules, design system primitives, …
- Stable `data-*` selectors and CSS custom properties for styling without composition
- Ships with full TypeScript types

## Installation

```bash
npm install @daformat/react-split-flap-display
```

```bash
yarn add @daformat/react-split-flap-display
```

```bash
pnpm add @daformat/react-split-flap-display
```

```bash
bun add @daformat/react-split-flap-display
```

```bash
deno add npm:@daformat/react-split-flap-display
```

## Quick start

```tsx
import { useCallback, useRef, useState } from "react";
import { SplitFlapDisplay } from "@daformat/react-split-flap-display";
// see the styling section below
import styles from "./styles.module.css";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ";
const WORDS = ["HELLO", "WORLD", "REACT", "FLIP"];

export const Demo = () => {
  const [word, setWord] = useState<string>(WORDS[0] ?? "HELLO");
  const messageTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const next = useCallback(() => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    setWord((w) => WORDS[(WORDS.indexOf(w) + 1) % WORDS.length] ?? w);
  }, []);

  const handleFullyFlipped = useCallback(() => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    messageTimeoutRef.current = setTimeout(next, 5000);
  }, [next]);

  return (
    <SplitFlapDisplay.Root
      value={word}
      length={5}
      characters={CHARS}
      flipDuration={800}
      onFullyFlipped={handleFullyFlipped}
      className={styles.split_flap_display}
    />
  );
};
```

`SplitFlapDisplay.Root` is the only thing you need 99% of the time — it renders all four nested layers automatically. The `Slot`, `Character` and `Flap` exports exist for when you want to customise the inner markup; see the [Composition](#composition) section.

> **Note:** the component sets `transform-style: preserve-3d` inline on every layer, but you still need to set `perspective: 550px` (or any value) on a parent of `Root` for the 3D flip to be visible.

## API overview

The package exports a single namespace `SplitFlapDisplay` with four compound components:

```tsx
<SplitFlapDisplay.Root>
  <SplitFlapDisplay.Slot>
    <SplitFlapDisplay.Character>
      <SplitFlapDisplay.Flap position="top" />
      <SplitFlapDisplay.Flap position="bottom" />
    </SplitFlapDisplay.Character>
    {/* …one Character per character in the set */}
  </SplitFlapDisplay.Slot>
  {/* …one Slot per `length` */}
</SplitFlapDisplay.Root>
```

When you don't pass a `children` render-prop to a given level, that level renders the level below automatically. So all four of these are valid:

```tsx
// Fully default:
<SplitFlapDisplay.Root value="HI" length={2} characters="ABCDEFGHIJ " />

// Override the slot rendering only:
<SplitFlapDisplay.Root value="HI" length={2} characters="ABCDEFGHIJ ">
  {(index, characters, currentCharacter, onFullyFlipped) => (
    <SplitFlapDisplay.Slot
      key={index}
      index={index}
      characters={characters}
      currentCharacter={currentCharacter}
      onFullyFlipped={onFullyFlipped}
      className="my-slot"
    />
  )}
</SplitFlapDisplay.Root>

// Override the flap rendering for a custom crease overlay, etc.
// (full example in the Composition section below)
```

---

## `SplitFlapDisplay.Root`

The outermost wrapper. Owns the value, the length, the character set, and the flip timing. Renders a `<div>` and accepts every standard `<div>` prop.

| Prop                 | Type                                                | Default                              | Description                                                                                                                                                                                                                         |
| -------------------- | --------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`              | `string`                                            | —                                    | The current value to display. Every character must belong to the corresponding character set, otherwise the component throws. Pad with spaces if `value.length < length` and remember to include `" "` in `characters`.             |
| `length`             | `number`                                            | —                                    | The number of slots to render. Values shorter than `length` are right-padded with spaces; values longer than `length` are truncated and the last slot becomes an ellipsis (`…`).                                                    |
| `characters`         | `string \| string[]`                                | —                                    | The set of characters each slot can flip through. Pass a single string to share the same set across every slot, or an array of length `length` to give each slot its own set. Each set must be non-empty and contain no duplicates. |
| `onFullyFlipped`     | `() => void`                                        | —                                    | Fires exactly once after every slot has finished flipping to the current `value`. Fires again on the next value change. Useful for chaining transitions or syncing audio.                                                           |
| `crease`             | `number \| string`                                  | `1`                                  | Visual gap between the top and bottom flaps. A `number` is interpreted as pixels; a `string` is passed through verbatim (e.g. `"0.5rem"`). Exposed to CSS as `--split-flap-crease`.                                                 |
| `flipDuration`       | `number \| string`                                  | `800`                                | Duration of the flip animation. A `number` is interpreted as milliseconds; a `string` is passed through verbatim (e.g. `"1s"`). Exposed to CSS as `--split-flap-flip-duration`.                                                     |
| `flipTimingFunction` | `string`                                            | `"cubic-bezier(.215, .61, .355, 1)"` | CSS timing function for the flip animation. Exposed to CSS as `--split-flap-timing-function`.                                                                                                                                       |
| `children`           | render-prop, see below                              | —                                    | _Optional._ Take over slot rendering. When omitted, `Root` renders one `<SplitFlapDisplay.Slot>` per character of the (post-padding/truncation) display value.                                                                      |
| `style`              | `CSSProperties`                                     | —                                    | Merged with the component's own inline style. The component's CSS variables are applied last and will win over the same custom properties supplied via `style`.                                                                     |
| `ref`                | `Ref<HTMLDivElement>`                               | —                                    | Forwarded to the root `<div>`.                                                                                                                                                                                                      |
| `...props`           | `Omit<ComponentPropsWithoutRef<"div">, "children">` | —                                    | Any other standard `<div>` prop (`className`, `id`, `aria-*`, `data-*`, …).                                                                                                                                                         |

### `Root` `children` render-prop signature

```ts
(
  index: number, // 0-based slot index
  characters: string, // character set for this slot (with the ellipsis appended on the last slot when overflowing)
  currentCharacter: string, // the character this slot should currently be showing
  onFullyFlipped: (character: string, index: number) => void, // pass this through to your <Slot>
) => ReactNode;
```

Capture `currentCharacter` from this closure if you need to forward it deeper (it isn't re-emitted by `Slot.children`).

---

## `SplitFlapDisplay.Slot`

A single slot in the display: renders one `<span data-split-flap-slot="">` containing every possible character in the slot's character set, only one of which is "current" at a time. Forwards every standard `<span>` prop to the root span.

| Prop               | Type                                                 | Description                                                                                                                                                                        |
| ------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index`            | `number`                                             | The slot's position in the display. Used as the slot's identity by the `onFullyFlipped` bookkeeping in `Root`.                                                                     |
| `characters`       | `string`                                             | The character set this slot can flip through. Must be non-empty, no duplicates, and must contain `currentCharacter`.                                                               |
| `currentCharacter` | `string`                                             | The character this slot should currently be showing. Changing this triggers the flip animation through every character in between.                                                 |
| `onFullyFlipped`   | `(character: string, index: number) => void`         | _Optional._ Called after this slot has settled on `currentCharacter`. When you compose under `Root`, just pass through the `onFullyFlipped` you receive from `Root`'s render-prop. |
| `children`         | `(character: string, index: number) => ReactNode`    | _Optional._ Take over character rendering. Called once per character in the set. When omitted, `Slot` renders one `<SplitFlapDisplay.Character>` per character.                    |
| `style`            | `CSSProperties`                                      | Merged with the component's own inline style.                                                                                                                                      |
| `ref`              | `Ref<HTMLSpanElement>`                               | Forwarded to the slot `<span>`.                                                                                                                                                    |
| `...props`         | `Omit<ComponentPropsWithoutRef<"span">, "children">` | Any other standard `<span>` prop.                                                                                                                                                  |

`Slot` owns the slot-level CSS variables (`--split-flap-current-character-index`, `--split-flap-total`, `--split-flap-turn`) and is the element you'll most often style with a `className`.

---

## `SplitFlapDisplay.Character`

One possible character within a slot: renders one `<span data-split-flap-character="" data-char="X">` containing the two rotating flaps. Every character in the set is rendered, the non-current ones are positioned in 3D space behind/ahead of the current one. Forwards every standard `<span>` prop.

| Prop               | Type                                                 | Description                                                                                                                                                                                                                 |
| ------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index`            | `number`                                             | The character's position within the slot's character set.                                                                                                                                                                   |
| `character`        | `string`                                             | The character this `Character` represents (a single grapheme).                                                                                                                                                              |
| `currentCharacter` | `string`                                             | The character the slot is currently showing. Used to compute whether this `Character` is the active one. The active character has its `inert` attribute removed; all others get `inert={true}`.                             |
| `children`         | `(character: string) => ReactNode`                   | _Optional._ Take over flap rendering. Receives `character`, returns the two flaps (and any extra layers, like a crease overlay). When omitted, `Character` renders `<Flap position="top">` then `<Flap position="bottom">`. |
| `style`            | `CSSProperties`                                      | Merged with the component's own inline style.                                                                                                                                                                               |
| `ref`              | `Ref<HTMLSpanElement>`                               | Forwarded to the character `<span>`.                                                                                                                                                                                        |
| `...props`         | `Omit<ComponentPropsWithoutRef<"span">, "children">` | Any other standard `<span>` prop.                                                                                                                                                                                           |

`Character` owns the math-heavy per-flap CSS variables (`--split-flap-offset`, `--split-flap-direction`, `--split-flap-top-flap-angle`, `--split-flap-bottom-flap-angle`, …) — see [CSS custom properties](#css-custom-properties).

---

## `SplitFlapDisplay.Flap`

A single half of a flap pair: renders one `<span data-split-flap-flap="top|bottom">` that rotates around its top or bottom edge. Forwards every standard `<span>` prop.

| Prop        | Type                               | Description                                                                                                                               |
| ----------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `character` | `string`                           | The character this flap displays.                                                                                                         |
| `position`  | `"top" \| "bottom"`                | Which half of the flap pair this is. The `bottom` flap is automatically `aria-hidden` and `inert` — it's a visual mirror of the top flap. |
| `style`     | `CSSProperties`                    | Merged with the component's own inline style.                                                                                             |
| `ref`       | `Ref<HTMLSpanElement>`             | Forwarded to the flap `<span>`.                                                                                                           |
| `...props`  | `ComponentPropsWithoutRef<"span">` | Any other standard `<span>` prop (`className`, etc.).                                                                                     |

---

## Composition (tailwind example)

The render-prop slots let you swap any layer for your own markup. Common reasons:

- **Tailwind / utility-class styling** — `className` on `Slot` / `Character` / `Flap` works without any descendant selectors.
- **Adding extra elements** — e.g. a real `<span>` for the crease overlay instead of an `::after` pseudo-element (Tailwind doesn't compose well with pseudo-elements).
- **Skipping the default flap markup entirely** — wrap each character in your own design-system primitive.

Here's the same airport-board look as the [styling](#styling) example, written entirely with Tailwind utility classes and composition. Note the `<span aria-hidden>` between the two flaps that replaces the `::after` mask.

```tsx
import { useCallback, useRef, useState } from "react";
import { SplitFlapDisplay } from "@daformat/react-split-flap-display";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ";
const WORDS = ["HELLO", "WORLD", "REACT", "FLIP"];

const FLAP =
  "bg-[#feefe7] box-content h-[0.5em] w-[1em] leading-none rounded-[3px] " +
  "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]";

export const Demo = () => {
  const [word, setWord] = useState<string>(WORDS[0] ?? "HELLO");
  const messageTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const next = useCallback(() => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    setWord((w) => WORDS[(WORDS.indexOf(w) + 1) % WORDS.length] ?? w);
  }, []);

  const handleFullyFlipped = useCallback(() => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    messageTimeoutRef.current = setTimeout(next, 5000);
  }, [next]);

  return (
    <SplitFlapDisplay.Root
      value={word}
      length={5}
      characters={CHARS}
      flipDuration={800}
      onFullyFlipped={handleFullyFlipped}
      className="flex gap-[2px] text-[3.5em] [filter:drop-shadow(0_1px_12px_rgba(102,27,33,0.05))]"
    >
      {(index, characters, currentCharacter, onFullyFlipped) => (
        <SplitFlapDisplay.Slot
          key={index}
          index={index}
          characters={characters}
          currentCharacter={currentCharacter}
          onFullyFlipped={onFullyFlipped}
        >
          {(character, characterIndex) => (
            <SplitFlapDisplay.Character
              key={character}
              index={characterIndex}
              character={character}
              currentCharacter={currentCharacter}
            >
              {(c) => (
                <>
                  <SplitFlapDisplay.Flap
                    character={c}
                    position="top"
                    className={`${FLAP} items-start pt-[0.25em]`}
                  />
                  {/*
                    A real <span> instead of an ::after pseudo-element so
                    Tailwind users don't need arbitrary after:* variants.
                    Masks the gap between the two flaps so nothing shows
                    through the crease during the flip.
                  */}
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-[#feefe7]"
                    style={{ height: "var(--split-flap-crease)" }}
                  />
                  <SplitFlapDisplay.Flap
                    character={c}
                    position="bottom"
                    className={`${FLAP} items-end pb-[0.25em]`}
                  />
                </>
              )}
            </SplitFlapDisplay.Character>
          )}
        </SplitFlapDisplay.Slot>
      )}
    </SplitFlapDisplay.Root>
  );
};
```

A few things to know:

- `currentCharacter` is **not** re-emitted by `Slot.children` or `Character.children`, but it doesn't have to be — you have it in scope from `Root`'s render-prop and pass it down explicitly.
- `onFullyFlipped` from `Root`'s render-prop is the per-slot reporter. Pass it straight to `Slot` as its own `onFullyFlipped` prop. `Root` already dedupes per slot index and fires its own `onFullyFlipped` prop exactly once per value change.
- You're free to compose only the levels you care about. If you only need to style `Slot` with a class, you don't need to render `Character` or `Flap` yourself — the default rendering handles them.

---

## Rendered structure & data attributes

The component renders a fairly minimal DOM tree. The data attributes are stable selectors you can use to target individual parts from your stylesheet.

```html
<div>                                       <!-- Root -->
  <span data-split-flap-slot="">            <!-- Slot, one per `length` -->
    <span data-split-flap-character=""      <!-- Character, one per character in the set -->
          data-char="A">
      <span data-split-flap-flap="top">A</span>     <!-- Flap position="top" -->
      <span data-split-flap-flap="bottom">A</span>  <!-- Flap position="bottom" -->
    </span>
    <!-- … one Character span per character in the set -->
  </span>
  <!-- … one Slot per `length` -->
</div>
```

| Attribute                       | Where            | Description                                                                                                                                                           |
| ------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-split-flap-slot=""`       | Each `Slot`      | Marks one of the `length` slots that make up the display.                                                                                                             |
| `data-split-flap-character=""`  | Each `Character` | Marks one possible character within a slot. The currently visible character is the one whose index matches `--split-flap-current-character-index` on its parent slot. |
| `data-char="X"`                 | Each `Character` | The character this `Character` represents.                                                                                                                            |
| `data-split-flap-flap="top"`    | Top `Flap`       | The half that rotates from `0deg` down to `-90deg` while flipping.                                                                                                    |
| `data-split-flap-flap="bottom"` | Bottom `Flap`    | The half that rotates from `90deg` up to `0deg` while flipping. Always `inert` and `aria-hidden`.                                                                     |

## CSS custom properties

The component exposes its animation state through CSS custom properties so you can style and theme the flaps from your own stylesheet without touching the component internals.

### Set on `Root` (`<div>`)

| Property                       | Set from                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------- |
| `--split-flap-crease`          | The `crease` prop. The visible gap between the top and bottom flaps.              |
| `--split-flap-flip-duration`   | The `flipDuration` prop. The duration of the flip animation.                      |
| `--split-flap-timing-function` | The `flipTimingFunction` prop. The timing function applied to the flip animation. |

### Set on each `Slot` (`[data-split-flap-slot]`)

| Property                               | Description                                                                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--split-flap-current-character-index` | Index of the currently visible character within the slot's character set. Updated continuously while the slot animates through intermediate characters. |
| `--split-flap-total`                   | Total number of characters in the slot's character set.                                                                                                 |
| `--split-flap-turn`                    | Internal rotation counter. Reset every two turns to avoid Safari precision glitches and to prevent integer overflow on long-running displays.           |

### Set on each `Character` (`[data-split-flap-character]`)

These are mostly internal — you generally don't need to read or override them, but they're documented because they're computed and visible in dev tools.

| Property                         | Description                                                                                         |
| -------------------------------- | --------------------------------------------------------------------------------------------------- |
| `--split-flap-index`             | The character's index within the slot's character set.                                              |
| `--split-flap-offset`            | Signed distance from the current character (`index − current`).                                     |
| `--split-flap-direction`         | `1` if this character is ahead of the current one, `-1` if behind, `0` if it is the current one.    |
| `--split-flap-is-current`        | `1` for the visible character, `0` otherwise. Useful for selectively styling the current flap pair. |
| `--split-flap-is-previous`       | `1` for the character right before the current one, `0` otherwise.                                  |
| `--split-flap-is-next`           | `1` for the character right after the current one, `0` otherwise.                                   |
| `--split-flap-top-flap-angle`    | The `rotateX` angle currently applied to the top flap.                                              |
| `--split-flap-bottom-flap-angle` | The `rotateX` angle currently applied to the bottom flap.                                           |

## Styling

Two ways to style the display:

1. **Default rendering + `data-*` selectors** — easiest with vanilla CSS / CSS modules / SCSS. Drop a class on `Root` and target the inner pieces by attribute. This is what the example below does.
2. **[Composition](#composition)** — pass `className` directly to `Slot`, `Character`, `Flap` from `Root`'s render-prop. Easier with utility-class frameworks like Tailwind, and required if you need to add extra DOM (like a real-element crease overlay).

> **Note:** the component already sets `transform-style: preserve-3d` on `Root`, `Slot` and `Character`, but you still need to set `perspective` on a parent element of `Root` for the 3D flip to actually be visible.

```css
.split_flap_display {
  display: flex;
  font-size: 3.5em;
  gap: 2px;
  filter: drop-shadow(0 1px 12px rgba(102, 27, 33, 0.05));

  [data-split-flap-character] {
    /* prevent things from showing through the crease during the flip */
    &::after {
      background-color: #feefe7;
      content: "";
      display: block;
      /* this variable is set by the component */
      height: var(--split-flap-crease);
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 100%;
    }

    > [data-split-flap-flap] {
      background: #feefe7;
      border-radius: 3px;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.6);
      box-sizing: content-box;
      height: 0.5em;
      line-height: 1;
      width: 1em;

      &[data-split-flap-flap="top"] {
        align-items: flex-start;
        padding-top: 0.25em;
      }

      &[data-split-flap-flap="bottom"] {
        align-items: flex-end;
        padding-bottom: 0.25em;
      }
    }
  }
}
```

## Examples

### Per-slot character sets (clock)

Pass an array of strings to give each slot its own character set. This is much more efficient than using one big set everywhere because each slot only needs to flip through the characters it can actually show.

```tsx
const time = new Date();
const value =
  String(time.getHours()).padStart(2, "0") +
  ":" +
  String(time.getMinutes()).padStart(2, "0");

<SplitFlapDisplay.Root
  value={value}
  length={5}
  characters={["012", "0123456789", ":", "012345", "0123456789"]}
/>;
```

### Overflow with ellipsis

When `value.length > length`, the value is truncated and the last slot is replaced with an ellipsis (`…`). The ellipsis is automatically added to the last slot's character set so it's a valid character there.

```tsx
<SplitFlapDisplay.Root
  value="DEPARTURES"
  length={6}
  characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ "
/>
// renders: D E P A R …
```

### Reacting when the flip finishes

```tsx
<SplitFlapDisplay.Root
  value={value}
  length={8}
  characters={CHARS}
  onFullyFlipped={() => {
    // Every slot has settled on its final character.
    playClickSound();
  }}
/>
```

`onFullyFlipped` fires exactly once per value change after every slot has finished animating to the current `value` — including slots that didn't move because their character was already correct.

## Browser support

Works in all evergreen browsers. The component contains a couple of small workarounds for Safari (a `translateZ(0.1px)` to fix a `backface-visibility` glitch during animation, and a turn-counter reset to dodge specific rotation values that cause Safari to blur).

## TypeScript

Types are bundled. The package re-exports a prop type per compound component:

```ts
import {
  SplitFlapDisplay,
  type SplitFlapDisplayRootProps,
  type SplitFlapDisplaySlotProps,
  type SplitFlapDisplayCharacterProps,
  type SplitFlapDisplayFlapProps,
} from "@daformat/react-split-flap-display";
```

Each prop type extends `Omit<ComponentPropsWithoutRef<...>, "children">` plus the component-specific props, so you can derive wrapper types directly:

```tsx
import {
  SplitFlapDisplay,
  type SplitFlapDisplayRootProps,
} from "@daformat/react-split-flap-display";

type ScoreBoardProps = Omit<SplitFlapDisplayRootProps, "characters" | "length">;

const ScoreBoard = (props: ScoreBoardProps) => (
  <SplitFlapDisplay.Root {...props} length={4} characters="0123456789 " />
);
```

## License

[Zero-Clause BSD](./LICENSE) — do whatever you want with it.
