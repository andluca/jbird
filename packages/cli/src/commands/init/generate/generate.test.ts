import { describe, expect, it } from "bun:test";
import { runGenerate } from "./generate.ts";
import type { Stdout } from "../../../shared/services/ports.ts";

function makeStdout(): { stdout: Stdout; lines: string[] } {
  const lines: string[] = [];
  const stdout: Stdout = { write(line: string) { lines.push(line); } };
  return { stdout, lines };
}

describe("runGenerate", () => {
  it("writes 'not yet implemented' message to stdout", async () => {
    const { stdout, lines } = makeStdout();
    await runGenerate({ path: ".", prompt: "a cool project", profile: "default" }, { stdout });
    expect(lines.join("")).toContain("not yet implemented");
  });

  it("message includes operation identifier", async () => {
    const { stdout, lines } = makeStdout();
    await runGenerate({ path: ".", prompt: "a cool project", profile: "default" }, { stdout });
    expect(lines.join("")).toContain("init generate");
  });
});
