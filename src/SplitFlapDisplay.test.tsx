import { act, render } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SplitFlapDisplay } from "./SplitFlapDisplay.js";

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ";

const getSlots = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>("[data-split-flap-slot]"));

const getSlotChars = (slot: HTMLElement) =>
  Array.from(slot.querySelectorAll<HTMLElement>("[data-split-flap-character]"));

// The component conveys the "current" character of each slot through the
// `--split-flap-current-character-index` CSS custom property; reading that
// custom property is the most reliable way to know what's being shown without
// relying on internals of the flip animation.
const getActiveChar = (slot: HTMLElement) => {
  const idx = parseInt(
    slot.style.getPropertyValue("--split-flap-current-character-index"),
    10,
  );
  if (Number.isNaN(idx)) {
    return undefined;
  }
  return getSlotChars(slot)[idx]?.dataset.char;
};

describe("SplitFlapDisplay", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("rendering", () => {
    it("renders one slot per `length` and exposes each character", () => {
      const { container } = render(
        <SplitFlapDisplay.Root value="HELLO" length={5} characters={ALPHA} />,
      );
      const slots = getSlots(container);
      expect(slots).toHaveLength(5);
      expect(slots.map(getActiveChar)).toEqual(["H", "E", "L", "L", "O"]);
    });

    it("pads the value with trailing spaces when shorter than `length`", () => {
      const { container } = render(
        <SplitFlapDisplay.Root value="HI" length={5} characters={ALPHA} />,
      );
      expect(getSlots(container).map(getActiveChar)).toEqual([
        "H",
        "I",
        " ",
        " ",
        " ",
      ]);
    });

    it("truncates with an ellipsis when the value overflows `length`", () => {
      const { container } = render(
        <SplitFlapDisplay.Root
          value="HELLO WORLD"
          length={5}
          characters={ALPHA}
        />,
      );
      const slots = getSlots(container);
      expect(slots.map(getActiveChar)).toEqual(["H", "E", "L", "L", "…"]);
      const lastSlotChars = getSlotChars(slots[4]!).map((n) => n.dataset.char);
      expect(lastSlotChars).toContain("…");
      const firstSlotChars = getSlotChars(slots[0]!).map((n) => n.dataset.char);
      expect(firstSlotChars).not.toContain("…");
    });

    it("renders one flap per character of the character set per slot", () => {
      const characters = "AB ";
      const { container } = render(
        <SplitFlapDisplay.Root value="A" length={1} characters={characters} />,
      );
      const slots = getSlots(container);
      expect(slots).toHaveLength(1);
      expect(getSlotChars(slots[0]!)).toHaveLength(characters.length);
    });

    it("supports a per-slot character set when `characters` is an array", () => {
      const perSlot = ["AB", "12"];
      const { container } = render(
        <SplitFlapDisplay.Root value="A1" length={2} characters={perSlot} />,
      );
      const slots = getSlots(container);
      expect(getSlotChars(slots[0]!).map((n) => n.dataset.char)).toEqual([
        "A",
        "B",
      ]);
      expect(getSlotChars(slots[1]!).map((n) => n.dataset.char)).toEqual([
        "1",
        "2",
      ]);
      expect(slots.map(getActiveChar)).toEqual(["A", "1"]);
    });

    it("renders both a top and bottom flap for every character", () => {
      const { container } = render(
        <SplitFlapDisplay.Root value="A" length={1} characters="AB" />,
      );
      const slot = getSlots(container)[0]!;
      const chars = getSlotChars(slot);
      chars.forEach((char) => {
        expect(
          char.querySelector("[data-split-flap-flap='top']"),
        ).not.toBeNull();
        expect(
          char.querySelector("[data-split-flap-flap='bottom']"),
        ).not.toBeNull();
      });
    });
  });

  describe("style props", () => {
    it("applies CSS variables for crease, flip duration and timing function", () => {
      const { container } = render(
        <SplitFlapDisplay.Root
          value="A"
          length={1}
          characters="A"
          crease={4}
          flipDuration={500}
          flipTimingFunction="linear"
        />,
      );
      const root = container.firstChild as HTMLElement;
      expect(root.style.getPropertyValue("--split-flap-crease")).toBe("4px");
      expect(root.style.getPropertyValue("--split-flap-flip-duration")).toBe(
        "500ms",
      );
      expect(root.style.getPropertyValue("--split-flap-timing-function")).toBe(
        "linear",
      );
    });

    it("passes through string values for crease and flip duration verbatim", () => {
      const { container } = render(
        <SplitFlapDisplay.Root
          value="A"
          length={1}
          characters="A"
          crease="0.5rem"
          flipDuration="1s"
        />,
      );
      const root = container.firstChild as HTMLElement;
      expect(root.style.getPropertyValue("--split-flap-crease")).toBe("0.5rem");
      expect(root.style.getPropertyValue("--split-flap-flip-duration")).toBe(
        "1s",
      );
    });

    it("uses sensible defaults for crease, flip duration and timing function", () => {
      const { container } = render(
        <SplitFlapDisplay.Root value="A" length={1} characters="A" />,
      );
      const root = container.firstChild as HTMLElement;
      expect(root.style.getPropertyValue("--split-flap-crease")).toBe("1px");
      expect(root.style.getPropertyValue("--split-flap-flip-duration")).toBe(
        "800ms",
      );
      expect(root.style.getPropertyValue("--split-flap-timing-function")).toBe(
        "cubic-bezier(.215, .61, .355, 1)",
      );
    });

    it("merges user-provided `style` with the component's own style", () => {
      const { container } = render(
        <SplitFlapDisplay.Root
          value="A"
          length={1}
          characters="A"
          style={{ color: "red", background: "blue" }}
        />,
      );
      const root = container.firstChild as HTMLElement;
      expect(root.style.color).toBe("red");
      expect(root.style.background).toBe("blue");
      expect(root.style.getPropertyValue("--split-flap-crease")).toBe("1px");
    });
  });

  describe("forwarded props and ref", () => {
    it("forwards arbitrary props to the root <div>", () => {
      const { container } = render(
        <SplitFlapDisplay.Root
          value="A"
          length={1}
          characters="A"
          className="my-display"
          id="display-1"
          data-testid="root"
          aria-label="split flap"
        />,
      );
      const root = container.firstChild as HTMLElement;
      expect(root.tagName).toBe("DIV");
      expect(root).toHaveClass("my-display");
      expect(root).toHaveAttribute("id", "display-1");
      expect(root).toHaveAttribute("data-testid", "root");
      expect(root).toHaveAttribute("aria-label", "split flap");
    });

    it("forwards the ref to the root <div>", () => {
      const ref = createRef<HTMLDivElement>();
      render(
        <SplitFlapDisplay.Root ref={ref} value="A" length={1} characters="A" />,
      );
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe("character set validation", () => {
    it("throws when `characters` is an empty string", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() =>
        render(<SplitFlapDisplay.Root value="" length={1} characters="" />),
      ).toThrow(/non empty string/);
      spy.mockRestore();
    });

    it("throws when one of the per-slot character sets is empty", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() =>
        render(
          <SplitFlapDisplay.Root
            value="A "
            length={2}
            characters={["A", ""]}
          />,
        ),
      ).toThrow(/non empty string/);
      spy.mockRestore();
    });

    it("throws and reports the duplicates when a character set repeats characters", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() =>
        render(
          <SplitFlapDisplay.Root value="A" length={1} characters="AABC" />,
        ),
      ).toThrow(/duplicate.*A/);
      spy.mockRestore();
    });

    it("throws when the value contains a character not in the character set", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      expect(() =>
        render(<SplitFlapDisplay.Root value="Z" length={1} characters="AB" />),
      ).toThrow(/Character "Z" is not in character set "AB"/);
      spy.mockRestore();
    });
  });

  describe("behaviour over time", () => {
    it("invokes onFullyFlipped after the initial mount has settled", async () => {
      const onFullyFlipped = vi.fn();
      render(
        <SplitFlapDisplay.Root
          value="HI"
          length={2}
          characters={ALPHA}
          onFullyFlipped={onFullyFlipped}
        />,
      );
      // Flush rAF + setTimeout(0) callbacks queued during mount.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
        await new Promise((resolve) =>
          requestAnimationFrame(() => resolve(undefined)),
        );
      });
      expect(onFullyFlipped).toHaveBeenCalled();
    });

    it("re-renders to the same value without throwing", () => {
      const { rerender } = render(
        <SplitFlapDisplay.Root value="HI" length={2} characters={ALPHA} />,
      );
      expect(() =>
        rerender(
          <SplitFlapDisplay.Root value="HI" length={2} characters={ALPHA} />,
        ),
      ).not.toThrow();
    });

    it("eventually shows the new value after the value prop changes", async () => {
      const { container, rerender } = render(
        <SplitFlapDisplay.Root value="A" length={1} characters="ABC" />,
      );
      expect(getActiveChar(getSlots(container)[0]!)).toBe("A");

      rerender(<SplitFlapDisplay.Root value="C" length={1} characters="ABC" />);

      // The flip animation is driven by setTimeout/requestAnimationFrame, so
      // give those a chance to run before asserting on the final character.
      await act(async () => {
        for (let i = 0; i < 5; i++) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      });

      expect(getActiveChar(getSlots(container)[0]!)).toBe("C");
    });

    it("calls onFullyFlipped at most once per value change", async () => {
      const flushAsyncCallbacks = () =>
        act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
          await new Promise((resolve) =>
            requestAnimationFrame(() => resolve(undefined)),
          );
        });

      const onFullyFlipped = vi.fn();
      const { rerender } = render(
        <SplitFlapDisplay.Root
          value="HI"
          length={2}
          characters={ALPHA}
          onFullyFlipped={onFullyFlipped}
        />,
      );
      await flushAsyncCallbacks();
      expect(onFullyFlipped).toHaveBeenCalledTimes(1);

      // Re-rendering with the same value should not produce extra calls,
      // even though children still ping the parent on every render.
      for (let i = 0; i < 3; i++) {
        rerender(
          <SplitFlapDisplay.Root
            value="HI"
            length={2}
            characters={ALPHA}
            onFullyFlipped={onFullyFlipped}
          />,
        );
        await flushAsyncCallbacks();
      }
      expect(onFullyFlipped).toHaveBeenCalledTimes(1);
    });

    it("fires onFullyFlipped again the next time the value changes", async () => {
      const onFullyFlipped = vi.fn();
      const { rerender } = render(
        <SplitFlapDisplay.Root
          value="A"
          length={1}
          characters="ABC"
          onFullyFlipped={onFullyFlipped}
        />,
      );
      await act(async () => {
        for (let i = 0; i < 5; i++) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      });
      const callsAfterMount = onFullyFlipped.mock.calls.length;

      rerender(
        <SplitFlapDisplay.Root
          value="C"
          length={1}
          characters="ABC"
          onFullyFlipped={onFullyFlipped}
        />,
      );
      await act(async () => {
        for (let i = 0; i < 5; i++) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      });

      expect(onFullyFlipped.mock.calls.length).toBeGreaterThan(callsAfterMount);
    });

    it("does not invalidate handleFullyFlipped when only the onFullyFlipped prop identity changes", () => {
      // If handleFullyFlipped's identity is unstable, the child animation
      // effect (which has it in its dep array) would re-run on every parent
      // render, restarting the flip from scratch. We assert that the slot's
      // animation state survives a parent re-render with a fresh callback.
      const { container, rerender } = render(
        <SplitFlapDisplay.Root
          value="A"
          length={1}
          characters="ABC"
          onFullyFlipped={() => {}}
        />,
      );
      const slot = getSlots(container)[0]!;
      expect(getActiveChar(slot)).toBe("A");

      rerender(
        <SplitFlapDisplay.Root
          value="A"
          length={1}
          characters="ABC"
          onFullyFlipped={() => {}}
        />,
      );

      // Same DOM node, still showing "A" — no remount/restart triggered.
      expect(getSlots(container)[0]).toBe(slot);
      expect(getActiveChar(slot)).toBe("A");
    });
  });
});
