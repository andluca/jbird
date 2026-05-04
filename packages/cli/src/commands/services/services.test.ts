import { describe, expect, it, afterEach } from "bun:test";
import { Command } from "commander";
import { registerServices } from "./services.ts";
import type { Stdout } from "../../shared/services/ports.ts";

function makeStdout(): { stdout: Stdout; lines: string[] } {
  const lines: string[] = [];
  const stdout: Stdout = { write(line: string) { lines.push(line); } };
  return { stdout, lines };
}

describe("registerServices dispatch", () => {
  afterEach(() => { process.exitCode = 0; });

  it("'services start' dispatches to start operation", async () => {
    const { stdout, lines } = makeStdout();
    const program = new Command().exitOverride();
    registerServices(program, { stdout });
    await program.parseAsync(["services", "start"], { from: "user" });
    expect(lines.join("")).toContain("not yet implemented");
  });
});
