import { describe, expect, it, afterEach } from "bun:test";
import { Command } from "commander";
import { registerStats } from "./stats.ts";
import type { Stdout } from "../../shared/services/ports.ts";

function makeStdout(): { stdout: Stdout; lines: string[] } {
  const lines: string[] = [];
  const stdout: Stdout = { write(line: string) { lines.push(line); } };
  return { stdout, lines };
}

describe("registerStats dispatch", () => {
  afterEach(() => { process.exitCode = 0; });

  it("'stats' dispatches to report operation", async () => {
    const { stdout, lines } = makeStdout();
    const program = new Command().exitOverride();
    registerStats(program, { stdout });
    await program.parseAsync(["stats"], { from: "user" });
    expect(lines.join("")).toContain("not yet implemented");
  });
});
