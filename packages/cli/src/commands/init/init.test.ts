import { describe, expect, it, afterEach } from "bun:test";
import { Command } from "commander";
import { registerInit } from "./init.ts";
import type { Stdout } from "../../shared/services/ports.ts";

function makeStdout(): { stdout: Stdout; lines: string[] } {
  const lines: string[] = [];
  const stdout: Stdout = { write(line: string) { lines.push(line); } };
  return { stdout, lines };
}

function makeProgram(stdout: Stdout): Command {
  const program = new Command().exitOverride();
  registerInit(program, { stdout });
  return program;
}

describe("registerInit dispatch", () => {
  afterEach(() => { process.exitCode = 0; });

  it("'init' (no --prompt) dispatches scaffold mode", async () => {
    const { stdout, lines } = makeStdout();
    const program = makeProgram(stdout);
    await program.parseAsync(["init"], { from: "user" });
    const output = lines.join("");
    expect(output).toContain("scaffold");
    expect(output).toContain("not yet implemented");
  });

  it("'init --prompt X' dispatches generate mode", async () => {
    const { stdout, lines } = makeStdout();
    const program = makeProgram(stdout);
    await program.parseAsync(["init", "--prompt", "build a todo app"], { from: "user" });
    const output = lines.join("");
    expect(output).toContain("generate");
    expect(output).toContain("not yet implemented");
  });
});
