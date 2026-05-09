# React split-flap display

![NPM Version](https://img.shields.io/npm/v/%40daformat%2Freact-split-flap-display)
![NPM Downloads](https://img.shields.io/npm/dm/%40daformat%2Freact-split-flap-display)  
[![Follow daformat on GitHub](https://img.shields.io/github/followers/daformat?label=Follow%20%40daformat&style=social)](https://github.com/daformat)
[![Follow daformat on X](https://img.shields.io/twitter/follow/daformat?label=Follow%20%40daformat&style=social)](https://twitter.com/daformat)

A zero-dependency React component that renders an animated [split-flap display](https://en.wikipedia.org/wiki/Split-flap_display) — like the ones you'd see in old train stations and airports. Each character flips through its character set with a 3D rotation driven entirely by CSS, and the component itself is minimally unstyled so you can theme the flaps however you want.

## Features

- Zero runtime dependencies (just React `>= 18`)
- Pure-CSS 3D flip animation, hardware-accelerated
- Flips through every character between the previous and next value, like the real thing
- Per-slot character sets (perfect for clocks, score boards, alpha-numeric mixed displays, …)
- Automatic ellipsis when the value overflows the available slots
- Fires an optional callback when every slot has finished flipping
- Semi-headless: you bring the styles, the component handles the geometry
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

## Demo

https://hello-mat.com/design-engineering/component/split-flap-display

## Quick start

```tsx
import { useEffect, useState } from "react";
import { SplitFlapDisplay } from "@daformat/react-split-flap-display";
// see styles below
import styles from "./styles.module.css";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const WORDS = ["HELLO", "WORLD", "REACT", "FLIP"];

export const Demo = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % WORDS.length), 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <SplitFlapDisplay
      value={WORDS[index]}
      length={5}
      characters={CHARS}
      flipDuration={800}
      className={styles.split_flap_display}
    />
  );
};
```

The component is headless — it doesn't paint backgrounds, fonts or borders for you. See the [styling](#styling) section below for a starter stylesheet.

## Props

`SplitFlapDisplay` renders a `<div>` and accepts every standard `<div>` prop on top of the ones below.

| Prop                 | Type                              | Default                                 | Description                                                                                                                                                                                                                               |
| -------------------- | --------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`              | `string`                          | —                                       | The current value to display. Every character in `value` must belong to the corresponding character set, otherwise the component throws.                                                                                                  |
| `length`             | `number`                          | —                                       | The number of slots (characters) to render. Values shorter than `length` are right-padded with spaces. Values longer than `length` are truncated and the last slot becomes an ellipsis (`…`).                                             |
| `characters`         | `string \| string[]`              | —                                       | The set of characters each slot can flip through. Pass a single string to share the same set across every slot, or an array of length `length` to give each slot its own set. Each set must be non-empty and contain no duplicates.       |
| `onFullyFlipped`     | `() => void`                      | —                                       | Called when every slot has finished flipping to the current `value`. Useful for chaining transitions or syncing audio.                                                                                                                    |
| `crease`             | `number \| string`                | `1`                                     | Visual gap between the top and bottom flaps. A `number` is interpreted as pixels; a `string` is passed through verbatim (e.g. `"0.5rem"`).                                                                                                |
| `flipDuration`       | `number \| string`                | `800`                                   | Duration of the flip animation. A `number` is interpreted as milliseconds; a `string` is passed through verbatim (e.g. `"1s"`).                                                                                                           |
| `flipTimingFunction` | `string`                          | `"cubic-bezier(.550, .055, .675, .19)"` | CSS timing function for the flip animation. Defaults to an "ease-out cubic" curve that mimics the heavier feel of a real flap falling under gravity.                                                                                      |
| `style`              | `CSSProperties`                   | —                                       | Merged with the component's own inline style. Note that `--split-flap-crease`, `--split-flap-flip-duration` and `--split-flap-timing-function` are always applied last and will win over the same custom properties supplied via `style`. |
| `ref`                | `Ref<HTMLDivElement>`             | —                                       | Forwarded to the root `<div>`.                                                                                                                                                                                                            |
| `...props`           | `ComponentPropsWithoutRef<"div">` | —                                       | Any other standard `<div>` prop (`className`, `id`, `aria-*`, `data-*`, …).                                                                                                                                                               |

## Rendered structure & data attributes

The component renders a fairly minimal DOM tree. The data attributes are stable selectors you can use to target individual parts from your stylesheet.

```html
<div>                                       <!-- root, receives forwarded props/ref -->
  <span data-split-flap-slot="">            <!-- one per `length` -->
    <span data-split-flap-character=""      <!-- one per character in the set -->
          data-char="A"
          data-index="0">
      <span data-split-flap-flap="top">A</span>
      <span data-split-flap-flap="bottom">A</span>
    </span>
    <!-- … one character span per character in the set -->
  </span>
  <!-- … one slot per `length` -->
</div>
```

| Attribute                       | Where          | Description                                                                                                                                                           |
| ------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-split-flap-slot=""`       | Each slot      | Marks one of the `length` slots that make up the display.                                                                                                             |
| `data-split-flap-character=""`  | Each flap pair | Marks one possible character within a slot. The currently visible character is the one whose index matches `--split-flap-current-character-index` on its parent slot. |
| `data-char="X"`                 | Each flap pair | The character this flap pair represents.                                                                                                                              |
| `data-index="N"`                | Each flap pair | The 0-based index of the slot this character belongs to.                                                                                                              |
| `data-split-flap-flap="top"`    | Top flap       | The half that rotates from `0deg` down to `-90deg` while flipping.                                                                                                    |
| `data-split-flap-flap="bottom"` | Bottom flap    | The half that rotates from `90deg` up to `0deg` while flipping. Always `inert` and `aria-hidden`.                                                                     |

## CSS custom properties

The component exposes its animation state through CSS custom properties so you can style and theme the flaps from your own stylesheet without touching the component internals.

### Set on the root `<div>`

| Property                       | Set from                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------- |
| `--split-flap-crease`          | The `crease` prop. The visible gap between the top and bottom flaps.              |
| `--split-flap-flip-duration`   | The `flipDuration` prop. The duration of the flip animation.                      |
| `--split-flap-timing-function` | The `flipTimingFunction` prop. The timing function applied to the flip animation. |

### Set on each slot (`[data-split-flap-slot]`)

| Property                               | Description                                                                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--split-flap-current-character-index` | Index of the currently visible character within the slot's character set. Updated continuously while the slot animates through intermediate characters. |
| `--split-flap-total`                   | Total number of characters in the slot's character set.                                                                                                 |
| `--split-flap-turn`                    | Internal rotation counter. Reset every two turns to avoid Safari precision glitches and to prevent integer overflow on long-running displays.           |

### Set on each flap pair (`[data-split-flap-character]`)

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

The component intentionally ships mostly unstyled — it only sets the inline styles required for the 3D math. You're expected to style the slots and flaps yourself with regular CSS. Here's a starter stylesheet that gives you an airport board look:

Note: you will likely want to set `perspective: 550px;` (or any other value) and `transform-style: preserve-3d;` on the root `<div>

```css
.split_flap_display {
  --ease-out-cubic: cubic-bezier(0.215, 0.61, 0.355, 1);
  display: flex;
  font-size: 3.5em;
  gap: 2px; /* gap between characters */
  transition: transform 500ms var(--ease-out-cubic);

  [data-split-flap-character] {
    /* prevent elements from showing through the crease */
    &::after {
      background-color: var(--color-background);
      content: "";
      display: block;
      height: var(--split-flap-crease);
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 100%;
    }

    > [data-split-flap-flap] {
      background: var(--color-background);
      border-radius: 3px;
      box-shadow:
        inset 0 0 2px 0.75px var(--color-border-2),
        inset 0 0 0 1px var(--color-border-1);
      box-sizing: content-box;
      height: 0.5em;
      line-height: 1;
      width: 1em;

      /* Top flap - flips down */
      &[data-split-flap-flap="top"] {
        align-items: flex-start;
        padding-top: 0.25em;
      }

      /* Bottom flap - flips up */
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

<SplitFlapDisplay
  value={value}
  length={5}
  characters={["012", "0123456789", ":", "012345", "0123456789"]}
/>;
```

### Overflow with ellipsis

When `value.length > length`, the value is truncated and the last slot is replaced with an ellipsis (`…`). The ellipsis is automatically added to the last slot's character set so it's a valid character there.

```tsx
<SplitFlapDisplay
  value="DEPARTURES"
  length={6}
  characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ "
/>
// renders: D E P A R …
```

### Reacting when the flip finishes

```tsx
<SplitFlapDisplay
  value={value}
  length={8}
  characters={CHARS}
  onFullyFlipped={() => {
    // Every slot has settled on its final character.
    playClickSound();
  }}
/>
```

`onFullyFlipped` fires after every slot has finished animating to the current `value` — including slots that didn't move because their character was already correct.

## Browser support

Works in all evergreen browsers. The component contains a couple of small workarounds for Safari (a `translateZ(0.1px)` to fix a `backface-visibility` glitch during animation, and a turn-counter reset to dodge specific rotation values that cause Safari to blur).

## TypeScript

Types are bundled. The component's props extend `ComponentPropsWithoutRef<"div">`, so you can derive its prop type with `React.ComponentProps` and use it to type wrapper components.

```tsx
import { type ComponentProps } from "react";
import { SplitFlapDisplay } from "@daformat/react-split-flap-display";

type ScoreBoardProps = Omit<
  ComponentProps<typeof SplitFlapDisplay>,
  "characters" | "length"
>;

const ScoreBoard = (props: ScoreBoardProps) => (
  <SplitFlapDisplay {...props} length={4} characters="0123456789 " />
);
```

## License

[Zero-Clause BSD](./LICENSE) — do whatever you want with it.
