import { describe, expect, it, afterEach } from "bun:test";
import { Command } from "commander";
import { registerPlugins } from "./plugins.ts";
import type { Stdout } from "../../shared/services/ports.ts";

function makeStdout(): { stdout: Stdout; lines: string[] } {
  const lines: string[] = [];
  const stdout: Stdout = { write(line: string) { lines.push(line); } };
  return { stdout, lines };
}

describe("registerPlugins dispatch", () => {
  afterEach(() => { process.exitCode = 0; });

  it("'plugins sync' dispatches to sync operation", async () => {
    const { stdout, lines } = makeStdout();
    const program = new Command().exitOverride();
    registerPlugins(program, { stdout });
    await program.parseAsync(["plugins", "sync"], { from: "user" });
    expect(lines.join("")).toContain("not yet implemented");
  });
});
