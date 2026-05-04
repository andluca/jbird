import { describe, expect, it, afterEach } from "bun:test";
import { Command } from "commander";
import { registerRefactor } from "./refactor.ts";
import type { Stdout } from "../../shared/services/ports.ts";

function makeStdout(): { stdout: Stdout; lines: string[] } {
  const lines: string[] = [];
  const stdout: Stdout = { write(line: string) { lines.push(line); } };
  return { stdout, lines };
}

describe("registerRefactor dispatch", () => {
  afterEach(() => { process.exitCode = 0; });

  it("'refactor <target>' dispatches to run operation", async () => {
    const { stdout, lines } = makeStdout();
    const program = new Command().exitOverride();
    registerRefactor(program, { stdout });
    await program.parseAsync(["refactor", "extract service"], { from: "user" });
    expect(lines.join("")).toContain("not yet implemented");
  });
});
