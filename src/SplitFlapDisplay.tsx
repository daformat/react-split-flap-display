import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ForwardedRef,
  forwardRef,
  memo,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";

/**
 * Combines the given refs into a single ref
 */
const combineRefs = <T,>(
  ...refs: (ForwardedRef<T> | RefObject<T> | undefined)[]
): ((node: T | null) => void) => {
  return (node) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(node);
      } else if (ref != null) {
        (ref as { current: T | null }).current = node;
      }
    });
  };
};

export type SplitFlapDisplayRootProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> & {
  // current value to display
  value: string;
  // number of characters to display, including the ellipsis if the value overflows
  length: number;
  // characters to include in the display, can be a string or an array of strings representing each slot's characters
  characters: string | string[];
  // callback that will be run when all characters are flipped
  onFullyFlipped?: () => void;
  // css length of the crease between top and bottom flaps, in pixels if crease is a number
  crease?: number | string;
  // css duration of the flip animation, in ms if flipDuration is a number
  flipDuration?: number | string;
  // css timing function for the flip animation defaults to ease-out-cubic (cubic-bezier(.215, .61, .355, 1))
  flipTimingFunction?: string;
  // optional render-prop to take over slot rendering for composition
  children?: (
    index: number,
    characters: string,
    currentCharacter: string,
    onFullyFlipped: (character: string, index: number) => void,
  ) => ReactNode;
};

const SplitFlapDisplayRoot = memo(
  forwardRef<HTMLDivElement, SplitFlapDisplayRootProps>(
    (
      {
        value,
        length,
        characters,
        onFullyFlipped,
        crease = 1,
        flipDuration = 800,
        flipTimingFunction = "cubic-bezier(.215, .61, .355, 1)",
        style,
        children,
        ...props
      },
      ref,
    ) => {
      const isOverflowing = value.length > length;
      const displayValue = (
        isOverflowing ? value.slice(0, length - 1) + "…" : value
      ).padEnd(length, " ");

      // Stabilize callback identity
      const onFullyFlippedRef = useRef(onFullyFlipped);
      useLayoutEffect(() => {
        onFullyFlippedRef.current = onFullyFlipped;
      }, [onFullyFlipped]);

      // Track which slots have reported "settled" since the current
      // displayValue was committed. A Set dedupes naturally, so it doesn't
      // matter if a slot reports more than once (mount path, unchanged path,
      // animation-complete path, Strict Mode double effects...).
      const settledSlotsRef = useRef<Set<number>>(new Set());
      const firedForRef = useRef<string | null>(null);

      useLayoutEffect(() => {
        settledSlotsRef.current = new Set();
        firedForRef.current = null;
      }, [displayValue, length]);

      const validateCharacters = () => {
        const chars = characters instanceof Array ? characters : [characters];
        const isInvalid = chars.some((chars) => !chars.length);
        if (isInvalid) {
          throw new Error(
            "SplitFlapDisplay: characters must be a non empty string, or an array of non empty strings",
          );
        }
        const withDuplicateChars = chars.filter(
          (charSet) => charSet.length !== new Set(charSet).size,
        );
        if (withDuplicateChars.length) {
          throw new Error(
            `SplitFlapDisplay: all characters in each character set must be unique; found duplicates in ${withDuplicateChars
              .map((set) => {
                const duplicates: string[] = [];
                const seen = new Set<string>();
                set.split("").forEach((char) => {
                  if (seen.has(char)) {
                    duplicates.push(char);
                  }
                  seen.add(char);
                });
                return `${set} (duplicate${
                  duplicates.length > 1 ? "s" : ""
                }: ${duplicates.join(", ")})`;
              })
              .join(" - ")}`,
          );
        }
      };
      validateCharacters();

      const handleFullyFlipped = useCallback(
        (_char: string, index: number) => {
          if (firedForRef.current === displayValue) {
            return;
          }
          settledSlotsRef.current.add(index);
          if (settledSlotsRef.current.size === length) {
            firedForRef.current = displayValue;
            onFullyFlippedRef.current?.();
          }
        },
        [displayValue, length],
      );

      return (
        <div
          ref={ref}
          style={
            {
              transformStyle: "preserve-3d",
              ...style,
              "--split-flap-crease":
                typeof crease === "number" ? `${crease}px` : crease,
              "--split-flap-flip-duration":
                typeof flipDuration === "number"
                  ? `${flipDuration}ms`
                  : flipDuration,
              "--split-flap-timing-function": flipTimingFunction,
            } as CSSProperties
          }
          {...props}
        >
          {displayValue.split("").map((char, i) => {
            const chars =
              characters instanceof Array ? characters[i] : characters;
            const finalCharacters =
              chars + (isOverflowing && i === length - 1 ? "…" : "");
            return typeof children === "function" ? (
              children(i, finalCharacters, char, handleFullyFlipped)
            ) : (
              <SplitFlapDisplaySlot
                key={i}
                index={i}
                characters={finalCharacters}
                currentCharacter={char}
                onFullyFlipped={handleFullyFlipped}
              />
            );
          })}
        </div>
      );
    },
  ),
);

SplitFlapDisplayRoot.displayName = "SplitFlapDisplay.Root";

export type SplitFlapDisplaySlotProps = Omit<
  ComponentPropsWithoutRef<"span">,
  "children"
> & {
  index: number;
  characters: string;
  currentCharacter: string;
  onFullyFlipped?: (char: string, index: number) => void;
  // optional render-prop to take over character rendering for composition
  children?: (character: string, index: number) => ReactNode;
};

const SplitFlapDisplaySlot = memo(
  forwardRef<HTMLSpanElement, SplitFlapDisplaySlotProps>(
    (
      {
        currentCharacter,
        index,
        characters,
        onFullyFlipped,
        children,
        style,
        ...props
      },
      ref,
    ) => {
      const lastValueRef = useRef<string>("");
      const turnRef = useRef<number>(0);
      const slotRef = useRef<HTMLDivElement>(null);
      const isMountedRef = useRef(false);
      const flippingThroughTimeout =
        useRef<ReturnType<typeof setTimeout>>(undefined);
      const currentCharacterIndex = characters.indexOf(currentCharacter);

      if (characters.indexOf(currentCharacter) === -1) {
        throw new Error(
          `Character "${currentCharacter}" is not in character set "${characters}"`,
        );
      }

      useEffect(() => {
        isMountedRef.current = true;
      }, []);

      useLayoutEffect(() => {
        if (currentCharacter === lastValueRef.current) {
          setTimeout(() => {
            onFullyFlipped?.(currentCharacter, index);
          });
        }
      });

      useLayoutEffect(() => {
        const newCharIndex = characters.indexOf(currentCharacter);
        const lastCharIndex = characters.indexOf(lastValueRef.current);
        const isGoingBackwards = newCharIndex < lastCharIndex;
        const isGoingForwards = newCharIndex > lastCharIndex;

        if (!isMountedRef.current) {
          slotRef.current?.style.setProperty(
            "--split-flap-flip-duration",
            "0ms",
          );
          slotRef.current?.style.setProperty(
            "--split-flap-current-character-index",
            `${newCharIndex}`,
          );
          lastValueRef.current = currentCharacter;
          requestAnimationFrame(() => {
            slotRef.current?.style.removeProperty("--split-flap-flip-duration");
            onFullyFlipped?.(currentCharacter, index);
          });
          return;
        }

        let updatedTurn = false;
        const updateTurn = (
          prevIndex = lastCharIndex,
          nextIndex = newCharIndex,
          duration?: number,
        ) => {
          if (!updatedTurn) {
            turnRef.current++;
            // If we don't reset turns Safari glitches for certain values (see below),
            // this also avoids potential number overflow for very large turn values
            // const SAFARI_BUGGY_TURN_VALUES = [
            //   11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 25, 26, 30, 34, 52, 57, 60,
            //   65, 68, 73, 76, 81, 93, 109, 114, 125, 146, /*?*/ 187, //...
            // ];
            if (turnRef.current === 3) {
              turnRef.current = 1;
            }
            slotRef.current?.style.setProperty(
              "--split-flap-current-character-index",
              `${prevIndex}`,
            );
            slotRef.current?.style.setProperty(
              "--split-flap-flip-duration",
              "0ms",
            );
            slotRef.current?.style.setProperty(
              "--split-flap-turn",
              `${turnRef.current - 1}`,
            );
            requestAnimationFrame(() => {
              // the double requestAnimationFrame is for Firefox
              requestAnimationFrame(() => {
                if (duration) {
                  slotRef.current?.style.setProperty(
                    "--split-flap-flip-duration",
                    `${duration}ms`,
                  );
                } else {
                  slotRef.current?.style.removeProperty(
                    "--split-flap-flip-duration",
                  );
                }
                slotRef.current?.style.setProperty(
                  "--split-flap-turn",
                  `${turnRef.current}`,
                );
                slotRef.current?.style.setProperty(
                  "--split-flap-current-character-index",
                  `${nextIndex}`,
                );
              });
            });
            updatedTurn = true;
          }
        };

        if (isGoingBackwards || isGoingForwards) {
          if (flippingThroughTimeout.current) {
            clearTimeout(flippingThroughTimeout.current);
          }
          const animationTiming = slotRef.current
            ? parseFloat(
                getComputedStyle(slotRef.current).getPropertyValue(
                  "--split-flap-flip-duration",
                ),
              )
            : 0;

          const remainingChars = characters
            .slice(
              lastCharIndex + 1,
              isGoingForwards ? newCharIndex : undefined,
            )
            .split("")
            .reverse();
          const precedingChars = characters
            .slice(isGoingForwards ? newCharIndex : 0, newCharIndex)
            .split("")
            .reverse();

          const totalChars = remainingChars.length + precedingChars.length + 1;
          const intervalTime = Math.max(animationTiming / totalChars, 120);
          let transitoryIndex = lastCharIndex;

          const update = () => {
            const remainingChar = remainingChars.pop();
            const precedingChar = remainingChar
              ? undefined
              : precedingChars.pop();
            const transitoryChar = remainingChar ?? precedingChar;
            if (transitoryChar) {
              transitoryIndex = characters.indexOf(transitoryChar);
              slotRef.current?.style.setProperty(
                "--split-flap-flip-duration",
                intervalTime + "ms",
              );
              slotRef.current?.style.setProperty(
                "--split-flap-current-character-index",
                `${transitoryIndex}`,
              );
              if (precedingChar) {
                updateTurn(
                  (transitoryIndex + characters.length - 1) % characters.length,
                  transitoryIndex,
                  intervalTime,
                );
              }
              flippingThroughTimeout.current = setTimeout(update, intervalTime);
            } else {
              slotRef.current?.style.setProperty(
                "--split-flap-current-character-index",
                `${characters.indexOf(currentCharacter)}`,
              );
              if (isGoingBackwards) {
                updateTurn(transitoryIndex, newCharIndex, intervalTime);
              }
              const checkAnimations = () => {
                const animations = slotRef.current?.getAnimations({
                  subtree: true,
                });
                if (animations?.length) {
                  Promise.allSettled(animations.map((a) => a.finished)).then(
                    () => {
                      slotRef.current?.style.removeProperty(
                        "--split-flap-flip-duration",
                      );
                      onFullyFlipped?.(currentCharacter, index);
                    },
                  );
                } else {
                  slotRef.current?.style.removeProperty(
                    "--split-flap-flip-duration",
                  );
                  onFullyFlipped?.(currentCharacter, index);
                }
                slotRef.current?.removeEventListener(
                  "transitionend",
                  checkAnimations,
                );
              };

              checkAnimations();
            }
          };
          update();
        }
        lastValueRef.current = currentCharacter;
      }, [characters, index, onFullyFlipped, currentCharacter]);

      return (
        <span
          ref={combineRefs(slotRef, ref)}
          data-split-flap-slot={""}
          style={
            {
              display: "inline-grid",
              placeContent: "center",
              transformStyle: "preserve-3d",
              ...style,
              "--split-flap-current-character-index": currentCharacterIndex,
              "--split-flap-total": characters.length,
              // eslint-disable-next-line react-hooks/refs
              "--split-flap-turn": turnRef.current,
            } as CSSProperties
          }
          {...props}
        >
          {characters
            .split("")
            .map((char, i) =>
              typeof children === "function" ? (
                children(char, i)
              ) : (
                <SplitFlapCharacter
                  key={char}
                  index={i}
                  character={char}
                  currentCharacter={currentCharacter}
                />
              ),
            )}
        </span>
      );
    },
  ),
);

SplitFlapDisplaySlot.displayName = "SplitFlapDisplay.Slot";

export type SplitFlapDisplayCharacterProps = Omit<
  ComponentPropsWithoutRef<"span">,
  "children"
> & {
  index: number;
  character: string;
  currentCharacter: string;
  // optional render-prop to take over flap rendering for composition
  children?: (character: string) => ReactNode;
};

const SplitFlapCharacter = memo(
  forwardRef<HTMLSpanElement, SplitFlapDisplayCharacterProps>(
    (
      { index, character, currentCharacter, children, style, ...props },
      ref,
    ) => {
      return (
        <span
          ref={ref}
          key={index}
          data-char={character}
          data-split-flap-character={""}
          // @ts-expect-error inert is valid but not per react 18 types
          inert={character !== currentCharacter}
          style={
            {
              display: "flex",
              flexDirection: "column",
              gap: "var(--split-flap-crease)",
              gridArea: "1 / 1",
              pointerEvents: "none",
              position: "relative",
              transformStyle: "preserve-3d",
              transition:
                "z-index var(--split-flap-flip-duration) var(--split-flap-timing-function)",
              zIndex:
                "calc(var(--split-flap-is-current) * 2 + var(--split-flap-is-previous) + var(--split-flap-is-next))",
              ...style,
              // whole bunch of css variables to compute the angles
              "--split-flap-index": index,
              "--split-flap-total0": "calc(var(--split-flap-total) - 1)",
              "--split-flap-offset":
                "calc(var(--split-flap-index) - var(--split-flap-current-character-index))",
              "--split-flap-abs-offset":
                "max(var(--split-flap-offset), calc(var(--split-flap-offset) * -1))",
              // Prevent division by zero
              "--split-flap-safe-abs-offset":
                "max(var(--split-flap-abs-offset), 0.001)",
              "--split-flap-direction":
                "calc(var(--split-flap-offset) / var(--split-flap-safe-abs-offset))",
              "--split-flap-past": "min(0, var(--split-flap-direction))",
              "--split-flap-future": "max(0, var(--split-flap-direction))",
              "--split-flap-is-current":
                "clamp(0, calc(1 - var(--split-flap-abs-offset) * 1000),1)",
              "--split-flap-is-not-current":
                "clamp(0,calc(1 - var(--split-flap-is-current)),1)",
              "--split-flap-is-previous":
                "clamp(0, calc(1 - max(var(--split-flap-offset) + 1, (var(--split-flap-offset) + 1) * -1) * 1000), 1)",
              "--split-flap-is-next":
                "clamp(0, calc(1 - max(var(--split-flap-offset) - 1, (var(--split-flap-offset) - 1) * -1) * 1000), 1)",
              "--split-flap-angle":
                "calc((0.5 / var(--split-flap-total0)) * 1turn)",
              "--split-flap-top-flap-angle":
                "calc(var(--split-flap-abs-offset) * var(--split-flap-direction) * var(--split-flap-angle) + var(--split-flap-past) * 0.5turn - var(--split-flap-turn) * 1turn)",
              "--split-flap-bottom-flap-angle":
                "calc(max(var(--split-flap-abs-offset) - 1, 0) * var(--split-flap-direction) * var(--split-flap-angle) + var(--split-flap-future) * 0.5turn - var(--split-flap-turn) * 1turn)",
            } as CSSProperties
          }
          {...props}
        >
          {typeof children === "function" ? (
            children(character)
          ) : (
            <>
              <SplitFlapDisplayFlap character={character} position="top" />
              <SplitFlapDisplayFlap character={character} position="bottom" />
            </>
          )}
        </span>
      );
    },
  ),
);

SplitFlapCharacter.displayName = "SplitFlapDisplay.Character";

export type SplitFlapDisplayFlapProps = ComponentPropsWithoutRef<"span"> & {
  character: string;
  position: "top" | "bottom";
};

const SplitFlapDisplayFlap = memo(
  forwardRef<HTMLSpanElement, SplitFlapDisplayFlapProps>(
    ({ character, position, style, ...props }, ref) => {
      const flapStyles: CSSProperties = {
        backfaceVisibility: "hidden",
        display: "flex",
        overflow: "hidden",
        placeContent: "center",
        position: "relative",
        transformStyle: "preserve-3d",
        transition:
          "transform var(--split-flap-flip-duration) var(--split-flap-timing-function)",
        willChange: "transform",
      };

      return (
        <span
          ref={ref}
          data-split-flap-flap={position}
          style={{
            ...flapStyles,
            // translateZ(0.1px) fixes Safari backface-visibility bug during animation
            transform: `translateZ(calc(var(--split-flap-is-current) * 0.1px)) rotateX(var(--split-flap-${position}-flap-angle))`,
            transformOrigin:
              position === "top"
                ? "center calc(100% + var(--split-flap-crease) * 0.5)"
                : "center calc(var(--split-flap-crease) * -0.5)",
            ...style,
          }}
          {...(position === "bottom"
            ? { "aria-hidden": true, inert: true }
            : {})}
          {...props}
        >
          <span
            style={{
              translate: `0 calc(var(--split-flap-crease) * ${position === "top" ? "0.5" : "-0.5"})`,
            }}
          >
            {character}
          </span>
        </span>
      );
    },
  ),
);

SplitFlapDisplayFlap.displayName = "SplitFlapDisplay.Flap";

export const SplitFlapDisplay = {
  Root: SplitFlapDisplayRoot,
  Slot: SplitFlapDisplaySlot,
  Character: SplitFlapCharacter,
  Flap: SplitFlapDisplayFlap,
};
