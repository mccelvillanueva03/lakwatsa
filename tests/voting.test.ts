import { expect, test } from "vitest";
import { leaders, chooseWinner } from "../src/lib/voting";
test("unique winners select automatically, ties require tied choices, no votes require a choice", () => {
  expect(leaders(["a", "b"], ["a", "a", "b"])).toEqual(["a"]);
  expect(chooseWinner(["a", "b"], ["a", "a", "b"])).toBe("a");
  expect(() => chooseWinner(["a", "b", "c"], ["a", "b"])).toThrow();
  expect(() => chooseWinner(["a", "b", "c"], ["a", "b"], "c")).toThrow();
  expect(chooseWinner(["a", "b"], ["a", "b"], "b")).toBe("b");
  expect(() => chooseWinner(["a", "b"], [])).toThrow();
  expect(chooseWinner(["a", "b"], [], "a")).toBe("a");
});
