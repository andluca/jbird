import { describe, expect, it } from "bun:test";
import { runPluginsSync } from "./sync.ts";
import type { Stdout } from "../../../shared/services/ports.ts";

function makeStdout(): { stdout: Stdout; lines: string[] } {
  const lines: string[] = [];
  const stdout: Stdout = { write(line: string) { lines.push(line); } };
  return { stdout, lines };
}

describe("runPluginsSync", () => {
  it("writes 'not yet implemented' to stdout", async () => {
    const { stdout, lines } = makeStdout();
    await runPluginsSync({}, { stdout });
    expect(lines.join("")).toContain("not yet implemented");
  });

  it("message includes operation identifier", async () => {
    const { stdout, lines } = makeStdout();
    await runPluginsSync({}, { stdout });
    expect(lines.join("")).toContain("plugins sync");
  });
});
