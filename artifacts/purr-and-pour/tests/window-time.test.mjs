import test from "node:test";
import assert from "node:assert/strict";
import { getWindowPhase, getWindowPreviewDate } from "../src/lib/window-time.ts";

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

test("scenery previews cover each phase without changing the actual clock", () => {
  const now = new Date(2026, 10, 10, 12, 34, 56);
  for (const [time, phase] of [["06:00", "dawn"], ["12:00", "day"], ["18:00", "dusk"], ["22:00", "night"]]) {
    assert.equal(getWindowPhase(getWindowPreviewDate(now, time)), phase);
    assert.equal(now.getHours(), 12);
    assert.equal(now.getMinutes(), 34);
    assert.equal(now.getSeconds(), 56);
  }
  for (const invalid of [null, "", "24:00", "12:60", "6:00", "noon", "<script>"]) {
    assert.equal(getWindowPreviewDate(now, invalid), now);
  }
});
