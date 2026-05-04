import { describe, expect, it, afterEach } from "bun:test";
import { Command } from "commander";
import { registerTdd } from "./tdd.ts";
import type { Stdout } from "../../shared/services/ports.ts";

function makeStdout(): { stdout: Stdout; lines: string[] } {
  const lines: string[] = [];
  const stdout: Stdout = { write(line: string) { lines.push(line); } };
  return { stdout, lines };
}

describe("registerTdd dispatch", () => {
  afterEach(() => { process.exitCode = 0; });

  it("'tdd <work>' dispatches to run operation", async () => {
    const { stdout, lines } = makeStdout();
    const program = new Command().exitOverride();
    registerTdd(program, { stdout });
    await program.parseAsync(["tdd", "add login feature"], { from: "user" });
    expect(lines.join("")).toContain("not yet implemented");
  });
});
