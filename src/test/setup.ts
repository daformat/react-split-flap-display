import "@testing-library/jest-dom/vitest";

// jsdom does not implement the Web Animations API; SplitFlapDisplayChar calls
// `element.getAnimations({ subtree: true })` once a flip completes, so we
// stub it with a no-op that returns no running animations.
if (!("getAnimations" in Element.prototype)) {
  Object.defineProperty(Element.prototype, "getAnimations", {
    configurable: true,
    writable: true,
    value: function getAnimations() {
      return [];
    },
  });
}
