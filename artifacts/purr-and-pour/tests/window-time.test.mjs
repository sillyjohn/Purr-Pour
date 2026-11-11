import test from "node:test";
import assert from "node:assert/strict";
import { getWindowPhase } from "../src/lib/window-time.ts";

test("window scenery follows local-clock phases at each transition", () => {
  for (const [hour, minute, phase] of [
    [0, 0, "night"], [4, 59, "night"], [5, 0, "dawn"],
    [7, 59, "dawn"], [8, 0, "day"], [16, 59, "day"],
    [17, 0, "dusk"], [19, 59, "dusk"], [20, 0, "night"],
    [23, 59, "night"],
  ]) {
    assert.equal(getWindowPhase(new Date(2026, 10, 10, hour, minute)), phase);
  }
});
