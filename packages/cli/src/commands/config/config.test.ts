import { describe, expect, it, afterEach } from "bun:test";
import { Command } from "commander";
import { registerConfig } from "./config.ts";
import type { Stdout } from "../../shared/services/ports.ts";

function makeStdout(): { stdout: Stdout; lines: string[] } {
  const lines: string[] = [];
  const stdout: Stdout = { write(line: string) { lines.push(line); } };
  return { stdout, lines };
}

describe("registerConfig dispatch", () => {
  afterEach(() => { process.exitCode = 0; });

  it("'config get <key>' dispatches to get operation", async () => {
    const { stdout, lines } = makeStdout();
    const program = new Command().exitOverride();
    registerConfig(program, { stdout });
    await program.parseAsync(["config", "get", "proxy.port"], { from: "user" });
    expect(lines.join("")).toContain("not yet implemented");
  });
});
