import { describe, expect, it, afterEach } from "bun:test";
import { Command } from "commander";
import { registerAudit } from "./audit.ts";
import type { Stdout } from "../../shared/services/ports.ts";

function makeStdout(): { stdout: Stdout; lines: string[] } {
  const lines: string[] = [];
  const stdout: Stdout = { write(line: string) { lines.push(line); } };
  return { stdout, lines };
}

describe("registerAudit dispatch", () => {
  afterEach(() => { process.exitCode = 0; });

  it("'audit' dispatches to run operation", async () => {
    const { stdout, lines } = makeStdout();
    const program = new Command().exitOverride();
    registerAudit(program, { stdout });
    await program.parseAsync(["audit"], { from: "user" });
    expect(lines.join("")).toContain("not yet implemented");
  });
});
