import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const gitignore = readFileSync(".gitignore", "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

describe("environment file safety", () => {
  it("ignores local environment files while keeping the example template trackable", () => {
    expect(gitignore).toContain(".env*");
    expect(gitignore).toContain("!.env.example");
  });
});
